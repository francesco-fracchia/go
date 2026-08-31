'use client'
import { useState } from 'react'
import { euro } from './base.tsx'
import { SegnoAvanti } from './segni.tsx'

/**
 * Il conto: quello che è entrato, e come ritirarlo.
 *
 * Il pulsante per collegare il conto non aveva un gestore. Nessuno,
 * toccandolo, apriva l'iscrizione a Stripe — e senza quella non si può
 * ricevere un centesimo. Un pulsante che non risponde nel punto dove
 * arrivano i soldi è il difetto più caro che questa applicazione potesse
 * avere: chi guida conclude che l'incasso non funziona, e smette.
 *
 * E si mostrava solo quando c'erano già soldi da ritirare. Ma il momento
 * giusto per collegare il conto è PRIMA di pubblicare, quando non si sta
 * aspettando niente: la presentazione ci manda apposta, e chi arrivava non
 * trovava nessun modo di farlo.
 */

export interface DatiConto {
  inArrivo: number
  totaleRicevuto: number
  liquidazioni: Array<{ settimana: string; importo_cent: number; eseguita_il: string | null }>
  contoCollegato: boolean
  onboardingIniziato: boolean
}

export function Conto({ c }: { c: DatiConto }) {
  const [attesa, setAttesa] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  /**
   * Il collegamento a Stripe scade dopo pochi minuti, quindi si chiede
   * adesso e ci si va subito: generarlo prima e tenerlo in pagina vorrebbe
   * dire mandare qualcuno su un indirizzo già morto.
   */
  async function collega() {
    setAttesa(true); setErrore(null)
    try {
      const r = await fetch('/api/conto', { method: 'POST' })
      const d = await r.json()
      if (!r.ok || !d.url) {
        setErrore(d.errore ?? 'Non riusciamo ad aprire l’iscrizione adesso.')
        setAttesa(false); return
      }
      window.location.href = d.url
    } catch {
      setErrore('Non riusciamo ad aprire l’iscrizione adesso.')
      setAttesa(false)
    }
  }

  return (
    <>
      <div className="fascia testata">
        <div className="dentro dentro-app testata-dentro">
          <div>
            <p className="occhiello">Quello che entra</p>
            <h1 className="t-titolo testata-titolo" style={{ marginTop: 'var(--s3)' }}>Il tuo conto</h1>
            <p className="testata-sotto">
              Quanto ti rientra dalle corse concluse, e i bonifici che sono
              partiti. I soldi arrivano dopo il viaggio, mai prima.
            </p>
          </div>
        </div>
      </div>

    <div className="fascia">
      <div className="dentro dentro-app conto-dentro">

        {!c.contoCollegato && (
          <section className="collega">
            <p className="occhiello occhiello-accento">
              {c.onboardingIniziato ? 'Iscrizione a metà' : 'Prima di incassare'}
            </p>

            {c.inArrivo > 0 ? (
              <h2 className="t-sezione" style={{ margin: 'var(--s3) 0 var(--s3)' }}>
                Hai {euro(c.inArrivo)} da ritirare
              </h2>
            ) : (
              <h2 className="t-sezione" style={{ margin: 'var(--s3) 0 var(--s3)' }}>
                {c.onboardingIniziato
                  ? 'Manca ancora qualcosa a Stripe'
                  : 'Collega un conto dove ricevere'}
              </h2>
            )}

            <p className="t-corpo" style={{ maxWidth: '56ch' }}>
              {c.onboardingIniziato
                ? 'Hai cominciato ma non hai finito: finché Stripe non ha verificato l’identità, quello che incassi resta fermo. Riprendi da dove eri, ci vogliono pochi minuti.'
                : 'I soldi non passano da noi a mano: li gestisce Stripe. Ti chiede nome, data di nascita, indirizzo, un documento e l’IBAN dove versare — è la legge sull’antiriciclaggio, vale per chiunque riceva denaro, e quei dati noi non li vediamo mai.'}
            </p>

            {errore && <p className="errore">{errore}</p>}

            <div className="azioni" style={{ marginTop: 'var(--s5)' }}>
              <button type="button" className="azione azione-piena"
                aria-disabled={attesa} onClick={collega}>
                {attesa ? 'Un attimo…'
                  : c.onboardingIniziato ? 'Riprendi da dove eri' : 'Collega il conto'}
                <SegnoAvanti />
              </button>
            </div>

            {c.inArrivo > 0 && (
              <p className="t-nota" style={{ marginTop: 'var(--s3)' }}>
                I soldi ti aspettano 90 giorni. Dopo, li restituiamo a chi ha pagato.
              </p>
            )}
          </section>
        )}

        <section className="conto-cifre">
          <div className="conto-cifra">
            <p className="occhiello">In arrivo</p>
            <span className="numero conto-grande">{euro(c.inArrivo)}</span>
          </div>
          <div className="conto-cifra">
            <p className="occhiello">Ricevuto finora</p>
            <span className="numero conto-grande conto-spento">{euro(c.totaleRicevuto)}</span>
          </div>
          {c.contoCollegato && (
            <p className="pastiglia pastiglia-verde conto-stato">conto collegato</p>
          )}
        </section>

        <p className="t-nota" style={{ maxWidth: '62ch' }}>
          I bonifici partono il lunedì e arrivano in due o tre giorni
          lavorativi. Gli importi sono al netto della commissione di incasso.
        </p>

        {c.liquidazioni.length > 0 && (
          <section>
            <p className="occhiello" style={{ marginBottom: 'var(--s3)' }}>Bonifici</p>
            <div className="elenco-voci">
              {c.liquidazioni.map((l) => (
                <div key={l.settimana} className="voce-elenco" style={{ cursor: 'default' }}>
                  <span className="cresci">
                    settimana del {new Date(l.settimana).toLocaleDateString('it-IT', {
                      day: 'numeric', month: 'long',
                    })}
                    <span className="verifica-nota"> · {l.eseguita_il ? 'inviato' : 'in preparazione'}</span>
                  </span>
                  <span className="scomposizione-cifra">{euro(l.importo_cent)}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <p className="t-nota" style={{ maxWidth: '68ch', paddingTop: 'var(--s5)', borderTop: '1px solid var(--riga-2)' }}>
          Quello che ricevi è la quota di spese dei passeggeri, non un
          compenso: copre una parte di quanto il viaggio ti è costato e non lo
          supera mai. Non è reddito da lavoro. Se hai dubbi sulla tua posizione
          fiscale, parlane con un commercialista.
        </p>
      </div>
    </div>
    </>
  )
}
