import { messaggi, scrivi } from '../../../server/chat.ts'
import { richiediUtente } from '../../../server/auth.ts'
import { json, rispostaErrore } from '../_risposta.ts'

export async function GET(req: Request) {
  try {
    const utente = await richiediUtente()
    const corsa = new URL(req.url).searchParams.get('corsa')
    if (!corsa) return json({ errore: 'manca la corsa' }, 400)
    return json({ messaggi: await messaggi(corsa, utente) })
  } catch (e) { return rispostaErrore(e) }
}

export async function POST(req: Request) {
  try {
    const utente = await richiediUtente()
    const { corsa, testo } = await req.json()
    const esito = await scrivi(corsa, utente, String(testo ?? ''))
    if (esito.ok) return json({ messaggio: esito.messaggio }, 201)

    /**
     * Ogni rifiuto dice cosa è successo e, dove ha senso, cosa fare.
     * «Non inviato» costava un tentativo, poi un secondo, poi la fiducia.
     */
    const spiegazione: Record<string, [string, number]> = {
      vuoto: ['scrivi qualcosa prima di mandare', 400],
      lungo: ['il messaggio è troppo lungo: massimo duemila caratteri', 400],
      assente: ['questa corsa non esiste più', 404],
      chiusa: [
        'la conversazione si è chiusa due giorni dopo l’arrivo. '
        + 'Se è successo qualcosa, segnalacelo dal viaggio.', 409,
      ],
      estraneo: ['non hai viaggiato su questa corsa', 403],
    }
    const [messaggio, stato] = spiegazione[esito.motivo] ?? ['non inviato', 403]
    return json({ errore: messaggio, codice: esito.motivo }, stato)
  } catch (e) { return rispostaErrore(e) }
}
