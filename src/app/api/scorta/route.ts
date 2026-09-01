import { richiediUtente } from '../../../server/auth.ts'
import { collegamentoScorta } from '../../../server/scorta.ts'
import { json, rispostaErrore } from '../_risposta.ts'

/** Chiede — o riottiene — il collegamento per far seguire questo viaggio. */
export async function POST(req: Request) {
  try {
    const utente = await richiediUtente()
    const { prenotazione } = await req.json() as { prenotazione?: string }
    if (!prenotazione) return json({ errore: 'prenotazione mancante' }, 400)

    const t = await collegamentoScorta(prenotazione, utente)
    if (!t) return json({ errore: 'non troviamo questo viaggio fra i tuoi' }, 404)
    return json({ percorso: `/viaggio/${t}` })
  } catch (e) { return rispostaErrore(e) }
}
