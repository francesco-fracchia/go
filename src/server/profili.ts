import { db } from './db.ts'

/**
 * Profili e onboarding.
 *
 * Si chiede il minimo indispensabile per partire, e il resto solo quando
 * serve davvero:
 *
 *   per cercare     telefono verificato
 *   per prenotare   nome e cognome
 *   per pubblicare  veicolo + dichiarazione di privato
 *   per incassare   conto Stripe — e si chiede quando i soldi ci sono già
 *
 * Chiedere tutto all'inizio è il modo più affidabile di non avere utenti.
 * Il documento non lo chiediamo mai: lo verifica Stripe gratis su chi
 * incassa, ed è lì che serve.
 */

export class ErroreProfilo extends Error {
  readonly codice: string
  // Il campo si dichiara e si assegna a mano invece di usare la scorciatoia
  // `constructor(public …)`: Node esegue TypeScript togliendo i tipi, e
  // quella scorciatoia non è un tipo — è codice che sparirebbe. Senza
  // questo, nessun modulo del server è collaudabile.
  constructor(codice: string, msg: string) {
    super(msg)
    this.codice = codice; this.name = 'ErroreProfilo'
  }
}

export interface Registrazione {
  id: string
  /** assente quando si entra con l'email: si chiederà dove serve */
  telefono?: string
  nome: string
  cognome: string
  email?: string
  dataNascita?: string
}

export async function creaProfilo(r: Registrazione) {
  if (r.nome.trim().length < 2) throw new ErroreProfilo('nome', 'manca il nome')
  if (r.cognome.trim().length < 2) throw new ErroreProfilo('cognome', 'manca il cognome')

  /**
   * Solo maggiorenni, e adesso la data si chiede davvero.
   *
   * Il controllo era scritto qui E nel database, in tutte e due i posti
   * nella forma «se c'è la data, allora dev'essere maggiorenne». La data
   * non veniva chiesta da nessuna parte: tutti i profili in produzione
   * l'avevano vuota, e un cancello che si apre da solo quando manca la
   * chiave non è un cancello.
   *
   * Il vincolo nel database resta com'è — accetta il nullo — perché i
   * profili nati prima di questa riga ce l'hanno vuoto e un vincolo che
   * rifiuta di aggiornarli li congelerebbe. Qui invece non si passa.
   */
  if (!r.dataNascita) {
    throw new ErroreProfilo('nascita', 'manca la data di nascita')
  }
  const anni = eta(r.dataNascita)
  if (!Number.isFinite(anni) || anni > 120) {
    throw new ErroreProfilo('nascita', 'questa data non sembra giusta')
  }
  if (anni < 18) {
    throw new ErroreProfilo('minorenne',
      'per ora GO è riservato ai maggiorenni')
  }

  const { data, error } = await db.from('profili').insert({
    id: r.id,
    // Il numero c'è solo se la verifica via SMS è andata a buon fine: è
    // quello che gli altri leggono per decidere se fidarsi, e non si
    // mette a mano.
    telefono: r.telefono ?? null,
    telefono_ok: !!r.telefono,
    email: r.email ?? null,
    email_ok: !!r.email,
    nome: r.nome.trim(),
    cognome: r.cognome.trim(),
    data_nascita: r.dataNascita,
  }).select().single()

  if (error) {
    if (error.code === '23505') throw new ErroreProfilo('esiste', 'numero già registrato')
    if (error.message.includes('maggiorenne')) {
      throw new ErroreProfilo('minorenne', 'per ora GO è riservato ai maggiorenni')
    }
    throw new ErroreProfilo('db', error.message)
  }
  return data
}

/**
 * La dichiarazione di non professionalità.
 *
 * Si raccoglie alla prima pubblicazione, non alla registrazione: chiederla
 * a chi sta solo cercando un passaggio non ha senso, e allunga un modulo
 * che deve restare corto.
 *
 * È l'artefatto con cui si documenta, utente per utente, la natura tra
 * privati del rapporto. Va riproposta ogni anno.
 */
export async function dichiaraPrivato(utenteId: string) {
  const { error } = await db.from('profili').update({
    dichiarazione_privato: true,
    dichiarazione_il: new Date().toISOString(),
  }).eq('id', utenteId)
  if (error) throw new ErroreProfilo('db', error.message)
}

export { TESTO_DICHIARAZIONE } from '../components/testi.ts'

export interface NuovoVeicolo {
  proprietario: string
  marca: string
  modello: string
  fascia: string
  alimentazione: string
  targa: string
  colore?: string
  postiTotali: number
  fumo?: boolean
  animali?: boolean
  bagagli?: 'nessuno' | 'piccoli' | 'medi' | 'grandi'
  /**
   * Il modello sulle tabelle ACI, se chi registra l'auto l'ha trovato.
   *
   * È quello che decide il costo al chilometro, e quindi la quota di ogni
   * passeggero. Senza, il calcolo ripiega sul MINIMO della tabella per
   * quell'alimentazione — l'auto più economica d'Italia — che sottostima
   * sempre: chi guida rientra di meno di quanto gli spetta, e la frase che
   * diciamo ovunque, «sul modello esatto della tua auto», diventa falsa.
   */
  aciModello?: string
  /** litri per 100 km, dichiarati. Facoltativo. */
  consumoL100?: number | null
}

/**
 * Registrazione di un veicolo.
 *
 * Il costo chilometrico NON si passa e non si può passare: lo risolve un
 * trigger dalla tabella ACI. Anche mandandolo, il database lo sovrascrive.
 */
export async function creaVeicolo(v: NuovoVeicolo) {
  const targa = v.targa.toUpperCase().replace(/\s/g, '')
  if (!/^[A-Z0-9]{5,8}$/.test(targa)) {
    throw new ErroreProfilo('targa', 'targa non valida')
  }
  if (v.postiTotali < 2 || v.postiTotali > 9) {
    throw new ErroreProfilo('posti', 'numero di posti non valido')
  }

  const { data, error } = await db.from('veicoli').insert({
    proprietario: v.proprietario,
    marca: v.marca.trim(),
    modello: v.modello.trim(),
    fascia: v.fascia,
    alimentazione: v.alimentazione,
    targa,
    colore: v.colore ?? null,
    posti_totali: v.postiTotali,
    fumo: v.fumo ?? false,
    animali: v.animali ?? false,
    bagagli: v.bagagli ?? 'medi',
    aci_modello: v.aciModello ?? null,
    /**
     * Facoltativo, e nullo se non ha senso.
     *
     * Serve solo a chi vuole farsi rimborsare il solo carburante su una
     * corsa fra amici. Senza, si usa il consumo tipico dell'alimentazione
     * — che è una stima onesta, non un ripiego silenzioso.
     */
    consumo_l100: (Number.isFinite(Number(v.consumoL100))
      && Number(v.consumoL100) > 1 && Number(v.consumoL100) < 40)
      ? Number(v.consumoL100) : null,
  }).select('*, id').single()

  if (error) throw new ErroreProfilo('db', error.message)
  return data
}

/**
 * Se la verifica via SMS è disponibile.
 *
 * Finché non c'è un fornitore configurato non si può PRETENDERE un numero
 * verificato: si chiederebbe una cosa impossibile, e chi prova il prodotto
 * resta bloccato davanti a un messaggio rosso senza uscita.
 *
 * Il numero però si chiede lo stesso — serve alle chiamate mascherate e a
 * essere raggiungibili. Semplicemente risulta non verificato, e il profilo
 * lo dice.
 */
export const SMS_DISPONIBILE = process.env.SMS_ATTIVO === '1'

export type Quanto = 'volentieri' | 'dipende' | 'poco'

export interface Preferenze {
  chiacchiere: Quanto
  musica: Quanto
  soste: boolean
}

/**
 * Le preferenze di chi guida, non della macchina.
 *
 * Chiacchiere, musica e soste appartengono alla persona: cambiare auto non
 * le cambia. Tenerle sul veicolo significava chiederle di nuovo a ogni auto
 * aggiunta, e ritrovarsi due risposte diverse alla stessa domanda.
 */
export async function salvaPreferenze(utenteId: string, p: Partial<Preferenze>) {
  const patch: Record<string, unknown> = {}
  if (p.chiacchiere) patch.chiacchiere = p.chiacchiere
  if (p.musica) patch.musica = p.musica
  if (typeof p.soste === 'boolean') patch.soste = p.soste
  if (Object.keys(patch).length === 0) return
  await db.from('profili').update(patch).eq('id', utenteId)
}

/**
 * Aggiunge o cambia il numero di telefono.
 *
 * Con l'SMS attivo il numero entra come NON verificato e la verifica
 * avviene a parte; senza, resta non verificato e basta. In nessuno dei due
 * casi lo si segna verificato da qui: quella spunta la legge chi decide se
 * salire in macchina con te, e non si mette a mano.
 */
export async function salvaTelefono(utenteId: string, numero: string) {
  const pulito = numero.replace(/[\s.\-()]/g, '')
  const completo = pulito.startsWith('+') ? pulito : `+39${pulito}`
  if (!/^\+\d{10,15}$/.test(completo)) {
    throw new ErroreProfilo('telefono', 'numero non valido')
  }

  const { error } = await db.from('profili')
    .update({ telefono: completo, telefono_ok: false })
    .eq('id', utenteId)

  if (error) {
    if (error.code === '23505') {
      throw new ErroreProfilo('telefono', 'questo numero è già di un altro account')
    }
    throw new ErroreProfilo('db', error.message)
  }
  return completo
}

export async function profilo(id: string) {
  const { data } = await db
    .from('profili')
    .select('*, veicoli(*)')
    .eq('id', id)
    .single()
  return data
}

/** I distintivi ricavati dal comportamento, non dalle opinioni. */
export async function distintivi(utenteId: string) {
  const { data } = await db
    .from('distintivi_conducenti')
    .select('*')
    .eq('conducente', utenteId)
    .maybeSingle()

  if (!data) return { etichette: [], corseConcluse: 0 }

  const etichette: string[] = []
  if (data.mai_annullato) etichette.push('non annulla mai')
  if (data.veterano) etichette.push('veterano')
  else if (data.affidabile) etichette.push('affidabile')
  else if (data.conducente_avviato) etichette.push('già avviato')

  return { etichette, corseConcluse: data.concluse ?? 0 }
}

const eta = (nascita: string) => {
  const d = new Date(nascita)
  const oggi = new Date()
  let a = oggi.getFullYear() - d.getFullYear()
  const m = oggi.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && oggi.getDate() < d.getDate())) a--
  return a
}
