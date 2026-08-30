'use client'
import { useState } from 'react'
import { Ricerca } from './Ricerca.tsx'

/**
 * Cambiare ricerca senza tornare indietro.
 *
 * Il collegamento «← Cambia ricerca» rimandava alla schermata iniziale, e
 * riportava i campi vuoti: chi voleva spostarsi di mezz'ora doveva
 * ricompilare tutto. Qui il pannello scende sopra i risultati e li lascia
 * dove sono, così si vede cosa si sta cambiando.
 */
export function RiapriRicerca({ mappa, vicino }: {
  mappa?: boolean
  vicino?: { lat: number; lng: number }
}) {
  const [aperto, setAperto] = useState(false)

  if (!aperto) {
    return (
      <button type="button" className="azione azione-vuota azione-piccola"
        onClick={() => setAperto(true)}>Cambia ricerca</button>
    )
  }

  return (
    <>
      <div className="velo" onClick={() => setAperto(false)} />
      <div className="foglio foglio-ricerca">
        <div className="maniglia" />
        <div className="fila-fra" style={{ marginBottom: 'var(--s4)' }}>
          <h2 className="t-sezione">Cambia ricerca</h2>
          <button type="button" className="collegamento-piccolo"
            onClick={() => setAperto(false)}>Chiudi</button>
        </div>
        <Ricerca mappa={mappa} vicino={vicino} compatta />
      </div>
    </>
  )
}
