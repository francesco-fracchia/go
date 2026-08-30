import { SchermataPrenotazione, type DatiPrenotazione } from '../../components/SchermataPrenotazione.tsx'
import { Marchio } from '../../components/Marchio.tsx'
import { SceltaTema } from '../../components/SceltaTema.tsx'
import { Risultati, type Risultato } from '../../components/Risultati.tsx'
import { Dettaglio, type DatiCorsa } from '../../components/Dettaglio.tsx'
import { Pubblica, type Bozza } from '../../components/Pubblica.tsx'
import { Cerca } from '../../components/Cerca.tsx'
import { CorsaConducente, type DatiCorsaConducente } from '../../components/CorsaConducente.tsx'
import { Conto } from '../../components/Conto.tsx'
import { Recensione } from '../../components/Recensione.tsx'
import { CercoPassaggio } from '../../components/CercoPassaggio.tsx'
import { FormVeicolo } from '../../components/FormVeicolo.tsx'
import { Entra } from '../../components/Entra.tsx'
import { Chat } from '../../components/Chat.tsx'
import { Posti } from '../../components/Posti.tsx'

/**
 * Anteprima.
 *
 * Le schermate con dati finti, per guardarle senza database né Stripe.
 * Ogni riquadro è la stessa vista che vede l'utente, allo stesso momento
 * della sua vita: quello che cambia sono solo i dati e l'orologio.
 */
export const dynamic = 'force-dynamic'

const fra = (min: number) => new Date(Date.now() + min * 60_000).toISOString()

const base: DatiPrenotazione = {
  id: 'anteprima',
  stato: 'autorizzata',
  esito: 'atteso',
  quotaCent: 371,
  deviazioneCent: 0,
  feeCent: 74,
  totaleCent: 445,
  catturatoCent: null,
  ritrovo: 'Piazza della Vittoria, Lodi',
  corsa: {
    id: 'c1',
    oraPartenza: fra(60 * 26),
    oraArrivo: fra(60 * 26 + 35),
    destinazioneLabel: 'Milano',
    politica: 'flessibile',
  },
  conducente: { nome: 'Giulia', fotoUrl: null },
  veicolo: { marca: 'Fiat', modello: 'Panda', colore: 'Bianca', targa: 'GK471RT' },
}

const SCENE: Array<{ titolo: string; nota: string; dati: DatiPrenotazione }> = [
  {
    titolo: 'In attesa di risposta',
    nota: 'Ha proposto una deviazione: il conducente deve accettare. Nessun addebito.',
    dati: {
      ...base, stato: 'richiesta', deviazioneCent: 111, totaleCent: 556,
      ritrovo: 'Via Fanfulla 12, Lodi',
      corsa: { ...base.corsa, oraPartenza: fra(60 * 9), oraArrivo: fra(60 * 9 + 40) },
    },
  },
  {
    titolo: 'Confermato, mancano giorni',
    nota: 'Domina la conferma. Targa e telefono non ci sono ancora: non servono.',
    dati: base,
  },
  {
    titolo: "L'ultima ora",
    nota: 'Il conto alla rovescia raddoppia. Compaiono targa e pulsante Chiama.',
    dati: {
      ...base,
      corsa: { ...base.corsa, oraPartenza: fra(24), oraArrivo: fra(59) },
    },
  },
  {
    titolo: 'Al ritrovo',
    nota: 'Nessun codice da mostrare. Solo dove, quando e come lo riconosci.',
    dati: {
      ...base, stato: 'catturata', catturatoCent: 445,
      corsa: { ...base.corsa, oraPartenza: fra(3), oraArrivo: fra(38) },
    },
  },
  {
    titolo: 'Dopo l\'arrivo',
    nota: 'L\'unico momento in cui si chiede qualcosa — e solo se è andata male.',
    dati: {
      ...base, stato: 'catturata', catturatoCent: 445,
      corsa: { ...base.corsa, oraPartenza: fra(-48), oraArrivo: fra(-9) },
    },
  },
  {
    titolo: 'Saltato',
    nota: 'Il conducente non ha confermato. Carta liberata prima di ogni altra cosa.',
    dati: {
      ...base, stato: 'annullata',
      corsa: { ...base.corsa, oraPartenza: fra(45), oraArrivo: fra(80) },
    },
  },
]

const risultati: Risultato[] = [
  {
    corsaId: 'r1', oraPartenza: fra(180), oraArrivo: fra(215),
    partenzaLabel: 'Piazza della Vittoria, Lodi', arrivoLabel: 'Fabrique, Milano',
    postiLiberi: 3, prezzoDa: 445, fermataPronta: true, kmDeviazione: 0, flessibileMin: 30,
    conducente: { nome: 'Giulia', fotoUrl: null, distintivi: ['non annulla mai'] },
    veicolo: { marca: 'Fiat', modello: 'Panda' },
  },
  {
    corsaId: 'r2', oraPartenza: fra(215), oraArrivo: fra(246),
    partenzaLabel: 'Stazione, Lodi', arrivoLabel: 'Fabrique, Milano',
    postiLiberi: 1, prezzoDa: 512, fermataPronta: true, kmDeviazione: 0,
    conducente: { nome: 'Marco', fotoUrl: null, distintivi: [] },
    veicolo: { marca: 'Volkswagen', modello: 'Golf' },
  },
  {
    corsaId: 'r3', oraPartenza: fra(160), oraArrivo: fra(200),
    partenzaLabel: 'Passa vicino a Via Fanfulla', arrivoLabel: 'Fabrique, Milano',
    postiLiberi: 2, prezzoDa: 468, fermataPronta: false, kmDeviazione: 2.4,
    conducente: { nome: 'Sara', fotoUrl: null, distintivi: ['veterana'] },
    veicolo: { marca: 'Toyota', modello: 'Yaris' },
  },
]

const dettaglio: DatiCorsa = {
  id: 'r1',
  oraPartenza: fra(180), oraArrivo: fra(215),
  fermate: [
    { etichetta: 'Piazza della Vittoria, Lodi', orario: '23:10', tipo: 'partenza' },
    { etichetta: 'Casello Melegnano', orario: '23:24', tipo: 'ritiro' },
    { etichetta: 'Fabrique, via Fantoli 9, Milano', orario: '23:45', tipo: 'destinazione' },
  ],
  postiLiberi: 3, quotaCent: 371, feeCent: 74, totaleCent: 445,
  confrontoTaxiCent: 3800,
  fermataPronta: true, kmDeviazione: 0,
  accettaDeviazioni: true, prenotaImmediata: true, politica: 'flessibile',
  ritorno: { id: 'r-ret', orario: '03:30' },
  note: 'Parto puntuale, se tardate avvisatemi. Musica alta, se non vi piace ditelo pure.',
  conducente: {
    nome: 'Giulia', fotoUrl: null, eta: 24, corseConcluse: 31,
    distintivi: ['non annulla mai', 'veterana'],
  },
  veicolo: {
    marca: 'Fiat', modello: 'Panda', colore: 'Bianca',
    fumo: false, animali: false, bagagliGrandi: true,
  },
}

const dettaglioDaChiedere: DatiCorsa = {
  ...dettaglio,
  fermataPronta: false, kmDeviazione: 2.4, prenotaImmediata: false,
  totaleCent: 468, quotaCent: 394,
  fermate: [
    { etichetta: 'Stazione, Lodi', orario: '23:05', tipo: 'partenza' },
    { etichetta: 'Fabrique, via Fantoli 9, Milano', orario: '23:44', tipo: 'destinazione' },
  ],
  conducente: { nome: 'Sara', fotoUrl: null, eta: 27, corseConcluse: 8, distintivi: ['non annulla mai'] },
}

const bozza: Bozza = {
  destinazione: 'Milano', origine: 'Lodi',
  oraArrivo: '23:45', oraPartenza: '23:00',
  minutiViaggio: 35, km: 40,
  postiOfferti: 3, costoCent: 1484, quotaPerPasseggeroCent: 371,
  rientroNettoCent: 1032,
  modalita: 'pubblica', prenotaImmediata: false,
  accettaDeviazioni: true, politica: 'flessibile',
}

const corsaConducente: DatiCorsaConducente = {
  id: 'c1', stato: 'pubblicata',
  oraPartenza: fra(175), oraArrivo: fra(210),
  origineLabel: 'Lodi', destinazioneLabel: 'Fabrique, Milano',
  postiOfferti: 3, modalita: 'pubblica', costoCent: 1484,
  rientroNettoCent: 688, tettoCent: 1113,
  daConfermare: true,
  passeggeri: [
    { id: 'a', nome: 'Marta', fotoUrl: null, punto: 'Piazza della Vittoria', quotaCent: 371, corseFatte: 4 },
    { id: 'b', nome: 'Davide', fotoUrl: null, punto: 'Piazza della Vittoria', quotaCent: 371, corseFatte: 0 },
  ],
  proposte: [
    {
      id: 'p1',
      passeggero: { nome: 'Ilaria', fotoUrl: null, corseFatte: 11 },
      punto: 'Via Fanfulla 12',
      kmInPiu: 2.4, incassoInPiuCent: 89,
      messaggio: 'È sulla strada per il casello, sono pronta 10 minuti prima!',
      scadeFra: '5 ore',
    },
  ],
}

const posti = [
  { id: 'p1', nome: 'Fabrique', categoria: 'discoteca' as const, citta: 'Milano',
    distanzaM: 34200, corse: 4, richieste: 2, lat: 45.44, lng: 9.24 },
  { id: 'p2', nome: 'Bolgia', categoria: 'discoteca' as const, citta: 'Osio Sopra',
    distanzaM: 51800, corse: 0, richieste: 3, lat: 45.63, lng: 9.60 },
  { id: 'p3', nome: 'Alcatraz', categoria: 'discoteca' as const, citta: 'Milano',
    distanzaM: 36400, corse: 1, richieste: 0, lat: 45.49, lng: 9.17 },
  { id: 'p4', nome: 'Piazza della Vittoria', categoria: 'piazza' as const, citta: 'Lodi',
    distanzaM: 420, corse: 0, richieste: 0, lat: 45.31, lng: 9.50 },
]

const serate = [
  { id: 's1', locale: 'Fabrique', citta: 'Milano', quando: 'stasera · 23:30', corsePubblicate: 4 },
  { id: 's2', locale: 'Alcatraz', citta: 'Milano', quando: 'sabato · 23:00', corsePubblicate: 1 },
  { id: 's3', locale: 'Bolgia', citta: 'Osio Sopra', quando: 'sabato · 23:30', corsePubblicate: 0 },
]

export default function Anteprima() {
  return (
    <div style={{ paddingBottom: 80 }}>
      <SceltaTema />
      <header style={{
        display: 'flex', alignItems: 'center', gap: 12,
        maxWidth: 1400, margin: '0 auto 8px', padding: '0 20px',
      }}>
        <Marchio dimensione={38} />
        <div>
          <h1 style={{ fontSize: 24 }}>Anteprima</h1>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--tenue)' }}>
            La stessa schermata in sei momenti diversi. Dati finti, nessun database.
          </p>
        </div>
      </header>

      <div style={{
        display: 'grid', gap: 26, maxWidth: 1400, margin: '32px auto 0',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        alignItems: 'start', padding: '0 20px',
      }}>
        <section>
          <div style={{ marginBottom: 10, paddingLeft: 4 }}>
            <h2 style={{ fontSize: 16 }}>Risultati</h2>
            <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--tenue)', lineHeight: 1.45 }}>
              Prima chi è già prenotabile, poi chi va chiesto. Un prezzo solo.
            </p>
          </div>
          <div style={{
            border: '1px solid var(--riga)', borderRadius: 22,
            background: 'var(--carta)', padding: '18px 16px', boxShadow: 'var(--ombra)',
          }}>
            <Risultati risultati={risultati} />
          </div>
        </section>

        <section>
          <div style={{ marginBottom: 10, paddingLeft: 4 }}>
            <h2 style={{ fontSize: 16 }}>Nessun risultato</h2>
            <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--tenue)', lineHeight: 1.45 }}>
              Lo stato più frequente del primo anno. Non si dice «nessun risultato».
            </p>
          </div>
          <div style={{
            border: '1px solid var(--riga)', borderRadius: 22,
            background: 'var(--carta)', padding: '18px 16px', boxShadow: 'var(--ombra)',
          }}>
            <Risultati risultati={[]} allargati={risultati.slice(0, 2)} />
          </div>
        </section>

        <Cornice titolo="Entrare"
          nota="Numero e codice. Niente password: su un'app che si apre quattro volte l'anno la dimenticano tutti.">
          <Entra />
        </Cornice>

        <Cornice titolo="Prima schermata"
          nota="Chi cerca in tre tocchi. E chi offre, senza doverlo scoprire in un menu.">
          <Cerca serate={serate} />
        </Cornice>

        <Cornice titolo="Dove si va"
          nota="Per chi apre l'app senza un indirizzo in mente. Ordinati per passaggi su GO, non per fama.">
          <Posti iniziali={posti} />
        </Cornice>

        <Cornice titolo="La corsa vista da chi guida"
          nota="La conferma a T−3h viene prima di tutto: se manca, la corsa si annulla.">
          <CorsaConducente c={corsaConducente} />
        </Cornice>

        <Cornice titolo="Corsa privata · dividere diversamente"
          nota="Si ridistribuisce, non si aggiunge. Il tetto resta quello del costo.">
          <CorsaConducente c={{
            ...corsaConducente, modalita: 'privata', tokenLink: 'aVQ3x8Kd1Pm',
            daConfermare: false, proposte: [],
          }} />
        </Cornice>

        <Cornice titolo="Dettaglio · prenotabile subito"
          nota="Prezzo grande e solo. La scomposizione è chiusa, sotto.">
          <Dettaglio c={dettaglio} />
        </Cornice>

        <Cornice titolo="Dettaglio · da chiedere"
          nota="Cambia l'azione e cambia la spiegazione: cosa costa, chi decide.">
          <Dettaglio c={dettaglioDaChiedere} />
        </Cornice>

        <Cornice titolo="Pubblica"
          nota="Ancorata all'ora di arrivo. Il numero che convince è quanto ti resta a carico.">
          <Pubblica b={bozza} />
        </Cornice>

        <Cornice titolo="La chat"
          nota="Una per corsa, non per coppia. Le frasi pronte esistono perché alle 2 di notte nessuno digita.">
          <div style={{ height: 640, overflow: 'hidden' }}>
            <Chat corsaId="c1" mio="io" titolo="Fabrique, Milano · 23:10" iniziali={[
              { id: '1', autore: 'g', testo: 'Ciao! Parto puntuale da piazza della Vittoria', creatoIl: '', nomeAutore: 'Giulia' },
              { id: '2', autore: 'io', testo: 'Perfetto, ci sono', creatoIl: '', nomeAutore: 'Tu' },
              { id: '3', autore: 'm', testo: 'Anch\'io! Arrivo cinque minuti prima', creatoIl: '', nomeAutore: 'Marta' },
            ]} />
          </div>
        </Cornice>

        <Cornice titolo="Cerco un passaggio"
          nota="L'altra metà del mercato. Senza, chi cerca in un momento vuoto se ne va e non torna.">
          <CercoPassaggio />
        </Cornice>

        <Cornice titolo="Il conto"
          nota="L'onboarding si chiede quando i soldi ci sono già: «hai 12,40 € da ritirare».">
          <Conto c={{
            inArrivo: 1240, totaleRicevuto: 4715,
            contoCollegato: false, onboardingIniziato: false,
            liquidazioni: [
              { settimana: '2026-08-17', importo_cent: 2064, eseguita_il: '2026-08-18' },
              { settimana: '2026-08-10', importo_cent: 2651, eseguita_il: '2026-08-11' },
            ],
          }} />
        </Cornice>

        <Cornice titolo="La recensione"
          nota="Niente stelle. Bene o male, e i distintivi li ricaviamo dai fatti.">
          <Recensione prenotazione="p1" nome="Giulia" />
        </Cornice>

        <Cornice titolo="La tua auto"
          nota="Il consumo non si dichiara: lo ricava il sistema dalle tabelle ACI.">
          <FormVeicolo />
        </Cornice>

        {SCENE.map((s) => (
          <section key={s.titolo}>
            <div style={{ marginBottom: 10, paddingLeft: 4 }}>
              <h2 style={{ fontSize: 16 }}>{s.titolo}</h2>
              <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--tenue)', lineHeight: 1.45 }}>
                {s.nota}
              </p>
            </div>
            <div style={{
              border: '1px solid var(--riga)', borderRadius: 22,
              background: 'var(--carta)', overflow: 'hidden',
              boxShadow: 'var(--ombra)',
            }}>
              <SchermataPrenotazione p={s.dati} />
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

function Cornice({ titolo, nota, children }: {
  titolo: string; nota: string; children: React.ReactNode
}) {
  return (
    <section>
      <div style={{ marginBottom: 10, paddingLeft: 4 }}>
        <h2 style={{ fontSize: 16 }}>{titolo}</h2>
        <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--tenue)', lineHeight: 1.45 }}>
          {nota}
        </p>
      </div>
      <div style={{
        border: '1px solid var(--riga)', borderRadius: 22,
        background: 'var(--carta)', overflow: 'hidden', boxShadow: 'var(--ombra)',
      }}>
        {children}
      </div>
    </section>
  )
}
