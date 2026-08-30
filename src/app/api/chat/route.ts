import { messaggi, scrivi } from '../../../server/chat.ts'
import { richiediUtente } from '../../../server/auth.ts'
import { json, rispostaErrore } from '../_risposta.ts'

export async function GET(req: Request) {
  try {
    const utente = await richiediUtente()
    const corsa = new URL(req.url).searchParams.get('corsa')
    if (!corsa) return json({ errore: 'manca la corsa' }, 400)
    return json({ messaggi: await messaggi(corsa, utente) })
  } catch (e) { return rispostaErrore(e) }
}

export async function POST(req: Request) {
  try {
    const utente = await richiediUtente()
    const { corsa, testo } = await req.json()
    const m = await scrivi(corsa, utente, String(testo ?? ''))
    return json(m ? { messaggio: m } : { errore: 'non inviato' }, m ? 201 : 403)
  } catch (e) { return rispostaErrore(e) }
}
