import { Legale, H2 } from '../../../components/Legale.tsx'

/**
 * Punto di contatto unico.
 *
 * È un obbligo di base del Regolamento UE 2022/2065 (DSA) e vale anche per
 * le imprese piccole, che sono esentate solo dagli obblighi aggiuntivi.
 * Deve essere facilmente accessibile e indicare la lingua di comunicazione.
 */
export default function Pagina() {
  return (
    <Legale titolo="Contatti" aggiornato="30 agosto 2026">
      <p>
        GO è un servizio di intermediazione online. Chi lo gestisce risponde
        direttamente, senza moduli intermedi.
      </p>

      <H2>Per utenti e per le autorità</H2>
      <p>
        Indirizzo unico di contatto, valido sia per gli utenti sia per le
        autorità degli Stati membri, la Commissione europea e il Comitato
        europeo per i servizi digitali:
      </p>
      <p style={{ fontSize: 18, color: 'var(--inchiostro)' }}>
        <strong>ciao@vaigo.app</strong>
      </p>
      <p>
        Le comunicazioni si possono inviare in <strong>italiano</strong> o in{' '}
        <strong>inglese</strong>. Rispondiamo di norma entro due giorni
        lavorativi.
      </p>

      <H2>Segnalare un contenuto o un comportamento</H2>
      <p>
        Ogni corsa, profilo e messaggio ha un comando per segnalare. Le
        segnalazioni arrivano a una persona, non a un filtro automatico, e chi
        segnala riceve sempre l&apos;esito della propria segnalazione.
      </p>
      <p>
        Se qualcosa è successo durante un viaggio e riguarda la tua sicurezza,
        scrivi allo stesso indirizzo indicando la data e il nome della persona:
        queste segnalazioni le leggiamo per prime.
      </p>

      <H2>In caso di pericolo</H2>
      <p style={{ color: 'var(--inchiostro)' }}>
        Se sei in una situazione di pericolo immediato chiama il{' '}
        <strong>112</strong>. GO non è un servizio di emergenza e non può
        intervenire in tempo reale.
      </p>
    </Legale>
  )
}
