import { db } from './db.ts'
import { leggiPunto } from './geo.ts'

/**
 * Attorno a quale punto cercare gli indirizzi.
 *
 * Senza, il geocoder risponde con il posto più famoso d'Italia che si
 * chiama così: chi scrive «piazza della vittoria» dal lodigiano si vede
 * proporre Brescia. È il genere di errore che fa chiudere l'applicazione,
 * perché non sembra un dettaglio da configurare — sembra che non funzioni.
 *
 * Si prende il punto più significativo che si conosce, nell'ordine:
 *
 *   1. casa, se l'ha salvata — è la risposta giusta quasi sempre
 *   2. la partenza dell'ultima corsa che ha pubblicato o prenotato
 *   3. il centro predefinito
 *
 * Nessuno dei tre richiede il permesso di geolocalizzazione, che a schermata
 * appena aperta si nega e non si richiede più.
 */

/** Lodi. Da cambiare quando la prima provincia non sarà più questa. */
export const CENTRO_PREDEFINITO = { lat: 45.3142, lng: 9.5033 }

export async function centroPer(utenteId?: string | null) {
  if (!utenteId) return CENTRO_PREDEFINITO

  try {
    const { data: casa } = await db
      .from('luoghi_salvati')
      .select('geo')
      .eq('utente', utenteId)
      .eq('tipo', 'casa')
      .maybeSingle()
    const c = punto(casa?.geo)
    if (c) return c

    // L'ultima corsa da cui è partito: dice dove sta, senza chiederglielo.
    const { data: corsa } = await db
      .from('corse')
      .select('origine_geo')
      .eq('conducente', utenteId)
      .order('creata_il', { ascending: false })
      .limit(1)
      .maybeSingle()
    const o = punto(corsa?.origine_geo)
    if (o) return o
  } catch { /* si ripiega sul centro */ }

  return CENTRO_PREDEFINITO
}

const punto = leggiPunto
