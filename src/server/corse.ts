import { db } from './db.ts'
import { percorso, type Punto } from './percorsi.ts'
import { risolvi } from './luoghi.ts'
import { SMS_DISPONIBILE, dichiaraPrivato } from './profili.ts'
import {
  quotaPiena, costoBase, preventivo, scontoPerLivello,
  type Corsa, type Modalita, type LivelloRimborso,
} from '../lib/pricing.ts'
import type { Cents } from '../lib/money.ts'

export class ErroreCorsa extends Error {
  readonly codice: string
  // Il campo si dichiara e si assegna a mano invece di usare la scorciatoia
  // `constructor(public …)`: Node esegue TypeScript togliendo i tipi, e
  // quella scorciatoia non è un tipo — è codice che sparirebbe. Senza
  // questo, nessun modulo del server è collaudabile.
  constructor(codice: string, msg: string) {
    super(msg)
    this.codice = codice
    this.name = 'ErroreCorsa'
  }
}

export interface RichiestaPubblicazione {
  conducenteId: string
  veicoloId: string
  origine: { label: string; lat?: number; lng?: number }
  destinazione: { label: string; lat?: number; lng?: number }
  /**
   * L'ancora è l'ORA DI ARRIVO. Chi pubblica sa a che ora vuole essere lì,
   * non a che ora deve uscire di casa: la partenza la calcoliamo noi dal
   * percorso. Chiedere l'ora di partenza sposta su di lui un calcolo che
   * possiamo fare meglio, e produce orari sbagliati.
   */
  oraArrivo: Date
  postiOfferti: number
  modalita?: Modalita
  prenotaImmediata?: boolean
  deviazioniRitiro?: boolean
  deviazioniDeposito?: boolean
  maxPostiDietro?: number
  pedaggio?: Cents
  parcheggio?: Cents
  scontoCent?: Cents
  /**
   * Quanto vuole rientrare chi guida, su una corsa fra amici.
   *
   * Arriva come NOME, mai come importo: il client non scrive euro. È la
   * stessa regola di `centesimi_per_km` — l'importo lo calcola il motore,
   * qui, dove i chilometri e il costo dell'auto esistono davvero. Un
   * livello mandato su una corsa pubblica non fa niente, per costruzione.
   */
  livelloRimborso?: LivelloRimborso
  politica?: 'flessibile' | 'rigida'
  note?: string
  /**
   * Ora di ritorno. Se c'è, si pubblica anche la corsa inversa e le due si
   * collegano. Nel caso notturno il ritorno è il vero problema: chi cerca
   * un passaggio per andare a ballare sa già che tornerà, e una corsa
   * pubblicata solo in andata lo lascia a metà.
   */
  oraRitorno?: Date
  /** tolleranza sull'ora di arrivo, in minuti — vale solo per la ricerca */
  flessibilitaMin?: number
  /**
   * La dichiarazione di non professionalità, spuntata in questo momento.
   *
   * Viaggia con la pubblicazione e non a parte: è la spunta stessa a essere
   * l'atto, e registrarla con una chiamata separata vorrebbe dire poterla
   * avere registrata su un profilo che poi non pubblica — o, peggio, una
   * pubblicazione andata a buon fine senza che la dichiarazione sia stata
   * salvata.
   */
  dichiarazione?: boolean
}

/** Margine sull'orario: meglio arrivare presto che tardi, di notte. */
const MARGINE_MINUTI = 10

export async function pubblicaCorsa(req: RichiestaPubblicazione) {
  const { data: profilo } = await db
    .from('profili')
    .select('dichiarazione_privato, sospeso, limitato, telefono, telefono_ok, foto_url')
    .eq('id', req.conducenteId)
    .single()

  if (!profilo) throw new ErroreCorsa('profilo', 'profilo non trovato')
  if (profilo.sospeso) throw new ErroreCorsa('sospeso', 'account sospeso')
  /**
   * Un numero serve: chi sale deve poter chiamare, e la chiamata passa da
   * un numero mascherato che ha bisogno del vero sotto.
   *
   * La VERIFICA si pretende solo quando siamo in grado di farla. Chiederla
   * senza un fornitore di SMS configurato significa bloccare tutti davanti
   * a una porta che non si apre.
   */
  if (!profilo.telefono) {
    throw new ErroreCorsa('telefono', 'aggiungi il tuo numero: chi sale deve poterti chiamare')
  }
  /**
   * La foto si pretende QUI, non alla registrazione.
   *
   * Chiederla per iscriversi fa abbandonare chi sta solo guardando; chiederla
   * per far salire uno sconosciuto in macchina sua è una richiesta che si
   * capisce da sola. È lo stesso principio del conto Stripe: si chiede
   * quando la ragione è evidente, non prima.
   *
   * E vale per tutti e due i lati — chi sale non deve riconoscere una
   * silhouette al buio, e chi guida nemmeno.
   */
  if (!profilo.foto_url) {
    throw new ErroreCorsa('foto',
      'metti una tua foto prima di pubblicare: chi sale deve riconoscerti al punto di ritrovo')
  }
  if (SMS_DISPONIBILE && !profilo.telefono_ok) {
    throw new ErroreCorsa('telefono', 'verifica il tuo numero prima di pubblicare')
  }
  /**
   * La dichiarazione di non professionalità si raccoglie qui, alla prima
   * pubblicazione: è l'artefatto con cui si documenta, utente per utente,
   * la natura tra privati del rapporto.
   *
   * Va REGISTRATA, non solo pretesa. Prima la si chiedeva al modulo e la si
   * verificava sul profilo, ma niente scriveva mai quel campo: la spunta
   * restava nel browser, il profilo restava a `false`, e la pubblicazione
   * veniva rifiutata a chiunque avesse appena dichiarato. La casella era
   * decorativa e la corsa non partiva mai.
   *
   * Si scrive PRIMA di creare la corsa, di proposito: se la scrittura non
   * riesce non deve esistere una corsa pubblicata senza la dichiarazione
   * che la giustifica — è l'unico documento che dice perché quel passaggio
   * non è un trasporto abusivo.
   */
  if (!profilo.dichiarazione_privato) {
    if (req.dichiarazione !== true) {
      throw new ErroreCorsa('dichiarazione', 'manca la dichiarazione di privato')
    }
    await dichiaraPrivato(req.conducenteId)
  }
  // Un account si limita caso per caso, su un giudizio: mai su un contatore.
  // La frequenza da sola non dice nulla — chi fa la stessa tratta ogni
  // giorno per lavoro è l'utente migliore, non un trasportatore abusivo.
  if (profilo.limitato) {
    throw new ErroreCorsa('limitato',
      'la pubblicazione è sospesa sul tuo account: scrivici per capire perché')
  }

  const { data: veicolo } = await db
    .from('veicoli')
    .select('id, posti_totali, centesimi_per_km, alimentazione, consumo_l100, attivo')
    .eq('id', req.veicoloId)
    .eq('proprietario', req.conducenteId)
    .single()
  if (!veicolo || !veicolo.attivo) throw new ErroreCorsa('veicolo', 'veicolo non valido')
  if (req.postiOfferti > veicolo.posti_totali - 1) {
    throw new ErroreCorsa('posti',
      `il veicolo ha ${veicolo.posti_totali - 1} posti passeggero`)
  }

  // Se il client manda solo l'etichetta si risolve qui: un indirizzo senza
  // coordinate non produce un percorso, e senza percorso non c'è prezzo.
  const origine = await conCoordinate(req.origine)
  const destinazione = await conCoordinate(req.destinazione)
  if (!origine || !destinazione) {
    throw new ErroreCorsa('luogo', 'non troviamo uno dei due indirizzi')
  }

  const tracciato = await percorso([origine, destinazione])
  const oraPartenza = new Date(
    req.oraArrivo.getTime() - (tracciato.minuti + MARGINE_MINUTI) * 60_000,
  )
  if (oraPartenza <= new Date()) {
    throw new ErroreCorsa('tardi',
      'per arrivare a quell\'ora bisognerebbe essere già partiti')
  }

  const corsa: Corsa = {
    modalita: req.modalita ?? 'pubblica',
    kmBase: tracciato.km,
    centesimiPerKm: Number(veicolo.centesimi_per_km),
    pedaggio: req.pedaggio ?? 0,
    parcheggio: req.parcheggio ?? 0,
    postiOfferti: req.postiOfferti,
    scontoConducente: req.scontoCent ?? 0,
  }

  // Il livello vince sullo sconto grezzo se c'è: è l'unico dei due che
  // qualcuno può scegliere da un'interfaccia.
  if (req.livelloRimborso) {
    corsa.scontoConducente = scontoPerLivello(
      corsa, req.livelloRimborso,
      String(veicolo.alimentazione), veicolo.consumo_l100 as number | null,
    )
  }

  const { data: riga, error } = await db.from('corse').insert({
    conducente: req.conducenteId,
    veicolo: req.veicoloId,
    ora_arrivo: req.oraArrivo.toISOString(),
    ora_partenza: oraPartenza.toISOString(),
    origine_label: origine.label,
    origine_geo: geo(origine),
    destinazione_label: destinazione.label,
    destinazione_geo: geo(destinazione),
    percorso: linestring(tracciato.polilinea),
    km_base: tracciato.km,
    pedaggio_cent: corsa.pedaggio,
    parcheggio_cent: corsa.parcheggio,
    posti_offerti: req.postiOfferti,
    modalita: corsa.modalita,
    prenota_immediata: req.prenotaImmediata ?? false,
    deviazioni_ritiro: req.deviazioniRitiro ?? true,
    deviazioni_deposito: req.deviazioniDeposito ?? true,
    max_posti_dietro: req.maxPostiDietro ?? null,
    sconto_cent: corsa.scontoConducente,
    politica: req.politica ?? 'flessibile',
    flessibilita_min: Math.min(60, Math.max(0, req.flessibilitaMin ?? 0)),
    note: req.note ?? null,
    stato: 'pubblicata',
    token_link: corsa.modalita === 'link' ? token() : null,
  }).select().single()

  if (error) throw new ErroreCorsa('db', error.message)

  await db.from('fermate').insert([
    { corsa: riga.id, ordine: 0, tipo: 'partenza',
      etichetta: origine.label, geo: geo(origine), km_incrementali: 0,
      ora_stimata: oraPartenza.toISOString() },
    { corsa: riga.id, ordine: 99, tipo: 'destinazione',
      etichetta: destinazione.label, geo: geo(destinazione), km_incrementali: 0,
      ora_stimata: req.oraArrivo.toISOString() },
  ])

  // ── Il ritorno ────────────────────────────────────────────────────────
  // Si pubblica come corsa a sé, con origine e destinazione scambiate, e le
  // due si collegano. Restano indipendenti: si può disdire il ritorno e
  // tenere l'andata, e chi prenota una non prenota automaticamente l'altra.
  let ritorno: { id: string } | null = null
  if (req.oraRitorno) {
    const partenzaRitorno = req.oraRitorno
    const arrivoRitorno = new Date(
      partenzaRitorno.getTime() + (tracciato.minuti + MARGINE_MINUTI) * 60_000,
    )
    const { data: r2 } = await db.from('corse').insert({
      conducente: req.conducenteId,
      veicolo: req.veicoloId,
      ora_arrivo: arrivoRitorno.toISOString(),
      ora_partenza: partenzaRitorno.toISOString(),
      origine_label: destinazione.label,
      origine_geo: geo(destinazione),
      destinazione_label: origine.label,
      destinazione_geo: geo(origine),
      percorso: linestring([...tracciato.polilinea].reverse()),
      km_base: tracciato.km,
      pedaggio_cent: corsa.pedaggio,
      parcheggio_cent: corsa.parcheggio,
      posti_offerti: req.postiOfferti,
      modalita: corsa.modalita,
      prenota_immediata: req.prenotaImmediata ?? false,
      deviazioni_ritiro: req.deviazioniRitiro ?? true,
      deviazioni_deposito: req.deviazioniDeposito ?? true,
      max_posti_dietro: req.maxPostiDietro ?? null,
      sconto_cent: corsa.scontoConducente,
      politica: req.politica ?? 'flessibile',
      note: req.note ?? null,
      stato: 'pubblicata',
      corsa_ritorno: riga.id,
      token_link: corsa.modalita === 'link' ? token() : null,
    }).select('id').single()

    if (r2) {
      ritorno = r2
      await db.from('corse').update({ corsa_ritorno: r2.id }).eq('id', riga.id)
      await db.from('fermate').insert([
        { corsa: r2.id, ordine: 0, tipo: 'partenza',
          etichetta: destinazione.label, geo: geo(destinazione), km_incrementali: 0,
          ora_stimata: partenzaRitorno.toISOString() },
        { corsa: r2.id, ordine: 99, tipo: 'destinazione',
          etichetta: origine.label, geo: geo(origine), km_incrementali: 0,
          ora_stimata: arrivoRitorno.toISOString() },
      ])
    }
  }

  return {
    corsa: riga,
    ritorno,
    oraPartenza,
    minutiViaggio: tracciato.minuti,
    // Quello che il conducente vede. Il rientro è il NETTO, con la sua
    // quota di commissione di incasso già scalata: è il numero che gli
    // arriverà in banca, e dev'essere lo stesso che legge qui.
    costoCorsa: costoBase(corsa),
    quotaPerPasseggero: quotaPiena(corsa),
    rientroNetto: preventivo(
      corsa,
      Array.from({ length: req.postiOfferti }, (_, i) => ({ id: `p${i}`, kmDeviazione: 0 })),
    ).nettoConducente,
  }
}

/**
 * Le coordinate di un capo del viaggio, comunque arrivino.
 *
 * `Number.isFinite(0)` è vero, e per questo uno zero passava per una
 * coordinata legittima fino al servizio di navigazione, che rispondeva
 * «nessuna strada entro trecentocinquanta metri da 0.0000000 0.0000000» —
 * un messaggio che non nomina né il campo né il luogo. Qui uno zero
 * doppio si tratta per quello che è: una coordinata che non c'è, da
 * risolvere dall'indirizzo come se non fosse mai stata mandata.
 */
async function conCoordinate(
  x: { label: string; lat?: number; lng?: number },
): Promise<(Punto & { label: string }) | null> {
  if (usabile(x.lat, x.lng)) return { label: x.label, lat: x.lat!, lng: x.lng! }
  const l = await risolvi(x.label)
  return l && usabile(l.lat, l.lng)
    ? { label: l.etichetta, lat: l.lat, lng: l.lng }
    : null
}

const usabile = (lat?: number, lng?: number) =>
  Number.isFinite(lat) && Number.isFinite(lng)
  && Math.abs(lat!) <= 90 && Math.abs(lng!) <= 180
  && !(lat === 0 && lng === 0)

const geo = (p: Punto) => `SRID=4326;POINT(${p.lng} ${p.lat})`
const linestring = (c: [number, number][]) =>
  `SRID=4326;LINESTRING(${c.map(([lng, lat]) => `${lng} ${lat}`).join(',')})`
const token = () => crypto.randomUUID().replace(/-/g, '').slice(0, 12)
