/**
 * MOTORE DEI PREZZI — il cuore conforme del prodotto.
 *
 * Le sei invarianti che questo modulo esiste per garantire:
 *  1. il conducente non incassa MAI più di quanto la corsa gli costa
 *  2. il conducente può abbassare la quota, mai alzarla
 *  3. le esenzioni le assorbe il conducente, mai gli altri passeggeri
 *  4. si rimborsano solo chilometri e spese vive — mai il tempo
 *  5. le deviazioni restano entro un limite, e le paga chi le chiede
 *  6. nessuna variabile di domanda entra nella formula
 *
 * Sono verificate in pricing.test.ts. Se qualcuno tocca questo file,
 * si rompe la build — non il modello di business.
 */
import { type Cents, eur, floorCents, ceilCents, roundCents } from './money.ts'

// ─── Parametri commerciali ────────────────────────────────────────────────
/** Tariffa di lancio. Rivedibile; non è un parametro di conformità. */
export const FEE_RATE = 0.15
/** Tetto per passeggero: protegge le tratte lunghe. */
export const FEE_CAP_PAX: Cents = eur(4.0)
/**
 * Minimo per passeggero. Esiste per una ragione sola: sotto questa soglia
 * la commissione Stripe (0,25 € fissi) supera la fee e ogni prenotazione
 * ci costa denaro. Non è avidità, è il pavimento del processore.
 */
export const FEE_MIN_PAX: Cents = eur(0.5)

// ─── Parametri di conformità (non si toccano senza un avvocato) ───────────
/** Deviazione complessiva massima, in frazione dei km base. */
export const DEVIAZIONE_MAX_RATIO = 0.20
/** All'ritorno si concede di più: si riporta la gente a casa. */
export const DEVIAZIONE_MAX_RATIO_RITORNO = 0.25

// ─── Costi del processore (Stripe, carte SEE) ─────────────────────────────
export const STRIPE_PCT = 0.015
export const STRIPE_FISSA: Cents = eur(0.25)

export type Modalita = 'pubblica' | 'link' | 'privata'

export interface Corsa {
  modalita: Modalita
  /** km del percorso base, origine → destinazione, SENZA deviazioni */
  kmBase: number
  /** costo chilometrico ACI, in centesimi per km — risolto lato server */
  centesimiPerKm: number
  pedaggio: Cents
  parcheggio: Cents
  /** posti passeggeri offerti — NON include il conducente */
  postiOfferti: number
  /**
   * Sconto volontario del conducente sulla quota, in centesimi.
   * Può solo abbassare: il motore lo satura in [0, quotaPiena].
   */
  scontoConducente?: Cents
  ritorno?: boolean
}

export interface Passeggero {
  id: string
  /**
   * Quota diversa da quella equa, in centesimi. Solo su corse private, e
   * solo per RIDISTRIBUIRE: la somma delle quote non può crescere.
   *
   * Serve ai casi veri di un gruppo di amici — chi scende a metà strada,
   * chi ha insistito per la deviazione, chi questo mese è a secco. Chi
   * paga di più assorbe la parte di qualcun altro, non aggiunge denaro.
   */
  quotaPersonalizzata?: Cents
  /**
   * Fermata a cui sale. Chi condivide la fermata condivide la deviazione:
   * se il conducente devia 5 km per prendere due persone, i km in più sono
   * cinque, non dieci. Assente = fermata propria.
   */
  fermataId?: string
  /** km aggiuntivi causati dalla deviazione della sua fermata */
  kmDeviazione: number
  /** esenzione totale — solo in modalità privata, la assorbe il conducente */
  esente?: boolean
}

export interface QuotaPasseggero {
  passeggeroId: string
  /** quota di partecipazione ai costi, che va al conducente */
  quota: Cents
  /** supplemento per la deviazione, che va al conducente */
  deviazione: Cents
  /** servizio della piattaforma */
  fee: Cents
  /** quello che il passeggero vede e paga */
  totale: Cents
  /** costo Stripe su questa transazione */
  costoProcessore: Cents
  /** parte del costo Stripe a carico del conducente */
  processoreConducente: Cents
  /** parte del costo Stripe a carico della piattaforma */
  processorePiattaforma: Cents
  /** quello che il conducente riceve davvero per questo passeggero */
  nettoConducente: Cents
  /** quello che resta effettivamente alla piattaforma */
  nettoPiattaforma: Cents
}

export interface Preventivo {
  costoBase: Cents
  /** costo della corsa comprese le deviazioni — quanto spende davvero il conducente */
  costoEffettivo: Cents
  /** quota piena prima di ogni sconto: costoBase / (postiOfferti + 1) */
  quotaPiena: Cents
  /** quota applicata, dopo lo sconto volontario */
  quotaApplicata: Cents
  quote: QuotaPasseggero[]
  /** somma delle quote e delle deviazioni, prima della commissione di incasso */
  incassoConducente: Cents
  /** quello che il conducente riceve davvero in banca */
  nettoConducente: Cents
  /**
   * Quanto la corsa costa di tasca al conducente, al netto di quello che
   * riceve. È sempre > 0: è la sua quota. Questo numero è l'invariante.
   */
  restaACaricoConducente: Cents
  ricavoPiattaforma: Cents
  /** commissione del processore sull'intera corsa, entrambe le quote */
  costoProcessore: Cents
  /** la sola parte a carico della piattaforma */
  processorePiattaforma: Cents
  nettoPiattaforma: Cents
}

export class ViolazioneConformita extends Error {
  constructor(msg: string) {
    super(msg)
    this.name = 'ViolazioneConformita'
  }
}

const costoKm = (km: number, centesimiPerKm: number): Cents =>
  floorCents(km * centesimiPerKm)

/**
 * Raggruppa i passeggeri per fermata e ripartisce il costo della deviazione
 * tra chi la condivide.
 *
 * Senza questo, due passeggeri alla stessa fermata pagherebbero due volte
 * gli stessi chilometri e il conducente ne incasserebbe il doppio di quanto
 * gli costano — cioè andrebbe in guadagno sulla deviazione. L'arrotondamento
 * per difetto resta a carico del conducente.
 */
export function deviazioniPerPasseggero(
  c: Corsa, passeggeri: Passeggero[],
): { perPasseggero: Map<string, Cents>; kmTotali: number } {
  const fermate = new Map<string, { km: number; membri: string[] }>()
  for (const p of passeggeri) {
    if (p.esente) continue
    const key = p.fermataId ?? `@${p.id}`
    const f = fermate.get(key)
    if (f) {
      f.km = Math.max(f.km, p.kmDeviazione)
      f.membri.push(p.id)
    } else {
      fermate.set(key, { km: p.kmDeviazione, membri: [p.id] })
    }
  }
  const perPasseggero = new Map<string, Cents>()
  let kmTotali = 0
  for (const f of fermate.values()) {
    kmTotali += f.km
    const quota = floorCents((f.km * c.centesimiPerKm) / f.membri.length)
    for (const id of f.membri) perPasseggero.set(id, quota)
  }
  return { perPasseggero, kmTotali }
}

export function costoBase(c: Corsa): Cents {
  return costoKm(c.kmBase, c.centesimiPerKm) + c.pedaggio + c.parcheggio
}

/**
 * La quota piena divide per (posti offerti + 1): il "+1" è il conducente,
 * che partecipa ai costi come tutti gli altri.
 *
 * Si divide per i posti OFFERTI, non per quelli venduti. Due conseguenze,
 * entrambe volute: il prezzo è noto al momento della pubblicazione e non
 * cambia mai dopo, e a macchina mezza vuota il conducente rientra di meno —
 * cioè non c'è nessun modo, nemmeno teorico, di andare in guadagno.
 */
export function quotaPiena(c: Corsa): Cents {
  if (c.postiOfferti < 1) throw new ViolazioneConformita('postiOfferti deve essere ≥ 1')
  return floorCents(costoBase(c) / (c.postiOfferti + 1))
}

export function quotaApplicata(c: Corsa): Cents {
  const piena = quotaPiena(c)
  const sconto = Math.max(0, Math.min(c.scontoConducente ?? 0, piena))
  return piena - sconto
}

export function limiteDeviazione(c: Corsa): number {
  return c.kmBase * (c.ritorno ? DEVIAZIONE_MAX_RATIO_RITORNO : DEVIAZIONE_MAX_RATIO)
}

/** La fee della corsa è un importo fisso, calcolato sul costo base. */
export function feeCorsa(c: Corsa): Cents {
  return roundCents(costoBase(c) * FEE_RATE)
}

/**
 * La quota di servizio per passeggero. Scende al crescere del gruppo:
 * più la macchina è piena, meno paga ciascuno. È l'unico incentivo di
 * prezzo del prodotto, ed è dalla parte giusta.
 */
export function feePasseggero(c: Corsa, nPasseggeri: number): Cents {
  if (nPasseggeri < 1) return 0
  const conTetto = Math.min(roundCents(feeCorsa(c) / nPasseggeri), FEE_CAP_PAX)
  return Math.max(conTetto, FEE_MIN_PAX)
}

export function costoProcessore(totale: Cents): Cents {
  if (totale <= 0) return 0
  return ceilCents(totale * STRIPE_PCT) + STRIPE_FISSA
}

/**
 * Ripartizione della commissione del processore.
 *
 * Stripe trattiene 0,25 € + 1,5 % su OGNI incasso, comprese le somme che
 * transitano verso il conducente e che non sono nostre. La si ripartisce
 * pro quota su quello che ciascuno riceve: chi incassa paga il costo di
 * incassare. È l'unica ripartizione difendibile, ed è anche la più prudente
 * sul piano della conformità — il conducente riceve ancora meno.
 *
 * L'arrotondamento va a carico del conducente, non della piattaforma:
 * nel dubbio, il conducente incassa di meno.
 */
export function ripartisciProcessore(
  totale: Cents, quotaConducente: Cents, fee: Cents,
): { conducente: Cents; piattaforma: Cents; totale: Cents } {
  const costo = costoProcessore(totale)
  if (costo <= 0 || totale <= 0) return { conducente: 0, piattaforma: 0, totale: 0 }
  const piattaforma = floorCents((costo * fee) / totale)
  return { conducente: costo - piattaforma, piattaforma, totale: costo }
}

/**
 * Il tetto complessivo che i passeggeri possono versare, comunque si
 * dividano fra loro.
 *
 * È la quota equa moltiplicata per i posti offerti: quello che resta fuori
 * è la parte del conducente, e il conducente la paga sempre. È questo
 * numero, non la divisione interna, a tenere in piedi tutto l'impianto.
 */
export function tettoComplessivo(c: Corsa): Cents {
  return quotaApplicata(c) * c.postiOfferti
}

/**
 * Verifica una ripartizione personalizzata.
 *
 * Ridistribuire è ammesso: alzare il totale no. Se la somma superasse il
 * tetto, il conducente rientrerebbe di più di quanto spende — che è
 * esattamente la cosa che non può succedere.
 */
export function verificaRipartizione(c: Corsa, quote: Cents[]): void {
  if (c.modalita !== 'privata') {
    throw new ViolazioneConformita(
      'le quote personalizzate esistono solo sulle corse private',
    )
  }
  if (quote.some((q) => q < 0)) {
    throw new ViolazioneConformita('una quota non può essere negativa')
  }
  const somma = quote.reduce((s, q) => s + q, 0)
  const tetto = tettoComplessivo(c)
  if (somma > tetto) {
    throw new ViolazioneConformita(
      `le quote sommano ${somma} ma il massimo è ${tetto}: si può ridistribuire, non aggiungere`,
    )
  }
}

export function preventivo(c: Corsa, passeggeri: Passeggero[]): Preventivo {
  if (passeggeri.length > c.postiOfferti) {
    throw new ViolazioneConformita(
      `${passeggeri.length} passeggeri per ${c.postiOfferti} posti offerti`,
    )
  }

  const dev = deviazioniPerPasseggero(c, passeggeri)
  const kmDeviazioneTotali = dev.kmTotali
  const limite = limiteDeviazione(c)
  if (kmDeviazioneTotali > limite + 1e-9) {
    throw new ViolazioneConformita(
      `deviazioni per ${kmDeviazioneTotali.toFixed(1)} km oltre il limite di ${limite.toFixed(1)} km`,
    )
  }

  const base = costoBase(c)
  const piena = quotaPiena(c)
  const applicata = quotaApplicata(c)

  // Ripartizione personalizzata: si controlla PRIMA di calcolare qualunque
  // cosa. Se non regge, la corsa non nasce.
  const personalizzate = passeggeri.filter((p) => p.quotaPersonalizzata !== undefined)
  if (personalizzate.length > 0) {
    verificaRipartizione(c, passeggeri.map((p) => p.quotaPersonalizzata ?? applicata))
  }

  // Il denominatore della fee sono i PARTECIPANTI, non i paganti.
  // Se qualcuno è esente la sua parte semplicemente non si incassa: la
  // assorbe la piattaforma. Non si ridistribuisce sugli altri, altrimenti
  // l'esenzione concessa dal conducente la pagherebbero i passeggeri —
  // che è esattamente quello che l'invariante 3 vieta.
  const quote: QuotaPasseggero[] = passeggeri.map((p) => {
    const esente = p.esente === true
    const quota = esente ? 0 : (p.quotaPersonalizzata ?? applicata)
    const deviazione = esente ? 0 : (dev.perPasseggero.get(p.id) ?? 0)
    const fee = esente ? 0 : feePasseggero(c, passeggeri.length)
    const totale = quota + deviazione + fee
    const proc = ripartisciProcessore(totale, quota + deviazione, fee)
    return {
      passeggeroId: p.id,
      quota,
      deviazione,
      fee,
      totale,
      costoProcessore: proc.totale,
      processoreConducente: proc.conducente,
      processorePiattaforma: proc.piattaforma,
      nettoConducente: quota + deviazione - proc.conducente,
      nettoPiattaforma: fee - proc.piattaforma,
    }
  })

  const costoEffettivo = base + costoKm(kmDeviazioneTotali, c.centesimiPerKm)
  const incassoConducente = quote.reduce((s, q) => s + q.quota + q.deviazione, 0)
  const ricavoPiattaforma = quote.reduce((s, q) => s + q.fee, 0)
  const costoProc = quote.reduce((s, q) => s + q.costoProcessore, 0)
  const procPiattaforma = quote.reduce((s, q) => s + q.processorePiattaforma, 0)

  const p: Preventivo = {
    costoBase: base,
    costoEffettivo,
    quotaPiena: piena,
    quotaApplicata: applicata,
    quote,
    incassoConducente,
    nettoConducente: quote.reduce((s, q) => s + q.nettoConducente, 0),
    restaACaricoConducente: costoEffettivo - incassoConducente,
    ricavoPiattaforma,
    costoProcessore: costoProc,
    processorePiattaforma: procPiattaforma,
    nettoPiattaforma: ricavoPiattaforma - procPiattaforma,
  }

  // Rete di sicurezza in esecuzione, non solo nei test. Se questa condizione
  // salta in produzione la corsa non parte: meglio un errore che un reato.
  if (p.restaACaricoConducente <= 0) {
    throw new ViolazioneConformita(
      `il conducente rientrerebbe di ${p.incassoConducente} su un costo di ${p.costoEffettivo}`,
    )
  }

  return p
}

/**
 * Quanto autorizzare sulla carta al momento della prenotazione.
 *
 * Il problema: chi prenota per primo non sa in quanti saranno, e la sua fee
 * scende man mano che gli altri salgono. Si autorizza quindi lo scenario
 * peggiore — passeggero solo — e alla partenza si cattura l'importo reale,
 * che è minore o uguale. Nessun rimborso, nessuna commissione buttata.
 */
export function autorizzazioneMassima(c: Corsa, p: Passeggero): Cents {
  if (p.esente) return 0
  return quotaApplicata(c) + costoKm(p.kmDeviazione, c.centesimiPerKm) + feePasseggero(c, 1)
}

/**
 * Autorizzazioni per un gruppo che prenota insieme sulla STESSA corsa.
 *
 * Prenotare insieme NON è pagare insieme: ognuno paga la propria parte con
 * la propria carta. Far anticipare i soldi a uno solo, che poi li rincorre,
 * è precisamente il problema che l'applicazione esiste per togliere di
 * mezzo — vale tra sconosciuti e vale anche tra amici.
 *
 * Il gruppo serve ad altro, e serve comunque: i posti si riservano insieme
 * così nessuno resta a terra da solo, si sale alla stessa fermata, e la
 * deviazione si divide fra chi la condivide.
 *
 * Costa 25 centesimi di Stripe a testa invece che una volta sola. È il
 * prezzo della comodità che vendiamo, e va pagato.
 */
export function autorizzazioniGruppo(
  c: Corsa, passeggeri: Passeggero[],
): Map<string, Cents> {
  const dev = deviazioniPerPasseggero(c, passeggeri)
  const fee = feePasseggero(c, passeggeri.length)
  const out = new Map<string, Cents>()
  for (const p of passeggeri) {
    out.set(p.id, p.esente
      ? 0
      : quotaApplicata(c) + (dev.perPasseggero.get(p.id) ?? 0) + fee)
  }
  return out
}

/**
 * Autorizzazione unica per andata e ritorno DELLA STESSA PERSONA, e solo
 * su corse private.
 *
 * Qui nessuno anticipa nulla per nessun altro: è la stessa persona che paga
 * le proprie due tratte, quindi la comodità non viene intaccata.
 *
 * Ma su una corsa pubblica no, e non è una scelta contabile. Pagare A/R in
 * una transazione sola fa credere al passeggero di avere il rientro
 * assicurato, mentre il conducente dell'andata può volersene andare alle
 * due, o il ritorno può essere di un altro. Sarebbe la garanzia di rientro
 * che abbiamo deciso di non dare, reintrodotta di nascosto dal modo di
 * pagare. Su una corsa privata il gruppo è già d'accordo e si muove
 * insieme: lì l'impegno congiunto esiste davvero prima del pagamento.
 */
export function autorizzazioneAndataRitorno(
  tratte: Array<{ corsa: Corsa; passeggero: Passeggero }>,
): Cents {
  const pubbliche = tratte.filter((t) => t.corsa.modalita !== 'privata')
  if (pubbliche.length > 0) {
    throw new ViolazioneConformita(
      'andata e ritorno si incassano insieme solo su corse private: ' +
      'su una corsa pubblica il pagamento unico promette un rientro che non possiamo garantire',
    )
  }
  return tratte.reduce((s, t) => s + autorizzazioneMassima(t.corsa, t.passeggero), 0)
}

/**
 * Quanto si risparmierebbe unendo n incassi in uno solo.
 *
 * Si applica al solo caso A/R della stessa persona su corse private. Per i
 * gruppi NON si applica: lì ognuno paga per sé, per scelta di prodotto.
 */
export function risparmioIncassoUnico(nTratte: number): Cents {
  return Math.max(0, nTratte - 1) * STRIPE_FISSA
}
