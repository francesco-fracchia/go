import { db } from './db.ts'
import { autorizza } from './stripe.ts'
import {
  preventivo, autorizzazioneMassima, quotaApplicata,
  ViolazioneConformita,
  type Corsa, type Passeggero,
} from '../lib/pricing.ts'
import type { Cents } from '../lib/money.ts'

/**
 * Creazione di una prenotazione.
 *
 * Questa funzione è l'UNICA via di scrittura sulle prenotazioni: le RLS non
 * espongono né insert né update agli utenti. Non è pignoleria — è che il
 * motore dei prezzi gira qui, e un client che potesse inserire importi
 * propri renderebbe decorativo tutto il resto.
 */

export class ErrorePrenotazione extends Error {
  readonly codice: string
  // Il campo si dichiara e si assegna a mano invece di usare la scorciatoia
  // `constructor(public …)`: Node esegue TypeScript togliendo i tipi, e
  // quella scorciatoia non è un tipo — è codice che sparirebbe. Senza
  // questo, nessun modulo del server è collaudabile.
  constructor(codice: string, msg: string) {
    super(msg)
    this.codice = codice
    this.name = 'ErrorePrenotazione'
  }
}

interface RigaCorsa {
  id: string
  conducente: string
  modalita: 'pubblica' | 'link' | 'privata'
  stato: string
  km_base: number
  pedaggio_cent: number
  parcheggio_cent: number
  posti_offerti: number
  sconto_cent: number
  prenota_immediata: boolean
  deviazioni_ritiro: boolean
  deviazioni_deposito: boolean
  ora_partenza: string
  veicoli: { centesimi_per_km: number } | null
}

/** Ricompone la corsa nella forma che il motore dei prezzi si aspetta. */
function aCorsa(r: RigaCorsa, ritorno = false): Corsa {
  if (!r.veicoli) throw new ErrorePrenotazione('veicolo', 'corsa senza veicolo')
  return {
    modalita: r.modalita,
    kmBase: Number(r.km_base),
    centesimiPerKm: Number(r.veicoli.centesimi_per_km),
    pedaggio: r.pedaggio_cent,
    parcheggio: r.parcheggio_cent,
    postiOfferti: r.posti_offerti,
    scontoConducente: r.sconto_cent,
    ritorno,
  }
}

export interface RichiestaPrenotazione {
  corsaId: string
  passeggeroId: string
  /** fermata esistente a cui salire, oppure una deviazione proposta */
  fermataId?: string
  kmDeviazione?: number
  tipoDeviazione?: 'ritiro' | 'deposito'
  /** prenotazioni riservate insieme; ognuna paga comunque per sé */
  gruppo?: string
  messaggio?: string
}

export async function prenota(req: RichiestaPrenotazione) {
  const { data: riga, error } = await db
    .from('corse')
    .select('*, veicoli(centesimi_per_km)')
    .eq('id', req.corsaId)
    .single<RigaCorsa>()
  if (error || !riga) throw new ErrorePrenotazione('corsa', 'corsa non trovata')

  if (!['pubblicata', 'confermata'].includes(riga.stato)) {
    throw new ErrorePrenotazione('stato', 'la corsa non accetta prenotazioni')
  }
  if (new Date(riga.ora_partenza) <= new Date()) {
    throw new ErrorePrenotazione('tardi', 'la corsa è già partita')
  }
  if (riga.conducente === req.passeggeroId) {
    throw new ErrorePrenotazione('conducente', 'non si prenota la propria corsa')
  }

  const kmDeviazione = req.kmDeviazione ?? 0
  // Ritiro e destinazione si concedono separatamente: chi ha tempo prima di
  // partire ma è di fretta all'arrivo apre solo il primo.
  if (kmDeviazione > 0) {
    const tipo = req.tipoDeviazione ?? 'ritiro'
    const ammessa = tipo === 'ritiro' ? riga.deviazioni_ritiro : riga.deviazioni_deposito
    if (!ammessa) {
      throw new ErrorePrenotazione('deviazioni', tipo === 'ritiro'
        ? 'questa corsa parte solo dal punto indicato'
        : 'questa corsa arriva solo alla destinazione indicata')
    }
  }

  // I compagni di viaggio già a bordo servono al motore: la deviazione si
  // divide con chi condivide la fermata, e la fee scende al crescere del gruppo.
  const { data: esistenti } = await db
    .from('prenotazioni')
    .select('passeggero, fermata, esente, fermate(km_incrementali)')
    .eq('corsa', req.corsaId)
    .not('stato', 'in', '("rifiutata","scaduta","annullata")')

  const bordo = esistenti ?? []
  if (bordo.length >= riga.posti_offerti) {
    throw new ErrorePrenotazione('pieno', 'non ci sono più posti')
  }
  if (bordo.some((b) => b.passeggero === req.passeggeroId)) {
    throw new ErrorePrenotazione('doppia', 'hai già una prenotazione su questa corsa')
  }

  const corsa = aCorsa(riga)
  const passeggeri: Passeggero[] = [
    ...bordo.map((b): Passeggero => ({
      id: b.passeggero,
      fermataId: b.fermata ?? undefined,
      kmDeviazione: Number((b.fermate as { km_incrementali?: number } | null)?.km_incrementali ?? 0),
      esente: b.esente ?? false,
    })),
    {
      id: req.passeggeroId,
      fermataId: req.fermataId,
      kmDeviazione,
    },
  ]

  // Il motore decide. Se la combinazione violasse le invarianti, solleva qui
  // e la prenotazione non nasce.
  let calcolo
  try {
    calcolo = preventivo(corsa, passeggeri)
  } catch (e) {
    if (e instanceof ViolazioneConformita) {
      throw new ErrorePrenotazione('conformita', e.message)
    }
    throw e
  }

  const mia = calcolo.quote.find((q) => q.passeggeroId === req.passeggeroId)!
  // Si autorizza lo scenario peggiore: passeggero solo a bordo, fee piena.
  const autorizzato: Cents = autorizzazioneMassima(corsa, passeggeri.at(-1)!)

  // Una proposta di deviazione non blocca il posto e non tocca la carta:
  // il posto resta prenotabile da altri finché il conducente non accetta.
  const richiedeApprovazione = kmDeviazione > 0 || !riga.prenota_immediata

  const { data: profiloPag } = await db
    .from('profili')
    .select('stripe_cliente_id, metodo_pagamento')
    .eq('id', req.passeggeroId)
    .single()
  const metodo = profiloPag?.stripe_cliente_id && profiloPag.metodo_pagamento
    ? { cliente: profiloPag.stripe_cliente_id, metodo: profiloPag.metodo_pagamento }
    : null

  // Senza carta non si crea nemmeno una richiesta: il conducente che accetta
  // scoprirebbe solo allora che non c'è niente da addebitare.
  if (!metodo) throw new ErrorePrenotazione('carta', 'aggiungi un metodo di pagamento')

  const { data: pren, error: errIns } = await db
    .from('prenotazioni')
    .insert({
      corsa: req.corsaId,
      passeggero: req.passeggeroId,
      fermata: req.fermataId ?? null,
      gruppo: req.gruppo ?? null,
      quota_cent: mia.quota,
      deviazione_cent: mia.deviazione,
      fee_cent: mia.fee,
      totale_cent: mia.totale,
      autorizzato_cent: autorizzato,
      stato: richiedeApprovazione ? 'richiesta' : 'autorizzata',
      messaggio: req.messaggio ?? null,
      scade_il: richiedeApprovazione ? scadenzaProposta(riga.ora_partenza) : null,
    })
    .select()
    .single()

  if (errIns) throw new ErrorePrenotazione('db', errIns.message)

  if (!richiedeApprovazione) {
    // La carta è quella già salvata sul profilo: non si ripete l'inserimento
    // a ogni prenotazione. Se manca, la prenotazione non nasce — meglio un
    // errore adesso che una prenotazione che sembra valida e non lo è.
    if (!metodo) {
      await db.from('prenotazioni').delete().eq('id', pren.id)
      throw new ErrorePrenotazione('carta', 'aggiungi un metodo di pagamento')
    }
    const intent = await autorizza({
      importo: autorizzato,
      clienteId: metodo.cliente,
      metodoPagamento: metodo.metodo,
      prenotazioneId: pren.id,
      descrizione: `GO — passaggio del ${new Date(riga.ora_partenza).toLocaleDateString('it-IT')}`,
    })
    await db.from('prenotazioni')
      .update({ stripe_payment_intent: intent.id, autorizzata_il: new Date().toISOString() })
      .eq('id', pren.id)
  }

  return { prenotazione: pren, calcolo, autorizzato, richiedeApprovazione }
}

/**
 * Una proposta scade sei ore dopo, o dodici ore prima della partenza se
 * questa arriva prima. Il silenzio del conducente vale rifiuto: mai
 * accettazione implicita, o un conducente distratto si ritroverebbe in
 * macchina qualcuno che non ha scelto.
 */
export function scadenzaProposta(oraPartenza: string): string {
  const sei = Date.now() + 6 * 3600_000
  const dodiciPrima = new Date(oraPartenza).getTime() - 12 * 3600_000
  return new Date(Math.min(sei, dodiciPrima)).toISOString()
}

/** Quota che il passeggero vedrà, prima di prenotare. Non tocca nulla. */
export async function preventivaPer(corsaId: string): Promise<Cents | null> {
  const { data } = await db
    .from('corse')
    .select('*, veicoli(centesimi_per_km)')
    .eq('id', corsaId)
    .single<RigaCorsa>()
  return data ? quotaApplicata(aCorsa(data)) : null
}
