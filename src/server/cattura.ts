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
    if (!q || !p.stripe_payment_intent) continue

    // Non si cattura mai più di quanto autorizzato: se la matematica lo
    // chiedesse, c'è un errore a monte e ci si ferma.
    if (q.totale > p.autorizzato_cent) {
      throw new Error(
        `prenotazione ${p.id}: da catturare ${q.totale} su ${p.autorizzato_cent} autorizzati`,
      )
    }

    if (q.totale === 0) {
      await annulla(p.stripe_payment_intent)
    } else {
      await cattura(p.stripe_payment_intent, q.totale)
      incassato += q.totale
      catturate++
    }

    await db.from('prenotazioni').update({
      quota_cent: q.quota,
      deviazione_cent: q.deviazione,
      fee_cent: q.fee,
      totale_cent: q.totale,
      catturato_cent: q.totale,
      stato: 'catturata',
    }).eq('id', p.id)
  }

  await db.from('corse').update({ stato: 'in_corso' }).eq('id', corsaId)
  return { catturate, incassato, calcolo }
}
