'use client'
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Marchio } from './Marchio.tsx'

/**
 * Scegliere una password nuova.
 *
 * Ci si arriva dal collegamento nella mail, che ha già lasciato una
 * sessione: qui non si chiede di nuovo chi sei, si chiede solo la password.
 * Chiedere anche l'indirizzo sarebbe una domanda a cui abbiamo già risposto.
 */
const client = () => createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
)

export function Reimposta() {
  const [password, setPassword] = useState('')
  const [errore, setErrore] = useState<string | null>(null)
  const [attesa, setAttesa] = useState(false)
  const [pronto, setPronto] = useState<'attendo' | 'si' | 'no'>('attendo')

  /**
   * Il collegamento della mail porta qui con un codice monouso
   * nell'indirizzo. Lo scambia il client DEL BROWSER, che è l'unico ad
   * avere la chiave di verifica: era esattamente il motivo per cui il
   * collegamento non funzionava — lo scambio veniva tentato dal server,
   * che quella chiave non ce l'ha e non può averla.
   *
   * Se non c'è nessuna sessione dopo lo scambio, il collegamento è vecchio
   * o è già stato usato: lo si dice, invece di mostrare un modulo che
   * fallirà al salvataggio.
   */
  useEffect(() => {
    const c = client()
    const url = new URL(window.location.href)
    const codice = url.searchParams.get('code')

    void (async () => {
      if (codice) {
        const { error } = await c.auth.exchangeCodeForSession(codice)
        if (!error) {
          // L'indirizzo si ripulisce: un codice già speso lasciato nella
          // barra viene rigiocato al primo ricaricamento, e fallisce.
          window.history.replaceState({}, '', '/reimposta')
          setPronto('si'); return
        }
      }
      const { data } = await c.auth.getSession()
      setPronto(data.session ? 'si' : 'no')
    })()
  }, [])

  async function salva() {
    if (password.length < 8) {
      setErrore('La password deve essere di almeno otto caratteri.'); return
    }
    setAttesa(true); setErrore(null)
    const { error } = await client().auth.updateUser({ password })
    setAttesa(false)
    if (error) {
      setErrore('Non siamo riusciti a cambiarla. Il collegamento potrebbe essere scaduto.')
      return
    }
    window.location.href = '/'
  }

  if (pronto === 'attendo') {
    return (
      <main className="schermo-stretto">
        <div style={{ marginBottom: 'var(--s6)' }}><Marchio dimensione={44} /></div>
        <p className="t-corpo">Un attimo…</p>
      </main>
    )
  }

  if (pronto === 'no') {
    return (
      <main className="schermo-stretto">
        <div style={{ marginBottom: 'var(--s6)' }}><Marchio dimensione={44} /></div>
        <h1 className="t-titolo">Questo collegamento non vale più</h1>
        <p className="t-guida" style={{ margin: 'var(--s4) 0 var(--s6)' }}>
          I collegamenti per la password valgono un&apos;ora e si usano una
          volta sola. Chiedine un altro — oppure entra con un codice, che è
          più veloce.
        </p>
        <a href="/entra" className="azione azione-piena" style={{ width: '100%' }}>
          Torna all&apos;accesso
        </a>
      </main>
    )
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
