import { cerca, alternativeVicine } from '../../../server/ricerca.ts'
import { json, rispostaErrore } from '../_risposta.ts'

export async function GET(req: Request) {
  try {
    const q = new URL(req.url).searchParams
    const filtri = {
      origine: { lat: num(q, 'olat'), lng: num(q, 'olng') },
      destinazione: { lat: num(q, 'dlat'), lng: num(q, 'dlng') },
      da: new Date(q.get('da') ?? Date.now()),
      a: new Date(q.get('a') ?? Date.now() + 12 * 3600_000),
      posti: Number(q.get('posti') ?? 1),
      soloSenzaProposta: q.get('subito') === '1',
    }

    const risultati = await cerca(filtri)

    // Elenco vuoto: si allarga invece di dire "nessun risultato". È lo stato
    // più frequente del primo anno, e trattarlo come un errore è il modo
    // migliore di perdere l'utente per sempre.
    if (risultati.length === 0) {
      return json({ risultati: [], allargati: await alternativeVicine(filtri) })
    }
    return json({ risultati })
  } catch (e) {
    return rispostaErrore(e)
  }
}

function num(q: URLSearchParams, k: string): number {
  const v = Number(q.get(k))
  if (!Number.isFinite(v)) throw new Error(`parametro non valido: ${k}`)
  return v
}
