import * as lavori from '../../../server/lavori.ts'
import { chiudiContestazioni } from '../../../server/liquidazioni.ts'
import { dimenticaPosizioni } from '../../../server/posizione.ts'
import { json } from '../_risposta.ts'

/**
 * Esecutore dei lavori schedulati.
 *
 * Protetto da un segreto condiviso: senza, chiunque conosca l'indirizzo può
 * far partire il rimatch di tutte le corse della serata.
 *
 * Tutti i lavori sono idempotenti, quindi una doppia esecuzione è innocua —
 * ed è bene che lo sia, perché prima o poi capiterà.
 */
const REGISTRO: Record<string, () => Promise<unknown>> = {
  promemoria_24h: lavori.promemoria24h,
  riautorizza: lavori.riautorizza,
  chiedi_conferma: lavori.chiediConferma,
  rimatch: lavori.rimatchNonConfermate,
  in_arrivo: lavori.inArrivo,
  cattura: lavori.catturaPartenze,
  scadi_proposte: lavori.scadiProposte,
  chiudi_arrivate: lavori.chiudiArrivate,
  chiudi_contestazioni: chiudiContestazioni,
  dimentica_posizioni: dimenticaPosizioni,
}

export async function POST(req: Request) {
  const atteso = process.env.CRON_SECRET
  if (!atteso || req.headers.get('authorization') !== `Bearer ${atteso}`) {
    return json({ errore: 'non autorizzato' }, 401)
  }

  const nome = new URL(req.url).searchParams.get('lavoro') ?? ''
  const lavoro = REGISTRO[nome]
  if (!lavoro) return json({ errore: `lavoro sconosciuto: ${nome}` }, 404)

  const inizio = Date.now()
  try {
    const esito = await lavoro()
    return json({ lavoro: nome, esito, ms: Date.now() - inizio })
  } catch (e) {
    console.error(`lavoro ${nome} fallito:`, e)
    return json({ lavoro: nome, errore: String(e), ms: Date.now() - inizio }, 500)
  }
}
