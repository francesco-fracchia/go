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

export function quando(iso: string | Date): string {
  const d = iso instanceof Date ? iso : new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const ora = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  const giorni = Math.round(
    (new Date(d.toDateString()).getTime() - new Date(new Date().toDateString()).getTime()) / 86_400_000,
  )
  if (giorni === 0) return `oggi · ${ora}`
  if (giorni === 1) return `domani · ${ora}`
  if (giorni === -1) return `ieri · ${ora}`
  if (giorni > 1 && giorni < 7) return `${d.toLocaleDateString('it-IT', { weekday: 'long' })} · ${ora}`
  return `${d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })} · ${ora}`
}

export const orario = (iso: string | Date) =>
  (iso instanceof Date ? iso : new Date(iso))
    .toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })

export const giorno = (iso: string | Date) =>
  (iso instanceof Date ? iso : new Date(iso))
    .toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
