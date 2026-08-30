import { Riquadro, Bottone, Etichetta, euro } from './base.tsx'
import { AzioniConducente, RispondiProposta } from './AzioniConducente.tsx'
import { Invita } from './Invita.tsx'
import { QuotePersonalizzate } from './QuotePersonalizzate.tsx'

/**
 * La corsa vista da chi guida.
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
  daConfermare: boolean
  passeggeri: Array<{
    id: string
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

  return (
    <main style={{ maxWidth: 'var(--colonna)', margin: '0 auto', padding: '18px 20px 40px' }}>
      {/* ── La conferma. Prima di tutto, se serve. ── */}
      {c.daConfermare && (
        <Riquadro tono="accento" stile={{ marginBottom: 18 }}>
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

      {/* ── Le proposte: scadono, quindi vengono prima del resto ── */}
      {c.proposte.length > 0 && (
        <section style={{ marginBottom: 18 }}>
          <Etichetta tono="accento">
            {c.proposte.length === 1 ? 'una richiesta' : `${c.proposte.length} richieste`}
          </Etichetta>
          <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
            {c.proposte.map((p) => <CartaProposta key={p.id} p={p} />)}
          </div>
        </section>
      )}

      {/* ── Il viaggio ── */}
      <Riquadro stile={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14 }}>
          <div style={{ minWidth: 0 }}>
            <Etichetta>parti alle</Etichetta>
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
        <Etichetta>
          {c.passeggeri.length === 0
            ? 'nessuno ancora'
            : `${c.passeggeri.length} a bordo`}
          {liberi > 0 && ` · ${liberi} ${liberi === 1 ? 'posto libero' : 'posti liberi'}`}
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
                    sale a {p.punto}
                  </div>
                </div>
                <a href={`/chat/${c.id}`} style={{
                  flexShrink: 0, fontSize: 14, fontWeight: 600, textDecoration: 'none',
                }}>Scrivi</a>
              </div>
            </Riquadro>
          ))}

          {/* Su una corsa non pubblica il posto vuoto si riempie mandando
              il collegamento, non aspettando che qualcuno la trovi. */}
          {liberi > 0 && c.modalita !== 'pubblica' && c.tokenLink && (
            <Invita token={c.tokenLink}
              destinazione={c.destinazioneLabel}
              orario={orario(c.oraPartenza)} />
          )}

          {/* Il posto vuoto non è uno spazio bianco: è un invito.
              Nel primo anno la maggior parte delle corse parte mezza vuota,
              e questa è l'unica leva che il conducente ha in mano. */}
          {liberi > 0 && c.modalita === 'pubblica' && (
            <div style={{
              border: '1px dashed var(--riga)', borderRadius: 'var(--raggio)',
              padding: '16px 18px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 14, color: 'var(--inchiostro-2)', lineHeight: 1.5 }}>
                {liberi === 1 ? 'Resta un posto' : `Restano ${liberi} posti`}.
                Ogni persona in più sono{' '}
                {euro(Math.floor(c.costoCent / (c.postiOfferti + 1)))} che non
                paghi tu.
              </div>
              <button style={{
                background: 'none', border: 'none', color: 'var(--accento)',
                fontWeight: 600, fontSize: 14, padding: '10px 0 0',
              }}>
                Manda il link a chi ci va
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Fra amici le spese si dividono come vuole il gruppo. */}
      {c.modalita === 'privata' && c.passeggeri.length > 0 && (
        <section style={{ marginTop: 24 }}>
          <QuotePersonalizzate
            corsa={c.id}
            tettoCent={c.tettoCent}
            passeggeri={c.passeggeri.map((p) => ({
              id: p.id, nome: p.nome, quotaCent: p.quotaCent,
            }))}
          />
        </section>
      )}
    </main>
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

const orario = (iso: string) =>
  new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
