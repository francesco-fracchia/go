import type { Cents } from './money.ts'

/**
 * Le penali di disdetta.
 *
 * Sono qui, pure e senza database attorno, perché muovono denaro: sbagliare
 * una soglia significa trattenere soldi che non ci spettano o non
 * trattenerne quando invece spettano a chi guida. È il genere di calcolo che
 * va provato, non riletto.
 *
 * Le finestre sono quelle scritte sulla corsa PRIMA di prenotare, e qui si
 * applicano esattamente come promesse. Un prodotto che dice «fino a un'ora
 * prima» e poi trattiene per un ritardo di due minuti perde molto più di
 * quanto trattiene.
 */

export type Politica = 'flessibile' | 'rigida'

/** Oltre questa distanza dalla partenza il servizio non si è ancora svolto. */
export const ORE_FEE_GRATUITA = 24

export interface Penale {
  /** quota che resta a chi guida */
  alConducente: Cents
  /** quota di servizio trattenuta */
  fee: Cents
  /** totale catturato */
  daCatturare: Cents
  /** quanto torna al passeggero */
  rimborso: Cents
}

export function calcolaPenale(opts: {
  oreMancanti: number
  politica: Politica
  quotaConducente: Cents
  fee: Cents
  totale: Cents
}): Penale {
  const { oreMancanti, politica, quotaConducente, fee, totale } = opts

  // La quota di servizio si trattiene sotto le 24 ore: a quel punto
  // l'incasso, l'autorizzazione e l'organizzazione li abbiamo già fatti.
  const feeDovuta = oreMancanti < ORE_FEE_GRATUITA ? fee : 0

  let alConducente = 0
  if (politica === 'flessibile') {
    // Gratis fino a un'ora prima. Sotto, la quota resta a chi guida: sta
    // già uscendo di casa.
    if (oreMancanti < 1) alConducente = quotaConducente
  } else {
    // Rigida: gratis fino a sei ore, metà fino a due, poi tutto. Il gradino
    // di mezzo esiste perché fra le sei e le due ore il posto è ancora
    // rivendibile, ma difficilmente.
    if (oreMancanti < 2) alConducente = quotaConducente
    else if (oreMancanti < 6) alConducente = Math.floor(quotaConducente / 2)
  }

  const daCatturare = alConducente + feeDovuta
  return {
    alConducente,
    fee: feeDovuta,
    daCatturare,
    rimborso: Math.max(0, totale - daCatturare),
  }
}

/**
 * Se la disdetta è gratuita, letto dalle soglie e non da un importo di prova.
 *
 * La prima versione lo ricavava chiamando `calcolaPenale` con una quota di
 * un centesimo: sulla politica rigida la metà arrotondava a zero, e
 * l'interfaccia annunciava «senza costi» mentre il server tratteneva. Una
 * soglia si legge, non si campiona.
 */
export function gratuita(oreMancanti: number, politica: Politica): boolean {
  return politica === 'flessibile' ? oreMancanti >= 1 : oreMancanti >= 6
}

/** Il testo mostrato al passeggero PRIMA che prema, non dopo. */
export function testoDisdetta(oreMancanti: number, politica: Politica): string {
  if (gratuita(oreMancanti, politica)) return 'Puoi disdire senza costi.'
  if (politica === 'rigida' && oreMancanti >= 2) {
    return 'Ormai è tardi: metà della quota resta a chi guida, che ha già rinunciato al posto.'
  }
  return 'Manca poco: la quota resta a chi guida, che sta già venendo.'
}
