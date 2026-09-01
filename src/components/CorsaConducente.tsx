import { Riquadro, Etichetta, euro } from './base.tsx'
import { giorno, orario } from '../lib/tempo.ts'
import { AzioniConducente, RispondiProposta } from './AzioniConducente.tsx'
import { Condividi } from './Condividi.tsx'
import { InViaggio } from './InViaggio.tsx'
import { AbilitaPush } from './AbilitaPush.tsx'
import { QuotePersonalizzate } from './QuotePersonalizzate.tsx'

/**
 * La corsa vista da chi guida.
 *
 * Due colonne sulla scrivania: a sinistra quello che si guarda («chi c'è a
 * bordo, chi ha chiesto, dove passo»), a destra quello che si fa e il
 * numero — appiccicato in alto mentre si scorre il resto. Prima erano una
 * pila sola larga 460 pixel: su un portatile il conto e le azioni finivano
 * sotto la piega, e questa è la schermata dove chi guida deve rispondere in
 * fretta.
 *
 * Il momento che questa schermata esiste per risolvere è uno solo: la
 * conferma a tre ore dalla partenza. Se il conducente non conferma, a
 * T−60min facciamo partire il rimatch e la corsa si annulla — quindi la
 * richiesta non può essere un avviso fra gli altri: deve essere la prima
 * cosa, grande, con due pulsanti e nient'altro attorno.
 *
 * Le proposte di deviazione vengono subito dopo, perché scadono. Tutto il
 * resto è consultazione e può stare sotto.
 */

export interface Proposta {
  id: string
  passeggero: { nome: string; fotoUrl: string | null; corseFatte: number }
  punto: string
  kmInPiu: number
  incassoInPiuCent: number
  messaggio?: string
  scadeFra: string
}

export interface DatiCorsaConducente {
  id: string
  stato: 'pubblicata' | 'confermata' | 'in_corso' | 'conclusa' | 'annullata'
  oraPartenza: string
  oraArrivo: string
  origineLabel: string
  destinazioneLabel: string
  postiOfferti: number
  modalita: 'pubblica' | 'link' | 'privata'
  tokenLink?: string | null
  costoCent: number
  rientroNettoCent: number
  tettoCent: number
  /** partenza, ritiri nell'ordine, destinazione — per il navigatore */
  tappe?: Array<{ lat: number; lng: number; etichetta?: string }>
  daConfermare: boolean
  passeggeri: Array<{
    id: string
    /** Chi è la persona, non quale prenotazione: apre il suo profilo. */
    profiloId: string | null
    nome: string
    fotoUrl: string | null
    punto: string
    quotaCent: number
    corseFatte: number
  }>
  proposte: Proposta[]
}

export function CorsaConducente({ c }: { c: DatiCorsaConducente }) {
  const liberi = c.postiOfferti - c.passeggeri.length
  const restaACarico = c.costoCent - c.rientroNettoCent
  const minutiAllaPartenza = (new Date(c.oraPartenza).getTime() - Date.now()) / 60_000

  /**
   * Una corsa finita deve SEMBRARE finita.
   *
   * Fino a ieri in tutta questa schermata c'era una sola cosa che
   * dipendesse dallo stato: tutto il resto — il collegamento da mandare, la
   * chat, i posti liberi, il prezzo — si comportava identico che la corsa
   * fosse di domani o di tre mesi fa. Il risultato è che si poteva invitare
   * gente su un viaggio già fatto.
   */
  const finita = ['conclusa', 'annullata', 'scaduta'].includes(c.stato)
  const annullata = c.stato === 'annullata'
  const oreDaArrivo = (Date.now() - new Date(c.oraArrivo).getTime()) / 3_600_000
  // La chat resta aperta due giorni: copre la sciarpa dimenticata e chiude
  // il resto. La stessa soglia sta sul server, che è dove conta.
  const chatAperta = !finita || oreDaArrivo <= 48

  return (
    <div className="fascia"><div className="dentro dentro-app dettaglio-dentro">

      <div className="dettaglio-testa">
        {/* Che questa corsa la guidi TU è la prima cosa da sapere: decide
            cosa puoi fare in questa schermata, e ci si può arrivare da un
            collegamento senza aver scelto di entrare in modalità
            conducente. Una riga grigia in coda alla data non bastava. */}
        <p className="fila" style={{ gap: 'var(--s3)' }}>
          <span className={`pastiglia ${finita ? 'pastiglia-quieta' : 'pastiglia-viola'}`}>
            {annullata ? 'annullata' : finita ? 'conclusa' : 'guidi tu'}
          </span>
          <span className="occhiello">{giorno(c.oraPartenza)}</span>
        </p>
        <h1 className="t-titolo" style={{ marginTop: 'var(--s2)' }}>{c.destinazioneLabel}</h1>
        {/* Al passato quando è passata: «parti alle 21:17» su un viaggio di
            tre mesi fa è la frase che fa dubitare di tutto il resto. */}
        <p className="t-guida" style={{ marginTop: 'var(--s2)' }}>
          {annullata
            ? `Annullata. Sarebbe partita alle ${orario(c.oraPartenza)} da ${c.origineLabel}.`
            : finita
              ? `Partita alle ${orario(c.oraPartenza)} da ${c.origineLabel}, arrivata alle ${orario(c.oraArrivo)}.`
              : `Parti alle ${orario(c.oraPartenza)} da ${c.origineLabel}`}
        </p>
      </div>

      <div className="dettaglio-corpo">
      <div className="pila" style={{ gap: 'var(--s5)' }}>
      {/* ── La conferma. Prima di tutto, se serve. ── */}
      {c.daConfermare && (
        <Riquadro tono="accento">
          <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--titoli)' }}>
            Confermi?
          </div>
          <p style={{ margin: '6px 0 16px', fontSize: 14.5, color: 'var(--inchiostro-2)', lineHeight: 1.5 }}>
            {c.passeggeri.length === 1
              ? 'Una persona ti aspetta'
              : `${c.passeggeri.length} persone ti aspettano`} alle{' '}
            {orario(c.oraPartenza)}. Se non confermi entro un'ora dalla
            partenza cerchiamo un'alternativa a chi ha prenotato, e la corsa
            si annulla.
          </p>
          <AzioniConducente corsa={c.id} passeggeri={c.passeggeri.length} />
        </Riquadro>
      )}

      {/* Chi guida ha poche ore per rispondere a una richiesta, e se non
          risponde la corsa salta: è il caso in cui una notifica serve
          davvero, e si chiede appena la corsa esiste. */}
      {c.stato === 'pubblicata' && <AbilitaPush momento="dopo-pubblicazione" />}

      {/* ── Le proposte: scadono, quindi vengono prima del resto ── */}
      {c.proposte.length > 0 && (
        <section>
          <Etichetta tono="accento">
            {c.proposte.length === 1 ? 'una richiesta' : `${c.proposte.length} richieste`}
          </Etichetta>
          <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
            {c.proposte.map((p) => <CartaProposta key={p.id} p={p} />)}
          </div>
        </section>
      )}

      {/* ── Si parte ──
          Nella mezz'ora prima della partenza tutto il resto arretra: quello
          che serve è il navigatore e niente altro. */}
      {!finita && c.tappe && c.tappe.length >= 2 && minutiAllaPartenza <= 30 && (
        <section>
          <InViaggio corsa={c.id} tappe={c.tappe}
            prossimoRitiro={c.tappe[1]} />
        </section>
      )}

      {/* ── Il viaggio ── */}
      <Riquadro>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14 }}>
          <div style={{ minWidth: 0 }}>
            <Etichetta>{finita ? 'era partita alle' : 'parti alle'}</Etichetta>
            <div style={{
              fontFamily: 'var(--titoli)', fontWeight: 700, fontSize: 30,
              letterSpacing: '-.03em', margin: '3px 0 2px',
            }}>{orario(c.oraPartenza)}</div>
            <div style={{ fontSize: 14, color: 'var(--tenue)' }}>
              {c.origineLabel} → {c.destinazioneLabel}
            </div>
          </div>
          <div style={{ flexShrink: 0, textAlign: 'right' }}>
            <Etichetta>ti restano</Etichetta>
            <div style={{
              fontFamily: 'var(--titoli)', fontWeight: 700, fontSize: 22,
              letterSpacing: '-.02em', margin: '3px 0 2px',
            }}>{euro(restaACarico)}</div>
            <div style={{ fontSize: 12.5, color: 'var(--tenue)' }}>
              su {euro(c.costoCent)}
            </div>
          </div>
        </div>
      </Riquadro>

      {/* ── Chi sale ── */}
      <section>
        {/* «Ancora» e «posti liberi» guardano avanti: su un viaggio finito
            non descrivono niente. Lì il vuoto è un esito. */}
        <Etichetta>
          {c.passeggeri.length === 0
            ? (finita ? 'non è salito nessuno' : 'nessuno ancora')
            : `${c.passeggeri.length} ${finita ? (c.passeggeri.length === 1 ? 'è salita' : 'sono salite') : 'a bordo'}`}
          {!finita && liberi > 0 && ` · ${liberi} ${liberi === 1 ? 'posto libero' : 'posti liberi'}`}
        </Etichetta>

        <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
          {c.passeggeri.map((p) => (
            <Riquadro key={p.id} stile={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 19, flexShrink: 0,
                  background: 'var(--superficie-2)',
                  backgroundImage: p.fotoUrl ? `url(${p.fotoUrl})` : undefined,
                  backgroundSize: 'cover',
                }} />
                <div style={{ flexGrow: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 15.5 }}>{p.nome}</div>
                  <div style={{ fontSize: 13.5, color: 'var(--tenue)' }}>
                    {finita ? 'saliva' : 'sale'} a {p.punto}
                  </div>
                </div>
                {/* Qui c'era «Scrivi», e accanto a ogni nome puntava alla
                    STESSA conversazione di gruppo: tre collegamenti identici
                    che promettevano tre conversazioni separate. Chi lo
                    toccava per dire una cosa a una persona la diceva a
                    tutte. Il collegamento per persona esiste — è il suo
                    profilo — e per scrivere c'è un bottone solo, sotto, che
                    dice a chi arriva il messaggio. */}
                {p.profiloId && (
                  <a href={`/profilo/${p.profiloId}`} style={{
                    flexShrink: 0, fontSize: 14, fontWeight: 600, textDecoration: 'none',
                  }}>Profilo</a>
                )}
              </div>
            </Riquadro>
          ))}

          {/* Su una corsa non pubblica il posto vuoto si riempie mandando
              il collegamento, non aspettando che qualcuno la trovi. */}
          {!finita && liberi > 0 && c.modalita !== 'pubblica' && c.tokenLink && (
            <Condividi privata percorso={`/invito/${c.tokenLink}`}
              destinazione={c.destinazioneLabel} orario={orario(c.oraPartenza)}
              sotto="Non compare nelle ricerche. Manda il collegamento a chi vuoi: chi lo apre può prenotare." />
          )}

          {/* Il posto vuoto non è uno spazio bianco: è un invito.
              Nel primo anno la maggior parte delle corse parte mezza vuota,
              e questa è l'unica leva che il conducente ha in mano. */}
          {!finita && liberi > 0 && c.modalita === 'pubblica' && (
            <Condividi percorso={`/corsa/${c.id}`}
              destinazione={c.destinazioneLabel} orario={orario(c.oraPartenza)}
              sotto={`${liberi === 1 ? 'Resta un posto' : `Restano ${liberi} posti`}. La corsa è già nelle ricerche, ma ogni persona in più sono ${euro(Math.floor(c.costoCent / (c.postiOfferti + 1)))} che non paghi tu: mandarla a chi sai che ci va è la strada più corta.`} />
          )}
        </div>
      </section>

      {/* Fra amici le spese si dividono come vuole il gruppo. */}
      {c.modalita === 'privata' && c.passeggeri.length > 0 && (
        <section>
          <QuotePersonalizzate
            corsa={c.id}
            tettoCent={c.tettoCent}
            passeggeri={c.passeggeri.map((p) => ({
              id: p.id, nome: p.nome, quotaCent: p.quotaCent,
            }))}
          />
        </section>
      )}
      </div>

      {/* ══ Il conto, sempre accanto ══
          È la domanda che chi guida si fa ogni volta che apre la corsa:
          quanto mi resta addosso di quello che spendo. */}
      <aside className="colonna-azione">
        <div className="scatola-prezzo scatola-distesa">
          <p className="occhiello">Ti resta a carico</p>
          <div className="numero prezzo-grande">{euro(restaACarico)}</div>
          <p className="t-nota" style={{ marginTop: 'var(--s2)' }}>
            su {euro(c.costoCent)} che ti costa il viaggio.
            {c.rientroNettoCent > 0 && ` Ti rientrano ${euro(c.rientroNettoCent)}.`}
          </p>

          <div className="conto-riga" />

          <div className="fila-fra" style={{ marginTop: 'var(--s4)' }}>
            <span className="conto-etichetta">A bordo</span>
            <span className="conto-piccola">
              {c.passeggeri.length}/{c.postiOfferti}
            </span>
          </div>

          {!finita && liberi > 0 && (
            <p className="t-nota" style={{ marginTop: 'var(--s3)' }}>
              Ogni persona in più sono{' '}
              {euro(Math.floor(c.costoCent / (c.postiOfferti + 1)))} che non
              paghi tu.
            </p>
          )}

          {c.passeggeri.length > 0 && chatAperta && (
            <a href={`/chat/${c.id}`} className="azione azione-vuota"
              style={{ width: '100%', marginTop: 'var(--s4)' }}>
              {finita ? 'Scrivi a chi era a bordo' : 'Scrivi a chi sale'}
            </a>
          )}
          {c.passeggeri.length > 0 && !chatAperta && (
            <p className="t-nota" style={{ marginTop: 'var(--s4)' }}>
              La conversazione si è chiusa due giorni dopo l&apos;arrivo.
            </p>
          )}
        </div>
      </aside>
      </div>
    </div></div>
  )
}

/**
 * Una proposta di deviazione.
 *
 * Mostra le tre cose su cui si decide: chi è, quanto costa in chilometri,
 * quanto rende. E dice che il posto NON è bloccato — perché non lo è, e un
 * conducente che scopre dopo di aver perso una prenotazione mentre ci
 * pensava non pubblica più.
 */
function CartaProposta({ p }: { p: Proposta }) {
  return (
    <Riquadro stile={{ padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 19, flexShrink: 0,
          background: 'var(--superficie-2)',
          backgroundImage: p.passeggero.fotoUrl ? `url(${p.passeggero.fotoUrl})` : undefined,
          backgroundSize: 'cover',
        }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 15.5 }}>{p.passeggero.nome}</div>
          <div style={{ fontSize: 13, color: 'var(--tenue)' }}>
            {p.passeggero.corseFatte === 0
          ? 'primo viaggio'
          : `${p.passeggero.corseFatte} ${p.passeggero.corseFatte === 1 ? 'viaggio fatto' : 'viaggi fatti'}`}
          </div>
        </div>
      </div>

      <div style={{
        margin: '14px 0', padding: '12px 14px', borderRadius: 'var(--raggio-s)',
        background: 'var(--superficie-2)', fontSize: 14, lineHeight: 1.5,
      }}>
        {/* Nessun pronome: non sappiamo come si definiscono gli utenti, e
            un «lui» automatico sbaglia su metà di loro. E i chilometri in
            più sono rimborsati, non guadagnati: dirlo «incassi» farebbe
            credere a un margine che non esiste. */}
        Chiede di salire a <strong>{p.punto}</strong>. Sono{' '}
        {p.kmInPiu.toFixed(1).replace('.', ',')} km in più, rimborsati a parte:{' '}
        {euro(p.incassoInPiuCent)}.
      </div>

      {p.messaggio && (
        <p style={{
          margin: '0 0 14px', fontSize: 14, color: 'var(--inchiostro-2)',
          lineHeight: 1.5, fontStyle: 'italic',
        }}>«{p.messaggio}»</p>
      )}

      <RispondiProposta prenotazione={p.id} scadeFra={p.scadeFra} />
    </Riquadro>
  )
}

