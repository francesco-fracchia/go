import { registraCaricamento } from '../../../server/mappe.ts'
import { json } from '../_risposta.ts'

/**
 * Segna che una mappa è nata.
 *
 * Non richiede autenticazione: la mappa si apre anche prima di registrarsi,
 * e un conteggio che salta proprio gli utenti nuovi conterebbe la metà di
 * quello che dobbiamo sapere. Non c'è niente da proteggere — nel peggiore
 * dei casi qualcuno gonfia un numero e ci facciamo del male da soli
 * spegnendo una funzione che potevamo permetterci.
 */
export async function POST() {
  try {
    return json({ caricamenti: await registraCaricamento() })
  } catch {
    // Un contatore che non risponde non deve rompere l'apertura della mappa.
    return json({ caricamenti: null })
  }
}
