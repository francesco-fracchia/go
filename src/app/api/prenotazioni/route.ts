import { prenota } from '../../../server/prenotazioni.ts'
import { richiediUtente } from '../../../server/auth.ts'
import { json, rispostaErrore } from '../_risposta.ts'

export async function POST(req: Request) {
  try {
    const utente = await richiediUtente()
    const corpo = await req.json()
    const esito = await prenota({ ...corpo, passeggeroId: utente })
    return json({
      prenotazione: esito.prenotazione.id,
      // Un numero solo. La scomposizione sta nella ricevuta.
      totale: esito.calcolo.quote.find((q) => q.passeggeroId === utente)?.totale,
      autorizzato: esito.autorizzato,
      inAttesaDiApprovazione: esito.richiedeApprovazione,
    }, 201)
  } catch (e) {
    return rispostaErrore(e)
  }
}
