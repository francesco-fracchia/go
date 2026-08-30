import { db } from '../../../server/db.ts'
import { richiediUtente } from '../../../server/auth.ts'
import { json, rispostaErrore } from '../_risposta.ts'

export async function POST(req: Request) {
  try {
    const utente = await richiediUtente()
    const b = await req.json()
    const patch: Record<string, boolean> = {}
    if (typeof b.push === 'boolean') patch.push_attive = b.push
    if (typeof b.sms === 'boolean') patch.sms_attivi = b.sms
    if (Object.keys(patch).length === 0) return json({ errore: 'niente da cambiare' }, 400)

    await db.from('profili').update(patch).eq('id', utente)
    return json({ ok: true })
  } catch (e) { return rispostaErrore(e) }
}
