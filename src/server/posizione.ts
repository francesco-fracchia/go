import { db } from './db.ts'
import { leggiPunto } from './geo.ts'
import { percorso } from './percorsi.ts'

/**
 * Dov'è chi guida.
 *
 * Risponde alla domanda che il passeggero si fa davvero — «devo scendere
 * adesso?» — e a cui nessuna stima fatta tre ore prima può rispondere.
 *
 * I minuti che mancano si calcolano dalla posizione vera al punto di
 * ritrovo, con lo stesso servizio di percorsi che usiamo per i prezzi.
 * Comprare un servizio con il traffico costerebbe per ogni corsa, e di notte
 * il traffico non c'è: si pagherebbe per un dato che vale zero proprio
 * quando serve.
 */

/** Ogni quanto il telefono di chi guida manda un punto. */
export const OGNI_SECONDI = 45

/** Oltre questo, il punto è vecchio e non si mostra: sembrerebbe vero. */
export const SCADE_DOPO_MINUTI = 5

export interface Posizione {
  lat: number
  lng: number
  minuti: number | null
  aggiornataIl: string
}

export async function segnaPosizione(opts: {
  corsaId: string
  conducenteId: string
  lat: number
  lng: number
  /** punto di ritrovo verso cui stimare i minuti */
  verso?: { lat: number; lng: number }
}): Promise<{ accettata: boolean; minuti: number | null }> {
  let minuti: number | null = null

  // La stima si fa solo se c'è un punto verso cui farla, e si tollera che
  // fallisca: la posizione da sola vale già più di niente.
  if (opts.verso) {
    try {
      const p = await percorso([{ lat: opts.lat, lng: opts.lng }, opts.verso])
      minuti = p.minuti
    } catch { /* si manda la posizione senza stima */ }
  }

  const { data } = await db.rpc('segna_posizione', {
    p_corsa: opts.corsaId,
    p_conducente: opts.conducenteId,
    p_lat: opts.lat,
    p_lng: opts.lng,
    p_minuti: minuti,
  })
  return { accettata: data === true, minuti }
}

export async function posizioneDi(corsaId: string): Promise<Posizione | null> {
  const { data } = await db
    .from('posizioni_corsa')
    .select('geo, minuti_stimati, aggiornata_il')
    .eq('corsa', corsaId)
    .maybeSingle()
  if (!data) return null

  const vecchia =
    Date.now() - new Date(data.aggiornata_il).getTime() > SCADE_DOPO_MINUTI * 60_000
  if (vecchia) return null

  // La posizione arriva come WKB esadecimale, non come GeoJSON: si legge
  // con lo stesso lettore di tutto il resto.
  const p = leggiPunto(data.geo)
  if (!p) return null

  return {
    lng: p.lng, lat: p.lat,
    minuti: data.minuti_stimati ?? null,
    aggiornataIl: data.aggiornata_il,
  }
}

export async function dimenticaPosizioni(): Promise<number> {
  const { data } = await db.rpc('dimentica_posizioni')
  return Number(data ?? 0)
}
