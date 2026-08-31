'use client'
import { useEffect, useRef, useState } from 'react'
import { Mappa } from './Mappa.tsx'

/**
 * Un campo che sa dove sono i posti.
 *
 * Tre cose che un semplice campo di testo non fa, e che qui servono perché
 * quello che si scrive finisce dentro un prezzo:
 *
 * 1. Suggerisce mentre si scrive, pesando i risultati attorno a dove sei —
 *    chi scrive «stazione» dal lodigiano intende la sua. Una lista che apre
 *    con Palermo insegna a non fidarsi dei suggerimenti.
 * 2. Aspetta che si smetta di digitare. Una chiamata per tastiera premuta
 *    esaurisce la quota gratuita in un pomeriggio.
 * 3. Distingue «scritto» da «scelto». Finché non si sceglie una voce non ci
 *    sono coordinate, e senza coordinate non si può pubblicare.
 */

export interface LuogoScelto {
  etichetta: string
  lat: number
  lng: number
  comune?: string
  fonte?: 'salvato' | 'posto' | 'indirizzo'
  corse?: number
  /** quanto è lontano da dove stai cercando: distingue due omonimi */
  distanzaKm?: number
}

/**
 * Il segno accanto a ciascun suggerimento.
 *
 * Non è decorazione: dice da dove viene la risposta. Un luogo salvato, un
 * locale conosciuto e un indirizzo qualsiasi si scelgono con fiducia
 * diversa, e distinguerli con un colore o un peso sarebbe più debole di
 * distinguerli con un segno.
 */
const SEGNO: Record<string, string> = {
  salvato: '★',
  posto: '◆',
  indirizzo: '·',
}

export function CampoLuogo({ etichetta, segnaposto, valore, onScegli, vicino, mappa = false }: {
  etichetta: string
  segnaposto: string
  valore: LuogoScelto | null
  onScegli: (l: LuogoScelto | null) => void
  vicino?: { lat: number; lng: number }
  /**
   * Se offrire la scelta sulla mappa. Lo decide il server, che sa se c'è una
   * chiave e quante mappe sono già nate questo mese: superata la soglia
   * gratuita il pulsante sparisce e resta la ricerca per indirizzo, invece
   * di arrivare una fattura.
   */
  mappa?: boolean
}) {
  const [testo, setTesto] = useState(valore?.etichetta ?? '')
  const [suggerimenti, setSuggerimenti] = useState<LuogoScelto[]>([])
  const [aperto, setAperto] = useState(false)
  const [cercando, setCercando] = useState(false)
  const attesa = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [mappaAperta, setMappaAperta] = useState(false)
  const [salvaCome, setSalvaCome] = useState(false)
  const [salvato, setSalvato] = useState(false)
  const [etichettaLibera, setEtichettaLibera] = useState('')

  /** Salvare un posto con il nome che gli dai tu. */
  async function salva(etichetta: string, tipo: 'casa' | 'lavoro' | 'altro') {
    if (!valore) return
    await fetch('/api/preferiti', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        etichetta, indirizzo: valore.etichetta,
        lat: valore.lat, lng: valore.lng, tipo,
      }),
    })
    setSalvato(true); setSalvaCome(false); setEtichettaLibera('')
  }

  /**
   * A campo vuoto e appena toccato si mostrano i luoghi salvati.
   *
   * Chi va al lavoro scrive lo stesso indirizzo ogni giorno: la risposta
   * giusta esiste già prima che cominci a digitare, e farla comparire al
   * primo tocco è la differenza fra un'applicazione che si usa una volta e
   * una che si usa tutti i giorni.
   */
  async function mostraSalvati() {
    if (testo.trim().length > 0) return
    try {
      const r = await fetch('/api/preferiti')
      if (!r.ok) return
      const d = await r.json()
      const l = (d.luoghi ?? []).map((x: Record<string, unknown>) => ({
        etichetta: String(x.etichetta), lat: Number(x.lat), lng: Number(x.lng),
        comune: String(x.indirizzo ?? ''), fonte: 'salvato' as const,
      }))
      if (l.length > 0) { setSuggerimenti(l); setAperto(true) }
    } catch { /* si continua a digitare */ }
  }

  useEffect(() => {
    if (attesa.current) clearTimeout(attesa.current)
    if (testo.trim().length < 2 || testo === valore?.etichetta) {
      setSuggerimenti([]); return
    }
    setCercando(true)
    attesa.current = setTimeout(async () => {
      const p = new URLSearchParams({ testo })
      if (vicino) { p.set('lat', String(vicino.lat)); p.set('lng', String(vicino.lng)) }
      try {
        const r = await fetch(`/api/luoghi?${p}`)
        const d = await r.json()
        // Anche qui, non solo sul server: una riga senza coordinate si
        // sceglie volentieri e poi non porta da nessuna parte.
        setSuggerimenti((d.luoghi ?? []).filter(
          (l: LuogoScelto) => Number.isFinite(l.lat) && Number.isFinite(l.lng),
        ))
        setAperto(true)
      } finally { setCercando(false) }
    }, 350)
    return () => { if (attesa.current) clearTimeout(attesa.current) }
  }, [testo, vicino, valore?.etichetta])

  return (
    <div style={{ position: 'relative', marginBottom: 12 }}>
      <label style={{
        display: 'block', padding: '12px 16px',
        border: `1px solid ${valore ? 'var(--riga)' : 'var(--riga)'}`,
        borderRadius: 'var(--raggio-s)', background: 'var(--superficie)',
      }}>
        <span style={{
          display: 'flex', justifyContent: 'space-between',
          fontSize: 12, color: 'var(--tenue)',
        }}>
          {etichetta}
          {valore && <span style={{ color: 'var(--verde)' }}>✓</span>}
        </span>
        <input
          value={testo}
          onChange={(e) => { setTesto(e.target.value); onScegli(null) }}
          onFocus={() => { if (suggerimenti.length > 0) setAperto(true); else void mostraSalvati() }}
          onBlur={() => setTimeout(() => setAperto(false), 160)}
          placeholder={segnaposto}
          autoComplete="off"
          style={{
            width: '100%', border: 'none', background: 'transparent', padding: '3px 0 0',
            fontSize: 16, fontFamily: 'var(--testo)', color: 'var(--inchiostro)', outline: 'none',
          }}
        />
      </label>

      {aperto && suggerimenti.length > 0 && (
        <ul style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
          margin: '4px 0 0', padding: 0, listStyle: 'none',
          background: 'var(--superficie)', border: '1px solid var(--riga)',
          borderRadius: 'var(--raggio-s)', boxShadow: 'var(--ombra-alta)',
          overflow: 'hidden',
        }}>
          {suggerimenti.map((l, i) => (
            <li key={`${l.lat},${l.lng},${i}`}>
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { onScegli(l); setTesto(l.etichetta); setAperto(false) }}
                style={{
                  width: '100%', textAlign: 'left', padding: '11px 15px',
                  background: 'none', border: 'none',
                  borderBottom: i < suggerimenti.length - 1 ? '1px solid var(--riga-2)' : 'none',
                  color: 'var(--inchiostro)',
                  display: 'flex', alignItems: 'center', gap: 12,
                }}
              >
                <span style={{
                  flexShrink: 0, width: 18, textAlign: 'center', fontSize: 13,
                  color: l.fonte === 'salvato' ? 'var(--accento)' : 'var(--tenue)',
                }}>{SEGNO[l.fonte ?? 'indirizzo']}</span>

                <span style={{ flexGrow: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 15, lineHeight: 1.3 }}>
                    {l.etichetta}
                  </span>
                  {l.comune && (
                    <span style={{
                      display: 'block', fontSize: 12.5, color: 'var(--tenue)',
                      lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>{l.comune}</span>
                  )}
                </span>

                {/* Quanto è lontano: fra due omonimi è quello che fa
                    scegliere, e sbagliare qui sbaglia percorso e prezzo. */}
                {l.distanzaKm !== undefined && (
                  <span style={{
                    flexShrink: 0, fontSize: 12, color: 'var(--tenue)',
                    fontFamily: 'var(--mono)',
                  }}>{l.distanzaKm < 1
                    ? `${Math.round(l.distanzaKm * 1000)} m`
                    : `${String(l.distanzaKm).replace('.', ',')} km`}</span>
                )}

                {l.corse ? (
                  <span style={{
                    flexShrink: 0, fontSize: 12, fontWeight: 600,
                    color: 'var(--verde)',
                  }}>{l.corse} {l.corse === 1 ? 'passaggio' : 'passaggi'}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/*
        Salvare si offre QUI, non nelle impostazioni.
        Nessuno va in un menu ad aggiungere casa propria: lo si fa nel
        momento in cui l'indirizzo lo si è appena scritto, e solo se non è
        già salvato — offrirlo su un posto che si conosce già è rumore.
      */}
      {valore && valore.fonte !== 'salvato' && !salvato && (
        <div className="salvataggio">
          {salvaCome ? (
            <>
              <span className="salvataggio-invito">Salva come</span>
              <div className="salvataggio-scelte">
                <button type="button" className="etichetta-pronta"
                  onClick={() => void salva('Casa', 'casa')}>Casa</button>
                <button type="button" className="etichetta-pronta"
                  onClick={() => void salva('Lavoro', 'lavoro')}>Lavoro</button>
                {/*
                  Un nome proprio, non solo i due predefiniti.
                  «Casa» e «lavoro» coprono due posti; tutti gli altri —
                  la palestra, casa di mia madre, il campo — non hanno un
                  nome fra quelli, e senza un nome che riconosci un luogo
                  salvato è un indirizzo in un elenco di indirizzi.
                */}
                <input
                  className="etichetta-nuova"
                  value={etichettaLibera}
                  onChange={(e) => setEtichettaLibera(e.target.value.slice(0, 24))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && etichettaLibera.trim()) {
                      e.preventDefault()
                      void salva(etichettaLibera.trim(), 'altro')
                    }
                  }}
                  placeholder="oppure scrivi un nome"
                  aria-label="Nome del posto" />
                {etichettaLibera.trim() && (
                  <button type="button" className="etichetta-pronta etichetta-conferma"
                    onClick={() => void salva(etichettaLibera.trim(), 'altro')}>
                    Salva
                  </button>
                )}
              </div>
              <button type="button" className="collegamento-piccolo"
                onClick={() => setSalvaCome(false)}>no</button>
            </>
          ) : (
            <button type="button" className="collegamento-piccolo"
              onClick={() => setSalvaCome(true)}>★ Salva questo posto</button>
          )}
        </div>
      )}

      {salvato && (
        <p className="salvataggio-fatto">
          Salvato. Lo trovi al primo tocco, la prossima volta.
        </p>
      )}

      {/* Molti punti di ritrovo non hanno un indirizzo che qualcuno saprebbe
          scrivere: «il parcheggio dietro la chiesa», «l'uscita del casello».
          La ricerca copre la metà facile, la mappa l'altra. */}
      {mappa && (
        <button
          type="button"
          onClick={() => setMappaAperta(true)}
          style={{
            background: 'none', border: 'none', color: 'var(--accento)',
            fontSize: 13, fontWeight: 600, padding: '6px 4px 0',
          }}
        >Scegli sulla mappa</button>
      )}

      {mappaAperta && mappa && (
        <Mappa
          centro={valore ?? vicino ?? { lat: 45.3142, lng: 9.5033 }}
          iniziale={valore ? { ...valore } : undefined}
          onAnnulla={() => setMappaAperta(false)}
          onConferma={(p) => {
            onScegli({ etichetta: p.etichetta, lat: p.lat, lng: p.lng })
            setTesto(p.etichetta)
            setMappaAperta(false)
          }}
        />
      )}

      {/* Scritto ma non scelto: senza coordinate non si va avanti, e va
          detto mentre si guarda il campo, non premendo il pulsante. */}
      {!valore && testo.trim().length >= 3 && !cercando && !aperto && (
        <p style={{ fontSize: 12.5, color: 'var(--tenue)', margin: '5px 0 0', paddingLeft: 4 }}>
          Scegli un posto dall&apos;elenco.
        </p>
      )}
    </div>
  )
}
