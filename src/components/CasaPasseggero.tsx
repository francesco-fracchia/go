import { Ricerca } from './Ricerca.tsx'
import { SegnoAvanti } from './segni.tsx'
import type { LuogoScelto } from './CampoLuogo.tsx'
import { euro } from './base.tsx'

/**
 * La casa di chi cerca un posto.
 *
 * Una domanda sola in grande — «Dove vai?» — e sotto tutto quello che
 * risponde alla stessa domanda senza doverla scrivere: il viaggio che hai
 * già prenotato, i posti dove vanno tutti, e il modo di far sapere che
 * stai cercando quando non c'è niente.
 *
 * Non è una dashboard. Una dashboard elenca lo stato del sistema; questa
 * schermata ha un solo compito, e tutto il resto è al servizio di quello.
 */

export interface ProssimoViaggio {
  id: string
  quando: string
  dove: string
  da: string
  importoCent: number | null
  daFare?: string
}

export interface PostoVicino {
  id: string
  nome: string
  citta: string | null
  categoria: string
  distanzaKm: number
  lat: number
  lng: number
}

export function CasaPasseggero({ nome, casa, mappa, vicino, prossimo, posti }: {
  nome?: string
  casa?: LuogoScelto
  mappa?: boolean
  vicino?: { lat: number; lng: number }
  prossimo?: ProssimoViaggio | null
  posti?: PostoVicino[]
}) {
  return (
    <>
      {/* La testata: la domanda che questa schermata fa, su una superficie
          sua. Prima era un titolo nero su bianco in mezzo ad altri blocchi
          bianchi, e non si capiva dove cominciasse la schermata. */}
      <div className="fascia testata">
        <div className="dentro dentro-app testata-dentro">
          <div>
            <h1 className="t-titolo testata-titolo">
              {nome ? `Dove vai, ${nome}?` : 'Dove vai?'}
            </h1>
            <p className="testata-sotto">
              Dicci dove devi arrivare e a che ora. Guardiamo chi sta già
              facendo quella strada.
            </p>
          </div>
        </div>
      </div>

    <div className="fascia">
      <div className="dentro dentro-app casa-dentro">

        {/* Il pannello sale dentro la fascia: è il comando principale della
            schermata, e sedersi a cavallo del bordo lo dice senza scriverlo. */}
        <div className="ricerca-sospesa">
          <Ricerca casa={casa} mappa={mappa} vicino={vicino} />
        </div>

        {/* ── Quello che devi fare adesso, se c'è ── */}
        {prossimo && <Prossimo v={prossimo} />}

        {/* ── Dove vanno tutti ──
            Chi apre l'applicazione il sabato pomeriggio non ha in mente un
            indirizzo: ha in mente «stasera si esce». */}
        {posti && posti.length > 0 && (
          <section className="casa-sezione">
            <div className="fila-fra" style={{ marginBottom: 'var(--s4)' }}>
              <p className="occhiello">Dove si va, qui intorno</p>
              <a href="/posti" className="casa-tutti">Tutti i posti <SegnoAvanti dimensione={15} /></a>
            </div>
            <div className="posti-fila">
              {posti.slice(0, 8).map((p) => (
                <a key={p.id} className="posto-gettone"
                  href={`/cerca?dlat=${p.lat}&dlng=${p.lng}&dove=${encodeURIComponent(p.nome)}`}>
                  <span className="posto-nome">{p.nome}</span>
                  <span className="posto-sotto">
                    {p.citta ? `${p.citta} · ` : ''}{p.distanzaKm.toFixed(0)} km
                  </span>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* ── L'altra metà del mercato ──
            Se nessuno va dove vai tu, l'applicazione non è finita: manca
            solo che qualcuno lo sappia. */}
        <section className="casa-sezione">
          <a href="/cerco" className="invito">
            <span className="cresci">
              <span className="invito-forte">Nessuno va dove devi andare tu?</span>
              <span className="invito-debole">
                Dillo. Chi guida su quella tratta lo vede, e ti avvisiamo appena
                qualcuno pubblica. È così che nascono quasi tutte le prime corse.
              </span>
            </span>
            <SegnoAvanti />
          </a>
        </section>
      </div>
    </div>
    </>
  )
}

function Prossimo({ v }: { v: ProssimoViaggio }) {
  return (
    <a href={`/prenotazione/${v.id}`} className="prossimo">
      <div className="cresci">
        <p className="occhiello occhiello-accento">Il tuo prossimo viaggio</p>
        <div className="prossimo-dove">{v.dove}</div>
        <div className="prossimo-quando">{v.quando} · da {v.da}</div>
        {v.daFare && <div className="prossimo-dafare">{v.daFare}</div>}
      </div>
      {v.importoCent !== null && (
        <div className="prossimo-prezzo">
          <span className="numero">{euro(v.importoCent)}</span>
        </div>
      )}
    </a>
  )
}
