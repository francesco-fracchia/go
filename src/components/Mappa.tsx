'use client'
import { useEffect, useRef, useState } from 'react'
import { Bottone } from './base.tsx'

/**
 * Scegliere un punto sulla mappa.
 *
 * Serve perché molti punti di ritrovo non hanno un indirizzo che qualcuno
 * saprebbe scrivere: «il parcheggio dietro la chiesa», «l'uscita del
 * casello», «dove ci si vede sempre». Cercare per indirizzo copre la metà
 * facile dei casi; questa copre l'altra.
 *
 * Le mappe sono di OpenFreeMap: dati OpenStreetMap, nessuna chiave, nessun
 * costo per caricamento. Google e Mapbox fanno pagare a mappa aperta, e un
 * prodotto dove ogni ricerca apre una mappa diventa caro molto prima di
 * diventare redditizio.
 *
 * La libreria si carica solo quando la mappa serve davvero: sono circa
 * duecento kilobyte che non hanno ragione di stare nella prima schermata.
 */

/**
 * Uno stile a PIASTRELLE RASTER, non vettoriale.
 *
 * Il vettoriale disegna le mappe dentro un Web Worker, e quel worker con
 * Next non si carica: la libreria lo cerca per percorso relativo e riceve
 * una pagina HTML, oppure — passando `setWorkerUrl`, l'unico appiglio
 * offerto — viene creato come worker classico su un file a moduli. In
 * entrambi i casi fallisce in silenzio: la mappa monta, i controlli e
 * l'attribuzione compaiono, e resta grigia. È il modo peggiore di rompersi,
 * perché sembra funzionante.
 *
 * Il raster non usa nessun worker. Per scegliere un punto su una mappa il
 * vettoriale non porta niente — niente rotazione, niente stili dinamici,
 * niente tre dimensioni — e in cambio costava l'intera funzione.
 *
 * Il fornitore delle piastrelle è una variabile d'ambiente, e non per
 * eleganza: MapLibre carica le immagini con `crossOrigin`, quindi servono
 * le intestazioni CORS, e fra i fornitori gratuiti senza chiave non ne
 * resta nessuno che le mandi. OpenStreetMap ed Esri rifiutano le richieste
 * dal browser; CARTO risponde ma stampa «API KEY REQUIRED» sopra la mappa.
 *
 * Il valore predefinito è CARTO senza chiave: si vede qualcosa e si capisce
 * subito che manca la configurazione, che è meglio di un rettangolo grigio.
 *
 * ⚠️  PRIMA DI ANDARE ONLINE: prendere una chiave gratuita (MapTiler dà
 *     centomila caricamenti al mese, più che sufficienti) e metterla in
 *     NEXT_PUBLIC_TILES_URL. È una variabile, non una riga di codice.
 */
const PIASTRELLE = process.env.NEXT_PUBLIC_TILES_URL
  ? [process.env.NEXT_PUBLIC_TILES_URL]
  : ['a', 'b', 'c'].map(
      (s) => `https://${s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png`,
    )
const ATTRIBUZIONE = process.env.NEXT_PUBLIC_TILES_ATTRIBUZIONE
  ?? '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · © <a href="https://carto.com/attributions">CARTO</a>'
const STILE: import('maplibre-gl').StyleSpecification = {
  version: 8,
  sources: {
    base: {
      type: 'raster',
      tiles: PIASTRELLE,
      tileSize: 256,
      maxzoom: 19,
      attribution: ATTRIBUZIONE,
    },
  },
  layers: [
    { id: 'sfondo', type: 'background', paint: { 'background-color': '#F2F0ED' } },
    { id: 'base', type: 'raster', source: 'base' },
  ],
}

export interface PuntoScelto { lat: number; lng: number; etichetta: string }

export function Mappa({ centro, iniziale, onConferma, onAnnulla }: {
  centro: { lat: number; lng: number }
  iniziale?: PuntoScelto
  onConferma: (p: PuntoScelto) => void
  onAnnulla: () => void
}) {
  const contenitore = useRef<HTMLDivElement>(null)
  const [punto, setPunto] = useState<{ lat: number; lng: number }>(iniziale ?? centro)
  const [etichetta, setEtichetta] = useState(iniziale?.etichetta ?? '')
  const [cercando, setCercando] = useState(false)
  const [guasta, setGuasta] = useState(false)

  useEffect(() => {
    let mappa: import('maplibre-gl').Map | null = null
    let osservatore: ResizeObserver | null = null
    const pulizie: Array<() => void> = []
    let vivo = true

    ;(async () => {
      const maplibre = await import('maplibre-gl')
      if (!vivo || !contenitore.current) return

      /**
       * Si aspetta che il contenitore abbia una dimensione vera prima di
       * costruire la mappa.
       *
       * Il pannello entra a schermo intero nello stesso fotogramma: se la
       * mappa nasce mentre il contenitore misura ancora zero, si crede
       * larga zero e non chiede nessuna piastrella. Non chiedendo
       * piastrelle non finisce di caricare, e `load` — il posto naturale
       * dove rimediare — non scatta mai. È uno stallo, e si vede come una
       * mappa grigia con i controlli al loro posto: il modo peggiore di
       * rompersi, perché sembra funzionante.
       *
       * Ridimensionare dopo funziona a volte. Aspettare funziona sempre.
       */
      if (!(await attendiDimensione(contenitore.current))) { setGuasta(true); return }
      if (!vivo || !contenitore.current) return

      mappa = new maplibre.Map({
        container: contenitore.current,
        style: STILE,
        center: [punto.lng, punto.lat],
        zoom: 15,
        attributionControl: { compact: true },
      })
      mappa.addControl(new maplibre.NavigationControl({ showCompass: false }), 'top-right')

      // Una mappa grigia con i controlli sopra sembra funzionante: se le
      // piastrelle non arrivano bisogna dirlo, non lasciarla lì.
      mappa.on('error', (e) => {
        console.error('mappa:', e.error)
        setGuasta(true)
      })

      /**
       * Rete di sicurezza: se dopo sei secondi la mappa non ha finito di
       * caricare, lo si dice.
       *
       * Non basta ascoltare `error`: quando la mappa resta bloccata prima
       * di chiedere le piastrelle non emette nessun errore — semplicemente
       * non finisce mai. Una mappa grigia con i controlli al loro posto è
       * il modo peggiore di rompersi, perché l'utente aspetta credendo che
       * stia caricando. Meglio dire che non funziona e indicare la via
       * d'uscita: l'indirizzo scritto a mano.
       */
      const resa = setTimeout(() => {
        if (mappa && !mappa.loaded()) setGuasta(true)
      }, 6000)
      pulizie.push(() => clearTimeout(resa))

      /**
       * La mappa nasce dentro un pannello a schermo intero che compare
       * nello stesso fotogramma: al momento della costruzione il
       * contenitore misura ancora zero. La mappa si crede larga zero, non
       * chiede nessuna piastrella, quindi non finisce di caricare — e
       * `load`, che sarebbe il posto naturale dove chiamare `resize`, non
       * scatta mai. È uno stallo, e si vede come una mappa grigia con i
       * controlli al loro posto.
       *
       * Si misura di nuovo al fotogramma successivo, e si continua a
       * seguire il contenitore: la tastiera che si apre, la rotazione del
       * telefono, la barra del browser che si ritrae.
       */
      // Il contenitore può ancora cambiare dopo: la tastiera che si apre,
      // la rotazione del telefono, la barra del browser che si ritrae.
      osservatore = new ResizeObserver(() => mappa?.resize())
      osservatore.observe(contenitore.current)

      // Il segnaposto resta fermo al centro e si muove la mappa sotto: è più
      // preciso del trascinamento con il pollice, che copre proprio il punto
      // che si sta cercando di scegliere.
      mappa.on('moveend', () => {
        if (!mappa) return
        const c = mappa.getCenter()
        setPunto({ lat: c.lat, lng: c.lng })
      })
    })()

    return () => {
      vivo = false
      for (const p of pulizie) p()
      osservatore?.disconnect()
      mappa?.remove()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Il nome del posto si chiede quando ci si ferma, non a ogni pixel.
  useEffect(() => {
    const t = setTimeout(async () => {
      setCercando(true)
      try {
        const r = await fetch(`/api/luoghi?lat=${punto.lat}&lng=${punto.lng}`)
        const d = await r.json()
        if (d.luogo?.etichetta) setEtichetta(d.luogo.etichetta)
      } finally { setCercando(false) }
    }, 500)
    return () => clearTimeout(t)
  }, [punto.lat, punto.lng])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 60, background: 'var(--carta)',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ position: 'relative', flexGrow: 1 }}>
        <div ref={contenitore} style={{ position: 'absolute', inset: 0 }} />

        {/* Il segnaposto: fermo, al centro, sopra la mappa. */}
        <div style={{
          position: 'absolute', left: '50%', top: '50%',
          transform: 'translate(-50%, -100%)', pointerEvents: 'none',
        }}>
          <div style={{
            width: 26, height: 26, borderRadius: '50% 50% 50% 0',
            transform: 'rotate(-45deg)',
            background: 'var(--accento)', border: '3px solid #fff',
            boxShadow: '0 3px 10px rgba(0,0,0,.3)',
          }} />
        </div>

        {guasta && (
          <div style={{
            position: 'absolute', left: 16, right: 16, top: 68,
            padding: '13px 16px', borderRadius: 'var(--raggio-s)',
            background: 'var(--superficie)', boxShadow: 'var(--ombra)',
            fontSize: 14, color: 'var(--inchiostro-2)', lineHeight: 1.5,
          }}>
            La mappa non si carica. Chiudi e scrivi l&apos;indirizzo: la ricerca
            per testo funziona e ti trova lo stesso posto.
          </div>
        )}

        <button onClick={onAnnulla} aria-label="Chiudi" style={{
          position: 'absolute', top: 14, left: 14, width: 40, height: 40,
          borderRadius: 20, border: 'none', background: 'var(--superficie)',
          color: 'var(--inchiostro)', fontSize: 18, boxShadow: 'var(--ombra)',
        }}>✕</button>
      </div>

      <div style={{
        padding: '18px 20px calc(20px + env(safe-area-inset-bottom))',
        background: 'var(--superficie)', borderTop: '1px solid var(--riga)',
      }}>
        <div style={{ fontSize: 12, color: 'var(--tenue)', marginBottom: 3 }}>
          punto scelto
        </div>
        <div style={{
          fontSize: 16.5, fontWeight: 600, fontFamily: 'var(--titoli)',
          marginBottom: 14, minHeight: 24, lineHeight: 1.3,
        }}>
          {cercando && !etichetta ? '…' : etichetta || 'Trascina la mappa'}
        </div>
        <Bottone
          disabled={!etichetta}
          onClick={() => onConferma({ ...punto, etichetta })}
        >Usa questo punto</Bottone>
      </div>
    </div>
  )
}

/**
 * Aspetta che un elemento abbia larghezza e altezza maggiori di zero.
 *
 * Restituisce `false` dopo due secondi: se il contenitore non si misura in
 * quel tempo qualcosa è andato storto nel disegno, e insistere non aiuta —
 * meglio mostrare l'avviso che restare in attesa per sempre.
 */
function attendiDimensione(elemento: HTMLElement): Promise<boolean> {
  const misurato = () => {
    const r = elemento.getBoundingClientRect()
    return r.width > 0 && r.height > 0
  }
  if (misurato()) return Promise.resolve(true)

  return new Promise((risolvi) => {
    const osservatore = new ResizeObserver(() => {
      if (misurato()) { osservatore.disconnect(); clearTimeout(resa); risolvi(true) }
    })
    osservatore.observe(elemento)
    const resa = setTimeout(() => { osservatore.disconnect(); risolvi(misurato()) }, 2000)
  })
}
