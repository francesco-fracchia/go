'use client'
import { useState } from 'react'
import { Bottone, Etichetta } from './base.tsx'

/**
 * Registrazione del veicolo.
 *
 * Non si chiede il consumo, e non si può dichiararlo. Il costo chilometrico
 * lo ricava il sistema da marca, modello e alimentazione sulle tabelle ACI:
 * è il tetto oltre il quale la condivisione di spese smette di essere tale,
 * e un tetto che l'interessato può alzare non è un tetto.
 *
 * Si chiede invece la fascia, perché con essa e l'alimentazione si trova la
 * voce giusta senza avere in banca dati ogni modello circolante in Italia.
 */

const FASCE = [
  { v: 'utilitaria', t: 'Utilitaria', n: 'Panda, Ypsilon, Polo, Corsa' },
  { v: 'compatta', t: 'Compatta', n: 'Golf, Focus, Giulietta, Megane' },
  { v: 'berlina', t: 'Berlina', n: 'Passat, Serie 3, Classe C' },
  { v: 'suv_compatto', t: 'SUV compatto', n: 'Captur, T-Roc, 3008' },
  { v: 'suv_grande', t: 'SUV grande', n: 'Tucson, X3, Tiguan' },
  { v: 'monovolume', t: 'Monovolume', n: 'Touran, Zafira, Scenic' },
]

const ALIMENTAZIONI = [
  { v: 'benzina', t: 'Benzina' }, { v: 'diesel', t: 'Diesel' },
  { v: 'gpl', t: 'GPL' }, { v: 'metano', t: 'Metano' },
  { v: 'ibrida', t: 'Ibrida' }, { v: 'elettrica', t: 'Elettrica' },
]

export function FormVeicolo() {
  const [marca, setMarca] = useState('')
  const [modello, setModello] = useState('')
  const [fascia, setFascia] = useState('utilitaria')
  const [alimentazione, setAlimentazione] = useState('benzina')
  const [targa, setTarga] = useState('')
  const [colore, setColore] = useState('')
  const [posti, setPosti] = useState(5)
  const [fumo, setFumo] = useState(false)
  const [animali, setAnimali] = useState(false)
  const [bagagli, setBagagli] = useState<'nessuno'|'piccoli'|'medi'|'grandi'>('medi')
  const [errore, setErrore] = useState<string | null>(null)
  const [invio, setInvio] = useState(false)

  return (
    <main className="schermo-stretto">
      <h1 style={{ fontSize: 26, marginBottom: 6 }}>La tua auto</h1>
      <p style={{ margin: '0 0 24px', color: 'var(--inchiostro-2)', fontSize: 15, lineHeight: 1.55 }}>
        Serve a due cose: calcolare quanto ti costa un chilometro, e farti
        riconoscere al punto di ritrovo.
      </p>

      <div style={{ display: 'flex', gap: 10 }}>
        <Campo etichetta="Marca" valore={marca} onChange={setMarca} segnaposto="Fiat" />
        <Campo etichetta="Modello" valore={modello} onChange={setModello} segnaposto="Panda" />
      </div>

      <Etichetta>che tipo di auto è</Etichetta>
      <div style={{ display: 'grid', gap: 7, margin: '10px 0 20px' }}>
        {FASCE.map((f) => (
          <button key={f.v} onClick={() => setFascia(f.v)} style={{
            textAlign: 'left', padding: '12px 15px', borderRadius: 'var(--raggio-s)',
            border: `1px solid ${fascia === f.v ? 'var(--accento)' : 'var(--riga)'}`,
            background: fascia === f.v ? 'var(--accento-velo)' : 'var(--superficie)',
            color: 'var(--inchiostro)',
          }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{f.t}</div>
            <div style={{ fontSize: 12.5, color: 'var(--tenue)', marginTop: 1 }}>{f.n}</div>
          </button>
        ))}
      </div>

      <Etichetta>alimentazione</Etichetta>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '10px 0 20px' }}>
        {ALIMENTAZIONI.map((a) => (
          <button key={a.v} onClick={() => setAlimentazione(a.v)} style={{
            fontSize: 14.5, padding: '10px 16px', borderRadius: 999,
            border: `1px solid ${alimentazione === a.v ? 'transparent' : 'var(--riga)'}`,
            background: alimentazione === a.v ? 'var(--accento)' : 'var(--superficie)',
            color: alimentazione === a.v ? 'var(--su-accento)' : 'var(--inchiostro)',
          }}>{a.t}</button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <Campo etichetta="Targa" valore={targa} onChange={(v) => setTarga(v.toUpperCase())}
          segnaposto="GK471RT" />
        <Campo etichetta="Colore" valore={colore} onChange={setColore} segnaposto="Bianca" />
      </div>

      <Etichetta>posti in tutto, guidatore compreso</Etichetta>
      <div style={{ display: 'flex', gap: 8, margin: '10px 0 22px' }}>
        {[2, 4, 5, 7, 9].map((n) => (
          <button key={n} onClick={() => setPosti(n)} className="tocco" style={{
            flex: 1, padding: '14px 0', borderRadius: 'var(--raggio-s)',
            border: `1px solid ${posti === n ? 'transparent' : 'var(--riga)'}`,
            background: posti === n ? 'var(--accento)' : 'var(--superficie)',
            color: posti === n ? 'var(--su-accento)' : 'var(--inchiostro)',
            fontWeight: 700, fontSize: 17, fontFamily: 'var(--titoli)',
          }}>{n}</button>
        ))}
      </div>

      {/* «C'è posto per i bagagli» non dice niente a chi ha un trolley da
          stiva. Tre gradini rispondono alla domanda vera: ci sta la mia roba? */}
      <Etichetta>quanto bagaglio ci sta</Etichetta>
      <div style={{ display: 'grid', gap: 7, margin: '10px 0 22px' }}>
        {([
          { v: 'nessuno', t: 'Niente', n: 'Il bagagliaio è pieno' },
          { v: 'piccoli', t: 'Uno zaino', n: 'Roba da tenere sulle ginocchia' },
          { v: 'medi',    t: 'Un trolley a testa', n: 'Bagaglio a mano' },
          { v: 'grandi',  t: 'Valigie grandi', n: 'Anche da stiva' },
        ] as const).map((b) => (
          <button key={b.v} onClick={() => setBagagli(b.v)} style={{
            textAlign: 'left', padding: '12px 15px', borderRadius: 'var(--raggio-s)',
            border: `1px solid ${bagagli === b.v ? 'var(--accento)' : 'var(--riga)'}`,
            background: bagagli === b.v ? 'var(--accento-velo)' : 'var(--superficie)',
            color: 'var(--inchiostro)',
          }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{b.t}</div>
            <div style={{ fontSize: 12.5, color: 'var(--tenue)', marginTop: 1 }}>{b.n}</div>
          </button>
        ))}
      </div>

      <Etichetta>in macchina</Etichetta>
      <div style={{ display: 'grid', gap: 2, margin: '10px 0 24px' }}>
        <Spunta attiva={!fumo} onClick={() => setFumo(!fumo)} testo="Non si fuma" />
        <Spunta attiva={animali} onClick={() => setAnimali(!animali)} testo="Animali ammessi" />
      </div>

      {errore && <p style={{ color: 'var(--rosso)', fontSize: 14, marginBottom: 14 }}>{errore}</p>}

      <Bottone
        disabled={!marca || !modello || targa.length < 5 || invio}
        onClick={async () => {
          setInvio(true); setErrore(null)
          const r = await fetch('/api/veicoli', {
            method: 'POST', headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              marca, modello, fascia, alimentazione, targa, colore,
              postiTotali: posti, fumo, animali, bagagli,
            }),
          })
          if (!r.ok) {
            setErrore((await r.json()).errore ?? 'Non è andata'); setInvio(false); return
          }
          window.location.href = '/pubblica'
        }}
      >{invio ? 'Un attimo…' : 'Salva'}</Bottone>

      <p style={{ fontSize: 12.5, color: 'var(--tenue)', margin: '14px 0 0', lineHeight: 1.55 }}>
        Il costo chilometrico lo calcoliamo noi sulle tabelle ACI del tuo tipo
        di auto: non si dichiara e non si può modificare. È il tetto oltre il
        quale non sarebbe più condivisione di spese.
      </p>
    </main>
  )
}

function Campo({ etichetta, valore, onChange, segnaposto }: {
  etichetta: string; valore: string; onChange: (v: string) => void; segnaposto: string
}) {
  return (
    <label style={{
      display: 'block', flex: 1, marginBottom: 20, padding: '12px 16px',
      border: '1px solid var(--riga)', borderRadius: 'var(--raggio-s)',
      background: 'var(--superficie)',
    }}>
      <span style={{ display: 'block', fontSize: 12, color: 'var(--tenue)' }}>{etichetta}</span>
      <input value={valore} onChange={(e) => onChange(e.target.value)} placeholder={segnaposto}
        style={{
          width: '100%', border: 'none', background: 'transparent', padding: '3px 0 0',
          fontSize: 16, fontFamily: 'var(--testo)', color: 'var(--inchiostro)', outline: 'none',
        }} />
    </label>
  )
}

function Spunta({ attiva, onClick, testo }: {
  attiva: boolean; onClick: () => void; testo: string
}) {
  return (
    <button onClick={onClick} className="tocco" style={{
      display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
      padding: '12px 4px', background: 'none', border: 'none',
      borderBottom: '1px solid var(--riga-2)', color: 'var(--inchiostro)', fontSize: 15,
    }}>
      <span style={{
        width: 22, height: 22, borderRadius: 6, flexShrink: 0,
        border: `1px solid ${attiva ? 'transparent' : 'var(--riga)'}`,
        background: attiva ? 'var(--accento)' : 'transparent',
        color: 'var(--su-accento)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontSize: 13,
      }}>{attiva ? '✓' : ''}</span>
      {testo}
    </button>
  )
}
