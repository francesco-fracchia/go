'use client'
import { useEffect, useState } from 'react'

const TEMI = [
  { id: '', nome: 'Terracotta', nota: 'quello di adesso — caldo, artigiano' },
  { id: 'notte', nome: 'Notte', nota: 'indaco su quasi-nero · Space Grotesk' },
  { id: 'segnale', nome: 'Segnale', nota: 'bianco, nero, un rosso che urla · Instrument Sans' },
  { id: 'nebbia', nome: 'Nebbia', nota: 'blu freddo, morbido, rassicurante · Manrope' },
  { id: 'acido', nome: 'Acido', nota: 'lime su carbone · Bricolage Grotesque' },
]

export function SceltaTema() {
  const [attivo, setAttivo] = useState('')

  useEffect(() => {
    const salvato = localStorage.getItem('palette') ?? ''
    applica(salvato)
    setAttivo(salvato)
  }, [])

  function applica(id: string) {
    if (id) document.documentElement.dataset.palette = id
    else delete document.documentElement.dataset.palette
    try { localStorage.setItem('palette', id) } catch { /* finestra privata */ }
  }

  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 10, background: 'var(--carta)',
      borderBottom: '1px solid var(--riga)', padding: '12px 20px',
      marginBottom: 28, display: 'flex', gap: 8, flexWrap: 'wrap',
    }}>
      {TEMI.map((t) => (
        <button
          key={t.id}
          onClick={() => { applica(t.id); setAttivo(t.id) }}
          title={t.nota}
          style={{
            padding: '9px 15px', borderRadius: 'var(--raggio-s)',
            border: `1px solid ${attivo === t.id ? 'transparent' : 'var(--riga)'}`,
            background: attivo === t.id ? 'var(--accento)' : 'var(--superficie)',
            color: attivo === t.id ? 'var(--su-accento)' : 'var(--inchiostro)',
            fontWeight: 600, fontSize: 14, fontFamily: 'var(--testo)',
          }}
        >
          {t.nome}
        </button>
      ))}
    </div>
  )
}
