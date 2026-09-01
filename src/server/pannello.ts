import { db } from './db.ts'
import { REGISTRO } from './registro-lavori.ts'

/**
 * Il pannello: sapere se qualcuno sta usando l'applicazione, e come.
 *
 * All'inizio non serve un cruscotto di anomalie — a zero utenti non mostra
 * niente e non insegna niente. Serve vedere che succede qualcosa: chi si è
 * iscritto, chi ha pubblicato, chi ha cercato e non ha trovato.
 *
 * Il diario si ricostruisce dalle date che ogni tabella aveva già. L'unica
 * cosa che è stata aggiunta sono le ricerche, perché erano la metà dell'uso
 * che non lasciava nessuna riga.
 */

export interface Evento {
  quando: string
  tipo: string
  chi: string | null
  nome: string
  cosa: string
  corsa: string | null
}

export async function diario(limite = 120): Promise<Evento[]> {
  const { data } = await db
    .from('diario')
    .select('quando, tipo, chi, nome, cosa, corsa')
    .order('quando', { ascending: false })
    .limit(limite)
  return (data ?? []) as Evento[]
}

/** Il diario di una persona sola: come l'ha usata lei, in ordine. */
export async function diarioDi(utenteId: string, limite = 60): Promise<Evento[]> {
  const { data } = await db
    .from('diario')
    .select('quando, tipo, chi, nome, cosa, corsa')
    .eq('chi', utenteId)
    .order('quando', { ascending: false })
    .limit(limite)
  return (data ?? []) as Evento[]
}

export interface Numeri {
  iscritti: number
  iscrittiSettimana: number
  corseSettimana: number
  prenotazioniSettimana: number
  ricercheSettimana: number
  ricercheAVuoto: number
  /** Persone con almeno due corse: l'unica ritenzione che conta all'inizio. */
  tornati: number
}

/**
 * Pochi numeri, e veri.
 *
 * «Ricerche a vuoto» è quello da guardare per primo: dice quante persone
 * hanno aperto l'applicazione, hanno cercato e se ne sono andate a mani
 * vuote. È l'unico che indica cosa fare — su quale tratta mettere il
 * prossimo conducente — invece di dire soltanto come sta andando.
 */
export async function numeri(): Promise<Numeri> {
  const settimanaFa = new Date(Date.now() - 7 * 86_400_000).toISOString()
  const conta = async (
    tabella: string, colonna: string, filtro?: (q: any) => any,
  ): Promise<number> => {
    let q = db.from(tabella).select('id', { count: 'exact', head: true })
    if (colonna) q = q.gte(colonna, settimanaFa)
    if (filtro) q = filtro(q)
    const { count } = await q
    return count ?? 0
  }

  const [iscritti, iscrittiSettimana, corseSettimana, prenotazioniSettimana,
    ricercheSettimana, ricercheAVuoto] = await Promise.all([
    conta('profili', ''),
    conta('profili', 'creato_il'),
    conta('corse', 'creata_il'),
    conta('prenotazioni', 'creata_il'),
    conta('ricerche', 'creata_il'),
    conta('ricerche', 'creata_il', (q: any) => q.eq('risultati', 0)),
  ])

  /* Chi è tornato: persone con almeno due corse concluse o prenotate. */
  const { data: righe } = await db.from('prenotazioni').select('passeggero')
  const per = new Map<string, number>()
  for (const r of righe ?? []) per.set(r.passeggero, (per.get(r.passeggero) ?? 0) + 1)
  const tornati = [...per.values()].filter((n) => n >= 2).length

  return {
    iscritti, iscrittiSettimana, corseSettimana, prenotazioniSettimana,
    ricercheSettimana, ricercheAVuoto, tornati,
  }
}

/**
 * I dodici lavori automatici: quando hanno girato e com'è andata.
 *
 * Un lavoro che smette in silenzio è il modo in cui i soldi smettono di
 * muoversi senza che nessuno se ne accorga. È già successo: `liquida` era
 * scritto, corretto, e non lo chiamava nessuno — e l'unico modo di
 * accorgersene era interrogare il database a mano.
 */
export interface StatoLavoro {
  nome: string
  eseguitoIl: string | null
  durataMs: number | null
  errore: string | null
}

export async function lavoriRecenti(): Promise<StatoLavoro[]> {
  const { data } = await db
    .from('lavori')
    .select('nome, esito, errore, durata_ms, eseguito_il')
    .like('chiave', 'ultimo:%')

  const visti = new Map((data ?? []).map((l) => [l.nome, l]))

  /**
   * Si parte dall'elenco di quelli che DOVREBBERO girare, non da quelli che
   * hanno girato.
   *
   * Un lavoro che non ha mai girato non ha una riga, quindi elencando le
   * righe è invisibile — e il primo che è capitato di trovare così è
   * `liquida`, cioè quello che paga i conducenti. Un pannello che nasconde
   * proprio il caso per cui esiste è peggio di nessun pannello: dice che va
   * tutto bene guardando solo le cose che vanno bene.
   */
  return Object.keys(REGISTRO).sort().map((nome) => {
    const l = visti.get(nome)
    return {
      nome,
      eseguitoIl: l?.eseguito_il ?? null,
      durataMs: l?.durata_ms ?? null,
      errore: l?.errore ?? null,
    }
  })
}
