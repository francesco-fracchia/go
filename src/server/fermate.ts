import { db } from './db.ts'
import { leggiPunto, type Punto } from './geo.ts'

/**
 * Dove si sale, quando non è il punto di partenza della corsa.
 *
 * Il punto di ritiro non è mai stato salvato. La ricerca calcolava quanto
 * il conducente devia per venirti a prendere, lo mostrava — «Passa vicino a
 * te» — e alla prenotazione restava solo il NUMERO di chilometri: il posto
 * spariva. Il conducente si vedeva scritto che salivi alla sua origine, e
 * nessuno glielo aveva detto altrimenti.
 *
 * Senza il punto non esiste nemmeno la domanda che viene dopo: in che
 * ordine passare a prendere tre persone, e a che ora uscire di casa.
 */

/** Sotto questa distanza è la stessa fermata: un isolato, non un indirizzo. */
export const STESSO_PUNTO_M = 150

const geo = (p: Punto) => `SRID=4326;POINT(${p.lng} ${p.lat})`

/** Metri fra due punti. Formula dell'emisenoverso, basta e avanza a queste distanze. */
export function metriFra(a: Punto, b: Punto): number {
  const R = 6_371_000
  const rad = (g: number) => (g * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return Math.round(2 * R * Math.asin(Math.sqrt(h)))
}

/**
 * La fermata di ritiro esistente per questo punto, se c'è.
 *
 * Riusarla quando qualcuno sale dove sale già un altro non è un risparmio
 * di righe: è il motore dei prezzi che divide la deviazione fra chi la
 * condivide, ed è una sosta sola invece di due nell'orario di chi guida.
 * Due persone allo stesso portone sono una fermata.
 */
export async function ritiroVicino(
  corsaId: string, punto: Punto,
): Promise<string | null> {
  const { data } = await db
    .from('fermate').select('id, geo').eq('corsa', corsaId).eq('tipo', 'ritiro')
  for (const f of data ?? []) {
    const p = leggiPunto(f.geo)
    if (p && metriFra(p, punto) <= STESSO_PUNTO_M) return f.id
  }
  return null
}

/**
 * Una fermata di ritiro nuova.
 *
 * Si chiama DOPO che il preventivo ha detto di sì. Crearla prima
 * lascerebbe una fermata a cui non sale nessuno ogni volta che una
 * prenotazione viene rifiutata — e le fermate hanno un numero d'ordine
 * unico per corsa, quindi i posti in fila sono contati.
 */
export async function creaRitiro(
  corsaId: string, punto: Punto, etichetta: string, kmDeviazione: number,
): Promise<string> {
  const { data: gia } = await db
    .from('fermate').select('ordine').eq('corsa', corsaId)

  /*
   * L'origine è la 0 e la destinazione la 99: in mezzo ci sta il resto.
   * Questo numero è solo un posto in fila che non collida — l'ordine VERO
   * dei ritiri lo decide la strada, e si legge dagli orari calcolati.
   */
  const usati = new Set((gia ?? []).map((f) => f.ordine))
  let ordine = 1
  while (usati.has(ordine) && ordine < 99) ordine++
  if (ordine >= 99) throw new Error('troppe fermate su questa corsa')

  const { data, error } = await db
    .from('fermate')
    .insert({
      corsa: corsaId, ordine, tipo: 'ritiro', etichetta,
      geo: geo(punto), km_incrementali: Math.max(0, kmDeviazione),
    })
    .select('id')
    .single()
  if (error || !data) throw new Error(`fermata di ritiro non creata: ${error?.message}`)
  return data.id
}
