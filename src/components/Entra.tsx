'use client'
import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { MarchioEsteso, Marchio } from './Marchio.tsx'
import { SegnoAvanti } from './segni.tsx'

/**
 * Entrare, e registrarsi.
 *
 * Prima si entrava SOLO con un codice via email: ogni volta aprire la posta,
 * copiare sei cifre, tornare. Per un'applicazione che si apre alle due di
 * notte con una mano sola è un pedaggio che si paga a ogni accesso, e i
 * pedaggi ripetuti non si sopportano — si smette di usare la cosa.
 *
 * Adesso il codice si usa UNA volta, alla registrazione, per dimostrare che
 * l'indirizzo è tuo. Dopo si entra con la password. Chi la dimentica ha due
 * strade — reimpostarla, o farsi mandare di nuovo un codice — perché una
 * password dimenticata alle due di notte non deve chiudere fuori nessuno.
 *
 * Google e Apple compaiono solo se sono configurati davvero. Un pulsante
 * «continua con Google» che porta a una pagina d'errore è peggio di un
 * pulsante che non c'è: la prima volta che uno lo tocca decide che
 * l'applicazione è rotta.
 */

type Schermata = 'entra' | 'registra' | 'codice' | 'codiceEntra' | 'dimenticata' | 'mandata'

const GOOGLE = process.env.NEXT_PUBLIC_OAUTH_GOOGLE === '1'
const APPLE = process.env.NEXT_PUBLIC_OAUTH_APPLE === '1'

export function Entra({ ritorno = '/' }: { ritorno?: string }) {
  const [schermata, setSchermata] = useState<Schermata>('entra')
  const [indirizzo, setIndirizzo] = useState('')
  const [password, setPassword] = useState('')
  const [nome, setNome] = useState('')
  const [cognome, setCognome] = useState('')
  const [codice, setCodice] = useState('')
  const [errore, setErrore] = useState<string | null>(null)
  const [attesa, setAttesa] = useState(false)

  /**
   * Il client si costruisce al primo uso, non durante il disegno.
   *
   * Costruito nel corpo del componente esplode ovunque manchino le chiavi —
   * nei test, in una build di prova — e porta giù l'intera pagina invece
   * del solo modulo di accesso.
   */
  const client = () => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  )

  const email = () => indirizzo.trim().toLowerCase()

  /** Dopo l'accesso: chi ha già un profilo va dove voleva andare. */
  async function prosegui() {
    const r = await fetch('/api/profilo')
    const esiste = r.ok && (await r.json()).esiste
    window.location.href = esiste ? ritorno : `/benvenuto?ritorno=${encodeURIComponent(ritorno)}`
  }

  async function conProvider(provider: 'google' | 'apple') {
    setErrore(null)
    const { error } = await client().auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback?ritorno=${encodeURIComponent(ritorno)}` },
    })
    if (error) setErrore('Non siamo riusciti ad aprire l’accesso. Riprova.')
  }

  async function accedi() {
    setAttesa(true); setErrore(null)
    const { error } = await client().auth.signInWithPassword({
      email: email(), password,
    })
    setAttesa(false)
    if (error) {
      setErrore(error.message.toLowerCase().includes('email not confirmed')
        ? 'Devi ancora confermare l’indirizzo. Ti rimandiamo un codice?'
        : 'Email o password non corrispondono.')
      return
    }
    await prosegui()
  }

  async function registra() {
    if (password.length < 8) {
      setErrore('La password deve essere di almeno otto caratteri.'); return
    }
    setAttesa(true); setErrore(null)
    const { data, error } = await client().auth.signUp({
      email: email(), password,
      options: { data: { nome: nome.trim(), cognome: cognome.trim() } },
    })
    setAttesa(false)
    if (error) {
      setErrore(error.message.toLowerCase().includes('already')
        ? 'Questo indirizzo è già registrato. Prova a entrare.'
        : 'Non siamo riusciti a registrarti. Controlla l’indirizzo.')
      return
    }
    // Se il progetto non pretende la conferma, la sessione c'è già e si va
    // avanti. Altrimenti si passa dal codice — una volta sola, adesso.
    if (data.session) { await creaProfilo(); return }
    setSchermata('codice')
  }

  async function verificaCodice() {
    setAttesa(true); setErrore(null)
    const { data, error } = await client().auth.verifyOtp({
      email: email(), token: codice.trim(), type: 'email',
    })
    setAttesa(false)
    if (error || !data.user) { setErrore('Codice sbagliato o scaduto.'); return }
    await creaProfilo()
  }

  async function creaProfilo() {
    setAttesa(true)
    const r = await fetch('/api/profilo', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ nome: nome.trim(), cognome: cognome.trim(), email: email() }),
    })
    setAttesa(false)
    // Un profilo che esiste già non è un errore: vuol dire che si stava
    // rientrando, non registrandosi.
    if (!r.ok) {
      const d = await r.json().catch(() => ({}))
      if (d.codice !== 'esiste') { setErrore(d.errore ?? 'Non è andata'); return }
    }
    window.location.href = `/benvenuto?ritorno=${encodeURIComponent(ritorno)}`
  }

  /**
   * Entrare con un codice, sempre.
   *
   * Chi si è registrato quando esisteva solo il codice NON HA una password:
   * «non ricordo la password» gli chiede di ricordare una cosa che non è
   * mai esistita, e se il collegamento di reimpostazione fa i capricci
   * resta chiuso fuori da un account che funzionava.
   *
   * Il codice non ha niente da configurare e non può scadere in un
   * cassetto: è la strada che regge sempre, e per questo resta in vista
   * accanto alla password invece di essere nascosta in un ripiego.
   */
  async function mandaCodice() {
    setAttesa(true); setErrore(null)
    const { error } = await client().auth.signInWithOtp({
      email: email(), options: { shouldCreateUser: false },
    })
    setAttesa(false)
    if (error) { setErrore('Non siamo riusciti a mandare il codice. Controlla l’indirizzo.'); return }
    setSchermata('codiceEntra')
  }

  async function verificaEntrata() {
    setAttesa(true); setErrore(null)
    const { data, error } = await client().auth.verifyOtp({
      email: email(), token: codice.trim(), type: 'email',
    })
    setAttesa(false)
    if (error || !data.user) { setErrore('Codice sbagliato o scaduto.'); return }
    await prosegui()
  }

  async function reimposta() {
    setAttesa(true); setErrore(null)
    /**
     * Il collegamento porta DIRITTO alla schermata della password, non a
     * una rotta del server.
     *
     * Con il flusso PKCE la chiave di verifica resta nel browser che ha
     * chiesto il reimposta: una rotta lato server non ce l'ha, e lo
     * scambio fallisce sempre. È il motivo per cui il collegamento non
     * funzionava. Il client del browser, invece, riconosce il codice
     * nell'indirizzo da solo appena la pagina si apre.
     */
    const { error } = await client().auth.resetPasswordForEmail(email(), {
      redirectTo: `${window.location.origin}/reimposta`,
    })
    setAttesa(false)
    if (error) { setErrore('Non siamo riusciti a mandare la mail.'); return }
    setSchermata('mandata')
  }

  return (
    <main className="ingresso">
      <div className="ingresso-parola solo-scrivania">
        <MarchioEsteso dimensione={52} id="ingresso" />
        <p className="t-guida" style={{ maxWidth: '30ch' }}>
          Qualcuno sta già facendo la tua strada. Dividete le spese del
          viaggio, e basta.
        </p>
      </div>

      <div className="ingresso-modulo">
        <div className="solo-telefono ingresso-segno"><Marchio dimensione={48} /></div>

        {schermata === 'entra' && (
          <>
            <h1 className="t-sezione ingresso-titolo">Bentornato</h1>
            <p className="ingresso-sotto">Entra con la tua email e la password.</p>

            <Provider su={conProvider} />

            <Campo etichetta="Email" tipo="email" valore={indirizzo} onChange={setIndirizzo}
              segnaposto="nome@esempio.it" completa="email" />
            <Campo etichetta="Password" tipo="password" valore={password} onChange={setPassword}
              segnaposto="••••••••" completa="current-password" invio={accedi} />

            {errore && <p className="errore">{errore}</p>}

            <button type="button" className="azione azione-piena ingresso-invia"
              aria-disabled={attesa || !indirizzo || !password} onClick={accedi}>
              {attesa ? 'Un attimo…' : 'Entra'}
            </button>

            {/* Il codice non è un ripiego: per chi si è registrato prima
                che esistessero le password è LA strada. */}
            <button type="button" className="azione azione-vuota ingresso-invia"
              aria-disabled={attesa || !indirizzo}
              onClick={mandaCodice}>
              Mandami un codice via email
            </button>

            <div className="ingresso-sotto-azioni">
              <button type="button" className="collegamento-piccolo"
                onClick={() => { setErrore(null); setSchermata('dimenticata') }}>
                Cambia password
              </button>
              <button type="button" className="collegamento-piccolo"
                onClick={() => { setErrore(null); setSchermata('registra') }}>
                Non ho un account
              </button>
            </div>
          </>
        )}

        {schermata === 'registra' && (
          <>
            <h1 className="t-sezione ingresso-titolo">Crea il tuo account</h1>
            <p className="ingresso-sotto">
              Ci vuole meno di un minuto. Il codice te lo chiediamo una volta
              sola, adesso.
            </p>

            <Provider su={conProvider} />

            <div className="ingresso-coppia">
              <Campo etichetta="Nome" valore={nome} onChange={setNome} segnaposto="Francesco" completa="given-name" />
              <Campo etichetta="Cognome" valore={cognome} onChange={setCognome} segnaposto="Fracchia" completa="family-name" />
            </div>
            <Campo etichetta="Email" tipo="email" valore={indirizzo} onChange={setIndirizzo}
              segnaposto="nome@esempio.it" completa="email" />
            <Campo etichetta="Password" tipo="password" valore={password} onChange={setPassword}
              segnaposto="almeno 8 caratteri" completa="new-password" invio={registra} />

            {errore && <p className="errore">{errore}</p>}

            <button type="button" className="azione azione-piena ingresso-invia"
              aria-disabled={attesa || !nome || !cognome || !indirizzo || password.length < 8}
              onClick={registra}>
              {attesa ? 'Un attimo…' : 'Continua'}
            </button>

            <p className="ingresso-legale">
              Registrandoti accetti le <a href="/legale/termini">condizioni d&apos;uso</a> e
              hai letto <a href="/legale/privacy">come trattiamo i tuoi dati</a>.
            </p>

            <div className="ingresso-sotto-azioni">
              <button type="button" className="collegamento-piccolo"
                onClick={() => { setErrore(null); setSchermata('entra') }}>
                Ho già un account
              </button>
            </div>
          </>
        )}

        {schermata === 'codiceEntra' && (
          <>
            <h1 className="t-sezione ingresso-titolo">Controlla la posta</h1>
            <p className="ingresso-sotto">
              Abbiamo mandato un codice a <strong>{email()}</strong>. Vale pochi
              minuti.
            </p>
            <Campo etichetta="Codice" valore={codice} onChange={setCodice}
              segnaposto="123456" completa="one-time-code" mono invio={verificaEntrata} />

            {errore && <p className="errore">{errore}</p>}

            <button type="button" className="azione azione-piena ingresso-invia"
              aria-disabled={attesa || codice.trim().length < 6} onClick={verificaEntrata}>
              {attesa ? 'Un attimo…' : 'Entra'}
            </button>

            <div className="ingresso-sotto-azioni">
              <button type="button" className="collegamento-piccolo"
                onClick={() => { setErrore(null); setSchermata('entra') }}>
                Torna indietro
              </button>
            </div>
          </>
        )}

        {schermata === 'codice' && (
          <>
            <h1 className="t-sezione ingresso-titolo">Controlla la posta</h1>
            <p className="ingresso-sotto">
              Abbiamo mandato un codice a <strong>{email()}</strong>. Serve solo
              a dimostrare che l&apos;indirizzo è tuo: dopo entrerai con la
              password.
            </p>
            <Campo etichetta="Codice" valore={codice} onChange={setCodice}
              segnaposto="123456" completa="one-time-code" mono invio={verificaCodice} />

            {errore && <p className="errore">{errore}</p>}

            <button type="button" className="azione azione-piena ingresso-invia"
              aria-disabled={attesa || codice.trim().length < 6} onClick={verificaCodice}>
              {attesa ? 'Un attimo…' : 'Conferma'}
            </button>
          </>
        )}

        {schermata === 'dimenticata' && (
          <>
            <h1 className="t-sezione ingresso-titolo">Scegli una password</h1>
            <p className="ingresso-sotto">
              Dicci il tuo indirizzo: ti mandiamo un collegamento per
              impostarne una. Se finora sei sempre entrato con il codice, va
              bene lo stesso — puoi continuare così.
            </p>
            <Campo etichetta="Email" tipo="email" valore={indirizzo} onChange={setIndirizzo}
              segnaposto="nome@esempio.it" completa="email" invio={reimposta} />

            {errore && <p className="errore">{errore}</p>}

            <button type="button" className="azione azione-piena ingresso-invia"
              aria-disabled={attesa || !indirizzo} onClick={reimposta}>
              {attesa ? 'Un attimo…' : 'Mandami il collegamento'}
            </button>

            <div className="ingresso-sotto-azioni">
              <button type="button" className="collegamento-piccolo"
                onClick={() => setSchermata('entra')}>Torna indietro</button>
            </div>
          </>
        )}

        {schermata === 'mandata' && (
          <>
            <h1 className="t-sezione ingresso-titolo">Guarda la posta</h1>
            <p className="ingresso-sotto">
              Se <strong>{email()}</strong> è registrato, fra poco arriva un
              collegamento per scegliere una password nuova. Vale un&apos;ora.
            </p>
            <button type="button" className="azione azione-vuota ingresso-invia"
              onClick={() => setSchermata('entra')}>Torna all&apos;accesso</button>
          </>
        )}
      </div>
    </main>
  )
}

/**
 * Google e Apple, se ci sono.
 *
 * Il pulsante compare solo quando il fornitore è configurato davvero: uno
 * che porta a una pagina d'errore insegna che l'applicazione è rotta, e
 * quella è la prima cosa che uno vede di GO.
 */
function Provider({ su }: { su: (p: 'google' | 'apple') => void }) {
  if (!GOOGLE && !APPLE) return null
  return (
    <>
      <div className="provider">
        {GOOGLE && (
          <button type="button" className="azione azione-vuota provider-voce"
            onClick={() => su('google')}>
            <SegnoGoogle /> Continua con Google
          </button>
        )}
        {APPLE && (
          <button type="button" className="azione azione-vuota provider-voce"
            onClick={() => su('apple')}>
            <SegnoApple /> Continua con Apple
          </button>
        )}
      </div>
      <p className="oppure"><span>oppure</span></p>
    </>
  )
}

const SegnoGoogle = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
    <path fill="#4285F4" d="M17.6 9.2c0-.6-.05-1.2-.16-1.8H9v3.4h4.8a4.1 4.1 0 0 1-1.8 2.7v2.2h2.9c1.7-1.6 2.7-3.9 2.7-6.5Z" />
    <path fill="#34A853" d="M9 18c2.4 0 4.5-.8 6-2.2l-2.9-2.2c-.8.5-1.8.9-3.1.9-2.4 0-4.4-1.6-5.1-3.8H.9v2.3A9 9 0 0 0 9 18Z" />
    <path fill="#FBBC05" d="M3.9 10.7a5.4 5.4 0 0 1 0-3.4V5H.9a9 9 0 0 0 0 8l3-2.3Z" />
    <path fill="#EA4335" d="M9 3.6c1.3 0 2.5.5 3.4 1.3l2.6-2.6A9 9 0 0 0 .9 5l3 2.3C4.6 5.2 6.6 3.6 9 3.6Z" />
  </svg>
)

const SegnoApple = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M16.4 12.7c0-2.5 2-3.7 2.1-3.8-1.2-1.7-3-1.9-3.6-2-1.5-.2-3 .9-3.8.9-.8 0-2-.9-3.3-.8-1.7 0-3.2 1-4.1 2.5-1.7 3-.4 7.4 1.3 9.8.8 1.2 1.8 2.5 3.1 2.5 1.2 0 1.7-.8 3.2-.8s1.9.8 3.2.8c1.3 0 2.2-1.2 3-2.4.9-1.4 1.3-2.7 1.3-2.8 0 0-2.4-1-2.4-3.9ZM14 5.4c.7-.8 1.1-2 1-3.2-1 0-2.2.7-2.9 1.5-.6.7-1.2 1.9-1 3.1 1.1.1 2.2-.6 2.9-1.4Z" />
  </svg>
)

function Campo({ etichetta, valore, onChange, segnaposto, tipo = 'text', completa, mono, invio }: {
  etichetta: string; valore: string; onChange: (v: string) => void
  segnaposto: string; tipo?: string; completa?: string; mono?: boolean
  invio?: () => void
}) {
  return (
    <label className="campo ingresso-campo">
      <span className="campo-nome">{etichetta}</span>
      <input
        type={tipo} value={valore} onChange={(e) => onChange(e.target.value)}
        placeholder={segnaposto} autoComplete={completa}
        inputMode={mono ? 'numeric' : undefined}
        onKeyDown={(e) => { if (e.key === 'Enter' && invio) invio() }}
        style={mono ? { fontFamily: 'var(--mono)', letterSpacing: '.3em', fontSize: 20 } : undefined}
      />
    </label>
  )
}
