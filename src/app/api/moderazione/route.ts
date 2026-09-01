import { modera } from '../../../server/recensioni.ts'
import { decidi, riattiva, eModeratore } from '../../../server/moderazione.ts'
import { richiediUtente } from '../../../server/auth.ts'
import { json, rispostaErrore } from '../_risposta.ts'

export async function POST(req: Request) {
  try {
    const utente = await richiediUtente()
    if (!eModeratore(utente)) return json({ errore: 'non autorizzato' }, 403)

    const corpo = await req.json()

    if (corpo.recensione) {
      return json({ ok: await modera(corpo.recensione, !!corpo.approvata) })
    }

    /**
     * Chiudere una segnalazione richiede di scrivere perché.
     *
     * Non è burocrazia: la decisione va spiegata alla persona esclusa, e
     * quello che non si scrive nel momento in cui si decide non si ricorda
     * più dopo. Un esito vuoto è un'istruttoria che non è avvenuta.
     */
    if (corpo.segnalazione) {
      const nota = String(corpo.nota ?? '').trim()
      if (nota.length < 3) return json({ errore: 'serve una motivazione' }, 422)
      return json({ ok: await decidi(corpo.segnalazione, !!corpo.fondata, nota) })
    }

    if (corpo.riattiva) {
      return json({ ok: await riattiva(corpo.riattiva, String(corpo.motivo ?? '').trim()) })
    }

    return json({ errore: 'niente da fare' }, 422)
  } catch (e) { return rispostaErrore(e) }
}
