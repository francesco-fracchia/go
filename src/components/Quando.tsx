'use client'
import { useState } from 'react'

/**
 * Quando vuoi essere lì.
 *
 * Il campo nativo `datetime-local` apre il calendario del browser: diverso
 * su ogni sistema, brutto ovunque, e soprattutto fa la domanda sbagliata.
 * Nessuno che esce il sabato pensa «30 agosto 2026, ore 23:30»: pensa
 * «stasera verso le undici e mezza».
 *
 * Quindi due scelte separate, ciascuna fatta di pulsanti: il giorno e
 * l'ora. Sono due tocchi per il caso normale, contro sette per aprire un
 * calendario e trovarci dentro il numero giusto.
 *
 * «Un altro giorno» apre il campo data vero per i casi che restano — un
 * volo fra tre settimane — dove il calendario è la cosa giusta.
 */

export interface Momento { giorno: Date; ora: string }

const ORE_SERA = ['21:00', '22:00', '22:30', '23:00', '23:30', '00:30', '01:00']
const ORE_GIORNO = ['07:00', '08:00', '09:00', '12:00', '14:00', '17:00', '19:00']

export function Quando({ valore, onCambia }: {
  valore: string
  onCambia: (iso: string) => void
}) {
  const oggi = new Date(); oggi.setHours(0, 0, 0, 0)
  const [giorno, setGiorno] = useState<Date | null>(null)
  const [ora, setOra] = useState('')
  const [altroGiorno, setAltroGiorno] = useState(false)
  const [sera, setSera] = useState(true)

  /** I prossimi cinque giorni, chiamati come li chiama chi parla. */
  const giorni = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(oggi); d.setDate(d.getDate() + i)
    return {
      data: d,
      nome: i === 0 ? 'Oggi' : i === 1 ? 'Domani'
        : d.toLocaleDateString('it-IT', { weekday: 'short' }).replace('.', ''),
      numero: d.getDate(),
    }
  })

  function componi(g: Date | null, o: string) {
    if (!g || !o) return
    const [h, m] = o.split(':').map(Number)
    const d = new Date(g)
    d.setHours(h!, m!, 0, 0)
    // Le ore piccole appartengono alla notte del giorno scelto, non alla
    // sua mattina: chi dice «stasera all'una» intende fra sette ore, non
    // diciassette ore fa.
    if (h! < 5) d.setDate(d.getDate() + 1)
    const p = (n: number) => String(n).padStart(2, '0')
    onCambia(`${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`)
  }

  const ore = sera ? ORE_SERA : ORE_GIORNO

  return (
    <div style={{ marginBottom: 12 }}>
      <span style={{ display: 'block', fontSize: 12, color: 'var(--tenue)', marginBottom: 8 }}>
        Vuoi essere lì
      </span>

      {altroGiorno ? (
        <input
          type="datetime-local"
          value={valore}
          onChange={(e) => onCambia(e.target.value)}
          aria-label="Giorno e ora"
          className="campo-data"
        />
      ) : (
        <>
          <div className="scelte" role="group" aria-label="Giorno">
            {giorni.map((g) => {
              const scelto = giorno?.toDateString() === g.data.toDateString()
              return (
                <button key={g.nome} type="button" className={`scelta${scelto ? ' scelta-attiva' : ''}`}
                  aria-pressed={scelto}
                  onClick={() => { setGiorno(g.data); componi(g.data, ora) }}>
                  {g.nome}
                  <span className="scelta-numero">{g.numero}</span>
                </button>
              )
            })}
          </div>

          <div className="scelte" role="group" aria-label="Ora" style={{ marginTop: 8 }}>
            {ore.map((o) => (
              <button key={o} type="button" className={`scelta${ora === o ? ' scelta-attiva' : ''}`}
                aria-pressed={ora === o}
                onClick={() => { setOra(o); componi(giorno, o) }}>
                {o}
              </button>
            ))}
          </div>
        </>
      )}

      <div style={{ display: 'flex', gap: 16, marginTop: 9 }}>
        {!altroGiorno && (
          <button type="button" onClick={() => setSera(!sera)} className="collegamento-piccolo">
            {sera ? 'Di giorno' : 'Di sera'}
          </button>
        )}
        <button type="button" onClick={() => setAltroGiorno(!altroGiorno)} className="collegamento-piccolo">
          {altroGiorno ? 'Torna alle scelte rapide' : 'Un altro giorno'}
        </button>
      </div>
    </div>
  )
}
