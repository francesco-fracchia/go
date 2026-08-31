import { euro } from './base.tsx'
import { SegnoAvanti, SegnoPiu } from './segni.tsx'
import { Tracciato } from './visivi.tsx'

/**
 * La casa di chi offre un posto.
 *
 * Chi guida non cerca: pubblica, e poi vuole sapere com'è messa la sua
 * corsa. Prima non aveva nessun posto dove chiederlo — pubblicava e la
 * corsa spariva in un elenco misto con i viaggi da passeggero.
 *
 * L'ordine risponde a tre domande in fila: c'è qualcosa che devo fare
 * adesso? Come vanno le corse che ho già pubblicato? Vale la pena
 * pubblicarne un'altra?
 *
 * L'ultima è la sezione che nessun'altra applicazione di questo tipo ha, e
 * qui esiste perché la tabella delle richieste esiste davvero: chi sta
 * cercando un passaggio sulla tua strada, adesso. È la ragione per cui uno
 * pubblica invece di partire da solo.
 */

export interface CorsaMia {
  id: string
  quando: string
  origine: string
  destinazione: string
  postiOfferti: number
  postiPresi: number
  richieste: number
  rientroCent: number | null
  stato: string
  daFare?: string
}

export interface ChiCerca {
  id: string
  quando: string
  origine: string
  destinazione: string
  posti: number
  flessibilitaMin: number
}

export interface Cosa { fatta: boolean; titolo: string; testo: string; dove: string; azione: string }

export function CasaConducente({ nome, corse, chiCercano, haVeicolo, cose = [] }: {
  nome?: string
  corse: CorsaMia[]
  chiCercano: ChiCerca[]
  haVeicolo: boolean
  /**
   * Quello che manca per incassare davvero.
   *
   * Sta qui e non solo nella presentazione perché la presentazione si vede
   * una volta: chi rimanda il collegamento del conto — e lo rimandano
   * quasi tutti, giustamente, finché non serve — se lo deve ritrovare
   * davanti quando torna, non ricordare.
   */
  cose?: Cosa[]
}) {
  const daFare = corse.filter((c) => c.daFare)

  return (
    <div className="fascia">
      <div className="dentro dentro-app casa-dentro">

        <section className="guida-testa">
          <div className="cresci">
            <p className="occhiello">Stai andando comunque</p>
            <h1 className="t-titolo" style={{ margin: 'var(--s3) 0 var(--s4)' }}>
              {nome ? `Dove vai, ${nome}?` : 'Dove stai andando?'}
            </h1>
            <p className="t-guida" style={{ maxWidth: '36ch' }}>
              Pubblica il viaggio che faresti comunque. Chi sale divide con te
              quello che spendi.
            </p>
            <div className="azioni" style={{ marginTop: 'var(--s5)' }}>
              <a href={haVeicolo ? '/pubblica' : '/veicoli/nuovo'} className="azione azione-piena">
                <SegnoPiu />
                {haVeicolo ? 'Pubblica un viaggio' : 'Aggiungi la tua auto'}
              </a>
            </div>
            {!haVeicolo && (
              <p className="t-nota" style={{ marginTop: 'var(--s3)', maxWidth: '40ch' }}>
                Ci servono marca e modello per sapere quanto ti costa un
                chilometro: è da lì che esce la quota di chi sale.
              </p>
            )}
          </div>
          <div className="guida-disegno" aria-hidden="true"><Tracciato altezza={150} /></div>
        </section>

        {/* ── Quello che manca per incassare ── */}
        {cose.some((c) => !c.fatta) && (
          <section className="casa-sezione">
            <p className="occhiello" style={{ marginBottom: 'var(--s3)' }}>
              Prima di incassare
            </p>
            <ol className="lista-cose">
              {cose.filter((c) => !c.fatta).map((c) => (
                <li key={c.titolo} className="cosa">
                  <span className="cosa-segno" aria-hidden="true" />
                  <span className="cresci">
                    <span className="cosa-titolo">{c.titolo}</span>
                    <span className="cosa-testo">{c.testo}</span>
                  </span>
                  <a href={c.dove} className="azione azione-vuota azione-piccola cosa-azione">
                    {c.azione}
                  </a>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* ── Le cose in sospeso ── */}
        {daFare.length > 0 && (
          <section className="casa-sezione">
            <p className="occhiello occhiello-accento" style={{ marginBottom: 'var(--s3)' }}>
              {daFare.length === 1 ? 'Una cosa da fare' : `${daFare.length} cose da fare`}
            </p>
            <div className="pila-s">
              {daFare.map((c) => (
                <a key={c.id} href={`/corsa/${c.id}`} className="sospeso">
                  <span className="cresci">
                    <span className="sospeso-cosa">{c.daFare}</span>
                    <span className="sospeso-dove">{c.destinazione} · {c.quando}</span>
                  </span>
                  <SegnoAvanti />
                </a>
              ))}
            </div>
          </section>
        )}

        {/* ── Le corse pubblicate ── */}
        {corse.length > 0 && (
          <section className="casa-sezione">
            <div className="fila-fra" style={{ marginBottom: 'var(--s4)' }}>
              <p className="occhiello">Le tue corse</p>
              <a href="/viaggi" className="casa-tutti">Tutte <SegnoAvanti dimensione={15} /></a>
            </div>
            <div className="griglia-elenco">
              {corse.slice(0, 6).map((c) => <CartaCorsa key={c.id} c={c} />)}
            </div>
          </section>
        )}

        {/* ── Chi sta cercando ──
            Non è una lista di annunci: è la domanda che esiste già sulla tua
            strada. Vederla prima di pubblicare cambia se pubblichi. */}
        <section className="casa-sezione">
          <div className="fila-fra" style={{ marginBottom: 'var(--s4)' }}>
            <p className="occhiello">Chi sta cercando un passaggio</p>
          </div>

          {chiCercano.length === 0 ? (
            <div className="vuoto-leggero">
              <p className="vuoto-titolo">Al momento non cerca nessuno</p>
              <p className="vuoto-testo">
                Quando qualcuno cerca un passaggio da queste parti lo trovi qui,
                con dove va e a che ora. Nel frattempo puoi pubblicare comunque:
                chi cerca vede le corse appena vengono messe.
              </p>
            </div>
          ) : (
            <div className="griglia-elenco">
              {chiCercano.slice(0, 6).map((r) => (
                <div key={r.id} className="cerca-riga">
                  <div className="cerca-tratta">
                    <span className="cerca-da">{r.origine}</span>
                    <span className="cerca-a">{r.destinazione}</span>
                  </div>
                  <div className="cerca-dati">
                    {r.quando}
                    {r.flessibilitaMin > 0 && ` · ± ${r.flessibilitaMin}′`}
                    {' · '}{r.posti === 1 ? 'una persona' : `${r.posti} persone`}
                  </div>
                  <a href="/pubblica" className="cerca-azione">
                    Ci vado io <SegnoAvanti dimensione={15} />
                  </a>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Quanto rientra, detto una volta ── */}
        <section className="casa-sezione">
          <div className="nota-guida">
            <p className="occhiello">Come funzionano i soldi</p>
            <p className="nota-guida-testo">
              Il costo del viaggio lo calcoliamo sulle tabelle ACI, sul modello
              esatto della tua auto, e lo dividiamo per le persone in macchina —
              <em className="viola"> tu compresa</em>. Quello che rientra è la
              parte degli altri: <strong>non ci guadagni</strong>, e non è
              previsto che tu ci guadagni. È la differenza fra dividere una
              spesa e fare il tassista.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}

function CartaCorsa({ c }: { c: CorsaMia }) {
  const liberi = c.postiOfferti - c.postiPresi
  return (
    <a href={`/corsa/${c.id}`} className="corsa-carta carta-tocco">
      <div className="fila-fra">
        <span className="corsa-quando">{c.quando}</span>
        {c.richieste > 0
          ? <span className="pastiglia pastiglia-viola">{c.richieste} da guardare</span>
          : liberi === 0
            ? <span className="pastiglia pastiglia-verde">piena</span>
            : <span className="pastiglia">{liberi} {liberi === 1 ? 'posto' : 'posti'}</span>}
      </div>
      <div className="corsa-dove">{c.destinazione}</div>
      <div className="corsa-da">da {c.origine}</div>
      <div className="corsa-piede">
        <span className="corsa-persone">
          {c.postiPresi === 0
            ? 'ancora nessuno'
            : `${c.postiPresi} ${c.postiPresi === 1 ? 'persona' : 'persone'} a bordo`}
        </span>
        {c.rientroCent !== null && (
          <span className="corsa-rientro">
            <span className="numero">{euro(c.rientroCent)}</span>
            <span className="corsa-rientro-nota">ti rientrano</span>
          </span>
        )}
      </div>
    </a>
  )
}
