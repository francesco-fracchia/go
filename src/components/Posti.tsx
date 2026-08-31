'use client'
import { useEffect, useRef, useState } from 'react'
import type { Categoria, Posto } from '../server/posti.ts'
import type { Modo } from '../server/modo.ts'
import { CampoLuogo, type LuogoScelto } from './CampoLuogo.tsx'
import {
  SegnoAvanti, SegnoTutti, SegnoDiscoteca, SegnoBar, SegnoRistorante, SegnoCinema,
  SegnoNegozi, SegnoPiazza, SegnoTreno, SegnoAereo, SegnoStadio, SegnoUniversita,
  SegnoPalestra,
} from './segni.tsx'

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

/**
 * Le categorie, con un segno ciascuna.
 *
 * Erano dodici pastiglie identiche in fila: per trovare «Stazioni» bisogna
 * leggerle tutte, ogni volta. Con un simbolo davanti si punta alla forma e
 * la parola serve solo a confermare — e le parole si accorciano, perché
 * «Centri commerciali» in una pastiglia occupa lo spazio di tre categorie.
 */
const CATEGORIE: Array<{ v: Categoria | 'tutte'; t: string; Segno: () => React.ReactNode }> = [
  { v: 'tutte', t: 'Tutti', Segno: SegnoTutti },
  { v: 'discoteca', t: 'Discoteche', Segno: SegnoDiscoteca },
  { v: 'bar', t: 'Bar', Segno: SegnoBar },
  { v: 'ristorante', t: 'Ristoranti', Segno: SegnoRistorante },
  { v: 'cinema', t: 'Cinema', Segno: SegnoCinema },
  { v: 'centro_commerciale', t: 'Negozi', Segno: SegnoNegozi },
  { v: 'piazza', t: 'Piazze', Segno: SegnoPiazza },
  { v: 'stazione', t: 'Stazioni', Segno: SegnoTreno },
  { v: 'aeroporto', t: 'Aeroporti', Segno: SegnoAereo },
  { v: 'stadio', t: 'Stadi', Segno: SegnoStadio },
  { v: 'universita', t: 'Università', Segno: SegnoUniversita },
  { v: 'palestra', t: 'Palestre', Segno: SegnoPalestra },
]

/** Il segno di un posto, per la sua categoria. */
const SEGNO_DI: Record<string, () => React.ReactNode> = Object.fromEntries(
  CATEGORIE.filter((c) => c.v !== 'tutte').map((c) => [c.v, c.Segno]),
)

export function Posti({ iniziali, categoriaIniziale, modo = 'passeggero', mappa = false }: {
  iniziali: Posto[]
  categoriaIniziale?: Categoria
  modo?: Modo
  mappa?: boolean
}) {
  const [altrove, setAltrove] = useState<LuogoScelto | null>(null)
  const [categoria, setCategoria] = useState<Categoria | 'tutte'>(categoriaIniziale ?? 'tutte')
  const [posti, setPosti] = useState(iniziali)
  const [caricando, setCaricando] = useState(false)
  /**
   * L'ultima richiesta vince, e le precedenti si annullano.
   *
   * Cambiando filtro in fretta partivano più chiamate insieme: quella che
   * tornava per ultima riscriveva l'elenco, che poteva essere di un filtro
   * che nel frattempo era già stato cambiato — e la spia «un attimo…» si
   * spegneva sulla risposta di una richiesta vecchia mentre un'altra era
   * ancora in volo.
   */
  const richiesta = useRef<AbortController | null>(null)
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
    richiesta.current?.abort()
    const mia = new AbortController()
    richiesta.current = mia

    setCaricando(true); setProblema(null)
    try {
      const q = new URLSearchParams()
      if (c !== 'tutte') q.set('categoria', c)
      if (p) { q.set('lat', String(p.lat)); q.set('lng', String(p.lng)) }
      const r = await fetch(`/api/posti?${q}`, { signal: mia.signal })
      const d = await r.json()
      if (richiesta.current !== mia) return
      setPosti(d.posti ?? [])
    } catch (e) {
      // Una richiesta annullata non è un guasto: è stata sostituita.
      if ((e as Error).name === 'AbortError') return
      setProblema('Non riusciamo a leggere i posti adesso. Riprova fra un momento.')
    } finally {
      // Solo l'ultima spegne la spia: se lo facesse anche una vecchia,
      // l'elenco sembrerebbe pronto mentre sta ancora arrivando.
      if (richiesta.current === mia) setCaricando(false)
    }
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
  /**
   * La posizione si chiede solo se la si tocca.
   *
   * Chiederla all'apertura fa comparire il permesso del browser prima che
   * l'utente abbia capito perché serve — e una volta negato non lo si
   * richiede più.
   *
   * Ma il messaggio d'errore accusava chi lo leggeva: «hai negato la
   * posizione» compariva anche a chi non se l'era vista chiedere. Il
   * permesso può essere bloccato dal contesto — un riquadro dentro
   * un'altra pagina, una regola aziendale — e in quel caso l'utente non ha
   * negato niente: gli si sta dicendo che ha fatto una cosa che non ha
   * fatto, e per giunta gli si indica una manopola che non risolve.
   *
   * Con l'API dei permessi si sa PRIMA in che stato siamo, e si dice la
   * cosa vera. E in tutti i casi c'è la via d'uscita che prima non
   * c'era: cercare un posto a mano.
   */
  async function usaPosizione() {
    setProblema(null)

    if (!navigator.geolocation) {
      setProblema('Il tuo browser non sa dirci dove sei. Cerca il posto qui sopra.')
      return
    }
    if (!window.isSecureContext) {
      setProblema('La posizione funziona solo su una connessione sicura. Cerca il posto qui sopra.')
      return
    }

    // Lo stato del permesso, quando il browser sa dircelo: distingue «devi
    // ancora rispondere» da «hai già detto di no».
    let stato: PermissionState | null = null
    try {
      stato = (await navigator.permissions?.query({ name: 'geolocation' }))?.state ?? null
    } catch { /* non tutti lo sanno fare: si prova comunque */ }

    if (stato === 'denied') {
      setProblema('La posizione è bloccata per questo sito. Si riattiva dal lucchetto accanto all’indirizzo — oppure cerca il posto qui sopra.')
      return
    }

    setCaricando(true)
    /**
     * Il browser può non richiamare mai: se il permesso resta lì senza
     * risposta, o se la richiesta viene ingoiata dal contesto, né il
     * successo né l'errore arrivano — e la spia resta accesa per sempre.
     * È il «un attimo…» che non finiva più.
     */
    const scaduto = setTimeout(() => {
      setCaricando(false)
      setProblema('Non abbiamo avuto risposta. Cerca il posto qui sopra.')
    }, 12_000)

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(scaduto)
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setPosizione(p); setVicino(true); setAltrove(null); carica(categoria, p)
      },
      (e) => {
        clearTimeout(scaduto)
        setCaricando(false)
        if (e.code === e.PERMISSION_DENIED) {
          // Se prima del tentativo il permesso NON era negato e adesso lo è,
          // vuol dire che la richiesta non è nemmeno arrivata all'utente:
          // l'ha bloccata il contesto.
          setProblema(stato === 'prompt'
            ? 'Il browser non ci ha lasciato chiedertelo — succede quando la pagina è dentro un riquadro o c’è una regola che lo impedisce. Cerca il posto qui sopra.'
            : 'La posizione è bloccata per questo sito. Si riattiva dal lucchetto accanto all’indirizzo.')
          return
        }
        setProblema(e.code === e.POSITION_UNAVAILABLE
          ? 'Non riusciamo a capire dove sei. Cerca il posto qui sopra.'
          : 'Ci ha messo troppo. Riprova, oppure cerca il posto qui sopra.')
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 600_000 },
    )
  }

  /** Guardare intorno a un posto qualsiasi, senza chiedere la posizione. */
  function guardaAltrove(l: LuogoScelto | null) {
    setAltrove(l)
    if (!l) return
    setVicino(false)
    setPosizione({ lat: l.lat, lng: l.lng })
    carica(categoria, { lat: l.lat, lng: l.lng })
  }

  return (
    <>
      <div className="fascia testata">
        <div className="dentro dentro-app testata-dentro">
          <div>
            <p className="occhiello">Qui intorno</p>
            <h1 className="t-titolo testata-titolo" style={{ marginTop: 'var(--s3)' }}>Dove si va</h1>
            <p className="testata-sotto">
              {modo === 'conducente'
                ? 'Se qualcuno ci sta cercando un passaggio lo vedi, e puoi pubblicare la corsa in due tocchi.'
                : 'Scegline uno: se qualcuno ci va lo vedi, se nessuno ci va puoi dirlo.'}
            </p>
          </div>
          <div className="posti-comandi">
            {/* La via d'uscita che prima non c'era: guardare un'altra zona
                senza dover concedere la posizione. */}
            <CampoLuogo mappa={mappa} etichetta="Guarda intorno a"
              segnaposto="Una città, una via, un locale"
              valore={altrove} onScegli={guardaAltrove} />
            <button type="button" className="azione azione-vuota azione-piccola"
              onClick={usaPosizione} disabled={caricando}>
              {caricando ? 'Ti sto cercando…' : vicino ? 'Sei qui' : 'Usa la mia posizione'}
            </button>
          </div>
        </div>
      </div>

    <div className="fascia">
      <div className="dentro dentro-app posti-dentro">

        {problema && (
          <p className="avviso-morbido" style={{ maxWidth: '58ch' }}>{problema}</p>
        )}

        {/* Le categorie scorrono in orizzontale: su un telefono una griglia
            di dodici voci occupa mezzo schermo prima di mostrare un posto. */}
        <div className="categorie" role="group" aria-label="Categoria">
          {CATEGORIE.map(({ v, t, Segno }) => (
            <button key={v} type="button"
              className={`categoria${categoria === v ? ' categoria-scelta' : ''}`}
              aria-pressed={categoria === v}
              onClick={() => cambia(v)}>
              <Segno /> {t}
            </button>
          ))}
        </div>



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
            <h2 className="t-sezione">
              {categoria === 'tutte'
                ? 'Qui intorno non abbiamo trovato niente'
                : `Nessun posto di questo tipo qui intorno`}
            </h2>
            <p className="vuoto-testo" style={{ marginTop: 'var(--s3)' }}>
              {categoria === 'tutte'
                ? 'Prova a spostarti con «usa la mia posizione», oppure cerca il posto qui sopra.'
                : 'Prova un’altra categoria, oppure guarda intorno a un posto diverso.'}
            </p>
            {categoria !== 'tutte' && (
              <button type="button" className="azione azione-vuota azione-piccola"
                style={{ marginTop: 'var(--s5)' }}
                onClick={() => cambia('tutte')}>Mostra tutti</button>
            )}
          </div>
        )}

        {/* Mentre arriva la risposta l'elenco resta dov'è, spento.
            Sostituirlo con una riga di testo fa perdere il riferimento di
            dove si era, e a ogni cambio di filtro sembra di ricominciare. */}
        <div className={caricando ? 'griglia-elenco elenco-in-arrivo' : 'griglia-elenco'}
          aria-busy={caricando}>
          {posti.length > 0
            ? posti.map((p) => <Carta key={p.id} p={p} modo={modo} />)
            : caricando && [0, 1, 2, 3, 4, 5].map((n) => <div key={n} className="posto-finto" />)}
        </div>

        {posti.length > 0 && (
          <p className="t-nota" style={{ fontSize: 11.5 }}>
            Dati dei luoghi © contributori OpenStreetMap, licenza ODbL.
          </p>
        )}
      </div>
    </div>
    </>
  )
}

function Carta({ p, modo }: { p: Posto; modo: Modo }) {
  const Segno = SEGNO_DI[p.categoria]
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
      {/* Tutta la scheda porta all'azione principale: due pulsanti per
          riga, su ventiquattro schede, sono quarantotto bersagli che
          chiedono di scegliere prima ancora di aver letto il nome. */}
      <a href={prima.href} className="posto-principale">
        {/* I loghi delle attività non ci sono: OpenStreetMap non li
            distribuisce, e andarli a prendere dai siti delle attività
            sarebbe fragile e indiscreto. Il segno della categoria dice
            comunque a colpo d'occhio di che posto si tratta. */}
        <span className="posto-segno" aria-hidden="true">{Segno && <Segno />}</span>
        <span className="cresci">
          <span className="posto-titolo">{p.nome}</span>
          <span className="t-nota">{[p.citta, distanza].filter(Boolean).join(' · ')}</span>
        </span>
        {p.corse > 0
          ? <span className="pastiglia pastiglia-verde">
              {p.corse} {p.corse === 1 ? 'passaggio' : 'passaggi'}
            </span>
          : p.richieste > 0
            ? <span className="pastiglia pastiglia-viola">
                {p.richieste} {p.richieste === 1 ? 'cerca' : 'cercano'}
              </span>
            : null}
        <SegnoAvanti dimensione={16} />
      </a>

      {/* Chi cerca qualcuno che lo porti è l'informazione che fa pubblicare
          un conducente: vale più di «ci vanno già in quattro». */}
      {p.richieste > 0 && p.corse > 0 && (
        <p className="posto-cercano">
          e {p.richieste} {p.richieste === 1 ? 'persona cerca' : 'persone cercano'} un passaggio
        </p>
      )}

      <a href={poi.href} className="posto-secondaria">{poi.t}</a>
    </div>
  )
}
