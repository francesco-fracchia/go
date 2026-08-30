'use client'
import { useState } from 'react'
import { Etichetta } from './base.tsx'
import type { Categoria, Posto } from '../server/posti.ts'

/**
 * Dove si va.
 *
 * Risolve un problema che né la ricerca né la mappa risolvono: **non sapere
 * cosa scrivere**. Chi apre l'applicazione il sabato pomeriggio non ha in
 * mente un indirizzo, ha in mente «stasera si esce» — e una casella di
 * testo vuota non lo aiuta.
 *
 * Da ogni posto partono due azioni, una per lato del mercato:
 *   chi guida       pubblica una corsa già compilata verso quel posto
 *   chi cerca       vede i passaggi che ci vanno, o si mette in lista
 *
 * L'ordine non è per fama — OpenStreetMap non sa quanto un posto sia
 * frequentato e non fingiamo di saperlo. È per quante corse ci vanno SU GO,
 * poi per quante persone lo stanno cercando, poi per distanza. Al lancio
 * quei numeri sono zero ovunque, ed è il punto: un posto dove qualcuno
 * cerca e nessuno va è l'informazione più utile che possiamo dare.
 */

const CATEGORIE: Array<{ v: Categoria | 'tutte'; t: string }> = [
  { v: 'tutte', t: 'Tutti' },
  { v: 'discoteca', t: 'Discoteche' },
  { v: 'bar', t: 'Bar' },
  { v: 'ristorante', t: 'Ristoranti' },
  { v: 'cinema', t: 'Cinema' },
  { v: 'centro_commerciale', t: 'Centri commerciali' },
  { v: 'piazza', t: 'Piazze' },
  { v: 'stazione', t: 'Stazioni' },
  { v: 'aeroporto', t: 'Aeroporti' },
  { v: 'stadio', t: 'Stadi' },
  { v: 'universita', t: 'Università' },
  { v: 'palestra', t: 'Palestre' },
]

export function Posti({ iniziali, categoriaIniziale }: {
  iniziali: Posto[]
  categoriaIniziale?: Categoria
}) {
  const [categoria, setCategoria] = useState<Categoria | 'tutte'>(categoriaIniziale ?? 'tutte')
  const [posti, setPosti] = useState(iniziali)
  const [caricando, setCaricando] = useState(false)
  const [vicino, setVicino] = useState(false)

  const [posizione, setPosizione] = useState<{ lat: number; lng: number } | null>(null)

  async function carica(c: Categoria | 'tutte', p = posizione) {
    setCaricando(true)
    try {
      const q = new URLSearchParams()
      if (c !== 'tutte') q.set('categoria', c)
      if (p) { q.set('lat', String(p.lat)); q.set('lng', String(p.lng)) }
      const r = await fetch(`/api/posti?${q}`)
      const d = await r.json()
      setPosti(d.posti ?? [])
    } finally { setCaricando(false) }
  }

  async function cambia(c: Categoria | 'tutte') {
    setCategoria(c)
    await carica(c)
  }

  /**
   * La posizione si chiede solo se la si tocca.
   *
   * Chiederla all'apertura fa comparire il permesso del browser prima che
   * l'utente abbia capito perché serve — e una volta negato non lo si
   * richiede più. Senza, si mostrano i posti attorno al centro predefinito,
   * che in una provincia è già quasi giusto.
   */
  function usaPosizione() {
    if (!navigator.geolocation) return
    setCaricando(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setPosizione(p); setVicino(true); carica(categoria, p)
      },
      () => setCaricando(false),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600_000 },
    )
  }

  return (
    <main style={{ maxWidth: 480, margin: '0 auto', padding: '20px 0 40px' }}>
      <div style={{ padding: '0 20px' }}>
        <h1 style={{ fontSize: 26, marginBottom: 6 }}>Dove si va</h1>
        <p style={{ margin: '0 0 18px', color: 'var(--inchiostro-2)', fontSize: 15, lineHeight: 1.55 }}>
          I posti qui intorno. Scegline uno: se qualcuno ci va lo vedi, se
          nessuno ci va puoi dirlo.
        </p>
        {!vicino && (
          <button onClick={usaPosizione} style={{
            background: 'none', border: 'none', color: 'var(--accento)',
            fontSize: 14, fontWeight: 600, padding: '0 0 16px',
          }}>Usa la mia posizione</button>
        )}
      </div>

      {/* Le categorie scorrono in orizzontale: su un telefono una griglia di
          dodici voci occupa mezzo schermo prima di mostrare un solo posto. */}
      <div style={{
        display: 'flex', gap: 8, overflowX: 'auto', padding: '0 20px 16px',
        scrollbarWidth: 'none',
      }}>
        {CATEGORIE.map((c) => (
          <button key={c.v} onClick={() => cambia(c.v)} style={{
            flexShrink: 0, fontSize: 14, padding: '9px 15px', borderRadius: 999,
            border: `1px solid ${categoria === c.v ? 'transparent' : 'var(--riga)'}`,
            background: categoria === c.v ? 'var(--accento)' : 'var(--superficie)',
            color: categoria === c.v ? 'var(--su-accento)' : 'var(--inchiostro)',
            fontWeight: categoria === c.v ? 600 : 400, whiteSpace: 'nowrap',
          }}>{c.t}</button>
        ))}
      </div>

      <div style={{ padding: '0 20px' }}>
        {caricando && (
          <p style={{ color: 'var(--tenue)', fontSize: 14 }}>Un attimo…</p>
        )}

        {!caricando && posti.length === 0 && (
          <p style={{ color: 'var(--tenue)', fontSize: 14.5, lineHeight: 1.6 }}>
            Non abbiamo ancora i posti di questa zona. Cerca per indirizzo, o
            scrivici e la aggiungiamo.
          </p>
        )}

        <div style={{ display: 'grid', gap: 10 }}>
          {posti.map((p) => <Carta key={p.id} p={p} />)}
        </div>

        {posti.length > 0 && (
          <p style={{
            fontSize: 11.5, color: 'var(--tenue)', margin: '24px 0 0',
            lineHeight: 1.5,
          }}>
            Dati dei luoghi © contributori OpenStreetMap, licenza ODbL.
          </p>
        )}
      </div>
    </main>
  )
}

function Carta({ p }: { p: Posto }) {
  const km = p.distanzaM / 1000
  const distanza = km < 1
    ? `${Math.round(p.distanzaM / 100) * 100} m`
    : `${km.toFixed(km < 10 ? 1 : 0).replace('.', ',')} km`

  const versoIl = new URLSearchParams({
    dlat: String(p.lat), dlng: String(p.lng), dove: p.nome, cat: p.categoria,
  })

  return (
    <div style={{
      border: '1px solid var(--riga)', borderRadius: 'var(--raggio)',
      background: 'var(--superficie)', padding: '15px 17px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 16.5, fontWeight: 600, fontFamily: 'var(--titoli)', lineHeight: 1.3 }}>
            {p.nome}
          </div>
          <div style={{ fontSize: 13.5, color: 'var(--tenue)', marginTop: 2 }}>
            {[p.citta, distanza].filter(Boolean).join(' · ')}
          </div>
        </div>
        <div style={{ flexShrink: 0, textAlign: 'right' }}>
          {p.corse > 0 ? (
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--verde)' }}>
              {p.corse} {p.corse === 1 ? 'passaggio' : 'passaggi'}
            </span>
          ) : p.richieste > 0 ? (
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--accento)' }}>
              {p.richieste} {p.richieste === 1 ? 'cerca' : 'cercano'}
            </span>
          ) : (
            <span style={{ fontSize: 13.5, color: 'var(--tenue)' }}>nessuno</span>
          )}
        </div>
      </div>

      {/* Chi cerca qualcuno che lo porti è l'informazione che fa pubblicare
          un conducente: vale più di «ci vanno già in quattro». */}
      {p.richieste > 0 && p.corse > 0 && (
        <div style={{ fontSize: 13, color: 'var(--accento)', marginTop: 6 }}>
          e {p.richieste} {p.richieste === 1 ? 'persona cerca' : 'persone cercano'} un passaggio
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 13 }}>
        <a href={`/cerca?${versoIl}`} style={{ flex: 1, textDecoration: 'none' }}>
          <Azione testo={p.corse > 0 ? 'Vedi i passaggi' : 'Cerca un passaggio'} />
        </a>
        <a href={`/pubblica?${versoIl}`} style={{ flex: 1, textDecoration: 'none' }}>
          <Azione testo="Ci vado io" primaria />
        </a>
      </div>
    </div>
  )
}

function Azione({ testo, primaria }: { testo: string; primaria?: boolean }) {
  return (
    <div className="tocco" style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: 'var(--raggio-s)', padding: '11px 8px',
      border: `1px solid ${primaria ? 'transparent' : 'var(--riga)'}`,
      background: primaria ? 'var(--accento)' : 'var(--carta)',
      color: primaria ? 'var(--su-accento)' : 'var(--inchiostro)',
      fontSize: 14.5, fontWeight: 600, textAlign: 'center',
    }}>{testo}</div>
  )
}
