'use client'
import { useEffect, useRef, useState } from 'react'
import { CampoLuogo, type LuogoScelto } from './CampoLuogo.tsx'
import { euro } from './base.tsx'
import { SegnoAvanti } from './segni.tsx'

/**
 * Quanto costa davvero un viaggio.
 *
 * È la pagina che si può leggere senza avere un account, e l'unica il cui
 * scopo non è farti usare GO: è farti sapere una cosa. Quasi nessuno sa
 * che un'auto costa cinquanta o sessanta centesimi al chilometro — la
 * benzina è meno di un quinto del totale — e chi non lo sa non ha nessun
 * motivo di dividere le spese con qualcuno. Dividere una spesa che credi
 * di dieci euro è una scocciatura; dividerne una da venticinque è una
 * decisione.
 *
 * Per questo la pagina dà il numero e basta, con il pulsante per cercare
 * un passaggio in fondo e non in cima: se l'argomento non convince, il
 * pulsante non serve.
 */

interface Modello {
  id: string; marca: string; modello: string
  alimentazione: string; centesimiPerKm: number
}

interface Esito {
  km: number; minuti: number
  totaleCent: number; pedaggioCent: number
  benzinaCent: number; usuraCent: number
  aTesta: Array<{ persone: number; cent: number }>
}

export function QuantoCosta({ mappa = false }: { mappa?: boolean }) {
  const [testo, setTesto] = useState('')
  const [modelli, setModelli] = useState<Modello[]>([])
  const [auto, setAuto] = useState<Modello | null>(null)
  const [aperto, setAperto] = useState(false)

  const [da, setDa] = useState<LuogoScelto | null>(null)
  const [a, setA] = useState<LuogoScelto | null>(null)
  const [senzaAutostrada, setSenzaAutostrada] = useState(false)

  const [consumo, setConsumo] = useState('')
  const [pedaggio, setPedaggio] = useState('')

  const [attesa, setAttesa] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [esito, setEsito] = useState<Esito | null>(null)

  const ritardo = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (ritardo.current) clearTimeout(ritardo.current)
    if (testo.trim().length < 2 || auto) { setModelli([]); return }
    ritardo.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/modelli?testo=${encodeURIComponent(testo.trim())}`)
        if (!r.ok) return
        setModelli((await r.json()).modelli ?? [])
        setAperto(true)
      } catch { /* si riprova al tasto successivo */ }
    }, 280)
    return () => { if (ritardo.current) clearTimeout(ritardo.current) }
  }, [testo, auto])

  const pronto = !!auto && !!da && !!a

  async function calcola() {
    if (!pronto) return
    setAttesa(true); setErrore(null)
    try {
      const r = await fetch('/api/costo', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          centesimiPerKm: auto.centesimiPerKm,
          alimentazione: auto.alimentazione,
          origine: { lat: da.lat, lng: da.lng },
          destinazione: { lat: a.lat, lng: a.lng },
          evitaAutostrada: senzaAutostrada,
          consumo: consumo ? Number(consumo.replace(',', '.')) : undefined,
          pedaggioCent: pedaggio ? Math.round(Number(pedaggio.replace(',', '.')) * 100) : 0,
        }),
      })
      const d = await r.json()
      if (!r.ok) { setErrore(d.errore ?? 'Non ci siamo riusciti.'); setEsito(null) }
      else setEsito(d)
    } catch {
      setErrore('Non ci siamo riusciti. Controlla la connessione.')
    } finally { setAttesa(false) }
  }

  return (
    <>
      <div className="fascia testata">
        <div className="dentro dentro-app testata-dentro">
          <div>
            <p className="occhiello">Quanto costa davvero</p>
            <h1 className="t-titolo testata-titolo" style={{ marginTop: 'var(--s3)' }}>
              La tua auto non costa la benzina.
            </h1>
            <p className="testata-sotto">
              Costa da tre a cinque volte tanto, e quasi nessuno sa quanto.
              Guardalo sul tuo viaggio — non serve un account.
            </p>
          </div>
        </div>
      </div>

      <div className="fascia">
        <div className="dentro dentro-app casa-dentro">

          <div className="pannello-ricerca">
            {/* ── L'auto, dalle tabelle ACI ── */}
            <div className="cerca-modello">
            <label className="campo">
              <span className="campo-nome">
                Che auto hai {auto && <span style={{ color: 'var(--verde)' }}>✓</span>}
              </span>
              <input value={testo} autoComplete="off"
                placeholder="Panda 1.2, Golf TDI, Kia Stonic…"
                onChange={(e) => { setTesto(e.target.value); setAuto(null); setEsito(null) }}
                onFocus={() => setAperto(true)} />
            </label>

            {aperto && modelli.length > 0 && !auto && (
              <ul className="modelli">
                {modelli.map((m) => (
                  <li key={m.id}>
                    <button type="button" onClick={() => {
                      setAuto(m); setTesto(`${m.marca} ${m.modello}`)
                      setAperto(false); setModelli([])
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
            </div>

            <div className="ricerca-luoghi">
              <CampoLuogo etichetta="Da dove" segnaposto="Indirizzo, città o locale"
                valore={da} onScegli={(l) => { setDa(l); setEsito(null) }} mappa={mappa} />
              <CampoLuogo etichetta="A dove" segnaposto="Indirizzo, città o locale"
                valore={a} onScegli={(l) => { setA(l); setEsito(null) }} mappa={mappa} />
            </div>

            <label className="riquadro riquadro-spunta" style={{ marginTop: 'var(--s4)' }}>
              <input type="checkbox" checked={senzaAutostrada}
                onChange={(e) => { setSenzaAutostrada(e.target.checked); setEsito(null) }} />
              <span>Evita l&apos;autostrada</span>
            </label>

            {/* ── I numeri che solo tu puoi sapere ──
                Il pedaggio non ce lo dice nessun servizio, e la tabella ACI
                ha una cifra sola, tutto compreso: la parte benzina esiste
                soltanto se la dichiari. Sta chiusa perché la pagina deve
                dare una risposta anche a chi non compila niente. */}
            <details className="altre">
              <summary>
                <span className="altre-titolo">Sai quanto consuma, o quanto paghi di pedaggio?</span>
                <span className="altre-nota">Facoltativi — servono solo a stringere la stima</span>
              </summary>
              <div className="altre-corpo">
                <label className="campo">
                  <span className="campo-nome">Consumo, litri per 100 km</span>
                  <input inputMode="decimal" value={consumo} placeholder="5,8"
                    onChange={(e) => setConsumo(e.target.value)} />
                </label>
                <label className="campo">
                  <span className="campo-nome">Pedaggio, se c&apos;è</span>
                  <input inputMode="decimal" value={pedaggio} placeholder="3,40"
                    onChange={(e) => setPedaggio(e.target.value)} />
                </label>
              </div>
            </details>

            {errore && <p className="errore">{errore}</p>}

            <div className="ricerca-fondo">
              <p className="ricerca-manca">
                {pronto ? 'Il costo viene dalle tabelle ACI 2026' : 'Scegli auto, partenza e destinazione'}
              </p>
              <button type="button" className="azione azione-piena ricerca-invia"
                aria-disabled={!pronto || attesa} onClick={calcola}>
                {attesa ? 'Un attimo…' : 'Quanto costa'}
              </button>
            </div>
          </div>

          {esito && <Risposta e={esito} da={da!} a={a!} senzaAutostrada={senzaAutostrada} />}
        </div>
      </div>
    </>
  )
}

function Risposta({ e, da, a, senzaAutostrada }: {
  e: Esito; da: LuogoScelto; a: LuogoScelto; senzaAutostrada: boolean
}) {
  const cerca = `/cerca?dlat=${a.lat}&dlng=${a.lng}&dove=${encodeURIComponent(a.etichetta)}`
  return (
    <section className="casa-sezione">
      <div className="risposta">
        <p className="occhiello">Andata, da solo</p>
        <p className="t-monumento risposta-cifra">{euro(e.totaleCent)}</p>
        <p className="risposta-tratta">
          {da.etichetta} → {a.etichetta} · {e.km.toFixed(0)} km · {e.minuti} minuti
          {senzaAutostrada && ' · senza autostrada'}
        </p>

        {/* La riga per cui esiste la pagina. Il totale sorprende, ma è
            vedere quanto POCO sia il carburante che cambia idea. */}
        <div className="scomposizione">
          <div className="scomposizione-barra">
            <span className="scomposizione-carburante"
              style={{ width: `${Math.round(e.benzinaCent / e.totaleCent * 100)}%` }} />
          </div>
          <p className="risposta-benzina">
            Al distributore ne lasci <strong>{euro(e.benzinaCent)}</strong>. Gli
            altri <strong>{euro(e.usuraCent)}</strong> sono gomme, manutenzione,
            bollo, assicurazione e svalutazione: non li paghi stasera, li paghi
            lo stesso — un chilometro alla volta.
          </p>
        </div>
        {e.pedaggioCent > 0 && (
          <p className="risposta-benzina">Pedaggio compreso: {euro(e.pedaggioCent)}.</p>
        )}

        <div className="divisione">
          <p className="occhiello">Se in macchina siete</p>
          <ul className="divisione-elenco">
            {e.aTesta.map((r) => (
              <li key={r.persone}>
                <span className="divisione-persone">in {r.persone}</span>
                <span className="divisione-cifra">{euro(r.cent)}</span>
                <span className="divisione-nota">a testa</span>
              </li>
            ))}
          </ul>
          <p className="t-nota" style={{ marginTop: 'var(--s4)' }}>
            Diviso per le persone in macchina, <strong>chi guida compreso</strong>.
            È la regola di GO, ed è la ragione per cui nessuno ci guadagna.
          </p>
        </div>

        <a href={cerca} className="azione azione-piena risposta-azione">
          Vedi chi sta già facendo questa strada <SegnoAvanti dimensione={16} />
        </a>
      </div>
    </section>
  )
}
