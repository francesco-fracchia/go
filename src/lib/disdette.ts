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
/**
 * «Senza costi» deve voler dire che non si trattiene NIENTE.
 *
 * Questa funzione guardava solo la quota che resta a chi guida, e ignorava
 * la quota di servizio. Risultato: fra le ventiquattro ore e l'ora prima
 * della partenza diceva «puoi disdire senza costi» e poi tratteneva
 * trenta centesimi. Una promessa smentita da un addebito è peggio di un
 * addebito annunciato — e per trenta centesimi si perde una persona che
 * per tre euro sarebbe rimasta.
 *
 * Adesso è vero: gratuita significa che il totale trattenuto è zero.
 */
export function gratuita(oreMancanti: number, politica: Politica): boolean {
  if (oreMancanti < ORE_FEE_GRATUITA) return false
  return politica === 'flessibile' ? oreMancanti >= 1 : oreMancanti >= 6
}

/**
 * Il testo mostrato al passeggero PRIMA che prema, non dopo.
 *
 * `fee` serve a poterla nominare: «tranne la quota di servizio» è una frase
 * che non si può controllare, «tranne 0,30 € di servizio» sì.
 */
export function testoDisdetta(
  oreMancanti: number, politica: Politica, fee?: Cents,
): string {
  if (gratuita(oreMancanti, politica)) return 'Puoi disdire senza costi.'

  const quotaResta = politica === 'flessibile'
    ? oreMancanti < 1
    : oreMancanti < 2
  const meta = politica === 'rigida' && oreMancanti >= 2 && oreMancanti < 6

  if (quotaResta) {
    return 'Manca poco: la quota resta a chi guida, che sta già venendo.'
  }
  if (meta) {
    return 'Ormai è tardi: metà della quota resta a chi guida, che ha già rinunciato al posto.'
  }
  // Resta solo la quota di servizio: la si nomina, invece di chiamarla
  // «senza costi» e poi prenderla.
  const importo = fee === undefined
    ? 'la quota di servizio'
    : `${(fee / 100).toFixed(2).replace('.', ',')} € di quota di servizio`
  return `Ti torna tutto tranne ${importo}: sotto le ventiquattro ore quella resta.`
}
