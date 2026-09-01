'use client'
import { useEffect, useState } from 'react'
import { Marchio } from './Marchio.tsx'
import type { Viaggio } from '../server/scorta.ts'
import { orario } from '../lib/tempo.ts'

/**
 * Quello che vede chi ha ricevuto il collegamento.
 *
 * Non è un cliente e non deve diventarlo: è qualcuno che si è preoccupato.
 * Quindi niente barra, niente linguette, niente «scarica l'applicazione» —
 * mettere una conversione davanti a una persona in ansia è la cosa più
 * sgradevole che questo prodotto possa fare.
 *
 * L'ordine delle informazioni è quello dell'ansia, non quello del
 * database: prima dove sono adesso, poi con chi, poi la targa — che è la
 * cosa che si dà ai carabinieri, e l'unica ragione per cui è in questa
 * pagina.
 */
export function SeguiViaggio({ v }: { v: Viaggio }) {
  const [posizione, setPosizione] = useState(v.posizione)
  const inViaggio = v.stato === 'in_corso'
  const finito = v.stato === 'conclusa'

  useEffect(() => {
    if (!inViaggio) return
    // Si ricontrolla mentre si viaggia. Il punto scade da solo dopo cinque
    // minuti: se il telefono di chi guida si spegne, qui smette di
    // aggiornarsi invece di mostrare per sempre l'ultimo posto noto.
    const t = setInterval(async () => {
      try {
        const r = await fetch(window.location.pathname + '/posizione')
        if (r.ok) setPosizione((await r.json()).posizione ?? null)
      } catch { /* si riprova fra un minuto */ }
    }, 60_000)
    return () => clearInterval(t)
  }, [inViaggio])

  const ora = orario

  return (
    <main className="scorta">
      <div className="scorta-dentro">
        <Marchio dimensione={34} />

        <p className="scorta-stato">
          {finito ? 'Arrivata' : inViaggio ? 'In viaggio adesso' : 'Non è ancora partita'}
        </p>
        <h1 className="t-titolo scorta-titolo">
          {v.passeggero} sta andando a {v.destinazione}
        </h1>

        {inViaggio && posizione?.minuti != null && (
          <p className="scorta-minuti">
            <span className="numero">{posizione.minuti}</span> minuti all&apos;arrivo
          </p>
        )}
        {inViaggio && !posizione && (
          <p className="scorta-nota">
            Il telefono di chi guida non sta mandando la posizione in questo
            momento. Non vuol dire che ci sia un problema: spesso è solo la
            rete.
          </p>
        )}

        <div className="scorta-scheda">
          <div className="scorta-chi">
            {v.conducenteFoto
              ? <img src={v.conducenteFoto} alt="" className="scorta-foto" />
              : <span className="scorta-foto scorta-foto-vuota">{v.conducente.slice(0, 1)}</span>}
            <div>
              <p className="scorta-nome">Guida {v.conducente}</p>
              <p className="scorta-auto">{v.auto}</p>
            </div>
          </div>
          {v.targa && (
            <p className="scorta-targa">
              <span className="scorta-etichetta">Targa</span>
              <span className="numero">{v.targa}</span>
            </p>
          )}
        </div>

        <dl className="scorta-fatti">
          <div><dt>Da</dt><dd>{v.origine}</dd></div>
          <div><dt>A</dt><dd>{v.destinazione}</dd></div>
          <div><dt>Partenza</dt><dd className="numero">{ora(v.oraPartenza)}</dd></div>
          <div><dt>Arrivo previsto</dt><dd className="numero">{ora(v.oraArrivo)}</dd></div>
        </dl>

        <p className="scorta-piede">
          Questo collegamento l&apos;ha aperto {v.passeggero} e smette di
          funzionare dodici ore dopo l&apos;arrivo. Se sei preoccupato adesso,
          chiama il <strong>112</strong>: GO non è un servizio di emergenza.
        </p>
      </div>
    </main>
  )
}
