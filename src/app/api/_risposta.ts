import { NonAutenticato } from '../../server/auth.ts'
import { ErrorePrenotazione } from '../../server/prenotazioni.ts'
import { ErroreCorsa } from '../../server/corse.ts'
import { ErroreProfilo } from '../../server/profili.ts'
import { ViolazioneConformita } from '../../lib/pricing.ts'

/**
 * Traduzione degli errori.
 *
 * Ogni errore che l'utente può causare ha un messaggio in italiano che dice
 * cosa fare. Gli altri diventano un 500 generico: un messaggio di sistema
 * mostrato all'utente non lo aiuta e a volte racconta più del dovuto.
 */
export function rispostaErrore(e: unknown): Response {
  if (e instanceof NonAutenticato) return json({ errore: 'accedi per continuare' }, 401)

  if (e instanceof ErrorePrenotazione || e instanceof ErroreCorsa
      || e instanceof ErroreProfilo) {
    return json({ errore: e.message, codice: e.codice }, stato(e.codice))
  }
  if (e instanceof ViolazioneConformita) {
    // Non è colpa dell'utente: è il motore che ha rifiutato una
    // configurazione che non avremmo dovuto proporgli.
    console.error('violazione di conformità:', e.message)
    return json({ errore: 'questa combinazione non è possibile' }, 409)
  }
  console.error(e)
  return json({ errore: 'qualcosa è andato storto' }, 500)
}

const stato = (codice: string) => ({
  pieno: 409, doppia: 409, tardi: 410, sospeso: 403, limitato: 403,
  sistematicita: 403, dichiarazione: 428, telefono: 428, carta: 402, luogo: 422,
}[codice] ?? 400)

export const json = (corpo: unknown, stato = 200) =>
  new Response(JSON.stringify(corpo), {
    status: stato,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
