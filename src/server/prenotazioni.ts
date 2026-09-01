import { db } from './db.ts'
import { autorizza } from './stripe.ts'
import {
  preventivo, autorizzazioneMassima, quotaApplicata,
  risparmioIncassoUnico,
  autorizzazioneAndataRitorno,
  ViolazioneConformita,
  type Corsa, type Passeggero,
} from '../lib/pricing.ts'
import type { Cents } from '../lib/money.ts'

/**
 * Creazione di una prenotazione.
 *
 * Questa funzione è l'UNICA via di scrittura sulle prenotazioni: le RLS non
 * espongono né insert né update agli utenti. Non è pignoleria — è che il
 * motore dei prezzi gira qui, e un client che potesse inserire importi
 * propri renderebbe decorativo tutto il resto.
 */

export class ErrorePrenotazione extends Error {
  readonly codice: string
  // Il campo si dichiara e si assegna a mano invece di usare la scorciatoia
  // `constructor(public …)`: Node esegue TypeScript togliendo i tipi, e
  // quella scorciatoia non è un tipo — è codice che sparirebbe. Senza
  // questo, nessun modulo del server è collaudabile.
  constructor(codice: string, msg: string) {
    super(msg)
    this.codice = codice
    this.name = 'ErrorePrenotazione'
  }
}

interface RigaCorsa {
  id: string
  conducente: string
  modalita: 'pubblica' | 'link' | 'privata'
  stato: string
  km_base: number
  pedaggio_cent: number
  parcheggio_cent: number
  posti_offerti: number
  sconto_cent: number
  prenota_immediata: boolean
  deviazioni_ritiro: boolean
  deviazioni_deposito: boolean
  ora_partenza: string
  /** il rientro collegato, se chi guida ne ha pubblicato uno */
  corsa_ritorno: string | null
  veicoli: { centesimi_per_km: number } | null
}

/** Ricompone la corsa nella forma che il motore dei prezzi si aspetta. */
function aCorsa(r: RigaCorsa, ritorno = false): Corsa {
  if (!r.veicoli) throw new ErrorePrenotazione('veicolo', 'corsa senza veicolo')
  return {
    modalita: r.modalita,
    kmBase: Number(r.km_base),
    centesimiPerKm: Number(r.veicoli.centesimi_per_km),
    pedaggio: r.pedaggio_cent,
    parcheggio: r.parcheggio_cent,
    postiOfferti: r.posti_offerti,
    scontoConducente: r.sconto_cent,
    ritorno,
  }
}

export interface RichiestaPrenotazione {
  corsaId: string
  passeggeroId: string
  /** fermata esistente a cui salire, oppure una deviazione proposta */
  fermataId?: string
  kmDeviazione?: number
  tipoDeviazione?: 'ritiro' | 'deposito'
  /** prenotazioni riservate insieme; ognuna paga comunque per sé */
  gruppo?: string
  messaggio?: string
  /**
   * L'autorizzazione copre anche un'altra tratta, in centesimi.
   *
   * Serve al saldo unico andata e ritorno: la carta si impegna una volta
   * sola, per la somma. Non è un importo scelto dal client — lo calcola
   * `prenotaAndataRitorno` con le stesse funzioni del motore.
   */
  autorizzatoForzato?: Cents
  /**
   * Questa prenotazione la salda un'ALTRA: nessun PaymentIntent proprio,
   * autorizzato a zero, e la riga punta a chi porta i soldi.
   */
  saldataDa?: string
}

export async function prenota(req: RichiestaPrenotazione) {
  const { data: riga, error } = await db
    .from('corse')
    .select('*, veicoli(centesimi_per_km)')
    .eq('id', req.corsaId)
    .single<RigaCorsa>()
  if (error || !riga) throw new ErrorePrenotazione('corsa',
      'questa corsa non esiste più: forse è stata annullata mentre la guardavi')

  if (!['pubblicata', 'confermata'].includes(riga.stato)) {
    throw new ErrorePrenotazione('stato', 'la corsa non accetta prenotazioni')
  }
  if (new Date(riga.ora_partenza) <= new Date()) {
    throw new ErrorePrenotazione('tardi', 'la corsa è già partita')
  }
  if (riga.conducente === req.passeggeroId) {
    throw new ErrorePrenotazione('conducente', 'non si prenota la propria corsa')
  }

  const kmDeviazione = req.kmDeviazione ?? 0
  // Ritiro e destinazione si concedono separatamente: chi ha tempo prima di
  // partire ma è di fretta all'arrivo apre solo il primo.
  if (kmDeviazione > 0) {
    const tipo = req.tipoDeviazione ?? 'ritiro'
    const ammessa = tipo === 'ritiro' ? riga.deviazioni_ritiro : riga.deviazioni_deposito
    if (!ammessa) {
      throw new ErrorePrenotazione('deviazioni', tipo === 'ritiro'
        ? 'questa corsa parte solo dal punto indicato'
        : 'questa corsa arriva solo alla destinazione indicata')
    }
  }

  // I compagni di viaggio già a bordo servono al motore: la deviazione si
  // divide con chi condivide la fermata, e la fee scende al crescere del gruppo.
  const { data: esistenti } = await db
    .from('prenotazioni')
    .select('passeggero, fermata, esente, fermate(km_incrementali)')
    .eq('corsa', req.corsaId)
    .not('stato', 'in', '("rifiutata","scaduta","annullata")')

  const bordo = esistenti ?? []
  if (bordo.length >= riga.posti_offerti) {
    throw new ErrorePrenotazione('pieno', 'non ci sono più posti')
  }
  if (bordo.some((b) => b.passeggero === req.passeggeroId)) {
    throw new ErrorePrenotazione('doppia', 'hai già una prenotazione su questa corsa')
  }

  const corsa = aCorsa(riga)
  const passeggeri: Passeggero[] = [
    ...bordo.map((b): Passeggero => ({
      id: b.passeggero,
      fermataId: b.fermata ?? undefined,
      kmDeviazione: Number((b.fermate as { km_incrementali?: number } | null)?.km_incrementali ?? 0),
      esente: b.esente ?? false,
    })),
    {
      id: req.passeggeroId,
      fermataId: req.fermataId,
      kmDeviazione,
    },
  ]

  // Il motore decide. Se la combinazione violasse le invarianti, solleva qui
  // e la prenotazione non nasce.
  let calcolo
  try {
    calcolo = preventivo(corsa, passeggeri)
  } catch (e) {
    if (e instanceof ViolazioneConformita) {
      throw new ErrorePrenotazione('conformita', e.message)
    }
    throw e
  }

  const mia = calcolo.quote.find((q) => q.passeggeroId === req.passeggeroId)!
  // Si autorizza lo scenario peggiore: passeggero solo a bordo, fee piena.
  /**
   * L'autorizzazione la decide il motore, sempre.
   *
   * `autorizzatoForzato` non è un importo che arriva dal client: è il
   * risultato di `autorizzazioneAndataRitorno`, che somma le due tratte E
   * fa rispettare la regola di conformità. Passarlo qui evita di avere due
   * posti dove si decide quanto impegnare su una carta.
   */
  const autorizzato: Cents = req.saldataDa
    ? 0
    : req.autorizzatoForzato ?? autorizzazioneMassima(corsa, passeggeri.at(-1)!)

  // Una proposta di deviazione non blocca il posto e non tocca la carta:
  // il posto resta prenotabile da altri finché il conducente non accetta.
  const richiedeApprovazione = kmDeviazione > 0 || !riga.prenota_immediata

  const { data: profiloPag } = await db
    .from('profili')
    .select('stripe_cliente_id, metodo_pagamento, foto_url')
    .eq('id', req.passeggeroId)
    .single()

  // Vale nei due sensi: chi guida sta facendo salire in macchina sua una
  // persona che non ha mai visto, e ha diritto di sapere che faccia ha.
  if (!profiloPag?.foto_url) {
    throw new ErrorePrenotazione('foto',
      'metti una tua foto prima di prenotare: chi guida deve sapere chi fa salire')
  }
  const metodo = profiloPag?.stripe_cliente_id && profiloPag.metodo_pagamento
    ? { cliente: profiloPag.stripe_cliente_id, metodo: profiloPag.metodo_pagamento }
    : null

  // Senza carta non si crea nemmeno una richiesta: il conducente che accetta
  // scoprirebbe solo allora che non c'è niente da addebitare.
  if (!metodo) throw new ErrorePrenotazione('carta', 'aggiungi un metodo di pagamento')

  const { data: pren, error: errIns } = await db
    .from('prenotazioni')
    .insert({
      corsa: req.corsaId,
      passeggero: req.passeggeroId,
      fermata: req.fermataId ?? null,
      gruppo: req.gruppo ?? null,
      quota_cent: mia.quota,
      deviazione_cent: mia.deviazione,
      fee_cent: mia.fee,
      totale_cent: mia.totale,
      autorizzato_cent: autorizzato,
      saldata_con: req.saldataDa ?? null,
      stato: richiedeApprovazione ? 'richiesta' : 'autorizzata',
      messaggio: req.messaggio ?? null,
      scade_il: richiedeApprovazione ? scadenzaProposta(riga.ora_partenza) : null,
    })
    .select()
    .single()

  if (errIns) throw new ErrorePrenotazione('db', errIns.message)

  // Chi è saldato da un'altra prenotazione non ha una carta da impegnare:
  // l'impegno l'ha già preso l'andata, per la somma delle due tratte.
  if (!richiedeApprovazione && !req.saldataDa) {
    // La carta è quella già salvata sul profilo: non si ripete l'inserimento
    // a ogni prenotazione. Se manca, la prenotazione non nasce — meglio un
    // errore adesso che una prenotazione che sembra valida e non lo è.
    if (!metodo) {
      await db.from('prenotazioni').delete().eq('id', pren.id)
      throw new ErrorePrenotazione('carta', 'aggiungi un metodo di pagamento')
    }
    const intent = await autorizza({
      importo: autorizzato,
      clienteId: metodo.cliente,
      metodoPagamento: metodo.metodo,
      prenotazioneId: pren.id,
      descrizione: `GO — passaggio del ${new Date(riga.ora_partenza).toLocaleDateString('it-IT')}`,
    })
    await db.from('prenotazioni')
      .update({ stripe_payment_intent: intent.id, autorizzata_il: new Date().toISOString() })
      .eq('id', pren.id)
  }

  return { prenotazione: pren, calcolo, autorizzato, richiedeApprovazione }
}

/**
 * Una proposta scade sei ore dopo, o dodici ore prima della partenza se
 * questa arriva prima. Il silenzio del conducente vale rifiuto: mai
 * accettazione implicita, o un conducente distratto si ritroverebbe in
 * macchina qualcuno che non ha scelto.
 */
export function scadenzaProposta(oraPartenza: string): string {
  const sei = Date.now() + 6 * 3600_000
  const dodiciPrima = new Date(oraPartenza).getTime() - 12 * 3600_000
  return new Date(Math.min(sei, dodiciPrima)).toISOString()
}

/** Quota che il passeggero vedrà, prima di prenotare. Non tocca nulla. */
export async function preventivaPer(corsaId: string): Promise<Cents | null> {
  const { data } = await db
    .from('corse')
    .select('*, veicoli(centesimi_per_km)')
    .eq('id', corsaId)
    .single<RigaCorsa>()
  return data ? quotaApplicata(aCorsa(data)) : null
}

/**
 * Andata e ritorno, un pagamento solo.
 *
 * La regola di conformità non è scritta qui: la fa rispettare
 * `autorizzazioneAndataRitorno`, che SOLLEVA un'eccezione se una delle due
 * tratte non è privata. Su una corsa pubblica il pagamento unico
 * prometterebbe un rientro che non possiamo garantire — il conducente
 * dell'andata può volersene andare prima, e il ritorno può essere di un
 * altro. Sarebbe la garanzia di rientro che abbiamo deciso di non dare,
 * reintrodotta di nascosto dal modo di pagare.
 *
 * Si chiama la funzione del motore invece di ricontrollare le modalità qui:
 * due copie della stessa regola divergono al primo ritocco, e quando
 * divergono nessuno se ne accorge.
 *
 * L'ordine conta. Si prenota PRIMA il ritorno, senza carta, poi l'andata
 * con l'autorizzazione che copre entrambe: se il posto al ritorno non c'è
 * più, non si è impegnato niente su nessuna carta. Il contrario lascerebbe
 * un'autorizzazione viva su un viaggio che non esiste.
 */
export async function prenotaAndataRitorno(req: RichiestaPrenotazione) {
  const carica = async (id: string) => {
    const { data } = await db
      .from('corse').select('*, veicoli(centesimi_per_km)').eq('id', id)
      .single<RigaCorsa>()
    return data
  }

  const rigaAndata = await carica(req.corsaId)
  if (!rigaAndata) throw new ErrorePrenotazione('corsa',
      'questa corsa non esiste più: forse è stata annullata mentre la guardavi')
  if (!rigaAndata.corsa_ritorno) {
    throw new ErrorePrenotazione('ritorno', 'questa corsa non ha un rientro collegato')
  }

  const rigaRitorno = await carica(rigaAndata.corsa_ritorno)
  if (!rigaRitorno) throw new ErrorePrenotazione('ritorno', 'il rientro non è più disponibile')

  /**
   * Qui si calcola E si vieta, in una riga sola.
   *
   * Se una delle due non è privata la funzione solleva
   * `ViolazioneConformita`, che la rotta traduce in un 409 con un messaggio
   * che si può leggere. Non serve un controllo in più: servirebbe solo a
   * poter divergere.
   */
  const passeggero = { id: req.passeggeroId, kmDeviazione: req.kmDeviazione ?? 0 }
  const autorizzato = autorizzazioneAndataRitorno([
    { corsa: aCorsa(rigaAndata), passeggero },
    { corsa: aCorsa(rigaRitorno), passeggero },
  ])

  // Prima il ritorno, e senza carta: se il posto non c'è più si scopre
  // adesso, quando non si è ancora impegnato niente su nessuna carta.
  const ritorno = await prenota({ ...req, corsaId: rigaAndata.corsa_ritorno })

  try {
    const andata = await prenota({ ...req, autorizzatoForzato: autorizzato })

    await db.from('prenotazioni')
      .update({ saldata_con: andata.prenotazione.id, autorizzato_cent: 0 })
      .eq('id', ritorno.prenotazione.id)

    return {
      andata, ritorno: ritorno.prenotazione,
      autorizzatoCent: autorizzato,
      risparmiatoCent: risparmioIncassoUnico(2),
    }
  } catch (e) {
    /**
     * Se l'andata non riesce, il ritorno da solo non ha senso: era stato
     * preso PER tornare. Si annulla, invece di lasciare mezza prenotazione
     * a qualcuno che non sa di averla.
     */
    await db.from('prenotazioni')
      .update({ stato: 'annullata' }).eq('id', ritorno.prenotazione.id)
    throw e
  }
}
