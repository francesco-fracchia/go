import { segnalaProblema, segnaNonSalito } from '../../../server/viaggio.ts'
import { richiediUtente } from '../../../server/auth.ts'
import { json, rispostaErrore } from '../_risposta.ts'

/**
 * L'unica azione richiesta a qualcuno, e solo quando è andata male.
 * Nel caso normale questa rotta non viene mai chiamata.
 */
export async function POST(req: Request) {
  try {
    const utente = await richiediUtente()
    const { prenotazione, azione, nota } = await req.json()

    if (azione === 'non_salito') {
      return json({ ok: await segnaNonSalito(prenotazione, utente) })
    }
    const ok = await segnalaProblema(prenotazione, utente, String(nota ?? ''))
    return json({ ok }, ok ? 200 : 409)
  } catch (e) {
    return rispostaErrore(e)
  }
}
