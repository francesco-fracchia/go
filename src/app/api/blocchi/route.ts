import { blocca, sblocca } from '../../../server/blocchi.ts'
import { richiediUtente } from '../../../server/auth.ts'
import { json, rispostaErrore } from '../_risposta.ts'

export async function POST(req: Request) {
  try {
    const utente = await richiediUtente()
    const { persona, motivo } = await req.json()
    if (!persona) return json({ errore: 'manca la persona' }, 400)
    const e = await blocca(utente, String(persona), motivo)
    if (!e.ok) return json({ errore: 'non riuscito', codice: e.motivo }, 400)
    return json({ ok: true })
  } catch (e) { return rispostaErrore(e) }
}

export async function DELETE(req: Request) {
  try {
    const utente = await richiediUtente()
    const persona = new URL(req.url).searchParams.get('persona')
    if (!persona) return json({ errore: 'manca la persona' }, 400)
    return json(await sblocca(utente, persona))
  } catch (e) { return rispostaErrore(e) }
}
