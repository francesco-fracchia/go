import { Legale, H2 } from '../../../components/Legale.tsx'

export default function Pagina() {
  return (
    <Legale titolo="Come trattiamo i tuoi dati" aggiornato="30 agosto 2026" bozza>
      <H2>Cosa raccogliamo, e perché</H2>
      <p>
        <strong>Nome, cognome, telefono, foto.</strong> Servono perché chi
        viaggia con te sappia con chi ha a che fare. Il telefono lo
        verifichiamo con un codice.
      </p>
      <p>
        <strong>I luoghi dei tuoi viaggi.</strong> Partenza, arrivo, fermate.
        Senza, non esiste il servizio.
      </p>
      <p>
        <strong>I dati del veicolo.</strong> Marca, modello, alimentazione e
        targa. Servono a calcolare il costo chilometrico e a farti riconoscere
        al ritrovo.
      </p>
      <p>
        <strong>I messaggi in chat.</strong> Li conserviamo per potervi
        assistere se qualcosa va storto.
      </p>

      <H2>Cosa non facciamo</H2>
      <p>
        Non ti seguiamo con il GPS: registriamo i punti che dichiari, non dove
        sei. Non vendiamo i tuoi dati a nessuno. Non ti profiliamo per la
        pubblicità.
      </p>
      <p>
        Il tuo <strong>numero di telefono non viene mai dato agli altri
        utenti</strong>. Le chiamate passano da un numero della piattaforma,
        attivo solo nella mezz&apos;ora prima della partenza e durante il
        viaggio.
      </p>

      <H2>Chi altro li vede</H2>
      <p>
        Supabase (banca dati, in Unione europea), Stripe (pagamenti e verifica
        d&apos;identità di chi incassa), Twilio (SMS e chiamate), Vercel
        (hosting), OpenRouteService (calcolo dei percorsi — riceve coordinate,
        non nomi).
      </p>

      <H2>Per quanto tempo</H2>
      <p>
        I dati di un viaggio restano dieci anni, perché lo impone la normativa
        fiscale sulle transazioni. Le chat un anno. Se chiudi l&apos;account
        cancelliamo il profilo e rendiamo anonimi i viaggi passati, che non
        possiamo eliminare per lo stesso motivo.
      </p>

      <H2>I tuoi diritti</H2>
      <p>
        Puoi chiedere di vedere i tuoi dati, correggerli, cancellarli o
        portarli altrove scrivendo a <strong>ciao@vaigo.app</strong>.
        Rispondiamo entro trenta giorni. Puoi anche rivolgerti al Garante per
        la protezione dei dati personali.
      </p>

      <p style={{ color: 'var(--tenue)', fontSize: 14, marginTop: 30 }}>
        Da definire con un professionista: titolare del trattamento e dati
        identificativi, basi giuridiche per ciascuna finalità, registro dei
        trattamenti, accordi di responsabile con ciascun fornitore,
        trasferimenti extra-UE, valutazione d&apos;impatto.
      </p>
    </Legale>
  )
}
