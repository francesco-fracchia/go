import { db, DEMO, leggiEnv } from './db.ts'

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
 * Le varianti di uno stesso viaggio.
 *
 * Per ora una sola: evitare l'autostrada. Non è un vezzo — su una tratta
 * come Lodi-Milano il percorso ordinario e quello che sta sulle statali
 * differiscono di pochi chilometri e di venti minuti, ma di un pedaggio
 * intero. Chi decide se partire quel confronto lo fa comunque, a mente e
 * male.
 */
export interface OpzioniPercorso { evitaAutostrada?: boolean }

/**
 * Arrotondamento a circa 100 metri. È quello che rende la cache utile: due
 * partenze dalla stessa piazza non hanno mai le stesse coordinate al
 * centesimo di grado, ma sono lo stesso percorso.
 */
const griglia = (p: Punto) => `${p.lat.toFixed(3)},${p.lng.toFixed(3)}`
const chiaveDi = (punti: Punto[]) => punti.map(griglia).join('|')

export async function percorso(
  punti: Punto[], opzioni: OpzioniPercorso = {},
): Promise<Percorso> {
  if (punti.length < 2) throw new Error('servono almeno due punti')

  // Niente chiamate esterne in dimostrazione: si stima in linea d'aria con
  // un fattore di tortuosità. Basta a far comparire un prezzo credibile.
  if (DEMO) {
    const km = Math.round(distanzaAerea(punti) * 1.35 * 10) / 10
    return { km, minuti: Math.round(km * 1.1) + 5, polilinea: punti.map((p) => [p.lng, p.lat]) }
  }

  // La variante fa parte dell'identità del percorso: senza il suffisso, il
  // primo che chiede «senza autostrada» riceverebbe per sempre la risposta
  // con l'autostrada, dalla cache, senza che nessuno se ne accorga.
  const chiave = chiaveDi(punti) + (opzioni.evitaAutostrada ? '|senza-autostrada' : '')

  /**
   * La cache si rilegge con una funzione, non con una select.
   *
   * La colonna è una geography, e PostgREST la restituisce come stringa
   * esadecimale: leggerla direttamente dava una polilinea VUOTA, con i
   * chilometri giusti accanto e nessun errore. Il danno arrivava dopo, in
   * chi scriveva quella polilinea in una corsa: `LINESTRING()` senza punti,
   * che PostGIS rifiuta. Ogni tratta funzionava una volta sola — la prima,
   * quella che riempiva la cache.
   */
  const { data: cache } = await db.rpc('leggi_percorso', { p_chiave: chiave })
  const cached = Array.isArray(cache) ? cache[0] : cache

  if (cached) {
    const polilinea = leggiLinestring(cached.percorso)
    // Una riga che non sa più dire da dove passa non è una cache: è una
    // risposta sbagliata più veloce. Si ricalcola.
    if (polilinea.length > 0) {
      void db.rpc('tocca_percorso', { p_chiave: chiave })
      return { km: Number(cached.km), minuti: cached.minuti, polilinea }
    }
  }

  const calcolato = await calcolaConOrs(punti, opzioni)
  // `upsert` e non `insert`: se la riga c'è ma era illeggibile la si
  // sostituisce, invece di fallire sulla chiave e riprovare per sempre.
  await db.from('percorsi_cache').upsert({
    chiave,
    km: calcolato.km,
    minuti: calcolato.minuti,
    percorso: aLinestring(calcolato.polilinea),
  }, { onConflict: 'chiave' })
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

async function calcolaConOrs(
  punti: Punto[], opzioni: OpzioniPercorso = {},
): Promise<Percorso> {
  const chiave = leggiEnv('ORS_API_KEY')
  if (!chiave) throw new Error("variabile d'ambiente mancante: ORS_API_KEY")

  const risposta = await fetch(ORS, {
    method: 'POST',
    headers: { Authorization: chiave, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      coordinates: punti.map((p) => [p.lng, p.lat]),
      ...(opzioni.evitaAutostrada
        ? { options: { avoid_features: ['highways'] } }
        : {}),
    }),
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


/**
 * Il freno del calcolo percorsi.
 *
 * Fratello di `statoMappa`, e per la stessa ragione. Il calcolatore
 * pubblico è raggiungibile senza account: chiunque, anche uno script,
 * può chiedere percorsi, e ogni percorso che non è già in cache è una
 * chiamata a OpenRouteService che consuma la quota gratuita.
 *
 * Le righe create oggi in `percorsi_cache` SONO le chiamate fatte oggi:
 * la cache si scrive esattamente quando ORS risponde. Non serve un
 * contatore a parte, e un contatore a parte sarebbe potuto andare fuori
 * sincrono con la cosa che conta.
 *
 * Superata la soglia il calcolatore non si rompe: smette di accettare
 * tratte NUOVE, e continua a rispondere su quelle già in cache — che
 * sono le più chieste. Degrada, non si guasta.
 */
export const SOGLIA_PERCORSI_GIORNO = 1_500

export async function percorsiNuoviOggi(): Promise<number> {
  const inizio = new Date()
  inizio.setHours(0, 0, 0, 0)
  const { count } = await db
    .from('percorsi_cache')
    .select('chiave', { count: 'exact', head: true })
    .gte('creato_il', inizio.toISOString())
  return count ?? 0
}

/** Se questa coppia di punti è già stata calcolata, e quindi è gratis. */
export async function giaInCache(
  punti: Punto[], opzioni: OpzioniPercorso = {},
): Promise<boolean> {
  const chiave = chiaveDi(punti) + (opzioni.evitaAutostrada ? '|senza-autostrada' : '')
  const { data } = await db.rpc('leggi_percorso', { p_chiave: chiave })
  const riga = Array.isArray(data) ? data[0] : data
  return Boolean(riga && leggiLinestring(riga.percorso).length > 0)
}
