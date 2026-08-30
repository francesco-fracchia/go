import { db } from './db.ts'

/**
 * Le serate.
 *
 * Non sono un catalogo di eventi. Sono la risposta a un problema preciso:
 * nel primo anno la ricerca è quasi sempre vuota, e una casella di testo su
 * fondo bianco non dà a nessuno una ragione per tornare.
 *
 * Il numero che conta di più è lo ZERO. «Bolgia, sabato, nessuno ancora» è
 * l'informazione che fa pubblicare un conducente — molto più di «4 passaggi
 * disponibili», che gli dice che il posto è già coperto.
 */

export interface SerataConCorse {
  id: string
  locale: string
  citta: string
  quando: string
  inizio: string
  corsePubblicate: number
}

export async function prossimeSerate(limite = 8): Promise<SerataConCorse[]> {
  const { data } = await db
    .from('serate')
    .select('id, locale, citta, inizio')
    .eq('pubblicata', true)
    .gte('inizio', new Date(Date.now() - 6 * 3600_000).toISOString())
    .order('inizio', { ascending: true })
    .limit(limite)

  const serate = data ?? []
  const conteggi = await Promise.all(
    serate.map((s) => db.rpc('corse_per_serata', { p_serata: s.id })),
  )

  return serate.map((s, i) => ({
    id: s.id,
    locale: s.locale,
    citta: s.citta,
    inizio: s.inizio,
    quando: quando(s.inizio),
    corsePubblicate: Number(conteggi[i]?.data ?? 0),
  }))
}

/**
 * «stasera · 23:30» invece di «30/08/2026 23:30».
 *
 * Chi guarda alle undici di sera vuole sapere se è stanotte o sabato, non
 * la data. È la stessa ragione per cui il conto alla rovescia dice «42 min»
 * e non un orario.
 */
function quando(iso: string): string {
  const d = new Date(iso)
  const ora = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  const oggi = new Date()
  const giorni = Math.round(
    (new Date(d.toDateString()).getTime() - new Date(oggi.toDateString()).getTime()) / 86_400_000,
  )
  if (giorni === 0) return `stasera · ${ora}`
  if (giorni === 1) return `domani · ${ora}`
  if (giorni < 7) {
    return `${d.toLocaleDateString('it-IT', { weekday: 'long' })} · ${ora}`
  }
  return `${d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })} · ${ora}`
}
