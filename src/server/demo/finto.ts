/**
 * Un finto Supabase, in memoria.
 *
 * Esiste per una ragione sola: far girare l'applicazione VERA — le pagine
 * vere, la navigazione vera, i calcoli veri — senza chiavi e senza
 * database. Una galleria di componenti con dati finti non è l'app, e finché
 * non ci si clicca dentro non si sa se funziona.
 *
 * Implementa il sottoinsieme di interrogazioni che il prodotto usa davvero.
 * Se qualcuno aggiunge una chiamata nuova e qui manca, il modo giusto di
 * accorgersene è che la modalità dimostrativa si rompa: per questo non ci
 * sono ripieghi silenziosi.
 */

type Riga = Record<string, unknown>
export type Tabelle = Record<string, Riga[]>

interface Filtro { tipo: string; campo: string; valore: unknown }
interface Risposta { data: unknown; error: { message: string; code?: string } | null }

class Interrogazione implements PromiseLike<Risposta> {
  private filtri: Filtro[] = []
  private selezione = '*'
  private ordinamento: { campo: string; crescente: boolean } | null = null
  private massimo: number | null = null
  private singola: 'obbligatoria' | 'facoltativa' | null = null

  constructor(
    private tabelle: Tabelle,
    private tabella: string,
    private operazione: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select',
    private carico: Riga | Riga[] | null = null,
  ) {}

  select(s = '*') { this.selezione = s; return this }
  eq(c: string, v: unknown) { return this.filtro('eq', c, v) }
  neq(c: string, v: unknown) { return this.filtro('neq', c, v) }
  gt(c: string, v: unknown) { return this.filtro('gt', c, v) }
  gte(c: string, v: unknown) { return this.filtro('gte', c, v) }
  lt(c: string, v: unknown) { return this.filtro('lt', c, v) }
  lte(c: string, v: unknown) { return this.filtro('lte', c, v) }
  is(c: string, v: unknown) { return this.filtro('is', c, v) }
  in(c: string, v: unknown[]) { return this.filtro('in', c, v) }
  not(c: string, _op: string, v: unknown) { return this.filtro('not_in', c, v) }
  order(c: string, o?: { ascending?: boolean }) {
    this.ordinamento = { campo: c, crescente: o?.ascending !== false }; return this
  }
  limit(n: number) { this.massimo = n; return this }
  single() { this.singola = 'obbligatoria'; return this }
  maybeSingle() { this.singola = 'facoltativa'; return this }

  private filtro(tipo: string, campo: string, valore: unknown) {
    this.filtri.push({ tipo, campo, valore }); return this
  }

  then<A, B>(
    ok?: ((v: Risposta) => A | PromiseLike<A>) | null,
    no?: ((r: unknown) => B | PromiseLike<B>) | null,
  ): PromiseLike<A | B> {
    return Promise.resolve(this.esegui()).then(ok, no)
  }

  private esegui(): Risposta {
    const righe = (this.tabelle[this.tabella] ??= [])

    if (this.operazione === 'insert' || this.operazione === 'upsert') {
      const nuove = (Array.isArray(this.carico) ? this.carico : [this.carico!])
        .map((r) => ({ id: r.id ?? id(), creata_il: adesso(), creato_il: adesso(), ...r }))
      righe.push(...nuove)
      return this.risultato(nuove)
    }

    const trovate = righe.filter((r) => this.filtri.every((f) => passa(r, f)))

    if (this.operazione === 'update') {
      for (const r of trovate) Object.assign(r, this.carico as Riga)
      return this.risultato(trovate)
    }
    if (this.operazione === 'delete') {
      for (const r of trovate) righe.splice(righe.indexOf(r), 1)
      return this.risultato(trovate)
    }

    let esito = trovate.map((r) => espandi(this.tabelle, this.tabella, r, this.selezione))
    if (this.ordinamento) {
      const { campo, crescente } = this.ordinamento
      esito = [...esito].sort((a, b) => {
        const x = a[campo] as never, y = b[campo] as never
        return (x < y ? -1 : x > y ? 1 : 0) * (crescente ? 1 : -1)
      })
    }
    if (this.massimo !== null) esito = esito.slice(0, this.massimo)
    return this.risultato(esito)
  }

  private risultato(righe: Riga[]): Risposta {
    if (this.singola === 'obbligatoria') {
      return righe[0] ? { data: righe[0], error: null }
        : { data: null, error: { message: 'nessuna riga', code: 'PGRST116' } }
    }
    if (this.singola === 'facoltativa') return { data: righe[0] ?? null, error: null }
    return { data: righe, error: null }
  }
}

function passa(r: Riga, f: Filtro): boolean {
  const v = r[f.campo]
  switch (f.tipo) {
    case 'eq': return v === f.valore
    case 'neq': return v !== f.valore
    case 'gt': return (v as never) > (f.valore as never)
    case 'gte': return (v as never) >= (f.valore as never)
    case 'lt': return (v as never) < (f.valore as never)
    case 'lte': return (v as never) <= (f.valore as never)
    case 'is': return v === f.valore
    case 'in': return (f.valore as unknown[]).includes(v)
    case 'not_in': {
      const lista = String(f.valore).replace(/[()"]/g, '').split(',').map((s) => s.trim())
      return !lista.includes(String(v))
    }
    default: return true
  }
}

/** Le relazioni annidate, `corse ( id, profili:conducente ( nome ) )`. */
function espandi(t: Tabelle, tabella: string, riga: Riga, selezione: string): Riga {
  const fuori: Riga = { ...riga }
  for (const rel of relazioni(selezione)) {
    const nome = rel.alias ?? rel.tabella
    const chiave = rel.campo ?? singolare(rel.tabella)

    if (riga[chiave] !== undefined && riga[chiave] !== null) {
      const bersaglio = (t[rel.tabella] ?? []).find((x) => x.id === riga[chiave])
      fuori[nome] = bersaglio ? espandi(t, rel.tabella, bersaglio, rel.dentro) : null
    } else {
      const inversa = singolare(tabella)
      fuori[nome] = (t[rel.tabella] ?? [])
        .filter((x) => x[inversa] === riga.id)
        .map((x) => espandi(t, rel.tabella, x, rel.dentro))
    }
  }
  return fuori
}

interface Relazione { tabella: string; alias?: string; campo?: string; dentro: string }

function relazioni(selezione: string): Relazione[] {
  const out: Relazione[] = []
  let i = 0
  while (i < selezione.length) {
    const apre = selezione.indexOf('(', i)
    if (apre === -1) break
    let prof = 1, j = apre + 1
    while (j < selezione.length && prof > 0) {
      if (selezione[j] === '(') prof++
      if (selezione[j] === ')') prof--
      j++
    }
    const dentro = selezione.slice(apre + 1, j - 1)
    const prima = selezione.slice(i, apre).split(',').pop()!.trim()
    const nome = prima.replace(/!inner|!left/g, '').trim()
    if (nome) {
      const [alias, campo] = nome.includes(':') ? nome.split(':') : [undefined, undefined]
      out.push({ tabella: alias ?? nome, alias: alias ?? nome, campo, dentro })
    }
    i = j
  }
  return out
}

const singolare = (t: string) => ({
  corse: 'corsa', prenotazioni: 'prenotazione', fermate: 'fermata',
  profili: 'utente', veicoli: 'veicolo', serate: 'serata', posti: 'posto',
}[t] ?? t)

let contatore = 0
const id = () => `demo-${++contatore}`
const adesso = () => new Date().toISOString()

export function fintoClient(
  tabelle: Tabelle, funzioni: Record<string, (a: Riga) => unknown>,
) {
  return {
    from(tabella: string) {
      const q = new Interrogazione(tabelle, tabella)
      return Object.assign(q, {
        insert: (c: Riga | Riga[]) => new Interrogazione(tabelle, tabella, 'insert', c),
        upsert: (c: Riga | Riga[]) => new Interrogazione(tabelle, tabella, 'upsert', c),
        update: (c: Riga) => new Interrogazione(tabelle, tabella, 'update', c),
        delete: () => new Interrogazione(tabelle, tabella, 'delete'),
      })
    },
    rpc: async (nome: string, argomenti: Riga = {}) => {
      const f = funzioni[nome]
      if (!f) throw new Error(`funzione non prevista in modalità dimostrativa: ${nome}`)
      return { data: f(argomenti), error: null }
    },
  }
}
