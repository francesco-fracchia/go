'use client'
import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Marchio } from './Marchio.tsx'

/**
 * Scegliere una password nuova.
 *
 * Ci si arriva dal collegamento nella mail, che ha già lasciato una
 * sessione: qui non si chiede di nuovo chi sei, si chiede solo la password.
 * Chiedere anche l'indirizzo sarebbe una domanda a cui abbiamo già risposto.
 */
export function Reimposta() {
  const [password, setPassword] = useState('')
  const [errore, setErrore] = useState<string | null>(null)
  const [attesa, setAttesa] = useState(false)

  async function salva() {
    if (password.length < 8) {
      setErrore('La password deve essere di almeno otto caratteri.'); return
    }
    setAttesa(true); setErrore(null)
    const client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    )
    const { error } = await client.auth.updateUser({ password })
    setAttesa(false)
    if (error) {
      setErrore('Non siamo riusciti a cambiarla. Il collegamento potrebbe essere scaduto.')
      return
    }
    window.location.href = '/'
  }

  return (
    <main className="schermo-stretto">
      <div style={{ marginBottom: 'var(--s6)' }}><Marchio dimensione={44} /></div>
      <h1 className="t-titolo">Scegli una password</h1>
      <p className="t-guida" style={{ margin: 'var(--s4) 0 var(--s5)' }}>
        Da adesso entrerai con questa. Almeno otto caratteri.
      </p>

      <label className="campo">
        <span className="campo-nome">Password nuova</span>
        <input type="password" value={password} autoComplete="new-password"
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') salva() }}
          placeholder="••••••••" />
      </label>

      {errore && <p className="errore">{errore}</p>}

      <button type="button" className="azione azione-piena"
        style={{ width: '100%', marginTop: 'var(--s5)' }}
        aria-disabled={attesa || password.length < 8} onClick={salva}>
        {attesa ? 'Un attimo…' : 'Salva ed entra'}
      </button>
    </main>
  )
}
