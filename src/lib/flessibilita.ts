/**
 * Quanto è elastico l'orario di un viaggio.
 *
 * Non è una preferenza della persona: è una proprietà del viaggio. La stessa
 * persona parte alle 8 spaccate il martedì e «verso le undici» il sabato.
 * Chiederglielo ogni volta significa farle rispondere sempre la stessa cosa
 * per la stessa tratta, e sbagliare quando la tratta cambia.
 *
 * Quindi si propone il valore giusto guardando dove si va e quando, e chi
 * vuole lo cambia. Il valore proposto è quello che quasi nessuno tocca:
 * è lì che si vede se il prodotto ha capito il problema.
 */

export type Categoria =
  | 'discoteca' | 'bar' | 'ristorante' | 'cinema' | 'centro_commerciale'
  | 'piazza' | 'stazione' | 'aeroporto' | 'stadio' | 'universita'
  | 'ospedale' | 'palestra'

export const SCELTE = [0, 10, 20, 30] as const
export type Flessibilita = (typeof SCELTE)[number]

export interface Motivo {
  minuti: Flessibilita
  perche: string
}

/**
 * Il valore proposto.
 *
 * Le coincidenze non aspettano: verso una stazione o un aeroporto la
 * flessibilità è zero, e non perché il conducente sia rigido — perché
 * perdere un treno costa infinitamente più che aspettare venti minuti.
 * È l'unico caso in cui la proposta è ferma anche di sabato sera.
 */
export function proponi(opts: {
  categoria?: Categoria
  oraArrivo: Date
}): Motivo {
  const { categoria, oraArrivo } = opts
  const ora = oraArrivo.getHours()
  const giorno = oraArrivo.getDay()
  const feriale = giorno >= 1 && giorno <= 5
  const notte = ora >= 21 || ora < 5

  if (categoria === 'stazione' || categoria === 'aeroporto') {
    return { minuti: 0, perche: 'Un treno o un aereo non aspettano.' }
  }
  if (categoria === 'ospedale') {
    return { minuti: 10, perche: 'Le visite hanno un orario.' }
  }
  if (categoria === 'cinema' || categoria === 'stadio') {
    return { minuti: 10, perche: 'Comincia a un\'ora precisa.' }
  }
  if (categoria === 'discoteca' || categoria === 'bar') {
    return { minuti: 30, perche: 'Mezz\'ora prima o dopo non cambia la serata.' }
  }
  if (categoria === 'ristorante') {
    return { minuti: 10, perche: 'Se c\'è un tavolo prenotato conviene stringere.' }
  }

  // Senza categoria si guarda l'ora. La mattina feriale è quasi sempre
  // lavoro o scuola, e lì non si arriva «verso le otto».
  if (feriale && ora >= 6 && ora <= 10) {
    return { minuti: 0, perche: 'La mattina si arriva all\'ora giusta.' }
  }
  if (notte) {
    return { minuti: 30, perche: 'Di notte mezz\'ora non cambia niente.' }
  }
  return { minuti: 20, perche: 'Puoi stringere o allargare.' }
}

export const etichetta = (m: Flessibilita) =>
  m === 0 ? 'Ora esatta' : `± ${m} min`
