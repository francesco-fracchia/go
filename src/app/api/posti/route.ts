import { postiVicini, importaZona, assicuraZona, type Categoria } from '../../../server/posti.ts'
import { richiediUtente } from '../../../server/auth.ts'
import { json, rispostaErrore } from '../_risposta.ts'
import { numero, punto } from '../_numeri.ts'

/** Centro predefinito quando non sappiamo dov'è chi guarda: Lodi. */
const CASA = { lat: 45.3142, lng: 9.5033 }

export async function GET(req: Request) {
  try {
    const q = new URL(req.url).searchParams
    const posizione = punto(q) ?? CASA

    const filtri = {
      ...posizione,
      categoria: (q.get('categoria') as Categoria) || undefined,
      raggioM: numero(q, 'raggio') ?? 60_000,
      minimoM: numero(q, 'minimo'),
    }

    let posti = await postiVicini(filtri)

    /**
     * Se non c'è niente, si guarda se la zona è mai stata importata.
     *
     * La prima persona che apre una provincia nuova la popola per tutti
     * quelli che verranno dopo. Ci mette qualche secondo e succede una
     * volta sola: dopo, il registro dice che è fatta e nessuno riprova.
     */
    /**
     * L'importazione si tenta solo sulla ricerca SENZA filtro.
     *
     * «Nessun aeroporto qui intorno» è una risposta vera, non il sintomo di
     * una zona mai importata: ma il codice guardava solo il numero di
     * risultati, e su ogni categoria vuota ripartiva con l'interrogazione a
     * Overpass — decine di secondi, per riottenere zero. Chi cambiava
     * filtro vedeva «un attimo…» all'infinito, e cambiando di nuovo ne
     * lanciava un'altra.
     *
     * Senza categoria, invece, zero risultati vuol dire davvero che qui non
     * c'è niente, ed è l'unico caso in cui vale la pena guardare.
     */
    if (posti.length === 0 && !filtri.categoria) {
      const importati = await assicuraZona(posizione.lat, posizione.lng).catch(() => null)
      if (importati !== null && importati > 0) posti = await postiVicini(filtri)
    }

    return json({ posti })
  } catch (e) { return rispostaErrore(e) }
}

/**
 * Popola una zona da OpenStreetMap.
 *
 * Si chiama a mano quando si apre una provincia nuova, non a ogni ricerca:
 * Overpass è un servizio comunitario, e interrogarlo in continuazione è
 * scortese prima ancora che lento.
 */
export async function POST(req: Request) {
  try {
    const utente = await richiediUtente()
    const ammessi = (process.env.MODERATORI ?? '').split(',').map((s) => s.trim())
    if (!ammessi.includes(utente)) return json({ errore: 'non autorizzato' }, 403)

    const { lat, lng, raggioM } = await req.json()
    return json(await importaZona({
      lat: Number(lat), lng: Number(lng), raggioM: Number(raggioM ?? 25_000),
    }))
  } catch (e) { return rispostaErrore(e) }
}
