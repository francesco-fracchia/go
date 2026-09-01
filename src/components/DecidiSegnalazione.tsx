'use client'
import { useState } from 'react'
import { Bottone } from './base.tsx'

/**
 * Decidere su una segnalazione.
 *
 * Le due risposte hanno lo stesso peso visivo apposta. Se «fondata» fosse
 * il bottone pieno e «infondata» quello di contorno, la schermata
 * suggerirebbe una risposta prima di aver letto — e chi modera decine di
 * casi segue il suggerimento. Qui l'unica cosa che spinge è il testo del
 * caso.
 */
export function DecidiSegnalazione({ id }: { id: string }) {
  const [nota, setNota] = useState('')
  const [fatto, setFatto] = useState<string | null>(null)
  const [invio, setInvio] = useState(false)

  if (fatto) {
    return <p style={{ fontSize: 13.5, color: 'var(--tenue)', margin: 0 }}>{fatto}</p>
  }

  const decidi = async (fondata: boolean) => {
    if (nota.trim().length < 3) { setFatto(null); return }
    setInvio(true)
    const r = await fetch('/api/moderazione', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ segnalazione: id, fondata, nota }),
    })
    setInvio(false)
    setFatto(r.ok
      ? (fondata ? 'Chiusa come fondata.' : 'Chiusa come infondata.')
      : 'Non è riuscito. Riprova.')
  }

  const pronto = nota.trim().length >= 3 && !invio

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <textarea
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        placeholder="Cosa hai verificato, con chi hai parlato, cosa hai deciso"
        rows={2}
        style={{
          width: '100%', padding: 12, fontSize: 15, fontFamily: 'var(--testo)',
          borderRadius: 'var(--raggio-s)', border: '1px solid var(--riga)',
          background: 'var(--carta)', color: 'var(--inchiostro)', resize: 'vertical',
        }}
      />
      <div style={{ display: 'flex', gap: 10 }}>
        <Bottone variante="contorno" style={{ flex: 1 }} disabled={!pronto}
          onClick={() => decidi(false)}>Infondata</Bottone>
        <Bottone variante="contorno" style={{ flex: 1 }} disabled={!pronto}
          onClick={() => decidi(true)}>Fondata</Bottone>
      </div>
      {nota.trim().length < 3 && (
        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--tenue)' }}>
          Scrivi cosa hai verificato: l'esito va spiegato alla persona esclusa.
        </p>
      )}
    </div>
  )
}

/** Rimettere in strada un account fermo. */
export function Riattiva({ id }: { id: string }) {
  const [motivo, setMotivo] = useState('')
  const [fatto, setFatto] = useState<string | null>(null)

  if (fatto) return <p style={{ fontSize: 13.5, color: 'var(--tenue)', margin: 0 }}>{fatto}</p>

  const vai = async () => {
    const r = await fetch('/api/moderazione', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ riattiva: id, motivo }),
    })
    setFatto(r.ok ? 'Riattivato, e gliel\'abbiamo detto.' : 'Non è riuscito. Riprova.')
  }

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <input
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        placeholder="Cosa gli scriviamo (facoltativo)"
        style={{
          width: '100%', padding: 12, fontSize: 15, fontFamily: 'var(--testo)',
          borderRadius: 'var(--raggio-s)', border: '1px solid var(--riga)',
          background: 'var(--carta)', color: 'var(--inchiostro)',
        }}
      />
      <Bottone variante="contorno" onClick={vai}>Riattiva l'account</Bottone>
    </div>
  )
}
