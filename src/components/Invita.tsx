'use client'
import { useState } from 'react'
import { Etichetta } from './base.tsx'

/**
 * Condividere una corsa privata.
 *
 * Il collegamento è la modalità privata: non c'è nessuna rubrica da
 * riempire né inviti da mandare uno a uno. Si copia e si incolla nel gruppo
 * dove quelle persone già parlano — che è dove si organizzano davvero le
 * serate, non dentro la nostra applicazione.
 *
 * Chi apre il collegamento vede la corsa e prenota. Il prezzo è lo stesso
 * di una corsa pubblica: la modalità cambia chi la vede, mai quanto costa.
 */
export function Invita({ token, destinazione, orario }: {
  token: string; destinazione: string; orario: string
}) {
  const [copiato, setCopiato] = useState(false)
  const collegamento = typeof window !== 'undefined'
    ? `${window.location.origin}/invito/${token}`
    : ''

  const testo = `Vado a ${destinazione} alle ${orario}, ho posto. Prenota qui: ${collegamento}`

  async function condividi() {
    // La condivisione di sistema apre WhatsApp, Telegram e i messaggi con
    // un tocco. Dove non c'è, si copia e basta.
    if (navigator.share) {
      try { await navigator.share({ text: testo }); return } catch { /* annullata */ }
    }
    await navigator.clipboard.writeText(testo)
    setCopiato(true)
    setTimeout(() => setCopiato(false), 2200)
  }

  return (
    <div style={{
      border: '1px dashed var(--riga)', borderRadius: 'var(--raggio)',
      padding: '16px 18px',
    }}>
      <Etichetta>corsa privata</Etichetta>
      <p style={{ margin: '7px 0 14px', fontSize: 14, color: 'var(--inchiostro-2)', lineHeight: 1.5 }}>
        Non compare nelle ricerche. Manda il collegamento a chi vuoi: chi lo
        apre può prenotare.
      </p>
      <button onClick={condividi} className="tocco" style={{
        width: '100%', borderRadius: 'var(--raggio-s)', padding: '12px',
        border: 'none', background: 'var(--accento)', color: 'var(--su-accento)',
        fontWeight: 600, fontSize: 15,
      }}>
        {copiato ? 'Copiato ✓' : 'Manda il link'}
      </button>
    </div>
  )
}
