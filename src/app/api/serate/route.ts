import { db } from '../../../server/db.ts'
import { richiediUtente } from '../../../server/auth.ts'
import { json, rispostaErrore } from '../_risposta.ts'

export async function POST(req: Request) {
  try {
    const utente = await richiediUtente()
    const ammessi = (process.env.MODERATORI ?? '').split(',').map((s) => s.trim())
    if (!ammessi.includes(utente)) return json({ errore: 'non autorizzato' }, 403)

    const b = await req.json()
    const { error } = await db.from('serate').insert({
      locale: b.locale,
      citta: b.citta,
      indirizzo: b.indirizzo ?? null,
      geo: `SRID=4326;POINT(${b.lng} ${b.lat})`,
      inizio: new Date(b.inizio).toISOString(),
      titolo: b.titolo || null,
    })
    if (error) return json({ errore: error.message }, 400)
    return json({ ok: true }, 201)
  } catch (e) { return rispostaErrore(e) }
}
