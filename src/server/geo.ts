/**
 * Leggere un punto da PostGIS.
 *
 * Una colonna `geography` non torna sempre nella stessa forma. Attraverso
 * PostgREST arriva come **WKB esadecimale** — una stringa come
 * `0101000020E6100000…` — mentre attraverso una funzione che fa
 * `st_asgeojson` arriva come oggetto GeoJSON. Il codice leggeva solo la
 * seconda forma, e sulla prima trovava `undefined`.
 *
 * Non trovarlo non era il problema: il problema era cosa succedeva dopo.
 * `c?.[1] ?? 0` trasformava «non lo so» in «zero», e zero è un posto vero —
 * il Golfo di Guinea. Il luogo salvato di casa diventava un punto in mezzo
 * all'Atlantico, il modulo lo accettava come coordinata valida, e il
 * servizio di navigazione rispondeva l'unica cosa sensata: «nessuna strada
 * entro trecentocinquanta metri da 0.0000000 0.0000000».
 *
 * È la terza volta in questo progetto che uno zero inventato costa una
 * giornata. Qui non se ne inventa nessuno: se il punto non si legge, non
 * c'è.
 */

export interface Punto { lat: number; lng: number }

export function leggiPunto(valore: unknown): Punto | null {
  if (valore === null || valore === undefined) return null

  // Forma GeoJSON: com'è quando arriva da st_asgeojson, o dai dati finti.
  if (typeof valore === 'object') {
    const c = (valore as { coordinates?: unknown }).coordinates
    if (Array.isArray(c) && c.length >= 2) return punto(Number(c[0]), Number(c[1]))
    return null
  }

  if (typeof valore !== 'string') return null

  // Forma GeoJSON serializzata.
  const t = valore.trim()
  if (t.startsWith('{')) {
    try { return leggiPunto(JSON.parse(t)) } catch { return null }
  }

  return daWkb(t)
}

/**
 * WKB esadecimale di un POINT.
 *
 *   1 byte    ordine dei byte: 00 grande, 01 piccolo
 *   4 byte    tipo — 1 è il punto; il bit 0x20000000 dice «c'è anche l'SRID»
 *   4 byte    l'SRID, se annunciato
 *   8 + 8     longitudine e latitudine, in quest'ordine
 *
 * Si legge a mano invece di aggiungere una libreria: sono quindici righe,
 * e una dipendenza per quindici righe è una dipendenza che un giorno va
 * aggiornata.
 */
function daWkb(hex: string): Punto | null {
  if (!/^[0-9a-fA-F]+$/.test(hex) || hex.length < 42) return null

  const byte = (i: number) => Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  const buf = new Uint8Array(hex.length / 2)
  for (let i = 0; i < buf.length; i++) buf[i] = byte(i)!
  const vista = new DataView(buf.buffer)

  const piccolo = buf[0] === 1
  const tipo = vista.getUint32(1, piccolo)
  if ((tipo & 0xFF) !== 1) return null              // non è un punto
  const conSrid = (tipo & 0x20000000) !== 0
  const inizio = conSrid ? 9 : 5
  if (buf.length < inizio + 16) return null

  return punto(vista.getFloat64(inizio, piccolo), vista.getFloat64(inizio + 8, piccolo))
}

/** Un punto esiste solo se è un posto del mondo, e non l'origine degli assi. */
function punto(lng: number, lat: number): Punto | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
  if (lat === 0 && lng === 0) return null
  return { lat, lng }
}
