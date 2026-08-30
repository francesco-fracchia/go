import { luoghiSalvati, salvaLuogo, dimenticaLuogo } from '../../../server/preferiti.ts'
import { richiediUtente } from '../../../server/auth.ts'
import { json, rispostaErrore } from '../_risposta.ts'

export async function GET() {
  try {
    return json({ luoghi: await luoghiSalvati(await richiediUtente()) })
  } catch (e) { return rispostaErrore(e) }
}

export async function POST(req: Request) {
  try {
    const utente = await richiediUtente()
    const b = await req.json()
    if (!b?.etichetta || !Number.isFinite(b.lat) || !Number.isFinite(b.lng)) {
      return json({ errore: 'dati incompleti' }, 400)
    }
    return json({ id: await salvaLuogo(utente, b) }, 201)
  } catch (e) { return rispostaErrore(e) }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json()
    await dimenticaLuogo(await richiediUtente(), String(id))
    return json({ ok: true })
  } catch (e) { return rispostaErrore(e) }
}
