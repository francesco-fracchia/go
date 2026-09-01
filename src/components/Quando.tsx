'use client'
import { useEffect, useState } from 'react'
import { quando as quandoDetto } from '../lib/tempo.ts'

/**
 * Quando vuoi essere lì.
 *
 * Il campo nativo `datetime-local` apre il calendario del browser: diverso
 * su ogni sistema, brutto ovunque, e fa la domanda sbagliata. Nessuno che
 * esce il sabato pensa «30 agosto 2026, ore 23:30»: pensa «stasera verso le
 * undici e mezza».
 *
 * Ma la prima risposta — due file di pastiglie sempre aperte dentro il
 * pannello di ricerca — era peggio del problema. Dodici bottoni identici,
 * tutti dello stesso peso, che occupavano metà della schermata prima ancora
 * che qualcuno avesse detto dove voleva andare: un muro di scelte al posto
 * di una domanda.
 *
 * Adesso è UN campo, come gli altri due, che dice cosa hai scelto. Si tocca
 * e si apre un pannello dove le scelte hanno spazio per essere grandi: i
 * giorni come schede con il nome sopra e il numero sotto, le ore raggruppate
 * per momento della giornata — perché «sera» e «notte» sono le due
 * situazioni in cui questa applicazione si usa, e meritano di essere due
 * gruppi e non quattordici bottoni in fila.
 */

export interface Momento { giorno: Date; ora: string }

/**
 * Le ore, per momento della giornata. I minuti si scelgono a parte.
 *
 * Una griglia che contenga ogni combinazione di ora e minuto sono
 * duecentottanta bottoni; una che contenga solo le mezz'ore costringe chi
 * deve essere lì alle 22:45 a mentire. Due scelte piccole invece di una
 * grande: prima l'ora, poi il minuto — che è anche l'ordine in cui uno la
 * pensa.
 */
const ORE = {
  giorno: ['07', '08', '09', '10', '11', '12', '14', '16', '17', '18'],
  sera: ['19', '20', '21', '22', '23'],
  notte: ['00', '01', '02', '03', '04', '05'],
}

const MINUTI = ['00', '10', '15', '20', '30', '40', '45', '50']

const NOMI: Record<keyof typeof ORE, string> = {
  giorno: 'Di giorno', sera: 'Di sera', notte: 'Di notte',
}

export function Quando({ valore, onCambia, etichetta = 'Quando' }: {
  valore: string
  onCambia: (iso: string) => void
  etichetta?: string
}) {
  const [aperto, setAperto] = useState(false)
  const [giorno, setGiorno] = useState<Date | null>(null)
  const [ora, setOra] = useState('')
  const [minuto, setMinuto] = useState('00')
  const [fascia, setFascia] = useState<keyof typeof ORE>('sera')
  const [altriGiorni, setAltriGiorni] = useState(false)

  const adesso = new Date()
  const oggi = new Date(adesso); oggi.setHours(0, 0, 0, 0)

  /**
   * Un'ora già passata non si può scegliere.
   *
   * Selezionando «oggi» restavano cliccabili anche le sette del mattino
   * alle undici di sera: si sceglieva, si andava avanti, e il server
   * rispondeva «per arrivare a quell'ora bisognerebbe essere già partiti».
   * Un errore che si poteva prevedere due schermate prima va impedito due
   * schermate prima, non spiegato dopo.
   *
   * Il margine di un'ora c'è perché una corsa che parte fra dieci minuti
   * non la prenota nessuno: pubblicarla o cercarla è tempo perso.
   */
  const oggiScelto = giorno?.toDateString() === oggi.toDateString()
  const limite = new Date(adesso.getTime() + 60 * 60_000)

  function passata(ora: string, min: string): boolean {
    if (!oggiScelto) return false
    const d = new Date(oggi)
    d.setHours(Number(ora), Number(min), 0, 0)
    // Le ore piccole sono la notte DOPO, non la mattina di oggi.
    if (Number(ora) < 5) d.setDate(d.getDate() + 1)
    return d < limite
  }

  /**
   * I giorni, come schede che scorrono.
   *
   * Il campo data nativo apriva il calendario del sistema — diverso su ogni
   * macchina, brutto ovunque, e con dentro anche il 1994. Trenta giorni
   * che scorrono coprono tutto quello che qualcuno programma davvero, e
   * sono fatti della stessa materia del resto della schermata.
   */
  const giorni = Array.from({ length: altriGiorni ? 30 : 7 }, (_, i) => {
    const d = new Date(oggi); d.setDate(d.getDate() + i)
    return {
      data: d,
      /* Qui il fuso NON si dichiara, di proposito: queste date non
         arrivano dal database, le costruisce il browser a partire da oggi
         per farne un calendario da toccare. Fissarle a Roma le farebbe
         litigare con `d.getDate()` qui sotto, che resta locale — e si
         vedrebbe «mer 2» accanto a un numero di un altro giorno. */
      nome: i === 0 ? 'Oggi' : i === 1 ? 'Domani'
        : d.toLocaleDateString('it-IT', { weekday: 'short' }).replace('.', ''),
      numero: d.getDate(),
      mese: d.toLocaleDateString('it-IT', { month: 'short' }).replace('.', ''),
    }
  })

  /** Chi cerca di notte quasi sempre cerca la sera: si apre dove è più probabile. */
  useEffect(() => {
    const h = new Date().getHours()
    setFascia(h >= 5 && h < 17 ? 'giorno' : h >= 17 || h < 2 ? 'sera' : 'notte')
  }, [])

  /**
   * Scegliendo oggi ci si sposta su una fascia che abbia ancora qualcosa:
   * aprire su «di giorno» alle undici di sera mostra otto bottoni tutti
   * spenti, cioè una schermata che sembra rotta.
   */
  useEffect(() => {
    if (!oggiScelto) return
    const viva = (f: keyof typeof ORE) => ORE[f].some((o) => !passata(o, '00'))
    if (!viva(fascia)) {
      const prossima = (Object.keys(ORE) as Array<keyof typeof ORE>).find(viva)
      if (prossima) setFascia(prossima)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oggiScelto, giorno])

  function componi(g: Date | null, o: string) {
    if (!g || !o) return
    const [h, m] = o.split(':').map(Number)
    const d = new Date(g)
    d.setHours(h!, m!, 0, 0)
    // Le ore piccole appartengono alla notte del giorno scelto, non alla sua
    // mattina: chi dice «stasera all'una» intende fra sette ore, non
    // diciassette ore fa.
    if (h! < 5) d.setDate(d.getDate() + 1)
    const p = (n: number) => String(n).padStart(2, '0')
    onCambia(`${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`)
    setAperto(false)
  }

  return (
    <>
      <button type="button" className="campo campo-tocco" onClick={() => setAperto(true)}>
        <span className="campo-nome">{etichetta}</span>
        <span className={valore ? 'campo-valore' : 'campo-valore campo-vuoto'}>
          {valore ? leggibile(valore) : 'Scegli giorno e ora'}
        </span>
      </button>

      {aperto && (
        <>
          <div className="velo" onClick={() => setAperto(false)} />
          <div className="foglio foglio-quando" role="dialog" aria-label="Quando">
            <div className="maniglia" />
            <div className="fila-fra" style={{ marginBottom: 'var(--s5)' }}>
              <h2 className="t-blocco">Quando vuoi essere lì?</h2>
              <button type="button" className="collegamento-piccolo"
                onClick={() => setAperto(false)}>Chiudi</button>
            </div>

            <p className="occhiello occhiello-muto">Il giorno</p>
            <div className="giorni">
              {giorni.map((g) => {
                const scelto = giorno?.toDateString() === g.data.toDateString()
                return (
                  <button key={g.numero} type="button"
                    className={`giorno${scelto ? ' giorno-scelto' : ''}`}
                    aria-pressed={scelto}
                    onClick={() => { setGiorno(g.data); if (ora) componi(g.data, `${ora}:${minuto}`) }}>
                    <span className="giorno-nome">{g.nome}</span>
                    <span className="giorno-numero">{g.numero}</span>
                    <span className="giorno-mese">{g.mese}</span>
                  </button>
                )
              })}
            </div>

            {!altriGiorni && (
              <button type="button" className="collegamento-piccolo"
                style={{ marginTop: 'var(--s3)' }}
                onClick={() => setAltriGiorni(true)}>
                Più in là →
              </button>
            )}

            <p className="occhiello occhiello-muto" style={{ marginTop: 'var(--s6)' }}>L&apos;ora</p>
            <div className="segmenti fasce">
              {(Object.keys(ORE) as Array<keyof typeof ORE>).map((f) => (
                <button key={f} type="button" className="segmento"
                  aria-pressed={fascia === f} onClick={() => setFascia(f)}>{NOMI[f]}</button>
              ))}
            </div>

            <div className="ore">
              {ORE[fascia].map((o) => {
                const fuori = passata(o, minuto)
                return (
                  <button key={o} type="button"
                    className={`ora${ora === o ? ' ora-scelta' : ''}${fuori ? ' ora-passata' : ''}`}
                    aria-pressed={ora === o} disabled={fuori}
                    title={fuori ? 'è già passata' : undefined}
                    onClick={() => { setOra(o); componi(giorno, `${o}:${minuto}`) }}>{o}</button>
                )
              })}
            </div>

            <p className="occhiello occhiello-muto" style={{ marginTop: 'var(--s5)' }}>
              E i minuti
            </p>
            <div className="minuti">
              {MINUTI.map((m) => {
                const fuori = !!ora && passata(ora, m)
                return (
                  <button key={m} type="button"
                    className={`ora${minuto === m ? ' ora-scelta' : ''}${fuori ? ' ora-passata' : ''}`}
                    aria-pressed={minuto === m} disabled={fuori}
                    onClick={() => { setMinuto(m); if (ora) componi(giorno, `${ora}:${m}`) }}>
                    :{m}
                  </button>
                )
              })}
            </div>

            <div className="quando-piede">
              <p className="t-nota">
                {!giorno ? 'Scegli il giorno.'
                  : !ora ? 'Adesso l’ora.'
                    : `Vuoi essere lì alle ${ora}:${minuto}.`}
              </p>
              {giorno && ora && (
                <button type="button" className="azione azione-piena azione-piccola"
                  onClick={() => setAperto(false)}>Fatto</button>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}

/** «Oggi · 22:30», non «2026-08-31T22:30». */
const leggibile = (iso: string) =>
  quandoDetto(iso, { oggi: 'Oggi', domani: 'Domani' }) || iso
