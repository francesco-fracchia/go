'use client'
import { useState } from 'react'
import { CampoLuogo, type LuogoScelto } from './CampoLuogo.tsx'
import { Quando } from './Quando.tsx'
import { SegnoAvanti } from './segni.tsx'

/**
 * «Cerco un passaggio».
 *
 * È l'altra metà del mercato, ed è quella che nel primo anno tiene in piedi
 * tutto. Senza, chi cerca in un momento vuoto se ne va e non torna, e non
 * saprà mai che il giorno dopo qualcuno ha pubblicato esattamente la sua
 * tratta. Chi guida, dal canto suo, non ha modo di sapere che c'era
 * qualcuno disposto a dividergli la benzina.
 *
 * Prima i due luoghi erano campi di testo liberi, e la richiesta partiva
 * con le coordinate a zero: finiva nel Golfo di Guinea, dove nessuna corsa
 * le sarebbe mai passata vicino. Adesso usa lo stesso campo della ricerca,
 * che le coordinate ce le ha — che è la sola cosa che rende la richiesta
 * incontrabile.
 *
 * Il campo che conta più di tutti è la flessibilità: chi accetta di partire
 * un'ora prima trova un passaggio molte più volte di chi vuole le 23:30
 * esatte, e va detto mentre lo si compila.
 */
export function CercoPassaggio({ mappa = false, vicino, casa }: {
  mappa?: boolean
  vicino?: { lat: number; lng: number }
  casa?: LuogoScelto
}) {
  const [origine, setOrigine] = useState<LuogoScelto | null>(casa ?? null)
  const [destinazione, setDestinazione] = useState<LuogoScelto | null>(null)
  const [quando, setQuando] = useState('')
  const [flessibilita, setFlessibilita] = useState(60)
  const [posti, setPosti] = useState(1)
  const [invio, setInvio] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [inviato, setInviato] = useState(false)

  if (inviato) {
    return (
      <div className="fascia"><div className="dentro dentro-stretto cerco-dentro">
        <div className="riuscito">
          <h1 className="t-titolo">Ci pensiamo noi</h1>
          <p className="t-guida" style={{ margin: 'var(--s4) 0 0' }}>
            Appena qualcuno pubblica un passaggio compatibile ti avvisiamo. E
            chi guida su quella tratta vede che stai cercando: capita spesso
            che sia proprio questo a far nascere la corsa.
          </p>
          <div className="azioni" style={{ marginTop: 'var(--s6)' }}>
            <a href="/" className="azione azione-piena">Torna a cercare</a>
            <a href="/posti" className="azione azione-vuota">Guarda dove si va</a>
          </div>
        </div>
      </div></div>
    )
  }

  const pronto = !!origine && !!destinazione && !!quando

  return (
    <div className="fascia">
      <div className="dentro dentro-stretto cerco-dentro">
        <h1 className="t-titolo">Cerchi un passaggio?</h1>
        <p className="t-guida" style={{ margin: 'var(--s4) 0 var(--s6)', maxWidth: '46ch' }}>
          Dillo. Chi guida su quella tratta lo vede, e ti avvisiamo appena
          compare qualcosa. Non impegna e non costa niente.
        </p>

        <div className="pannello-ricerca">
          <div className="ricerca-luoghi">
            <CampoLuogo mappa={mappa} vicino={vicino} etichetta="Vai a"
              valore={destinazione} onScegli={setDestinazione} segnaposto="Fabrique, Milano" />
            <CampoLuogo mappa={mappa} vicino={vicino} etichetta="Parti da"
              valore={origine} onScegli={setOrigine} segnaposto="Lodi, piazza della Vittoria" />
          </div>

          <div className="ricerca-quando">
            <Quando valore={quando} onCambia={setQuando} />
          </div>

          <div style={{ paddingTop: 'var(--s4)' }}>
            <p className="occhiello">Quanto puoi aspettare</p>
            <div className="scelte-fila">
              {[0, 30, 60, 120].map((m) => (
                <button key={m} type="button"
                  className={`scelta${flessibilita === m ? ' scelta-attiva' : ''}`}
                  onClick={() => setFlessibilita(m)}>
                  {m === 0 ? 'quell’ora esatta' : `± ${m < 60 ? `${m} min` : `${m / 60} h`}`}
                </button>
              ))}
            </div>
            <p className="t-nota" style={{ marginTop: 'var(--s3)' }}>
              {flessibilita === 0
                ? 'Ti trova solo chi passa a quell’ora precisa. È la scelta che trova meno passaggi.'
                : `Ti trova anche chi parte fino a ${flessibilita < 60 ? `${flessibilita} minuti` : `${flessibilita / 60} ore`} prima o dopo. Più sei elastico, più spesso qualcuno c'è.`}
            </p>
          </div>

          <div style={{ paddingTop: 'var(--s4)' }}>
            <p className="occhiello">In quanti siete</p>
            <div className="posti-scelta" style={{ marginTop: 'var(--s3)' }}>
              {[1, 2, 3, 4].map((n) => (
                <button key={n} type="button"
                  className={`posto-numero${posti === n ? ' posto-numero-scelto' : ''}`}
                  onClick={() => setPosti(n)} aria-pressed={posti === n}>{n}</button>
              ))}
            </div>
          </div>

          {errore && <p className="errore">{errore}</p>}

          <div className="ricerca-fondo">
            <p className="ricerca-manca">
              {!destinazione ? 'Dicci dove devi andare'
                : !origine ? 'E da dove parti'
                  : !quando ? 'Scegli quando' : 'Nessuno vedrà i tuoi contatti.'}
            </p>
            <button type="button" className="azione azione-piena ricerca-invia"
              aria-disabled={!pronto || invio} onClick={manda}>
              {invio ? 'Un attimo…' : 'Dillo'} <SegnoAvanti />
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  async function manda() {
    if (!pronto || invio) return
    setInvio(true); setErrore(null)
    const r = await fetch('/api/richieste', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        origineLabel: origine!.etichetta, origineLat: origine!.lat, origineLng: origine!.lng,
        destinazioneLabel: destinazione!.etichetta,
        destinazioneLat: destinazione!.lat, destinazioneLng: destinazione!.lng,
        oraArrivo: quando, flessibilitaMin: Math.max(15, flessibilita), posti,
      }),
    })
    if (!r.ok) {
      const d = await r.json().catch(() => ({}))
      setErrore(d.errore ?? 'Non è andata'); setInvio(false); return
    }
    setInviato(true)
  }
}
