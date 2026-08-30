'use client'
import { useState } from 'react'
import { Bottone } from './base.tsx'

/**
 * Il numero, chiesto dove serve.
 *
 * Non all'ingresso — lì è una domanda in più che fa abbandonare — ma
 * esattamente nel momento in cui manca: davanti al pulsante «Pubblica»,
 * dove la ragione è evidente e l'utente ha già deciso di andare avanti.
 *
 * E soprattutto: qui dentro, non altrove. Un messaggio rosso che dice «ti
 * serve un numero» senza un campo per scriverlo è un vicolo cieco, e
 * mandare l'utente in un'altra pagina gli fa perdere il modulo che aveva
 * già compilato.
 */
export function AggiungiTelefono({ suSalvato }: { suSalvato: (n: string) => void }) {
  const [numero, setNumero] = useState('')
  const [invio, setInvio] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  const valido = numero.replace(/\D/g, '').length >= 9

  return (
    <div style={{
      border: '1px solid var(--accento-riga)', background: 'var(--accento-velo)',
      borderRadius: 'var(--raggio)', padding: '17px 19px', marginBottom: 16,
    }}>
      <div style={{ fontSize: 15.5, fontWeight: 600, marginBottom: 4 }}>
        Il tuo numero
      </div>
      <p style={{ margin: '0 0 14px', fontSize: 14, color: 'var(--inchiostro-2)', lineHeight: 1.5 }}>
        Serve a chi sale per chiamarti se non vi trovate. Non lo vede nessuno:
        la chiamata passa da un numero nostro.
      </p>

      <input
        type="tel"
        inputMode="tel"
        value={numero}
        onChange={(e) => { setNumero(e.target.value); setErrore(null) }}
        placeholder="333 1234567"
        aria-label="Numero di telefono"
        style={{
          width: '100%', padding: '13px 15px', fontSize: 16,
          fontFamily: 'var(--testo)', color: 'var(--inchiostro)',
          border: '1px solid var(--riga)', borderRadius: 'var(--raggio-s)',
          background: 'var(--carta)', outline: 'none', marginBottom: 10,
        }}
      />

      {errore && (
        <p style={{ color: 'var(--rosso)', fontSize: 13.5, margin: '0 0 10px' }}>{errore}</p>
      )}

      <Bottone
        disabled={!valido || invio}
        onClick={async () => {
          setInvio(true); setErrore(null)
          const r = await fetch('/api/profilo', {
            method: 'PATCH', headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ telefono: numero }),
          })
          setInvio(false)
          const d = await r.json()
          if (!r.ok) { setErrore(d.errore ?? 'Non è andata'); return }
          suSalvato(d.telefono)
        }}
      >{invio ? 'Un attimo…' : 'Salva il numero'}</Bottone>
    </div>
  )
}
