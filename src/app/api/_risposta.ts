import { NonAutenticato } from '../../server/auth.ts'
import { ErrorePrenotazione } from '../../server/prenotazioni.ts'
import { ErroreCorsa } from '../../server/corse.ts'
import { ErroreProfilo } from '../../server/profili.ts'
import { ErroreComitiva } from '../../server/comitive.ts'
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
      || e instanceof ErroreProfilo || e instanceof ErroreComitiva) {
    return json({ errore: e.message, codice: e.codice }, stato(e.codice))
  }
  if (e instanceof ViolazioneConformita) {
    // Non è colpa dell'utente: è il motore che ha rifiutato una
    // configurazione che non avremmo dovuto proporgli.
    console.error('violazione di conformità:', e.message)
    return json({ errore: 'questa combinazione non è possibile' }, 409)
  }
  /**
   * Il guasto che non sappiamo tradurre.
   *
   * Il messaggio resta generico — un errore di sistema mostrato all'utente
   * non lo aiuta e a volte racconta più del dovuto — ma il `dettaglio`
   * viaggia accanto, perché finché GO non è aperto al pubblico l'unica
   * persona che vede questa schermata è chi lo sta costruendo, e «qualcosa
   * è andato storto» le costa un'ora di indagine ogni volta.
   *
   * Da togliere prima di aprire le iscrizioni: allora il posto giusto per
   * il dettaglio saranno i registri, e questa riga diventa una perdita.
   */
  console.error(e)
  return json({
    errore: 'qualcosa è andato storto',
    dettaglio: e instanceof Error ? `${e.name}: ${e.message}` : String(e),
  }, 500)
}

const stato = (codice: string) => ({
  pieno: 409, doppia: 409, tardi: 410, sospeso: 403, limitato: 403,
  sistematicita: 403, dichiarazione: 428, telefono: 428, carta: 402, luogo: 422,
  nome: 422, codice: 404, estraneo: 403,
}[codice] ?? 400)

export const json = (corpo: unknown, stato = 200) =>
  new Response(JSON.stringify(corpo), {
    status: stato,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
