/**
 * L'orario dei ritiri.
 *
 * Chi guida e deve passare a prendere tre persone in tre posti diversi non
 * ha bisogno di sapere quanto dura il viaggio: ha bisogno di sapere A CHE
 * ORA USCIRE DI CASA. È un conto che si fa a mente male, perché ogni sosta
 * costa più del tempo di guida che aggiunge — si accosta, si aspetta che
 * scenda, si carica una borsa — e tre soste da niente diventano un quarto
 * d'ora.
 *
 * Quindi si conta all'indietro, dall'unica ora che è stata promessa: quella
 * di arrivo. Partire in orario non serve a niente se poi si arriva tardi;
 * arrivare in orario è la cosa che qualcuno sta aspettando.
 */

/** Quanto costa una sosta, al netto della guida: accostare, salire, ripartire. */
export const SOSTA_MIN = 3

export interface Fermata {
  etichetta: string
  /** Chi sale qui. Più di uno se condividono il punto. */
  chi: string[]
}

export interface Passaggio extends Fermata {
  /** L'ora a cui essere lì. */
  quando: Date
}

export interface Piano {
  /** Quando mettersi in strada. */
  partenza: Date
  passaggi: Passaggio[]
  arrivo: Date
  /** Quanto i ritiri allungano il viaggio rispetto ad andarci dritti. */
  minutiAggiunti: number
}

export interface Ingredienti {
  /** L'ora promessa alla destinazione: è l'ancora di tutto il conto. */
  oraArrivo: Date
  /**
   * Le durate di guida in minuti, in ordine:
   * origine→prima fermata, fra le fermate, ultima fermata→destinazione.
   * Sono una in più delle fermate. Senza ritiri è un numero solo.
   */
  tratte: number[]
  fermate: Fermata[]
  /** Il viaggio diretto, per dire quanto costano i ritiri. */
  minutiDiretti?: number
  sostaMin?: number
}

export function pianifica(i: Ingredienti): Piano {
  if (i.tratte.length !== i.fermate.length + 1) {
    throw new Error(
      `le tratte devono essere una più delle fermate: ${i.tratte.length} e ${i.fermate.length}`,
    )
  }
  const sosta = i.sostaMin ?? SOSTA_MIN
  const meno = (d: Date, min: number) => new Date(d.getTime() - min * 60_000)
  /* Le lunghezze sono già state controllate sopra: qui si dichiara che
     l'indice esiste, invece di far finta con un punto esclamativo. */
  const tratta = (k: number): number => {
    const v = i.tratte[k]
    if (v === undefined) throw new Error(`tratta mancante: ${k}`)
    return v
  }
  const fermata = (k: number): Fermata => {
    const v = i.fermate[k]
    if (v === undefined) throw new Error(`fermata mancante: ${k}`)
    return v
  }

  /**
   * Si risale dalla fine.
   *
   * L'ora di una fermata è quella a cui ESSERE LÌ. Da lì la persona ci
   * mette la sua sosta a salire, e solo dopo si guida fino alla fermata
   * dopo. Quindi l'ultimo ritiro è l'arrivo meno l'ultima tratta E meno
   * la sua sosta: anche chi sale per ultimo ci mette del tempo a salire.
   *
   * Dalla propria origine invece non si aspetta nessuno, e la sosta non
   * c'è. Le prime due versioni di questo conto sbagliavano proprio queste
   * due estremità — una sosta in meno in fondo e una di troppo in cima —
   * e i due errori si cancellavano sul totale: l'ora di uscita tornava, e
   * ogni singolo ritiro era tre minuti tardi. Un conto sbagliato che dà il
   * numero giusto è il modo migliore per non accorgersene.
   */
  const passaggi: Passaggio[] = []
  const n = i.fermate.length
  let quando = meno(i.oraArrivo, tratta(n) + (n > 0 ? sosta : 0))

  for (let k = n - 1; k >= 0; k--) {
    passaggi.unshift({ ...fermata(k), quando })
    if (k > 0) quando = meno(quando, sosta + tratta(k))
  }
  if (n > 0) quando = meno(quando, tratta(0))

  const totale = (i.oraArrivo.getTime() - quando.getTime()) / 60_000
  return {
    partenza: quando,
    passaggi,
    arrivo: i.oraArrivo,
    minutiAggiunti: i.minutiDiretti === undefined
      ? 0
      : Math.max(0, Math.round(totale - i.minutiDiretti)),
  }
}
