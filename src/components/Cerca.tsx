'use client'
import { useState } from 'react'
import { Marchio } from './Marchio.tsx'
import { Bottone, Etichetta } from './base.tsx'
import { CampoLuogo, type LuogoScelto } from './CampoLuogo.tsx'

/**
 * La prima schermata.
 *
 * Deve fare due cose che di solito si escludono: far cercare un passaggio
 * in tre tocchi, e far capire in due secondi che si può anche offrirlo.
 * Un'applicazione di carpooling che al primo avvio parla solo a chi cerca
 * non avrà mai niente da mostrargli.
 *
 * L'ancora è l'ORA DI ARRIVO, come in pubblicazione: chi esce la sera sa a
 * che ora vuole essere al locale, non a che ora deve partire.
 */

export interface Serata {
  id: string
  locale: string
  citta: string
  quando: string
  corsePubblicate: number
}

export function Cerca({ serate = [], destinazione }: {
  serate?: Serata[]
  destinazione?: LuogoScelto
}) {
  const [da, setDa] = useState<LuogoScelto | null>(null)
  const [a, setA] = useState<LuogoScelto | null>(destinazione ?? null)
  const [quando, setQuando] = useState('')

  return (
    <main style={{ maxWidth: 480, margin: '0 auto', padding: '20px 20px 40px' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 28 }}>
        <Marchio dimensione={36} />
        <div>
          <div style={{
            fontFamily: 'var(--titoli)', fontWeight: 700, fontSize: 20,
            letterSpacing: '-.03em', lineHeight: 1,
          }}>GO</div>
          <div style={{ fontSize: 12.5, color: 'var(--tenue)', marginTop: 2 }}>
            Se vai comunque, vai insieme.
          </div>
        </div>
      </header>

      {/* ── La ricerca. Tre campi, nessuno facoltativo, nessuno in più. ── */}
      <CampoLuogo etichetta="Parti da" valore={da} onScegli={setDa}
        segnaposto="Lodi, piazza della Vittoria" />
      <CampoLuogo etichetta="Vai a" valore={a} onScegli={setA}
        segnaposto="Fabrique, Milano" />
      <Campo etichetta="Vuoi essere lì" valore={quando} onChange={setQuando}
        segnaposto="" tipo="datetime-local" />

      <Bottone
        disabled={!da || !a || !quando}
        onClick={() => {
          const arrivo = new Date(quando)
          const p = new URLSearchParams({
            olat: String(da!.lat), olng: String(da!.lng),
            dlat: String(a!.lat), dlng: String(a!.lng),
            // Finestra attorno all'ora richiesta: chi vuole essere lì alle
            // 23:30 accetta volentieri di arrivare alle 22:45.
            da: new Date(arrivo.getTime() - 90 * 60_000).toISOString(),
            a: new Date(arrivo.getTime() + 45 * 60_000).toISOString(),
          })
          window.location.href = `/cerca?${p}`
        }}
      >Cerca</Bottone>

      {/* ── L'altra metà del mercato, non nascosta in un menu ── */}
      <a href="/pubblica" style={{ textDecoration: 'none' }}>
        <div style={{
          marginTop: 12, background: 'var(--accento-velo)',
          border: '1px solid var(--accento-riga)', borderRadius: 'var(--raggio)',
          padding: '16px 18px',
        }}>
          <div style={{ fontWeight: 600, fontSize: 16, fontFamily: 'var(--titoli)' }}>
            Ci vai in macchina?
          </div>
          <div style={{ fontSize: 14, color: 'var(--inchiostro-2)', marginTop: 3, lineHeight: 1.45 }}>
            Offri i posti vuoti e rientri di gran parte della benzina. Se non
            li prende nessuno, parti come avresti fatto comunque.
          </div>
        </div>
      </a>

      {/* ── Dove si va ──
          Risolve il problema di chi apre l'applicazione senza un indirizzo
          in mente: il sabato pomeriggio nessuno pensa «via Fantoli 9»,
          pensa «stasera si esce». ── */}
      <a href="/posti" style={{ textDecoration: 'none' }}>
        <div style={{
          marginTop: 12, padding: '15px 18px', borderRadius: 'var(--raggio)',
          border: '1px solid var(--riga)', background: 'var(--superficie)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
        }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15.5, color: 'var(--inchiostro)' }}>
              Non sai da dove partire?
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--tenue)', marginTop: 2 }}>
              Discoteche, cinema, stazioni, piazze qui intorno
            </div>
          </div>
          <span style={{ color: 'var(--tenue)', fontSize: 20 }}>›</span>
        </div>
      </a>

      {/* ── Le serate.
          Risolve due problemi in un blocco solo: dà qualcosa da guardare
          quando la ricerca è vuota, e dice ad agosto — quando le discoteche
          chiudono — che l'applicazione è ancora viva. Senza, il primo anno
          è una casella di testo su fondo bianco. ── */}
      {serate.length > 0 && (
        <section style={{ marginTop: 30 }}>
          <Etichetta>dove si va</Etichetta>
          <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
            {serate.map((s) => (
              <a key={s.id} href={`/serata/${s.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{
                  background: 'var(--superficie)', border: '1px solid var(--riga)',
                  borderRadius: 'var(--raggio-s)', padding: '13px 16px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{s.locale}</div>
                    <div style={{ fontSize: 13, color: 'var(--tenue)' }}>
                      {s.citta} · {s.quando}
                    </div>
                  </div>
                  <div style={{
                    flexShrink: 0, fontSize: 13, fontWeight: 600,
                    color: s.corsePubblicate > 0 ? 'var(--verde)' : 'var(--tenue)',
                  }}>
                    {s.corsePubblicate > 0
                      ? `${s.corsePubblicate} ${s.corsePubblicate === 1 ? 'passaggio' : 'passaggi'}`
                      : 'nessuno ancora'}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}

function Campo({ etichetta, valore, onChange, segnaposto, tipo = 'text' }: {
  etichetta: string; valore: string
  onChange: (v: string) => void; segnaposto: string; tipo?: string
}) {
  return (
    <label style={{
      display: 'block', marginBottom: 12, padding: '12px 16px',
      border: '1px solid var(--riga)', borderRadius: 'var(--raggio-s)',
      background: 'var(--superficie)',
    }}>
      <span style={{
        display: 'block', fontSize: 12, color: 'var(--tenue)', marginBottom: 1,
      }}>{etichetta}</span>
      <input
        type={tipo}
        value={valore}
        onChange={(e) => onChange(e.target.value)}
        placeholder={segnaposto}
        style={{
          width: '100%', border: 'none', background: 'transparent', padding: '3px 0 0',
          fontSize: 16, fontFamily: 'var(--testo)', color: 'var(--inchiostro)',
          outline: 'none',
        }}
      />
    </label>
  )
}
