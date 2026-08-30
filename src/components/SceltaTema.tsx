'use client'
import { useEffect, useState } from 'react'

const TEMI = [
  { id: '', nome: 'Come il telefono', nota: 'segue le impostazioni di sistema' },
  { id: 'chiaro', nome: 'Chiaro', nota: 'bianco, inchiostro quasi nero, indaco' },
  { id: 'scuro', nome: 'Scuro', nota: 'la stessa palette, rovesciata' },
]

export function SceltaTema() {
  const [attivo, setAttivo] = useState('')

  useEffect(() => {
    const salvato = localStorage.getItem('tema') ?? ''
    applica(salvato)
    setAttivo(salvato)
  }, [])

  function applica(id: string) {
    if (id) document.documentElement.dataset.tema = id
    else delete document.documentElement.dataset.tema
    try { localStorage.setItem('tema', id) } catch { /* finestra privata */ }
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
