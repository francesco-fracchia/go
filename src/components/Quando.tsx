'use client'
import { useEffect, useState } from 'react'

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

const ORE = {
  giorno: ['07:00', '08:00', '09:00', '10:00', '12:00', '14:00', '16:00', '18:00'],
  sera: ['19:00', '20:00', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30'],
  notte: ['00:00', '00:30', '01:00', '01:30', '02:00', '03:00', '04:00', '05:00'],
}

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
  const [fascia, setFascia] = useState<keyof typeof ORE>('sera')
  const [altro, setAltro] = useState('')

  const oggi = new Date(); oggi.setHours(0, 0, 0, 0)

  /** Sette giorni: una settimana è il limite oltre cui nessuno programma una serata. */
  const giorni = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(oggi); d.setDate(d.getDate() + i)
    return {
      data: d,
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
                    onClick={() => { setGiorno(g.data); setAltro('') }}>
                    <span className="giorno-nome">{g.nome}</span>
                    <span className="giorno-numero">{g.numero}</span>
                    <span className="giorno-mese">{g.mese}</span>
                  </button>
                )
              })}
            </div>

            <label className="altro-giorno">
              <span>Più in là</span>
              <input type="date" value={altro}
                onChange={(e) => {
                  setAltro(e.target.value)
                  if (e.target.value) {
                    const d = new Date(`${e.target.value}T00:00`)
                    if (!Number.isNaN(d.getTime())) setGiorno(d)
                  }
                }} />
            </label>

            <p className="occhiello occhiello-muto" style={{ marginTop: 'var(--s6)' }}>L&apos;ora</p>
            <div className="segmenti fasce">
              {(Object.keys(ORE) as Array<keyof typeof ORE>).map((f) => (
                <button key={f} type="button" className="segmento"
                  aria-pressed={fascia === f} onClick={() => setFascia(f)}>{NOMI[f]}</button>
              ))}
            </div>

            <div className="ore">
              {ORE[fascia].map((o) => (
                <button key={o} type="button"
                  className={`ora${ora === o ? ' ora-scelta' : ''}`}
                  aria-pressed={ora === o}
                  onClick={() => { setOra(o); componi(giorno, o) }}>{o}</button>
              ))}
            </div>

            {!giorno && (
              <p className="t-nota" style={{ marginTop: 'var(--s4)' }}>
                Scegli prima il giorno.
              </p>
            )}
          </div>
        </>
      )}
    </>
  )
}

/** «Oggi · 22:30», non «2026-08-31T22:30». */
function leggibile(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const ora = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  const giorni = Math.round(
    (new Date(d.toDateString()).getTime() - new Date(new Date().toDateString()).getTime()) / 86_400_000,
  )
  if (giorni === 0) return `Oggi · ${ora}`
  if (giorni === 1) return `Domani · ${ora}`
  if (giorni > 1 && giorni < 7) {
    return `${d.toLocaleDateString('it-IT', { weekday: 'long' })} · ${ora}`
  }
  return `${d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })} · ${ora}`
}
