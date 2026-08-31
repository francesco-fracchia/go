import { richiediUtente } from '../../../server/auth.ts'
import { diciNonGuido } from '../../../server/comitive.ts'
import { json, rispostaErrore } from '../_risposta.ts'

/**
 * «Stasera non guido.»
 *
 * Un tocco, prima di uscire. Vuol dire: bevo, e mi servirà un modo per
 * tornare. Non è uno stato del profilo ma una dichiarazione con una data:
 * scade da sola il mattino dopo, che è quello che fa nella realtà.
 */
export async function POST(req: Request) {
  try {
    const utente = await richiediUtente()
    const { valore } = await req.json() as { valore?: boolean }
    await diciNonGuido(utente, valore !== false)
    return json({ fatto: true })
  } catch (e) { return rispostaErrore(e) }
}
