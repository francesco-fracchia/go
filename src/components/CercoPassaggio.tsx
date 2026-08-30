'use client'
import { useState } from 'react'
import { Bottone, Etichetta } from './base.tsx'

/**
 * «Cerco un passaggio».
 *
 * È l'altra metà del mercato, ed è quella che nel primo anno tiene in piedi
 * tutto. Senza, chi cerca in un momento vuoto se ne va e non torna, e non
 * saprà mai che il giorno dopo qualcuno ha pubblicato esattamente la sua
 * tratta. Chi guida, dal canto suo, non ha modo di sapere che c'era qualcuno
 * disposto a pagargli la benzina.
 *
 * Il campo che conta più di tutti è la flessibilità: chi accetta di partire
 * un'ora prima trova un passaggio molte più volte di chi vuole le 23:30
 * esatte, e va detto mentre lo si compila.
 */
export function CercoPassaggio() {
  const [origine, setOrigine] = useState('')
  const [destinazione, setDestinazione] = useState('')
  const [quando, setQuando] = useState('')
  const [flessibilita, setFlessibilita] = useState(60)
  const [posti, setPosti] = useState(1)
  const [inviato, setInviato] = useState(false)

  if (inviato) {
    return (
      <main style={{ maxWidth: 440, margin: '0 auto', padding: '60px 24px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 26, marginBottom: 10 }}>Ci pensiamo noi</h1>
        <p style={{ color: 'var(--inchiostro-2)', fontSize: 15.5, lineHeight: 1.6 }}>
          Appena qualcuno pubblica un passaggio compatibile ti avvisiamo. E chi
          guida su quella tratta vede che stai cercando: capita spesso che sia
          quello a far nascere la corsa.
        </p>
      </main>
    )
  }

  return (
    <main style={{ maxWidth: 480, margin: '0 auto', padding: '20px 20px 40px' }}>
      <h1 style={{ fontSize: 26, marginBottom: 6 }}>Cerchi un passaggio?</h1>
      <p style={{ margin: '0 0 24px', color: 'var(--inchiostro-2)', fontSize: 15, lineHeight: 1.55 }}>
        Dillo. Chi guida su quella tratta lo vede, e ti avvisiamo appena
        compare qualcosa.
      </p>

      <Campo etichetta="Parti da" valore={origine} onChange={setOrigine}
        segnaposto="Lodi, piazza della Vittoria" />
      <Campo etichetta="Vai a" valore={destinazione} onChange={setDestinazione}
        segnaposto="Fabrique, Milano" />
      <Campo etichetta="Vuoi essere lì" valore={quando} onChange={setQuando}
        segnaposto="" tipo="datetime-local" />

      <Etichetta>quanto puoi aspettare</Etichetta>
      <div style={{ display: 'flex', gap: 8, margin: '10px 0 8px' }}>
        {[30, 60, 120, 180].map((m) => (
          <button key={m} onClick={() => setFlessibilita(m)} className="tocco" style={{
            flex: 1, padding: '13px 0', borderRadius: 'var(--raggio-s)',
            border: `1px solid ${flessibilita === m ? 'transparent' : 'var(--riga)'}`,
            background: flessibilita === m ? 'var(--accento)' : 'var(--superficie)',
            color: flessibilita === m ? 'var(--su-accento)' : 'var(--inchiostro)',
            fontWeight: 600, fontSize: 14.5,
          }}>{m < 60 ? `${m} min` : `${m / 60} h`}</button>
        ))}
      </div>
      <p style={{ fontSize: 13, color: 'var(--tenue)', margin: '0 0 22px', lineHeight: 1.5 }}>
        {flessibilita >= 120
          ? 'Con questa elasticità troverai un passaggio molte più volte.'
          : 'Più sei elastico, più passaggi ti proponiamo.'}
      </p>

      <Etichetta>in quanti siete</Etichetta>
      <div style={{ display: 'flex', gap: 8, margin: '10px 0 24px' }}>
        {[1, 2, 3, 4].map((n) => (
          <button key={n} onClick={() => setPosti(n)} className="tocco" style={{
            flex: 1, padding: '13px 0', borderRadius: 'var(--raggio-s)',
            border: `1px solid ${posti === n ? 'transparent' : 'var(--riga)'}`,
            background: posti === n ? 'var(--accento)' : 'var(--superficie)',
            color: posti === n ? 'var(--su-accento)' : 'var(--inchiostro)',
            fontWeight: 700, fontSize: 17, fontFamily: 'var(--titoli)',
          }}>{n}</button>
        ))}
      </div>

      <Bottone
        disabled={!origine || !destinazione || !quando}
        onClick={async () => {
          await fetch('/api/richieste', {
            method: 'POST', headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              origineLabel: origine, destinazioneLabel: destinazione,
              oraArrivo: quando, flessibilitaMin: flessibilita, posti,
            }),
          })
          setInviato(true)
        }}
      >Avvisami</Bottone>
    </main>
  )
}

function Campo({ etichetta, valore, onChange, segnaposto, tipo = 'text' }: {
  etichetta: string; valore: string; onChange: (v: string) => void
  segnaposto: string; tipo?: string
}) {
  return (
    <label style={{
      display: 'block', marginBottom: 12, padding: '12px 16px',
      border: '1px solid var(--riga)', borderRadius: 'var(--raggio-s)',
      background: 'var(--superficie)',
    }}>
      <span style={{ display: 'block', fontSize: 12, color: 'var(--tenue)' }}>{etichetta}</span>
      <input type={tipo} value={valore} onChange={(e) => onChange(e.target.value)}
        placeholder={segnaposto}
        style={{
          width: '100%', border: 'none', background: 'transparent', padding: '3px 0 0',
          fontSize: 16, fontFamily: 'var(--testo)', color: 'var(--inchiostro)', outline: 'none',
        }} />
    </label>
  )
}
