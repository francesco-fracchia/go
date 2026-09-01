import * as lavori from './lavori.ts'
import {
  chiudiContestazioni, liquidaSettimanaScorsa, fondiNonRitirati,
} from './liquidazioni.ts'
import { invitaARecensire } from './recensioni.ts'
import { dimenticaPosizioni } from './posizione.ts'

/**
 * Quali lavori esistono.
 *
 * Sta qui e non nella rotta perché serve a due cose: eseguirli, e sapere
 * quali DOVREBBERO aver girato. Un lavoro che non ha mai girato non lascia
 * nessuna riga, quindi elencando le righe è invisibile — e il primo che è
 * capitato di trovare così è `liquida`, cioè quello che paga i conducenti.
 *
 * Da un file di rotta Next.js non lascia esportare niente che non sia un
 * gestore HTTP, e aveva ragione: questa non è una rotta, è un elenco.
 */
export const REGISTRO: Record<string, () => Promise<unknown>> = {
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
  /* Chiedere una recensione: scritto, corretto, e non chiamato da nessuno.
     Vuol dire che nessuno è mai stato invitato a lasciarne una — e tutto
     l'impianto della reputazione dipende da recensioni che nessuno chiede. */
  invita_recensioni: invitaARecensire,
  dimentica_posizioni: dimenticaPosizioni,
}
