import { Riquadro, Bottone, Etichetta, euro } from './base.tsx'

/**
 * Pubblicazione: la schermata che decide se esiste un'offerta.
 *
 * Il punto non è raccogliere dati — quelli sono quattro campi. Il punto è
 * far capire in tre secondi che pubblicare non costa niente e non obbliga
 * a niente, e mostrare il numero che convince: quanto della benzina
 * rientra.
 *
 * Per questo l'ancora è l'ORA DI ARRIVO. Chi pubblica sa a che ora vuole
 * essere lì, non a che ora deve uscire di casa: la partenza gliela
 * calcoliamo noi. Chiedere l'ora di partenza sposta su di lui un conto che
 * facciamo meglio, e produce orari sbagliati.
 */

export interface Bozza {
  destinazione: string
  origine: string
  oraArrivo: string
  oraPartenza: string
  minutiViaggio: number
  km: number
  postiOfferti: number
  costoCent: number
  quotaPerPasseggeroCent: number
  /**
   * Quello che arriva DAVVERO in banca a macchina piena, con la quota di
   * commissione di incasso già scalata. Mostrare il lordo e poi accreditare
   * meno è il modo più veloce di perdere un conducente al primo bonifico.
   */
  rientroNettoCent: number
  modalita: 'pubblica' | 'link' | 'privata'
  prenotaImmediata: boolean
  accettaDeviazioni: boolean
  politica: 'flessibile' | 'rigida'
}

export function Pubblica({ b }: { b: Bozza }) {
  const restaACarico = b.costoCent - b.rientroNettoCent

  return (
    <main style={{ maxWidth: 'var(--colonna)', margin: '0 auto', padding: '18px 20px 40px' }}>
      <h1 style={{ fontSize: 26, marginBottom: 6 }}>Vai a {b.destinazione}?</h1>
      <p style={{ margin: '0 0 22px', color: 'var(--inchiostro-2)', fontSize: 15 }}>
        Offri i posti vuoti. Se non li prende nessuno, parti come avresti fatto
        comunque.
      </p>

      {/* ── L'orario, ancorato all'arrivo ── */}
      <Riquadro stile={{ marginBottom: 14 }}>
        <Etichetta>vuoi essere lì</Etichetta>
        <div style={{
          fontFamily: 'var(--titoli)', fontWeight: 700, fontSize: 32,
          letterSpacing: '-.03em', margin: '4px 0 2px',
        }}>{b.oraArrivo}</div>
        <div style={{ fontSize: 14, color: 'var(--tenue)' }}>
          esci alle {b.oraPartenza} · {b.minutiViaggio} minuti ·{' '}
          {b.km.toFixed(0)} km
        </div>
      </Riquadro>

      {/* ── I numeri. Sono la ragione per cui qualcuno pubblica. ── */}
      <Riquadro tono="accento" stile={{ marginBottom: 14 }}>
        <Etichetta tono="accento">se si riempie</Etichetta>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, margin: '8px 0 2px' }}>
          <span style={{
            fontFamily: 'var(--titoli)', fontWeight: 700, fontSize: 34,
            letterSpacing: '-.03em',
          }}>{euro(restaACarico)}</span>
          <span style={{
            fontSize: 17, color: 'var(--tenue)', textDecoration: 'line-through',
          }}>{euro(b.costoCent)}</span>
        </div>
        <p style={{ margin: '8px 0 0', fontSize: 14, color: 'var(--inchiostro-2)', lineHeight: 1.55 }}>
          Il viaggio ti costa {euro(b.costoCent)} fra benzina, usura e
          assicurazione. Con {b.postiOfferti} {b.postiOfferti === 1 ? 'persona' : 'persone'}{' '}
          a bordo ti arrivano {euro(b.rientroNettoCent)}, commissione di incasso
          già tolta, e ti restano {euro(restaACarico)} — la tua parte, che
          avresti pagato comunque.
        </p>
      </Riquadro>

      <div style={{
        fontSize: 12, color: 'var(--tenue)', lineHeight: 1.55,
        margin: '0 4px 22px',
      }}>
        Il prezzo lo decide il sistema sulle tabelle ACI del tuo modello, non
        tu: è il tetto oltre il quale non è più condivisione di spese. Puoi
        chiedere meno, mai di più.
      </div>

      {/* ── Le scelte che contano davvero ── */}
      <div style={{ display: 'grid', gap: 10, marginBottom: 22 }}>
        <Scelta
          titolo="Chi può vederla"
          valore={{
            pubblica: 'Tutti', link: 'Solo con il link', privata: 'Solo chi invito',
          }[b.modalita]}
          nota={b.modalita === 'pubblica'
            ? 'Compare nelle ricerche'
            : 'Non compare nelle ricerche. Il prezzo è lo stesso.'}
        />
        <Scelta
          titolo="Chi sale"
          valore={b.prenotaImmediata ? 'Chiunque, subito' : 'Decidi tu ogni volta'}
          nota={b.prenotaImmediata
            ? 'Si riempie prima, ma non scegli chi'
            : 'Ricevi una richiesta e rispondi. Si riempie più lentamente.'}
        />
        <Scelta
          titolo="Deviazioni"
          valore={b.accettaDeviazioni ? 'Puoi accettarle' : 'No, solo il mio punto'}
          nota={b.accettaDeviazioni
            ? 'Chi è fuori strada può chiedertelo. Paga lui i km in più.'
            : 'Nessuno può proporti di passare da un altro punto.'}
        />
        <Scelta
          titolo="Se disdicono"
          valore={b.politica === 'flessibile' ? 'Fino a un’ora prima' : 'Fino a sei ore prima'}
          nota={b.politica === 'flessibile'
            ? 'Più gente prenota, ma può saltare all’ultimo'
            : 'Il posto è più sicuro, ma qualcuno rinuncia a prenotare'}
        />
      </div>

      <Bottone>Pubblica</Bottone>
      <p style={{
        fontSize: 13, color: 'var(--tenue)', textAlign: 'center',
        margin: '12px 0 0', lineHeight: 1.5,
      }}>
        Puoi annullarla quando vuoi. Se nessuno prenota, sparisce da sola.
      </p>
    </main>
  )
}

/**
 * Ogni scelta mostra la conseguenza, non solo l'opzione.
 *
 * «Prenotazione immediata: sì/no» non dice niente a chi non ha mai
 * pubblicato. «Si riempie prima, ma non scegli chi» sì — ed è l'unica
 * informazione su cui si può davvero decidere.
 */
function Scelta({ titolo, valore, nota }: { titolo: string; valore: string; nota: string }) {
  return (
    <button style={{
      width: '100%', textAlign: 'left', background: 'var(--superficie)',
      border: '1px solid var(--riga)', borderRadius: 'var(--raggio-s)',
      padding: '13px 16px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ fontSize: 14, color: 'var(--tenue)' }}>{titolo}</span>
        <span style={{ fontSize: 15, fontWeight: 600, textAlign: 'right' }}>{valore}</span>
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--tenue)', marginTop: 4, lineHeight: 1.45 }}>
        {nota}
      </div>
    </button>
  )
}
