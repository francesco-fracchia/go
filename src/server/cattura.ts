import { db } from './db.ts'
import { cattura, annulla } from './stripe.ts'
import { preventivo, type Corsa, type Passeggero } from '../lib/pricing.ts'

/**
 * Cattura alla partenza.
 *
 * È il momento in cui il prezzo si chiude. Chi ha prenotato per primo aveva
 * autorizzato la fee da passeggero solo; se nel frattempo la macchina si è
 * riempita, la sua fee è scesa e qui si cattura meno. Il risparmio arriva
 * senza rimborsi e senza commissioni buttate.
 */
export async function catturaCorsa(corsaId: string) {
  const { data: riga } = await db
    .from('corse')
    .select('*, veicoli(centesimi_per_km)')
    .eq('id', corsaId)
    .single()
  if (!riga) throw new Error('corsa non trovata')

  const { data: prenotazioni } = await db
    .from('prenotazioni')
    .select('*, fermate(km_incrementali)')
    .eq('corsa', corsaId)
    .eq('stato', 'autorizzata')

  const attive = prenotazioni ?? []
  if (attive.length === 0) {
    await db.from('corse').update({ stato: 'scaduta' }).eq('id', corsaId)
    return { catturate: 0, incassato: 0 }
  }

  const corsa: Corsa = {
    modalita: riga.modalita,
    kmBase: Number(riga.km_base),
    centesimiPerKm: Number(riga.veicoli.centesimi_per_km),
    pedaggio: riga.pedaggio_cent,
    parcheggio: riga.parcheggio_cent,
    postiOfferti: riga.posti_offerti,
    scontoConducente: riga.sconto_cent,
  }
  const passeggeri: Passeggero[] = attive.map((p): Passeggero => ({
    id: p.passeggero,
    fermataId: p.fermata ?? undefined,
    kmDeviazione: Number(p.fermate?.km_incrementali ?? 0),
    esente: p.esente,
  }))

  const calcolo = preventivo(corsa, passeggeri)
  let incassato = 0
  let catturate = 0

  for (const p of attive) {
    const q = calcolo.quote.find((x) => x.passeggeroId === p.passeggero)
    if (!q) continue

    /**
     * «Niente da incassare» non è «niente da fare».
     *
     * Qui c'era `if (!q || !p.stripe_payment_intent) continue`, e quel
     * `continue` saltava anche l'aggiornamento di stato più sotto. Una
     * prenotazione senza PaymentIntent restava `autorizzata` per sempre
     * mentre la corsa proseguiva fino a `conclusa`: non diventava mai
     * `catturata`, quindi non maturava, non entrava in `maturato_conducente`
     * — che conta solo `catturata` e `completata` — e non riceveva mai
     * l'invito a recensire. Il passeggero spariva dopo il viaggio.
     *
     * Capita in due casi veri. Il passeggero ESENTE, che il motore prevede
     * («esenzione totale — solo in modalità privata, la assorbe il
     * conducente»): non ha niente da autorizzare, quindi non ha un intent.
     * E la prenotazione il cui intent non è stato scritto perché la seconda
     * scrittura è fallita a metà.
     *
     * Il primo caso è normale e va registrato. Il secondo è un'anomalia e va
     * URLATA, non saltata in silenzio: sono soldi che qualcuno si aspetta.
     */
    /**
     * Il saldo unico andata e ritorno.
     *
     * Se questa prenotazione è saldata da un'altra, i suoi soldi li ha già
     * presi la gemella all'andata: qui non c'è niente da catturare, ma c'è
     * eccome da CHIUDERE. Lasciarla `autorizzata` la escluderebbe da
     * `maturato_conducente` — che conta solo `catturata` e `completata` —
     * e chi guida non verrebbe pagato per il rientro che ha fatto davvero.
     */
    if (p.saldata_con) {
      await db.from('prenotazioni').update({
        quota_cent: q.quota, deviazione_cent: q.deviazione,
        fee_cent: q.fee, totale_cent: q.totale,
        catturato_cent: 0, stato: 'catturata',
      }).eq('id', p.id)
      continue
    }

    if (!p.stripe_payment_intent && q.totale > 0) {
      console.error(
        `prenotazione ${p.id}: ${q.totale} centesimi da incassare e nessun `
        + 'PaymentIntent. Non è stata catturata e non è stata chiusa.',
      )
      continue
    }

    /**
     * Quanto c'è da prendere: questa tratta, più quella che salda.
     *
     * Su un andata e ritorno l'autorizzazione è una sola e copre entrambe.
     * Si cattura tutto alla PRIMA partenza, non alla seconda: una cattura
     * parziale su Stripe chiude l'autorizzazione e libera il resto, quindi
     * un secondo prelievo non esisterebbe. Prendere tutto adesso è l'unica
     * forma che regge — ed è coerente con quello che il passeggero ha
     * scelto, cioè un viaggio solo in due tratte.
     */
    const { data: collegate } = await db
      .from('prenotazioni')
      .select('totale_cent')
      .eq('saldata_con', p.id)
      .not('stato', 'in', '("rifiutata","scaduta","annullata")')
    const daAltre = (collegate ?? []).reduce((sum, x) => sum + x.totale_cent, 0)
    const daPrendere = q.totale + daAltre

    // Non si cattura mai più di quanto autorizzato: se la matematica lo
    // chiedesse, c'è un errore a monte e ci si ferma.
    if (daPrendere > p.autorizzato_cent) {
      throw new Error(
        `prenotazione ${p.id}: da catturare ${daPrendere} su ${p.autorizzato_cent} autorizzati`,
      )
    }

    if (p.stripe_payment_intent) {
      if (daPrendere === 0) {
        // Autorizzato e poi diventato gratuito: si libera la carta invece di
        // catturare zero, che su Stripe costa comunque la commissione fissa.
        await annulla(p.stripe_payment_intent)
      } else {
        await cattura(p.stripe_payment_intent, daPrendere)
        incassato += daPrendere
        catturate++
      }
    }

    await db.from('prenotazioni').update({
      quota_cent: q.quota,
      deviazione_cent: q.deviazione,
      fee_cent: q.fee,
      totale_cent: q.totale,
      // Si registra quanto è stato PRESO su questa riga, che su un andata
      // e ritorno comprende anche la tratta gemella.
      catturato_cent: daPrendere,
      stato: 'catturata',
    }).eq('id', p.id)
  }

  await db.from('corse').update({ stato: 'in_corso' }).eq('id', corsaId)
  return { catturate, incassato, calcolo }
}
