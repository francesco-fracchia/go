import { db } from './db.ts'
import { percorso } from './percorsi.ts'
import { leggiPunto, type Punto } from './geo.ts'
import { metriFra } from './fermate.ts'
import { pianifica as calcola, avanza, type Piano } from '../lib/pianifica.ts'
import { notifica } from './notifiche.ts'
import { FUSO } from '../lib/tempo.ts'

/**
 * L'orario dei ritiri per una corsa vera.
 *
 * Il conto lo fa `lib/pianifica`, che non sa niente di database né di
 * strade. Qui si raccolgono gli ingredienti: chi sale dove, in che ordine
 * si incontrano lungo la strada, e quanto ci si mette fra l'uno e l'altro.
 */

export interface Ritiro {
  fermata: string
  etichetta: string
  chi: string[]
  punto: Punto
}

export interface PassaggioSegnato {
  fermata: string
  etichetta: string
  chi: string[]
  quando: Date
  /** Chi guida ha già confermato di essere ripartito da qui. */
  passata: boolean
}

export interface PianoCorsa extends Omit<Piano, 'passaggi'> {
  passaggi: PassaggioSegnato[]
  /** Chi guida ha confermato di essere uscito: da qui le ore sono vere. */
  partenzaFatta: boolean
  origine: string
  /** Chi sale al punto di partenza, che non è una fermata di ritiro. */
  allOrigine: string[]
  destinazione: string
  /** Quanto tardi si arriverebbe rispetto all'ora pubblicata. */
  ritardoMin: number
}

/**
 * L'ordine in cui si incontrano i ritiri, lungo la strada.
 *
 * Non si ordina per distanza dall'origine in linea d'aria: due paesi
 * possono essere alla stessa distanza da casa e uno stare sulla strada e
 * l'altro dalla parte opposta. Si ordina per quanto si è AVANTI sul
 * percorso — il punto della polilinea più vicino a ciascun ritiro.
 *
 * Per tre o quattro ritiri su una tratta sostanzialmente lineare questo è
 * l'ordine giusto, e costa zero chiamate esterne. Se un giorno servisse
 * ottimizzare davvero un giro con dieci tappe, quello è un altro problema
 * e ha un altro nome.
 */
export function ordinaLungoIlPercorso<T extends { punto: Punto }>(
  ritiri: T[], polilinea: [number, number][],
): T[] {
  if (polilinea.length === 0) return ritiri
  const avanzamento = (p: Punto) => {
    let migliore = Infinity
    let dove = 0
    for (const [i, [lng, lat]] of polilinea.entries()) {
      const d = metriFra(p, { lat, lng })
      if (d < migliore) { migliore = d; dove = i }
    }
    return dove
  }
  return [...ritiri]
    .map((r) => ({ r, a: avanzamento(r.punto) }))
    .sort((x, y) => x.a - y.a)
    .map((x) => x.r)
}

/** I ritiri con almeno una prenotazione viva, e chi ci sale. */
export async function ritiriDi(corsaId: string): Promise<Ritiro[]> {
  const { data } = await db
    .from('prenotazioni')
    .select('fermata, profili:passeggero(nome), fermate(id, etichetta, geo, tipo)')
    .eq('corsa', corsaId)
    .not('stato', 'in', '("rifiutata","scaduta","annullata")')
    .not('fermata', 'is', null)

  const per = new Map<string, Ritiro>()
  for (const r of (data ?? []) as unknown as Array<Record<string, any>>) {
    const f = r.fermate
    if (!f || f.tipo !== 'ritiro') continue
    const punto = leggiPunto(f.geo)
    if (!punto) continue
    const gia = per.get(f.id)
    const nome = r.profili?.nome ?? 'qualcuno'
    if (gia) gia.chi.push(nome)
    else per.set(f.id, { fermata: f.id, etichetta: f.etichetta, chi: [nome], punto })
  }
  return [...per.values()]
}

export async function pianoDi(corsaId: string): Promise<PianoCorsa | null> {
  const { data: c } = await db
    .from('corse')
    .select('origine_label, destinazione_label, origine_geo, destinazione_geo, ora_partenza, ora_arrivo')
    .eq('id', corsaId)
    .maybeSingle()
  if (!c) return null

  const origine = leggiPunto(c.origine_geo)
  const destinazione = leggiPunto(c.destinazione_geo)
  if (!origine || !destinazione) return null

  /* Quali fermate sono già state passate, e con che ora reale. */
  const { data: righeFermate } = await db
    .from('fermate').select('id, tipo, passata_il, ora_stimata').eq('corsa', corsaId)
  const segnate = new Map((righeFermate ?? []).map((f) => [f.id, f.passata_il as string | null]))
  const stimate = new Map((righeFermate ?? []).map((f) => [f.id, f.ora_stimata as string | null]))
  const idPartenza = (righeFermate ?? []).find((f) => f.tipo === 'partenza')?.id

  const diretto = await percorso([origine, destinazione])
  const ritiri = ordinaLungoIlPercorso(await ritiriDi(corsaId), diretto.polilinea)

  /**
   * Chi non ha una fermata sale dove parte la corsa.
   *
   * Va detto, altrimenti l'itinerario è una bugia per omissione: elenca
   * due persone su tre e chi guida parte convinto di doverne prendere due.
   */
  const { data: senzaFermata } = await db
    .from('prenotazioni')
    .select('profili:passeggero(nome)')
    .eq('corsa', corsaId)
    .is('fermata', null)
    .not('stato', 'in', '("rifiutata","scaduta","annullata")')
  const allOrigine = ((senzaFermata ?? []) as unknown as Array<{ profili: { nome: string } | null }>)
    .map((x) => x.profili?.nome).filter((n): n is string => !!n)

  /**
   * Una chiamata per tratta, non una per il giro intero.
   *
   * Sembra più costoso ed è il contrario: ogni tratta finisce nella cache
   * per conto suo, quindi ricalcolare dopo che si aggiunge una persona
   * costa una chiamata sola, e una tratta Lodi–Casalpusterlengo si riusa
   * fra corse diverse. Un giro intero in cache ci finirebbe come un unico
   * blocco, buono per quella sola combinazione di passeggeri.
   */
  const punti = [origine, ...ritiri.map((r) => r.punto), destinazione]
  const tratte: number[] = []
  for (let i = 0; i + 1 < punti.length; i++) {
    const t = await percorso([punti[i]!, punti[i + 1]!])
    tratte.push(t.minuti)
  }

  const oraArrivo = new Date(c.ora_arrivo)
  const piano = calcola({
    oraArrivo,
    tratte,
    fermate: ritiri.map((r) => ({ etichetta: r.etichetta, chi: r.chi })),
    minutiDiretti: diretto.minuti,
  })

  /**
   * Si scrive l'ora su ogni fermata.
   *
   * Non è una cache: è il dato che serve altrove — alla notifica che dice
   * «passa a prenderti alle 21:24», e a chi aspetta e vuole sapere se
   * mancano cinque minuti o venti. Calcolarlo e tenerlo per sé sarebbe
   * saperlo e non dirlo.
   */
  const partenzaFatta = !!segnate.get(idPartenza ?? '')

  /**
   * Si scrive l'ora prevista solo FINCHÉ è una previsione.
   *
   * Dopo «sono partito» le ore buone sono quelle calcolate sull'ora vera, e
   * questa funzione gira a ogni apertura della schermata: continuando a
   * scrivere il conto all'indietro le cancellerebbe una per una. È
   * successo: dopo aver caricato il primo passeggero la sua riga tornava
   * all'ora prevista, e nessuno stava riscrivendo niente di proposito —
   * bastava guardare la pagina.
   */
  if (!partenzaFatta) {
    await Promise.all(ritiri.map((r, k) =>
      db.from('fermate')
        .update({ ora_stimata: piano.passaggi[k]?.quando.toISOString() ?? null })
        .eq('id', r.fermata)))
  }

  /**
   * Dopo «sono partito» le ore non si ricalcolano più all'indietro.
   *
   * Contare di nuovo dall'ora di arrivo darebbe la previsione di prima,
   * cancellando il fatto che si è usciti in ritardo o in anticipo. Da quel
   * momento le ore buone sono quelle che `confermaPassaggio` ha scritto,
   * e questa funzione le legge invece di rifarle.
   */
  const passaggi: PassaggioSegnato[] = ritiri.map((r, k) => ({
    fermata: r.fermata,
    etichetta: r.etichetta,
    chi: r.chi,
    /*
     * Una fermata già fatta mostra QUANDO È SUCCESSO, non quando era
     * prevista: è l'unica delle due che non cambierà più, e a fine corsa è
     * quella che serve se qualcuno chiede com'è andata.
     */
    quando: segnate.get(r.fermata)
      ? new Date(segnate.get(r.fermata)!)
      : partenzaFatta && stimate.get(r.fermata)
        ? new Date(stimate.get(r.fermata)!)
        : piano.passaggi[k]?.quando ?? new Date(c.ora_arrivo),
    passata: !!segnate.get(r.fermata),
  }))

  /**
   * Anche l'origine prende l'ora vera.
   *
   * Senza questo, dopo «sono partito» i ritiri mostravano l'ora reale e la
   * riga di partenza restava a quella prevista: la schermata diceva di
   * essere usciti alle 21:09 e di essere dal primo alle 18:19. Un
   * itinerario in cui una riga sola resta indietro è peggio di uno tutto
   * sbagliato, perché sembra giusto.
   */
  const uscitoAlle = segnate.get(idPartenza ?? '')
  const partenza = partenzaFatta && uscitoAlle ? new Date(uscitoAlle) : piano.partenza

  const idArrivo = (righeFermate ?? []).find((f) => f.tipo === 'destinazione')?.id
  const arrivoVero = partenzaFatta ? stimate.get(idArrivo ?? '') : null
  const arrivo = arrivoVero ? new Date(arrivoVero) : piano.arrivo

  const partenzaPubblicata = new Date(c.ora_partenza)
  return {
    ...piano,
    partenza,
    arrivo,
    passaggi,
    partenzaFatta,
    origine: c.origine_label,
    allOrigine,
    destinazione: c.destinazione_label,
    /**
     * Il ritardo si misura sull'ORA DI USCITA, non sull'arrivo.
     *
     * L'arrivo è l'ancora del conto: per costruzione torna sempre. Quello
     * che può non tornare è che per arrivare in orario bisognerebbe essere
     * già usciti — ed è l'unica cosa che chi guida può ancora decidere.
     */
    // A cose fatte non serve più: si è usciti quando si è usciti, e dire
    // di partire prima a chi è già in strada è rumore.
    ritardoMin: partenzaFatta ? 0 : Math.max(0,
      Math.round((partenzaPubblicata.getTime() - piano.partenza.getTime()) / 60_000)),
  }
}

/**
 * «Sono partito» — e da quel momento le ore diventano vere.
 *
 * Chi guida conferma di essere uscito di casa, o di essere ripartito da
 * una fermata. Da lì si rifà il conto IN AVANTI dall'ora vera, e ogni
 * persona che deve ancora salire riceve la sua ora nuova.
 *
 * L'avviso non dice «il conducente è partito», che non serve a niente:
 * dice fra quanti minuti è sotto casa. È l'unica formulazione su cui una
 * persona può decidere se scendere adesso o fra un po' — e la differenza,
 * di notte, è fra aspettare al caldo e aspettare in strada.
 */
export type EsitoPassaggio =
  | { ok: true; avvisati: number; arrivo: Date }
  | { ok: false; motivo: 'non_tua' | 'assente' | 'gia_passata' }

export async function confermaPassaggio(
  corsaId: string, conducenteId: string, quale: string | 'partenza',
): Promise<EsitoPassaggio> {
  const { data: c } = await db
    .from('corse')
    .select('conducente, origine_geo, destinazione_geo, destinazione_label')
    .eq('id', corsaId)
    .maybeSingle()
  if (!c) return { ok: false, motivo: 'assente' }
  if (c.conducente !== conducenteId) return { ok: false, motivo: 'non_tua' }

  const adesso = new Date()

  /**
   * Da dove si riparte, e da dove si conta.
   *
   * «partenza» è la fermata di origine; altrimenti è il ritiro appena
   * fatto. In tutti e due i casi si segna il passaggio PRIMA di ricalcolare,
   * così la fermata appena lasciata non rientra fra quelle da raggiungere.
   */
  const { data: fermate } = await db
    .from('fermate')
    .select('id, tipo, geo, passata_il')
    .eq('corsa', corsaId)

  const partenza = (fermate ?? []).find((f) => f.tipo === 'partenza')
  const bersaglio = quale === 'partenza' ? partenza : (fermate ?? []).find((f) => f.id === quale)
  if (!bersaglio) return { ok: false, motivo: 'assente' }
  if (bersaglio.passata_il) return { ok: false, motivo: 'gia_passata' }

  await db.from('fermate')
    .update({ passata_il: adesso.toISOString() })
    .eq('id', bersaglio.id)

  const daQui = leggiPunto(bersaglio.geo)
  const destinazione = leggiPunto(c.destinazione_geo)
  if (!daQui || !destinazione) return { ok: true, avvisati: 0, arrivo: adesso }

  const tutti = await ritiriDi(corsaId)
  const passate = new Set((fermate ?? []).filter((f) => f.passata_il || f.id === bersaglio.id)
    .map((f) => f.id))
  const restanti = ordinaLungoIlPercorso(
    tutti.filter((r) => !passate.has(r.fermata)),
    (await percorso([daQui, destinazione])).polilinea)

  const punti = [daQui, ...restanti.map((r) => r.punto), destinazione]
  const tratte: number[] = []
  for (let i = 0; i + 1 < punti.length; i++) {
    tratte.push((await percorso([punti[i]!, punti[i + 1]!])).minuti)
  }

  const { passaggi, arrivo } = avanza({
    adesso, tratte, fermate: restanti.map((r) => ({ etichetta: r.etichetta, chi: r.chi })),
  })

  await Promise.all([
    ...restanti.map((r, k) =>
      db.from('fermate')
        .update({ ora_stimata: passaggi[k]?.quando.toISOString() ?? null })
        .eq('id', r.fermata)),
    /* Anche l'arrivo si sposta: partire dieci minuti tardi vuol dire
       arrivare dieci minuti tardi, e chi aspetta alla destinazione ha
       diritto di leggerlo invece di dedurlo. */
    db.from('fermate')
      .update({ ora_stimata: arrivo.toISOString() })
      .eq('corsa', corsaId).eq('tipo', 'destinazione'),
  ])

  /**
   * Si avvisa chi deve ancora salire, uno per uno con la SUA ora.
   *
   * Un avviso unico a tutti con l'orario del primo non serve a nessuno
   * tranne al primo. Chi sale per ultimo ha bisogno del proprio numero, e
   * quel numero è l'unica ragione per cui sta guardando il telefono.
   */
  let avvisati = 0
  for (const [k, r] of restanti.entries()) {
    const quando = passaggi[k]?.quando
    if (!quando) continue
    const minuti = Math.max(0, Math.round((quando.getTime() - adesso.getTime()) / 60_000))
    const { data: chi } = await db
      .from('prenotazioni').select('passeggero')
      .eq('corsa', corsaId).eq('fermata', r.fermata)
      .not('stato', 'in', '("rifiutata","scaduta","annullata")')

    for (const p of chi ?? []) {
      await notifica({
        destinatario: p.passeggero,
        tipo: 'in_arrivo',
        titolo: minuti <= 1 ? 'È sotto casa' : `È da te fra ${minuti} minuti`,
        testo: `${r.etichetta} alle ${quando.toLocaleTimeString('it-IT', {
          hour: '2-digit', minute: '2-digit', timeZone: FUSO,
        })}. Fatti trovare fuori.`,
        url: `/corsa/${corsaId}`,
        corsa: corsaId,
        chiave: `ritiro:${r.fermata}:${p.passeggero}:${Math.floor(adesso.getTime() / 60_000)}`,
      })
      avvisati++
    }
  }

  return { ok: true, avvisati, arrivo }
}
