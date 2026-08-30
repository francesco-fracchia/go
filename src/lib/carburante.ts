import type { Cents } from './money.ts'

/**
 * Quanta parte del costo chilometrico è benzina.
 *
 * Il costo ACI comprende sei voci: carburante, manutenzione e riparazioni,
 * pneumatici, quota di ammortamento, assicurazione e tassa di possesso. Il
 * carburante è la più piccola delle grandi — attorno a un quarto — e
 * l'ammortamento è la più grossa.
 *
 * Distinguerle serve a due cose, e la seconda conta più della prima.
 *
 * 1. Al conducente si può mostrare cosa esce di tasca STASERA e cosa è
 *    usura: «ti costa 16,19 €, di cui 4,48 di benzina» è più onesto di un
 *    numero solo, e non gli fa credere di aver guadagnato quello che non ha
 *    guadagnato.
 *
 * 2. È l'obiezione che un avvocato farebbe per primo: «ha incassato 12 € e
 *    ne ha bruciati 4 di benzina». La risposta è che ammortamento e
 *    assicurazione sono costi veri che quel viaggio consuma — ed è la
 *    ragione per cui esiste la tabella ACI, che lo Stato usa per rimborsare
 *    i propri dipendenti. Ma è una risposta che bisogna saper dare, non una
 *    domanda da non aspettarsi.
 */

/**
 * Prezzo medio del carburante alla pompa, in centesimi al litro.
 * ⚠️  Da aggiornare periodicamente: cambia più di qualunque altra voce.
 */
export const PREZZO_LITRO_CENT: Record<string, number> = {
  benzina: 178,
  diesel: 172,
  gpl: 82,
  metano: 135,   // al chilogrammo
  ibrida: 178,
  elettrica: 35, // al kWh, ricarica domestica
}

/**
 * Consumo tipico reale, in litri per cento chilometri.
 *
 * Non i dati dichiarati: quelli di omologazione stanno sistematicamente
 * sotto il vero, e una stima ottimistica del carburante farebbe sembrare la
 * quota ACI più generosa di quanto sia.
 */
const CONSUMO_TIPICO: Record<string, number> = {
  benzina: 6.5, diesel: 5.5, gpl: 8.5, metano: 4.5,
  ibrida: 5.0, elettrica: 17,
}

export interface Scomposizione {
  totaleCent: Cents
  /** quello che esce di tasca stasera */
  carburanteCent: Cents
  /** ammortamento, assicurazione, bollo, gomme, manutenzione */
  usuraCent: Cents
  quotaCarburante: number
}

/**
 * Scompone il costo di un viaggio fra carburante e usura.
 *
 * Il carburante si stima dal consumo tipico e dal prezzo alla pompa, non
 * come frazione fissa del costo ACI: su un'utilitaria a GPL la benzina è
 * un quinto del totale, su un SUV a benzina quasi un terzo, e una
 * percentuale unica sbaglierebbe entrambe.
 */
export function scomponi(opts: {
  km: number
  centesimiPerKm: number
  alimentazione: string
}): Scomposizione {
  const totale = Math.round(opts.km * opts.centesimiPerKm)

  const consumo = CONSUMO_TIPICO[opts.alimentazione] ?? CONSUMO_TIPICO.benzina!
  const prezzo = PREZZO_LITRO_CENT[opts.alimentazione] ?? PREZZO_LITRO_CENT.benzina!
  let carburante = Math.round((opts.km * consumo / 100) * prezzo)

  // Il carburante non può superare il costo totale: se la stima lo facesse,
  // vuol dire che il modello consuma meno del tipico e la stima è la cosa
  // sbagliata, non la tabella.
  carburante = Math.min(carburante, totale)

  return {
    totaleCent: totale,
    carburanteCent: carburante,
    usuraCent: totale - carburante,
    quotaCarburante: totale > 0 ? carburante / totale : 0,
  }
}
