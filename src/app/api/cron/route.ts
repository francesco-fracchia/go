import * as lavori from '../../../server/lavori.ts'
import {
  chiudiContestazioni, liquidaSettimanaScorsa, fondiNonRitirati,
} from '../../../server/liquidazioni.ts'
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
  /* I due lavori che pagano chi guida. Erano scritti, corretti, e non
     chiamati da nessuna parte: il denaro si catturava dai passeggeri e
     restava fermo sul saldo. */
  liquida: liquidaSettimanaScorsa,
  fondi_non_ritirati: fondiNonRitirati,
  dimentica_posizioni: dimenticaPosizioni,
}

/**
 * Vercel chiama i cron in GET. Noi esportavamo solo POST.
 *
 * Risultato: `405 Method Not Allowed` a ogni esecuzione, per tutti e dieci i
 * lavori, in silenzio — nessun errore applicativo, nessun log
 * dell'applicazione, solo un codice di stato in una dashboard che nessuno
 * guarda. Vuol dire che in produzione non è mai partita una cattura di
 * pagamento, una ri-autorizzazione prima della scadenza Stripe, un
 * promemoria, un rimatch, né la cancellazione delle posizioni.
 *
 * È il difetto più costoso trovato finora, e il più silenzioso: tutto il
 * codice funzionava, non lo chiamava nessuno.
 */
export async function GET(req: Request) {
  return POST(req)
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
