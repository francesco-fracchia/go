import { db } from './db.ts'
import { percorso } from './percorsi.ts'
import { leggiPunto, type Punto } from './geo.ts'
import { metriFra } from './fermate.ts'
import { pianifica as calcola, type Piano } from '../lib/pianifica.ts'

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

export interface PianoCorsa extends Piano {
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
  await Promise.all(ritiri.map((r, k) =>
    db.from('fermate')
      .update({ ora_stimata: piano.passaggi[k]?.quando.toISOString() ?? null })
      .eq('id', r.fermata)))

  const partenzaPubblicata = new Date(c.ora_partenza)
  return {
    ...piano,
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
    ritardoMin: Math.max(0,
      Math.round((partenzaPubblicata.getTime() - piano.partenza.getTime()) / 60_000)),
  }
}
