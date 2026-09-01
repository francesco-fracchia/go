import { Legale, H2 } from '../../../components/Legale.tsx'

/**
 * L'informativa.
 *
 * Deve descrivere l'applicazione che esiste, non quella che avevamo in
 * mente. La versione precedente diceva «non ti seguiamo con il GPS»
 * mentre durante il viaggio la posizione veniva registrata ogni
 * quarantacinque secondi, e prometteva cancellazioni che nessun processo
 * eseguiva. Un'informativa che descrive male il trattamento è una
 * violazione a sé, prima ancora del trattamento che descrive male.
 *
 * Dove c'è una lacuna, questa pagina la nomina invece di coprirla.
 */
export default function Pagina() {
  return (
    <Legale titolo="Come trattiamo i tuoi dati" aggiornato="1 settembre 2026" bozza>
      <H2>Cosa raccogliamo, e perché</H2>
      <p>
        <strong>Nome, cognome, data di nascita, telefono, foto.</strong> Servono
        perché chi viaggia con te sappia con chi ha a che fare. La data di
        nascita serve a una cosa sola: GO è riservato ai maggiorenni. Il
        telefono lo verifichiamo con un codice.
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
      <p>
        <strong>Le recensioni.</strong> Chi ha viaggiato con te può scrivere
        com&apos;è andata. Le vedete entrambi solo dopo che avete scritto tutti
        e due, o dopo qualche giorno: serve a evitare che uno risponda
        all&apos;altro invece di raccontare il viaggio.
      </p>

      <H2>La posizione durante il viaggio</H2>
      <p>
        Quando una corsa è in corso, e <strong>solo se dai il permesso al
        browser</strong>, registriamo dove sei <strong>ogni quarantacinque
        secondi</strong>. Serve a una cosa concreta: chi ti aspetta al ritrovo
        vede che stai arrivando, e chi è in macchina con te può far seguire il
        viaggio a qualcuno di sua fiducia.
      </p>
      <p>
        Chi la vede: <strong>solo</strong> chi guida e chi ha una prenotazione
        attiva su quella corsa, e solo se il punto è più recente di cinque
        minuti. Nessun altro utente, in nessun momento.
      </p>
      <p>
        Quanto dura: i punti spariscono <strong>quando la corsa finisce</strong>,
        e comunque un paio d&apos;ore dopo l&apos;ultimo punto registrato. Un
        processo automatico passa ogni due ore e li cancella. Fuori dalla corsa
        non registriamo niente: non sappiamo dove sei, e non vogliamo saperlo.
      </p>
      <p>
        Se neghi il permesso la corsa funziona lo stesso. Perdi solo il puntino
        sulla mappa.
      </p>

      <H2>Il tuo numero non lo diamo a nessuno</H2>
      <p>
        Il tuo <strong>numero di telefono non viene mai dato agli altri
        utenti</strong>. Le chiamate passano da un numero della piattaforma,
        attivo solo nella mezz&apos;ora prima della partenza e durante il
        viaggio. Non registriamo le telefonate.
      </p>

      <H2>Se qualcuno segnala qualcosa</H2>
      <p>
        Puoi segnalare cos&apos;è andato storto in un viaggio. Una segnalazione
        grave — chi guidava aveva bevuto, guidava in modo pericoloso, ha
        molestato qualcuno — è un&apos;accusa seria, e la trattiamo come tale:
        la legge chi modera, che vede anche <strong>come contattare chi ha
        segnalato</strong>, perché prima di decidere deve poter sentire tutti e
        due.
      </p>
      <p>
        Se arrivano due segnalazioni gravi indipendenti — persone diverse,
        viaggi diversi — l&apos;account viene <strong>sospeso in via
        cautelare</strong>. Te lo diciamo, ti diciamo di cosa si tratta e
        quando, e <strong>non ti diciamo chi</strong>: sarebbe consegnarti la
        persona che si è messa in salvo. Puoi rispondere, e nessuna decisione è
        definitiva prima che una persona abbia guardato.
      </p>

      <H2>Cosa non facciamo</H2>
      <p>
        Non vendiamo i tuoi dati a nessuno. Non ti profiliamo per la pubblicità.
        Non leggiamo le chat per curiosità né per statistiche: ci arriviamo solo
        dopo una segnalazione, e solo sullo scambio che riguarda quella. Non
        usiamo i tuoi messaggi per addestrare niente.
      </p>
      <p>
        Non ci sono cookie di tracciamento: quelli che usiamo servono a tenerti
        collegato e a ricordare se preferisci il tema chiaro o scuro.
      </p>
      <p>
        I caratteri tipografici li serviamo dal nostro dominio: aprendo GO non
        parte nessuna richiesta verso Google o altri.
      </p>

      <H2>Chi altro li vede</H2>
      <p>
        <strong>Supabase</strong> — la banca dati, a Francoforte (Unione
        europea).{' '}
        <strong>Vercel</strong> — dove gira l&apos;applicazione, a Francoforte.{' '}
        <strong>Stripe</strong> — pagamenti e verifica d&apos;identità di chi
        incassa.{' '}
        <strong>Twilio</strong> — SMS e chiamate: vede che una chiamata è
        avvenuta, non cosa vi siete detti.{' '}
        <strong>MapTiler</strong> — le mappe.{' '}
        <strong>OpenRouteService</strong> — il calcolo dei percorsi: riceve
        coordinate, non nomi.
      </p>

      <H2>Per quanto tempo</H2>
      <p>
        <strong>Le posizioni durante il viaggio</strong> spariscono da sole
        entro poche ore, come scritto sopra.
      </p>
      <p>
        <strong>I dati di un viaggio</strong> vanno conservati dieci anni: lo
        impone la normativa fiscale sulle transazioni.
      </p>
      <p>
        <strong>Le chat</strong>: oggi <strong>non le cancella ancora nessun
        processo automatico</strong>. La cancellazione a scadenza — dodici mesi
        — è in costruzione. Finché non c&apos;è, le togliamo su richiesta e
        quando chiudi l&apos;account. Preferiamo scriverlo che prometterlo.
      </p>
      <p>
        Se chiudi l&apos;account cancelliamo il profilo e rendiamo anonimi i
        viaggi passati, che non possiamo eliminare per l&apos;obbligo fiscale.
      </p>

      <H2>I tuoi diritti</H2>
      <p>
        Puoi chiedere di vedere i tuoi dati, correggerli, cancellarli o portarli
        altrove scrivendo a <strong>ciao@vaigo.app</strong>. Rispondiamo entro
        trenta giorni. Puoi anche rivolgerti al Garante per la protezione dei
        dati personali.
      </p>

      <p style={{ color: 'var(--tenue)', fontSize: 14, marginTop: 30 }}>
        Da definire con un professionista: titolare del trattamento e dati
        identificativi, basi giuridiche per ciascuna finalità, registro dei
        trattamenti, accordi di responsabile con ciascun fornitore, valutazione
        d&apos;impatto — che con la geolocalizzazione durante il viaggio e con
        il punteggio di reputazione è probabilmente obbligatoria, non
        facoltativa.
      </p>
    </Legale>
  )
}
