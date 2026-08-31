import { db } from './db.ts'

/**
 * Gli inviti.
 *
 * Un mercato a due lati non parte da solo: la prima persona che arriva non
 * trova nessuno e se ne va. Parte se chi c'è porta qualcuno — e porta
 * qualcuno che già conosce, perché la prima corsa la si fa volentieri con
 * un amico di un amico.
 *
 * Qui si registra soltanto chi ha portato chi. Nessun premio in denaro: un
 * incentivo che paga per iscrizione trasformerebbe un rimborso spese in un
 * guadagno, che è la linea che questo prodotto non attraversa.
 */

export const BISCOTTO_INVITO = 'invito'

/** Il codice personale di qualcuno: stabile, e non memorizzato da nessuna parte. */
export async function codiceDi(utenteId: string): Promise<string | null> {
  const { data, error } = await db.rpc('codice_invito', { p_id: utenteId })
  if (error) return null
  return typeof data === 'string' ? data : null
}

/** Chi c'è dietro un codice. Nullo se il codice non esiste. */
export async function chiInvita(codice: string): Promise<{ id: string; nome: string } | null> {
  const { data, error } = await db.rpc('chi_invita', { p_codice: codice })
  if (error) return null
  const r = Array.isArray(data) ? data[0] : data
  return r ? { id: String(r.id), nome: String(r.nome) } : null
}

/**
 * Segna chi ha portato chi, una volta sola.
 *
 * Si scrive solo se il campo è vuoto: un invito arrivato dopo — perché
 * qualcuno ha riaperto un vecchio collegamento — non riscrive la storia. E
 * nessuno può invitare sé stesso, che è il primo modo in cui si prova a
 * imbrogliare un programma di inviti.
 */
export async function segnaInvito(nuovo: string, codice: string): Promise<void> {
  const chi = await chiInvita(codice)
  if (!chi || chi.id === nuovo) return

  const { data: p } = await db
    .from('profili').select('invitato_da').eq('id', nuovo).maybeSingle()
  if (p?.invitato_da) return

  await db.from('profili')
    .update({ invitato_da: chi.id, invitato_il: new Date().toISOString() })
    .eq('id', nuovo)
}

/** Quante persone ha portato: l'unico numero che questo programma produce. */
export async function quantiInvitati(utenteId: string): Promise<number> {
  const { count } = await db
    .from('profili').select('id', { count: 'exact', head: true })
    .eq('invitato_da', utenteId)
  return count ?? 0
}
