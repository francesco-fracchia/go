'use client'
import { useState } from 'react'
import { SegnoAvanti } from './segni.tsx'

/**
 * «Chi guida stasera?»
 *
 * La ruota gira, ma NON è a caso — e la schermata lo dice. Si ferma su chi
 * ha guidato meno fra quelli che stasera possono: a parità sceglie il caso,
 * che è l'unico punto in cui il caso ha senso, perché fra due persone ferme
 * allo stesso numero non c'è ragione di preferirne una.
 *
 * È la differenza fra un gioco e un'abitudine. Un sorteggio casuale diverte
 * una volta sola; un turno che si ricorda chiude una discussione che quel
 * gruppo rifà ogni sabato — e dà un motivo per aprire GO anche quando non
 * si sta viaggiando.
 */

export interface MembroVista {
  id: string; nome: string; fotoUrl: string | null
  volte: number; disponibile: boolean; saldo: number
}

const COLORI = ['#6E56F8', '#8B74FF', '#5842D6', '#A08CFF', '#4733B8', '#B8A6FF']

export function Comitiva({ id, nome, codice, membri: iniziali, tocca: toccaIniziale, io }: {
  id: string; nome: string; codice: string
  membri: MembroVista[]; tocca: string | null; io: string
}) {
  const [membri, setMembri] = useState(iniziali)
  const [tocca, setTocca] = useState(toccaIniziale)
  const [giro, setGiro] = useState(0)
  const [gira, setGira] = useState(false)
  const [scoperto, setScoperto] = useState(false)
  const [attesa, setAttesa] = useState(false)

  const disponibili = membri.filter((m) => m.disponibile)
  const ioNonGuido = !membri.find((m) => m.id === io)?.disponibile
  const scelto = membri.find((m) => m.id === tocca) ?? null
  const totale = membri.reduce((s, m) => s + m.volte, 0)

  /**
   * La ruota si ferma DOVE È GIÀ DECISO.
   *
   * L'esito arriva dal server prima che la ruota parta: l'animazione
   * calcola l'angolo che serve per fermarsi su quel nome, non il nome
   * dall'angolo. Se fosse il contrario il turno non conterebbe niente, e
   * questa schermata sarebbe una moneta lanciata con più passaggi.
   */
  function lancia() {
    if (gira || disponibili.length === 0 || !scelto) return
    const i = disponibili.findIndex((m) => m.id === scelto.id)
    if (i < 0) return
    const settore = 360 / disponibili.length
    // Al centro del settore, meno la posizione dell'indice in alto, più
    // cinque giri interi perché sia una girata e non uno scatto.
    const bersaglio = 360 * 5 + (360 - (i * settore + settore / 2))
    setScoperto(false); setGira(true)
    setGiro((g) => g + bersaglio)
    setTimeout(() => { setGira(false); setScoperto(true) }, 3400)
  }

  async function segnaGuidato(guidatore: string) {
    setAttesa(true)
    try {
      const r = await fetch('/api/comitive/turno', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ comitiva: id, guidatore }),
      })
      if (r.ok) {
        const d = await r.json()
        setMembri(d.membri); setTocca(d.tocca); setScoperto(false)
      }
    } finally { setAttesa(false) }
  }

  async function cambiaNonGuido() {
    setAttesa(true)
    try {
      await fetch('/api/non-guido', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ valore: ioNonGuido ? false : true }),
      })
      window.location.reload()
    } finally { setAttesa(false) }
  }

  return (
    <>
      <div className="fascia testata">
        <div className="dentro dentro-app testata-dentro">
          <div>
            <p className="occhiello">La comitiva</p>
            <h1 className="t-titolo testata-titolo" style={{ marginTop: 'var(--s3)' }}>{nome}</h1>
            <p className="testata-sotto">
              {membri.length === 1
                ? 'Per ora ci sei solo tu. Il codice qui sotto serve a farli entrare.'
                : `Siete in ${membri.length}. Chi guida stasera lo decide il turno, non la discussione.`}
            </p>
          </div>
        </div>
      </div>

      <div className="fascia">
        <div className="dentro dentro-app casa-dentro">

          {/* ── Stasera non guido ── */}
          <section className="casa-sezione">
            <button type="button" onClick={cambiaNonGuido} aria-disabled={attesa}
              className={`bevo${ioNonGuido ? ' bevo-detto' : ''}`}>
              <span className="cresci">
                <span className="bevo-forte">
                  {ioNonGuido ? 'Stasera non guidi' : 'Stasera non guido'}
                </span>
                <span className="bevo-debole">
                  {ioNonGuido
                    ? 'Sei fuori dal sorteggio fino a domani mattina. Tocca per rimetterti dentro.'
                    : 'Un tocco: esci dal sorteggio per stasera, e gli altri lo sanno prima di uscire.'}
                </span>
              </span>
              <span className={`bevo-segno${ioNonGuido ? ' bevo-segno-acceso' : ''}`} />
            </button>
          </section>

          {/* ── La ruota ── */}
          <section className="casa-sezione">
            <div className="fila-fra" style={{ marginBottom: 'var(--s4)' }}>
              <p className="occhiello">Chi guida stasera</p>
            </div>

            {disponibili.length === 0 ? (
              <div className="vuoto-leggero">
                <p className="vuoto-titolo">Stasera non guida nessuno</p>
                <p className="vuoto-testo">
                  Avete detto tutti che bevete. È una risposta legittima: vuol
                  dire che stasera serve un passaggio da fuori, non da dentro.
                </p>
                <a href="/cerca" className="azione azione-vuota" style={{ marginTop: 'var(--s4)' }}>
                  Cerca un passaggio <SegnoAvanti dimensione={15} />
                </a>
              </div>
            ) : (
              <div className="ruota-blocco">
                <div className="ruota-scena">
                  <span className="ruota-indice" />
                  <div className="ruota" style={{
                    transform: `rotate(${giro}deg)`,
                    transition: gira ? 'transform 3.3s cubic-bezier(.16,.9,.2,1)' : 'none',
                  }}>
                    <svg viewBox="0 0 200 200" width="100%" height="100%">
                      {disponibili.map((m, i) => (
                        <path key={m.id} d={settore(i, disponibili.length)}
                          fill={COLORI[i % COLORI.length]} />
                      ))}
                      {disponibili.map((m, i) => {
                        const a = (360 / disponibili.length) * (i + 0.5) - 90
                        const r = 62
                        const x = 100 + r * Math.cos(a * Math.PI / 180)
                        const y = 100 + r * Math.sin(a * Math.PI / 180)
                        /**
                         * Il nome segue il raggio, ma non si capovolge.
                         *
                         * Una rotazione tangenziale è giusta nella metà
                         * superiore e sottosopra in quella inferiore: con
                         * quattro persone, due nomi su quattro si leggevano
                         * a testa in giù. Girato di mezzo giro dove
                         * servirebbe, il testo esce dal centro invece di
                         * entrarci — e resta dritto ovunque.
                         */
                        let rot = ((a + 90) % 360 + 360) % 360
                        if (rot > 90 && rot < 270) rot -= 180
                        return (
                          <text key={m.id} x={x} y={y} fill="#fff" fontSize="11"
                            fontWeight="600" textAnchor="middle" dominantBaseline="middle"
                            transform={`rotate(${rot} ${x} ${y})`}>
                            {m.nome.slice(0, 9)}
                          </text>
                        )
                      })}
                      <circle cx="100" cy="100" r="26" fill="var(--carta)" />
                    </svg>
                  </div>
                </div>

                <div className="ruota-lato">
                  {scoperto && scelto ? (
                    <>
                      <p className="occhiello">Tocca a</p>
                      <p className="t-monumento ruota-nome">{scelto.nome}</p>
                      {/* Con il turno vuoto non c'è niente da confrontare:
                          «ha guidato zero volte su 0» è aritmetica, non una
                          frase. E il pulsante non può dire «lui»: il nome
                          estratto è appena stato Bea. */}
                      <p className="t-guida">
                        {totale === 0
                          ? 'Non ha ancora guidato nessuno: il turno comincia da qui.'
                          : `Ha guidato ${dette(scelto.volte)} su ${totale}.`}
                      </p>
                      <button type="button" className="azione azione-piena"
                        style={{ marginTop: 'var(--s5)' }} aria-disabled={attesa}
                        onClick={() => segnaGuidato(scelto.id)}>
                        {attesa ? 'Un attimo…' : 'Segna che ha guidato'}
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="t-blocco">
                        La ruota non è a caso.
                      </p>
                      <p className="t-guida" style={{ margin: 'var(--s3) 0 var(--s5)' }}>
                        Si ferma su chi ha guidato meno fra chi stasera può. A
                        parità decide il caso — ed è l&apos;unico punto in cui
                        serve.
                      </p>
                      <button type="button" className="azione azione-piena"
                        aria-disabled={gira} onClick={lancia}>
                        {gira ? 'Gira…' : 'Gira la ruota'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* ── Il conto, in passaggi ── */}
          <section className="casa-sezione">
            <div className="fila-fra" style={{ marginBottom: 'var(--s4)' }}>
              <p className="occhiello">Il conto, in passaggi</p>
            </div>
            <ul className="conto-elenco">
              {[...membri].sort((a, b) => b.saldo - a.saldo).map((m) => (
                <li key={m.id} className={m.id === io ? 'conto-io' : undefined}>
                  <span className="conto-nome">
                    {m.nome}{m.id === io && ' (tu)'}
                    {!m.disponibile && <span className="conto-beve"> · stasera beve</span>}
                  </span>
                  <span className="conto-volte">
                    {m.volte === 1 ? '1 volta' : `${m.volte} volte`}
                  </span>
                  {/* Arrotondato al passaggio intero.
                      Lo scarto dalla media è la misura giusta, ma «-0,2
                      passaggi» non vuol dire niente a nessuno: un passaggio
                      non si divide in quinti. Il numero esatto resta nei
                      dati, qui si mostra quello che una persona può usare —
                      quanti passaggi deve, o quanti gliene devono. */}
                  <span className={`conto-saldo${Math.round(m.saldo) > 0 ? ' conto-credito'
                    : Math.round(m.saldo) < 0 ? ' conto-debito' : ''}`}>
                    {Math.round(m.saldo) > 0 ? `+${Math.round(m.saldo)}`
                      : Math.round(m.saldo) < 0 ? String(Math.round(m.saldo))
                        : 'in pari'}
                  </span>
                </li>
              ))}
            </ul>
            <p className="t-nota" style={{ marginTop: 'var(--s4)' }}>
              Quanto ciascuno sta sopra o sotto la media del gruppo, contato in
              passaggi e non in euro. Un debito in natura fra amici è simpatico;
              lo stesso debito in denaro vi trasformerebbe in creditori.
            </p>
          </section>

          {/* ── Il codice ── */}
          <section className="casa-sezione">
            <div className="nota-guida">
              <p className="occhiello">Per farli entrare</p>
              <p className="nota-guida-testo">
                Dettagli questo codice: <strong className="codice-grande">{codice}</strong>
                <br />Lo mettono in «Entra in una comitiva» e ci sono.
              </p>
            </div>
          </section>
        </div>
      </div>
    </>
  )
}

/** «una volta», «tre volte» — mai «1 volte». */
const dette = (n: number) => n === 1 ? 'una volta' : `${n} volte`

/** Uno spicchio di ruota: dal centro, lungo l'arco del suo settore. */
function settore(i: number, n: number): string {
  if (n === 1) return 'M 100 100 m -95 0 a 95 95 0 1 0 190 0 a 95 95 0 1 0 -190 0'
  const passo = 360 / n
  const da = (passo * i - 90) * Math.PI / 180
  const a = (passo * (i + 1) - 90) * Math.PI / 180
  const x1 = 100 + 95 * Math.cos(da), y1 = 100 + 95 * Math.sin(da)
  const x2 = 100 + 95 * Math.cos(a), y2 = 100 + 95 * Math.sin(a)
  return `M 100 100 L ${x1} ${y1} A 95 95 0 ${passo > 180 ? 1 : 0} 1 ${x2} ${y2} Z`
}
