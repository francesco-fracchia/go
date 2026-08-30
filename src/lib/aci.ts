/**
 * Tabella dei costi chilometrici di esercizio.
 *
 * FONTE: tabelle ACI dei costi chilometrici (art. 3 c.1 D.Lgs. 314/1997),
 * pubblicate annualmente in Gazzetta Ufficiale. Comprendono carburante,
 * manutenzione e riparazioni, pneumatici, quota di ammortamento, RCA e
 * tassa di possesso, su una percorrenza convenzionale di 15.000 km/anno.
 * NON comprendono pedaggi e parcheggi: quelli si aggiungono a parte.
 *
 * ⚠️  QUESTA TABELLA VA RIGENERATA OGNI ANNO dai dati ACI ufficiali.
 *     I valori marcati `verificato: false` sono STIME per fascia, inserite
 *     per far girare il prodotto: vanno sostituite con la voce ACI reale
 *     del modello prima di andare in produzione.
 *
 * ⚠️  REGOLA DI CONFORMITÀ: questo valore non è MAI un input dell'utente.
 *     Si risolve lato server da marca + modello + alimentazione. Se diventa
 *     dichiarabile, il tetto smette di essere un tetto.
 */

export type Alimentazione = 'benzina' | 'diesel' | 'gpl' | 'metano' | 'ibrida' | 'elettrica'

export type Fascia =
  | 'utilitaria'   // segmento A/B — Panda, Ypsilon, Polo
  | 'compatta'     // segmento C — Golf, Focus, Giulietta
  | 'berlina'      // segmento D/E
  | 'suv_compatto'
  | 'suv_grande'
  | 'monovolume'

export interface VoceAci {
  /** costo chilometrico di esercizio, in centesimi di euro per km */
  centesimiPerKm: number
  verificato: boolean
  fonte: string
}

/** Anno delle tabelle attualmente caricate. */
export const ANNO_TABELLE = 2026

const T = (centesimiPerKm: number, verificato: boolean, fonte: string): VoceAci => ({
  centesimiPerKm,
  verificato,
  fonte,
})

const STIMA = 'stima per fascia — da sostituire con la voce ACI del modello'

/** centesimi di euro per chilometro */
const TABELLA: Record<Fascia, Partial<Record<Alimentazione, VoceAci>>> = {
  utilitaria: {
    benzina:   T(37.12, true,  'ACI — Fiat Panda 1.2, tabelle costi chilometrici'),
    diesel:    T(35.0,  false, STIMA),
    gpl:       T(33.0,  false, STIMA),
    metano:    T(32.0,  false, STIMA),
    ibrida:    T(36.0,  false, STIMA),
    elettrica: T(31.0,  false, STIMA),
  },
  compatta: {
    benzina:   T(43.0, false, STIMA),
    diesel:    T(41.0, false, STIMA),
    gpl:       T(39.0, false, STIMA),
    metano:    T(38.0, false, STIMA),
    ibrida:    T(42.0, false, STIMA),
    elettrica: T(36.0, false, STIMA),
  },
  berlina: {
    benzina:   T(52.0, false, STIMA),
    diesel:    T(49.0, false, STIMA),
    ibrida:    T(50.0, false, STIMA),
    elettrica: T(43.0, false, STIMA),
  },
  suv_compatto: {
    benzina:   T(48.0, false, STIMA),
    diesel:    T(46.0, false, STIMA),
    gpl:       T(44.0, false, STIMA),
    ibrida:    T(47.0, false, STIMA),
    elettrica: T(40.0, false, STIMA),
  },
  suv_grande: {
    benzina:   T(58.0, false, STIMA),
    diesel:    T(55.0, false, STIMA),
    ibrida:    T(56.0, false, STIMA),
    elettrica: T(47.0, false, STIMA),
  },
  monovolume: {
    benzina:   T(50.0, false, STIMA),
    diesel:    T(47.0, false, STIMA),
    gpl:       T(45.0, false, STIMA),
    ibrida:    T(48.0, false, STIMA),
    elettrica: T(41.0, false, STIMA),
  },
}

/**
 * Valore di ripiego quando la coppia fascia/alimentazione non è a tabella.
 * Deliberatamente BASSO: se sbagliamo, il conducente rientra di meno.
 * Sbagliare al ribasso è un problema commerciale, al rialzo è un problema legale.
 */
export const RIPIEGO_CENTESIMI_KM = 31.0

export function costoChilometrico(fascia: Fascia, alimentazione: Alimentazione): VoceAci {
  const voce = TABELLA[fascia]?.[alimentazione]
  if (voce) return voce
  return T(RIPIEGO_CENTESIMI_KM, false, 'ripiego prudenziale — coppia fascia/alimentazione non a tabella')
}

/** Il tetto massimo presente a tabella. Serve come guardia nei test. */
export const TETTO_MASSIMO_CENTESIMI_KM = 58.0
