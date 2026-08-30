'use client'
import { useState } from 'react'
import { Bottone, Etichetta } from './base.tsx'
import { TESTO_DICHIARAZIONE } from './testi.ts'
import { CampoLuogo, type LuogoScelto } from './CampoLuogo.tsx'
import { proponi, etichetta, SCELTE, type Flessibilita, type Categoria } from '../lib/flessibilita.ts'

/**
 * Il modulo di pubblicazione.
 *
 * Tre passi, uno per schermata. Un modulo lungo mostrato tutto insieme fa
 * abbandonare: qui il primo passo chiede due indirizzi e un'ora, e già
 * dopo quello si vede il numero — quanto rientra — che è la ragione per
 * cui qualcuno arriva in fondo.
 *
 * La dichiarazione di privato sta all'ultimo passo, non al primo: chiederla
 * prima che si veda a cosa serve la fa leggere come un ostacolo.
 */

type Passo = 'dove' | 'come' | 'conferma'

export function FormPubblica({ veicoli, destinazione: destinazioneIniziale, categoria, mappa = false }: {
  veicoli: Array<{ id: string; marca: string; modello: string; postiTotali: number }>
  destinazione?: LuogoScelto
  categoria?: Categoria
  mappa?: boolean
}) {
  const [passo, setPasso] = useState<Passo>('dove')
  const [origine, setOrigine] = useState<LuogoScelto | null>(null)
  const [destinazione, setDestinazione] = useState<LuogoScelto | null>(destinazioneIniziale ?? null)
  const [oraArrivo, setOraArrivo] = useState('')
  const [posti, setPosti] = useState(3)
  const [veicolo, setVeicolo] = useState(veicoli[0]?.id ?? '')
  const [modalita, setModalita] = useState<'pubblica' | 'link' | 'privata'>('pubblica')
  const [immediata, setImmediata] = useState(false)
  const [devRitiro, setDevRitiro] = useState(true)
  const [devDeposito, setDevDeposito] = useState(true)
  const [politica, setPolitica] = useState<'flessibile' | 'rigida'>('flessibile')
  const [dichiarato, setDichiarato] = useState(false)
  const [note, setNote] = useState('')
  const [oraRitorno, setOraRitorno] = useState('')
  const [flessibilita, setFlessibilita] = useState<Flessibilita | null>(null)

  // La proposta si ricalcola con l'orario: la stessa tratta il martedì
  // mattina e il sabato sera non ha la stessa elasticità.
  const suggerita = oraArrivo && !Number.isNaN(new Date(oraArrivo).getTime())
    ? proponi({ categoria, oraArrivo: new Date(oraArrivo) })
    : null
  const scelta = flessibilita ?? suggerita?.minuti ?? 0
  const [invio, setInvio] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  const massimo = (veicoli.find((v) => v.id === veicolo)?.postiTotali ?? 5) - 1

  if (veicoli.length === 0) {
    return (
      <main style={{ maxWidth: 'var(--colonna)', margin: '0 auto', padding: '40px 20px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 24, marginBottom: 10 }}>Prima la macchina</h1>
        <p style={{ color: 'var(--inchiostro-2)', marginBottom: 22, lineHeight: 1.55 }}>
          Ci servono marca, modello e alimentazione per calcolare quanto ti
          costa un chilometro. È da lì che esce la quota di ciascuno.
        </p>
        <a href="/veicoli/nuovo" style={{ textDecoration: 'none' }}>
          <Bottone>Aggiungi la tua auto</Bottone>
        </a>
      </main>
    )
  }

  return (
    <main style={{ maxWidth: 'var(--colonna)', margin: '0 auto', padding: '20px 20px 40px' }}>
      <Progresso passo={passo} />

      {passo === 'dove' && (
        <>
          <h1 style={{ fontSize: 26, margin: '18px 0 20px' }}>Dove vai?</h1>
          <CampoLuogo mappa={mappa} etichetta="Parti da" valore={origine} onScegli={setOrigine}
            segnaposto="Lodi, piazza della Vittoria" />
          <CampoLuogo mappa={mappa} etichetta="Arrivi a" valore={destinazione} onScegli={setDestinazione}
            segnaposto="Fabrique, Milano" />
          <Campo etichetta="Vuoi essere lì alle" valore={oraArrivo} onChange={setOraArrivo}
            segnaposto="23:45" tipo="datetime-local" />
          <p style={{ fontSize: 13, color: 'var(--tenue)', margin: '2px 0 18px', lineHeight: 1.5 }}>
            L&apos;ora di partenza la calcoliamo noi dal percorso, con dieci
            minuti di margine.
          </p>

          {/* La flessibilità non si chiede a freddo: si propone quella
              giusta guardando dove si va e quando, e chi vuole la cambia.
              Il valore proposto è quello che quasi nessuno tocca. */}
          {suggerita && (
            <div style={{ marginBottom: 20 }}>
              <Etichetta>quanto sei preciso</Etichetta>
              <div style={{ display: 'flex', gap: 8, margin: '10px 0 8px' }}>
                {SCELTE.map((m) => (
                  <button key={m} onClick={() => setFlessibilita(m)} className="tocco" style={{
                    flex: 1, padding: '12px 4px', borderRadius: 'var(--raggio-s)',
                    border: `1px solid ${scelta === m ? 'transparent' : 'var(--riga)'}`,
                    background: scelta === m ? 'var(--accento)' : 'var(--superficie)',
                    color: scelta === m ? 'var(--su-accento)' : 'var(--inchiostro)',
                    fontWeight: 600, fontSize: 13.5, whiteSpace: 'nowrap',
                  }}>{etichetta(m)}</button>
                ))}
              </div>
              <p style={{ fontSize: 13, color: 'var(--tenue)', margin: 0, lineHeight: 1.5 }}>
                {flessibilita === null && `${suggerita.perche} `}
                {scelta === 0
                  ? 'Ti trova solo chi cerca quell’ora.'
                  : `Ti trova anche chi cerca fino a ${scelta} minuti prima o dopo. Alla prima prenotazione l’orario si fissa.`}
              </p>
            </div>
          )}

          {/* Il ritorno è il vero problema della notte: chi cerca un
              passaggio per andare a ballare sa già che dovrà tornare, e una
              corsa solo in andata lo lascia a metà. Chiederlo qui, mentre
              si sta già pubblicando, costa un tocco. */}
          <div style={{
            padding: '14px 16px', borderRadius: 'var(--raggio-s)',
            border: '1px solid var(--riga)', background: 'var(--superficie)',
            marginBottom: 20,
          }}>
            <label style={{ display: 'flex', gap: 12, alignItems: 'flex-start', cursor: 'pointer' }}>
              <input type="checkbox" checked={oraRitorno !== ''}
                onChange={(e) => setOraRitorno(e.target.checked ? suggerisciRitorno(oraArrivo) : '')}
                style={{ marginTop: 3, width: 20, height: 20, flexShrink: 0 }} />
              <span>
                <span style={{ fontSize: 15, fontWeight: 600 }}>Torni anche?</span>
                <span style={{ display: 'block', fontSize: 13, color: 'var(--tenue)', marginTop: 2, lineHeight: 1.45 }}>
                  Pubblichiamo anche il rientro. Restano due corse separate:
                  puoi disdire una e tenere l&apos;altra.
                </span>
              </span>
            </label>
            {oraRitorno !== '' && (
              <div style={{ marginTop: 12 }}>
                <Campo etichetta="Riparti alle" valore={oraRitorno} onChange={setOraRitorno}
                  segnaposto="" tipo="datetime-local" />
              </div>
            )}
          </div>
          <Bottone
            disabled={!origine || !destinazione || !oraArrivo}
            onClick={() => setPasso('come')}
          >Avanti</Bottone>
        </>
      )}

      {passo === 'come' && (
        <>
          <h1 style={{ fontSize: 26, margin: '18px 0 20px' }}>Quanti posti?</h1>

          <div style={{ display: 'flex', gap: 9, marginBottom: 24 }}>
            {Array.from({ length: Math.min(massimo, 5) }, (_, i) => i + 1).map((n) => (
              <button key={n} onClick={() => setPosti(n)} className="tocco" style={{
                flex: 1, padding: '16px 0', borderRadius: 'var(--raggio-s)',
                border: `1px solid ${posti === n ? 'transparent' : 'var(--riga)'}`,
                background: posti === n ? 'var(--accento)' : 'var(--superficie)',
                color: posti === n ? 'var(--su-accento)' : 'var(--inchiostro)',
                fontWeight: 700, fontSize: 19, fontFamily: 'var(--titoli)',
              }}>{n}</button>
            ))}
          </div>

          {veicoli.length > 1 && (
            <>
              <Etichetta>con quale auto</Etichetta>
              <div style={{ display: 'grid', gap: 8, margin: '10px 0 24px' }}>
                {veicoli.map((v) => (
                  <button key={v.id} onClick={() => setVeicolo(v.id)} style={{
                    textAlign: 'left', padding: '13px 16px', borderRadius: 'var(--raggio-s)',
                    border: `1px solid ${veicolo === v.id ? 'var(--accento)' : 'var(--riga)'}`,
                    background: 'var(--superficie)', color: 'var(--inchiostro)', fontSize: 15,
                  }}>{v.marca} {v.modello}</button>
                ))}
              </div>
            </>
          )}

          <Interruttore titolo="Chi può vederla"
            opzioni={[
              { v: 'pubblica', t: 'Tutti', n: 'Compare nelle ricerche' },
              { v: 'link', t: 'Con il link', n: 'Non compare, ma chi ha il link prenota' },
              { v: 'privata', t: 'Chi invito', n: 'Solo le persone che aggiungi tu' },
            ]}
            valore={modalita} onChange={(v) => setModalita(v as typeof modalita)} />

          <Interruttore titolo="Chi sale"
            opzioni={[
              { v: 'no', t: 'Decido io', n: 'Ricevi una richiesta e rispondi' },
              { v: 'si', t: 'Chiunque', n: 'Si riempie prima, ma non scegli chi' },
            ]}
            valore={immediata ? 'si' : 'no'} onChange={(v) => setImmediata(v === 'si')} />

          {/* Due domande, non una. Chi ha tempo prima di partire ma è di
              fretta all'arrivo, con un interruttore solo spegne tutto — e
              perde i passeggeri che avrebbe potuto caricare comunque. */}
          <Interruttore titolo="Puoi passare a prendere qualcuno?"
            opzioni={[
              { v: 'si', t: 'Sì, se è di strada', n: 'Riempie molto di più. Ti chiedono e decidi tu, e i km in più li pagano loro' },
              { v: 'no', t: 'No, parto da qui', n: 'Salgono solo al tuo punto di partenza' },
            ]}
            valore={devRitiro ? 'si' : 'no'} onChange={(v) => setDevRitiro(v === 'si')} />

          <Interruttore titolo="Puoi lasciarli altrove?"
            opzioni={[
              { v: 'si', t: 'Sì, se è di strada', n: 'Utile quando la destinazione è larga: un locale, una stazione, un aeroporto' },
              { v: 'no', t: 'No, arrivo e basta', n: 'Scendono solo alla destinazione indicata' },
            ]}
            valore={devDeposito ? 'si' : 'no'} onChange={(v) => setDevDeposito(v === 'si')} />

          {!devRitiro && !devDeposito && (
            <p style={{
              fontSize: 13, color: 'var(--tenue)', margin: '-8px 0 18px',
              padding: '10px 14px', borderRadius: 'var(--raggio-s)',
              background: 'var(--superficie-2)', lineHeight: 1.5,
            }}>
              Va benissimo, ma sappilo: la maggior parte di chi cerca un
              passaggio non abita esattamente sul tuo percorso. Aprendone
              anche solo una si riempie molto più spesso.
            </p>
          )}

          <Interruttore titolo="Se disdicono"
            opzioni={[
              { v: 'flessibile', t: 'Fino a un’ora prima', n: 'Più gente prenota, ma può saltare' },
              { v: 'rigida', t: 'Fino a sei ore prima', n: 'Posto più sicuro, meno prenotazioni' },
            ]}
            valore={politica} onChange={(v) => setPolitica(v as typeof politica)} />

          <div style={{ marginTop: 20 }}>
            <Bottone onClick={() => setPasso('conferma')}>Avanti</Bottone>
          </div>
        </>
      )}

      {passo === 'conferma' && (
        <>
          <h1 style={{ fontSize: 26, margin: '18px 0 16px' }}>Ultima cosa</h1>

          <Etichetta>vuoi dire qualcosa a chi sale</Etichetta>
          <textarea
            value={note} onChange={(e) => setNote(e.target.value)}
            rows={3} placeholder="Parto puntuale · musica alta · niente bagagli grandi"
            style={{
              width: '100%', marginTop: 10, padding: 13, fontSize: 15,
              fontFamily: 'var(--testo)', borderRadius: 'var(--raggio-s)',
              border: '1px solid var(--riga)', background: 'var(--superficie)',
              color: 'var(--inchiostro)', resize: 'vertical',
            }}
          />

          <label style={{
            display: 'flex', gap: 12, alignItems: 'flex-start', margin: '22px 0 20px',
            padding: '16px 18px', borderRadius: 'var(--raggio)',
            border: '1px solid var(--riga)', background: 'var(--superficie)',
            cursor: 'pointer',
          }}>
            <input type="checkbox" checked={dichiarato}
              onChange={(e) => setDichiarato(e.target.checked)}
              style={{ marginTop: 3, width: 20, height: 20, flexShrink: 0 }} />
            <span style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--inchiostro-2)' }}>
              {TESTO_DICHIARAZIONE}
            </span>
          </label>

          {errore && (
            <p style={{ color: 'var(--rosso)', fontSize: 14, marginBottom: 14 }}>{errore}</p>
          )}

          <Bottone
            disabled={!dichiarato || invio}
            onClick={async () => {
              setInvio(true); setErrore(null)
              const r = await fetch('/api/corse', {
                method: 'POST', headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                  veicoloId: veicolo,
                  origine: { label: origine!.etichetta, lat: origine!.lat, lng: origine!.lng },
                  destinazione: { label: destinazione!.etichetta, lat: destinazione!.lat, lng: destinazione!.lng },
                  oraArrivo, postiOfferti: posti, modalita,
                  prenotaImmediata: immediata,
                  deviazioniRitiro: devRitiro, deviazioniDeposito: devDeposito,
                  politica, note,
                  oraRitorno: oraRitorno || undefined,
                  flessibilitaMin: scelta,
                }),
              })
              const d = await r.json()
              if (!r.ok) { setErrore(d.errore ?? 'Non è andata'); setInvio(false); return }
              window.location.href = `/corsa/${d.corsa.id}`
            }}
          >{invio ? 'Un attimo…' : 'Pubblica'}</Bottone>

          <p style={{
            fontSize: 13, color: 'var(--tenue)', textAlign: 'center',
            margin: '12px 0 0', lineHeight: 1.5,
          }}>
            Puoi annullarla quando vuoi. Se nessuno prenota, sparisce da sola.
          </p>
        </>
      )}
    </main>
  )
}

function Progresso({ passo }: { passo: Passo }) {
  const passi: Passo[] = ['dove', 'come', 'conferma']
  const i = passi.indexOf(passo)
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {passi.map((p, n) => (
        <div key={p} style={{
          flex: 1, height: 3, borderRadius: 2,
          background: n <= i ? 'var(--accento)' : 'var(--riga)',
        }} />
      ))}
    </div>
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
      background: 'var(--superficie)',
    }}>
      <span style={{ display: 'block', fontSize: 12, color: 'var(--tenue)' }}>{etichetta}</span>
      <input
        type={tipo} value={valore} onChange={(e) => onChange(e.target.value)}
        placeholder={segnaposto}
        style={{
          width: '100%', border: 'none', background: 'transparent', padding: '3px 0 0',
          fontSize: 16, fontFamily: 'var(--testo)', color: 'var(--inchiostro)', outline: 'none',
        }}
      />
    </label>
  )
}

function Interruttore({ titolo, opzioni, valore, onChange }: {
  titolo: string
  opzioni: Array<{ v: string; t: string; n: string }>
  valore: string
  onChange: (v: string) => void
}) {
  return (
    <div style={{ marginBottom: 18 }}>
      <Etichetta>{titolo}</Etichetta>
      <div style={{ display: 'grid', gap: 7, marginTop: 9 }}>
        {opzioni.map((o) => (
          <button key={o.v} onClick={() => onChange(o.v)} style={{
            textAlign: 'left', padding: '12px 15px', borderRadius: 'var(--raggio-s)',
            border: `1px solid ${valore === o.v ? 'var(--accento)' : 'var(--riga)'}`,
            background: valore === o.v ? 'var(--accento-velo)' : 'var(--superficie)',
            color: 'var(--inchiostro)',
          }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{o.t}</div>
            <div style={{ fontSize: 12.5, color: 'var(--tenue)', marginTop: 2, lineHeight: 1.4 }}>
              {o.n}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * Un'ipotesi ragionevole per il rientro: quattro ore dopo l'arrivo.
 *
 * Non è una statistica, è il modo di non far compilare un campo vuoto alle
 * undici di sera. Chi torna prima o dopo lo cambia in due tocchi.
 */
function suggerisciRitorno(oraArrivo: string): string {
  if (!oraArrivo) return ''
  const d = new Date(oraArrivo)
  if (Number.isNaN(d.getTime())) return ''
  d.setHours(d.getHours() + 4)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}
