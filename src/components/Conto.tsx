import { Riquadro, Bottone, Etichetta, euro } from './base.tsx'

/**
 * Il conto del conducente.
 *
 * Il momento che conta è uno: quando c'è del denaro maturato e il conto non
 * è ancora collegato. Lì il messaggio non è «completa il tuo profilo» ma
 * «hai 12,40 € da ritirare» — perché è vero, ed è l'unica formulazione che
 * fa compilare un modulo di verifica dell'identità.
 */

export interface DatiConto {
  inArrivo: number
  totaleRicevuto: number
  contoCollegato: boolean
  onboardingIniziato: boolean
  liquidazioni: Array<{ settimana: string; importo_cent: number; eseguita_il: string | null }>
}

export function Conto({ c }: { c: DatiConto }) {
  return (
    <main style={{ maxWidth: 480, margin: '0 auto', padding: '20px 20px 40px' }}>
      <h1 style={{ fontSize: 26, marginBottom: 20 }}>Il tuo conto</h1>

      {!c.contoCollegato && c.inArrivo > 0 && (
        <Riquadro tono="accento" stile={{ marginBottom: 16 }}>
          <div style={{
            fontFamily: 'var(--titoli)', fontWeight: 700, fontSize: 28,
            letterSpacing: '-.03em',
          }}>Hai {euro(c.inArrivo)} da ritirare</div>
          <p style={{ margin: '8px 0 16px', fontSize: 14.5, color: 'var(--inchiostro-2)', lineHeight: 1.55 }}>
            Servono due minuti per collegare il conto: nome, data di nascita,
            IBAN. Li chiede Stripe, che gestisce i pagamenti — noi non vediamo
            mai i tuoi dati bancari.
          </p>
          <Bottone>{c.onboardingIniziato ? 'Riprendi da dove eri' : 'Collega il conto'}</Bottone>
          <p style={{ margin: '10px 0 0', fontSize: 12.5, color: 'var(--tenue)', textAlign: 'center' }}>
            I soldi ti aspettano 90 giorni. Dopo, li restituiamo a chi ha pagato.
          </p>
        </Riquadro>
      )}

      <Riquadro stile={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <Etichetta>in arrivo</Etichetta>
            <div style={{
              fontFamily: 'var(--titoli)', fontWeight: 700, fontSize: 26,
              letterSpacing: '-.02em', marginTop: 3,
            }}>{euro(c.inArrivo)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <Etichetta>ricevuto finora</Etichetta>
            <div style={{
              fontFamily: 'var(--titoli)', fontWeight: 700, fontSize: 26,
              letterSpacing: '-.02em', marginTop: 3, color: 'var(--tenue)',
            }}>{euro(c.totaleRicevuto)}</div>
          </div>
        </div>
        <p style={{ margin: '14px 0 0', fontSize: 13, color: 'var(--tenue)', lineHeight: 1.5 }}>
          I bonifici partono il lunedì e arrivano in due o tre giorni
          lavorativi. Gli importi sono al netto della commissione di incasso.
        </p>
      </Riquadro>

      {c.liquidazioni.length > 0 && (
        <section>
          <Etichetta>bonifici</Etichetta>
          <div style={{ marginTop: 10 }}>
            {c.liquidazioni.map((l) => (
              <div key={l.settimana} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '13px 2px', borderBottom: '1px solid var(--riga-2)',
              }}>
                <div>
                  <div style={{ fontSize: 15 }}>
                    settimana del {new Date(l.settimana).toLocaleDateString('it-IT', {
                      day: 'numeric', month: 'long',
                    })}
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--tenue)' }}>
                    {l.eseguita_il ? 'inviato' : 'in preparazione'}
                  </div>
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 15 }}>
                  {euro(l.importo_cent)}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div style={{
        marginTop: 26, paddingTop: 18, borderTop: '1px solid var(--riga-2)',
        fontSize: 12.5, color: 'var(--tenue)', lineHeight: 1.6,
      }}>
        Quello che ricevi è la quota di spese dei passeggeri, non un compenso:
        copre una parte di quanto il viaggio ti è costato e non lo supera mai.
        Non è reddito da lavoro. Se hai dubbi sulla tua posizione fiscale,
        parlane con un commercialista.
      </div>
    </main>
  )
}
