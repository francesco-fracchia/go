'use client'
import { useState } from 'react'
import { Bottone } from './base.tsx'

/**
 * Bloccare qualcuno.
 *
 * Non è una denuncia e non chiede di scriverne una: fra segnalare — cioè
 * chiedere a noi di occuparcene — e non fare niente serviva un gesto che
 * non costringesse a raccontare cos'è successo. La maggior parte dei casi
 * sta lì: nessun reato, solo un viaggio andato male.
 *
 * Il testo dice cosa succede e cosa non succede, perché la domanda vera
 * di chi sta per premere è «se ne accorge?».
 */
export function Blocca({ persona, nome, bloccato }: {
  persona: string
  nome: string
  bloccato: boolean
}) {
  const [aperto, setAperto] = useState(false)
  const [fatto, setFatto] = useState(bloccato)
  const [invio, setInvio] = useState(false)

  const cambia = async (verso: 'blocca' | 'sblocca') => {
    setInvio(true)
    const r = verso === 'blocca'
      ? await fetch('/api/blocchi', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ persona }),
      })
      : await fetch(`/api/blocchi?persona=${encodeURIComponent(persona)}`, { method: 'DELETE' })
    setInvio(false)
    if (r.ok) { setFatto(verso === 'blocca'); setAperto(false) }
  }

  if (fatto) {
    return (
      <div style={{ marginTop: 'var(--s4)' }}>
        <p style={{ fontSize: 13.5, color: 'var(--tenue)', margin: '0 0 8px' }}>
          Non vi incontrate più: le corse di {nome} non ti compaiono, e lui non può
          salire sulle tue.
        </p>
        <Bottone variante="contorno" disabled={invio} onClick={() => cambia('sblocca')}>
          Sblocca {nome}
        </Bottone>
      </div>
    )
  }

  if (!aperto) {
    return (
      <button type="button" className="collegamento-piccolo"
        style={{ marginTop: 'var(--s4)' }} onClick={() => setAperto(true)}>
        Non voglio più viaggiare con {nome}
      </button>
    )
  }

  return (
    <div style={{ marginTop: 'var(--s4)' }}>
      <p style={{ fontSize: 14, lineHeight: 1.55, margin: '0 0 12px' }}>
        Le sue corse smettono di comparirti e non potete più prenotare l&apos;uno
        sull&apos;altra. <strong>Non gli viene detto</strong>: vede una corsa in meno,
        come quando è piena. Puoi tornare indietro quando vuoi.
      </p>
      <div style={{ display: 'flex', gap: 10 }}>
        <Bottone variante="contorno" style={{ flex: 1 }} onClick={() => setAperto(false)}>
          Lascia stare
        </Bottone>
        <Bottone variante="contorno" style={{ flex: 1 }} disabled={invio}
          onClick={() => cambia('blocca')}>
          Blocca
        </Bottone>
      </div>
    </div>
  )
}
