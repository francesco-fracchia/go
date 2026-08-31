import { lasciaRecensione } from '../../../server/recensioni.ts'
import { richiediUtente } from '../../../server/auth.ts'
import { json, rispostaErrore } from '../_risposta.ts'

const MESSAGGI: Record<string, string> = {
  presto: 'aspetta che il viaggio sia finito',
  tardi: 'sono passati troppi giorni',
  gia_fatta: 'hai già lasciato una recensione',
  non_tua: 'non hai viaggiato su questa corsa',
  non_trovata: 'corsa non trovata',
  errore: 'non siamo riusciti a salvarla',
}

export async function POST(req: Request) {
  try {
    const utente = await richiediUtente()
    const { prenotazione, positiva, tag, descrittori, testo } = await req.json()
    const r = await lasciaRecensione({
      prenotazioneId: prenotazione, autoreId: utente,
      positiva: !!positiva, tag, descrittori, testo,
    })
    return json(
      r.esito === 'ok'
        ? { ok: true, inModerazione: r.inModerazione }
        : { errore: MESSAGGI[r.esito] ?? r.esito },
      r.esito === 'ok' ? 201 : 409,
    )
  } catch (e) { return rispostaErrore(e) }
}
