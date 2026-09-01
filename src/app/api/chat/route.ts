import { messaggi, scrivi } from '../../../server/chat.ts'
import { richiediUtente } from '../../../server/auth.ts'
import { json, rispostaErrore } from '../_risposta.ts'

export async function GET(req: Request) {
  try {
    const utente = await richiediUtente()
    const q = new URL(req.url).searchParams
    const corsa = q.get('corsa')
    if (!corsa) return json({ errore: 'manca la corsa' }, 400)
    // `con` lo si passa solo da conducente su una corsa pubblica: per tutti
    // gli altri viene ignorato, e la conversazione la decide il server.
    return json({ messaggi: await messaggi(corsa, utente, q.get('con')) })
  } catch (e) { return rispostaErrore(e) }
}

export async function POST(req: Request) {
  try {
    const utente = await richiediUtente()
    const { corsa, testo, con } = await req.json()
    const esito = await scrivi(corsa, utente, String(testo ?? ''), con ?? null)
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
      quale: ['su una corsa pubblica si scrive a una persona per volta: scegli chi', 400],
    }
    const [messaggio, stato] = spiegazione[esito.motivo] ?? ['non inviato', 403]
    return json({ errore: messaggio, codice: esito.motivo }, stato)
  } catch (e) { return rispostaErrore(e) }
}
