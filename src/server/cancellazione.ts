import { db, requireEnv } from './db.ts'

/**
 * Cancellare il proprio account.
 *
 * Il diritto esiste — art. 17 GDPR — e non c'era modo di esercitarlo: una
 * persona iscritta a GO oggi non poteva andarsene. Ma «cancellare» non
 * significa `delete from profili`, e il database lo dice da solo:
 * `liquidazioni` ha `on delete restrict`, perché una riga contabile deve
 * sopravvivere alla persona per obbligo fiscale.
 *
 * Il diritto alla cancellazione ha eccezioni, e una è esattamente questa:
 * l'obbligo legale di conservazione. Quindi si fa la cosa corretta invece
 * di quella semplice — si distingue fra tre categorie:
 *
 *   SPARISCE          quello che esiste solo per far funzionare il servizio:
 *                     messaggi, luoghi salvati, iscrizioni alle notifiche,
 *                     posizioni, richieste, appartenenze alle comitive.
 *
 *   SI SPERSONALIZZA  il profilo. Nome, cognome, foto, telefono, email, bio
 *                     e data di nascita se ne vanno; la riga resta, muta,
 *                     perché ci sono corse e pagamenti che la puntano.
 *
 *   RESTA             prenotazioni, corse e liquidazioni. Sono scritture
 *                     contabili, e dopo la spersonalizzazione non contengono
 *                     più un dato personale: contengono un identificativo
 *                     che non porta più a nessuno.
 *
 * Il risultato è che chi se ne va sparisce davvero dalla vista di chiunque,
 * e il registro dei soldi resta in piedi. È l'unico modo di rispettare
 * insieme due obblighi che sembrano contrari.
 */

export class ErroreCancellazione extends Error {
  codice: string
  constructor(codice: string, messaggio: string) {
    super(messaggio)
    this.name = 'ErroreCancellazione'
    this.codice = codice
  }
}

/**
 * Non si può sparire lasciando gente a piedi.
 *
 * Chi ha una corsa che parte domani con tre persone a bordo non può
 * cancellarsi e basta: quelle tre persone si presenterebbero a un punto di
 * ritrovo dove non arriva nessuno. Prima si disdice, poi si va via — e
 * glielo si dice chiaramente, invece di rifiutare con un errore generico.
 */
export async function impedimenti(utenteId: string): Promise<string[]> {
  const problemi: string[] = []
  const adesso = new Date().toISOString()

  const { data: corse } = await db
    .from('corse')
    .select('id, prenotazioni(id, stato)')
    .eq('conducente', utenteId)
    .in('stato', ['pubblicata', 'confermata', 'in_corso'])
    .gt('ora_partenza', adesso)

  const conGente = (corse ?? []).filter((c) =>
    ((c.prenotazioni ?? []) as Array<{ stato: string }>)
      .some((p) => ['richiesta', 'autorizzata'].includes(p.stato)))
  if (conGente.length > 0) {
    problemi.push(conGente.length === 1
      ? 'Hai una corsa in programma con qualcuno a bordo: annullala prima.'
      : `Hai ${conGente.length} corse in programma con qualcuno a bordo: annullale prima.`)
  }

  const { data: prenotazioni } = await db
    .from('prenotazioni')
    .select('id, corse!inner(ora_partenza)')
    .eq('passeggero', utenteId)
    .in('stato', ['richiesta', 'autorizzata'])
    .gt('corse.ora_partenza', adesso)
  if ((prenotazioni ?? []).length > 0) {
    problemi.push('Hai un posto prenotato su un viaggio che deve ancora partire: disdici prima.')
  }

  // Soldi maturati e non ancora liquidati: andarsene adesso vorrebbe dire
  // rinunciarci, e non è una cosa da far succedere per distrazione.
  const { data: daPagare } = await db
    .from('prenotazioni')
    .select('id, corse!inner(conducente)')
    .eq('corse.conducente', utenteId)
    .eq('stato', 'completata')
  if ((daPagare ?? []).length > 0) {
    problemi.push('Hai un importo maturato non ancora liquidato: aspetta il bonifico del lunedì.')
  }

  return problemi
}

export async function cancellaAccount(utenteId: string) {
  const blocchi = await impedimenti(utenteId)
  if (blocchi.length > 0) {
    throw new ErroreCancellazione('impedimenti', blocchi.join(' '))
  }

  /**
   * ── 1. Sparisce quello che esiste solo per il servizio ──────────────
   *
   * Ogni nome di colonna qui sotto è stato verificato contro il database
   * vero, e due erano sbagliati: `richieste_passaggio.utente` e
   * `posizioni_corsa.utente` non esistono — si chiamano `passeggero` e
   * `conducente`. Una `delete` con un filtro su una colonna inesistente
   * non fa rumore: non cancella e basta. Sarebbero rimasti lì dati
   * personali di qualcuno che aveva chiesto di sparire, e nessuno se ne
   * sarebbe accorto.
   */
  await Promise.all([
    db.from('messaggi').delete().eq('autore', utenteId),
    db.from('luoghi_salvati').delete().eq('utente', utenteId),
    db.from('push_iscrizioni').delete().eq('utente', utenteId),
    db.from('notifiche').delete().eq('destinatario', utenteId),
    db.from('richieste_passaggio').delete().eq('passeggero', utenteId),
    db.from('comitive_membri').delete().eq('persona', utenteId),
    db.from('non_guido').delete().eq('persona', utenteId),
    db.from('posizioni_corsa').delete().eq('conducente', utenteId),
  ])

  /**
   * Il testo delle recensioni che ha scritto se ne va; il giudizio resta.
   *
   * Il testo è suo e porta la sua voce. Il «sì, lo rifarei» invece è un
   * dato che riguarda un'ALTRA persona — la sua reputazione — e cancellarlo
   * significherebbe che chiunque può abbassare la reputazione di qualcuno
   * andandosene. Le due cose si separano.
   */
  await db.from('recensioni').update({ testo: null }).eq('autore', utenteId)

  // ── 2. Il profilo si spersonalizza ──────────────────────────────────
  // Il telefono è `not null unique`: serve un segnaposto, non un vuoto.
  await db.from('profili').update({
    nome: 'Utente',
    cognome: 'cancellato',
    foto_url: null,
    telefono: `cancellato:${utenteId}`,
    telefono_ok: false,
    email: null,
    email_ok: false,
    bio: null,
    data_nascita: null,
    sospeso: true,
  }).eq('id', utenteId)

  /**
   * Da ultimo l'accesso.
   *
   * In fondo e non in cima: se qualcosa fallisce a metà, meglio un account
   * che entra ancora ma è già svuotato, che un account irraggiungibile con
   * dentro dati che nessuno può più togliere.
   */
  const u = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const k = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
  const r = await fetch(`${u}/auth/v1/admin/users/${utenteId}`, {
    method: 'DELETE',
    headers: { apikey: k, authorization: `Bearer ${k}` },
  })
  if (!r.ok) {
    throw new ErroreCancellazione('accesso',
      'i tuoi dati sono stati rimossi, ma non siamo riusciti a chiudere '
      + "l'accesso. Scrivici e lo facciamo a mano.")
  }

  return { ok: true as const }
}
