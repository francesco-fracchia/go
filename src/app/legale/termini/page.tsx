import { Legale, H2 } from '../../../components/Legale.tsx'

export default function Pagina() {
  return (
    <Legale titolo="Condizioni d'uso" aggiornato="30 agosto 2026" bozza>
      <H2>Che cos&apos;è GO</H2>
      <p>
        GO mette in contatto persone che stanno già facendo un viaggio in auto
        con persone che devono andare nella stessa direzione, e gestisce
        l&apos;incasso e il trasferimento delle quote di spesa.
      </p>
      <p>
        <strong>GO non è un&apos;impresa di trasporto</strong> e non organizza
        viaggi. Ogni viaggio è deciso, organizzato ed eseguito dalla persona
        che guida, sotto la sua esclusiva responsabilità.
      </p>

      <H2>Chi guida non guadagna</H2>
      <p>
        La quota che ciascun passeggero versa è una partecipazione alle spese
        del viaggio, calcolata dal sistema sul costo chilometrico di esercizio
        del veicolo secondo le tabelle ACI e divisa fra tutti gli occupanti,
        conducente incluso.
      </p>
      <p>
        Chi guida <strong>non può alzare quella quota</strong>, può solo
        chiedere meno. In nessuna configurazione riceve più di quanto il
        viaggio gli costa: paga sempre almeno la propria parte. Chi guida
        dichiara di offrire passaggi come privato, su tragitti che avrebbe
        percorso comunque, senza esercitare attività di trasporto di persone.
      </p>

      <H2>Non si applica il diritto di recesso</H2>
      <p>
        Il passaggio è offerto da un privato e non da un professionista:
        la normativa a tutela del consumatore, in particolare il diritto di
        recesso, non si applica. Valgono invece le finestre di cancellazione
        indicate su ogni corsa prima della prenotazione.
      </p>

      <H2>Pagamenti</H2>
      <p>
        I pagamenti sono gestiti da Stripe. GO non entra mai in possesso dei
        dati della tua carta. Al momento della prenotazione blocchiamo
        sull&apos;importo massimo possibile e alla partenza addebitiamo quello
        effettivo, che può essere minore se altre persone salgono a bordo.
      </p>
      <p>
        La quota di chi guida gli viene trasferita 24 ore dopo l&apos;arrivo,
        salvo segnalazioni, e liquidata il lunedì successivo. Se chi guida non
        collega il proprio conto entro 90 giorni, la somma viene restituita a
        chi l&apos;ha versata.
      </p>

      <H2>Chi può usare GO</H2>
      <p>
        Servono 18 anni compiuti e un numero di telefono verificato. Per
        pubblicare una corsa servono anche i dati del veicolo e la
        dichiarazione di non professionalità.
      </p>

      <H2>Quando interveniamo</H2>
      <p>
        Possiamo sospendere un account che riceve segnalazioni gravi,
        rifiutare la pubblicazione di un commento, e limitare il numero di
        corse pubblicabili quando la frequenza è tale da configurare
        un&apos;attività professionale. In ogni caso spieghiamo il motivo alla
        persona interessata.
      </p>

      <H2>Responsabilità</H2>
      <p>
        La responsabilità del viaggio, della condotta di guida, dello stato del
        veicolo e della copertura assicurativa è di chi guida. GO risponde del
        funzionamento della piattaforma e della corretta gestione degli
        incassi.
      </p>
      <p style={{ color: 'var(--tenue)', fontSize: 14 }}>
        Da definire con l&apos;avvocato: foro competente, limitazioni di
        responsabilità, procedura di risoluzione delle controversie, modalità
        di modifica delle presenti condizioni.
      </p>
    </Legale>
  )
}
