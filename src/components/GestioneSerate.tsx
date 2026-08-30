'use client'
import { useState } from 'react'
import { Bottone, Etichetta } from './base.tsx'
import { CampoLuogo, type LuogoScelto } from './CampoLuogo.tsx'

/**
 * Inserire le serate.
 *
 * Nel primo anno qualcuno deve farlo a mano, e quel qualcuno sei tu. Il
 * modulo è essenziale apposta: se inserire una serata costa più di trenta
 * secondi non ne verranno inserite, e la schermata iniziale resterà vuota
 * proprio nei mesi in cui è l'unica cosa da guardare.
 */
export function GestioneSerate({ esistenti }: {
  esistenti: Array<{ id: string; locale: string; citta: string; inizio: string; corse: number }>
}) {
  const [locale, setLocale] = useState('')
  const [luogo, setLuogo] = useState<LuogoScelto | null>(null)
  const [inizio, setInizio] = useState('')
  const [titolo, setTitolo] = useState('')
  const [invio, setInvio] = useState(false)

  return (
    <main style={{ maxWidth: 520, margin: '0 auto', padding: '24px 20px 60px' }}>
      <h1 style={{ fontSize: 26, marginBottom: 6 }}>Serate</h1>
      <p style={{ margin: '0 0 24px', color: 'var(--inchiostro-2)', fontSize: 14.5, lineHeight: 1.55 }}>
        Compaiono in home. Quelle con zero passaggi sono le più utili: è lì
        che serve un conducente.
      </p>

      <div style={{
        border: '1px solid var(--riga)', borderRadius: 'var(--raggio)',
        background: 'var(--superficie)', padding: '18px 20px', marginBottom: 28,
      }}>
        <Campo etichetta="Locale" valore={locale} onChange={setLocale} segnaposto="Fabrique" />
        <CampoLuogo etichetta="Dove" valore={luogo} onScegli={setLuogo}
          segnaposto="via Gaudenzio Fantoli 9, Milano" />
        <Campo etichetta="Quando apre" valore={inizio} onChange={setInizio}
          segnaposto="" tipo="datetime-local" />
        <Campo etichetta="Titolo della serata (facoltativo)" valore={titolo}
          onChange={setTitolo} segnaposto="Nomeansiao" />

        <Bottone
          disabled={!locale || !luogo || !inizio || invio}
          onClick={async () => {
            setInvio(true)
            const r = await fetch('/api/serate', {
              method: 'POST', headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                locale, citta: luogo!.etichetta.split(',').pop()?.trim() ?? '',
                indirizzo: luogo!.etichetta, lat: luogo!.lat, lng: luogo!.lng,
                inizio, titolo,
              }),
            })
            setInvio(false)
            if (r.ok) window.location.reload()
          }}
        >{invio ? '…' : 'Aggiungi'}</Bottone>
      </div>

      {/* Popolare i posti di una zona nuova. Si fa una volta per provincia:
          Overpass è un servizio comunitario e non va interrogato di
          continuo. */}
      <div style={{
        border: '1px dashed var(--riga)', borderRadius: 'var(--raggio)',
        padding: '16px 18px', marginBottom: 28,
      }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
          Aprire una zona nuova
        </div>
        <p style={{ margin: '0 0 12px', fontSize: 13.5, color: 'var(--tenue)', lineHeight: 1.5 }}>
          Scarica da OpenStreetMap discoteche, cinema, stazioni e il resto nel
          raggio di 25 km dal punto indicato sopra. Si fa una volta.
        </p>
        <button
          disabled={!luogo || invio}
          onClick={async () => {
            setInvio(true)
            const r = await fetch('/api/posti', {
              method: 'POST', headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ lat: luogo!.lat, lng: luogo!.lng }),
            })
            const d = await r.json()
            setInvio(false)
            alert(r.ok ? `${d.nuovi} posti importati su ${d.trovati} trovati` : 'Non è andata')
          }}
          style={{
            width: '100%', padding: '11px', borderRadius: 'var(--raggio-s)',
            border: '1px solid var(--riga)', background: 'var(--superficie)',
            color: 'var(--inchiostro)', fontWeight: 600, fontSize: 14.5,
          }}
        >Importa i posti attorno al punto scelto</button>
      </div>

      <Etichetta>in programma</Etichetta>
      <div style={{ marginTop: 10 }}>
        {esistenti.length === 0 && (
          <p style={{ color: 'var(--tenue)', fontSize: 14.5 }}>Nessuna ancora.</p>
        )}
        {esistenti.map((s) => (
          <div key={s.id} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '13px 2px', borderBottom: '1px solid var(--riga-2)', gap: 12,
          }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{s.locale}</div>
              <div style={{ fontSize: 13, color: 'var(--tenue)' }}>
                {s.citta} · {new Date(s.inizio).toLocaleString('it-IT', {
                  weekday: 'short', day: 'numeric', month: 'short',
                  hour: '2-digit', minute: '2-digit',
                })}
              </div>
            </div>
            <span style={{
              flexShrink: 0, fontSize: 13, fontWeight: 600,
              color: s.corse > 0 ? 'var(--verde)' : 'var(--accento)',
            }}>
              {s.corse > 0 ? `${s.corse} passaggi` : 'nessuno'}
            </span>
          </div>
        ))}
      </div>
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
      background: 'var(--carta)',
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
