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
  /** Come è andata, senza giudizio. Non concorre al positivo o negativo. */
  descrittori?: string[]
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
    descrittori: opts.descrittori ?? [],
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
/**
 * Le recensioni che si possono mostrare.
 *
 * Si legge dalla vista, non dalla tabella: è lì che vive la regola del
 * doppio cieco — niente si vede finché non hanno scritto tutti e due o
 * finché non scade la finestra. Leggere dalla tabella significherebbe
 * riscrivere quella regola in un secondo posto, e due copie di una regola
 * divergono sempre.
 *
 * E non si chiede il nome di chi ha scritto. Anonima verso il pubblico,
 * nota a noi: chi la riceve legge «un passeggero, agosto», noi sappiamo
 * esattamente chi. Il sollievo di non sentirsi giudicati in faccia, senza
 * creare un'arma senza impronte.
 */
export async function recensioniDi(utenteId: string, limite = 20) {
  const { data } = await db
    .from('recensioni_visibili')
    .select('id, positiva, tag, descrittori, testo, creata_il, ruolo_autore')
    .eq('destinatario', utenteId)
    .order('creata_il', { ascending: false })
    .limit(limite)
  return data ?? []
}

/** Quante ne mancano prima che un rapporto voglia dire qualcosa. */
export const MINIMO_PER_RAPPORTO = 5

/**
 * I numeri di sintesi si contano su TUTTE, non sulla pagina mostrata.
 *
 * `recensioniDi` prende le ultime dieci perché dieci è quanto ha senso
 * leggere. Calcolare «9 su 10 lo rifarebbero» su quelle dieci dà un
 * rapporto che descrive la pagina, non la persona — e cambia da solo
 * quando cambia il numero di righe che decidiamo di mostrare.
 *
 * Il limite alto è una difesa contro la memoria, non un campione: a
 * cinquecento recensioni il rapporto è già stabile, e chi ne ha di più ha
 * altri problemi.
 */
export async function numeriDi(utenteId: string) {
  const { data } = await db
    .from('recensioni_visibili')
    .select('positiva, tag, descrittori')
    .eq('destinatario', utenteId)
    .limit(500)
  return (data ?? []) as Array<{
    positiva: boolean; tag: string[]; descrittori: string[] | null
  }>
}

/**
 * Il riassunto, e quando NON darlo.
 *
 * Con tre viaggi una recensione negativa vale il trentatré per cento e non
 * significa niente. E un numero che il lettore non può interpretare è
 * peggio di nessun numero: «13 su 14» senza altro fa immaginare la cosa
 * peggiore, perché non c'è niente a cui attaccare quel «1».
 *
 * Perciò due regole. Sotto la soglia non si dà nessun rapporto. Sopra, il
 * negativo non compare mai nudo: siccome la recensione è strutturata, chi
 * dice «non lo rifarei» ha spuntato almeno un fatto, e quel fatto si
 * mostra accanto. Un no spiegato spaventa molto meno di un no muto.
 */
export function riassunto(recensioni: Array<{ positiva: boolean; tag: string[] }>) {
  const totale = recensioni.length
  if (totale < MINIMO_PER_RAPPORTO) return { mostra: false as const, totale }

  const negative = recensioni.filter((r) => !r.positiva)
  const motivi = [...new Set(negative.flatMap((r) => r.tag))]
  return {
    mostra: true as const,
    totale,
    rifarebbero: totale - negative.length,
    motivi,
  }
}

/**
 * Cosa aspettarsi da un viaggio con questa persona.
 *
 * I descrittori non sono voti, quindi non si sommano né si mediano: si
 * guarda cosa RICORRE. Una cosa detta una volta è un caso, detta dalla
 * metà delle persone è un'aspettativa — ed è quella l'informazione utile
 * a chi deve decidere se salire.
 */
export function abitudini(
  recensioni: Array<{ descrittori?: string[] | null }>, minimo = 2,
): string[] {
  const conta = new Map<string, number>()
  for (const r of recensioni) {
    for (const d of r.descrittori ?? []) conta.set(d, (conta.get(d) ?? 0) + 1)
  }
  const soglia = Math.max(minimo, Math.ceil(recensioni.length / 2))
  return [...conta.entries()]
    .filter(([, n]) => n >= soglia)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([d]) => d)
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
