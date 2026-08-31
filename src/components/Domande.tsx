import { SegnoAvanti } from './segni.tsx'

/**
 * Le domande.
 *
 * Ogni risposta qui dentro descrive quello che il codice fa davvero. È una
 * regola che costa: significa non poter scrivere «rimborso garantito» o
 * «assistenza 24 ore» perché suonerebbero bene. Ma una risposta falsa in
 * un centro assistenza non è una promessa esagerata: è la prima cosa che
 * qualcuno cita quando le cose vanno male.
 *
 * Sono divise per chi le fa. Chi cerca un passaggio e chi lo offre hanno
 * dubbi diversi, e un elenco unico obbliga tutti a leggere metà roba che
 * non li riguarda.
 */

export interface Domanda { d: string; r: string }

export const PER_CHI_CERCA: Domanda[] = [
  {
    d: 'Come prenoto un passaggio?',
    r: 'Dici dove vai e a che ora vuoi essere lì. Ti mostriamo chi sta già facendo quella strada, con l’orario, chi guida e quanto ti tocca delle spese. Su alcune corse il posto è tuo appena prenoti; su altre chi guida riceve una richiesta e risponde — te lo diciamo prima di farti scegliere.',
  },
  {
    d: 'Quando mi addebitate?',
    r: 'Mai al momento della prenotazione. La carta viene bloccata per l’importo massimo e addebitata solo quando il viaggio parte davvero. Se la corsa si annulla, o se chi guida rifiuta la tua richiesta, quel blocco cade e non paghi niente.',
  },
  {
    d: 'Quanto costa un passaggio?',
    r: 'Non lo decide chi guida: lo calcoliamo noi. Prendiamo il costo chilometrico del suo modello esatto dalle tabelle ACI, lo moltiplichiamo per i chilometri veri del percorso e lo dividiamo per le persone in macchina — chi guida compresa. Sopra c’è la nostra commissione, che vedi scritta prima di prenotare.',
  },
  {
    d: 'E se non passa da dove sono io?',
    r: 'Puoi proporre di essere preso dove sei. Calcoliamo i chilometri in più che quella deviazione costa, li paghi tu e li vedi prima di chiedere. Chi guida accetta o rifiuta: finché non risponde non ti addebitiamo niente e il posto resta prenotabile da altri.',
  },
  {
    d: 'Posso disdire?',
    r: 'Sì, e la regola è scritta sulla corsa prima che tu prenoti: su alcune fino a un’ora prima, su altre fino a sei. Dentro quella finestra non paghi niente. Fuori, ti diciamo quanto viene trattenuto prima di confermare la disdetta, mai dopo.',
  },
  {
    d: 'Nessuno va dove devo andare io.',
    r: 'Diccelo. La tua richiesta resta attiva, chi guida su quella tratta la vede quando pubblica, e ti avvisiamo appena compare un passaggio compatibile. Nel primo periodo è così che nasce la maggior parte delle corse: non aspettando che ci siano già.',
  },
]

export const PER_CHI_OFFRE: Domanda[] = [
  {
    d: 'Come pubblico un viaggio?',
    r: 'Dici dove vai, quando, e quanti posti hai oltre al tuo. Il resto lo calcoliamo: il percorso, i chilometri, quanto ti costa e quanto ti rientra — lo vedi mentre compili, prima di pubblicare. Serve la tua auto in anagrafica, perché il costo al chilometro dipende dal modello.',
  },
  {
    d: 'Quanto ci guadagno?',
    r: 'Niente, ed è voluto. Quello che ricevi è la parte degli altri di una spesa che avresti sostenuto comunque: siccome il costo si divide anche per te, resta sempre una quota a carico tuo. Non è una limitazione tecnica che toglieremo: è la ragione per cui un passaggio su GO non è un servizio di trasporto.',
  },
  {
    d: 'Posso decidere il prezzo?',
    r: 'No. Il prezzo esce dal costo reale del viaggio, e non si può alzare. Su una corsa privata puoi ridistribuire le quote fra chi sale — per esempio far pagare meno a qualcuno — ma il totale non sale mai sopra quello che il viaggio ti costa.',
  },
  {
    d: 'Quando ricevo i soldi?',
    r: 'Dopo che il viaggio è finito, non prima. L’incasso resta sulla piattaforma fino alla fine della corsa, e questo protegge chi ha prenotato: chi non si presenta non ha già i soldi in tasca. Per riceverli devi collegare un conto, e a quel punto Stripe verifica la tua identità.',
  },
  {
    d: 'Devo per forza accettare chi chiede?',
    r: 'No. Quando pubblichi scegli se il posto è prenotabile subito da chiunque o se vuoi ricevere una richiesta e rispondere. E le proposte di deviazione le accetti o le rifiuti una per una, vedendo quanti chilometri costano.',
  },
  {
    d: 'Cosa succede se non posso più partire?',
    r: 'Annulli, e più preavviso dai meglio è. Chi aveva prenotato viene avvisato e proviamo a trovargli un’alternativa sulla stessa tratta. Le corse annullate contano: «non annulla mai» è un distintivo che si calcola, e si perde annullando.',
  },
]

export const PER_TUTTI: Domanda[] = [
  {
    d: 'Cos’è GO, esattamente?',
    r: 'Un posto dove chi sta già facendo un viaggio e chi deve farlo si trovano, e dividono le spese. Non siamo un servizio di trasporto e chi guida non è un autista professionista: è un privato che sarebbe partito comunque. La differenza non è formale — è il motivo per cui costa quello che costa.',
  },
  {
    d: 'Come faccio a fidarmi di chi guida?',
    r: 'Prima di prenotare vedi nome, foto, età, la macchina, quante corse ha portato a termine, e cosa abbiamo verificato di quella persona — email, telefono, e il documento se ha collegato un conto per incassare. Ci sono le recensioni di chi ha davvero viaggiato con lei, e i distintivi, che non sono opinioni ma conteggi.',
  },
  {
    d: 'Devo dare il mio numero a uno sconosciuto?',
    r: 'No. Se dovete sentirvi la telefonata passa da un numero di appoggio: nessuno dei due vede quello dell’altro. E in app c’è una conversazione legata alla corsa.',
  },
  {
    d: 'Chi è responsabile del viaggio?',
    r: 'Chi guida, come in qualunque passaggio fra privati. GO mette a disposizione la piattaforma, il calcolo delle spese e l’incasso. Trattandosi di un accordo fra privati e non di un servizio professionale, non si applica la normativa a tutela del consumatore — in particolare il diritto di recesso. Lo scriviamo sulla corsa, prima di prenotare, non nelle condizioni.',
  },
]

/** Le domande in una griglia, con la risposta aperta o da aprire. */
export function Domande({ domande, aperte }: { domande: Domanda[]; aperte?: boolean }) {
  return (
    <div className="domande">
      {domande.map((q) => (
        <details key={q.d} className="domanda" open={aperte}>
          <summary className="domanda-titolo">{q.d}</summary>
          <p className="domanda-testo">{q.r}</p>
        </details>
      ))}
    </div>
  )
}

/** Il richiamo alla pagina intera, in fondo alla selezione della vetrina. */
export function TutteLeDomande() {
  return (
    <a href="/aiuto" className="azione azione-vuota">
      Tutte le domande <SegnoAvanti />
    </a>
  )
}
