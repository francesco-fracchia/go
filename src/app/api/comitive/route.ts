import { richiediUtente } from '../../../server/auth.ts'
import { mieComitive, creaComitiva } from '../../../server/comitive.ts'
import { json, rispostaErrore } from '../_risposta.ts'

export async function GET() {
  try {
    return json({ comitive: await mieComitive(await richiediUtente()) })
  } catch (e) { return rispostaErrore(e) }
}

export async function POST(req: Request) {
  try {
    const utente = await richiediUtente()
    const { nome } = await req.json() as { nome?: string }
    const id = await creaComitiva(utente, String(nome ?? ''))
    return json({ id }, 201)
  } catch (e) { return rispostaErrore(e) }
}
