import { suggerisci, inverso } from '../../../server/luoghi.ts'
import { json, rispostaErrore } from '../_risposta.ts'

export async function GET(req: Request) {
  try {
    const q = new URL(req.url).searchParams
    const lat = Number(q.get('lat')), lng = Number(q.get('lng'))

    // Punto sulla mappa → indirizzo
    if (Number.isFinite(lat) && Number.isFinite(lng) && !q.get('testo')) {
      return json({ luogo: await inverso(lat, lng) })
    }

    const vicino = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : undefined
    return json({ luoghi: await suggerisci(q.get('testo') ?? '', vicino) })
  } catch (e) { return rispostaErrore(e) }
}
