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

/**
 * La cella di importazione di un punto.
 *
 * Due decimi di grado sono una ventina di chilometri: la stessa scala del
 * raggio con cui importiamo. Arrotondare è ciò che rende il registro utile
 * — due persone della stessa provincia ricadono nella stessa cella, e la
 * seconda non fa partire niente.
 */
const cellaDi = (lat: number, lng: number) =>
  `${(Math.round(lat / 0.2) * 0.2).toFixed(1)},${(Math.round(lng / 0.2) * 0.2).toFixed(1)}`

/**
 * Si assicura che la zona attorno a un punto sia stata importata.
 *
 * La prima persona che guarda una provincia nuova la popola per tutti
 * quelli che verranno dopo. Ci mette qualche secondo — Overpass non è
 * veloce — e succede una volta sola nella vita di quella zona.
 *
 * Restituisce quanti posti ha trovato, o `null` se non c'era niente da
 * fare perché la zona era già stata importata.
 */
export async function assicuraZona(lat: number, lng: number): Promise<number | null> {
  const cella = cellaDi(lat, lng)

  // Chi arriva secondo riceve falso e non parte: due persone che aprono la
  // schermata nello stesso istante non devono lanciare due importazioni.
  const { data: mia } = await db.rpc('prenota_zona', {
    p_cella: cella, p_lat: lat, p_lng: lng,
  })
  if (mia !== true) return null

  try {
    const { nuovi } = await importaZona({ lat, lng })
    await db.from('zone_importate').update({ posti_trovati: nuovi }).eq('cella', cella)
    return nuovi
  } catch (e) {
    // L'importazione è fallita: si toglie la prenotazione, altrimenti la
    // zona resta segnata come fatta e nessuno riproverà mai.
    await db.from('zone_importate').delete().eq('cella', cella)
    throw e
  }
}

/**
 * Sotto una certa distanza un passaggio non serve a nessuno.
 *
 * L'elenco proponeva la piazza a cento metri e il bar a centocinquanta:
 * posti dove si va a piedi. Ogni riga di quelle è una riga che occupa il
 * posto di una destinazione vera, e fa sembrare l'applicazione stupida —
 * chi apre «dove si va» sta pensando alla serata a Milano, non all'angolo.
 *
 * Cinque chilometri è la soglia sotto la quale, in una provincia, ci si
 * arriva senza chiedere niente a nessuno.
 */
export const DISTANZA_MINIMA_M = 5_000

export async function postiVicini(opts: {
  lat: number; lng: number
  raggioM?: number
  /** sotto questa distanza non si propone: ci si va a piedi o in bici */
  minimoM?: number
  categoria?: Categoria
  limite?: number
}): Promise<Posto[]> {
  const { data, error } = await db.rpc('posti_vicini', {
    p_geo: `SRID=4326;POINT(${opts.lng} ${opts.lat})`,
    p_raggio_m: opts.raggioM ?? 30_000,
    p_categoria: opts.categoria ?? null,
    // Si chiede qualcosa in più di quello che serve: il taglio dei posti
    // troppo vicini avviene dopo, e senza margine si resterebbe corti.
    p_limite: (opts.limite ?? 40) + 20,
  })

  // Un errore ingoiato qui diventa una schermata vuota che sembra «non ci
  // sono posti», quando invece la query non è mai arrivata. È il tipo di
  // guasto che si scopre solo confrontando il database con lo schermo.
  if (error) {
    console.error('posti_vicini:', error.message, error.details ?? '')
    return []
  }

  const minimo = opts.minimoM ?? DISTANZA_MINIMA_M

  return ((data ?? []) as Array<Record<string, unknown>>)
    .map((r): Posto => ({
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
    .filter((p) => p.distanzaM >= minimo)
    .slice(0, opts.limite ?? 40)
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

  /**
   * Overpass vuole la richiesta come modulo, non come testo grezzo: con
   * `text/plain` risponde 406 senza spiegare, ed è il genere di errore su
   * cui si perde mezz'ora perché il messaggio non dice cosa cambiare.
   *
   * E vuole sapere chi sta chiedendo: è un servizio della comunità, non
   * un'infrastruttura pagata, e un'applicazione che non si presenta è la
   * prima a essere limitata quando il servizio è sotto carico.
   */
  const r = await fetch(OVERPASS, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'user-agent': 'GO/1.0 (carpooling; ciao@vaigo.app)',
    },
    body: new URLSearchParams({ data: corpo }),
  })
  if (!r.ok) {
    throw new Error(`Overpass ha risposto ${r.status}: ${(await r.text()).slice(0, 160)}`)
  }

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
