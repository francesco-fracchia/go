import { db } from './db.ts'

/**
 * «Non voglio più viaggiare con questa persona.»
 *
 * Fra segnalare — cioè chiedere a noi di occuparcene — e non fare niente
 * non c'era nessun gesto intermedio. E la maggior parte dei casi sta lì in
 * mezzo: nessun reato, nessuna accusa da scrivere, solo un viaggio andato
 * male con qualcuno che non si vuole rivedere.
 */

/** Vale nei due sensi: chi blocca e chi è bloccato non si incontrano più. */
export async function bloccati(a: string, b: string): Promise<boolean> {
  const { data } = await db.rpc('bloccati', { a, b })
  return data === true
}

/** Tutti quelli che questa persona non deve incontrare, in un verso o nell'altro. */
export async function daEvitare(utenteId: string): Promise<Set<string>> {
  const [{ data: miei }, { data: altrui }] = await Promise.all([
    db.from('blocchi').select('bloccato').eq('chi', utenteId),
    db.from('blocchi').select('chi').eq('bloccato', utenteId),
  ])
  return new Set([
    ...(miei ?? []).map((b) => b.bloccato),
    ...(altrui ?? []).map((b) => b.chi),
  ])
}

export async function blocca(chi: string, bloccato: string, motivo?: string) {
  if (chi === bloccato) return { ok: false as const, motivo: 'te_stesso' as const }
  const { error } = await db.from('blocchi')
    .upsert({ chi, bloccato, motivo: motivo?.trim() || null }, { onConflict: 'chi,bloccato' })
  return error ? { ok: false as const, motivo: 'db' as const } : { ok: true as const }
}

export async function sblocca(chi: string, bloccato: string) {
  await db.from('blocchi').delete().eq('chi', chi).eq('bloccato', bloccato)
  return { ok: true as const }
}

/** Chi ho bloccato io, per poterlo disfare. */
export async function mieiBlocchi(utenteId: string) {
  const { data } = await db
    .from('blocchi')
    .select('bloccato, motivo, creato_il, profili:bloccato (nome, foto_url)')
    .eq('chi', utenteId)
    .order('creato_il', { ascending: false })
  return data ?? []
}
