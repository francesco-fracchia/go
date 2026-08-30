import { preparaCarta, salvaMetodo, metodoAttuale, rimuoviMetodo } from '../../../server/pagamento.ts'
import { richiediUtente } from '../../../server/auth.ts'
import { json, rispostaErrore } from '../_risposta.ts'

export async function GET() {
  try {
    return json({ metodo: await metodoAttuale(await richiediUtente()) })
  } catch (e) { return rispostaErrore(e) }
}

/** Apre il salvataggio: restituisce il segreto per il modulo di Stripe. */
export async function POST() {
  try {
    const { clientSecret } = await preparaCarta(await richiediUtente())
    return json({ clientSecret })
  } catch (e) { return rispostaErrore(e) }
}

/** Conferma il salvataggio dopo che Stripe ha accettato la carta. */
export async function PUT(req: Request) {
  try {
    const utente = await richiediUtente()
    const { metodo } = await req.json()
    if (!metodo) return json({ errore: 'manca il metodo' }, 400)
    return json(await salvaMetodo(utente, String(metodo)))
  } catch (e) { return rispostaErrore(e) }
}

export async function DELETE() {
  try {
    await rimuoviMetodo(await richiediUtente())
    return json({ ok: true })
  } catch (e) { return rispostaErrore(e) }
}
