import { db } from '../../../server/db.ts'
import { richiediUtente } from '../../../server/auth.ts'
import { json, rispostaErrore } from '../_risposta.ts'

/** Registra o rimuove l'iscrizione al push di questo dispositivo. */
export async function POST(req: Request) {
  try {
    const utente = await richiediUtente()
    const s = await req.json()
    if (!s?.endpoint || !s?.keys?.p256dh || !s?.keys?.auth) {
      return json({ errore: 'iscrizione incompleta' }, 400)
    }
    await db.from('push_iscrizioni').upsert({
      utente, endpoint: s.endpoint,
      p256dh: s.keys.p256dh, auth: s.keys.auth, fallita_il: null,
    }, { onConflict: 'endpoint' })
    return json({ ok: true }, 201)
  } catch (e) { return rispostaErrore(e) }
}

export async function DELETE(req: Request) {
  try {
    await richiediUtente()
    const { endpoint } = await req.json()
    await db.from('push_iscrizioni').delete().eq('endpoint', endpoint)
    return json({ ok: true })
  } catch (e) { return rispostaErrore(e) }
}
