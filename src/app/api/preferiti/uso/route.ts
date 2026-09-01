import { richiediUtente } from '../../../../server/auth.ts'
import { segnaUso } from '../../../../server/preferiti.ts'
import { json, rispostaErrore } from '../../_risposta.ts'

/**
 * «Questo luogo l'ho appena usato.»
 *
 * `luoghiSalvati` ordina per `usato_volte` dopo casa e lavoro — ma nessuno
 * incrementava mai quel campo, quindi l'ordine per frequenza non partiva
 * mai e i luoghi restavano dove il caso li aveva messi. `segnaUso` era
 * scritta e senza chiamanti: ottavo caso.
 *
 * Risponde sempre 200, anche se non c'è niente da aggiornare: chi chiama è
 * una persona che ha appena scelto una partenza, e un errore qui non deve
 * comparire da nessuna parte.
 */
export async function POST(req: Request) {
  try {
    const utente = await richiediUtente()
    const { id } = await req.json() as { id?: string }
    if (id) await segnaUso(utente, id)
    return json({ ok: true })
  } catch (e) { return rispostaErrore(e) }
}
