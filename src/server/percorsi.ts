import { db, DEMO } from './db.ts'

/**
 * Calcolo dei percorsi, con cache.
 *
 * I chilometri prodotti qui finiscono dritti nel motore dei prezzi: sono la
 * base su cui si calcola quanto ciascuno paga. Un errore qui non è un
 * fastidio di interfaccia, è un importo sbagliato.
 */

export interface Punto { lat: number; lng: number }
export interface Percorso { km: number; minuti: number; polilinea: [number, number][] }

/**
 * Arrotondamento a circa 100 metri. È quello che rende la cache utile: due
 * partenze dalla stessa piazza non hanno mai le stesse coordinate al
 * centesimo di grado, ma sono lo stesso percorso.
 */
const griglia = (p: Punto) => `${p.lat.toFixed(3)},${p.lng.toFixed(3)}`
const chiaveDi = (punti: Punto[]) => punti.map(griglia).join('|')

export async function percorso(punti: Punto[]): Promise<Percorso> {
  if (punti.length < 2) throw new Error('servono almeno due punti')

  // Niente chiamate esterne in dimostrazione: si stima in linea d'aria con
  // un fattore di tortuosità. Basta a far comparire un prezzo credibile.
  if (DEMO) {
    const km = Math.round(distanzaAerea(punti) * 1.35 * 10) / 10
    return { km, minuti: Math.round(km * 1.1) + 5, polilinea: punti.map((p) => [p.lng, p.lat]) }
  }

  const chiave = chiaveDi(punti)

  const { data: cached } = await db
    .from('percorsi_cache')
    .select('km, minuti, percorso')
    .eq('chiave', chiave)
    .maybeSingle()

  if (cached) {
    void db.rpc('tocca_percorso', { p_chiave: chiave })
    return {
      km: Number(cached.km),
      minuti: cached.minuti,
      polilinea: leggiLinestring(cached.percorso),
    }
  }

  const calcolato = await calcolaConOrs(punti)
  await db.from('percorsi_cache').insert({
    chiave,
    km: calcolato.km,
    minuti: calcolato.minuti,
    percorso: aLinestring(calcolato.polilinea),
  })
  return calcolato
}

/**
 * Chilometri aggiuntivi per passare da un punto fuori percorso.
 *
 * Si calcola per differenza fra il percorso con la deviazione e quello
 * senza, non stimando dalla distanza in linea d'aria: un punto a due
 * chilometri dall'altra parte di un fiume può costarne quindici.
 */
export async function kmDeviazione(
  origine: Punto, destinazione: Punto, ritiro: Punto,
): Promise<number> {
  const [diretto, deviato] = await Promise.all([
    percorso([origine, destinazione]),
    percorso([origine, ritiro, destinazione]),
  ])
  return Math.max(0, Math.round((deviato.km - diretto.km) * 10) / 10
  )
}

const ORS = 'https://api.openrouteservice.org/v2/directions/driving-car/geojson'

async function calcolaConOrs(punti: Punto[]): Promise<Percorso> {
  const chiave = process.env.ORS_API_KEY
  if (!chiave) throw new Error("variabile d'ambiente mancante: ORS_API_KEY")

  const risposta = await fetch(ORS, {
    method: 'POST',
    headers: { Authorization: chiave, 'Content-Type': 'application/json' },
    body: JSON.stringify({ coordinates: punti.map((p) => [p.lng, p.lat]) }),
  })
  if (!risposta.ok) {
    throw new Error(`routing non riuscito: ${risposta.status} ${await risposta.text()}`)
  }
  const dati = await risposta.json() as {
    features: Array<{
      properties: { summary: { distance: number; duration: number } }
      geometry: { coordinates: [number, number][] }
    }>
  }
  const f = dati.features[0]
  if (!f) throw new Error('nessun percorso trovato fra i punti indicati')
  return {
    km: Math.round((f.properties.summary.distance / 1000) * 10) / 10,
    minuti: Math.round(f.properties.summary.duration / 60),
    polilinea: f.geometry.coordinates,
  }
}

const aLinestring = (c: [number, number][]) =>
  `SRID=4326;LINESTRING(${c.map(([lng, lat]) => `${lng} ${lat}`).join(',')})`

function leggiLinestring(v: unknown): [number, number][] {
  if (typeof v === 'object' && v !== null && 'coordinates' in v) {
    return (v as { coordinates: [number, number][] }).coordinates
  }
  return []
}

/** Distanza in linea d'aria lungo una serie di punti, in chilometri. */
function distanzaAerea(punti: Punto[]): number {
  let km = 0
  for (let i = 1; i < punti.length; i++) {
    const a = punti[i - 1]!, b = punti[i]!
    const dLat = (b.lat - a.lat) * Math.PI / 180
    const dLng = (b.lng - a.lng) * Math.PI / 180
    const m = Math.sin(dLat / 2) ** 2 +
      Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2
    km += 6371 * 2 * Math.atan2(Math.sqrt(m), Math.sqrt(1 - m))
  }
  return km
}
