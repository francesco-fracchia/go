import { richiediUtente } from '../../../../server/auth.ts'
import { entraConCodice } from '../../../../server/comitive.ts'
import { json, rispostaErrore } from '../../_risposta.ts'

export async function POST(req: Request) {
  try {
    const utente = await richiediUtente()
    const { codice } = await req.json() as { codice?: string }
    return json({ comitiva: await entraConCodice(utente, String(codice ?? '')) })
  } catch (e) { return rispostaErrore(e) }
}
