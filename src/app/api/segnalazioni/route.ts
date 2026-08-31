import { segnala, type TipoSegnalazione } from '../../../server/segnalazioni.ts'
import { richiediUtente } from '../../../server/auth.ts'
import { json, rispostaErrore } from '../_risposta.ts'

const TIPI: TipoSegnalazione[] = ['alcol', 'noshow', 'molestia', 'guida_pericolosa', 'altro']

export async function POST(req: Request) {
  try {
    const utente = await richiediUtente()
    const b = await req.json() as {
      prenotazione?: string; tipo?: string; nota?: string; ritirati?: boolean
    }

    const tipo = TIPI.find((t) => t === b.tipo)
    if (!tipo) return json({ errore: 'motivo non valido' }, 400)
    if (!b.prenotazione) return json({ errore: 'prenotazione mancante' }, 400)

    const esito = await segnala({
      autoreId: utente, prenotazioneId: b.prenotazione,
      tipo, nota: b.nota, ritirati: b.ritirati === true,
    })
    if (!esito.ok) return json({ errore: esito.errore }, 409)

    /**
     * Non si dice mai se la segnalazione ha sospeso qualcuno.
     *
     * Sarebbe consegnare a chi segnala il potere di verificare l'effetto
     * del proprio gesto — e a chi segnala per rancore, la conferma che
     * funziona. Chi ha segnalato deve sapere solo due cose: che l'abbiamo
     * ricevuta, e se è sceso senza pagare.
     */
    return json({
      ok: true,
      disdettaSenzaPenale: esito.disdettaSenzaPenale ?? false,
      rimborsatoCent: esito.rimborsatoCent ?? null,
    }, 201)
  } catch (e) { return rispostaErrore(e) }
}
