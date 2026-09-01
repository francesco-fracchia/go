/**
 * Come si dicono le date.
 *
 * «31/08/2026 23:30» è preciso e non lo legge nessuno. Chi guarda un
 * elenco di viaggi cerca «stasera», «domani», «sabato»: sono le parole con
 * cui la data è già stata pensata, e ritradurla ogni volta costa un
 * secondo per riga.
 *
 * Sotto la settimana si usa il nome del giorno; oltre, il numero — perché
 * «giovedì» a undici giorni di distanza è ambiguo e «11 set» no.
 */

/**
 * Il fuso si dichiara. Sempre, ovunque, esplicitamente.
 *
 * `toLocaleTimeString` senza fuso usa quello di CHI ESEGUE. Sul server è
 * UTC, nel browser è quello del telefono: la stessa corsa compariva come
 * «19:17» sulla schermata del conducente, disegnata dal server, e «21:17»
 * nell'intestazione della chat, disegnata dal browser. Due ore di scarto
 * sulla stessa riga del database.
 *
 * Su un'applicazione di passaggi in auto questo non è un dettaglio di
 * formattazione: è qualcuno che aspetta al ritrovo due ore prima, o che
 * arriva quando l'auto è già partita. E d'inverno lo scarto sarebbe un'ora
 * invece di due, quindi nemmeno costante — il tipo di guasto che sembra
 * casuale e non si riesce a riprodurre.
 *
 * GO parte da una provincia italiana e serve un fuso solo. Se un giorno
 * ne servissero due, il posto da cambiare è questo.
 */
export const FUSO = 'Europe/Rome'

/** Il giorno del calendario italiano, come «2026-09-01». */
const giornoIso = (d: Date) => d.toLocaleDateString('sv-SE', { timeZone: FUSO })

/**
 * Quanti giorni di calendario separano una data da oggi, in Italia.
 *
 * Si confrontano i GIORNI, non le ore: alle 23:30 «domani» comincia fra
 * mezz'ora, e una sottrazione di millisecondi direbbe ancora «oggi». Il
 * confronto passa dalle date italiane, non da quelle di chi esegue — che
 * sul server sarebbero UTC, e a mezzanotte darebbero il giorno sbagliato.
 */
export function giorniDaOggi(d: Date, adesso = new Date()): number {
  const a = Date.parse(`${giornoIso(d)}T00:00:00Z`)
  const b = Date.parse(`${giornoIso(adesso)}T00:00:00Z`)
  return Math.round((a - b) / 86_400_000)
}

/** Le parole per i giorni vicini: cambiano col posto in cui si legge. */
export interface Parole { oggi: string; domani: string; ieri?: string }
const NORMALI: Parole = { oggi: 'oggi', domani: 'domani', ieri: 'ieri' }

export function quando(iso: string | Date, parole: Parole = NORMALI): string {
  const d = iso instanceof Date ? iso : new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const ora = orario(d)
  const giorni = giorniDaOggi(d)
  if (giorni === 0) return `${parole.oggi} · ${ora}`
  if (giorni === 1) return `${parole.domani} · ${ora}`
  if (giorni === -1 && parole.ieri) return `${parole.ieri} · ${ora}`
  if (giorni > 1 && giorni < 7) {
    return `${d.toLocaleDateString('it-IT', { weekday: 'long', timeZone: FUSO })} · ${ora}`
  }
  return `${d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', timeZone: FUSO })} · ${ora}`
}

export const orario = (iso: string | Date) =>
  (iso instanceof Date ? iso : new Date(iso))
    .toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: FUSO })

export const giorno = (iso: string | Date) =>
  (iso instanceof Date ? iso : new Date(iso))
    .toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', timeZone: FUSO })
