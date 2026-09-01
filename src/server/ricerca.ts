import { db } from './db.ts'
import type { Punto } from './percorsi.ts'
import type { Cents } from '../lib/money.ts'
import { feePasseggero, type Corsa } from '../lib/pricing.ts'
import { daEvitare } from './blocchi.ts'

/**
 * Ricerca.
 *
 * Due cose la governano, e nessuna delle due è ovvia:
 *
 * 1. Si cerca per SOTTO-TRATTE, non per capolinea. Chi cerca Milano →
 *    Melegnano deve vedere anche la Treviso → Melegnano che passa da Milano.
 *    Cercando per capolinea si perde gran parte dell'offerta che si ha già:
 *    è il primo modo in cui un mercato giovane sembra vuoto senza esserlo.
 *
 * 2. Si mostrano anche le corse che richiedono una PROPOSTA, non solo quelle
 *    con una fermata pronta. Chi abita a venti minuti a piedi dal centro non
 *    cerca una corsa che parte dal centro: cerca qualcuno a cui chiedere.
 */

export interface RisultatoRicerca {
  corsaId: string
  conducente: string
  oraPartenza: string
  oraArrivo: string
  postiLiberi: number
  /** quello che il passeggero vede: quota + servizio, un numero solo */
  prezzoDa: Cents
  /** true se basta prenotare, false se bisogna proporre e attendere */
  fermataPronta: boolean
  fermataRitiro: string | null
  kmDeviazione: number
  /** minuti di tolleranza ancora aperti sull'orario, 0 se già fissato */
  flessibileMin: number
  scartoOrigineM: number
}

export interface Filtri {
  origine: Punto
  destinazione: Punto
  da: Date
  a: Date
  posti?: number
  /** quanto lontano dal percorso si accetta di cercare */
  raggioM?: number
  soloSenzaProposta?: boolean
  /**
   * Chi sta cercando, per non proporgli le proprie corse.
   *
   * Non è una raffinatezza: la propria corsa non si può prenotare — il
   * server rifiuta — quindi ogni riga di quelle è un risultato che occupa
   * lo spazio di uno vero e finisce in un vicolo cieco. E aprirla porta
   * alla schermata di chi guida, cioè dall'altra parte dell'applicazione
   * rispetto a quella in cui si stava.
   */
  escludi?: string | null
}

export async function cerca(f: Filtri): Promise<RisultatoRicerca[]> {
  const { data, error } = await db.rpc('cerca_corse', {
    p_origine: punto(f.origine),
    p_destinazione: punto(f.destinazione),
    p_da: f.da.toISOString(),
    p_a: f.a.toISOString(),
    p_raggio_m: f.raggioM ?? 3000,
    p_posti: f.posti ?? 1,
  })
  if (error) throw new Error(`ricerca non riuscita: ${error.message}`)

  const tutte = (data ?? []) as Array<{
    corsa_id: string; conducente: string
    ora_partenza: string; ora_arrivo: string
    posti_liberi: number; quota_cent: number
    scarto_origine_m: number
    fermata_ritiro: string | null
    km_deviazione_stimati: number
    deviazione_ammessa: boolean
    flessibilita_min: number
  }>

  const senzaMe = f.escludi ? tutte.filter((r) => r.conducente !== f.escludi) : tutte

  /**
   * Le corse di chi si evita non compaiono proprio.
   *
   * Lasciarle nell'elenco e rifiutarle alla prenotazione sarebbe sicuro
   * ma crudele nei due sensi: chi ha bloccato continua a vedere quella
   * faccia fra i risultati, e chi è bloccato ci prova e si becca un
   * rifiuto che non sa spiegarsi. Una corsa in meno non si nota; un
   * rifiuto sì.
   */
  const evitare = f.escludi ? await daEvitare(f.escludi) : new Set<string>()
  const righe = evitare.size > 0
    ? senzaMe.filter((r) => !evitare.has(r.conducente))
    : senzaMe

  return righe
    .filter((r) => r.fermata_ritiro !== null || r.deviazione_ammessa)
    .filter((r) => (f.soloSenzaProposta ? r.fermata_ritiro !== null : true))
    .map((r): RisultatoRicerca => ({
      corsaId: r.corsa_id,
      conducente: r.conducente,
      oraPartenza: r.ora_partenza,
      oraArrivo: r.ora_arrivo,
      postiLiberi: r.posti_liberi,
      prezzoDa: r.quota_cent + feeStimata(r.quota_cent, r.posti_liberi),
      fermataPronta: r.fermata_ritiro !== null,
      fermataRitiro: r.fermata_ritiro,
      kmDeviazione: r.fermata_ritiro !== null ? 0 : Number(r.km_deviazione_stimati),
      scartoOrigineM: r.scarto_origine_m,
      flessibileMin: Number(r.flessibilita_min ?? 0),
    }))
    .sort(ordinamento)
}

/**
 * In lista si mostra UN numero solo, comprensivo del servizio.
 *
 * Non è una furbizia: il Codice del Consumo impone che il prezzo totale sia
 * noto prima dell'acquisto, non che sia scomposto. Un elenco che espone la
 * commissione accanto a ogni riga sposta l'attenzione su di essa invece che
 * sul risparmio, e non aiuta nessuno. La scomposizione sta nel dettaglio e
 * nella ricevuta, che è dove serve anche come prova documentale.
 */
function feeStimata(quotaCent: number, postiLiberi: number): Cents {
  const finta: Corsa = {
    modalita: 'pubblica',
    kmBase: 1,
    centesimiPerKm: quotaCent * 4,
    pedaggio: 0,
    parcheggio: 0,
    postiOfferti: Math.max(1, postiLiberi),
  }
  return feePasseggero(finta, Math.max(1, postiLiberi))
}

/**
 * Prima chi è già pronto, poi chi arriva prima.
 *
 * Le corse che richiedono una proposta restano in elenco — sono spesso
 * l'unica offerta reale su una tratta — ma sotto: chiedere e aspettare
 * è più faticoso che prenotare, e va presentato per quello che è.
 */
function ordinamento(a: RisultatoRicerca, b: RisultatoRicerca): number {
  if (a.fermataPronta !== b.fermataPronta) return a.fermataPronta ? -1 : 1
  return new Date(a.oraArrivo).getTime() - new Date(b.oraArrivo).getTime()
}

const punto = (p: Punto) => `SRID=4326;POINT(${p.lng} ${p.lat})`

/**
 * Quando non c'è nulla.
 *
 * È lo stato più frequente del primo anno, e trattarlo come un errore è il
 * modo migliore di perdere l'utente per sempre. Si offre di essere avvisati,
 * e si mostra cosa c'è nelle ore intorno.
 */
export async function alternativeVicine(f: Filtri): Promise<RisultatoRicerca[]> {
  const finestraLarga = {
    ...f,
    da: new Date(f.da.getTime() - 3 * 3600_000),
    a: new Date(f.a.getTime() + 3 * 3600_000),
    raggioM: (f.raggioM ?? 3000) * 2,
  }
  return cerca(finestraLarga)
}
