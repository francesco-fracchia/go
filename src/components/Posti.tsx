'use client'
import { useEffect, useState } from 'react'
import type { Categoria, Posto } from '../server/posti.ts'
import type { Modo } from '../server/modo.ts'

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
 * Ci sono tutt'e due sempre, ma quella in evidenza dipende dalla modalità:
 * a chi sta cercando un posto non si mette davanti «ci vado io». Sono le
 * stesse due azioni, in ordine diverso — ed è l'ordine a dire di chi è
 * questa schermata in questo momento.
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

export function Posti({ iniziali, categoriaIniziale, modo = 'passeggero' }: {
  iniziali: Posto[]
  categoriaIniziale?: Categoria
  modo?: Modo
}) {
  const [categoria, setCategoria] = useState<Categoria | 'tutte'>(categoriaIniziale ?? 'tutte')
  const [posti, setPosti] = useState(iniziali)
  const [caricando, setCaricando] = useState(false)
  const [vicino, setVicino] = useState(false)
  const [problema, setProblema] = useState<string | null>(null)
  const [importando, setImportando] = useState(false)

  /**
   * Se la zona è vuota, la si guarda: non si dice all'utente che non
   * abbiamo i dati.
   *
   * La prima persona che apre una provincia nuova la popola per tutti
   * quelli che verranno dopo. Ci mette qualche secondo, e succede una
   * volta sola nella vita di quella zona — dopo, il registro dice che è
   * fatta e nessuno riprova.
   *
   * Il vincolo è che accada UNA volta per apertura di pagina, non a ogni
   * cambio di categoria: per questo la dipendenza è vuota.
   */
  useEffect(() => {
    if (iniziali.length > 0) return
    let vivo = true
    setImportando(true)
    void (async () => {
      try {
        const r = await fetch('/api/posti')
        const d = await r.json()
        if (vivo && d.posti?.length) setPosti(d.posti)
      } finally {
        if (vivo) setImportando(false)
      }
    })()
    return () => { vivo = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    setProblema(null)

    // Il browser dà la posizione solo su HTTPS (o su localhost). Senza
    // questo controllo la richiesta fallisce e basta, e sembra che il
    // pulsante non faccia niente.
    if (!navigator.geolocation) {
      setProblema('Il tuo browser non sa dirci dove sei.')
      return
    }
    if (!window.isSecureContext) {
      setProblema('La posizione funziona solo su una connessione sicura.')
      return
    }

    setCaricando(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setPosizione(p); setVicino(true); carica(categoria, p)
      },
      (e) => {
        setCaricando(false)
        // Ogni motivo ha una via d'uscita diversa, e dirla è la differenza
        // fra «non funziona» e «ecco cosa fare».
        setProblema(
          e.code === e.PERMISSION_DENIED
            ? 'Hai negato la posizione. Puoi riattivarla dalle impostazioni del browser, oppure cercare per indirizzo.'
            : e.code === e.POSITION_UNAVAILABLE
              ? 'Non riusciamo a capire dove sei. Prova a cercare per indirizzo.'
              : 'Ci ha messo troppo. Riprova, o cerca per indirizzo.',
        )
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 600_000 },
    )
  }

  return (
    <div className="fascia">
      <div className="dentro dentro-app posti-dentro">
        <header className="posti-testa">
          <div className="cresci">
            <h1 className="t-titolo">Dove si va</h1>
            <p className="t-guida" style={{ marginTop: 'var(--s3)', maxWidth: '44ch' }}>
              {modo === 'conducente'
                ? 'I posti qui intorno. Se qualcuno ci sta cercando un passaggio lo vedi, e puoi pubblicare la corsa in due tocchi.'
                : 'I posti qui intorno. Scegline uno: se qualcuno ci va lo vedi, se nessuno ci va puoi dirlo.'}
            </p>
          </div>
          {!vicino && (
            <button type="button" className="azione azione-vuota azione-piccola"
              onClick={usaPosizione} disabled={caricando}>
              {caricando ? 'Ti sto cercando…' : 'Usa la mia posizione'}
            </button>
          )}
          {vicino && <span className="pastiglia pastiglia-verde">dalla tua posizione</span>}
        </header>

        {problema && <p className="t-corpo" style={{ maxWidth: '48ch' }}>{problema}</p>}

        {/* Le categorie scorrono in orizzontale: su un telefono una griglia
            di dodici voci occupa mezzo schermo prima di mostrare un posto. */}
        <div className="scelte" role="group" aria-label="Categoria">
          {CATEGORIE.map((c) => (
            <button key={c.v} type="button"
              className={`scelta${categoria === c.v ? ' scelta-attiva' : ''}`}
              aria-pressed={categoria === c.v}
              onClick={() => cambia(c.v)}>{c.t}</button>
          ))}
        </div>

        {caricando && <p className="t-nota">Un attimo…</p>}

        {/* Mentre si guarda si dice cosa si sta facendo, non «caricamento»:
            la prima apertura di una zona nuova ci mette qualche secondo, e
            una rotellina muta fa pensare che sia rotto. */}
        {importando && posti.length === 0 && (
          <p className="t-corpo" style={{ maxWidth: '48ch' }}>
            Stiamo guardando cosa c&apos;è qui intorno. È la prima volta che
            qualcuno apre questa zona — ci vuole qualche secondo, e poi resta.
          </p>
        )}

        {!caricando && !importando && posti.length === 0 && (
          <div className="vuoto">
            <h2 className="t-sezione">Qui intorno non abbiamo trovato niente</h2>
            <p className="vuoto-testo" style={{ marginTop: 'var(--s3)' }}>
              Prova a spostarti con «usa la mia posizione», oppure cerca
              direttamente per indirizzo.
            </p>
          </div>
        )}

        <div className="griglia-elenco">
          {posti.map((p) => <Carta key={p.id} p={p} modo={modo} />)}
        </div>

        {posti.length > 0 && (
          <p className="t-nota" style={{ fontSize: 11.5 }}>
            Dati dei luoghi © contributori OpenStreetMap, licenza ODbL.
          </p>
        )}
      </div>
    </div>
  )
}

function Carta({ p, modo }: { p: Posto; modo: Modo }) {
  const km = p.distanzaM / 1000
  const distanza = km < 1
    ? `${Math.max(50, Math.round(p.distanzaM / 50) * 50)} m`
    : `${km.toFixed(km < 10 ? 1 : 0).replace('.', ',')} km`

  const versoIl = new URLSearchParams({
    dlat: String(p.lat), dlng: String(p.lng), dove: p.nome, cat: p.categoria,
  })

  const cerca = { href: `/cerca?${versoIl}`, t: p.corse > 0 ? 'Vedi i passaggi' : 'Cerca un passaggio' }
  const offro = { href: `/pubblica?${versoIl}`, t: 'Ci vado io' }
  const [prima, poi] = modo === 'conducente' ? [offro, cerca] : [cerca, offro]

  return (
    <div className="posto-carta">
      <div className="fila-fra" style={{ alignItems: 'flex-start' }}>
        <div className="cresci">
          <div className="posto-titolo">{p.nome}</div>
          <div className="t-nota">{[p.citta, distanza].filter(Boolean).join(' · ')}</div>
        </div>
        {p.corse > 0
          ? <span className="pastiglia pastiglia-verde">
              {p.corse} {p.corse === 1 ? 'passaggio' : 'passaggi'}
            </span>
          : p.richieste > 0
            ? <span className="pastiglia pastiglia-viola">
                {p.richieste} {p.richieste === 1 ? 'cerca' : 'cercano'}
              </span>
            : <span className="pastiglia">nessuno ancora</span>}
      </div>

      {/* Chi cerca qualcuno che lo porti è l'informazione che fa pubblicare
          un conducente: vale più di «ci vanno già in quattro». */}
      {p.richieste > 0 && p.corse > 0 && (
        <p className="posto-cercano">
          e {p.richieste} {p.richieste === 1 ? 'persona cerca' : 'persone cercano'} un passaggio
        </p>
      )}

      <div className="posto-azioni">
        <a href={prima.href} className="azione azione-piena azione-piccola">{prima.t}</a>
        <a href={poi.href} className="azione azione-vuota azione-piccola">{poi.t}</a>
      </div>
    </div>
  )
}
