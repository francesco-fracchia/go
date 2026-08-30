'use client'
import { useEffect, useRef, useState } from 'react'

/**
 * La chat di una corsa.
 *
 * Una conversazione per corsa, non per coppia: chi sale è un gruppo che
 * viaggia insieme, e vedere che a bordo ci sono altre tre persone è metà
 * della ragione per cui ci si fida a salire con uno sconosciuto.
 *
 * Sopra il campo di scrittura ci sono tre frasi pronte. Non sono una
 * scorciatoia estetica: alle due di notte, al freddo, con una mano sola,
 * «Sono qui, dove sei?» digitata da zero non la scrive nessuno — e quel
 * messaggio non scritto è un passaggio perso.
 */

export interface Messaggio {
  id: string
  autore: string
  testo: string
  creatoIl: string
  nomeAutore: string
}

const PRONTE = ['Sono arrivato, dove sei?', 'Arrivo fra 5 minuti', 'Sto uscendo ora']

export function Chat({ corsaId, mio, iniziali, titolo }: {
  corsaId: string
  mio: string
  iniziali: Messaggio[]
  titolo: string
}) {
  const [messaggi, setMessaggi] = useState(iniziali)
  const [testo, setTesto] = useState('')
  const fondo = useRef<HTMLDivElement>(null)

  useEffect(() => { fondo.current?.scrollIntoView({ behavior: 'smooth' }) }, [messaggi.length])

  useEffect(() => {
    // Si ricontrolla ogni dieci secondi. Un canale in tempo reale sarebbe
    // più elegante, ma qui una conversazione dura pochi minuti e il costo
    // di tenere aperta una connessione per ogni corsa non vale l'eleganza.
    const t = setInterval(async () => {
      const r = await fetch(`/api/chat?corsa=${corsaId}`)
      if (!r.ok) return
      const d = await r.json()
      setMessaggi(d.messaggi.map(mappa))
    }, 10_000)
    return () => clearInterval(t)
  }, [corsaId])

  async function invia(t: string) {
    const pulito = t.trim()
    if (!pulito) return
    setTesto('')
    // Compare subito: su una rete lenta, alle due di notte, un messaggio
    // che non appare fa premere invio tre volte.
    const provvisorio: Messaggio = {
      id: `tmp-${Date.now()}`, autore: mio, testo: pulito,
      creatoIl: new Date().toISOString(), nomeAutore: 'Tu',
    }
    setMessaggi((m) => [...m, provvisorio])
    const r = await fetch('/api/chat', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ corsa: corsaId, testo: pulito }),
    })
    if (!r.ok) {
      setMessaggi((m) => m.filter((x) => x.id !== provvisorio.id))
      setTesto(pulito)
    }
  }

  return (
    <div className="conversazione">
      <header className="conversazione-testa">
        <div style={{ fontWeight: 600, fontSize: 16, fontFamily: 'var(--titoli)' }}>{titolo}</div>
        <div style={{ fontSize: 12.5, color: 'var(--tenue)' }}>
          Vedono tutti quelli che salgono
        </div>
      </header>

      <div style={{ flexGrow: 1, padding: '18px 20px', display: 'grid', gap: 10, alignContent: 'start' }}>
        {messaggi.length === 0 && (
          <p style={{ color: 'var(--tenue)', fontSize: 14, textAlign: 'center', margin: '30px 0' }}>
            Ancora niente. Un «ciao» prima di partire rende tutto più facile.
          </p>
        )}
        {messaggi.map((m) => {
          const mioMessaggio = m.autore === mio
          return (
            <div key={m.id} style={{
              alignSelf: mioMessaggio ? 'flex-end' : 'flex-start', maxWidth: '82%',
            }}>
              {!mioMessaggio && (
                <div style={{ fontSize: 12, color: 'var(--tenue)', marginBottom: 3, paddingLeft: 4 }}>
                  {m.nomeAutore}
                </div>
              )}
              <div style={{
                background: mioMessaggio ? 'var(--accento)' : 'var(--superficie)',
                color: mioMessaggio ? 'var(--su-accento)' : 'var(--inchiostro)',
                border: mioMessaggio ? '1px solid transparent' : '1px solid var(--riga)',
                borderRadius: 16, padding: '10px 14px', fontSize: 15, lineHeight: 1.45,
              }}>{m.testo}</div>
            </div>
          )
        })}
        <div ref={fondo} />
      </div>

      <div className="conversazione-piede">
        <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 9 }}>
          {PRONTE.map((p) => (
            <button key={p} onClick={() => invia(p)} style={{
              flexShrink: 0, fontSize: 13, padding: '7px 13px', borderRadius: 999,
              border: '1px solid var(--riga)', background: 'var(--carta)',
              color: 'var(--inchiostro-2)', whiteSpace: 'nowrap',
            }}>{p}</button>
          ))}
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); invia(testo) }}
          style={{ display: 'flex', gap: 9, alignItems: 'flex-end' }}
        >
          <input
            value={testo}
            onChange={(e) => setTesto(e.target.value)}
            placeholder="Scrivi…"
            style={{
              flexGrow: 1, padding: '12px 15px', fontSize: 16, fontFamily: 'var(--testo)',
              borderRadius: 999, border: '1px solid var(--riga)',
              background: 'var(--carta)', color: 'var(--inchiostro)', outline: 'none',
            }}
          />
          <button type="submit" disabled={!testo.trim()} className="tocco" style={{
            flexShrink: 0, width: 48, height: 48, borderRadius: 24, border: 'none',
            background: testo.trim() ? 'var(--accento)' : 'var(--superficie-2)',
            color: testo.trim() ? 'var(--su-accento)' : 'var(--tenue)',
            fontSize: 19, lineHeight: 1,
          }}>↑</button>
        </form>
      </div>
    </div>
  )
}

const mappa = (m: {
  id: string; autore: string; testo: string; creato_il: string
  profili?: { nome: string } | null
}): Messaggio => ({
  id: m.id, autore: m.autore, testo: m.testo,
  creatoIl: m.creato_il, nomeAutore: m.profili?.nome ?? '',
})
