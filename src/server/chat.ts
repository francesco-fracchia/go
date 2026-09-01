import { db } from './db.ts'
import { notifica } from './notifiche.ts'

/**
 * La chat di una corsa.
 *
 * Una conversazione per corsa, non per coppia: chi sale è un gruppo che
 * viaggia insieme, e sapere che ci sono altri tre a bordo è metà della
 * ragione per cui ci si fida a salire.
 *
 * Non si mandano notifiche a chi ha la chat aperta, e si aspetta qualche
 * secondo prima di avvisare: chi scrive tre righe di fila non deve far
 * vibrare tre volte il telefono degli altri.
 */

export const ATTESA_NOTIFICA_MS = 45_000

/**
 * Chi ha diritto di stare in questa conversazione.
 *
 * La regola esisteva già, ed era scritta bene: la politica «chat solo tra
 * chi condivide la corsa» sulla tabella `messaggi`. Solo che non veniva
 * mai attraversata — queste funzioni usano il client di servizio, che le
 * politiche le scavalca per definizione. La protezione era in un punto
 * che nessuna richiesta tocca.
 *
 * L'effetto, provato: un utente qualunque che conoscesse l'identificativo
 * di una corsa ne leggeva l'INTERA conversazione e ci scriveva dentro. Fra
 * due persone che si sono conosciute per quaranta minuti in macchina,
 * questa non è una svista di permessi: è la corrispondenza di qualcun
 * altro.
 *
 * Le condizioni qui sotto ricalcano la politica riga per riga, di
 * proposito. Due strati che dicono cose diverse sono peggio di uno solo:
 * si corregge quello sbagliato e si resta convinti di aver corretto.
 */
async function partecipa(corsaId: string, utenteId: string): Promise<boolean> {
  const [{ data: corsa }, { data: prenotazione }] = await Promise.all([
    db.from('corse').select('conducente').eq('id', corsaId).maybeSingle(),
    db.from('prenotazioni').select('id')
      .eq('corsa', corsaId).eq('passeggero', utenteId)
      .not('stato', 'in', '("rifiutata","scaduta")')
      .limit(1),
  ])
  if (!corsa) return false
  return corsa.conducente === utenteId || (prenotazione ?? []).length > 0
}

/**
 * Quale conversazione, e se questa persona ci appartiene.
 *
 * Su una corsa PRIVATA o con collegamento si parla in gruppo: un filo
 * solo, `passeggero` nullo. Chi viaggia insieme lì si conosce, e ogni
 * messaggio ha dei testimoni.
 *
 * Su una corsa PUBBLICA ogni passeggero parla con chi guida e basta. Il
 * filo lo identifica il passeggero — e non lo sceglie il client: se a
 * scrivere è un passeggero il filo è il suo, punto. Lasciarglielo passare
 * come parametro vorrebbe dire lasciargli leggere la conversazione di un
 * altro chiedendola per nome.
 */
export type Filo =
  | { ok: true; passeggero: string | null; gruppo: boolean }
  | { ok: false; motivo: 'estraneo' | 'quale' }

export async function filo(
  corsaId: string, utenteId: string, chiesto?: string | null,
): Promise<Filo> {
  const [{ data: corsa }, { data: prenotazione }] = await Promise.all([
    db.from('corse').select('conducente, modalita').eq('id', corsaId).maybeSingle(),
    db.from('prenotazioni').select('id')
      .eq('corsa', corsaId).eq('passeggero', utenteId)
      .not('stato', 'in', '("rifiutata","scaduta")')
      .limit(1),
  ])
  if (!corsa) return { ok: false, motivo: 'estraneo' }

  const guida = corsa.conducente === utenteId
  const sale = (prenotazione ?? []).length > 0
  if (!guida && !sale) return { ok: false, motivo: 'estraneo' }

  if (corsa.modalita !== 'pubblica') return { ok: true, passeggero: null, gruppo: true }

  if (!guida) return { ok: true, passeggero: utenteId, gruppo: false }

  if (!chiesto) return { ok: false, motivo: 'quale' }
  const { data: suo } = await db
    .from('prenotazioni').select('id')
    .eq('corsa', corsaId).eq('passeggero', chiesto)
    .not('stato', 'in', '("rifiutata","scaduta")')
    .limit(1)
  if ((suo ?? []).length === 0) return { ok: false, motivo: 'estraneo' }
  return { ok: true, passeggero: chiesto, gruppo: false }
}

export async function messaggi(
  corsaId: string, utenteId: string, con?: string | null,
) {
  // Un estraneo non riceve «non autorizzato», riceve il vuoto: sapere che
  // una conversazione ESISTE è già qualcosa che non gli riguarda.
  const f = await filo(corsaId, utenteId, con)
  if (!f.ok) return []

  const dove = <T extends { eq: Function; is: Function }>(q: T) =>
    (f.passeggero === null ? q.is('passeggero', null) : q.eq('passeggero', f.passeggero)) as T

  const { data } = await dove(db
    .from('messaggi')
    .select('id, autore, testo, creato_il, profili:autore(nome, foto_url)')
    .eq('corsa', corsaId))
    .order('creato_il', { ascending: true })
    .limit(200)

  await dove(db.from('messaggi')
    .update({ letto_il: new Date().toISOString() })
    .eq('corsa', corsaId))
    .neq('autore', utenteId)
    .is('letto_il', null)

  return data ?? []
}

/**
 * Per quanto si può scrivere dopo l'arrivo.
 *
 * Non zero: capita di aver lasciato una sciarpa in macchina, o di voler
 * dire grazie il giorno dopo. Ma non per sempre: una conversazione aperta
 * a tempo indeterminato fra due persone che si sono conosciute per
 * quaranta minuti diventa un canale che nessuno ha chiesto — e da cui non
 * si esce, perché non c'è un pulsante per uscirne.
 *
 * Due giorni coprono il caso vero e chiudono il resto.
 */
export const ORE_CHAT_DOPO_ARRIVO = 48

/**
 * Perché un messaggio non è partito.
 *
 * Prima `scrivi` restituiva `null` per qualunque ragione e la rotta
 * traduceva in «non inviato»: due parole che sembrano un guasto. Da quando
 * la chat si chiude due giorni dopo l'arrivo il caso è diventato normale —
 * si scrive a un compagno di viaggio della settimana scorsa — e ricevere
 * «non inviato» fa credere che l'applicazione sia rotta invece che chiusa.
 *
 * Un rifiuto che non dice perché costa un tentativo, poi un secondo, poi
 * la fiducia.
 */
export type EsitoScrittura =
  | { ok: true; messaggio: { id: string; testo: string; creato_il: string } }
  | { ok: false; motivo: 'vuoto' | 'lungo' | 'assente' | 'chiusa' | 'estraneo' | 'quale' }

export async function scrivi(
  corsaId: string, autoreId: string, testo: string, con?: string | null,
): Promise<EsitoScrittura> {
  const pulito = testo.trim()
  if (!pulito) return { ok: false, motivo: 'vuoto' }
  if (pulito.length > 2000) return { ok: false, motivo: 'lungo' }

  /**
   * La chat si chiude da sola, e si chiude sul SERVER.
   *
   * Nasconderla nell'interfaccia lascerebbe la rotta aperta a chiunque
   * conosca l'indirizzo, che su un canale fra sconosciuti non è un
   * dettaglio.
   */
  const { data: corsa } = await db
    .from('corse').select('ora_arrivo, stato').eq('id', corsaId).single()
  if (!corsa) return { ok: false, motivo: 'assente' }

  const f = await filo(corsaId, autoreId, con)
  if (!f.ok) return { ok: false, motivo: f.motivo === 'quale' ? 'quale' : 'estraneo' }

  const finita = ['conclusa', 'annullata', 'scaduta'].includes(corsa.stato)
  const oreDaArrivo = (Date.now() - new Date(corsa.ora_arrivo).getTime()) / 3600_000
  if (finita && oreDaArrivo > ORE_CHAT_DOPO_ARRIVO) return { ok: false, motivo: 'chiusa' }

  const { data, error } = await db.from('messaggi')
    .insert({ corsa: corsaId, autore: autoreId, testo: pulito, passeggero: f.passeggero })
    .select('id, testo, creato_il')
    .single()
  // A questo punto chi scrive è già stato riconosciuto: un errore qui è un
  // guasto, non un rifiuto. Restava scritto che a fermarlo fosse la
  // politica sulla tabella — che con il client di servizio non interviene
  // mai, ed è il motivo per cui questo controllo mancava del tutto.
  if (error || !data) return { ok: false, motivo: 'assente' }

  await avvisaGliAltri(corsaId, autoreId, pulito, f.passeggero)
  return { ok: true, messaggio: data }
}

/**
 * Chi va avvisato dipende da CHI STA IN QUESTA CONVERSAZIONE.
 *
 * Su una corsa di gruppo sono tutti; su una pubblica sono due, e mandare
 * la notifica a tutti i passeggeri direbbe a Bea che Ciro ha scritto
 * qualcosa al conducente — cioè esattamente la cosa che separare le
 * conversazioni serve a non fare.
 */
async function avvisaGliAltri(
  corsaId: string, autoreId: string, testo: string, passeggero: string | null,
) {
  const [{ data: corsa }, { data: prenotazioni }, { data: autore }] = await Promise.all([
    db.from('corse').select('conducente, destinazione_label').eq('id', corsaId).single(),
    db.from('prenotazioni').select('passeggero')
      .eq('corsa', corsaId)
      .not('stato', 'in', '("rifiutata","scaduta","annullata")'),
    db.from('profili').select('nome').eq('id', autoreId).single(),
  ])

  const destinatari = new Set<string>()
  if (corsa?.conducente) destinatari.add(corsa.conducente)
  if (passeggero === null) {
    for (const p of prenotazioni ?? []) destinatari.add(p.passeggero)
  } else {
    destinatari.add(passeggero)
  }
  destinatari.delete(autoreId)

  // La chiave cambia ogni cinque minuti: due messaggi ravvicinati generano
  // una notifica sola, uno un'ora dopo ne genera un'altra.
  const finestra = Math.floor(Date.now() / 300_000)
  const quale = passeggero ?? 'gruppo'

  for (const d of destinatari) {
    await notifica({
      destinatario: d,
      tipo: 'proposta_ricevuta',
      titolo: autore?.nome ?? 'Nuovo messaggio',
      testo: testo.length > 90 ? testo.slice(0, 88) + '…' : testo,
      url: `/chat/${corsaId}`,
      corsa: corsaId,
      chiave: `chat:${corsaId}:${quale}:${d}:${finestra}`,
    })
  }
}
