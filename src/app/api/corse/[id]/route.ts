import { confermaCorsa, annullaCorsa } from '../../../../server/annullamenti.ts'
import { richiediUtente } from '../../../../server/auth.ts'
import { json, rispostaErrore } from '../../_risposta.ts'

/** Conferma («sì, parto») o annullamento della corsa da parte del conducente. */
export async function POST(
  req: Request, { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const utente = await richiediUtente()
    const { azione } = await req.json()

    if (azione === 'conferma') {
      return json({ ok: await confermaCorsa(id, utente) })
    }
    if (azione === 'annulla') {
      const e = await annullaCorsa(id, utente)
      return json(e, e.ok ? 200 : 409)
    }
    return json({ errore: 'azione sconosciuta' }, 400)
  } catch (e) { return rispostaErrore(e) }
}
