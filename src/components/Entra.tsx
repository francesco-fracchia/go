'use client'
import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Marchio } from './Marchio.tsx'
import { Bottone } from './base.tsx'

/**
 * Entrare.
 *
 * Solo numero di telefono e un codice via SMS. Niente password: una password
 * in più è una password dimenticata in più, e su un'applicazione che si apre
 * quattro volte l'anno la dimenticheranno tutti.
 *
 * Il documento non lo chiediamo mai. Lo verifica Stripe, gratis, su chi
 * incassa — che è l'unico posto dove serve davvero.
 */
export function Entra({ ritorno = '/' }: { ritorno?: string }) {
  /**
   * Due strade per entrare, e la seconda non è un ripiego temporaneo.
   *
   * Il numero di telefono resta la strada giusta — è quello che serve alle
   * chiamate mascherate, e chi viaggia con sconosciuti si fida di più di
   * chi ha un numero verificato. Ma l'SMS costa e richiede un fornitore
   * configurato, e finché non c'è nessuno può entrare affatto.
   *
   * L'email è l'altra strada: costa zero, funziona subito, e il numero lo
   * si chiede comunque prima di pubblicare o prenotare — cioè nel momento
   * in cui serve davvero, non all'ingresso.
   */
  const [via, setVia] = useState<'telefono' | 'email'>('email')
  const [fase, setFase] = useState<'numero' | 'codice' | 'nome'>('numero')
  const [telefono, setTelefono] = useState('')
  const [indirizzo, setIndirizzo] = useState('')
  const [codice, setCodice] = useState('')
  const [nome, setNome] = useState('')
  const [cognome, setCognome] = useState('')
  const [errore, setErrore] = useState<string | null>(null)
  const [attesa, setAttesa] = useState(false)

  /**
   * Il client si costruisce al primo uso, non durante il disegno.
   *
   * Costruito nel corpo del componente esplode ovunque manchino le chiavi —
   * in anteprima, nei test, in una build di prova — e porta giù l'intera
   * pagina invece del solo modulo di accesso. Un componente non deve
   * pretendere una connessione per essere disegnato.
   */
  const client = () => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  )

  const numeroPulito = () => {
    const n = telefono.replace(/[\s.-]/g, '')
    return n.startsWith('+') ? n : `+39${n}`
  }

  async function mandaCodice() {
    setAttesa(true); setErrore(null)
    const { error } = via === 'telefono'
      ? await client().auth.signInWithOtp({ phone: numeroPulito() })
      : await client().auth.signInWithOtp({
          email: indirizzo.trim(),
          options: { shouldCreateUser: true },
        })
    setAttesa(false)
    if (error) {
      setErrore(via === 'telefono'
        ? 'Non siamo riusciti a mandare il codice. Controlla il numero.'
        : 'Non siamo riusciti a mandare il codice. Controlla l’indirizzo.')
      return
    }
    setFase('codice')
  }

  async function verifica() {
    setAttesa(true); setErrore(null)
    const { data, error } = via === 'telefono'
      ? await client().auth.verifyOtp({ phone: numeroPulito(), token: codice, type: 'sms' })
      : await client().auth.verifyOtp({ email: indirizzo.trim(), token: codice, type: 'email' })
    setAttesa(false)
    if (error || !data.user) { setErrore('Codice sbagliato o scaduto.'); return }

    const r = await fetch('/api/profilo')
    if (r.ok && (await r.json()).esiste) { window.location.href = ritorno; return }
    setFase('nome')
  }

  async function completa() {
    setAttesa(true); setErrore(null)
    const r = await fetch('/api/profilo', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        nome, cognome,
        // Entrando con l'email il numero non c'è, e non se ne inventa uno:
        // lo si chiede prima di pubblicare o prenotare, dove serve davvero.
        telefono: via === 'telefono' ? numeroPulito() : undefined,
        email: via === 'email' ? indirizzo.trim() : undefined,
      }),
    })
    setAttesa(false)
    if (!r.ok) { setErrore((await r.json()).errore ?? 'Non è andata'); return }
    window.location.href = ritorno
  }

  return (
    <main style={{ maxWidth: 400, margin: '0 auto', padding: '48px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
        <Marchio dimensione={52} />
      </div>

      {fase === 'numero' && (
        <>
          <h1 style={{ fontSize: 26, textAlign: 'center', marginBottom: 8 }}>
            {via === 'telefono' ? 'Il tuo numero' : 'La tua email'}
          </h1>
          <p style={{
            textAlign: 'center', color: 'var(--inchiostro-2)', fontSize: 15,
            margin: '0 0 22px', lineHeight: 1.55,
          }}>
            Ti mandiamo un codice. Nessuna password da ricordare.
          </p>

          {via === 'telefono'
            ? <Campo valore={telefono} onChange={setTelefono} segnaposto="333 1234567" tipo="tel" />
            : <Campo valore={indirizzo} onChange={setIndirizzo} segnaposto="nome@esempio.it" tipo="email" />}

          {errore && <Errore testo={errore} />}

          <Bottone
            disabled={attesa || (via === 'telefono'
              ? telefono.replace(/\D/g, '').length < 9
              : !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(indirizzo.trim()))}
            onClick={mandaCodice}>
            {attesa ? 'Un attimo…' : 'Mandami il codice'}
          </Bottone>

          <button
            onClick={() => { setVia(via === 'telefono' ? 'email' : 'telefono'); setErrore(null) }}
            style={{
              width: '100%', background: 'none', border: 'none',
              color: 'var(--tenue)', fontSize: 14, padding: 16,
            }}>
            {via === 'telefono' ? 'Usa l’email' : 'Usa il numero di telefono'}
          </button>
        </>
      )}

      {fase === 'codice' && (
        <>
          <h1 style={{ fontSize: 26, textAlign: 'center', marginBottom: 8 }}>
            Il codice
          </h1>
          <p style={{
            textAlign: 'center', color: 'var(--inchiostro-2)', fontSize: 15,
            margin: '0 0 26px',
          }}>
            L&apos;abbiamo mandato {via === 'telefono' ? `al ${telefono}` : `a ${indirizzo}`}.
          </p>
          <Campo valore={codice} onChange={setCodice} segnaposto="000000"
            tipo="text" centrato mono />
          {errore && <Errore testo={errore} />}
          <Bottone disabled={codice.length < 4 || attesa} onClick={verifica}>
            {attesa ? 'Verifico…' : 'Entra'}
          </Bottone>
          <button onClick={() => setFase('numero')} style={{
            width: '100%', background: 'none', border: 'none', color: 'var(--tenue)',
            fontSize: 14, padding: 14,
          }}>{via === 'telefono' ? 'Ho sbagliato numero' : 'Ho sbagliato indirizzo'}</button>
        </>
      )}

      {fase === 'nome' && (
        <>
          <h1 style={{ fontSize: 26, textAlign: 'center', marginBottom: 8 }}>
            Come ti chiami?
          </h1>
          <p style={{
            textAlign: 'center', color: 'var(--inchiostro-2)', fontSize: 15,
            margin: '0 0 26px', lineHeight: 1.55,
          }}>
            Lo vedono le persone con cui viaggi. È il minimo per salire in
            macchina con qualcuno.
          </p>
          <Campo valore={nome} onChange={setNome} segnaposto="Nome" />
          <Campo valore={cognome} onChange={setCognome} segnaposto="Cognome" />
          {errore && <Errore testo={errore} />}
          <Bottone disabled={nome.length < 2 || cognome.length < 2 || attesa}
            onClick={completa}>
            {attesa ? 'Un attimo…' : 'Iniziamo'}
          </Bottone>
          <p style={{
            fontSize: 12.5, color: 'var(--tenue)', textAlign: 'center',
            margin: '16px 0 0', lineHeight: 1.6,
          }}>
            Continuando accetti le{' '}
            <a href="/legale/termini">condizioni d&apos;uso</a> e la{' '}
            <a href="/legale/privacy">informativa privacy</a>. Serve avere
            18 anni.
          </p>
        </>
      )}
    </main>
  )
}

function Campo({ valore, onChange, segnaposto, tipo = 'text', centrato, mono }: {
  valore: string; onChange: (v: string) => void; segnaposto: string
  tipo?: string; centrato?: boolean; mono?: boolean
}) {
  return (
    <input
      type={tipo} value={valore} onChange={(e) => onChange(e.target.value)}
      placeholder={segnaposto} inputMode={tipo === 'tel' ? 'tel' : undefined}
      style={{
        width: '100%', marginBottom: 12, padding: '15px 18px',
        fontSize: centrato ? 26 : 17,
        fontFamily: mono ? 'var(--mono)' : 'var(--testo)',
        letterSpacing: mono ? '.3em' : undefined,
        textAlign: centrato ? 'center' : 'left',
        borderRadius: 'var(--raggio-s)', border: '1px solid var(--riga)',
        background: 'var(--superficie)', color: 'var(--inchiostro)', outline: 'none',
      }}
    />
  )
}

const Errore = ({ testo }: { testo: string }) => (
  <p style={{ color: 'var(--rosso)', fontSize: 14, margin: '0 0 14px', textAlign: 'center' }}>
    {testo}
  </p>
)
