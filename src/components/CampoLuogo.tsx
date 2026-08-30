'use client'
import { useEffect, useRef, useState } from 'react'
import { Mappa } from './Mappa.tsx'

/**
 * Un campo che sa dove sono i posti.
 *
 * Tre cose che un semplice campo di testo non fa, e che qui servono perché
 * quello che si scrive finisce dentro un prezzo:
 *
 * 1. Suggerisce mentre si scrive, pesando i risultati attorno a dove sei —
 *    chi scrive «stazione» dal lodigiano intende la sua. Una lista che apre
 *    con Palermo insegna a non fidarsi dei suggerimenti.
 * 2. Aspetta che si smetta di digitare. Una chiamata per tastiera premuta
 *    esaurisce la quota gratuita in un pomeriggio.
 * 3. Distingue «scritto» da «scelto». Finché non si sceglie una voce non ci
 *    sono coordinate, e senza coordinate non si può pubblicare.
 */

export interface LuogoScelto { etichetta: string; lat: number; lng: number }

export function CampoLuogo({ etichetta, segnaposto, valore, onScegli, vicino }: {
  etichetta: string
  segnaposto: string
  valore: LuogoScelto | null
  onScegli: (l: LuogoScelto | null) => void
  vicino?: { lat: number; lng: number }
}) {
  const [testo, setTesto] = useState(valore?.etichetta ?? '')
  const [suggerimenti, setSuggerimenti] = useState<LuogoScelto[]>([])
  const [aperto, setAperto] = useState(false)
  const [cercando, setCercando] = useState(false)
  const attesa = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [mappaAperta, setMappaAperta] = useState(false)

  useEffect(() => {
    if (attesa.current) clearTimeout(attesa.current)
    if (testo.trim().length < 3 || testo === valore?.etichetta) {
      setSuggerimenti([]); return
    }
    setCercando(true)
    attesa.current = setTimeout(async () => {
      const p = new URLSearchParams({ testo })
      if (vicino) { p.set('lat', String(vicino.lat)); p.set('lng', String(vicino.lng)) }
      try {
        const r = await fetch(`/api/luoghi?${p}`)
        const d = await r.json()
        setSuggerimenti(d.luoghi ?? [])
        setAperto(true)
      } finally { setCercando(false) }
    }, 350)
    return () => { if (attesa.current) clearTimeout(attesa.current) }
  }, [testo, vicino, valore?.etichetta])

  return (
    <div style={{ position: 'relative', marginBottom: 12 }}>
      <label style={{
        display: 'block', padding: '12px 16px',
        border: `1px solid ${valore ? 'var(--riga)' : 'var(--riga)'}`,
        borderRadius: 'var(--raggio-s)', background: 'var(--superficie)',
      }}>
        <span style={{
          display: 'flex', justifyContent: 'space-between',
          fontSize: 12, color: 'var(--tenue)',
        }}>
          {etichetta}
          {valore && <span style={{ color: 'var(--verde)' }}>✓</span>}
        </span>
        <input
          value={testo}
          onChange={(e) => { setTesto(e.target.value); onScegli(null) }}
          onFocus={() => suggerimenti.length > 0 && setAperto(true)}
          onBlur={() => setTimeout(() => setAperto(false), 160)}
          placeholder={segnaposto}
          autoComplete="off"
          style={{
            width: '100%', border: 'none', background: 'transparent', padding: '3px 0 0',
            fontSize: 16, fontFamily: 'var(--testo)', color: 'var(--inchiostro)', outline: 'none',
          }}
        />
      </label>

      {aperto && suggerimenti.length > 0 && (
        <ul style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
          margin: '4px 0 0', padding: 0, listStyle: 'none',
          background: 'var(--superficie)', border: '1px solid var(--riga)',
          borderRadius: 'var(--raggio-s)', boxShadow: 'var(--ombra-alta)',
          overflow: 'hidden',
        }}>
          {suggerimenti.map((l, i) => (
            <li key={`${l.lat},${l.lng},${i}`}>
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { onScegli(l); setTesto(l.etichetta); setAperto(false) }}
                style={{
                  width: '100%', textAlign: 'left', padding: '12px 16px',
                  background: 'none', border: 'none',
                  borderBottom: i < suggerimenti.length - 1 ? '1px solid var(--riga-2)' : 'none',
                  color: 'var(--inchiostro)', fontSize: 15,
                }}
              >{l.etichetta}</button>
            </li>
          ))}
        </ul>
      )}

      {/* Molti punti di ritrovo non hanno un indirizzo che qualcuno saprebbe
          scrivere: «il parcheggio dietro la chiesa», «l'uscita del casello».
          La ricerca copre la metà facile, la mappa l'altra. */}
      <button
        type="button"
        onClick={() => setMappaAperta(true)}
        style={{
          background: 'none', border: 'none', color: 'var(--accento)',
          fontSize: 13, fontWeight: 600, padding: '6px 4px 0',
        }}
      >Scegli sulla mappa</button>

      {mappaAperta && (
        <Mappa
          centro={valore ?? vicino ?? { lat: 45.3142, lng: 9.5033 }}
          iniziale={valore ? { ...valore } : undefined}
          onAnnulla={() => setMappaAperta(false)}
          onConferma={(p) => {
            onScegli({ etichetta: p.etichetta, lat: p.lat, lng: p.lng })
            setTesto(p.etichetta)
            setMappaAperta(false)
          }}
        />
      )}

      {/* Scritto ma non scelto: senza coordinate non si va avanti, e va
          detto mentre si guarda il campo, non premendo il pulsante. */}
      {!valore && testo.trim().length >= 3 && !cercando && !aperto && (
        <p style={{ fontSize: 12.5, color: 'var(--tenue)', margin: '5px 0 0', paddingLeft: 4 }}>
          Scegli un posto dall&apos;elenco.
        </p>
      )}
    </div>
  )
}
