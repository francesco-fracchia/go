'use client'
import { useState } from 'react'
import { Bottone } from './base.tsx'

export function ModeraRecensione({ id }: { id: string }) {
  const [fatto, setFatto] = useState<'pubblicata' | 'rifiutata' | null>(null)

  if (fatto) {
    return (
      <p style={{ fontSize: 13.5, color: 'var(--tenue)', margin: 0 }}>
        {fatto === 'pubblicata' ? 'Pubblicata.' : 'Testo rifiutato. Il giudizio resta.'}
      </p>
    )
  }

  const decidi = async (approvata: boolean) => {
    await fetch('/api/moderazione', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ recensione: id, approvata }),
    })
    setFatto(approvata ? 'pubblicata' : 'rifiutata')
  }

  return (
    <div style={{ display: 'flex', gap: 10 }}>
      <Bottone variante="contorno" style={{ flex: 1 }} onClick={() => decidi(false)}>
        Rifiuta
      </Bottone>
      <Bottone style={{ flex: 1 }} onClick={() => decidi(true)}>Pubblica</Bottone>
    </div>
  )
}
