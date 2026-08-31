import { richiediUtente } from '../../../server/auth.ts'
import { cancellaAccount, impedimenti } from '../../../server/cancellazione.ts'
import { json, rispostaErrore } from '../_risposta.ts'

/** Cosa impedisce, adesso, di andarsene. Si chiede prima di mostrare il tasto. */
export async function GET() {
  try {
    return json({ impedimenti: await impedimenti(await richiediUtente()) })
  } catch (e) { return rispostaErrore(e) }
}

/**
 * La cancellazione vera.
 *
 * Chiede la parola CANCELLA scritta a mano, e non è teatro: è l'unica
 * azione irreversibile dell'applicazione — non si disfa, non si annulla,
 * non si recupera da un cestino. Un doppio tocco distratto non deve poterla
 * fare.
 */
export async function DELETE(req: Request) {
  try {
    const utente = await richiediUtente()
    const { conferma } = await req.json() as { conferma?: string }
    if (conferma?.trim().toUpperCase() !== 'CANCELLA') {
      return json({ errore: 'scrivi CANCELLA per confermare' }, 400)
    }
    return json(await cancellaAccount(utente))
  } catch (e) { return rispostaErrore(e) }
}
