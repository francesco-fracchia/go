import { db } from './db.ts'
import { notifica } from './notifiche.ts'

/**
 * Recensioni, con moderazione preventiva.
 *
 * Due scelte contro corrente, entrambe volute:
 *
 * 1. NIENTE STELLE. Solo «è andata bene» o «c'è stato un problema». Una
 *    media di stelle su venti viaggi non distingue il conducente pessimo da
 *    quello che una volta è arrivato tardi, e spinge tutti verso il quattro
 *    e mezzo. I distintivi ricavati dai fatti dicono di più.
 *
 * 2. IL TESTO È FACOLTATIVO E MODERATO PRIMA. Nessuna recensione appare
 *    senza approvazione. Su un prodotto dove si sale in macchina con
 *    sconosciuti di notte, una diffamazione pubblicata anche per sole due
 *    ore è un danno che non si ripara.
 */

export const FINESTRA_RECENSIONE_GIORNI = 14

export async function lasciaRecensione(opts: {
  prenotazioneId: string
  autoreId: string
  positiva: boolean
  tag?: string[]
  testo?: string
}) {
  const { data: p } = await db
    .from('prenotazioni')
    .select('id, passeggero, stato, corse!inner(conducente, ora_arrivo)')
    .eq('id', opts.prenotazioneId)
    .single()
  if (!p) return { esito: 'non_trovata' as const }

  const c = p.corse as unknown as { conducente: string; ora_arrivo: string }
  const partecipa = p.passeggero === opts.autoreId || c.conducente === opts.autoreId
  if (!partecipa) return { esito: 'non_tua' as const }
  if (!['completata', 'liquidata', 'catturata'].includes(p.stato)) {
    return { esito: 'presto' as const }
  }

  const giorni = (Date.now() - new Date(c.ora_arrivo).getTime()) / 86_400_000
  if (giorni > FINESTRA_RECENSIONE_GIORNI) return { esito: 'tardi' as const }

  const destinatario = p.passeggero === opts.autoreId ? c.conducente : p.passeggero
  const testo = opts.testo?.trim() || null

  const { error } = await db.from('recensioni').insert({
    prenotazione: p.id,
    autore: opts.autoreId,
    destinatario,
    positiva: opts.positiva,
    tag: opts.tag ?? [],
    testo,
    // Senza testo non c'è niente da moderare: il giudizio secco pubblica
    // subito. Con testo, si aspetta.
    moderazione: testo ? 'in_attesa' : 'pubblicata',
  })
  if (error) {
    if (error.code === '23505') return { esito: 'gia_fatta' as const }
    return { esito: 'errore' as const }
  }
  return { esito: 'ok' as const, inModerazione: !!testo }
}

/** La coda di moderazione. */
export async function daModerare(limite = 50) {
  const { data } = await db
    .from('recensioni')
    .select(`
      id, positiva, tag, testo, creata_il,
      autore:profili!recensioni_autore_fkey (nome),
      destinatario:profili!recensioni_destinatario_fkey (nome)
    `)
    .eq('moderazione', 'in_attesa')
    .order('creata_il', { ascending: true })
    .limit(limite)
  return data ?? []
}

export async function modera(recensioneId: string, approvata: boolean) {
  const { data } = await db.from('recensioni')
    .update({ moderazione: approvata ? 'pubblicata' : 'rifiutata' })
    .eq('id', recensioneId)
    .select('autore, destinatario')
    .single()

  if (data && !approvata) {
    await notifica({
      destinatario: data.autore,
      tipo: 'recensione_invito',
      titolo: 'La tua recensione non è stata pubblicata',
      testo: 'Il giudizio resta registrato, il testo no. Se pensi sia un errore scrivici.',
      url: '/profilo',
      chiave: `mod:${recensioneId}`,
    })
  }
  return !!data
}

/** Le recensioni pubbliche di una persona. */
export async function recensioniDi(utenteId: string, limite = 20) {
  const { data } = await db
    .from('recensioni')
    .select('id, positiva, tag, testo, creata_il, autore:profili!recensioni_autore_fkey(nome, foto_url)')
    .eq('destinatario', utenteId)
    .eq('moderazione', 'pubblicata')
    .order('creata_il', { ascending: false })
    .limit(limite)
  return data ?? []
}

/**
 * L'invito a recensire, dopo lo sblocco.
 *
 * Si chiede DOPO che il pagamento è maturato, non prima: chiederlo mentre i
 * soldi sono ancora fermi trasformerebbe la recensione in una leva, e
 * qualcuno la userebbe come tale.
 */
export async function invitaARecensire() {
  const { data: prenotazioni } = await db
    .from('prenotazioni')
    .select('id, passeggero, corse!inner(conducente, profili:conducente(nome))')
    .eq('stato', 'completata')
    .eq('esito', 'ok')
    .gte('esito_il', new Date(Date.now() - 36 * 3600_000).toISOString())

  let inviti = 0
  for (const p of prenotazioni ?? []) {
    const c = p.corse as unknown as { profili: { nome: string } | null }
    const esito = await notifica({
      destinatario: p.passeggero,
      tipo: 'recensione_invito',
      titolo: `Com'è andata con ${c.profili?.nome ?? 'il conducente'}?`,
      testo: 'Due tocchi. Aiuta chi prenoterà dopo di te.',
      url: `/recensione/${p.id}`,
      prenotazione: p.id,
      chiave: `invito:${p.id}`,
    })
    if (esito === 'push' || esito === 'sms') inviti++
  }
  return inviti
}
