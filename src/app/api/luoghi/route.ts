import { suggerisci, inverso } from '../../../server/luoghi.ts'
import { utenteCorrente } from '../../../server/auth.ts'
import { json, rispostaErrore } from '../_risposta.ts'
import { punto } from '../_numeri.ts'

export async function GET(req: Request) {
  try {
    const q = new URL(req.url).searchParams
    const p = punto(q)

    // Punto sulla mappa → indirizzo
    if (p && !q.get('testo')) return json({ luogo: await inverso(p.lat, p.lng) })

    const vicino = p
    const utente = await utenteCorrente().catch(() => null)
    return json({ luoghi: await suggerisci(q.get('testo') ?? '', vicino, utente ?? undefined) })
  } catch (e) { return rispostaErrore(e) }
}
