import { creaProfilo, profilo, salvaTelefono, ErroreProfilo } from '../../../server/profili.ts'
import { richiediUtente } from '../../../server/auth.ts'
import { json, rispostaErrore } from '../_risposta.ts'

export async function GET() {
  try {
    const utente = await richiediUtente()
    const p = await profilo(utente)
    return json({ esiste: !!p, profilo: p })
  } catch (e) { return rispostaErrore(e) }
}

export async function POST(req: Request) {
  try {
    const utente = await richiediUtente()
    const { nome, cognome, telefono, email, dataNascita } = await req.json()
    const p = await creaProfilo({ id: utente, nome, cognome, telefono, email, dataNascita })
    return json({ profilo: p.id }, 201)
  } catch (e) {
    if (e instanceof ErroreProfilo) return json({ errore: e.message, codice: e.codice }, 400)
    return rispostaErrore(e)
  }
}

/** Aggiunge o cambia il numero di telefono. */
export async function PATCH(req: Request) {
  try {
    const utente = await richiediUtente()
    const { telefono } = await req.json()
    return json({ telefono: await salvaTelefono(utente, String(telefono ?? '')) })
  } catch (e) {
    if (e instanceof ErroreProfilo) return json({ errore: e.message, codice: e.codice }, 400)
    return rispostaErrore(e)
  }
}
