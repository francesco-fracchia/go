import { db, DEMO } from './db.ts'

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
  etichetta: string
  lat: number
  lng: number
  /** «Lodi», «Milano» — serve a mostrare risultati leggibili */
  comune?: string
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

export async function suggerisci(
  testo: string, vicino?: { lat: number; lng: number },
): Promise<Luogo[]> {
  const q = testo.trim()
  if (q.length < 3) return []

  if (DEMO) return luoghiDemo(q)

  const chiave = process.env.ORS_API_KEY
  if (!chiave) throw new Error("variabile d'ambiente mancante: ORS_API_KEY")

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
  return (d.features ?? []).map(aLuogo)
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
  const chiave = process.env.ORS_API_KEY
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

  const bello = testo.trim().replace(/^\w/, (c) => c.toUpperCase())
  return [{
    etichetta: bello.includes(',') ? bello : `${bello}, Lodi`,
    lat: 45.3142 + scarto(0),
    lng: 9.5033 + scarto(5),
    comune: 'Lodi',
  }]
}
