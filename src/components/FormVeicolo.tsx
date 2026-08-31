'use client'
import { useEffect, useRef, useState } from 'react'
import { SegnoAvanti } from './segni.tsx'

/**
 * Registrazione del veicolo.
 *
 * Il costo chilometrico non si dichiara e non si può modificare: è il tetto
 * oltre il quale la condivisione di spese smette di essere tale, e un tetto
 * che l'interessato può alzare non è un tetto.
 *
 * Ma finora nemmeno noi lo sapevamo davvero. Marca e modello erano testo
 * libero, nessuna riga corrispondeva a un modello vero delle tabelle ACI, e
 * il calcolo finiva sul ripiego: il MINIMO della tabella per quella
 * alimentazione — l'auto più economica d'Italia. Non è un errore neutro,
 * sottostima sempre: chi guida rientrava di meno di quanto gli spettava, e
 * la frase che diciamo in dieci punti dell'applicazione, «il costo del
 * modello esatto della tua auto», non era vera per nessuno.
 *
 * Adesso si cerca fra i 4.628 modelli veri e si sceglie il proprio. Chi non
 * si trova può andare avanti lo stesso — un'auto d'epoca, un furgone —
 * ma glielo diciamo: sarà una stima prudente, non il suo costo.
 */

const ALIMENTAZIONI = [
  { v: 'benzina', t: 'Benzina' }, { v: 'diesel', t: 'Diesel' },
  { v: 'gpl', t: 'GPL' }, { v: 'metano', t: 'Metano' },
  { v: 'ibrida', t: 'Ibrida' }, { v: 'elettrica', t: 'Elettrica' },
]

const FASCE = [
  { v: 'utilitaria', t: 'Utilitaria', n: 'Panda, Ypsilon, Polo, Corsa' },
  { v: 'compatta', t: 'Compatta', n: 'Golf, Focus, Giulietta, Megane' },
  { v: 'berlina', t: 'Berlina', n: 'Passat, Serie 3, Classe C' },
  { v: 'suv_compatto', t: 'SUV compatto', n: 'Captur, T-Roc, 3008' },
  { v: 'suv_grande', t: 'SUV grande', n: 'Tucson, X3, Tiguan' },
  { v: 'monovolume', t: 'Monovolume', n: 'Touran, Zafira, Scenic' },
]

const BAGAGLI = [
  { v: 'nessuno', t: 'Niente', n: 'Il bagagliaio è pieno' },
  { v: 'piccoli', t: 'Uno zaino', n: 'Roba da tenere sulle ginocchia' },
  { v: 'medi', t: 'Un trolley a testa', n: 'Bagaglio a mano' },
  { v: 'grandi', t: 'Valigie grandi', n: 'Anche da stiva' },
] as const

interface Modello {
  id: string; marca: string; modello: string
  alimentazione: string; centesimiPerKm: number
}

export function FormVeicolo() {
  const [testo, setTesto] = useState('')
  const [scelto, setScelto] = useState<Modello | null>(null)
  const [modelli, setModelli] = useState<Modello[]>([])
  const [aperto, setAperto] = useState(false)
  const [cercando, setCercando] = useState(false)

  const [fascia, setFascia] = useState('utilitaria')
  const [alimentazione, setAlimentazione] = useState('benzina')
  const [targa, setTarga] = useState('')
  const [colore, setColore] = useState('')
  const [posti, setPosti] = useState(5)
  const [fumo, setFumo] = useState(false)
  const [animali, setAnimali] = useState(false)
  const [bagagli, setBagagli] = useState<typeof BAGAGLI[number]['v']>('medi')
  const [consumo, setConsumo] = useState('')
  const [errore, setErrore] = useState<string | null>(null)
  const [invio, setInvio] = useState(false)
  const attesa = useRef<ReturnType<typeof setTimeout> | null>(null)

  /** Si cerca dopo che si è smesso di scrivere, non a ogni tasto. */
  useEffect(() => {
    if (attesa.current) clearTimeout(attesa.current)
    if (scelto || testo.trim().length < 2) { setModelli([]); return }
    setCercando(true)
    attesa.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/modelli?testo=${encodeURIComponent(testo.trim())}`)
        if (!r.ok) return
        const d = await r.json()
        setModelli(d.modelli ?? [])
        setAperto(true)
      } catch { /* si riprova al tasto successivo */ }
      finally { setCercando(false) }
    }, 280)
    return () => { if (attesa.current) clearTimeout(attesa.current) }
  }, [testo, scelto])

  // Senza un modello dell'elenco non si salva: il costo chilometrico deve
  // venire da una riga vera della tabella ACI, non da una stima.
  const pronta = !!scelto && targa.replace(/\s/g, '').length >= 5

  return (
    <div className="fascia">
      <div className="dentro dentro-stretto veicolo">
        <h1 className="t-titolo">La tua auto</h1>
        <p className="t-guida" style={{ margin: 'var(--s4) 0 var(--s6)' }}>
          Serve a due cose: sapere quanto ti costa un chilometro, e farti
          riconoscere al punto di ritrovo.
        </p>

        {/* ── Il modello, dalle tabelle ACI ── */}
        {(
          <div className="cerca-modello">
            <label className="campo">
              <span className="campo-nome">
                Che auto hai
                {scelto && <span style={{ color: 'var(--verde)' }}> ✓</span>}
              </span>
              <input value={testo} autoComplete="off"
                placeholder="Kia Stonic, Panda 1.2, Golf TDI…"
                onChange={(e) => { setTesto(e.target.value); setScelto(null) }}
                onFocus={() => { if (modelli.length) setAperto(true) }}
                onBlur={() => setTimeout(() => setAperto(false), 160)} />
            </label>

            {aperto && modelli.length > 0 && (
              <ul className="modelli">
                {modelli.map((m) => (
                  <li key={m.id}>
                    <button type="button" onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setScelto(m); setTesto(`${m.marca} ${m.modello}`)
                        setAlimentazione(m.alimentazione); setAperto(false)
                      }}>
                      <span className="cresci">
                        <span className="modello-nome">{m.marca} {m.modello}</span>
                        <span className="modello-nota">{m.alimentazione}</span>
                      </span>
                      <span className="modello-costo">
                        {(m.centesimiPerKm / 100).toFixed(2).replace('.', ',')} €/km
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {scelto ? (
              <p className="modello-scelto">
                Costo chilometrico: <b>{(scelto.centesimiPerKm / 100).toFixed(2).replace('.', ',')} €/km</b>,
                dalle tabelle ACI. È da qui che esce la quota di chi sale, e
                non si può cambiare.
              </p>
            ) : (
              /**
               * Nessun ripiego a mano, e non è una semplificazione.
               *
               * Chi scriveva marca e modello a mano non incontrava nessuna
               * riga ACI: il costo chilometrico finiva sul ripiego, che è
               * il MINIMO della tabella per quell'alimentazione — l'auto
               * più economica d'Italia. Sottostima sempre, quindi chi
               * guida rientra meno di quanto gli spetterebbe, e la frase
               * che diciamo ovunque — «il costo del modello esatto della
               * tua auto» — non era vera per lui.
               *
               * In più i modelli scritti a mano arrivano con gli errori di
               * battitura, e restano in vista nel profilo: «kia stoni».
               */
              testo.trim().length >= 2 && modelli.length === 0 && !cercando ? (
                <p className="avviso-morbido" style={{ marginTop: 'var(--s3)' }}>
                  Nessun modello con questo nome. Prova con meno parole —
                  «Stonic» invece di «Kia Stonic 1.0 T-GDI» — o con la sola
                  marca: l&apos;elenco ha quattromilaseicento modelli e la
                  tua ci sarà. Se davvero non c&apos;è,{' '}
                  <a href="/legale/contatto">scrivicelo</a> e la aggiungiamo.
                </p>
              ) : null
            )}
          </div>
        )}

        {/* ── Alimentazione: scelta dal modello, ma correggibile a mano ── */}
        {scelto && (
          <div style={{ marginTop: 'var(--s6)' }}>
            <p className="occhiello">Alimentazione</p>
            <div className="scelte-fila">
              {ALIMENTAZIONI.map((a) => (
                <button key={a.v} type="button"
                  className={`scelta${alimentazione === a.v ? ' scelta-attiva' : ''}`}
                  onClick={() => setAlimentazione(a.v)}>{a.t}</button>
              ))}
            </div>
          </div>
        )}

        <div className="ingresso-coppia" style={{ marginTop: 'var(--s6)' }}>
          <Campo etichetta="Targa" valore={targa} segnaposto="GK471RT"
            onChange={(v) => setTarga(v.toUpperCase())} />
          <Campo etichetta="Colore" valore={colore} onChange={setColore} segnaposto="Bianca" />
        </div>

        <div style={{ marginTop: 'var(--s6)' }}>
          <p className="occhiello">Posti in tutto, guidatore compreso</p>
          <div className="posti-scelta" style={{ marginTop: 'var(--s3)' }}>
            {[2, 4, 5, 7, 9].map((n) => (
              <button key={n} type="button"
                className={`posto-numero${posti === n ? ' posto-numero-scelto' : ''}`}
                aria-pressed={posti === n} onClick={() => setPosti(n)}>{n}</button>
            ))}
          </div>
        </div>

        {/* «C'è posto per i bagagli» non dice niente a chi ha un trolley da
            stiva. Quattro gradini rispondono alla domanda vera: ci sta la
            mia roba? */}
        <div style={{ marginTop: 'var(--s6)' }}>
          <p className="occhiello">Quanto bagaglio ci sta</p>
          <div className="scelte-blocco">
            {BAGAGLI.map((b) => (
              <button key={b.v} type="button"
                className={`opzione${bagagli === b.v ? ' opzione-scelta' : ''}`}
                onClick={() => setBagagli(b.v)}>
                <span className="opzione-titolo">{b.t}</span>
                <span className="opzione-nota">{b.n}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Facoltativo, e in fondo apposta.
            Serve a una cosa sola: farsi rimborsare il solo carburante su
            una corsa fra amici. Chiederlo obbligatorio costerebbe più
            conducenti di quanti ne renda felici — e senza c'è comunque il
            consumo tipico dell'alimentazione, che è una stima onesta. */}
        <div style={{ marginTop: 'var(--s6)' }}>
          <p className="occhiello">Quanto consuma, se lo sai</p>
          <label className="campo" style={{ marginTop: 'var(--s3)' }}>
            <span className="campo-nome">Litri per 100 km — facoltativo</span>
            <input inputMode="decimal" value={consumo} placeholder="5,8"
              onChange={(e) => setConsumo(e.target.value)} />
          </label>
          <p className="t-nota" style={{ marginTop: 'var(--s2)' }}>
            Non cambia il costo chilometrico né quanto ti rientra. Serve solo
            se un giorno vorrai chiedere agli amici la sola benzina.
          </p>
        </div>

        <div style={{ marginTop: 'var(--s6)' }}>
          <p className="occhiello">In macchina</p>
          <div style={{ marginTop: 'var(--s3)' }}>
            <Spunta attiva={!fumo} onClick={() => setFumo(!fumo)} testo="Non si fuma" />
            <Spunta attiva={animali} onClick={() => setAnimali(!animali)} testo="Animali ammessi" />
          </div>
        </div>

        {errore && <p className="errore">{errore}</p>}

        <button type="button" className="azione azione-piena"
          style={{ width: '100%', marginTop: 'var(--s6)' }}
          aria-disabled={!pronta || invio}
          onClick={salva}>
          {invio ? 'Un attimo…' : 'Salva l’auto'} <SegnoAvanti />
        </button>
        {!pronta && (
          <p className="t-nota" style={{ marginTop: 'var(--s3)' }}>
            {!scelto ? 'Scegli la tua auto dall’elenco.' : 'Manca la targa.'}
          </p>
        )}

        <p className="t-nota" style={{ marginTop: 'var(--s5)', maxWidth: '62ch' }}>
          Il costo chilometrico non si dichiara e non si può modificare: è il
          tetto oltre il quale non sarebbe più condivisione di spese, e un
          tetto che chi guida può alzare non è un tetto.
        </p>
      </div>
    </div>
  )

  async function salva() {
    if (!pronta || invio) return
    setInvio(true); setErrore(null)
    const r = await fetch('/api/veicoli', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        marca: scelto!.marca,
        modello: scelto!.modello,
        aciModello: scelto!.id,
        fascia, alimentazione, targa, colore,
        postiTotali: posti, fumo, animali, bagagli,
        consumoL100: consumo ? Number(consumo.replace(',', '.')) : null,
      }),
    })
    if (!r.ok) {
      setErrore((await r.json()).errore ?? 'Non è andata'); setInvio(false); return
    }
    window.location.href = '/pubblica'
  }
}

function Campo({ etichetta, valore, onChange, segnaposto }: {
  etichetta: string; valore: string; onChange: (v: string) => void; segnaposto: string
}) {
  return (
    <label className="campo">
      <span className="campo-nome">{etichetta}</span>
      <input value={valore} onChange={(e) => onChange(e.target.value)}
        placeholder={segnaposto} autoComplete="off" />
    </label>
  )
}

function Spunta({ attiva, onClick, testo }: {
  attiva: boolean; onClick: () => void; testo: string
}) {
  return (
    <button type="button" onClick={onClick} className="spunta-riga">
      <span className={attiva ? 'spunta-quadro spunta-accesa' : 'spunta-quadro'}>
        {attiva ? '✓' : ''}
      </span>
      {testo}
    </button>
  )
}
