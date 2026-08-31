'use client'
import { useEffect, useState } from 'react'
import { Carta, MetodoSalvato } from './Carta.tsx'
import { LuoghiSalvati, type Salvato } from './LuoghiSalvati.tsx'
import { AbilitaPush } from './AbilitaPush.tsx'
import { AggiungiTelefono } from './AggiungiTelefono.tsx'

/**
 * Impostazioni.
 *
 * Poche cose, tutte con una conseguenza scritta accanto. «Notifiche: sì/no»
 * non dice a nessuno cosa perde spegnendole; «non ti avvisiamo se il
 * conducente non conferma» sì, ed è l'unica informazione su cui si può
 * decidere davvero.
 *
 * L'iscrizione alle notifiche sta sopra ai due interruttori, non sotto:
 * quelli decidono COSA mandare, questa decide SE possiamo mandare qualcosa.
 * Finché il browser non ha dato il permesso, i due interruttori accendono e
 * spengono un canale che non esiste — ed è quello che succedeva, perché
 * l'iscrizione non era raggiungibile da nessuna schermata.
 */

export interface DatiImpostazioni {
  push: boolean
  sms: boolean
  telefono: string | null
  metodo: { marchio: string; ultime4: string | null } | null
  luoghi: Salvato[]
  mappa: boolean
}

export function Impostazioni({ iniziali }: { iniziali: DatiImpostazioni }) {
  const [push, setPush] = useState(iniziali.push)
  const [sms, setSms] = useState(iniziali.sms)
  const [metodo, setMetodo] = useState(iniziali.metodo)
  const [telefono, setTelefono] = useState(iniziali.telefono)
  const [cambiaCarta, setCambiaCarta] = useState(false)
  const [cambiaNumero, setCambiaNumero] = useState(false)
  const [tema, setTema] = useState('')

  useEffect(() => { setTema(localStorage.getItem('tema') ?? '') }, [])

  const salva = (campo: string, valore: boolean) =>
    fetch('/api/impostazioni', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ [campo]: valore }),
    })

  const applicaTema = (t: string) => {
    setTema(t)
    if (t) document.documentElement.dataset.tema = t
    else delete document.documentElement.dataset.tema
    try { localStorage.setItem('tema', t) } catch { /* finestra privata */ }
  }

  return (
    <div className="fascia">
      <div className="dentro dentro-app impostazioni">
        <h1 className="t-titolo">Impostazioni</h1>

        <Gruppo titolo="I tuoi posti"
          nota="Casa e lavoro compaiono al primo tocco, prima ancora di scrivere.">
          <LuoghiSalvati iniziali={iniziali.luoghi} mappa={iniziali.mappa} />
        </Gruppo>

        <Gruppo titolo="Il tuo numero"
          nota="Serve a chi viaggia con te per chiamarti. La telefonata passa da un numero di appoggio: il tuo non lo vede nessuno.">
          {telefono && !cambiaNumero ? (
            <div className="riquadro">
              <div className="fila-fra">
                <span className="numero-salvato">{telefono}</span>
                <button type="button" className="collegamento-piccolo"
                  onClick={() => setCambiaNumero(true)}>Cambia</button>
              </div>
            </div>
          ) : (
            <AggiungiTelefono suSalvato={(n) => { setTelefono(n ?? telefono); setCambiaNumero(false) }} />
          )}
        </Gruppo>

        <Gruppo titolo="Come ti raggiungiamo"
          nota="Non ti scriviamo per farci ricordare: solo quando qualcosa cambia sul tuo viaggio.">
          <AbilitaPush momento="impostazioni" sempre />
          <div style={{ marginTop: 'var(--s3)' }}>
            <Interruttore
              titolo="Notifiche sull'applicazione"
              nota="Se le spegni non ti avvisiamo quando il conducente non conferma, e non possiamo cercarti un'alternativa in tempo."
              attivo={push}
              onCambia={(v) => { setPush(v); salva('push', v) }}
            />
            <Interruttore
              titolo="SMS nei momenti importanti"
              nota="Solo quando serve davvero: conducente che non conferma, corsa annullata, «sono qui». Mai per altro."
              attivo={sms}
              onCambia={(v) => { setSms(v); salva('sms', v) }}
            />
          </div>
        </Gruppo>

        <Gruppo titolo="Come paghi"
          nota="La carta viene bloccata alla prenotazione e addebitata quando il viaggio parte davvero.">
          {metodo && !cambiaCarta ? (
            <MetodoSalvato marchio={metodo.marchio} ultime4={metodo.ultime4}
              suCambia={() => setCambiaCarta(true)} />
          ) : (
            <Carta suSalvata={(m) => { setMetodo(m); setCambiaCarta(false) }} />
          )}
        </Gruppo>

        <Gruppo titolo="Aspetto"
          nota="Il buio non è una preferenza estetica: questa applicazione si usa di notte, in macchina.">
          <div className="scelte-tema">
            {[
              { v: '', t: 'Come il telefono' },
              { v: 'chiaro', t: 'Chiaro' },
              { v: 'scuro', t: 'Scuro' },
            ].map((o) => (
              <button key={o.v} type="button"
                className={`scelta${tema === o.v ? ' scelta-attiva' : ''}`}
                aria-pressed={tema === o.v}
                onClick={() => applicaTema(o.v)}>{o.t}</button>
            ))}
          </div>
        </Gruppo>

        <div className="impostazioni-uscita">
          <a href="/api/esci" className="esci">Esci da questo dispositivo</a>
          <p className="t-nota" style={{ marginTop: 'var(--s2)' }}>
            Le tue prenotazioni e le tue corse restano dove sono: esci solo da
            qui.
          </p>
        </div>
      </div>
    </div>
  )
}

function Gruppo({ titolo, nota, children }: {
  titolo: string; nota: string; children: React.ReactNode
}) {
  return (
    <section className="gruppo">
      <div className="gruppo-testa">
        <h2 className="gruppo-titolo">{titolo}</h2>
        <p className="gruppo-nota">{nota}</p>
      </div>
      <div className="gruppo-corpo">{children}</div>
    </section>
  )
}

function Interruttore({ titolo, nota, attivo, onCambia }: {
  titolo: string; nota: string; attivo: boolean; onCambia: (v: boolean) => void
}) {
  return (
    <div className="opzione-riga">
      <div className="cresci">
        <div className="opzione-titolo">{titolo}</div>
        <div className="opzione-nota">{nota}</div>
      </div>
      <button type="button" onClick={() => onCambia(!attivo)}
        role="switch" aria-checked={attivo} aria-label={titolo}
        className={attivo ? 'leva leva-accesa' : 'leva'}>
        <span className="leva-pallino" />
      </button>
    </div>
  )
}
