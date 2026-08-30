import { creaVeicolo, ErroreProfilo } from '../../../server/profili.ts'
import { richiediUtente } from '../../../server/auth.ts'
import { json, rispostaErrore } from '../_risposta.ts'

export async function POST(req: Request) {
  try {
    const utente = await richiediUtente()
    const corpo = await req.json()
    const v = await creaVeicolo({ ...corpo, proprietario: utente })
    return json({ veicolo: v.id }, 201)
  } catch (e) {
    if (e instanceof ErroreProfilo) return json({ errore: e.message, codice: e.codice }, 400)
    return rispostaErrore(e)
  }
}
