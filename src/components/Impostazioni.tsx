'use client'
import { useEffect, useState } from 'react'
import { Etichetta } from './base.tsx'
import { Carta, MetodoSalvato } from './Carta.tsx'

/**
 * Impostazioni.
 *
 * Poche cose, tutte con una conseguenza scritta accanto. «Notifiche: sì/no»
 * non dice a nessuno cosa perde spegnendole; «non ti avvisiamo se il
 * conducente non conferma» sì, ed è l'unica informazione su cui si può
 * decidere davvero.
 */

export interface DatiImpostazioni {
  push: boolean
  sms: boolean
  metodo: { marchio: string; ultime4: string | null } | null
}

export function Impostazioni({ iniziali }: { iniziali: DatiImpostazioni }) {
  const [push, setPush] = useState(iniziali.push)
  const [sms, setSms] = useState(iniziali.sms)
  const [metodo, setMetodo] = useState(iniziali.metodo)
  const [cambiaCarta, setCambiaCarta] = useState(false)
  const [tema, setTema] = useState('')

  useEffect(() => { setTema(localStorage.getItem('tema') ?? '') }, [])

  const salva = (campo: string, valore: boolean) =>
    fetch('/api/impostazioni', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ [campo]: valore }),
    })

  const applicaTema = (t: string) => {
    setTema(t)
    if (t) document.documentElement.dataset.tema = t
    else delete document.documentElement.dataset.tema
    try { localStorage.setItem('tema', t) } catch { /* finestra privata */ }
  }

  return (
    <main style={{ maxWidth: 480, margin: '0 auto', padding: '24px 20px 40px' }}>
      <h1 style={{ fontSize: 26, marginBottom: 24 }}>Impostazioni</h1>

      <Etichetta>come ti raggiungiamo</Etichetta>
      <div style={{ margin: '10px 0 24px' }}>
        <Interruttore
          titolo="Notifiche sull'applicazione"
          nota="Se le spegni non ti avvisiamo quando il conducente non conferma, e non possiamo cercarti un'alternativa in tempo."
          attivo={push}
          onCambia={(v) => { setPush(v); salva('push', v) }}
        />
        <Interruttore
          titolo="SMS nei momenti importanti"
          nota="Solo quando serve davvero: conducente che non conferma, corsa annullata, «sono qui». Mai per altro."
          attivo={sms}
          onCambia={(v) => { setSms(v); salva('sms', v) }}
        />
      </div>

      <Etichetta>pagamento</Etichetta>
      <div style={{ margin: '10px 0 24px' }}>
        {metodo && !cambiaCarta ? (
          <MetodoSalvato marchio={metodo.marchio} ultime4={metodo.ultime4}
            suCambia={() => setCambiaCarta(true)} />
        ) : (
          <Carta suSalvata={(m) => { setMetodo(m); setCambiaCarta(false) }} />
        )}
      </div>

      <Etichetta>aspetto</Etichetta>
      <div style={{ display: 'flex', gap: 8, margin: '10px 0 24px' }}>
        {[
          { v: '', t: 'Come il telefono' },
          { v: 'chiaro', t: 'Chiaro' },
          { v: 'scuro', t: 'Scuro' },
        ].map((o) => (
          <button key={o.v} onClick={() => applicaTema(o.v)} className="tocco" style={{
            flex: 1, padding: '13px 6px', borderRadius: 'var(--raggio-s)',
            border: `1px solid ${tema === o.v ? 'transparent' : 'var(--riga)'}`,
            background: tema === o.v ? 'var(--accento)' : 'var(--superficie)',
            color: tema === o.v ? 'var(--su-accento)' : 'var(--inchiostro)',
            fontSize: 14, fontWeight: 600,
          }}>{o.t}</button>
        ))}
      </div>

      <div style={{ marginTop: 30, paddingTop: 20, borderTop: '1px solid var(--riga-2)' }}>
        <a href="/api/esci" style={{
          display: 'block', padding: '14px 0', color: 'var(--rosso)',
          fontSize: 15.5, fontWeight: 600, textDecoration: 'none',
        }}>Esci</a>
      </div>
    </main>
  )
}

function Interruttore({ titolo, nota, attivo, onCambia }: {
  titolo: string; nota: string; attivo: boolean; onCambia: (v: boolean) => void
}) {
  return (
    <div style={{
      display: 'flex', gap: 14, alignItems: 'flex-start',
      padding: '15px 0', borderBottom: '1px solid var(--riga-2)',
    }}>
      <div style={{ flexGrow: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15.5, fontWeight: 600 }}>{titolo}</div>
        <div style={{ fontSize: 13, color: 'var(--tenue)', marginTop: 3, lineHeight: 1.5 }}>
          {nota}
        </div>
      </div>
      <button
        onClick={() => onCambia(!attivo)}
        role="switch" aria-checked={attivo} aria-label={titolo}
        style={{
          flexShrink: 0, width: 50, height: 30, borderRadius: 15, border: 'none',
          background: attivo ? 'var(--accento)' : 'var(--riga)',
          position: 'relative', transition: 'background .15s', marginTop: 2,
        }}
      >
        <span style={{
          position: 'absolute', top: 3, left: attivo ? 23 : 3,
          width: 24, height: 24, borderRadius: 12, background: '#fff',
          transition: 'left .15s', boxShadow: '0 1px 3px rgba(0,0,0,.2)',
        }} />
      </button>
    </div>
  )
}
