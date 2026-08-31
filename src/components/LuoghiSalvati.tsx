'use client'
import { useState } from 'react'
import { CampoLuogo, type LuogoScelto } from './CampoLuogo.tsx'

/**
 * Casa, lavoro, e gli altri.
 *
 * L'ordine non è alfabetico e non è per data: casa e lavoro stanno in cima
 * sempre, anche quando non esistono ancora — sono due righe vuote che
 * chiedono di essere riempite, e chiedere è più efficace di un pulsante
 * «aggiungi» che non dice cosa aggiungere.
 */

export interface Salvato {
  id: string
  etichetta: string
  indirizzo: string
  lat: number
  lng: number
  tipo: 'casa' | 'lavoro' | 'altro'
}

const SEGNI: Record<string, string> = { casa: '⌂', lavoro: '▤', altro: '★' }

export function LuoghiSalvati({ iniziali, mappa = false }: {
  iniziali: Salvato[]
  mappa?: boolean
}) {
  const [luoghi, setLuoghi] = useState(iniziali)
  const [apre, setApre] = useState<'casa' | 'lavoro' | 'altro' | null>(null)
  const [scelto, setScelto] = useState<LuogoScelto | null>(null)
  const [nome, setNome] = useState('')

  const trova = (t: string) => luoghi.find((l) => l.tipo === t)
  const casa = trova('casa')
  const lavoro = trova('lavoro')
  const altri = luoghi.filter((l) => l.tipo === 'altro')

  async function salva(tipo: 'casa' | 'lavoro' | 'altro') {
    if (!scelto) return
    const etichetta = tipo === 'altro'
      ? (nome.trim() || scelto.etichetta)
      : tipo === 'casa' ? 'Casa' : 'Lavoro'

    const r = await fetch('/api/preferiti', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        etichetta, indirizzo: scelto.etichetta, lat: scelto.lat, lng: scelto.lng, tipo,
      }),
    })
    if (!r.ok) return
    const { id } = await r.json()
    setLuoghi((v) => [
      ...v.filter((l) => tipo === 'altro' || l.tipo !== tipo),
      { id, etichetta, indirizzo: scelto.etichetta, lat: scelto.lat, lng: scelto.lng, tipo },
    ])
    setApre(null); setScelto(null); setNome('')
  }

  async function dimentica(id: string) {
    await fetch('/api/preferiti', {
      method: 'DELETE', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setLuoghi((v) => v.filter((l) => l.id !== id))
  }

  return (
    <section>

      <div style={{ display: 'grid', gap: 2 }}>
        <Riga tipo="casa" luogo={casa}
          onApri={() => setApre('casa')} onTogli={dimentica} />
        <Riga tipo="lavoro" luogo={lavoro}
          onApri={() => setApre('lavoro')} onTogli={dimentica} />
        {altri.map((l) => (
          <Riga key={l.id} tipo="altro" luogo={l}
            onApri={() => setApre('altro')} onTogli={dimentica} />
        ))}
      </div>

      <button onClick={() => { setApre('altro'); setScelto(null); setNome('') }}
        style={{
          background: 'none', border: 'none', color: 'var(--accento)',
          fontSize: 14, fontWeight: 600, padding: '14px 2px 0',
        }}>Aggiungine un altro</button>

      {apre && (
        <>
          <div className="velo" onClick={() => setApre(null)} />
          <div className="foglio">
            <div className="maniglia" />
            <h2 style={{ fontSize: 20, marginBottom: 14 }}>
              {apre === 'casa' ? 'Dove abiti' : apre === 'lavoro' ? 'Dove lavori' : 'Un altro posto'}
            </h2>

            {apre === 'altro' && (
              <label style={{
                display: 'block', marginBottom: 12, padding: '12px 16px',
                border: '1px solid var(--riga)', borderRadius: 'var(--raggio-s)',
                background: 'var(--superficie)',
              }}>
                <span style={{ display: 'block', fontSize: 12, color: 'var(--tenue)' }}>
                  Come lo chiami
                </span>
                <input value={nome} onChange={(e) => setNome(e.target.value)}
                  placeholder="Palestra, casa di Marta…"
                  style={{
                    width: '100%', border: 'none', background: 'transparent',
                    padding: '3px 0 0', fontSize: 16, fontFamily: 'var(--testo)',
                    color: 'var(--inchiostro)', outline: 'none',
                  }} />
              </label>
            )}

            <CampoLuogo mappa={mappa} etichetta="Indirizzo" valore={scelto}
              onScegli={setScelto} segnaposto="Via Fanfulla 12, Lodi" />

            <button
              disabled={!scelto}
              onClick={() => salva(apre)}
              className="tocco"
              style={{
                width: '100%', marginTop: 8, borderRadius: 'var(--raggio-s)',
                padding: '13px', border: 'none', fontWeight: 600, fontSize: 16,
                background: scelto ? 'var(--accento)' : 'var(--superficie-2)',
                color: scelto ? 'var(--su-accento)' : 'var(--tenue)',
              }}>Salva</button>
          </div>
        </>
      )}
    </section>
  )
}

function Riga({ tipo, luogo, onApri, onTogli }: {
  tipo: 'casa' | 'lavoro' | 'altro'
  luogo?: Salvato
  onApri: () => void
  onTogli: (id: string) => void
}) {
  const nome = luogo?.etichetta ?? (tipo === 'casa' ? 'Casa' : 'Lavoro')

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 13,
      padding: '13px 2px', borderBottom: '1px solid var(--riga-2)',
    }}>
      <span style={{
        flexShrink: 0, width: 22, textAlign: 'center', fontSize: 15,
        color: luogo ? 'var(--accento)' : 'var(--tenue)',
      }}>{SEGNI[tipo]}</span>

      <button onClick={onApri} style={{
        flexGrow: 1, minWidth: 0, textAlign: 'left',
        background: 'none', border: 'none', padding: 0,
      }}>
        <span style={{ display: 'block', fontSize: 15.5, color: 'var(--inchiostro)' }}>
          {nome}
        </span>
        <span style={{
          display: 'block', fontSize: 13, color: 'var(--tenue)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {/* La riga vuota chiede di essere riempita invece di nascondersi:
              «Aggiungi» non dice cosa aggiungere, «Non l'hai ancora messa» sì. */}
          {luogo?.indirizzo ?? 'Non l’hai ancora messa'}
        </span>
      </button>

      {luogo && (
        <button onClick={() => onTogli(luogo.id)} aria-label={`Togli ${nome}`}
          style={{
            flexShrink: 0, background: 'none', border: 'none',
            color: 'var(--tenue)', fontSize: 18, padding: '4px 6px',
          }}>×</button>
      )}
    </div>
  )
}
