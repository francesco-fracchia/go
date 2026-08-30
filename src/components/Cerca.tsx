'use client'
import { useState } from 'react'
import { Marchio } from './Marchio.tsx'
import { Etichetta } from './base.tsx'
import { CampoLuogo, type LuogoScelto } from './CampoLuogo.tsx'

/**
 * La prima schermata.
 *
 * L'ordine di lettura è deciso: marchio, promessa, azione, spiegazione. Il
 * modulo di ricerca resta il punto operativo — è la cosa che si viene a
 * fare — ma smette di essere l'unica cosa che si vede.
 *
 * Prima era il contrario: tre campi e un pulsante riempivano lo schermo, e
 * l'unica informazione forte era «compila». Chi arrivava senza sapere cosa
 * fosse GO se ne andava senza averlo capito.
 *
 * Il viola resta l'accento e non il fondo: colora quello che si tocca — le
 * azioni, i collegamenti, i numeri dei passaggi — e una sola superficie, il
 * suggerimento sotto la ricerca. Una pagina interamente viola avrebbe
 * gridato «marchio» invece di far leggere.
 */

export interface Serata {
  id: string
  locale: string
  citta: string
  quando: string
  corsePubblicate: number
}

export function Cerca({ serate = [], destinazione, mappa = false, vicino }: {
  serate?: Serata[]
  destinazione?: LuogoScelto
  mappa?: boolean
  vicino?: { lat: number; lng: number }
}) {
  const [da, setDa] = useState<LuogoScelto | null>(null)
  const [a, setA] = useState<LuogoScelto | null>(destinazione ?? null)
  const [quando, setQuando] = useState('')

  const pronta = !!da && !!a && !!quando

  function cerca() {
    if (!pronta) return
    const arrivo = new Date(quando)
    const p = new URLSearchParams({
      olat: String(da!.lat), olng: String(da!.lng),
      dlat: String(a!.lat), dlng: String(a!.lng),
      // Finestra attorno all'ora richiesta: chi vuole essere lì alle 23:30
      // accetta volentieri di arrivare alle 22:45.
      da: new Date(arrivo.getTime() - 90 * 60_000).toISOString(),
      a: new Date(arrivo.getTime() + 45 * 60_000).toISOString(),
    })
    window.location.href = `/cerca?${p}`
  }

  return (
    <main className="casa" style={{ maxWidth: 'var(--colonna)', margin: '0 auto', padding: '0 20px 60px' }}>

      {/* ══ Apertura ══ */}
      <section className="apertura">
        <div>
          {/* Sul desktop il marchio è già in barra: qui ci sta perché è
              l'unico posto della schermata dove GO è il soggetto, non
              l'etichetta di chi ospita la pagina. */}
          <div className="marchio-grande">
            <Marchio dimensione={52} />
            <span>GO</span>
          </div>

          <h1 className="promessa">
            Se vai comunque,<br /><em>vai insieme.</em>
          </h1>

          <p className="spiegazione">
            Qualcuno sta già facendo la tua strada. Dividete le spese del
            viaggio, e basta.
          </p>

          <div className="azioni">
            <a href="#cerca" className="azione azione-piena"
              onClick={(e) => {
                e.preventDefault()
                document.getElementById('cerca')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                document.querySelector<HTMLInputElement>('#cerca input')?.focus()
              }}>
              Trova un posto
            </a>
            <a href="/pubblica" className="azione azione-vuota">Offri un posto</a>
          </div>
        </div>

        <div>
          <div className="ricerca" id="cerca">
            <h2 className="ricerca-titolo">Dove vai?</h2>
            <p className="ricerca-sotto">Guardiamo chi ci va già.</p>

            <CampoLuogo mappa={mappa} vicino={vicino} etichetta="Parti da"
              valore={da} onScegli={setDa} segnaposto="Lodi, piazza della Vittoria" />
            <CampoLuogo mappa={mappa} vicino={vicino} etichetta="Vai a"
              valore={a} onScegli={setA} segnaposto="Fabrique, Milano" />
            <Campo etichetta="Vuoi essere lì" valore={quando} onChange={setQuando}
              tipo="datetime-local" />

            <button
              type="button"
              className="azione azione-piena"
              style={{ width: '100%', marginTop: 6, opacity: pronta ? 1 : .45,
                       pointerEvents: pronta ? 'auto' : 'none' }}
              aria-disabled={!pronta}
              onClick={cerca}
            >Cerca</button>
          </div>

          {/* Chi apre l'applicazione il sabato pomeriggio non ha in mente un
              indirizzo: ha in mente «stasera si esce». */}
          <a href="/posti" className="indizio">
            <span className="indizio-testo">
              <span className="indizio-forte">Non sai da dove partire?</span>
              <span className="indizio-debole">
                Guarda chi parte verso discoteche, stazioni e piazze qui intorno.
              </span>
            </span>
            <span className="indizio-freccia" aria-hidden="true">›</span>
          </a>
        </div>
      </section>

      {/* ══ Come funziona ══ */}
      <section className="sezione" aria-labelledby="come">
        <p className="sezione-etichetta" id="come">Come funziona</p>
        <div className="passaggi">
          <div>
            <div className="passo-numero">01</div>
            <h3 className="passo-titolo">Cerca</h3>
            <p className="passo-testo">
              Trova qualcuno che va nella tua stessa direzione, alla tua stessa ora.
            </p>
          </div>
          <div>
            <div className="passo-numero">02</div>
            <h3 className="passo-titolo">Scegli</h3>
            <p className="passo-testo">
              Guardi chi guida, che strada fa e quanto ti tocca delle spese.
            </p>
          </div>
          <div>
            <div className="passo-numero">03</div>
            <h3 className="passo-titolo">Andate insieme</h3>
            <p className="passo-testo">
              Vi mettete d&apos;accordo sul punto di ritrovo e partite.
            </p>
          </div>
        </div>
      </section>

      {/* ══ Perché non è un taxi ══ */}
      <section className="sezione perche" aria-labelledby="perche">
        <div>
          <p className="sezione-etichetta" id="perche">Perché GO</p>
          <p className="dichiarazione">
            Non devi pagare qualcuno perché ti porti a casa.
            Devi solo trovare <em>chi ci sta già andando.</em>
          </p>
        </div>
        <ul className="punti">
          <li className="punto">Chi guida sarebbe partito comunque: il viaggio esisteva già.</li>
          <li className="punto">Le spese si dividono fra chi è in macchina, conducente compreso.</li>
          <li className="punto">Nessuno guadagna sul viaggio — chi guida rientra solo di una parte.</li>
          <li className="punto">Quanto tocca a ciascuno lo calcoliamo noi sulle tabelle ACI.</li>
        </ul>
      </section>

      {/* ══ Il momento ══ */}
      <section className="notte" aria-labelledby="notte">
        <div>
          <h2 className="notte-ora" id="notte">Le quattro di notte.<br />Quaranta chilometri da casa.</h2>
          <p className="notte-testo">
            <span>Il taxi costa quaranta euro.</span>
            <span>I mezzi non ci sono.</span>
            <span>Ma qualcuno sta già tornando dalla tua parte.</span>
          </p>
          <div className="azioni">
            <a href="/posti" className="azione azione-piena">Trova chi torna</a>
          </div>
        </div>
        <Tracciato />
      </section>

      {/* ══ Le serate, se ce ne sono ══ */}
      {serate.length > 0 && (
        <section className="sezione" aria-labelledby="serate">
          <p className="sezione-etichetta" id="serate">Dove si va</p>
          <div style={{ display: 'grid', gap: 8 }}>
            {serate.map((s) => (
              <a key={s.id} href={`/serata/${s.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{
                  background: 'var(--carta)', border: '1px solid var(--riga)',
                  borderRadius: 14, padding: '14px 17px',
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', gap: 12,
                }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 15.5 }}>{s.locale}</div>
                    <div style={{ fontSize: 13.5, color: 'var(--tenue)' }}>
                      {s.citta} · {s.quando}
                    </div>
                  </div>
                  <div style={{
                    flexShrink: 0, fontSize: 13.5, fontWeight: 600,
                    color: s.corsePubblicate > 0 ? 'var(--verde)' : 'var(--accento)',
                  }}>
                    {s.corsePubblicate > 0
                      ? `${s.corsePubblicate} ${s.corsePubblicate === 1 ? 'passaggio' : 'passaggi'}`
                      : 'nessuno ancora'}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}

/**
 * Il tracciato.
 *
 * Non una mappa: una linea fra due punti, disegnata. Una mappa finta a
 * questa dimensione si riconosce subito ed è peggio di niente — questa non
 * pretende di essere un posto vero, dice solo «da qui a lì».
 */
function Tracciato() {
  return (
    <svg className="tracciato" viewBox="0 0 320 200" fill="none"
      role="img" aria-label="Un percorso fra due punti">
      <path d="M40 168 C 96 168, 84 96, 140 88 S 218 74, 268 40"
        stroke="var(--riga)" strokeWidth="10" strokeLinecap="round" />
      <path d="M40 168 C 96 168, 84 96, 140 88 S 218 74, 268 40"
        stroke="var(--accento)" strokeWidth="2.5" strokeLinecap="round"
        strokeDasharray="7 9" opacity=".85" />
      <circle cx="40" cy="168" r="8.5" fill="var(--carta)" stroke="var(--accento)" strokeWidth="3" />
      <circle cx="268" cy="40" r="8.5" fill="var(--accento)" />
      <circle cx="268" cy="40" r="17" stroke="var(--accento)" strokeWidth="1.5" opacity=".28" />
    </svg>
  )
}

function Campo({ etichetta, valore, onChange, tipo = 'text' }: {
  etichetta: string; valore: string
  onChange: (v: string) => void; tipo?: string
}) {
  return (
    <label style={{
      display: 'block', marginBottom: 12, padding: '11px 15px',
      border: '1px solid var(--riga)', borderRadius: 'var(--raggio-s)',
      background: 'var(--superficie)',
    }}>
      <span style={{ display: 'block', fontSize: 12, color: 'var(--tenue)' }}>
        {etichetta}
      </span>
      <input
        type={tipo}
        value={valore}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%', border: 'none', background: 'transparent', padding: '3px 0 0',
          fontSize: 16, fontFamily: 'var(--testo)', color: 'var(--inchiostro)',
          outline: 'none',
        }}
      />
    </label>
  )
}
