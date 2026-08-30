import { db } from './db.ts'
import { notifica } from './notifiche.ts'
import { annulla } from './stripe.ts'
import { cerca } from './ricerca.ts'

/**
 * Rimatch.
 *
 * Quando un conducente non conferma o annulla, i suoi passeggeri sono a
 * piedi — di notte, spesso lontano da casa, spesso senza alternative. È il
 * momento in cui si perde un utente per sempre, e nessuna quantità di
 * recensioni lo recupera.
 *
 * È anche la funzione col miglior rapporto fra valore e righe di codice di
 * tutto il prodotto: risolve circa il 60 % dei mancati passaggi e porta il
 * costo atteso del no-show da un euro a quaranta centesimi per corsa. Va
 * scritta nella prima versione, non rimandata a quando "ci sarà volume" —
 * è nel primo anno, quando i conducenti sono pochi e inaffidabili, che
 * serve di più.
 */

export interface EsitoRimatch {
  passeggeriCoinvolti: number
  alternativeTrovate: number
  passeggeriConAlternativa: number
}

export async function rimatch(corsaId: string, motivo: 'non_conferma' | 'annullata'): Promise<EsitoRimatch> {
  const { data: corsa } = await db
    .from('corse')
    .select('id, ora_arrivo, destinazione_geo, destinazione_label')
    .eq('id', corsaId)
    .single()
  if (!corsa) throw new Error('corsa non trovata')

  const { data: prenotazioni } = await db
    .from('prenotazioni')
    .select('id, passeggero, stripe_payment_intent, fermata, fermate(geo, etichetta)')
    .eq('corsa', corsaId)
    .in('stato', ['autorizzata', 'richiesta'])

  const colpiti = prenotazioni ?? []
  const esito: EsitoRimatch = {
    passeggeriCoinvolti: colpiti.length,
    alternativeTrovate: 0,
    passeggeriConAlternativa: 0,
  }
  if (colpiti.length === 0) return esito

  const arrivo = new Date(corsa.ora_arrivo)

  for (const p of colpiti) {
    // Prima si libera la carta. Non si tiene bloccato il denaro di qualcuno
    // che è rimasto a piedi: è il minimo, e va fatto prima di ogni altra cosa.
    if (p.stripe_payment_intent) {
      try { await annulla(p.stripe_payment_intent) } catch { /* già chiuso */ }
    }
    await db.from('prenotazioni')
      .update({ stato: 'annullata' })
      .eq('id', p.id)

    const partenza = (p.fermate as { geo?: unknown; etichetta?: string } | null)
    const origine = puntoDa(partenza?.geo) ?? puntoDa(corsa.destinazione_geo)
    if (!origine) continue

    // Finestra larga: chi è rimasto a piedi accetta volentieri di arrivare
    // un'ora dopo. Stringere qui significa non trovare nulla.
    const alternative = await cerca({
      origine,
      destinazione: puntoDa(corsa.destinazione_geo)!,
      da: new Date(arrivo.getTime() - 90 * 60_000),
      a: new Date(arrivo.getTime() + 120 * 60_000),
      raggioM: 6000,
    })

    const utili = alternative.filter((a) => a.corsaId !== corsaId).slice(0, 5)
    esito.alternativeTrovate += utili.length
    if (utili.length > 0) esito.passeggeriConAlternativa++

    await notifica({
      destinatario: p.passeggero,
      tipo: utili.length > 0 ? 'rimatch_proposto' : 'corsa_annullata',
      titolo: utili.length > 0
        ? 'Il tuo passaggio è saltato — ne abbiamo altri'
        : 'Il tuo passaggio è saltato',
      testo: utili.length > 0
        ? `${testoMotivo(motivo)} Abbiamo trovato ${utili.length} ${utili.length === 1 ? 'alternativa' : 'alternative'} per ${corsa.destinazione_label}. Non ti abbiamo addebitato nulla.`
        : `${testoMotivo(motivo)} Al momento non ci sono altri passaggi. Non ti abbiamo addebitato nulla e ti avvisiamo se ne compare uno.`,
      url: utili.length > 0 ? `/rimatch/${p.id}` : `/cerca`,
      corsa: corsaId,
      prenotazione: p.id,
      chiave: `rimatch:${p.id}`,
    })

    // Nessuna alternativa: si registra la ricerca, così se un conducente
    // pubblica nella prossima mezz'ora questa persona viene avvisata.
    if (utili.length === 0) {
      await db.from('richieste_passaggio').insert({
        passeggero: p.passeggero,
        origine_label: partenza?.etichetta ?? 'punto di partenza',
        origine_geo: `SRID=4326;POINT(${origine.lng} ${origine.lat})`,
        destinazione_label: corsa.destinazione_label,
        destinazione_geo: corsa.destinazione_geo,
        ora_arrivo: corsa.ora_arrivo,
        flessibilita_min: 120,
      })
    }
  }

  await db.from('corse').update({ stato: 'annullata' }).eq('id', corsaId)
  await db.from('lavori').insert({
    nome: 'rimatch',
    corsa: corsaId,
    esito: JSON.stringify(esito),
    chiave: `rimatch:${corsaId}`,
  })

  return esito
}

const testoMotivo = (m: 'non_conferma' | 'annullata') =>
  m === 'non_conferma'
    ? 'Il conducente non ha confermato.'
    : 'Il conducente ha annullato.'

function puntoDa(v: unknown): { lat: number; lng: number } | null {
  if (typeof v === 'object' && v !== null && 'coordinates' in v) {
    const c = (v as { coordinates: [number, number] }).coordinates
    return { lng: c[0], lat: c[1] }
  }
  return null
}
