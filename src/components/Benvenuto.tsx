'use client'
import { useState } from 'react'
import { Incontro, Spese } from './visivi.tsx'
import { Foto } from './Foto.tsx'
import { SegnoAvanti, SegnoCerca, SegnoGuida } from './segni.tsx'
import type { Modo } from '../server/modo.ts'

/**
 * La presentazione.
 *
 * Si vede una volta, appena registrati, e ha due compiti che nessun'altra
 * schermata può fare al posto suo.
 *
 * Il primo è chiedere **cosa sei venuto a fare**. GO è due prodotti, e da
 * quella risposta dipendono la casa, la barra, e metà delle parole che
 * l'applicazione userà: indovinarlo dal comportamento vuol dire sbagliarlo
 * per i primi giorni, che sono gli unici in cui uno decide se tornare.
 *
 * Il secondo è dire come funzionano i soldi PRIMA che qualcuno ci sbatta
 * contro. A chi guida, in particolare, va detto adesso che per incassare
 * serve collegare un conto e che quel conto chiede un documento: scoprirlo
 * dopo aver pubblicato, con una persona che aspetta, è il momento peggiore.
 *
 * Chi sceglie «tutti e due» vede anche i passi da conducente: è chi ha più
 * da imparare, e saltargli la parte difficile per non allungare la
 * presentazione sarebbe risparmiare due schermate al prezzo di un problema.
 */

type Passo = 'ruolo' | 'foto' | 'come' | 'soldi' | 'pronto'

export interface Cosa { fatta: boolean; titolo: string; testo: string; dove: string; azione: string }

export function Benvenuto({ nome, ritorno, cose, fotoUrl }: {
  nome?: string
  ritorno: string
  /** Quello che manca a chi vuole guidare: auto, numero, conto */
  cose: Cosa[]
  fotoUrl?: string | null
}) {
  const [passo, setPasso] = useState<Passo>('ruolo')
  const [ruolo, setRuolo] = useState<Modo | 'entrambi' | null>(null)
  const [foto, setFoto] = useState<string | null>(fotoUrl ?? null)

  const guida = ruolo === 'conducente' || ruolo === 'entrambi'
  const passi: Passo[] = guida
    ? ['ruolo', 'foto', 'come', 'soldi', 'pronto']
    : ['ruolo', 'foto', 'come', 'soldi']
  const i = passi.indexOf(passo)

  function scegli(r: Modo | 'entrambi') {
    setRuolo(r)
    // La modalità si ricorda subito: la schermata dopo è già vestita da
    // quello che hai appena detto di essere.
    const m: Modo = r === 'passeggero' ? 'passeggero' : 'conducente'
    document.cookie = `modo=${m}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
    // Chi ha già una foto — perché è entrato con Google, o perché torna —
    // non se la vede chiedere di nuovo.
    setPasso(foto ? 'come' : 'foto')
  }

  const avanti = () => setPasso(passi[Math.min(i + 1, passi.length - 1)]!)
  const finisci = () => { window.location.href = ritorno }

  return (
    <div className="fascia">
      <div className="dentro dentro-app benvenuto">

        {passo !== 'ruolo' && (
          <ol className="spina">
            {passi.slice(1).map((p, n) => (
              <li key={p} className={`spina-passo${n < i - 1 ? ' spina-fatto' : ''}${n === i - 1 ? ' spina-qui' : ''}`}>
                <span className="spina-numero">{n + 1}</span>
                <span className="spina-nome">
                  {p === 'foto' ? 'La tua foto'
                    : p === 'come' ? 'Come funziona'
                      : p === 'soldi' ? 'I soldi' : 'Per partire'}
                </span>
              </li>
            ))}
          </ol>
        )}

        {passo === 'ruolo' && (
          <section className="benvenuto-passo">
            <p className="occhiello">Benvenuto{nome ? `, ${nome}` : ''}</p>
            <h1 className="t-titolo" style={{ margin: 'var(--s3) 0 var(--s4)' }}>
              Cosa sei venuto a fare?
            </h1>
            <p className="t-guida" style={{ maxWidth: '40ch' }}>
              GO funziona in due modi opposti, e cambia parecchio. Puoi
              cambiare idea quando vuoi, dall&apos;interruttore in alto.
            </p>

            <div className="scelte-ruolo">
              <button type="button" className="ruolo" onClick={() => scegli('passeggero')}>
                <span className="ruolo-segno"><SegnoCerca /></span>
                <span className="cresci">
                  <span className="ruolo-titolo">Devo andare da qualche parte</span>
                  <span className="ruolo-testo">
                    Cerchi chi sta già facendo la tua strada e dividi le spese.
                  </span>
                </span>
                <span className="ruolo-freccia"><SegnoAvanti /></span>
              </button>

              <button type="button" className="ruolo" onClick={() => scegli('conducente')}>
                <span className="ruolo-segno"><SegnoGuida /></span>
                <span className="cresci">
                  <span className="ruolo-titolo">Ho la macchina e dei posti liberi</span>
                  <span className="ruolo-testo">
                    Pubblichi il viaggio che faresti comunque e dividi quello che spendi.
                  </span>
                </span>
                <span className="ruolo-freccia"><SegnoAvanti /></span>
              </button>

              <button type="button" className="ruolo" onClick={() => scegli('entrambi')}>
                <span className="ruolo-segno ruolo-segno-doppio" aria-hidden="true">
                  <SegnoCerca /><SegnoGuida />
                </span>
                <span className="cresci">
                  <span className="ruolo-titolo">Tutti e due, dipende dalla serata</span>
                  <span className="ruolo-testo">
                    Ti mostriamo anche come si incassa: è la parte che serve sapere prima.
                  </span>
                </span>
                <span className="ruolo-freccia"><SegnoAvanti /></span>
              </button>
            </div>
          </section>
        )}

        {passo === 'foto' && (
          <section className="benvenuto-passo">
            <h1 className="t-titolo">Facci vedere chi sei</h1>
            <p className="t-guida" style={{ margin: 'var(--s4) 0 var(--s6)', maxWidth: '42ch' }}>
              È l&apos;unica cosa che, prima di salire in macchina con qualcuno
              alle due di notte, dice davvero qualcosa. Un nome si scrive; una
              faccia no.
            </p>

            <Foto fotoUrl={foto} nome={nome ?? 'G'} suCaricata={setFoto} />

            <div className="azioni" style={{ marginTop: 'var(--s7)' }}>
              <button type="button" className="azione azione-piena"
                aria-disabled={!foto} onClick={avanti}>
                Avanti <SegnoAvanti />
              </button>
            </div>
            {!foto && (
              <p className="t-nota" style={{ marginTop: 'var(--s3)' }}>
                La chiediamo a tutti, senza eccezioni: un profilo senza faccia
                è la ragione più comune per cui una richiesta viene rifiutata.
              </p>
            )}
          </section>
        )}

        {passo === 'come' && (
          <section className="benvenuto-passo benvenuto-doppio">
            <div>
              <h1 className="t-titolo">Nessuno parte per te</h1>
              <p className="t-guida" style={{ margin: 'var(--s4) 0 var(--s5)', maxWidth: '38ch' }}>
                È la differenza che spiega tutto il resto: su GO qualcuno
                stava già andando, e tu ti aggiungi.
              </p>
              <ol className="passi-brevi">
                <li><b>Qualcuno pubblica il viaggio che farebbe comunque.</b> Non lo fa per te: lo faceva lo stesso.</li>
                <li><b>Tu cerchi dove devi andare.</b> Ti mostriamo chi ci passa, anche chi ti passa solo vicino.</li>
                <li><b>Vi trovate e dividete le spese.</b> Il punto di ritrovo lo fissiamo noi, il pagamento è in app.</li>
              </ol>
              <Piede su={avanti} testo="Avanti" />
            </div>
            <div className="benvenuto-disegno"><Incontro id="benvenuto" /></div>
          </section>
        )}

        {passo === 'soldi' && (
          <section className="benvenuto-passo benvenuto-doppio">
            <div>
              <h1 className="t-titolo">
                {guida ? 'Non ci guadagni, e va bene così' : 'Non stai pagando un passaggio'}
              </h1>
              <p className="t-guida" style={{ margin: 'var(--s4) 0 var(--s5)', maxWidth: '40ch' }}>
                {guida
                  ? 'Quello che ricevi è la parte degli altri di una spesa che avresti sostenuto comunque. Siccome il costo si divide anche per te, una quota resta sempre a carico tuo: è la ragione per cui un passaggio su GO non è un servizio di trasporto.'
                  : 'Paghi la tua parte di una spesa che esisteva già. Per questo le cifre non somigliano a una tariffa: non c’è nessun margine dentro.'}
              </p>
              <ul className="punti-guida">
                <li>Il prezzo lo calcoliamo noi dalle tabelle ACI, sul modello esatto dell&apos;auto. Nessuno lo decide a mano.</li>
                {guida
                  ? <li>Ricevi i soldi <b>dopo</b> il viaggio, non prima: chi ha prenotato è protetto, e tu non discuti niente in macchina.</li>
                  : <li>La carta viene <b>bloccata</b> alla prenotazione e addebitata solo quando il viaggio parte davvero.</li>}
                <li>Quanto tocca a ciascuno è scritto prima, non dopo.</li>
              </ul>
              <Piede su={avanti} testo={guida ? 'Cosa mi serve per partire' : 'Ho capito'} />
            </div>
            <div className="benvenuto-disegno benvenuto-spese"><Spese /></div>
          </section>
        )}

        {passo === 'pronto' && (
          <section className="benvenuto-passo">
            <h1 className="t-titolo">Per pubblicare ti serve questo</h1>
            <p className="t-guida" style={{ margin: 'var(--s4) 0 var(--s6)', maxWidth: '44ch' }}>
              Non serve fare tutto adesso — te lo ritrovi nella tua area, e
              te lo chiediamo al momento giusto. Ma è meglio saperlo prima
              che qualcuno ti stia aspettando.
            </p>

            <ol className="lista-cose">
              {cose.map((c) => (
                <li key={c.titolo} className={c.fatta ? 'cosa cosa-fatta' : 'cosa'}>
                  <span className="cosa-segno" aria-hidden="true">{c.fatta ? '✓' : ''}</span>
                  <span className="cresci">
                    <span className="cosa-titolo">{c.titolo}</span>
                    <span className="cosa-testo">{c.testo}</span>
                  </span>
                  {!c.fatta && (
                    <a href={c.dove} className="azione azione-vuota azione-piccola cosa-azione">
                      {c.azione}
                    </a>
                  )}
                </li>
              ))}
            </ol>

            <div className="nota-stripe">
              <p className="occhiello">Perché serve Stripe</p>
              <p className="nota-guida-testo">
                I soldi non passano da noi a mano: li gestisce <b>Stripe</b>,
                la stessa società che incassa per mezza Europa. Quando colleghi
                il conto ti chiede nome, data di nascita, indirizzo, un
                documento e l&apos;IBAN dove versare — è la legge sull&apos;antiriciclaggio,
                vale per chiunque riceva denaro, e noi quei dati non li vediamo
                mai. Ci vogliono cinque minuti, si fa una volta sola, e da quel
                momento gli accrediti arrivano da soli.
              </p>
            </div>

            <div className="azioni" style={{ marginTop: 'var(--s6)' }}>
              <button type="button" className="azione azione-piena" onClick={finisci}>
                Vai alla tua area <SegnoAvanti />
              </button>
            </div>
          </section>
        )}

        {/* Si può saltare la presentazione, non la foto: la prima è una
            cortesia, la seconda è quello su cui gli altri decidono se
            fidarsi di te. */}
        {passo !== 'ruolo' && passo !== 'pronto' && passo !== 'foto' && (
          <button type="button" className="collegamento-piccolo benvenuto-salta" onClick={finisci}>
            Salta la presentazione
          </button>
        )}
      </div>
    </div>
  )
}

function Piede({ su, testo }: { su: () => void; testo: string }) {
  return (
    <div className="azioni" style={{ marginTop: 'var(--s6)' }}>
      <button type="button" className="azione azione-piena" onClick={su}>
        {testo} <SegnoAvanti />
      </button>
    </div>
  )
}
