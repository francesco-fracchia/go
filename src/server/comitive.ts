import { db } from './db.ts'

/**
 * La comitiva.
 *
 * L'unità che i viaggi li decide davvero non è la persona: è il gruppo di
 * amici. È il gruppo che sceglie dove si va, chi passa a prendere chi, e —
 * la domanda vera delle due di notte — chi resta sobrio.
 *
 * Tre cose che qui stanno insieme apposta: il gruppo, il turno di chi
 * guida, e la dichiarazione «stasera non guido». Separate sarebbero tre
 * funzioncine; insieme sono un sistema, perché chi ha detto che beve esce
 * dal sorteggio, e il sorteggio non è casuale ma ricorda.
 */

export class ErroreComitiva extends Error {
  codice: string
  constructor(codice: string, messaggio: string) {
    super(messaggio)
    this.name = 'ErroreComitiva'
    this.codice = codice
  }
}

export interface Membro {
  id: string
  nome: string
  fotoUrl: string | null
  /** quante volte ha guidato per questa comitiva */
  volte: number
  /** se stasera non ha detto «non guido» */
  disponibile: boolean
}

export interface Comitiva {
  id: string
  nome: string
  codice: string
  membri: number
}

/** La sera "di adesso": prima delle sei del mattino conta come ieri. */
export function seraCorrente(adesso = new Date()): string {
  const d = new Date(adesso)
  if (d.getHours() < 6) d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

export async function mieComitive(utente: string): Promise<Comitiva[]> {
  const { data } = await db
    .from('comitive_membri')
    .select('comitiva, comitive(id, nome)')
    .eq('persona', utente)

  const righe = (data ?? []) as unknown as Array<{
    comitiva: string; comitive: { id: string; nome: string } | null
  }>
  if (righe.length === 0) return []

  const ids = righe.map((r) => r.comitiva)
  const { data: conteggi } = await db
    .from('comitive_membri').select('comitiva').in('comitiva', ids)

  const quanti = new Map<string, number>()
  for (const c of (conteggi ?? []) as Array<{ comitiva: string }>) {
    quanti.set(c.comitiva, (quanti.get(c.comitiva) ?? 0) + 1)
  }

  const codici = await Promise.all(ids.map((id) => codiceDi(id)))
  return righe.map((r, i) => ({
    id: r.comitiva,
    nome: r.comitive?.nome ?? 'Comitiva',
    codice: codici[i] ?? '',
    membri: quanti.get(r.comitiva) ?? 1,
  }))
}

export async function codiceDi(comitiva: string): Promise<string> {
  const { data } = await db.rpc('codice_comitiva', { p_id: comitiva })
  return String(data ?? '')
}

export async function creaComitiva(utente: string, nome: string): Promise<string> {
  const pulito = nome.trim()
  if (!pulito) throw new ErroreComitiva('nome', 'Serve un nome per la comitiva.')
  if (pulito.length > 40) throw new ErroreComitiva('nome', 'Il nome è troppo lungo.')

  const { data, error } = await db
    .from('comitive').insert({ nome: pulito, creata_da: utente }).select('id').single()
  if (error || !data) throw new Error(error?.message ?? 'comitiva non creata')

  // Chi la crea ne fa parte: una comitiva senza il suo fondatore è
  // un'anomalia che nessuna schermata saprebbe raccontare.
  await db.from('comitive_membri').insert({ comitiva: data.id, persona: utente })
  return data.id
}

export async function entraConCodice(utente: string, codice: string): Promise<Comitiva> {
  const { data } = await db.rpc('comitiva_da_codice', { p_codice: codice })
  const riga = (Array.isArray(data) ? data[0] : data) as
    { id: string; nome: string; membri: number } | undefined
  if (!riga) throw new ErroreComitiva('codice', 'Questo codice non corrisponde a nessuna comitiva.')

  await db.from('comitive_membri')
    .upsert({ comitiva: riga.id, persona: utente }, { onConflict: 'comitiva,persona' })
  return {
    id: riga.id, nome: riga.nome,
    codice: await codiceDi(riga.id), membri: Number(riga.membri) + 1,
  }
}

export async function faParte(utente: string, comitiva: string): Promise<boolean> {
  const { data } = await db.from('comitive_membri')
    .select('persona').eq('comitiva', comitiva).eq('persona', utente).maybeSingle()
  return !!data
}

export async function turno(comitiva: string, sera = seraCorrente()): Promise<Membro[]> {
  const { data, error } = await db.rpc('turno_comitiva', {
    p_comitiva: comitiva, p_sera: sera,
  })
  if (error) throw new Error(error.message)
  return ((data ?? []) as Array<Record<string, unknown>>).map((m) => ({
    id: String(m.persona),
    nome: String(m.nome),
    fotoUrl: (m.foto_url as string) ?? null,
    volte: Number(m.volte),
    disponibile: m.disponibile === true,
  }))
}

/**
 * Chi tocca stasera.
 *
 * Non è un sorteggio: è un turno. Pesca fra chi NON ha detto «stasera non
 * guido» e propone chi ha guidato di meno; a parità sceglie a caso, che è
 * l'unico punto in cui il caso serve davvero — perché fra due persone
 * ferme allo stesso numero non c'è nessuna ragione per preferirne una.
 *
 * La ruota che gira in schermata mostra QUESTO risultato. Non è un
 * imbroglio: è dichiarato, ed è la ragione per cui la usano — un sorteggio
 * casuale diverte una volta, un turno che si ricorda chiude una lite che
 * si ripete ogni sabato.
 */
export function chiTocca(membri: Membro[]): Membro | null {
  const disponibili = membri.filter((m) => m.disponibile)
  if (disponibili.length === 0) return null
  const minimo = Math.min(...disponibili.map((m) => m.volte))
  const pari = disponibili.filter((m) => m.volte === minimo)
  return pari[Math.floor(Math.random() * pari.length)] ?? null
}

/**
 * Il conto, in passaggi.
 *
 * Quanto ciascuno è sopra o sotto la media del gruppo. In passaggi e non
 * in euro, deliberatamente: un debito in natura fra amici è simpatico, lo
 * stesso debito in denaro trasforma gli amici in creditori — e ci
 * trascinerebbe dentro pagamenti e adempimenti che con una comitiva non
 * c'entrano niente.
 */
export function conto(membri: Membro[]): Array<Membro & { saldo: number }> {
  if (membri.length === 0) return []
  const media = membri.reduce((s, m) => s + m.volte, 0) / membri.length
  return membri.map((m) => ({ ...m, saldo: Math.round((m.volte - media) * 10) / 10 }))
}

export async function segnaTurno(comitiva: string, guidatore: string, corsa?: string) {
  if (!await faParte(guidatore, comitiva)) {
    throw new ErroreComitiva('estraneo', 'Chi guida deve far parte della comitiva.')
  }
  await db.from('turni').insert({ comitiva, guidatore, corsa: corsa ?? null })
}

/** «Stasera non guido» — e «anzi, guido»: la stessa dichiarazione, tolta. */
export async function diciNonGuido(utente: string, valore: boolean, sera = seraCorrente()) {
  if (valore) {
    await db.from('non_guido')
      .upsert({ persona: utente, sera }, { onConflict: 'persona,sera' })
  } else {
    await db.from('non_guido').delete().eq('persona', utente).eq('sera', sera)
  }
}
