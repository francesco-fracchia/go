import { collegamentoOnboarding, riepilogo } from '../../../server/conto.ts'
import { richiediUtente } from '../../../server/auth.ts'
import { json, rispostaErrore } from '../_risposta.ts'

export async function GET() {
  try {
    return json(await riepilogo(await richiediUtente()))
  } catch (e) { return rispostaErrore(e) }
}

/** Apre l'onboarding Stripe. Si chiama quando i soldi ci sono già. */
export async function POST() {
  try {
    return json({ url: await collegamentoOnboarding(await richiediUtente()) })
  } catch (e) { return rispostaErrore(e) }
}
