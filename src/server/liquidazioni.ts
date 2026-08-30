import { db } from './db.ts'
import { liquida } from './stripe.ts'
import { notifica } from './notifiche.ts'
import { maturatoSettimana, sbloccaMaturate } from './viaggio.ts'
import { fmt } from '../lib/money.ts'

/**
 * Sblocca tutto quello su cui nessuno ha detto niente.
 *
 * È il job che sostituisce il codice di salita: passate 24 ore dall'arrivo
 * senza segnalazioni, il pagamento matura. Il silenzio vale conferma.
 */
export async function chiudiContestazioni() {
  return sbloccaMaturate()
}

/**
 * Liquidazione settimanale.
 *
 * Un solo trasferimento per conducente, il lunedì. I transfer verso account
 * collegati sono gratuiti, quindi aggregare non serve a risparmiare: serve
 * a rendere il pagamento un appuntamento invece di un rivolo di accrediti
 * da tre euro che nessuno riesce a riconciliare.
 */
export async function liquidaSettimana(settimana: string) {
  const { data: conducenti } = await db
    .from('maturato_conducente')
    .select('conducente')
    .eq('settimana', settimana)

  const unici = [...new Set((conducenti ?? []).map((c) => c.conducente))]
  const esiti: Array<{ conducente: string; importo?: number; saltato?: string }> = []

  for (const id of unici) {
    const { data: gia } = await db
      .from('liquidazioni')
      .select('id').eq('conducente', id).eq('settimana', settimana).maybeSingle()
    if (gia) continue

    const { netto } = await maturatoSettimana(id, settimana)
    if (netto <= 0) continue

    const { data: profilo } = await db
      .from('profili').select('stripe_account_id, stripe_pronto').eq('id', id).single()

    // L'onboarding si chiede QUI, quando i soldi ci sono già: chiederlo
    // prima significa perdere il conducente su un modulo, senza che abbia
    // ancora visto un euro.
    if (!profilo?.stripe_pronto || !profilo.stripe_account_id) {
      await notifica({
        destinatario: id,
        tipo: 'liquidazione',
        titolo: `Hai ${fmt(netto)} da ritirare`,
        testo: 'Servono due minuti per collegare il conto. I soldi ti aspettano.',
        url: '/conto',
        chiave: `onboarding:${id}:${settimana}`,
      })
      esiti.push({ conducente: id, saltato: 'onboarding' })
      continue
    }

    const transfer = await liquida({
      conducenteStripeId: profilo.stripe_account_id,
      importo: netto,
      settimana,
    })

    await db.from('liquidazioni').insert({
      conducente: id, settimana, importo_cent: netto,
      stripe_transfer_id: transfer.id, eseguita_il: new Date().toISOString(),
    })
    await db.from('prenotazioni').update({ stato: 'liquidata' })
      .eq('stato', 'completata')

    await notifica({
      destinatario: id,
      tipo: 'liquidazione',
      titolo: `${fmt(netto)} in arrivo`,
      testo: 'Bonifico partito: due o tre giorni lavorativi.',
      url: '/conto',
      chiave: `payout:${id}:${settimana}`,
    })
    esiti.push({ conducente: id, importo: netto })
  }
  return esiti
}

/**
 * Denaro fermo sul saldo perché il conducente non ha mai collegato il conto.
 *
 * Dopo novanta giorni si rimborsa il passeggero. Va scritto nelle condizioni
 * d'uso, altrimenti sono soldi di qualcun altro che restano nostri a tempo
 * indeterminato — che è un problema, non una fortuna.
 */
export const GIORNI_PER_ONBOARDING = 90

export async function fondiNonRitirati() {
  const limite = new Date(Date.now() - GIORNI_PER_ONBOARDING * 86_400_000)
  const { data } = await db
    .from('prenotazioni')
    .select('id, totale_cent, corse!inner(conducente, ora_partenza)')
    .eq('stato', 'completata')
    .lt('corse.ora_partenza', limite.toISOString())
  return data ?? []
}
