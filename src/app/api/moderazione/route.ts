import { modera } from '../../../server/recensioni.ts'
import { richiediUtente } from '../../../server/auth.ts'
import { json, rispostaErrore } from '../_risposta.ts'

export async function POST(req: Request) {
  try {
    const utente = await richiediUtente()
    const ammessi = (process.env.MODERATORI ?? '').split(',').map((s) => s.trim())
    if (!ammessi.includes(utente)) return json({ errore: 'non autorizzato' }, 403)

    const { recensione, approvata } = await req.json()
    return json({ ok: await modera(recensione, !!approvata) })
  } catch (e) { return rispostaErrore(e) }
}
