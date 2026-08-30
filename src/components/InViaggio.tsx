'use client'
import { useEffect, useRef, useState } from 'react'
import { Bottone } from './base.tsx'
import {
  collegamento, predefinito, NOMI, type Navigatore, type Tappa,
} from '../lib/navigatore.ts'

/**
 * Quello che chi guida vede quando parte.
 *
 * Due cose, e nessun'altra: il navigatore e la posizione condivisa. Alle
 * undici di sera con il motore acceso non si legge niente d'altro.
 */

const OGNI_MS = 45_000

export function InViaggio({ corsa, tappe, prossimoRitiro }: {
  corsa: string
  tappe: Tappa[]
  prossimoRitiro?: { lat: number; lng: number }
}) {
  const [nav, setNav] = useState<Navigatore>('google')
  const [condivide, setCondivide] = useState(false)
  const [stato, setStato] = useState<'ferma' | 'attiva' | 'negata' | 'finita'>('ferma')
  const guardia = useRef<number | null>(null)

  useEffect(() => { setNav(predefinito()) }, [])

  useEffect(() => {
    if (!condivide) return
    if (!navigator.geolocation) { setStato('negata'); return }

    let ultimo = 0
    /**
     * Si manda un punto ogni quarantacinque secondi, non a ogni movimento.
     *
     * `watchPosition` chiama a ogni scostamento — decine di volte al minuto
     * in autostrada. Mandarli tutti scaricherebbe la batteria di chi guida
     * per un'informazione che al passeggero cambia una volta al minuto.
     */
    guardia.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const ora = Date.now()
        if (ora - ultimo < OGNI_MS) return
        ultimo = ora

        const r = await fetch('/api/posizione', {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            corsa, lat: pos.coords.latitude, lng: pos.coords.longitude,
            verso: prossimoRitiro,
          }),
        }).catch(() => null)

        // Il server rifiuta fuori dalla finestra: si smette da soli invece
        // di continuare a mandare punti che nessuno registra.
        if (r && r.status === 409) { setCondivide(false); setStato('finita') }
        else setStato('attiva')
      },
      () => setStato('negata'),
      { enableHighAccuracy: true, maximumAge: 20_000, timeout: 20_000 },
    )

    return () => {
      if (guardia.current !== null) navigator.geolocation.clearWatch(guardia.current)
    }
  }, [condivide, corsa, prossimoRitiro])

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <a href={collegamento(nav, tappe)} target="_blank" rel="noreferrer"
        style={{ textDecoration: 'none' }}>
        <Bottone>Apri in {NOMI[nav]}</Bottone>
      </a>

      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
        {(Object.keys(NOMI) as Navigatore[]).map((n) => (
          <button key={n}
            onClick={() => {
              setNav(n)
              try { localStorage.setItem('navigatore', n) } catch { /* privata */ }
            }}
            style={{
              background: 'none', border: 'none', padding: '6px 10px',
              fontSize: 13, fontWeight: n === nav ? 600 : 400,
              color: n === nav ? 'var(--accento)' : 'var(--tenue)',
            }}>{NOMI[n]}</button>
        ))}
      </div>

      {/* La posizione si accende a mano, ogni volta. Un interruttore che
          resta acceso da solo diventa un'applicazione che sa dove sei
          sempre, ed è esattamente quello che non vogliamo essere. */}
      <div style={{
        border: '1px solid var(--riga)', borderRadius: 'var(--raggio)',
        padding: '15px 17px',
      }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <div style={{ flexGrow: 1 }}>
            <div style={{ fontSize: 15.5, fontWeight: 600 }}>
              Fai vedere dove sei
            </div>
            <div style={{ fontSize: 13, color: 'var(--tenue)', marginTop: 3, lineHeight: 1.5 }}>
              {stato === 'negata'
                ? 'Il telefono non ci dà la posizione. Puoi sempre scrivere in chat.'
                : stato === 'finita'
                  ? 'La corsa è finita: abbiamo smesso.'
                  : 'Solo chi ha prenotato, solo fino all’arrivo. Non teniamo niente.'}
            </div>
          </div>
          <button
            onClick={() => setCondivide((v) => !v)}
            role="switch" aria-checked={condivide} aria-label="Fai vedere dove sei"
            disabled={stato === 'negata' || stato === 'finita'}
            style={{
              flexShrink: 0, width: 50, height: 30, borderRadius: 15, border: 'none',
              background: condivide ? 'var(--accento)' : 'var(--riga)',
              position: 'relative', marginTop: 2,
              opacity: stato === 'negata' || stato === 'finita' ? 0.4 : 1,
            }}
          >
            <span style={{
              position: 'absolute', top: 3, left: condivide ? 23 : 3,
              width: 24, height: 24, borderRadius: 12, background: '#fff',
              transition: 'left .15s',
            }} />
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Quello che vede il passeggero: quanto manca davvero.
 *
 * «4 minuti» calcolato da dove il conducente è adesso vale più di qualunque
 * orario previsto tre ore prima — e quando non arriva nessun punto lo diciamo,
 * invece di mostrare una stima vecchia che sembra viva.
 */
export function QuantoManca({ corsa }: { corsa: string }) {
  const [minuti, setMinuti] = useState<number | null>(null)
  const [visto, setVisto] = useState(false)

  useEffect(() => {
    let vivo = true
    const chiedi = async () => {
      const r = await fetch(`/api/posizione?corsa=${corsa}`).catch(() => null)
      if (!r?.ok || !vivo) return
      const d = await r.json()
      setVisto(!!d.posizione)
      setMinuti(d.posizione?.minuti ?? null)
    }
    void chiedi()
    const t = setInterval(chiedi, 40_000)
    return () => { vivo = false; clearInterval(t) }
  }, [corsa])

  if (!visto) return null

  return (
    <div style={{
      background: 'var(--accento-velo)', border: '1px solid var(--accento-riga)',
      borderRadius: 'var(--raggio)', padding: '15px 18px',
    }}>
      <div style={{
        fontFamily: 'var(--titoli)', fontWeight: 700, fontSize: 26,
        letterSpacing: '-.03em', color: 'var(--accento)',
      }}>
        {minuti === null ? 'In arrivo' : minuti <= 1 ? 'Sta arrivando' : `${minuti} minuti`}
      </div>
      <div style={{ fontSize: 13.5, color: 'var(--inchiostro-2)', marginTop: 2 }}>
        da dove si trova adesso
      </div>
    </div>
  )
}
