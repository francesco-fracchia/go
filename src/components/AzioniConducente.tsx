'use client'
import { useState } from 'react'
import { Bottone } from './base.tsx'

/**
 * Confermare o rinunciare.
 *
 * Rinunciare passa da una conferma perché non è reversibile: fa partire il
 * rimatch, libera le carte e annulla la corsa. E la conferma dice cosa
 * succede a chi aspetta, non «sei sicuro?» — è l'unica informazione che può
 * far cambiare idea a qualcuno che stava rinunciando per pigrizia.
 */
export function AzioniConducente({ corsa, passeggeri }: {
  corsa: string; passeggeri: number
}) {
  const [fase, setFase] = useState<'fermo' | 'rinuncia' | 'invio' | 'fatto'>('fermo')

  const chiama = async (azione: 'conferma' | 'annulla') => {
    setFase('invio')
    await fetch(`/api/corse/${corsa}`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ azione }),
    })
    setFase('fatto')
    window.location.reload()
  }

  if (fase === 'rinuncia') {
    return (
      <div>
        <p style={{ margin: '0 0 14px', fontSize: 14.5, lineHeight: 1.55 }}>
          {passeggeri === 1
            ? 'Una persona resta a piedi'
            : `${passeggeri} persone restano a piedi`}. Cerchiamo subito
          un&apos;alternativa e non addebitiamo niente a nessuno, ma
          l&apos;annullamento resta sul tuo profilo.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <Bottone variante="contorno" style={{ flex: 1 }} onClick={() => setFase('fermo')}>
            Ci ripenso
          </Bottone>
          <Bottone variante="pericolo" style={{ flex: 1 }}
            disabled={fase !== 'rinuncia'} onClick={() => chiama('annulla')}>
            Annulla
          </Bottone>
        </div>
      </div>
    )
  }

  return (
    <>
      <Bottone disabled={fase === 'invio'} onClick={() => chiama('conferma')}>
        {fase === 'invio' ? 'Un attimo…' : 'Sì, parto'}
      </Bottone>
      <button onClick={() => setFase('rinuncia')} style={{
        width: '100%', marginTop: 8, background: 'transparent',
        border: 'none', color: 'var(--rosso)', fontSize: 14,
        fontWeight: 600, padding: 12,
      }}>
        Non ce la faccio più
      </button>
    </>
  )
}

export function RispondiProposta({ prenotazione, scadeFra }: {
  prenotazione: string; scadeFra: string
}) {
  const [fase, setFase] = useState<'fermo' | 'invio' | 'ok' | 'no' | 'errore'>('fermo')
  const [messaggio, setMessaggio] = useState('')

  if (fase === 'ok') return <Esito testo="Accettata. L'abbiamo avvisata." />
  if (fase === 'no') return <Esito testo="Rifiutata." />
  if (fase === 'errore') return <Esito testo={messaggio} />

  const rispondi = async (accetta: boolean) => {
    setFase('invio')
    const r = await fetch('/api/proposte', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prenotazione, accetta }),
    })
    const d = await r.json()
    if (!r.ok) { setMessaggio(d.messaggio ?? d.errore ?? 'Non è andata'); setFase('errore'); return }
    setFase(accetta ? 'ok' : 'no')
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 10 }}>
        <Bottone variante="contorno" style={{ flex: 1 }}
          disabled={fase === 'invio'} onClick={() => rispondi(false)}>No</Bottone>
        <Bottone style={{ flex: 2 }}
          disabled={fase === 'invio'} onClick={() => rispondi(true)}>
          {fase === 'invio' ? '…' : 'Va bene'}
        </Bottone>
      </div>
      <p style={{
        margin: '10px 0 0', fontSize: 12.5, color: 'var(--tenue)',
        textAlign: 'center', lineHeight: 1.45,
      }}>
        Scade fra {scadeFra}. Il posto resta prenotabile da altri finché non
        rispondi.
      </p>
    </>
  )
}

const Esito = ({ testo }: { testo: string }) => (
  <p style={{ fontSize: 14, color: 'var(--tenue)', textAlign: 'center', margin: 0 }}>{testo}</p>
)
