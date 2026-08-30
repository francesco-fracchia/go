/**
 * Leggere numeri da una stringa di richiesta.
 *
 * `Number(null)` fa **zero**, non `NaN` — e `Number.isFinite(0)` è vero.
 * Quindi un parametro assente supera qualunque controllo di validità e
 * diventa uno zero credibile: una ricerca senza coordinate partiva dal
 * Golfo di Guinea, e la schermata dei posti mostrava zero risultati con
 * milleecento righe nel database.
 *
 * Non dà errori, non rallenta, mostra semplicemente il posto sbagliato: è
 * la categoria di guasto che costa più tempo a trovare.
 */
export function numero(q: URLSearchParams, chiave: string): number | undefined {
  const grezzo = q.get(chiave)
  if (grezzo === null || grezzo.trim() === '') return undefined
  const n = Number(grezzo)
  return Number.isFinite(n) ? n : undefined
}

/** Un punto, o niente se manca anche una sola delle due coordinate. */
export function punto(
  q: URLSearchParams, lat = 'lat', lng = 'lng',
): { lat: number; lng: number } | undefined {
  const a = numero(q, lat), b = numero(q, lng)
  if (a === undefined || b === undefined) return undefined
  if (Math.abs(a) > 90 || Math.abs(b) > 180) return undefined
  return { lat: a, lng: b }
}
