import { db, DEMO, leggiEnv } from './db.ts'

/**
 * Da indirizzo a coordinate.
 *
 * È il pezzo senza cui non funziona niente: i moduli raccolgono testo, ma
 * ricerca, percorsi e prezzi lavorano su coordinate. Finché manca questo,
 * ogni altra cosa è scritta ma non collegata.
 *
 * Si usa il geocoder di OpenRouteService, con la stessa chiave del routing.
 * I risultati si conservano: in una provincia le stesse dieci piazze
 * tornano all'infinito, e la quota gratuita si esaurisce sui duplicati.
 */

export interface Luogo {
  /** in linea d'aria dal punto attorno a cui si sta cercando */
  distanzaKm?: number
  etichetta: string
  lat: number
  lng: number
  /** «Lodi», «Milano» — serve a mostrare risultati leggibili */
  comune?: string
  /**
   * Da dove viene questo risultato. Serve a raggrupparli: un posto che si
   * conosce vale più di un indirizzo che somiglia, e un luogo salvato vale
   * più di entrambi.
   */
  fonte?: 'salvato' | 'posto' | 'indirizzo'
  /** solo per i posti: quante corse ci vanno adesso */
  corse?: number
  /** solo per i luoghi salvati */
  id?: string
}

const ORS = 'https://api.openrouteservice.org/geocode'

/**
 * Suggerimenti mentre si scrive.
 *
 * Circoscritto all'Italia e pesato attorno a un punto quando lo si conosce:
 * chi scrive «stazione» dalla provincia di Lodi intende la sua, non quella
 * di Palermo — e una lista che apre con Palermo insegna a non fidarsi dei
 * suggerimenti.
 */
/** Qualche posto vero del lodigiano, per la dimostrazione. */
const DEMO_LUOGHI: Luogo[] = [
  { etichetta: 'Piazza della Vittoria, Lodi', lat: 45.3142, lng: 9.5033, comune: 'Lodi' },
  { etichetta: 'Stazione, Lodi', lat: 45.3097, lng: 9.4956, comune: 'Lodi' },
  { etichetta: 'Via Fanfulla 12, Lodi', lat: 45.3168, lng: 9.4998, comune: 'Lodi' },
  { etichetta: 'Fabrique, Milano', lat: 45.4419, lng: 9.2447, comune: 'Milano' },
  { etichetta: 'Alcatraz, Milano', lat: 45.4936, lng: 9.1758, comune: 'Milano' },
  { etichetta: 'Bolgia, Osio Sopra', lat: 45.6300, lng: 9.5940, comune: 'Osio Sopra' },
  { etichetta: 'Casalpusterlengo', lat: 45.1780, lng: 9.6470, comune: 'Casalpusterlengo' },
  { etichetta: 'Codogno', lat: 45.1620, lng: 9.7040, comune: 'Codogno' },
  { etichetta: 'Malpensa, Ferno', lat: 45.6306, lng: 8.7281, comune: 'Ferno' },
]

/**
 * Suggerimenti, da tre fonti diverse.
 *
 * L'ordine non è casuale e non è per somiglianza del testo:
 *
 *   1. i luoghi salvati — casa e lavoro sono la risposta giusta quasi sempre
 *   2. i posti conosciuti — «Fabrique» è quello che uno ha in testa, non
 *      «via Gaudenzio Fantoli 9»; e li ordiniamo per quante corse ci vanno,
 *      che è un'informazione che Google non ha
 *   3. gli indirizzi — la rete di sicurezza, per tutto il resto
 *
 * Il geocoder da solo risponde male alla domanda vera. Chi scrive «fab» non
 * sta cercando una via: sta cercando il posto dove stasera si va.
 */
export async function suggerisci(
  testo: string,
  vicino?: { lat: number; lng: number },
  utenteId?: string,
): Promise<Luogo[]> {
  const q = testo.trim()
  if (q.length < 2) return []

  const [salvati, posti] = await Promise.all([
    utenteId ? cercaFraSalvati(utenteId, q) : Promise.resolve([]),
    cercaFraPosti(q, vicino),
  ])

  /**
   * L'indirizzo si chiede quasi sempre.
   *
   * Prima bastavano quattro risposte locali per non interrogare il
   * geocoder: una quota risparmiata al prezzo di non trovare quello che
   * uno sta cercando. Chi scrive il nome di un posto preciso e riceve
   * quattro locali che si chiamano quasi così non ha trovato niente — ha
   * trovato del rumore, e prosegue con un indirizzo approssimativo.
   *
   * Adesso si salta solo quando i posti conosciuti sono davvero tanti,
   * cioè quando è quasi certo che la risposta sia lì dentro.
   */
  const bastano = salvati.length + posti.length
  const indirizzi = bastano >= 6 || q.length < 3
    ? []
    : (DEMO ? luoghiDemo(q) : await geocodifica(q, vicino))

  /**
   * Un suggerimento senza coordinate non è un suggerimento: è una trappola.
   *
   * Chi lo sceglie vede il campo riempirsi e il modulo dichiararsi
   * completo, e poi tutto quello che viene dopo — il preventivo, il
   * percorso, il prezzo — fallisce dicendo che manca una destinazione che
   * lui ha appena scelto. Meglio una riga in meno nell'elenco.
   *
   * Nascevano da `Number(r.lat)` su una colonna che a volte non c'era:
   * `Number(undefined)` fa NaN, e in JSON NaN diventa `null` senza che
   * nessuno se ne accorga.
   */
  /**
   * La distanza accanto a ogni riga.
   *
   * Fra due «Piazza della Vittoria» — una a tre chilometri e una a
   * duecento — il nome non basta a scegliere, e sbagliare qui vuol dire
   * sbagliare il percorso, il prezzo e il punto di ritrovo. È in linea
   * d'aria e non su strada: i minuti veri costerebbero una chiamata al
   * servizio di navigazione PER OGNI riga dell'elenco, a ogni tasto
   * premuto, e non li promettiamo perché non possiamo pagarli.
   */
  let tutti = unifica([...salvati, ...posti, ...indirizzi]).filter(haCoordinate)

  /**
   * Se non si trova niente, si cerca con meno parole.
   *
   * Scrivere di più dava MENO risultati: «fitactive lodi» non trovava
   * nulla mentre «fitactive» trovava tre palestre. Chi aggiunge la città
   * lo fa per essere più preciso, e vedersi svuotare l'elenco insegna che
   * la ricerca non funziona — così si smette di specificare, che è il
   * contrario di quello che serve.
   *
   * Si riprova togliendo l'ultima parola, e l'ordine per distanza fa il
   * resto: la città che avevi scritto è quasi sempre quella vicina.
   */
  const parole = q.split(/\s+/)
  if (tutti.length === 0 && parole.length > 1) {
    const piuCorta = parole.slice(0, -1).join(' ')
    const ripiego = DEMO ? luoghiDemo(piuCorta) : await geocodifica(piuCorta, vicino)
    tutti = unifica([...ripiego]).filter(haCoordinate)
  }
  const conDistanza = vicino
    ? tutti.map((l) => ({ ...l, distanzaKm: kmInLineaDAria(vicino, l) }))
    : tutti
  return conDistanza.slice(0, 8)
}

/** Distanza in linea d'aria, in chilometri. */
function kmInLineaDAria(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371
  const dLat = (b.lat - a.lat) * Math.PI / 180
  const dLng = (b.lng - a.lng) * Math.PI / 180
  const m = a.lat * Math.PI / 180, n = b.lat * Math.PI / 180
  const x = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(m) * Math.cos(n)
  return Math.round(2 * R * Math.asin(Math.sqrt(x)) * 10) / 10
}

/** Un luogo si può usare solo se si sa dov'è, e se è su questo pianeta. */
export function haCoordinate(l: { lat: number; lng: number }): boolean {
  return Number.isFinite(l.lat) && Number.isFinite(l.lng)
    && Math.abs(l.lat) <= 90 && Math.abs(l.lng) <= 180
    // Il punto zero è in mezzo all'Atlantico: nessun indirizzo italiano ci
    // finisce, e ci finiscono invece tutte le coordinate mancanti.
    && !(l.lat === 0 && l.lng === 0)
}

/**
 * Toglie i doppioni fra le tre fonti.
 *
 * «Fabrique» esiste sia come posto conosciuto sia come indirizzo: mostrarlo
 * due volte con due segni diversi fa sembrare l'elenco rotto, e obbliga a
 * scegliere fra due righe che sono la stessa cosa. Vince la fonte più
 * ricca — un posto salvato batte un posto conosciuto, che batte un
 * indirizzo — perché porta un nome che l'utente riconosce.
 *
 * Si confronta la POSIZIONE, non il testo: «Fabrique» e «Fabrique, Milano»
 * sono scritture diverse dello stesso punto, e cento metri di tolleranza
 * coprono lo scarto fra come lo geolocalizza OpenStreetMap e come lo
 * geolocalizza il geocoder.
 */
function unifica(luoghi: Luogo[]): Luogo[] {
  const tenuti: Luogo[] = []
  for (const l of luoghi) {
    const doppione = tenuti.some((t) => vicini(t, l) || stessoNome(t, l))
    if (!doppione) tenuti.push(l)
  }
  return tenuti
}

/** Cento metri, in gradi: basta e avanza a queste latitudini. */
const vicini = (a: Luogo, b: Luogo) =>
  Math.abs(a.lat - b.lat) < 0.001 && Math.abs(a.lng - b.lng) < 0.0013

const normale = (s: string) =>
  s.toLowerCase().split(',')[0]!.trim().replace(/\s+/g, ' ')

const stessoNome = (a: Luogo, b: Luogo) => normale(a.etichetta) === normale(b.etichetta)

async function cercaFraSalvati(utenteId: string, q: string): Promise<Luogo[]> {
  const { luoghiSalvati } = await import('./preferiti.ts')
  const t = q.toLowerCase()
  const tutti = await luoghiSalvati(utenteId).catch(() => [])
  return tutti
    .filter((l) => l.etichetta.toLowerCase().includes(t) || l.indirizzo.toLowerCase().includes(t))
    .map((l): Luogo => ({
      etichetta: l.etichetta, lat: l.lat, lng: l.lng,
      comune: l.indirizzo, fonte: 'salvato', id: l.id,
    }))
}

async function cercaFraPosti(
  q: string, vicino?: { lat: number; lng: number },
): Promise<Luogo[]> {
  let data: unknown = null
  try {
    ({ data } = await db.rpc('cerca_posti', {
      p_testo: q,
      p_geo: vicino ? `SRID=4326;POINT(${vicino.lng} ${vicino.lat})` : null,
      p_limite: 5,
    }))
  } catch {
    // Nessun posto importato in questa zona: si va avanti con gli indirizzi.
    return []
  }

  return ((data ?? []) as Array<Record<string, unknown>>).map((r): Luogo => ({
    etichetta: String(r.nome),
    lat: Number(r.lat),
    lng: Number(r.lng),
    comune: (r.citta as string) ?? undefined,
    fonte: 'posto',
    corse: Number(r.corse ?? 0),
  }))
}

async function geocodifica(
  q: string, vicino?: { lat: number; lng: number },
): Promise<Luogo[]> {

  const chiave = leggiEnv('ORS_API_KEY')
  if (!chiave) return []

  const p = new URLSearchParams({
    api_key: chiave,
    text: q,
    'boundary.country': 'IT',
    size: '6',
    lang: 'it',
  })
  if (vicino) {
    p.set('focus.point.lat', String(vicino.lat))
    p.set('focus.point.lon', String(vicino.lng))
  }

  const r = await fetch(`${ORS}/autocomplete?${p}`)
  if (!r.ok) return []
  const d = await r.json() as RispostaGeocoder
  return (d.features ?? []).map(aLuogo).map((l) => ({ ...l, fonte: 'indirizzo' as const }))
}

/**
 * Risoluzione definitiva di un indirizzo scelto.
 *
 * Con cache, perché questo risultato finisce nel prezzo: due chiamate a
 * distanza di mesi devono dare lo stesso punto, altrimenti la stessa corsa
 * ripubblicata costerebbe una cifra diversa senza ragione.
 */
export async function risolvi(testo: string): Promise<Luogo | null> {
  const q = testo.trim().toLowerCase()
  if (!q) return null

  if (DEMO) return luoghiDemo(q)[0] ?? null

  const { data: gia } = await db
    .from('luoghi_cache')
    .select('etichetta, lat, lng, comune')
    .eq('chiave', q)
    .maybeSingle()
  if (gia) return gia as Luogo

  const chiave = process.env.ORS_API_KEY
  if (!chiave) throw new Error("variabile d'ambiente mancante: ORS_API_KEY")

  const r = await fetch(`${ORS}/search?${new URLSearchParams({
    api_key: chiave, text: testo, 'boundary.country': 'IT', size: '1', lang: 'it',
  })}`)
  if (!r.ok) return null

  const d = await r.json() as RispostaGeocoder
  const f = d.features?.[0]
  if (!f) return null

  const luogo = aLuogo(f)
  await db.from('luoghi_cache').insert({ chiave: q, ...luogo })
  return luogo
}

/** Dal punto all'indirizzo: serve quando si sceglie sulla mappa. */
export async function inverso(lat: number, lng: number): Promise<Luogo | null> {
  if (DEMO) {
    return { etichetta: `Punto scelto (${lat.toFixed(4)}, ${lng.toFixed(4)})`, lat, lng }
  }
  const chiave = leggiEnv('ORS_API_KEY')
  if (!chiave) return null

  const r = await fetch(`${ORS}/reverse?${new URLSearchParams({
    api_key: chiave, 'point.lat': String(lat), 'point.lon': String(lng),
    size: '1', lang: 'it',
  })}`)
  if (!r.ok) return null
  const d = await r.json() as RispostaGeocoder
  return d.features?.[0] ? aLuogo(d.features[0]) : null
}

function aLuogo(f: Elemento): Luogo {
  const [lng, lat] = f.geometry.coordinates
  const p = f.properties
  // «Piazza della Vittoria, Lodi» invece di «Piazza della Vittoria, Lodi,
  // Lombardia, Italia»: la regione e la nazione non servono a nessuno che
  // stia cercando un passaggio in provincia.
  const etichetta = [p.name, p.locality ?? p.county].filter(Boolean).join(', ')
  return { etichetta: etichetta || p.label, lat, lng, comune: p.locality ?? undefined }
}

interface Elemento {
  geometry: { coordinates: [number, number] }
  properties: { name: string; label: string; locality?: string; county?: string }
}
interface RispostaGeocoder { features?: Elemento[] }

/**
 * Il geocoder della modalità dimostrativa.
 *
 * Prima i posti veri del lodigiano, che rendono la dimostrazione
 * riconoscibile. Ma se non c'è corrispondenza NON restituisce una lista
 * vuota: inventa un punto plausibile con il testo scritto.
 *
 * La prima versione si fermava ai nove posti a listino, e chiunque provasse
 * la propria via si trovava un campo che non rispondeva — sembrando rotto
 * invece che limitato. Una dimostrazione deve poter essere usata con i
 * propri indirizzi, altrimenti si prova una volta e si chiude.
 */
function luoghiDemo(testo: string): Luogo[] {
  const t = testo.trim().toLowerCase()
  const noti = DEMO_LUOGHI.filter((l) => l.etichetta.toLowerCase().includes(t))
  if (noti.length > 0) return noti.slice(0, 6)

  // Punto stabile: la stessa scritta dà sempre le stesse coordinate, così
  // una corsa ripubblicata non cambia prezzo senza motivo.
  let seme = 0
  for (const c of t) seme = (seme * 31 + c.charCodeAt(0)) % 100_000
  const scarto = (n: number) => ((seme >> n) % 200 - 100) / 2000

  // «via roma 18» → «Via Roma 18»: gli articoli e le preposizioni restano
  // minuscoli, come si scrivono gli indirizzi in italiano.
  const minuscole = new Set(['di', 'da', 'del', 'della', 'dei', 'degli', 'delle', 'dal', 'e', 'a', 'in'])
  const bello = testo.trim().split(/\s+/)
    .map((w, i) => (i > 0 && minuscole.has(w.toLowerCase()))
      ? w.toLowerCase()
      : w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
  return [{
    etichetta: bello.includes(',') ? bello : `${bello}, Lodi`,
    lat: 45.3142 + scarto(0),
    lng: 9.5033 + scarto(5),
    comune: 'Lodi',
  }]
}
