'use client'
import { useState } from 'react'
import { euro } from './base.tsx'
import { SegnoAvanti } from './segni.tsx'
import { orario } from '../lib/tempo.ts'

/**
 * I risultati.
 *
 * Prima era una griglia di carte. Una griglia va bene per cose che si
 * guardano; questi si CONFRONTANO, e il confronto si fa incolonnando: le
 * ore sotto le ore, i prezzi sotto i prezzi. Con le carte affiancate
 * l'occhio deve attraversare mezzo schermo per collegare l'orario al
 * prezzo, e a quattro risultati non si nota, a quaranta sì.
 *
 * Tre cose che questa schermata deve fare e che nessun elenco fa da solo:
 *
 * 1. Distinguere chi è già prenotabile da chi va chiesto. Sono due azioni
 *    con due fatiche diverse, e presentarle uguali fa sembrare
 *    l'applicazione rotta quando la seconda non risponde subito.
 * 2. Far riordinare senza ricaricare. Chi cerca la notte guarda l'ora;
 *    chi cerca il lunedì mattina guarda il prezzo. Sono due domande
 *    diverse sugli stessi dati, e nessuna delle due merita un giro sul
 *    server.
 * 3. Non lasciare morire il vuoto. È lo stato più frequente del primo
 *    anno, e trattarlo come un errore è il modo migliore di perdere
 *    qualcuno per sempre.
 */

export interface Risultato {
  corsaId: string
  oraPartenza: string
  oraArrivo: string
  partenzaLabel: string
  arrivoLabel: string
  postiLiberi: number
  prezzoDa: number
  fermataPronta: boolean
  kmDeviazione: number
  /** minuti di tolleranza ancora aperti sull'orario, 0 se già fissato */
  flessibileMin?: number
  conducente: { nome: string; fotoUrl: string | null; distintivi: string[] }
  veicolo: { marca: string; modello: string }
}

type Ordine = 'ora' | 'prezzo'

export function Risultati({ risultati, allargati }: {
  risultati: Risultato[]
  allargati?: Risultato[]
}) {
  const [ordine, setOrdine] = useState<Ordine>('ora')
  const [soloPronti, setSoloPronti] = useState(false)

  const ordina = (a: Risultato[]) => [...a].sort((x, y) =>
    ordine === 'prezzo'
      ? x.prezzoDa - y.prezzoDa
      : new Date(x.oraPartenza).getTime() - new Date(y.oraPartenza).getTime())

  const subito = ordina(risultati.filter((r) => r.fermataPronta))
  const daChiedere = soloPronti ? [] : ordina(risultati.filter((r) => !r.fermataPronta))

  if (risultati.length === 0) return <Vuoto allargati={allargati ? ordina(allargati) : []} />

  return (
    <div className="elenco">
      <div className="elenco-comandi">
        <div className="segmenti" role="group" aria-label="Ordina">
          <button type="button" className="segmento" aria-pressed={ordine === 'ora'}
            onClick={() => setOrdine('ora')}>Chi parte prima</button>
          <button type="button" className="segmento" aria-pressed={ordine === 'prezzo'}
            onClick={() => setOrdine('prezzo')}>Più economico</button>
        </div>
        {risultati.some((r) => !r.fermataPronta) && (
          <label className="spunta">
            <input type="checkbox" checked={soloPronti}
              onChange={(e) => setSoloPronti(e.target.checked)} />
            Solo chi passa già da me
          </label>
        )}
      </div>

      <div className="righe">
        {subito.map((r) => <Riga key={r.corsaId} r={r} />)}
      </div>

      {daChiedere.length > 0 && (
        <section className="elenco-parte">
          <p className="occhiello">Da chiedere</p>
          <p className="elenco-spiega">
            Non passano dal tuo punto. Puoi proporre di essere preso dove sei:
            i chilometri in più li paghi tu, e decide chi guida.
          </p>
          <div className="righe">
            {daChiedere.map((r) => <Riga key={r.corsaId} r={r} />)}
          </div>
        </section>
      )}
    </div>
  )
}

function Riga({ r }: { r: Risultato }) {
  return (
    <a href={`/corsa/${r.corsaId}`} className="riga">
      {/* Gli orari incolonnati: si scorre una lista cercando un'ora. */}
      <div className="riga-ore">
        <span className="riga-partenza">{orario(r.oraPartenza)}</span>
        <span className="riga-filo" aria-hidden="true" />
        <span className="riga-arrivo">{orario(r.oraArrivo)}</span>
        {r.flessibileMin ? <span className="riga-flex">± {r.flessibileMin}′</span> : null}
      </div>

      <div className="riga-tratta">
        <span className="riga-dove">{r.partenzaLabel}</span>
        <span className="riga-verso">{r.arrivoLabel}</span>

        <span className="riga-chi">
          <span className="faccia riga-faccia"
            style={r.conducente.fotoUrl
              ? { backgroundImage: `url(${r.conducente.fotoUrl})` }
              : undefined}>
            {!r.conducente.fotoUrl && r.conducente.nome.charAt(0)}
          </span>
          <span className="riga-nome">{r.conducente.nome}</span>
          <span className="riga-auto">{r.veicolo.marca} {r.veicolo.modello}</span>
          {r.conducente.distintivi.map((d) => (
            <span key={d} className="pastiglia pastiglia-verde">{d}</span>
          ))}
        </span>
      </div>

      <div className="riga-soldi">
        <span className="numero riga-prezzo">{euro(r.prezzoDa)}</span>
        <span className="riga-posti">
          {r.postiLiberi === 1 ? 'ultimo posto' : `${r.postiLiberi} posti`}
        </span>
        {!r.fermataPronta && (
          <span className="riga-deviazione">
            +{r.kmDeviazione.toFixed(1).replace('.', ',')} km
          </span>
        )}
      </div>
    </a>
  )
}

function Vuoto({ allargati }: { allargati: Risultato[] }) {
  return (
    <div className="elenco">
      <div className="vuoto">
        <h2 className="t-sezione">Nessuno va lì a quell&apos;ora</h2>
        <p className="vuoto-testo" style={{ marginTop: 'var(--s3)' }}>
          Non vuol dire che non ci andrà nessuno. Dicci che stai cercando: chi
          guida su quella tratta lo vede, e ti avvisiamo appena qualcuno
          pubblica. È così che nascono quasi tutte le prime corse.
        </p>
        <a href="/cerco" className="azione azione-piena" style={{ marginTop: 'var(--s5)' }}>
          Dillo, cerco un passaggio <SegnoAvanti />
        </a>
      </div>

      {allargati.length > 0 && (
        <section className="elenco-parte">
          <p className="occhiello">Poco prima o poco dopo</p>
          <p className="elenco-spiega">
            Fuori dall&apos;orario che hai chiesto, ma sulla stessa strada.
          </p>
          <div className="righe">
            {allargati.map((r) => <Riga key={r.corsaId} r={r} />)}
          </div>
        </section>
      )}
    </div>
  )
}
