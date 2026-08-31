import { Marchio } from './Marchio.tsx'
import { Incontro, Notte, Spese, Tracciato } from './visivi.tsx'
import { SegnoAvanti, SegnoQuota, SegnoFiducia, SegnoVicino } from './segni.tsx'
import { Domande, TutteLeDomande, PER_CHI_CERCA, PER_CHI_OFFRE } from './Domande.tsx'
import { quotaApplicata, feePasseggero, type Corsa } from '../lib/pricing.ts'

/**
 * Il racconto: la prima schermata per chi non sa ancora cos'è GO.
 *
 * Prima era una dashboard con un modulo. L'unica informazione forte sopra
 * la piega era «compila quattro campi», e chi arrivava senza sapere cosa
 * fosse GO se ne andava senza averlo capito.
 *
 * Adesso l'ordine è quello del pensiero di chi legge: che cos'è → come
 * funziona davvero → in quale delle due situazioni sono io → il momento in
 * cui mi servirebbe → perché costa così poco → di chi mi sto fidando →
 * quanto costa davvero → adesso scegli.
 *
 * Il modulo di ricerca non c'è. Non è una dimenticanza: la prima decisione
 * non è «da dove parto», è «sto cercando o sto offrendo», e mettere tre
 * campi qui la nasconde sotto una domanda che viene dopo.
 */

/**
 * Dove portano i due inviti.
 *
 * Chi non è ancora entrato passa dall'accesso e ci torna dopo; chi è già
 * dentro va dritto dove voleva andare. Mandare un utente collegato su una
 * schermata di accesso che lo rimbalza indietro è il modo più veloce di
 * fargli pensare che qualcosa si sia rotto.
 */
function inviti(entrato?: boolean) {
  return entrato
    ? { cerco: '/', offro: '/pubblica', posti: '/posti' }
    : {
        cerco: '/entra?ritorno=%2F',
        offro: '/entra?ritorno=%2Fpubblica',
        posti: '/entra?ritorno=%2Fposti',
      }
}

export function Racconto({ entrato }: { entrato?: boolean }) {
  const v = inviti(entrato)
  return (
    <>
      <Apertura v={v} />
      <Pilastri />
      <ComeFunziona />
      <DueStrade v={v} />
      <QuattroDiNotte v={v} />
      <NonStaiPagando />
      <Fiducia />
      <Distintivi />
      <Esempi />
      <HaiPostiLiberi v={v} />
      <Aiuto />
      <Chiusura v={v} />
    </>
  )
}

type Inviti = ReturnType<typeof inviti>

/* ══ 1. L'apertura ═════════════════════════════════════════════════════
   A tutta larghezza, alta quanto lo schermo. A sinistra il marchio e la
   promessa, a destra il disegno di quello che succede. */

function Apertura({ v }: { v: Inviti }) {
  return (
    <section className="fascia apertura">
      <div className="dentro apertura-dentro">
        <div className="apertura-parola affiora">
          {/* Il logotipo per esteso, non il riquadro: qui GO è il
              soggetto, non l'etichetta di chi ospita la pagina. */}
          <div className="apertura-marchio">
            <Marchio variante="nudo" dimensione={40} />
          </div>

          <h1 className="t-monumento apertura-promessa">
            Se vai comunque,<br /><em className="viola">vai insieme.</em>
          </h1>

          <p className="t-guida apertura-guida">
            Trova qualcuno che sta già andando nella tua direzione.
            Oppure condividi i posti liberi della tua macchina.
          </p>

          <div className="azioni apertura-azioni">
            <a href={v.cerco} className="azione azione-piena">Trova un posto</a>
            <a href={v.offro} className="azione azione-vuota">Offri un posto</a>
          </div>

          <p className="t-nota apertura-nota">
            Nessuno guadagna sul viaggio. Si dividono le spese, e basta.
          </p>
        </div>

        <div className="apertura-disegno affiora affiora-2"><Incontro /></div>
      </div>
    </section>
  )
}

/* ══ 2. I tre pilastri ═════════════════════════════════════════════════
   Le tre ragioni per cui GO esiste, dette una volta e in fila. Non sono
   slogan: ciascuna corrisponde a una cosa che il prodotto fa e che si può
   verificare scorrendo la pagina. */

const PILASTRI = [
  {
    Segno: SegnoQuota,
    t: 'Costa poco perché non è un prezzo',
    d: 'Non paghi un passaggio: paghi la tua parte di una spesa che esisteva già. Il costo esce dalle tabelle ACI sul modello esatto dell’auto, diviso per chi è a bordo — chi guida compreso.',
  },
  {
    Segno: SegnoFiducia,
    t: 'Sai con chi sali prima di salire',
    d: 'Nome, foto, età, la macchina, quante corse ha portato a termine, cosa abbiamo verificato. E i distintivi, che non sono stelle date da qualcuno ma conteggi: «non annulla mai» vuol dire zero annullate su almeno cinque viaggi.',
  },
  {
    Segno: SegnoVicino,
    t: 'Ti trova anche chi passa solo vicino',
    d: 'Non serve stare esattamente sul suo percorso. Cerchiamo anche chi ti passa accanto e può fare qualche chilometro in più per prenderti: quei chilometri li calcoliamo, li paghi tu, e chi guida decide se accettare.',
  },
]

function Pilastri() {
  return (
    <section className="fascia sezione sezione-riga">
      <div className="dentro">
        <div className="griglia griglia-3">
          {PILASTRI.map(({ Segno, t, d }) => (
            <div key={t} className="pilastro">
              <span className="pilastro-segno"><Segno /></span>
              <h3 className="pilastro-titolo">{t}</h3>
              <p className="pilastro-testo">{d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ══ 3. Come funziona davvero ══════════════════════════════════════════ */

const PASSI = [
  { n: '01', t: 'Tu devi andare a Milano', d: 'Stasera, verso le undici. Il treno non c’è più e il taxi costa quaranta euro.' },
  { n: '02', t: 'Qualcuno ci sta già andando', d: 'Non per te: ci andava comunque. Ha tre posti liberi in macchina.' },
  { n: '03', t: 'Vi trovate', d: 'GO vi mette in contatto, fissa il punto di ritrovo e tiene il pagamento in sospeso.' },
  { n: '04', t: 'Condividete le spese', d: 'Il costo del viaggio diviso fra chi è in macchina. Chi guida compreso.' },
]

function ComeFunziona() {
  return (
    <section className="fascia sezione sezione-riga">
      <div className="dentro">
        <div className="testa-sezione">
          <div>
            <p className="occhiello">Come funziona davvero</p>
            <h2 className="t-titolo" style={{ marginTop: 'var(--s3)' }}>
              Non è un servizio di trasporto.<br />
              È una macchina che <em className="viola">partiva comunque.</em>
            </h2>
          </div>
        </div>

        <ol className="passi">
          {PASSI.map((p) => (
            <li key={p.n} className="passo">
              <span className="passo-numero">{p.n}</span>
              <h3 className="passo-titolo">{p.t}</h3>
              <p className="passo-testo">{p.d}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

/* ══ 3. Le due strade ══════════════════════════════════════════════════
   I due ingressi, con lo stesso peso. È la sezione che decide il percorso
   di tutto il resto dell'applicazione, e quindi non è una fila di pulsanti:
   sono due pannelli grandi, uno per situazione, scritti come le direbbe
   chi ci si trova dentro. */

function DueStrade({ v }: { v: Inviti }) {
  return (
    <section className="fascia sezione sezione-velo">
      <div className="dentro">
        <p className="occhiello" style={{ marginBottom: 'var(--s6)' }}>Tu cosa devi fare?</p>
        <div className="strade">
          <a href={v.cerco} className="strada">
            <span className="strada-situazione">Devo andare</span>
            <span className="strada-testo">
              da qualche parte, e non ho la macchina — o non ho voglia di guidare.
            </span>
            <span className="strada-azione">
              Trova un posto <SegnoAvanti />
            </span>
          </a>

          <a href={v.offro} className="strada strada-guida">
            <span className="strada-situazione">Ci vado comunque</span>
            <span className="strada-testo">
              e in macchina ho dei posti liberi. Tanto vale dividere quello che spendo.
            </span>
            <span className="strada-azione">
              Offri un posto <SegnoAvanti />
            </span>
          </a>
        </div>
      </div>
    </section>
  )
}

/* ══ 4. Le quattro di notte ════════════════════════════════════════════
   La sezione è scura in tutti i temi: è una scena, non una superficie. */

function QuattroDiNotte({ v }: { v: Inviti }) {
  return (
    <section className="fascia sezione sezione-scura">
      <div className="dentro notte-dentro">
        <div>
          <p className="occhiello">Il momento</p>
          <h2 className="t-titolo" style={{ margin: 'var(--s3) 0 var(--s5)' }}>
            Le quattro di notte.<br />Quaranta chilometri da casa.
          </h2>
          <p className="t-guida notte-testo">
            <span>I mezzi non ci sono.</span>
            <span>Il taxi costa più della serata.</span>
            <span className="notte-svolta">Ma qualcuno sta già tornando dalla tua parte.</span>
          </p>
          <div className="azioni" style={{ marginTop: 'var(--s6)' }}>
            <a href={v.posti} className="azione azione-chiara">Guarda chi torna</a>
          </div>
        </div>
        <div className="notte-disegno"><Notte /></div>
      </div>
    </section>
  )
}

/* ══ 5. Perché costa poco ══════════════════════════════════════════════ */

function NonStaiPagando() {
  return (
    <section className="fascia sezione">
      <div className="dentro perche-dentro">
        <div>
          <p className="occhiello">Il vero motivo per cui costa poco</p>
          <h2 className="t-titolo" style={{ margin: 'var(--s3) 0 var(--s5)' }}>
            Non stai pagando<br />un passaggio.
          </h2>
          <p className="t-guida misura">
            Chi guida sarebbe partito comunque: quel viaggio esisteva già, con
            o senza di te. Su GO si divide quello che il viaggio costa —
            niente di più, e mai per intero a nessuno.
          </p>
          <p className="t-nota" style={{ marginTop: 'var(--s5)', maxWidth: '46ch' }}>
            Il costo al chilometro non ce lo inventiamo: lo prendiamo dalle
            tabelle ACI, sul modello esatto della macchina di chi guida.
          </p>
        </div>
        <div className="perche-disegno"><Spese /></div>
      </div>
    </section>
  )
}

/* ══ 6. Fiducia ════════════════════════════════════════════════════════
   Solo cose che il prodotto fa davvero. Ogni riga qui sotto corrisponde a
   una tabella, a un controllo o a una chiamata che esistono nel codice: una
   promessa di sicurezza che non è vera è peggio del silenzio. */

const FATTI = [
  { t: 'Nessuno paga in macchina', d: 'Il pagamento è in app. La carta viene bloccata alla prenotazione e addebitata solo quando il viaggio parte davvero.' },
  { t: 'Il tuo numero resta tuo', d: 'Se dovete sentirvi, la telefonata passa da un numero di appoggio. Nessuno dei due vede quello dell’altro.' },
  { t: 'I distintivi si calcolano', d: '«Non annulla mai» non è un’opinione: è il conteggio delle corse che quella persona ha annullato. Zero.' },
  { t: 'Le recensioni arrivano dopo', d: 'Le lascia solo chi ha davvero viaggiato, entro due settimane, e prima di comparire passano da un controllo.' },
  { t: 'Sai chi guida prima di salire', d: 'Nome, foto, età, la macchina, quanti viaggi ha portato a termine, e se ha verificato email e telefono.' },
  { t: 'Disdire è chiaro', d: 'La regola è scritta sulla corsa prima di prenotare, non nelle condizioni. E quello che ti trattengono, se succede, te lo diciamo prima.' },
]

function Fiducia() {
  return (
    <section className="fascia sezione sezione-riga">
      <div className="dentro">
        <div className="testa-sezione">
          <div>
            <p className="occhiello">Salire in macchina con qualcuno</p>
            <h2 className="t-titolo" style={{ marginTop: 'var(--s3)' }}>
              Sappiamo che è la parte<br />che fa <em className="viola">esitare.</em>
            </h2>
          </div>
          <p className="t-corpo">
            Non ti diremo che è tutto sicuro. Ti diciamo esattamente cosa
            facciamo perché lo sia il più possibile — e niente di più di
            quello che facciamo davvero.
          </p>
        </div>

        <div className="griglia griglia-3">
          {FATTI.map((f) => (
            <div key={f.t} className="fatto">
              <h3 className="fatto-titolo">{f.t}</h3>
              <p className="fatto-testo">{f.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ══ I distintivi ══════════════════════════════════════════════════════
   L'equivalente onesto di un programma «conducente d'oro»: non un premio
   che assegniamo noi, ma quattro conteggi. Le soglie sono quelle vere,
   scritte nella vista che li calcola — se un giorno cambiano, cambia
   anche questa sezione, perché un distintivo spiegato male vale meno di
   un distintivo che non c'è. */

const DISTINTIVI = [
  { n: 'già avviato', q: 'almeno 3 viaggi portati a termine' },
  { n: 'non annulla mai', q: 'almeno 5 viaggi conclusi e nemmeno uno annullato' },
  { n: 'affidabile', q: 'almeno 20 viaggi conclusi, con meno del 5% annullati' },
  { n: 'veterano', q: 'almeno 25 viaggi conclusi e 15 recensioni positive' },
]

function Distintivi() {
  return (
    <section className="fascia sezione sezione-riga">
      <div className="dentro">
        <div className="testa-sezione">
          <div>
            <p className="occhiello">I distintivi</p>
            <h2 className="t-titolo" style={{ marginTop: 'var(--s3)' }}>
              Non diamo stelle.<br /><em className="viola">Contiamo.</em>
            </h2>
          </div>
          <p className="t-corpo">
            Una media di stelle dice poco: quattro e mezzo su cinque può
            voler dire chiunque. Su un passaggio il rischio numero uno è che
            non arrivi, e allora il distintivo che conta è quello — e si
            calcola dai fatti, non si assegna.
          </p>
        </div>

        <div className="griglia griglia-4">
          {DISTINTIVI.map((d) => (
            <div key={d.n} className="distintivo">
              <span className="pastiglia pastiglia-verde">{d.n}</span>
              <p className="distintivo-regola">{d.q}</p>
            </div>
          ))}
        </div>

        <p className="t-nota" style={{ marginTop: 'var(--s5)', maxWidth: '58ch' }}>
          Si perdono come si prendono. Chi annulla un viaggio perde «non
          annulla mai» e non c’è modo di riaverlo se non guidando.
        </p>
      </div>
    </section>
  )
}

/* ══ Hai posti liberi? ═════════════════════════════════════════════════
   La sezione che parla a chi ha l'auto. In un mercato a due lati il lato
   corto è l'offerta: senza qualcuno che parte non c'è niente da cercare,
   e questa pagina finora chiedeva quasi solo di cercare. */

function HaiPostiLiberi({ v }: { v: Inviti }) {
  return (
    <section className="fascia sezione sezione-velo">
      <div className="dentro guidatori-dentro">
        <div>
          <p className="occhiello">Hai la macchina</p>
          <h2 className="t-titolo" style={{ margin: 'var(--s3) 0 var(--s5)' }}>
            Quei posti dietro<br /><em className="viola">stanno viaggiando vuoti.</em>
          </h2>
          <p className="t-guida misura">
            Non devi cambiare i tuoi piani, né deviare, né aspettare nessuno:
            pubblichi il viaggio che faresti comunque e vedi subito quanto ti
            rientra. Ci vogliono meno di due minuti, e se non prenota nessuno
            la corsa sparisce da sola.
          </p>
          <ul className="punti-guida">
            <li>Il prezzo non lo devi decidere: lo calcoliamo dalle spese vere della tua auto.</li>
            <li>Scegli tu se accettare le richieste una per una o farti prenotare direttamente.</li>
            <li>I soldi arrivano dopo il viaggio, non prima: chi sale è protetto, e tu non discuti niente in macchina.</li>
          </ul>
          <div className="azioni" style={{ marginTop: 'var(--s6)' }}>
            <a href={v.offro} className="azione azione-piena">Pubblica un viaggio</a>
          </div>
        </div>
        <div className="guidatori-disegno"><Tracciato altezza={190} /></div>
      </div>
    </section>
  )
}

/* ══ Le domande ════════════════════════════════════════════════════════ */

function Aiuto() {
  return (
    <section className="fascia sezione sezione-riga">
      <div className="dentro">
        <div className="testa-sezione">
          <div>
            <p className="occhiello">Le domande che si fanno tutti</p>
            <h2 className="t-titolo" style={{ marginTop: 'var(--s3)' }}>
              Prima che tu debba chiedere.
            </h2>
          </div>
        </div>

        <div className="aiuto-colonne">
          <div>
            <p className="occhiello" style={{ marginBottom: 'var(--s3)' }}>Se cerchi un passaggio</p>
            <Domande domande={PER_CHI_CERCA.slice(0, 3)} />
          </div>
          <div>
            <p className="occhiello" style={{ marginBottom: 'var(--s3)' }}>Se ne offri uno</p>
            <Domande domande={PER_CHI_OFFRE.slice(0, 3)} />
          </div>
        </div>

        <div className="azioni" style={{ marginTop: 'var(--s6)', justifyContent: 'center' }}>
          <TutteLeDomande />
        </div>
      </div>
    </section>
  )
}

/* ══ 7. Esempi ═════════════════════════════════════════════════════════
   Marcati ESEMPIO, e con i numeri calcolati dallo stesso motore che fa i
   prezzi veri. Un numero inventato in vetrina che poi non torna nel
   prodotto è il modo più veloce di perdere la fiducia appena guadagnata. */

interface Esempio { da: string; a: string; km: number; posti: number; auto: string; cKm: number }

const ESEMPI: Esempio[] = [
  { da: 'Lodi', a: 'Milano, Fabrique', km: 36, posti: 3, auto: 'Kia Stonic 1.0', cKm: 40 },
  { da: 'Crema', a: 'Bergamo', km: 42, posti: 2, auto: 'Fiat Panda 1.2', cKm: 34 },
  { da: 'Codogno', a: 'Piacenza', km: 22, posti: 3, auto: 'Golf 1.6 TDI', cKm: 44 },
]

function Esempi() {
  return (
    <section className="fascia sezione sezione-riga">
      <div className="dentro">
        <div className="testa-sezione">
          <div>
            <p className="occhiello">Quanto costa, in concreto</p>
            <h2 className="t-titolo" style={{ marginTop: 'var(--s3)' }}>
              Tre viaggi, con i numeri veri.
            </h2>
          </div>
          <p className="t-corpo">
            Questi tre non sono viaggi pubblicati: sono esempi. Le cifre però
            escono dallo stesso calcolo che userebbe una corsa vera.
          </p>
        </div>

        <div className="griglia griglia-3">
          {ESEMPI.map((e) => <CartaEsempio key={e.a} e={e} />)}
        </div>
      </div>
    </section>
  )
}

function CartaEsempio({ e }: { e: Esempio }) {
  const c: Corsa = {
    modalita: 'pubblica', kmBase: e.km, centesimiPerKm: e.cKm,
    pedaggio: 0, parcheggio: 0, postiOfferti: e.posti,
  }
  const quota = quotaApplicata(c)
  const totale = quota + feePasseggero(c, e.posti)

  return (
    <div className="esempio">
      <span className="pastiglia esempio-marchio">esempio</span>
      <div className="esempio-tratta">
        <span className="esempio-da">{e.da}</span>
        <span className="esempio-freccia" aria-hidden="true">→</span>
        <span className="esempio-a">{e.a}</span>
      </div>
      <div className="esempio-dati">
        {e.km} km · {e.posti} posti · {e.auto}
      </div>
      <div className="esempio-prezzo">
        <span className="numero">{euro(totale)}</span>
        <span className="esempio-unita">a persona</span>
      </div>
      <p className="esempio-nota">
        Il viaggio costa {euro(Math.round(e.km * e.cKm))}. Diviso fra {e.posti + 1} persone,
        chi guida compreso.
      </p>
    </div>
  )
}

/* ══ 8. La chiusura ════════════════════════════════════════════════════ */

function Chiusura({ v }: { v: Inviti }) {
  return (
    <section className="fascia sezione chiusura">
      <div className="dentro chiusura-dentro">
        <h2 className="t-titolo">
          Qualcuno sta già andando.<br />
          <em className="viola">Devi solo trovarlo.</em>
        </h2>
        <div className="azioni" style={{ justifyContent: 'center' }}>
          <a href={v.cerco} className="azione azione-piena">Trova un posto</a>
          <a href={v.offro} className="azione azione-vuota">Offri un posto</a>
        </div>
        <p className="t-nota" style={{ maxWidth: '52ch', margin: '0 auto' }}>
          GO mette in contatto privati che condividono le spese di un viaggio
          che uno di loro avrebbe fatto comunque. Non è un servizio di
          trasporto, e chi guida non è un autista professionista.
        </p>
      </div>
    </section>
  )
}

const euro = (centesimi: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(centesimi / 100)
