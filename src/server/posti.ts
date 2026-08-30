import { db } from './db.ts'

/**
 * I posti dove si va.
 *
 * I candidati arrivano da OpenStreetMap tramite Overpass: gli stessi dati
 * delle mappe e dei percorsi, gratis, senza chiave e senza costo per
 * chiamata.
 *
 * Overpass però è lento e limitato: si interroga UNA VOLTA per zona e si
 * conserva. I posti non si spostano, e una discoteca aperta ieri è aperta
 * anche domani — non c'è nessuna ragione di chiederlo a ogni caricamento.
 */

export type Categoria =
  | 'discoteca' | 'bar' | 'ristorante' | 'cinema' | 'centro_commerciale'
  | 'piazza' | 'stazione' | 'aeroporto' | 'stadio' | 'universita'
  | 'ospedale' | 'palestra'

/**
 * Dalle etichette di OpenStreetMap alle nostre categorie.
 *
 * Le prime tre righe coprono il caso notturno, che è quello per cui questo
 * prodotto esiste. Il resto serve a non essere un'applicazione che d'estate
 * non ha niente da mostrare.
 */
const MAPPA: Array<{ filtro: string; categoria: Categoria }> = [
  { filtro: '["amenity"="nightclub"]', categoria: 'discoteca' },
  { filtro: '["amenity"="bar"]', categoria: 'bar' },
  { filtro: '["amenity"="pub"]', categoria: 'bar' },
  { filtro: '["amenity"="restaurant"]', categoria: 'ristorante' },
  { filtro: '["amenity"="cinema"]', categoria: 'cinema' },
  { filtro: '["shop"="mall"]', categoria: 'centro_commerciale' },
  { filtro: '["place"="square"]', categoria: 'piazza' },
  { filtro: '["railway"="station"]', categoria: 'stazione' },
  { filtro: '["aeroway"="aerodrome"]', categoria: 'aeroporto' },
  { filtro: '["leisure"="stadium"]', categoria: 'stadio' },
  { filtro: '["amenity"="university"]', categoria: 'universita' },
  { filtro: '["amenity"="hospital"]', categoria: 'ospedale' },
  { filtro: '["leisure"="fitness_centre"]', categoria: 'palestra' },
]

export const NOMI_CATEGORIA: Record<Categoria, string> = {
  discoteca: 'Discoteche', bar: 'Bar e pub', ristorante: 'Ristoranti',
  cinema: 'Cinema', centro_commerciale: 'Centri commerciali',
  piazza: 'Piazze', stazione: 'Stazioni', aeroporto: 'Aeroporti',
  stadio: 'Stadi', universita: 'Università', ospedale: 'Ospedali',
  palestra: 'Palestre',
}

export interface Posto {
  id: string
  nome: string
  categoria: Categoria
  citta: string | null
  distanzaM: number
  corse: number
  richieste: number
  lat: number
  lng: number
}

export async function postiVicini(opts: {
  lat: number; lng: number
  raggioM?: number
  categoria?: Categoria
  limite?: number
}): Promise<Posto[]> {
  const { data } = await db.rpc('posti_vicini', {
    p_geo: `SRID=4326;POINT(${opts.lng} ${opts.lat})`,
    p_raggio_m: opts.raggioM ?? 30_000,
    p_categoria: opts.categoria ?? null,
    p_limite: opts.limite ?? 40,
  })

  return ((data ?? []) as Array<Record<string, unknown>>).map((r): Posto => ({
    id: String(r.id),
    nome: String(r.nome),
    categoria: r.categoria as Categoria,
    citta: (r.citta as string) ?? null,
    distanzaM: Number(r.distanza_m),
    corse: Number(r.corse),
    richieste: Number(r.richieste),
    lat: Number(r.lat),
    lng: Number(r.lng),
  }))
}

const OVERPASS = 'https://overpass-api.de/api/interpreter'

/**
 * Popola i posti di una zona da OpenStreetMap.
 *
 * Si chiama a mano quando si apre una provincia nuova, non a ogni ricerca:
 * Overpass è un servizio comunitario e interrogarlo in continuazione è
 * scortese oltre che lento. Una zona si popola in una manciata di secondi e
 * poi resta.
 */
export async function importaZona(opts: {
  lat: number; lng: number; raggioM?: number
}): Promise<{ trovati: number; nuovi: number }> {
  const raggio = opts.raggioM ?? 25_000
  const corpo = `[out:json][timeout:60];(${
    MAPPA.map((m) =>
      `node${m.filtro}(around:${raggio},${opts.lat},${opts.lng});` +
      `way${m.filtro}(around:${raggio},${opts.lat},${opts.lng});`,
    ).join('')
  });out center tags;`

  const r = await fetch(OVERPASS, {
    method: 'POST',
    headers: { 'content-type': 'text/plain' },
    body: corpo,
  })
  if (!r.ok) throw new Error(`Overpass ha risposto ${r.status}`)

  const d = await r.json() as { elements?: ElementoOsm[] }
  const elementi = d.elements ?? []
  let nuovi = 0

  for (const e of elementi) {
    const tags = e.tags
    const nome = tags?.name?.trim()
    // Senza nome non serve a niente: «vado al bar» non identifica un posto.
    if (!nome) continue

    const categoria = categoriaDi(tags)
    if (!categoria) continue

    const lat = e.lat ?? e.center?.lat
    const lng = e.lon ?? e.center?.lon
    if (lat === undefined || lng === undefined) continue

    const { error } = await db.from('posti').upsert({
      osm_id: `${e.type}/${e.id}`,
      nome,
      categoria,
      citta: tags?.['addr:city'] ?? null,
      indirizzo: [tags?.['addr:street'], tags?.['addr:housenumber']]
        .filter(Boolean).join(' ') || null,
      geo: `SRID=4326;POINT(${lng} ${lat})`,
      aggiornato_il: new Date().toISOString(),
    }, { onConflict: 'osm_id' })
    if (!error) nuovi++
  }

  return { trovati: elementi.length, nuovi }
}

function categoriaDi(tags: Record<string, string> | undefined): Categoria | null {
  if (!tags) return null
  if (tags.amenity === 'nightclub') return 'discoteca'
  if (tags.amenity === 'bar' || tags.amenity === 'pub') return 'bar'
  if (tags.amenity === 'restaurant') return 'ristorante'
  if (tags.amenity === 'cinema') return 'cinema'
  if (tags.shop === 'mall') return 'centro_commerciale'
  if (tags.place === 'square') return 'piazza'
  if (tags.railway === 'station') return 'stazione'
  if (tags.aeroway === 'aerodrome') return 'aeroporto'
  if (tags.leisure === 'stadium') return 'stadio'
  if (tags.amenity === 'university') return 'universita'
  if (tags.amenity === 'hospital') return 'ospedale'
  if (tags.leisure === 'fitness_centre') return 'palestra'
  return null
}

interface ElementoOsm {
  type: string
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}
