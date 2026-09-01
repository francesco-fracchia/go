import { db } from './db.ts'
import { disdiciPasseggero } from './annullamenti.ts'
import { notifica } from './notifiche.ts'

/**
 * Le segnalazioni.
 *
 * La tabella esisteva dal primo giorno e non aveva un solo scrittore: le
 * accuse gravi vivevano fra le ETICHETTE DELLE RECENSIONI, accanto a
 * «simpatico». «Aveva bevuto» era un tag pubblico.
 *
 * Il difetto non era la gravità: era che lì dentro quell'informazione non
 * fa NIENTE. Un'etichetta è una decorazione su un profilo — se uno ha
 * davvero guidato ubriaco l'esito giusto non è una parola accanto alla sua
 * faccia, è che smetta di guidare. Le recensioni non hanno un'istruttoria,
 * un esito o una sospensione; questa tabella sì, e le colonne per farlo
 * c'erano già: `esito`, `chiusa_il`.
 *
 * Le tre differenze che contano rispetto a un tag:
 *
 *  · non è pubblicata. Il danno di un'accusa falsa sta nella pubblicazione,
 *    e qui prima la legge una persona.
 *  · c'è un accusato che può rispondere. Gli si dice cosa e quando, mai da
 *    chi, e la sua risposta si registra.
 *  · lascia una traccia su CHI SEGNALA. Chi accusa tre conducenti diversi,
 *    o lo fa sempre dopo un rifiuto, diventa lui il segnale — cosa che con
 *    un tag anonimo non si vede.
 */

export type TipoSegnalazione = 'alcol' | 'noshow' | 'molestia' | 'guida_pericolosa' | 'altro'

/**
 * Le segnalazioni che permettono di scendere senza pagare.
 *
 * Nel momento in cui uno sta per salire con chi ha bevuto, la risposta
 * giusta dell'applicazione non è raccogliere un'accusa: è non farlo salire.
 * Una penale lì è un pedaggio per mettersi in salvo.
 */
export const GRAVI: TipoSegnalazione[] = ['alcol', 'molestia', 'guida_pericolosa']

/**
 * Quante segnalazioni INDIPENDENTI fermano un account.
 *
 * Indipendenti vuol dire: persone diverse, corse diverse. È l'unico
 * surrogato di verità disponibile — non esiste un etilometro
 * nell'applicazione, e non esisterà. Mettersi d'accordo si può, ma costa;
 * una persona con un rancore è una persona sola.
 *
 * E si ferma, non si chiude: la sospensione è cautelare e reversibile, la
 * chiusura arriva solo dopo che qualcuno ha guardato e ha sentito tutti e
 * due. Un'istruttoria a senso unico è indifendibile davanti alla prima
 * persona a cui la devi spiegare, cioè quella che stai per escludere.
 */
export const SOGLIA_SOSPENSIONE = 2

export interface EsitoSegnalazione {
  ok: boolean
  errore?: string
  /** se la segnalazione ha fatto scattare la sospensione cautelare */
  sospeso?: boolean
  /** se chi ha segnalato è sceso senza pagare */
  disdettaSenzaPenale?: boolean
  rimborsatoCent?: number
}

export async function segnala(opts: {
  autoreId: string
  prenotazioneId: string
  tipo: TipoSegnalazione
  nota?: string
  /** «Non salgo / scendo»: disdice la prenotazione senza penale. */
  ritirati?: boolean
}): Promise<EsitoSegnalazione> {
  const { data: p } = await db
    .from('prenotazioni')
    .select('id, passeggero, stato, corse!inner(id, conducente)')
    .eq('id', opts.prenotazioneId)
    .single()
  if (!p) return { ok: false, errore: 'non troviamo questo viaggio fra i tuoi' }

  const c = p.corse as unknown as { id: string; conducente: string }
  const passeggero = p.passeggero === opts.autoreId
  const conducente = c.conducente === opts.autoreId
  if (!passeggero && !conducente) {
    return { ok: false, errore: 'non hai viaggiato su questa corsa' }
  }

  // Si segnala l'altra parte, sempre. Non esiste una segnalazione senza
  // un destinatario: sarebbe un reclamo, che è un'altra cosa.
  const accusato = passeggero ? c.conducente : p.passeggero

  const { error } = await db.from('segnalazioni').insert({
    autore: opts.autoreId,
    prenotazione: p.id,
    corsa: c.id,
    tipo: opts.tipo,
    nota: opts.nota?.trim() || null,
  })
  if (error) return { ok: false, errore: error.message }

  const esito: EsitoSegnalazione = { ok: true }

  // ── Prima si mette in salvo chi segnala, poi si indaga ──────────────
  if (opts.ritirati && passeggero && GRAVI.includes(opts.tipo)) {
    const d = await disdiciPasseggero(p.id, opts.autoreId, { senzaPenale: true })
    esito.disdettaSenzaPenale = d.ok
    esito.rimborsatoCent = d.ok ? d.rimborsatoCent : undefined
  }

  esito.sospeso = await valutaSospensione(accusato, opts.tipo)
  return esito
}

/**
 * Conta le segnalazioni indipendenti e, se sono abbastanza, ferma l'account.
 *
 * «Indipendenti» si misura sulle CORSE e sugli AUTORI distinti, non sulle
 * righe: dieci segnalazioni della stessa persona sulla stessa corsa sono
 * una persona arrabbiata, non dieci testimoni.
 */
export async function valutaSospensione(
  accusato: string, tipo: TipoSegnalazione,
): Promise<boolean> {
  if (!GRAVI.includes(tipo)) return false

  const { data } = await db
    .from('segnalazioni')
    .select('autore, corsa, prenotazioni!inner(passeggero, corse!inner(conducente))')
    .eq('tipo', tipo)
    .is('chiusa_il', null)

  const righe = (data ?? []) as unknown as Array<{
    autore: string; corsa: string | null
    prenotazioni: { passeggero: string; corse: { conducente: string } }
  }>

  const contro = righe.filter((r) =>
    r.prenotazioni.corse.conducente === accusato || r.prenotazioni.passeggero === accusato)

  const autori = new Set(contro.map((r) => r.autore))
  const corse = new Set(contro.map((r) => r.corsa))
  if (autori.size < SOGLIA_SOSPENSIONE || corse.size < SOGLIA_SOSPENSIONE) return false

  await db.from('profili').update({ sospeso: true }).eq('id', accusato)

  /**
   * L'accusato viene avvisato, e non viene lasciato al buio.
   *
   * Non gli si dice CHI ha segnalato — sarebbe consegnargli la persona che
   * si è messa in salvo. Gli si dice cosa e quando, e che può rispondere:
   * senza questo la sospensione è una porta chiusa senza campanello.
   */
  await notifica({
    destinatario: accusato,
    tipo: 'account_sospeso',
    titolo: 'Il tuo account è sospeso',
    testo: 'Abbiamo ricevuto due segnalazioni su corse diverse. Nessuna '
      + 'decisione è definitiva: guardiamo cos\'è successo e ti chiediamo la '
      + 'tua versione prima di decidere.',
    url: '/legale/contatto',
    chiave: `sospensione:${accusato}`,
  })
  return true
}
