'use client'
import { useState } from 'react'
import { Bottone } from './base.tsx'

/**
 * Disdire.
 *
 * Una conferma sola, e solo quando c'è una penale: chiedere «sei sicuro?»
 * per un'azione gratuita e reversibile è rumore. Quando invece si trattiene
 * del denaro, la conferma dice quanto — prima di premere, non dopo.
 */
export function Disdici({ prenotazione, gratuita }: {
  prenotazione: string; gratuita: boolean
}) {
  const [fase, setFase] = useState<'fermo' | 'conferma' | 'invio' | 'fatto'>('fermo')
  const [esito, setEsito] = useState<string>('')

  if (fase === 'fatto') {
    return (
      <p style={{ fontSize: 14, color: 'var(--tenue)', textAlign: 'center' }}>{esito}</p>
    )
  }

  const disdici = async () => {
    setFase('invio')
    const r = await fetch(`/api/prenotazioni/${prenotazione}`, { method: 'DELETE' })
    const d = await r.json()
    setEsito(d.messaggio ?? 'Disdetta.')
    setFase('fatto')
    setTimeout(() => window.location.reload(), 1400)
  }

  if (gratuita) {
    return (
      <Bottone variante="contorno" disabled={fase === 'invio'} onClick={disdici}>
        {fase === 'invio' ? 'Un attimo…' : 'Non ci vado più'}
      </Bottone>
    )
  }

  if (fase === 'fermo') {
    return (
      <Bottone variante="pericolo" onClick={() => setFase('conferma')}>
        Disdici comunque
      </Bottone>
    )
  }

  return (
    <div style={{
      background: 'var(--rosso-velo)', borderRadius: 'var(--raggio)', padding: '16px 18px',
    }}>
      <p style={{ margin: '0 0 14px', fontSize: 14.5, lineHeight: 1.5 }}>
        Ormai è tardi: la quota resta a chi guida, che ha già rinunciato al
        posto. Confermi?
      </p>
      <div style={{ display: 'flex', gap: 10 }}>
        <Bottone variante="contorno" style={{ flex: 1 }} onClick={() => setFase('fermo')}>
          No, resto
        </Bottone>
        <Bottone variante="pericolo" style={{ flex: 1 }}
          disabled={fase === 'invio'} onClick={disdici}>
          {fase === 'invio' ? '…' : 'Disdici'}
        </Bottone>
      </div>
    </div>
  )
}
