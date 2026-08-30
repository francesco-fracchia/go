import { postiVicini, importaZona, type Categoria } from '../../../server/posti.ts'
import { richiediUtente } from '../../../server/auth.ts'
import { json, rispostaErrore } from '../_risposta.ts'

/** Centro predefinito quando non sappiamo dov'è chi guarda: Lodi. */
const CASA = { lat: 45.3142, lng: 9.5033 }

export async function GET(req: Request) {
  try {
    const q = new URL(req.url).searchParams
    const lat = Number(q.get('lat')), lng = Number(q.get('lng'))
    const posizione = Number.isFinite(lat) && Number.isFinite(lng)
      ? { lat, lng } : CASA

    return json({
      posti: await postiVicini({
        ...posizione,
        categoria: (q.get('categoria') as Categoria) || undefined,
        raggioM: Number(q.get('raggio') ?? 30_000),
      }),
    })
  } catch (e) { return rispostaErrore(e) }
}

/**
 * Popola una zona da OpenStreetMap.
 *
 * Si chiama a mano quando si apre una provincia nuova, non a ogni ricerca:
 * Overpass è un servizio comunitario, e interrogarlo in continuazione è
 * scortese prima ancora che lento.
 */
export async function POST(req: Request) {
  try {
    const utente = await richiediUtente()
    const ammessi = (process.env.MODERATORI ?? '').split(',').map((s) => s.trim())
    if (!ammessi.includes(utente)) return json({ errore: 'non autorizzato' }, 403)

    const { lat, lng, raggioM } = await req.json()
    return json(await importaZona({
      lat: Number(lat), lng: Number(lng), raggioM: Number(raggioM ?? 25_000),
    }))
  } catch (e) { return rispostaErrore(e) }
}
