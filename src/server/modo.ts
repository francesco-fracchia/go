import { cookies } from 'next/headers'

/**
 * In che veste stai usando GO.
 *
 * Non è un filtro né una preferenza estetica: è la domanda che decide cosa
 * vede l'utente. Chi cerca un posto e chi ne offre uno usano lo stesso
 * prodotto per due mestieri opposti — «trovo qualcuno che ci va già» e
 * «sto andando comunque, sale nessuno?» — e una barra sola con tutte e due
 * le cose costringe ogni volta a rileggere per capire dove si è.
 *
 * Sta in un biscotto e non in `localStorage` perché la navigazione la
 * disegna il server: leggerlo dal browser vorrebbe dire disegnare la barra
 * sbagliata e correggerla dopo, con un lampo a ogni caricamento.
 *
 * Si RICORDA, non si indovina. Chi guida una volta non diventa un
 * conducente per sempre, e chi apre l'applicazione la prima volta cerca un
 * posto: è la modalità con cui si entra, ed è quella giusta per quasi tutti.
 */

export type Modo = 'passeggero' | 'conducente'

export const MODO_PREDEFINITO: Modo = 'passeggero'
export const BISCOTTO_MODO = 'modo'

export async function modoCorrente(): Promise<Modo> {
  const c = await cookies()
  return c.get(BISCOTTO_MODO)?.value === 'conducente' ? 'conducente' : MODO_PREDEFINITO
}

/** Il contrario di quello in cui sei: serve all'interruttore. */
export const altroModo = (m: Modo): Modo =>
  m === 'conducente' ? 'passeggero' : 'conducente'
