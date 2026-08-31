import { richiediUtente } from '../../../../server/auth.ts'
import { faParte, segnaTurno, turno, chiTocca, conto } from '../../../../server/comitive.ts'
import { json, rispostaErrore } from '../../_risposta.ts'

/** Lo stato del turno: chi c'è, chi ha guidato quante volte, chi tocca. */
export async function GET(req: Request) {
  try {
    const utente = await richiediUtente()
    const id = new URL(req.url).searchParams.get('comitiva') ?? ''
    if (!await faParte(utente, id)) return json({ errore: 'non fai parte di questa comitiva' }, 403)

    const membri = await turno(id)
    return json({ membri: conto(membri), tocca: chiTocca(membri)?.id ?? null })
  } catch (e) { return rispostaErrore(e) }
}

/** Segnare che qualcuno ha guidato. È la riga che fa esistere il turno. */
export async function POST(req: Request) {
  try {
    const utente = await richiediUtente()
    const { comitiva, guidatore } = await req.json() as
      { comitiva?: string; guidatore?: string }
    if (!await faParte(utente, String(comitiva))) {
      return json({ errore: 'non fai parte di questa comitiva' }, 403)
    }
    await segnaTurno(String(comitiva), String(guidatore))
    const membri = await turno(String(comitiva))
    return json({ membri: conto(membri), tocca: chiTocca(membri)?.id ?? null })
  } catch (e) { return rispostaErrore(e) }
}
