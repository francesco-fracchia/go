/**
 * Il vocabolario delle recensioni, in un posto solo.
 *
 * Stava in due: le stringhe nel modulo che le fa scegliere, e le stesse
 * stringhe — a mano — in chi le mostra. Due copie di un vocabolario
 * divergono al primo ritocco, e quando divergono non si rompe niente: si
 * smette semplicemente di contare una voce, in silenzio.
 *
 * Ogni fatto è una COPPIA, non un'etichetta sola. È quello che permette di
 * dire «in orario 18 volte su 20» invece di elencare venti volte la stessa
 * riga: senza il negativo accanto al positivo, il denominatore non esiste.
 */

export interface Fatto {
  /** il segno che lo rende riconoscibile senza leggerlo */
  segno: string
  /** come si chiama quando lo si conta */
  etichetta: string
  /** come si sceglie, quando è andata bene */
  si: string
  /** e quando è andata male */
  no: string
}

export type Ruolo = 'conducente' | 'passeggero'

export const FATTI: Record<Ruolo, Fatto[]> = {
  // Cosa dico di CHI GUIDAVA, se sono salito.
  conducente: [
    { segno: '⏱', etichetta: 'in orario',
      si: 'è partito all’ora che aveva detto', no: 'è partito in ritardo' },
    { segno: '📍', etichetta: 'punto di ritiro',
      si: 'il punto di ritiro era quello concordato', no: 'ha cambiato il punto di ritiro' },
    { segno: '🚗', etichetta: 'auto come descritta',
      si: 'l’auto era come descritta', no: 'l’auto non era come descritta' },
    { segno: '✨', etichetta: 'auto pulita',
      si: 'l’auto era pulita', no: 'l’auto era sporca' },
    { segno: '😌', etichetta: 'a proprio agio',
      si: 'mi sono sentito a mio agio come guidava',
      no: 'non mi sono sentito a mio agio come guidava' },
  ],
  // Cosa dico di CHI È SALITO, se guidavo io.
  passeggero: [
    { segno: '⏱', etichetta: 'puntuale',
      si: 'era al punto d’incontro all’ora', no: 'ha fatto aspettare' },
    { segno: '💬', etichetta: 'si è fatto sentire',
      si: 'ha scritto quando è servito', no: 'non ha risposto ai messaggi' },
    { segno: '🧳', etichetta: 'bagaglio annunciato',
      si: 'il bagaglio era quello annunciato', no: 'aveva più bagaglio di quanto detto' },
    { segno: '✨', etichetta: 'auto lasciata a posto',
      si: 'ha lasciato l’auto come l’ha trovata', no: 'ha lasciato disordine' },
  ],
}

/**
 * Descrizioni, non voti.
 *
 * Una per gruppo, perché sono alternative: non si viaggia in silenzio E
 * chiacchierando. E non concorrono al positivo o al negativo — «si è
 * viaggiato in silenzio» non è un difetto, e trasformarlo in voto
 * renderebbe un introverso peggiore di un altro.
 */
export const DESCRITTORI: Array<{ nome: string; voci: Array<{ v: string; segno: string }> }> = [
  { nome: 'In macchina', voci: [
    { v: 'si è chiacchierato', segno: '💬' },
    { v: 'si è viaggiato in silenzio', segno: '🤫' },
  ] },
  { nome: 'Musica', voci: [
    { v: 'musica alta', segno: '🔊' },
    { v: 'musica bassa', segno: '🎵' },
    { v: 'niente musica', segno: '🔇' },
  ] },
  { nome: 'Il viaggio', voci: [
    { v: 'una sosta', segno: '☕' },
    { v: 'filati dritti', segno: '➡️' },
  ] },
]

export const segnoDescrittore = (v: string): string =>
  DESCRITTORI.flatMap((g) => g.voci).find((x) => x.v === v)?.segno ?? ''

/**
 * I fatti contati una volta sola.
 *
 * Dieci carte che ripetono «è partito all'ora che aveva detto» sono dieci
 * volte la stessa informazione e un muro di testo. Contarli dà la stessa
 * cosa in una riga — e in più dà il denominatore, che è l'unica parte
 * davvero informativa: «18 su 20» dice quanto ci si può contare, «è
 * partito in orario» no.
 *
 * Si contano solo i fatti su cui QUALCUNO si è espresso: chi non ha
 * spuntato niente non è un voto contrario, è un silenzio.
 */
export function contaFatti(
  recensioni: Array<{ tag: string[] }>,
): Array<{ segno: string; etichetta: string; si: number; su: number }> {
  const tutti = [...FATTI.conducente, ...FATTI.passeggero]
  return tutti.map((f) => {
    let si = 0, no = 0
    for (const r of recensioni) {
      if (r.tag.includes(f.si)) si++
      else if (r.tag.includes(f.no)) no++
    }
    return { segno: f.segno, etichetta: f.etichetta, si, su: si + no }
  }).filter((x) => x.su > 0).sort((a, b) => b.su - a.su)
}
