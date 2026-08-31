import { db } from './db.ts'
import { posizioneDi, type Posizione } from './posizione.ts'

/**
 * «Ti mando il link.»
 *
 * È la differenza fra la frase che una persona dice a sua madre uscendo —
 * «esco con uno che ho trovato su un'applicazione» — e quella che vorremmo
 * dicesse. È la stessa serata: cambia solo se qualcuno fuori sa dove sei.
 *
 * Tre scelte che la distinguono da un tracciamento, e che vanno tenute:
 *
 *  · lo apre CHI VIAGGIA, e lo manda a CHI VUOLE. Non è una funzione che
 *    qualcun altro attiva su di te.
 *  · chi lo riceve non è nessuno: nessun account, nessuna installazione, e
 *    vede solo QUESTO viaggio.
 *  · muore. Dodici ore dopo l'arrivo l'indirizzo smette di rispondere. Un
 *    collegamento che resta vivo per sempre non è una condivisione: è una
 *    cimice che ti sei messo in tasca da solo.
 */

export interface Viaggio {
  passeggero: string
  conducente: string
  conducenteFoto: string | null
  auto: string
  targa: string
  origine: string
  destinazione: string
  oraPartenza: string
  oraArrivo: string
  stato: string
  posizione: Posizione | null
}

const token = () => crypto.randomUUID().replace(/-/g, '').slice(0, 16)

/**
 * Il collegamento si crea una volta e resta lo stesso.
 *
 * Rigenerarlo a ogni tocco vorrebbe dire che il messaggio mandato ieri sera
 * non funziona più stasera — e chi l'ha ricevuto se ne accorge nel momento
 * peggiore, cioè quando prova ad aprirlo perché è preoccupato.
 */
export async function collegamentoScorta(
  prenotazioneId: string, passeggeroId: string,
): Promise<string | null> {
  const { data } = await db
    .from('prenotazioni')
    .select('id, token_scorta, stato')
    .eq('id', prenotazioneId)
    .eq('passeggero', passeggeroId)
    .maybeSingle()
  if (!data) return null
  if (data.token_scorta) return data.token_scorta

  const nuovo = token()
  const { error } = await db.from('prenotazioni')
    .update({ token_scorta: nuovo }).eq('id', data.id)
  return error ? null : nuovo
}

export async function viaggioDaToken(t: string): Promise<Viaggio | null> {
  const { data } = await db.rpc('viaggio_da_token', { p_token: t })
  const r = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | undefined
  if (!r) return null

  /**
   * La posizione si mostra SOLO mentre si sta viaggiando.
   *
   * Prima della partenza non c'è niente da seguire, e dopo l'arrivo mostrare
   * l'ultimo punto noto vorrebbe dire dire a un estraneo dove abita chi è
   * appena sceso. È la stessa ragione per cui il punto scade da solo dopo
   * cinque minuti: un dato vecchio mostrato come fresco è peggio di nessun
   * dato.
   */
  const inViaggio = r.stato === 'in_corso'
  const posizione = inViaggio ? await posizioneDi(String(r.corsa)) : null

  return {
    passeggero: String(r.passeggero_nome),
    conducente: String(r.conducente_nome),
    conducenteFoto: (r.conducente_foto as string) ?? null,
    auto: String(r.auto),
    targa: String(r.targa ?? ''),
    origine: String(r.origine),
    destinazione: String(r.destinazione),
    oraPartenza: String(r.ora_partenza),
    oraArrivo: String(r.ora_arrivo),
    stato: String(r.stato),
    posizione,
  }
}
