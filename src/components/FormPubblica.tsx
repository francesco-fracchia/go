'use client'
import { useEffect, useState } from 'react'
import { euro } from './base.tsx'
import { TESTO_DICHIARAZIONE } from './testi.ts'
import { CampoLuogo, type LuogoScelto } from './CampoLuogo.tsx'
import { Quando } from './Quando.tsx'
import { AggiungiTelefono } from './AggiungiTelefono.tsx'
import {
  SegnoAvanti, SegnoOcchio, SegnoPersone, SegnoDeviazione, SegnoOrologio, SegnoNota,
} from './segni.tsx'
import { proponi, etichetta, SCELTE, type Flessibilita, type Categoria } from '../lib/flessibilita.ts'

/**
 * Pubblicare un viaggio.
 *
 * Prima erano tre passi, ma il secondo era una pila di sei interruttori:
 * chi può vederla, chi sale, puoi passare a prendere, puoi lasciare
 * altrove, se disdicono, con quale auto. Sei domande di seguito, tutte
 * ugualmente importanti, tutte prima del numero — cioè prima della ragione
 * per cui uno sta compilando.
 *
 * Adesso sono quattro passi, e ciascuno fa UNA domanda: dove vai, quando,
 * quanti posti, e — solo alla fine — le condizioni, con valori già scelti
 * che vanno bene per quasi tutti. Il numero compare al terzo passo, appena
 * ci sono abbastanza dati per calcolarlo: da lì in poi si sta finendo una
 * cosa che si è già visto valere la pena.
 *
 * Il preventivo lo fa il server con lo stesso motore che userà la corsa
 * vera. Un numero in vetrina diverso da quello finale sarebbe peggio di
 * nessun numero.
 */

/**
 * Tre passi, non quattro.
 *
 * Chi pubblica un passaggio lo fa mentre sta facendo altro — sta uscendo,
 * sta chiudendo lo zaino, è già in ritardo. Ogni schermata in più è un
 * punto in cui si molla, e una corsa non pubblicata è il vero costo: senza
 * offerta non c'è mercato.
 *
 * I posti erano una schermata per sé, per una domanda a cui si risponde con
 * un tocco e che ha una risposta giusta quasi sempre (tutti quelli che hai).
 * Adesso stanno sulla conferma, insieme al numero e alla dichiarazione.
 *
 * E le sei domande di dettaglio — chi la vede, chi sale, le deviazioni, le
 * disdette, la nota — sono chiuse dietro «altre opzioni»: hanno già la
 * risposta giusta per quasi tutti, e chiederle in fila a chi sta uscendo di
 * casa significa farsi rispondere a caso o farsi abbandonare.
 */
type Passo = 'dove' | 'quando' | 'conferma'
const PASSI: Passo[] = ['dove', 'quando', 'conferma']
const NOMI: Record<Passo, string> = {
  dove: 'Dove vai', quando: 'Quando', conferma: 'Pubblica',
}

interface Preventivo {
  km: number; minuti: number
  costoViaggioCent: number; quotaCent: number; feeCent: number
  pagaPasseggeroCent: number; rientroPienoCent: number; rientroUnoCent: number
  postiMassimi: number
}

export function FormPubblica({ veicoli, destinazione: destinazioneIniziale, categoria, mappa = false, vicino }: {
  veicoli: Array<{ id: string; marca: string; modello: string; postiTotali: number }>
  destinazione?: LuogoScelto
  categoria?: Categoria
  mappa?: boolean
  vicino?: { lat: number; lng: number }
}) {
  const [passo, setPasso] = useState<Passo>('dove')
  const [origine, setOrigine] = useState<LuogoScelto | null>(null)
  const [destinazione, setDestinazione] = useState<LuogoScelto | null>(destinazioneIniziale ?? null)
  const [oraArrivo, setOraArrivo] = useState('')
  const [posti, setPosti] = useState(3)
  const [veicolo, setVeicolo] = useState(veicoli[0]?.id ?? '')
  const [modalita, setModalita] = useState<'pubblica' | 'link' | 'privata'>('pubblica')
  const [rimborso, setRimborso] = useState<
    'tutto' | 'carburante_pedaggi' | 'carburante' | 'niente'>('tutto')
  const [immediata, setImmediata] = useState(false)
  const [deviazioni, setDeviazioni] = useState(true)
  const [politica, setPolitica] = useState<'flessibile' | 'rigida' | 'nessuna'>('flessibile')
  const [dichiarato, setDichiarato] = useState(false)
  const [note, setNote] = useState('')
  const [oraRitorno, setOraRitorno] = useState('')
  const [flessibilita, setFlessibilita] = useState<Flessibilita | null>(null)
  const [invio, setInvio] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [dettaglio, setDettaglio] = useState<string | null>(null)
  const [serveNumero, setServeNumero] = useState(false)
  const [conto, setConto] = useState<Preventivo | null>(null)
  const [contando, setContando] = useState(false)
  const [altreOpzioni, setAltreOpzioni] = useState(false)
  /**
   * Perché il conto non c'è.
   *
   * Prima l'errore veniva ingoiato e il pannello restava per sempre su
   * «appena metti partenza e arrivo…» — cioè diceva all'utente di fare una
   * cosa che aveva già fatto. Un guasto muto che accusa chi lo subisce è
   * peggio di un guasto rumoroso.
   */
  const [contoRotto, setContoRotto] = useState<string | null>(null)

  // La proposta di flessibilità si ricalcola con l'orario: la stessa tratta
  // il martedì mattina e il sabato sera non ha la stessa elasticità.
  const suggerita = oraArrivo && !Number.isNaN(new Date(oraArrivo).getTime())
    ? proponi({ categoria, oraArrivo: new Date(oraArrivo) })
    : null
  const scelta = flessibilita ?? suggerita?.minuti ?? 0
  const auto = veicoli.find((v) => v.id === veicolo)
  const massimo = conto?.postiMassimi ?? (auto?.postiTotali ?? 5) - 1
  /** Dirlo per nome: «quanti posti hai» è una domanda a cui l'auto ha già
      risposto in anagrafica, e ripeterla senza mostrare la risposta fa
      dubitare che l'abbiamo registrata. */
  const nomeAuto = auto ? `${auto.marca} ${auto.modello}` : null

  /**
   * Il conto si chiede appena ci sono i due punti e l'auto, e si rifà
   * quando cambiano i posti. È una chiamata sola e in cache lato server:
   * la stessa tratta chiesta due volte non paga due percorsi.
   */
  useEffect(() => {
    if (!origine || !destinazione || !veicolo) { setConto(null); setContoRotto(null); return }
    let vivo = true
    setContando(true); setContoRotto(null)
    const t = setTimeout(async () => {
      try {
        const r = await fetch('/api/preventivo', {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            veicoloId: veicolo,
            origine: { lat: origine.lat, lng: origine.lng },
            destinazione: { lat: destinazione.lat, lng: destinazione.lng },
            postiOfferti: posti,
            // Il preventivo deve rispondere alla corsa che stai
            // configurando, non a una corsa pubblica a rimborso pieno.
            modalita,
            livelloRimborso: modalita === 'pubblica' ? 'tutto' : rimborso,
          }),
        })
        if (!vivo) return
        if (!r.ok) {
          const d = await r.json().catch(() => ({}))
          setContoRotto(d.errore ?? 'non riusciamo a calcolare le spese')
          return
        }
        setConto(await r.json())
      } catch {
        if (vivo) setContoRotto('non riusciamo a calcolare le spese adesso')
      }
      finally { if (vivo) setContando(false) }
    }, 250)
    return () => { vivo = false; clearTimeout(t) }
  }, [origine, destinazione, veicolo, posti, modalita, rimborso])

  if (veicoli.length === 0) {
    return (
      <div className="fascia"><div className="dentro dentro-stretto pubblica-dentro">
        <h1 className="t-titolo">Prima la macchina</h1>
        <p className="t-guida" style={{ margin: 'var(--s4) 0 var(--s6)', maxWidth: '44ch' }}>
          Ci servono marca, modello e alimentazione per sapere quanto ti costa
          un chilometro. È da lì che esce la quota di chi sale — e senza, non
          sapremmo dirti quanto rientra.
        </p>
        <a href="/veicoli/nuovo" className="azione azione-piena">
          Aggiungi la tua auto <SegnoAvanti />
        </a>
      </div></div>
    )
  }

  const i = PASSI.indexOf(passo)
  const avanti = () => setPasso(PASSI[Math.min(i + 1, PASSI.length - 1)]!)
  const indietro = () => setPasso(PASSI[Math.max(i - 1, 0)]!)

  return (
    <div className="fascia">
      <div className="dentro dentro-app pubblica-dentro">

        {/* La spina: quattro passi con il nome, non quattro trattini.
            Sapere quanti ne restano è la differenza fra compilare e
            abbandonare. */}
        <ol className="spina">
          {PASSI.map((p, n) => (
            <li key={p} className={`spina-passo${n < i ? ' spina-fatto' : ''}${n === i ? ' spina-qui' : ''}`}>
              <span className="spina-numero">{n + 1}</span>
              <span className="spina-nome">{NOMI[p]}</span>
            </li>
          ))}
        </ol>

        <div className="pubblica-corpo">
          <div className="pubblica-domanda">

            {passo === 'dove' && (
              <>
                <h1 className="t-titolo">Dove vai?</h1>
                <p className="t-guida pubblica-guida">
                  Il viaggio che faresti comunque. Metti i punti veri di
                  partenza e arrivo: è da lì che calcoliamo le spese.
                </p>
                <CampoLuogo mappa={mappa} vicino={vicino} etichetta="Partenza"
                  valore={origine} onScegli={setOrigine} segnaposto="Da dove parti" />
                <CampoLuogo mappa={mappa} vicino={vicino} etichetta="Destinazione"
                  valore={destinazione} onScegli={setDestinazione} segnaposto="Dove stai andando" />

                {veicoli.length > 1 && (
                  <div style={{ marginTop: 'var(--s5)' }}>
                    <p className="occhiello">Con quale auto</p>
                    <div className="scelte-blocco">
                      {veicoli.map((v) => (
                        <button key={v.id} type="button"
                          className={`opzione${veicolo === v.id ? ' opzione-scelta' : ''}`}
                          onClick={() => setVeicolo(v.id)}>
                          <span className="opzione-titolo">{v.marca} {v.modello}</span>
                          <span className="opzione-nota">{v.postiTotali - 1} posti oltre al tuo</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <Piede
                  avanti={avanti} pronto={!!origine && !!destinazione}
                  manca="Scegli partenza e arrivo dall’elenco" />
              </>
            )}

            {passo === 'quando' && (
              <>
                <h1 className="t-titolo">Quando vuoi essere lì?</h1>
                <p className="t-guida pubblica-guida">
                  L&apos;ora di partenza la calcoliamo noi dal percorso, con dieci
                  minuti di margine.
                </p>
                <Quando valore={oraArrivo} onCambia={setOraArrivo} etichetta="Vuoi essere lì" />

                {suggerita && (
                  <div style={{ marginTop: 'var(--s5)' }}>
                    <p className="occhiello">Quanto sei preciso</p>
                    <div className="scelte-fila">
                      {SCELTE.map((m) => (
                        <button key={m} type="button"
                          className={`scelta${scelta === m ? ' scelta-attiva' : ''}`}
                          onClick={() => setFlessibilita(m)}>{etichetta(m)}</button>
                      ))}
                    </div>
                    <p className="t-nota" style={{ marginTop: 'var(--s3)' }}>
                      {flessibilita === null && `${suggerita.perche} `}
                      {scelta === 0
                        ? 'Ti trova solo chi cerca quell’ora.'
                        : `Ti trova anche chi cerca fino a ${scelta} minuti prima o dopo. Alla prima prenotazione l’orario si fissa.`}
                    </p>
                  </div>
                )}

                {/* Il ritorno è il vero problema della notte: chi va a
                    ballare sa già che dovrà tornare, e una corsa di sola
                    andata lo lascia a metà. */}
                <label className="riquadro riquadro-spunta" style={{ marginTop: 'var(--s5)' }}>
                  <input type="checkbox" checked={oraRitorno !== ''}
                    onChange={(e) => setOraRitorno(e.target.checked ? suggerisciRitorno(oraArrivo) : '')} />
                  <span>
                    <span className="opzione-titolo">Torni anche?</span>
                    <span className="opzione-nota">
                      Pubblichiamo anche il rientro. Restano due corse separate:
                      puoi disdire una e tenere l&apos;altra.
                    </span>
                  </span>
                </label>
                {oraRitorno !== '' && (
                  <label className="campo" style={{ marginTop: 'var(--s3)' }}>
                    <span className="campo-nome">Riparti alle</span>
                    <input type="datetime-local" value={oraRitorno}
                      onChange={(e) => setOraRitorno(e.target.value)} />
                  </label>
                )}

                <Piede avanti={avanti} indietro={indietro} pronto={!!oraArrivo}
                  manca="Scegli il giorno e l’ora" />
              </>
            )}

            {passo === 'conferma' && (
              <>
                <h1 className="t-titolo">Quanti posti hai?</h1>
                <p className="t-guida pubblica-guida">
                  {nomeAuto
                    ? `Oltre al tuo. La tua ${nomeAuto} ne ha ${massimo}.`
                    : 'Oltre al tuo.'}{' '}
                  Il costo si divide fra tutti quelli che sono in macchina, te
                  compresa.
                </p>
                <div className="posti-scelta">
                  {Array.from({ length: Math.min(massimo, 6) }, (_, n) => n + 1).map((n) => (
                    <button key={n} type="button"
                      className={`posto-numero${posti === n ? ' posto-numero-scelto' : ''}`}
                      onClick={() => setPosti(n)} aria-pressed={posti === n}>{n}</button>
                  ))}
                </div>

                {/* Il conto qui sotto su telefono: è la ragione per cui uno
                    sta pubblicando, e sulla colonna di destra non si vede. */}
                <div className="solo-telefono" style={{ marginTop: 'var(--s5)' }}>
                  <Riepilogo conto={conto} contando={contando} rotto={contoRotto} />
                </div>

                {/* ── Le sei domande di dettaglio, chiuse ──
                    Hanno già la risposta giusta per quasi tutti. Chi ha un
                    caso particolare le apre; gli altri non le vedono. */}
                <details className="altre" open={altreOpzioni}
                  onToggle={(e) => setAltreOpzioni((e.target as HTMLDetailsElement).open)}>
                  <summary className="altre-titolo">
                    <span>Altre opzioni</span>
                    <span className="altre-sotto">
                      {riassunto(modalita, immediata, deviazioni, politica)}
                    </span>
                  </summary>

                  <div className="altre-corpo">
                    <Opzioni titolo="Chi può vederla" segno={<SegnoOcchio />} valore={modalita}
                      onCambia={(v) => setModalita(v as typeof modalita)}
                      opzioni={[
                        { v: 'pubblica', t: 'Tutti', n: 'Compare nelle ricerche' },
                        { v: 'link', t: 'Chi ha il link', n: 'Non compare, ma chi ha il link prenota' },
                        { v: 'privata', t: 'Chi invito io', n: 'Solo chi aggiungi tu' },
                      ]} />

                    {/* Solo fuori dalle corse pubbliche.
                        Non per proteggere chi guida: perché in un mercato
                        chi chiede solo il carburante batte chi chiede la
                        quota onesta, e nel giro di poche settimane il
                        prezzo normale diventa il carburante. A quel punto
                        i conducenti smettono di pubblicare, e GO scivola
                        da «dividere una spesa» a «trasporto a poco
                        prezzo» — la riga che non attraversiamo.

                        Fra amici invece il costo ACI pieno, che dentro ha
                        la svalutazione, non è antipatico: è irreale.
                        Nessuno ha mai chiesto a un amico la svalutazione,
                        e se l'applicazione lo pretende ci si mette
                        d'accordo in contanti fuori di qui. */}
                    {modalita !== 'pubblica' && (
                      <Opzioni titolo="Quanto ti fai rimborsare" segno={<SegnoOcchio />}
                        valore={rimborso} onCambia={(v) => setRimborso(v as typeof rimborso)}
                        opzioni={[
                          { v: 'tutto', t: 'Quello che costa', n: 'Il costo pieno, usura compresa' },
                          { v: 'carburante_pedaggi', t: 'Carburante e pedaggi', n: 'Niente usura né svalutazione' },
                          { v: 'carburante', t: 'Solo il carburante', n: 'Quello che lasci al distributore' },
                          { v: 'niente', t: 'Offro io', n: 'Non paga nessuno' },
                        ]} />
                    )}

                    <Opzioni titolo="Chi sale" segno={<SegnoPersone />} valore={immediata ? 'si' : 'no'}
                      onCambia={(v) => setImmediata(v === 'si')}
                      opzioni={[
                        { v: 'no', t: 'Decido io', n: 'Ricevi una richiesta e rispondi' },
                        { v: 'si', t: 'Chiunque', n: 'Si riempie prima, ma non scegli' },
                      ]} />

                    <Opzioni titolo="Deviazioni" segno={<SegnoDeviazione />} valore={deviazioni ? 'si' : 'no'}
                      onCambia={(v) => setDeviazioni(v === 'si')}
                      opzioni={[
                        { v: 'si', t: 'Se è di strada', n: 'Riempie molto di più: i km in più li pagano loro' },
                        { v: 'no', t: 'No, parto e arrivo', n: 'Solo ai punti che hai indicato' },
                      ]} />

                    <Opzioni titolo="Se disdicono" segno={<SegnoOrologio />} valore={politica}
                      onCambia={(v) => setPolitica(v as typeof politica)}
                      opzioni={[
                        { v: 'nessuna', t: 'Non trattengo niente', n: 'Disdicono quando vogliono' },
                        { v: 'flessibile', t: 'Fino a un’ora prima', n: 'Più gente prenota, ma può saltare' },
                        { v: 'rigida', t: 'Fino a sei ore prima', n: 'Posto più sicuro, meno prenotazioni' },
                      ]} />

                    <div className="opzione-gruppo">
                      <p className="opzione-testa"><SegnoNota /> Vuoi dire qualcosa a chi sale</p>
                      <label className="campo">
                        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
                          placeholder="Parto puntuale · musica alta · niente bagagli grandi" />
                      </label>
                    </div>
                  </div>
                </details>

                <label className="riquadro riquadro-spunta" style={{ marginTop: 'var(--s5)' }}>
                  <input type="checkbox" checked={dichiarato}
                    onChange={(e) => setDichiarato(e.target.checked)} />
                  <span className="dichiarazione">{TESTO_DICHIARAZIONE}</span>
                </label>

                {/* Quando manca il numero non si mostra un rimprovero: si
                    mostra il campo per metterlo, qui, senza perdere il
                    modulo compilato. */}
                {serveNumero && <AggiungiTelefono suSalvato={() => { setServeNumero(false); setErrore(null) }} />}
                {errore && !serveNumero && (
                  <>
                    <p className="errore">{errore}</p>
                    {dettaglio && <p className="errore-dettaglio">{dettaglio}</p>}
                  </>
                )}

                <div className="pubblica-piede">
                  <button type="button" className="collegamento-piccolo" onClick={indietro}>
                    Indietro
                  </button>
                  <button type="button" className="azione azione-piena"
                    aria-disabled={!dichiarato || invio}
                    onClick={pubblica}>
                    {invio ? 'Un attimo…' : 'Pubblica il viaggio'}
                  </button>
                </div>
                <p className="t-nota" style={{ marginTop: 'var(--s3)' }}>
                  Puoi annullarla quando vuoi. Se nessuno prenota, sparisce da sola.
                </p>
              </>
            )}
          </div>

          {/* ══ Le spese, sempre accanto ══
              Il numero per cui uno pubblica non sta in fondo a un modulo:
              sta accanto a ogni domanda, e si aggiorna mentre si risponde. */}
          <aside className="colonna-conto">
            <div className="scatola-conto">
              <p className="occhiello">Le spese del viaggio</p>

              {contoRotto && !conto ? (
                <p className="conto-attesa">
                  {contoRotto}. Puoi pubblicare lo stesso: il calcolo lo
                  rifacciamo noi, ed è lo stesso di sempre.
                </p>
              ) : !conto ? (
                <p className="conto-attesa">
                  {contando
                    ? 'Calcoliamo…'
                    : 'Appena metti partenza e arrivo ti diciamo quanto costa il viaggio e quanto ti rientra.'}
                </p>
              ) : (
                <>
                  <div className="conto-percorso">
                    {conto.km.toFixed(0)} km · {Math.round(conto.minuti)} minuti
                  </div>

                  <div className="conto-blocco">
                    <span className="conto-etichetta">Ti costa</span>
                    <span className="numero conto-cifra">{euro(conto.costoViaggioCent)}</span>
                    <span className="t-nota">
                      benzina, gomme, tagliandi e usura, sulle tabelle ACI della tua auto
                    </span>
                  </div>

                  <div className="conto-riga" />

                  <div className="conto-blocco">
                    <span className="conto-etichetta">Ti rientrano</span>
                    <span className="numero conto-cifra conto-cifra-viva">
                      {euro(conto.rientroPienoCent)}
                    </span>
                    <span className="t-nota">
                      se si riempie. Con una persona sola, {euro(conto.rientroUnoCent)}.
                    </span>
                  </div>

                  <div className="conto-riga" />

                  <div className="conto-blocco">
                    <span className="conto-etichetta">Chi sale paga</span>
                    <span className="conto-piccola">{euro(conto.pagaPasseggeroCent)} a testa</span>
                  </div>

                  <p className="conto-onesto">
                    Resta comunque a carico tuo{' '}
                    <strong>{euro(conto.costoViaggioCent - conto.rientroPienoCent)}</strong>:
                    su GO chi guida non ci guadagna, rientra di una parte.
                  </p>
                </>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  )

  async function pubblica() {
    if (!dichiarato || invio) return
    setInvio(true); setErrore(null); setDettaglio(null)
    const r = await fetch('/api/corse', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        veicoloId: veicolo,
        origine: { label: origine!.etichetta, lat: origine!.lat, lng: origine!.lng },
        destinazione: { label: destinazione!.etichetta, lat: destinazione!.lat, lng: destinazione!.lng },
        oraArrivo: istante(oraArrivo), postiOfferti: posti, modalita,
        // Un nome, non un importo: gli euro li calcola il server, dove i
        // chilometri e il costo dell'auto esistono davvero.
        livelloRimborso: modalita === 'pubblica' ? 'tutto' : rimborso,
        prenotaImmediata: immediata,
        deviazioniRitiro: deviazioni, deviazioniDeposito: deviazioni,
        politica, note,
        oraRitorno: oraRitorno ? istante(oraRitorno) : undefined,
        flessibilitaMin: scelta,
        // La spunta È l'atto: viaggia con la pubblicazione, e il server la
        // registra con la data prima di creare la corsa.
        dichiarazione: dichiarato,
      }),
    })
    const d = await r.json()
    if (!r.ok) {
      if (d.codice === 'telefono') { setServeNumero(true); setInvio(false); return }
      setErrore(d.errore ?? 'Non è andata')
      setDettaglio(d.dettaglio ?? null)
      setInvio(false); return
    }
    window.location.href = `/corsa/${d.corsa.id}`
  }
}

/** Cosa c'è dietro «altre opzioni», in una riga: chi apre lo fa sapendo. */
function riassunto(
  modalita: string, immediata: boolean, deviazioni: boolean, politica: string,
): string {
  return [
    modalita === 'pubblica' ? 'visibile a tutti' : modalita === 'link' ? 'solo con il link' : 'solo su invito',
    immediata ? 'prenotano subito' : 'decidi tu chi sale',
    deviazioni ? 'deviazioni sì' : 'niente deviazioni',
    politica === 'flessibile' ? 'disdetta fino a un’ora prima' : 'disdetta fino a sei ore prima',
  ].join(' · ')
}

/** Il conto, in forma breve, per quando la colonna di destra non c'è. */
function Riepilogo({ conto, contando, rotto }: {
  conto: Preventivo | null; contando: boolean; rotto: string | null
}) {
  if (!conto) {
    return (
      <p className="t-nota">
        {rotto ? `${rotto}. Puoi pubblicare lo stesso.`
          : contando ? 'Calcoliamo le spese…'
            : 'Appena metti partenza e arrivo ti diciamo quanto ti rientra.'}
      </p>
    )
  }
  return (
    <div className="riepilogo">
      <span className="riepilogo-voce">
        <span className="t-nota">Ti rientrano</span>
        <span className="numero riepilogo-cifra">{euro(conto.rientroPienoCent)}</span>
      </span>
      <span className="riepilogo-voce">
        <span className="t-nota">Chi sale paga</span>
        <span className="riepilogo-piccola">{euro(conto.pagaPasseggeroCent)}</span>
      </span>
    </div>
  )
}

function Piede({ avanti, indietro, pronto, manca }: {
  avanti: () => void; indietro?: () => void; pronto: boolean; manca: string
}) {
  return (
    <>
      <div className="pubblica-piede">
        {indietro && (
          <button type="button" className="collegamento-piccolo" onClick={indietro}>Indietro</button>
        )}
        <button type="button" className="azione azione-piena" aria-disabled={!pronto}
          onClick={() => pronto && avanti()}>
          Avanti <SegnoAvanti />
        </button>
      </div>
      {!pronto && manca && <p className="t-nota" style={{ marginTop: 'var(--s3)' }}>{manca}</p>}
    </>
  )
}

/**
 * Una domanda, con le risposte in fila.
 *
 * Erano impilate: quattro domande da tre risposte ciascuna facevano una
 * colonna di dodici rettangoli alta due schermate, e per arrivare in fondo
 * si scorreva senza più sapere a che domanda si stava rispondendo. In
 * orizzontale la domanda e le sue risposte stanno insieme sotto l'occhio,
 * e il segno dice di cosa si parla prima ancora che si legga il titolo.
 */
function Opzioni({ titolo, segno, opzioni, valore, onCambia }: {
  titolo: string
  segno: React.ReactNode
  opzioni: Array<{ v: string; t: string; n: string }>
  valore: string
  onCambia: (v: string) => void
}) {
  return (
    <div className="opzione-gruppo">
      <p className="opzione-testa">{segno} {titolo}</p>
      <div className="opzione-fila">
        {opzioni.map((o) => (
          <button key={o.v} type="button"
            className={`opzione${valore === o.v ? ' opzione-scelta' : ''}`}
            aria-pressed={valore === o.v} onClick={() => onCambia(o.v)}>
            <span className="opzione-titolo">{o.t}</span>
            <span className="opzione-nota">{o.n}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * Da «quando» a «quale istante».
 *
 * I campi dell'orario danno una stringa senza fuso — «2026-08-31T02:00» —
 * e chi la legge decide da sé cosa significa: il browser la intende come
 * ora locale, un server che vive a UTC la intende come UTC. Due ore di
 * differenza d'estate, su una corsa notturna, sono il passaggio perso.
 *
 * Si converte qui, nel browser, che è l'unico posto dove si sa davvero in
 * che fuso è chi sta pubblicando.
 */
function istante(locale: string): string {
  const d = new Date(locale)
  return Number.isNaN(d.getTime()) ? locale : d.toISOString()
}

/**
 * Un'ipotesi ragionevole per il rientro: quattro ore dopo l'arrivo.
 *
 * Non è una statistica, è il modo di non far compilare un campo vuoto alle
 * undici di sera. Chi torna prima o dopo lo cambia in due tocchi.
 */
function suggerisciRitorno(oraArrivo: string): string {
  if (!oraArrivo) return ''
  const d = new Date(oraArrivo)
  if (Number.isNaN(d.getTime())) return ''
  d.setHours(d.getHours() + 4)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}
