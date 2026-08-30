'use client'
import { useState } from 'react'
import { CampoLuogo, type LuogoScelto } from './CampoLuogo.tsx'
import { Quando } from './Quando.tsx'
import { SegnoCerca } from './segni.tsx'

/**
 * La ricerca.
 *
 * Tre differenze rispetto al modulo di prima, e nessuna è estetica:
 *
 * 1. Si chiede PRIMA dove vai. È l'unica cosa che chi cerca un passaggio sa
 *    con certezza: la partenza spesso è «da casa», e chiederla per prima
 *    mette l'ostacolo davanti alla risposta facile.
 * 2. La partenza arriva già compilata quando sappiamo dov'è casa. Chi fa la
 *    stessa tratta ogni giorno non deve riscriverla ogni giorno: è la
 *    ripetizione che decide se un'applicazione si usa la ventesima volta.
 * 3. Il pulsante dice cosa mancherebbe, invece di restare spento e muto.
 *    Un comando disattivato senza spiegazione è il modo più comune di far
 *    credere che un'applicazione sia rotta.
 */

export function Ricerca({ casa, destinazione, mappa = false, vicino, compatta }: {
  /** La partenza già compilata, se sappiamo dove abita */
  casa?: LuogoScelto
  destinazione?: LuogoScelto
  mappa?: boolean
  vicino?: { lat: number; lng: number }
  /** Sui risultati: la stessa ricerca, ma non è più la protagonista */
  compatta?: boolean
}) {
  const [da, setDa] = useState<LuogoScelto | null>(casa ?? null)
  const [a, setA] = useState<LuogoScelto | null>(destinazione ?? null)
  const [quando, setQuando] = useState('')
  const [inCorso, setInCorso] = useState(false)

  const manca = !a ? 'Dicci dove vai' : !da ? 'E da dove parti' : !quando ? 'Scegli quando' : null

  function cerca() {
    if (manca) return
    setInCorso(true)
    const arrivo = new Date(quando)
    const p = new URLSearchParams({
      olat: String(da!.lat), olng: String(da!.lng),
      dlat: String(a!.lat), dlng: String(a!.lng),
      dove: a!.etichetta, parti: da!.etichetta,
      // Finestra attorno all'ora richiesta: chi vuole essere lì alle 23:30
      // accetta volentieri di arrivare alle 22:45.
      da: new Date(arrivo.getTime() - 90 * 60_000).toISOString(),
      a: new Date(arrivo.getTime() + 45 * 60_000).toISOString(),
    })
    window.location.href = `/cerca?${p}`
  }

  return (
    <div className={`pannello-ricerca${compatta ? ' pannello-ricerca-compatto' : ''}`}>
      <div className="ricerca-luoghi">
        <CampoLuogo mappa={mappa} vicino={vicino} etichetta="Vai a"
          valore={a} onScegli={setA} segnaposto="Fabrique, Milano" />
        <CampoLuogo mappa={mappa} vicino={vicino} etichetta="Parti da"
          valore={da} onScegli={setDa} segnaposto="Lodi, piazza della Vittoria" />
      </div>

      <div className="ricerca-quando">
        <Quando valore={quando} onCambia={setQuando} />
      </div>

      <div className="ricerca-fondo">
        <p className="ricerca-manca">{manca ?? 'Guardiamo chi ci va già.'}</p>
        <button type="button" className="azione azione-piena ricerca-invia"
          aria-disabled={!!manca} onClick={cerca}>
          <SegnoCerca />
          {inCorso ? 'Cerchiamo…' : 'Cerca'}
        </button>
      </div>
    </div>
  )
}
