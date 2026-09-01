import { prenota, prenotaAndataRitorno } from '../../../server/prenotazioni.ts'
import { richiediUtente } from '../../../server/auth.ts'
import { json, rispostaErrore } from '../_risposta.ts'

export async function POST(req: Request) {
  try {
    const utente = await richiediUtente()
    const corpo = await req.json()

    /**
     * Andata e ritorno insieme, quando chi guida l'ha reso possibile.
     *
     * Non è una modalità diversa di prenotazione: è la stessa, chiesta per
     * due tratte con un impegno solo sulla carta. La regola su quando è
     * lecito non sta qui — la fa rispettare il motore, che rifiuta se una
     * delle due corse non è privata.
     */
    if (corpo.conRitorno === true) {
      const e = await prenotaAndataRitorno({ ...corpo, passeggeroId: utente })
      return json({
        prenotazione: e.andata.prenotazione.id,
        prenotazioneRitorno: e.ritorno.id,
        totale: e.andata.calcolo.quote.find((q) => q.passeggeroId === utente)?.totale,
        autorizzato: e.autorizzatoCent,
        risparmiato: e.risparmiatoCent,
        inAttesaDiApprovazione: e.andata.richiedeApprovazione,
      }, 201)
    }

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
