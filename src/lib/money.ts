/**
 * Il denaro è SEMPRE in centesimi interi. Nessun euro come float attraversa
 * il motore dei prezzi: gli arrotondamenti in virgola mobile sono il modo
 * classico di far saltare l'invariante "il conducente non guadagna mai".
 */
export type Cents = number

export const eur = (e: number): Cents => Math.round(e * 100)
export const toEur = (c: Cents): number => c / 100

export const fmt = (c: Cents): string =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(c / 100)

/** Arrotonda per DIFETTO. Si usa per tutto ciò che il conducente incassa. */
export const floorCents = (x: number): Cents => Math.floor(x + 1e-9)

/** Arrotonda per ECCESSO. Si usa per i costi che la piattaforma sostiene. */
export const ceilCents = (x: number): Cents => Math.ceil(x - 1e-9)

export const roundCents = (x: number): Cents => Math.round(x)
