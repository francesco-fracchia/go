'use client'
import { useState } from 'react'
import { euro } from './base.tsx'
import { SegnoAvanti } from './segni.tsx'

/**
 * Segnalare, e prima di tutto scendere.
 *
 * L'ordine di questa schermata è la cosa che conta. Nel momento in cui uno
 * sta per salire con chi ha bevuto, la risposta giusta dell'applicazione
 * non è raccogliere un'accusa: è NON FARLO SALIRE. Una penale in quel
 * momento è un pedaggio per mettersi in salvo, e chi ci pensa due volte
 * per non perdere tre euro è esattamente la persona che non vogliamo far
 * salire.
 *
 * Così la segnalazione smette di essere un giudizio su un altro — che è la
 * cosa che mette a disagio, ed è il motivo per cui quasi nessuno le fa — e
 * diventa una protezione per sé. Chi ha davvero paura la usa. Chi voleva
 * solo vendicarsi non ci trova quello che cercava, perché non c'è niente
 * da pubblicare.
 */

interface Motivo { v: string; t: string; n: string; grave: boolean }

const MOTIVI: Motivo[] = [
  { v: 'alcol', grave: true, t: 'Ha bevuto',
    n: 'O è sotto effetto di qualcosa. Non salire, e non farti problemi.' },
  { v: 'guida_pericolosa', grave: true, t: 'Guida in modo pericoloso',
    n: 'Velocità, telefono in mano, sorpassi: qualsiasi cosa ti abbia spaventato.' },
  { v: 'molestia', grave: true, t: 'Si è comportato male con me',
    n: 'Parole, insistenza, contatto fisico. Qualunque cosa ti abbia messo a disagio.' },
  { v: 'noshow', grave: false, t: 'Non si è presentato',
    n: 'Ti ha lasciato lì senza avvisare.' },
  { v: 'altro', grave: false, t: 'Altro',
    n: 'Raccontacelo e lo guardiamo.' },
]

export function Segnala({ prenotazione, chi, quando, rimborsabileCent, disdicibile }: {
  prenotazione: string
  chi: string
  quando: string
  /** quanto tornerebbe indietro scendendo adesso */
  rimborsabileCent: number
  /** se la prenotazione è ancora in uno stato che si può disdire */
  disdicibile: boolean
}) {
  const [motivo, setMotivo] = useState<Motivo | null>(null)
  const [nota, setNota] = useState('')
  const [attesa, setAttesa] = useState(false)
  const [fatto, setFatto] = useState<{ disdetta: boolean; rimborso: number | null } | null>(null)
  const [errore, setErrore] = useState<string | null>(null)

  async function manda(ritirati: boolean) {
    if (!motivo) return
    setAttesa(true); setErrore(null)
    try {
      const r = await fetch('/api/segnalazioni', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ prenotazione, tipo: motivo.v, nota, ritirati }),
      })
      const d = await r.json()
      if (!r.ok) { setErrore(d.errore ?? 'Non ci siamo riusciti.'); return }
      setFatto({ disdetta: d.disdettaSenzaPenale, rimborso: d.rimborsatoCent })
    } finally { setAttesa(false) }
  }

  if (fatto) {
    return (
      <div className="fascia"><div className="dentro dentro-stretto" style={{ padding: 'var(--s8) 0' }}>
        <h1 className="t-titolo">
          {fatto.disdetta ? 'Sei fuori da questo viaggio' : 'L’abbiamo ricevuta'}
        </h1>
        <p className="t-guida" style={{ margin: 'var(--s4) 0 var(--s6)' }}>
          {fatto.disdetta
            ? `Non paghi niente${fatto.rimborso ? `: ti tornano ${euro(fatto.rimborso)}` : ''}. La leggiamo noi, e nessuno saprà che sei stato tu.`
            : 'La legge una persona, non un filtro. Non compare da nessuna parte e nessuno saprà che sei stato tu.'}
        </p>
        {fatto.disdetta && (
          <a href="/cerca" className="azione azione-piena" style={{ width: '100%' }}>
            Cerca un altro passaggio <SegnoAvanti dimensione={16} />
          </a>
        )}
        <p className="t-nota" style={{ marginTop: 'var(--s6)' }}>
          Se sei in pericolo adesso, chiama il <strong>112</strong>. GO non è
          un servizio di emergenza e non arriva in tempo.
        </p>
      </div></div>
    )
  }

  return (
    <div className="fascia"><div className="dentro dentro-stretto" style={{ padding: 'var(--s7) 0 var(--s9)' }}>
      <h1 className="t-titolo">Cos&apos;è successo?</h1>
      <p className="t-guida" style={{ margin: 'var(--s4) 0 var(--s6)' }}>
        Con {chi}, {quando}. Quello che scrivi qui non compare da nessuna
        parte: lo leggiamo noi.
      </p>

      <div className="elenco-motivi">
        {MOTIVI.map((m) => (
          <button key={m.v} type="button"
            className={`motivo${motivo?.v === m.v ? ' motivo-scelto' : ''}`}
            onClick={() => setMotivo(m)}>
            <span className="motivo-titolo">{m.t}</span>
            <span className="motivo-nota">{m.n}</span>
          </button>
        ))}
      </div>

      {motivo && (
        <>
          {/* ── La via d'uscita, PRIMA della domanda ── */}
          {motivo.grave && disdicibile && (
            <div className="uscita-sicura">
              <p className="t-blocco">Prima di tutto: non salire.</p>
              <p className="t-guida" style={{ margin: 'var(--s3) 0 var(--s5)' }}>
                Puoi uscire da questo viaggio adesso, senza pagare niente.
                {rimborsabileCent > 0 && ` Ti tornano ${euro(rimborsabileCent)}.`}
                {' '}Nessuna penale, nessuna spiegazione da dare a chi guida.
              </p>
              <button type="button" className="azione azione-piena"
                style={{ width: '100%' }} aria-disabled={attesa}
                onClick={() => manda(true)}>
                {attesa ? 'Un attimo…' : 'Esci dal viaggio e segnala'}
              </button>
            </div>
          )}

          <label className="campo" style={{ marginTop: 'var(--s6)' }}>
            <span className="campo-nome">Vuoi dirci com&apos;è andata? Facoltativo</span>
            <textarea value={nota} rows={4} placeholder="Che ora era, cosa è successo…"
              onChange={(e) => setNota(e.target.value)} />
          </label>

          {errore && <p className="errore">{errore}</p>}

          <button type="button"
            className={`azione ${motivo.grave && disdicibile ? 'azione-vuota' : 'azione-piena'}`}
            style={{ width: '100%', marginTop: 'var(--s5)' }} aria-disabled={attesa}
            onClick={() => manda(false)}>
            {attesa ? 'Un attimo…'
              : motivo.grave && disdicibile ? 'Segnala soltanto, resto sul viaggio' : 'Manda la segnalazione'}
          </button>

          <p className="t-nota" style={{ marginTop: 'var(--s5)' }}>
            Una segnalazione da sola non chiude nessun account: la guardiamo,
            e sentiamo anche l&apos;altra persona prima di decidere. Se sei in
            pericolo adesso, chiama il <strong>112</strong>.
          </p>
        </>
      )}
    </div></div>
  )
}
