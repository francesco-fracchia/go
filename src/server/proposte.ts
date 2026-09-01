import { db } from './db.ts'
import { autorizza } from './stripe.ts'
import { preventivo, autorizzazioneMassima, type Corsa, type Passeggero } from '../lib/pricing.ts'
import { pianoDi } from './pianifica.ts'
import { notifica } from './notifiche.ts'
import { orario } from '../lib/tempo.ts'

/**
 * Accettazione e rifiuto delle proposte.
 *
 * Una proposta non blocca il posto e non tocca la carta finché il
 * conducente non risponde. Al momento del sì succedono tre cose, in
 * quest'ordine: si verifica che il posto ci sia ancora, si ricalcola il
 * prezzo con il nuovo passeggero a bordo, si autorizza la carta. Se una
 * fallisce, le successive non partono.
 */

/**
 * Accettare una proposta con deviazione cambia gli orari di tutti.
 *
 * `assorbe` dice chi paga i minuti in più: uscendo prima («partenza»,
 * l'arrivo resta) o arrivando dopo («arrivo», la partenza resta). È una
 * scelta che riguarda persone diverse, e per questo non ha un valore
 * ragionevole di sistema: chi va a un concerto e chi torna a casa la
 * fanno all'opposto.
 */
export async function accettaProposta(
  prenotazioneId: string, conducenteId: string,
  assorbe?: 'partenza' | 'arrivo',
) {
  const { data: p } = await db
    .from('prenotazioni')
    .select(`
      id, passeggero, stato, fermata, autorizzato_cent,
      fermate ( km_incrementali ),
      corse!inner ( id, conducente, modalita, km_base, pedaggio_cent, parcheggio_cent,
                    posti_offerti, sconto_cent, ora_partenza, destinazione_label,
                    veicoli ( centesimi_per_km ) )
    `)
    .eq('id', prenotazioneId)
    .single()

  if (!p) return { esito: 'non_trovata' as const }
  const c = p.corse as unknown as RigaCorsa
  if (c.conducente !== conducenteId) return { esito: 'non_tua' as const }
  if (p.stato !== 'richiesta') return { esito: 'gia_gestita' as const }
  if (new Date(c.ora_partenza) <= new Date()) return { esito: 'tardi' as const }

  // Il posto potrebbe essere stato preso mentre la proposta era in attesa:
  // è il caso normale, non un errore, e va detto con chiarezza.
  const { data: bordo } = await db
    .from('prenotazioni')
    .select('passeggero, fermata, esente, fermate(km_incrementali)')
    .eq('corsa', c.id)
    .not('stato', 'in', '("rifiutata","scaduta","annullata","richiesta")')

  const aBordo = bordo ?? []
  if (aBordo.length >= c.posti_offerti) {
    await db.from('prenotazioni').update({ stato: 'rifiutata' }).eq('id', p.id)
    await avvisa(p.passeggero, p.id, c.id,
      'Il posto è stato preso',
      'Mentre aspettavi risposta qualcun altro ha prenotato. Non ti abbiamo addebitato niente.')
    return { esito: 'pieno' as const }
  }

  const corsa: Corsa = {
    modalita: c.modalita,
    kmBase: Number(c.km_base),
    centesimiPerKm: Number(c.veicoli?.centesimi_per_km ?? 0),
    pedaggio: c.pedaggio_cent,
    parcheggio: c.parcheggio_cent,
    postiOfferti: c.posti_offerti,
    scontoConducente: c.sconto_cent,
  }

  const nuovo: Passeggero = {
    id: p.passeggero,
    fermataId: p.fermata ?? undefined,
    kmDeviazione: Number((p.fermate as { km_incrementali?: number } | null)?.km_incrementali ?? 0),
  }
  const passeggeri: Passeggero[] = [
    ...aBordo.map((b): Passeggero => ({
      id: b.passeggero,
      fermataId: b.fermata ?? undefined,
      kmDeviazione: Number((b.fermate as { km_incrementali?: number } | null)?.km_incrementali ?? 0),
      esente: b.esente ?? false,
    })),
    nuovo,
  ]

  const calcolo = preventivo(corsa, passeggeri)
  const mia = calcolo.quote.find((q) => q.passeggeroId === p.passeggero)!
  const autorizzato = autorizzazioneMassima(corsa, nuovo)

  const { data: metodo } = await db
    .from('profili')
    .select('stripe_cliente_id, metodo_pagamento')
    .eq('id', p.passeggero)
    .single()

  // Carta scaduta o rimossa nel frattempo: si avvisa e si chiude, invece di
  // lasciare una prenotazione che sembra valida e non lo è.
  if (!metodo?.stripe_cliente_id || !metodo.metodo_pagamento) {
    await db.from('prenotazioni').update({ stato: 'scaduta' }).eq('id', p.id)
    await avvisa(p.passeggero, p.id, c.id,
      'Non siamo riusciti a confermare',
      'Il conducente ha accettato ma non abbiamo un metodo di pagamento valido. Riprova.')
    return { esito: 'pagamento' as const }
  }

  const intent = await autorizza({
    importo: autorizzato,
    clienteId: metodo.stripe_cliente_id,
    metodoPagamento: metodo.metodo_pagamento,
    prenotazioneId: p.id,
    descrizione: `GO — passaggio per ${c.destinazione_label}`,
  })

  await db.from('prenotazioni').update({
    stato: 'autorizzata',
    quota_cent: mia.quota,
    deviazione_cent: mia.deviazione,
    fee_cent: mia.fee,
    totale_cent: mia.totale,
    autorizzato_cent: autorizzato,
    stripe_payment_intent: intent.id,
    autorizzata_il: new Date().toISOString(),
  }).eq('id', p.id)

  await avvisa(p.passeggero, p.id, c.id,
    'Ha detto di sì',
    `Passa a prenderti come avevi chiesto. Ti abbiamo bloccato ${(mia.totale / 100).toFixed(2).replace('.', ',')} € sulla carta.`,
    'proposta_accettata')

  /**
   * Se c'era una deviazione, gli orari di TUTTI cambiano.
   *
   * Chi era già a bordo aveva accettato un'ora, e adesso ne ha un'altra
   * per una decisione che non ha preso lui. Va detto — e va potuto
   * disdire senza penale, perché fargli pagare una fee per un cambiamento
   * altrui è farlo pagare due volte.
   */
  const deviato = Number((p.fermate as { km_incrementali?: number } | null)?.km_incrementali ?? 0) > 0
  if (deviato) {
    await db.from('corse').update({
      assorbe: assorbe ?? 'partenza',
      orario_cambiato_il: new Date().toISOString(),
    }).eq('id', c.id)

    const piano = await pianoDi(c.id)
    for (const b of aBordo) {
      await notifica({
        destinatario: b.passeggero,
        tipo: 'corsa_annullata',
        titolo: 'Gli orari della corsa sono cambiati',
        testo: assorbe === 'arrivo'
          ? `Sale un'altra persona lungo la strada: si arriva verso le ${piano ? orario(piano.arrivo) : '—'}. Se non ti va bene puoi disdire senza penale.`
          : `Sale un'altra persona lungo la strada: si parte alle ${piano ? orario(piano.partenza) : '—'}. Se non ti va bene puoi disdire senza penale.`,
        url: `/corsa/${c.id}`,
        corsa: c.id,
        chiave: `orari:${c.id}:${b.passeggero}:${Date.now()}`,
      })
    }
  }

  return { esito: 'ok' as const, totale: mia.totale }
}

export async function rifiutaProposta(
  prenotazioneId: string, conducenteId: string, motivo?: string,
) {
  const { data: p } = await db
    .from('prenotazioni')
    .select('id, passeggero, stato, corse!inner(id, conducente)')
    .eq('id', prenotazioneId)
    .single()
  const c = p?.corse as unknown as { id: string; conducente: string } | undefined
  if (!p || !c || c.conducente !== conducenteId) return false
  if (p.stato !== 'richiesta') return false

  await db.from('prenotazioni').update({ stato: 'rifiutata' }).eq('id', p.id)
  await avvisa(p.passeggero, p.id, c.id,
    'Non se ne fa niente',
    motivo?.trim()
      ? `Il conducente ha risposto: «${motivo.trim()}». Non ti abbiamo addebitato niente.`
      : 'Il conducente non può passare da lì. Non ti abbiamo addebitato niente.',
    'proposta_rifiutata')
  return true
}

async function avvisa(
  destinatario: string, prenotazione: string, corsa: string,
  titolo: string, testo: string,
  tipo: 'proposta_accettata' | 'proposta_rifiutata' = 'proposta_rifiutata',
) {
  await notifica({
    destinatario, tipo, titolo, testo,
    url: `/prenotazione/${prenotazione}`,
    corsa, prenotazione,
    chiave: `${tipo}:${prenotazione}`,
  })
}

interface RigaCorsa {
  id: string; conducente: string; modalita: 'pubblica' | 'link' | 'privata'
  km_base: number; pedaggio_cent: number; parcheggio_cent: number
  posti_offerti: number; sconto_cent: number
  ora_partenza: string; destinazione_label: string
  veicoli: { centesimi_per_km: number } | null
}
