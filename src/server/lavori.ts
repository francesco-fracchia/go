import { db } from './db.ts'
import { notifica } from './notifiche.ts'
import { rimatch } from './rimatch.ts'
import { catturaCorsa } from './cattura.ts'
import { concludiCorsa } from './viaggio.ts'
import { stripe, SCADENZA_AUTORIZZAZIONE_GIORNI } from './stripe.ts'
import { orario } from '../lib/tempo.ts'

/**
 * I lavori schedulati.
 *
 * Ogni funzione è idempotente: girano su cron, i cron si riavviano, e una
 * notifica mandata due volte alle quattro del mattino costa un utente.
 * L'idempotenza vive nelle chiavi delle notifiche e nella tabella `lavori`.
 *
 * La linea del tempo è tutta relativa alla PARTENZA, tranne il rientro che
 * è relativo al ritorno: sono momenti diversi con ansie diverse.
 */

const ora = () => new Date()
const fra = (min: number) => new Date(Date.now() + min * 60_000)

/** T−24h · promemoria e ultimo momento utile per disdire senza penale. */
export async function promemoria24h() {
  const { data: corse } = await db
    .from('corse')
    .select('id, ora_partenza, destinazione_label, conducente')
    .in('stato', ['pubblicata', 'confermata'])
    .gte('ora_partenza', fra(23 * 60).toISOString())
    .lte('ora_partenza', fra(25 * 60).toISOString())

  for (const c of corse ?? []) {
    for (const p of await passeggeri(c.id)) {
      await notifica({
        destinatario: p.passeggero,
        tipo: 'promemoria_24h',
        titolo: 'Domani si parte',
        testo: `Passaggio per ${c.destinazione_label} alle ${orario(c.ora_partenza)}. Puoi ancora disdire senza costi.`,
        url: `/prenotazione/${p.id}`,
        corsa: c.id, prenotazione: p.id,
        chiave: `24h:${p.id}`,
      })
    }
  }
}

/**
 * T−7 giorni · ri-autorizzazione.
 *
 * L'autorizzazione Stripe scade dopo circa sette giorni: senza questo, alla
 * partenza non c'è niente da catturare e ce ne accorgiamo troppo tardi.
 */
export async function riautorizza() {
  const limite = new Date(Date.now() - (SCADENZA_AUTORIZZAZIONE_GIORNI - 1) * 86_400_000)
  const { data: scadenti } = await db
    .from('prenotazioni')
    .select('id, passeggero, stripe_payment_intent, corse(ora_partenza)')
    .eq('stato', 'autorizzata')
    .lt('autorizzata_il', limite.toISOString())

  for (const p of scadenti ?? []) {
    if (!p.stripe_payment_intent) continue
    // Si annulla e si richiede: Stripe non prolunga un'autorizzazione.
    // Serve il consenso off-session, raccolto alla prima autorizzazione.
    try {
      await stripe.paymentIntents.cancel(p.stripe_payment_intent)
      await db.from('prenotazioni')
        .update({ stato: 'richiesta', stripe_payment_intent: null })
        .eq('id', p.id)
      await notifica({
        destinatario: p.passeggero,
        tipo: 'conferma_richiesta',
        titolo: 'Conferma il tuo passaggio',
        testo: 'La preautorizzazione sulla carta è scaduta: bastano due tocchi per rinnovarla.',
        url: `/prenotazione/${p.id}`,
        prenotazione: p.id,
        chiave: `riauth:${p.id}:${new Date().toISOString().slice(0, 10)}`,
      })
    } catch { /* già annullata */ }
  }
}

/** T−3h · si chiede al conducente di confermare. */
export async function chiediConferma() {
  const { data: corse } = await db
    .from('corse')
    .select('id, conducente, ora_partenza, destinazione_label')
    .eq('stato', 'pubblicata')
    .gte('ora_partenza', fra(150).toISOString())
    .lte('ora_partenza', fra(210).toISOString())

  for (const c of corse ?? []) {
    if ((await passeggeri(c.id)).length === 0) continue
    await notifica({
      destinatario: c.conducente,
      tipo: 'conferma_richiesta',
      titolo: 'Confermi il passaggio di stasera?',
      testo: `${orario(c.ora_partenza)} per ${c.destinazione_label}. Se qualcosa è cambiato dillo ora: c'è ancora tempo per trovare un'alternativa a chi ha prenotato.`,
      url: `/corsa/${c.id}`,
      corsa: c.id,
      chiave: `conferma:${c.id}`,
    })
  }
}

/**
 * T−60min · il conducente non ha confermato.
 *
 * Qui non si aspetta oltre. Un'ora è il minimo per trovare un'alternativa e
 * arrivarci: aspettare fino alla partenza per "dargli un'altra chance"
 * significa lasciare i passeggeri a piedi senza rimedio.
 */
export async function rimatchNonConfermate() {
  const { data: corse } = await db
    .from('corse')
    .select('id')
    .eq('stato', 'pubblicata')
    .gte('ora_partenza', fra(50).toISOString())
    .lte('ora_partenza', fra(70).toISOString())

  const esiti = []
  for (const c of corse ?? []) {
    if ((await passeggeri(c.id)).length === 0) continue
    esiti.push(await rimatch(c.id, 'non_conferma'))
  }
  return esiti
}

/** T−30min · «sei in arrivo?» e apertura della chiamata mascherata. */
export async function inArrivo() {
  const { data: corse } = await db
    .from('corse')
    .select('id, conducente, ora_partenza, origine_label')
    .eq('stato', 'confermata')
    .gte('ora_partenza', fra(25).toISOString())
    .lte('ora_partenza', fra(35).toISOString())

  for (const c of corse ?? []) {
    const lista = await passeggeri(c.id)
    for (const p of lista) {
      await notifica({
        destinatario: p.passeggero,
        tipo: 'in_arrivo',
        titolo: 'Fra mezz\'ora',
        testo: `Ritrovo alle ${orario(c.ora_partenza)}. Da adesso puoi chiamare il conducente dall'app.`,
        url: `/corsa/${c.id}`,
        corsa: c.id, prenotazione: p.id,
        chiave: `arrivo:${p.id}`,
      })
    }
    if (lista.length > 0) {
      await notifica({
        destinatario: c.conducente,
        tipo: 'in_arrivo',
        titolo: `${lista.length} ${lista.length === 1 ? 'persona ti aspetta' : 'persone ti aspettano'}`,
        testo: `Partenza da ${c.origine_label} alle ${orario(c.ora_partenza)}.`,
        url: `/corsa/${c.id}`,
        corsa: c.id,
        chiave: `arrivo-c:${c.id}`,
      })
    }
  }
}

/** T−0 · si cattura e il prezzo si chiude. */
export async function catturaPartenze() {
  const { data: corse } = await db
    .from('corse')
    .select('id')
    .eq('stato', 'confermata')
    .lte('ora_partenza', ora().toISOString())
    .gte('ora_partenza', new Date(Date.now() - 30 * 60_000).toISOString())

  const esiti = []
  for (const c of corse ?? []) {
    const t = Date.now()
    try {
      esiti.push(await catturaCorsa(c.id))
      await db.from('lavori').insert({
        nome: 'cattura', corsa: c.id, durata_ms: Date.now() - t,
        chiave: `cattura:${c.id}`,
      })
    } catch (e) {
      await db.from('lavori').insert({
        nome: 'cattura', corsa: c.id, errore: String(e),
        chiave: `cattura-err:${c.id}:${Date.now()}`,
      })
    }
  }
  return esiti
}

/**
 * Dopo l'arrivo · si chiude la corsa e si chiede al passeggero com'è andata.
 *
 * La domanda è formulata perché rispondere non sia necessario. Chi è
 * arrivato alle quattro del mattino non risponde a un sondaggio: se
 * pretendessimo una conferma attiva non la riceveremmo, e poi non sapremmo
 * se il silenzio significa «tutto bene» o «non ho letto».
 */
export async function chiudiArrivate() {
  const { data: corse } = await db
    .from('corse')
    .select('id')
    .eq('stato', 'in_corso')
    .lte('ora_arrivo', new Date(Date.now() - 20 * 60_000).toISOString())

  const esiti = []
  for (const c of corse ?? []) esiti.push(await concludiCorsa(c.id))
  return esiti
}

/** Le proposte scadute decadono. Il silenzio vale rifiuto, mai accettazione. */
export async function scadiProposte() {
  const { data: scadute } = await db
    .from('prenotazioni')
    .select('id, passeggero, corsa')
    .eq('stato', 'richiesta')
    .lt('scade_il', ora().toISOString())

  for (const p of scadute ?? []) {
    await db.from('prenotazioni').update({ stato: 'scaduta' }).eq('id', p.id)
    await notifica({
      destinatario: p.passeggero,
      tipo: 'proposta_rifiutata',
      titolo: 'La tua richiesta è scaduta',
      testo: 'Il conducente non ha risposto in tempo. Non ti abbiamo addebitato nulla.',
      url: '/cerca',
      corsa: p.corsa, prenotazione: p.id,
      chiave: `scaduta:${p.id}`,
    })
  }
}

/**
 * Chi cercava e non trovava viene avvisato quando compare qualcosa.
 *
 * È il lavoro che tiene in vita il primo anno: senza, chi cerca in un
 * momento vuoto se ne va e non torna, e non sa mai che il giorno dopo
 * qualcuno ha pubblicato esattamente la sua tratta.
 */
export async function avvisaChiCercava(corsaId: string) {
  const { data: c } = await db
    .from('corse')
    .select('id, ora_arrivo, destinazione_geo, destinazione_label, percorso, posti_offerti')
    .eq('id', corsaId).single()
  if (!c) return 0

  const { data: richieste } = await db.rpc('richieste_compatibili', {
    p_corsa: corsaId, p_raggio_m: 5000, p_finestra_min: 90,
  })

  let avvisati = 0
  for (const r of (richieste ?? []) as Array<{ id: string; passeggero: string }>) {
    const esito = await notifica({
      destinatario: r.passeggero,
      tipo: 'rimatch_proposto',
      titolo: 'È comparso un passaggio per te',
      testo: `Qualcuno va a ${c.destinazione_label} intorno all'orario che cercavi.`,
      url: `/corsa/${c.id}`,
      corsa: c.id,
      chiave: `avviso:${r.id}:${c.id}`,
    })
    if (esito === 'push' || esito === 'sms') avvisati++
  }
  return avvisati
}

// ─── utilità ──────────────────────────────────────────────────────────────
async function passeggeri(corsaId: string) {
  const { data } = await db
    .from('prenotazioni')
    .select('id, passeggero')
    .eq('corsa', corsaId)
    .in('stato', ['autorizzata', 'catturata'])
  return data ?? []
}


