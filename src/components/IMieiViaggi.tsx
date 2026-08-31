'use client'
import { useState } from 'react'
import { euro } from './base.tsx'
import { SegnoAvanti } from './segni.tsx'
import { quando } from '../lib/tempo.ts'
import type { Modo } from '../server/modo.ts'

/**
 * I miei viaggi.
 *
 * Prima era un elenco solo, con il ruolo scritto in grigio a tredici pixel:
 * «guidi tu». È l'informazione più importante della riga — decide cosa puoi
 * fare, cosa ti aspetta, se stai per pagare o per incassare — e stava nel
 * posto dove si guarda per ultimo.
 *
 * Adesso sono due schede. Non un filtro: due elenchi, ciascuno con le sue
 * parole. In quello da passeggero i numeri sono quello che paghi; in quello
 * da conducente sono quello che rientra, e le righe hanno i posti liberi.
 * La scheda aperta è quella della modalità in cui stai — se stai guidando,
 * le tue corse sono la prima cosa che vedi.
 *
 * Le cose in sospeso restano in cima a tutt'e due: sono la ragione per cui
 * questa schermata esiste, e sono le sole che non possono aspettare che tu
 * scelga la scheda giusta.
 */

export interface Viaggio {
  id: string
  ruolo: 'passeggero' | 'conducente'
  stato: string
  oraPartenza: string
  origineLabel: string
  destinazioneLabel: string
  /**
   * Quello che paghi (da passeggero) o quello che rientri (da conducente).
   * Nullo quando non c'è ancora un numero: uno «0,00 €» si legge come
   * «gratis» o come un errore, e nessuna delle due cose è vera.
   */
  importoCent: number | null
  altri: number
  postiLiberi?: number
  daFare?: string
}

export function IMieiViaggi({ prossimi, passati, modo = 'passeggero' }: {
  prossimi: Viaggio[]
  passati: Viaggio[]
  modo?: Modo
}) {
  const [scheda, setScheda] = useState<Viaggio['ruolo']>(modo)
  const tutti = [...prossimi, ...passati]
  const daFare = prossimi.filter((v) => v.daFare)

  const conta = (r: Viaggio['ruolo']) => tutti.filter((v) => v.ruolo === r).length
  const futuri = prossimi.filter((v) => v.ruolo === scheda)
  const fatti = passati.filter((v) => v.ruolo === scheda)

  if (tutti.length === 0) return <Nessuno modo={modo} />

  return (
    <>
      <div className="fascia testata">
        <div className="dentro dentro-app testata-dentro">
          <div>
            <p className="occhiello">{modo === 'conducente' ? 'Le corse che guidi' : 'I passaggi che hai preso'}</p>
            <h1 className="t-titolo testata-titolo" style={{ marginTop: 'var(--s3)' }}>
              I miei viaggi
            </h1>
            <p className="testata-sotto">
              Quelli a cui partecipi e quelli che hai pubblicato, tenuti
              separati: il ruolo cambia cosa puoi fare.
            </p>
          </div>
        </div>
      </div>

    <div className="fascia">
      <div className="dentro dentro-app viaggi-dentro">

        {/* ── Quello che devi fare TU, di qualunque ruolo sia ── */}
        {daFare.length > 0 && (
          <section className="viaggi-sospesi">
            <p className="occhiello occhiello-accento">
              {daFare.length === 1 ? 'Una cosa da fare' : `${daFare.length} cose da fare`}
            </p>
            <div className="pila-s" style={{ marginTop: 'var(--s3)' }}>
              {daFare.map((v) => (
                <a key={v.id} href={dove(v)} className="sospeso">
                  <span className="cresci">
                    <span className="sospeso-cosa">{v.daFare}</span>
                    <span className="sospeso-dove">
                      {v.destinazioneLabel} · {quando(v.oraPartenza)}
                      {v.ruolo === 'conducente' ? ' · guidi tu' : ''}
                    </span>
                  </span>
                  <SegnoAvanti />
                </a>
              ))}
            </div>
          </section>
        )}

        <div className="segmenti viaggi-schede" role="group" aria-label="Ruolo">
          <button type="button" className="segmento" aria-pressed={scheda === 'passeggero'}
            onClick={() => setScheda('passeggero')}>
            Come passeggero <span className="segmento-conta">{conta('passeggero')}</span>
          </button>
          <button type="button" className="segmento" aria-pressed={scheda === 'conducente'}
            onClick={() => setScheda('conducente')}>
            Come conducente <span className="segmento-conta">{conta('conducente')}</span>
          </button>
        </div>

        {futuri.length === 0 && fatti.length === 0 ? (
          <VuotoScheda ruolo={scheda} />
        ) : (
          <div className="pila" style={{ gap: 'var(--s7)' }}>
            {futuri.length > 0 && (
              <section>
                <p className="occhiello" style={{ marginBottom: 'var(--s3)' }}>In programma</p>
                <div className="griglia-elenco">
                  {futuri.map((v) => <Carta key={v.id} v={v} />)}
                </div>
              </section>
            )}
            {fatti.length > 0 && (
              <section>
                <p className="occhiello" style={{ marginBottom: 'var(--s3)' }}>Già fatti</p>
                <div className="griglia-elenco">
                  {fatti.map((v) => <Carta key={v.id} v={v} passato />)}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
    </>
  )
}

const dove = (v: Viaggio) =>
  v.ruolo === 'conducente' ? `/corsa/${v.id}` : `/prenotazione/${v.id}`

function Carta({ v, passato }: { v: Viaggio; passato?: boolean }) {
  const guida = v.ruolo === 'conducente'
  return (
    <a href={dove(v)} className="corsa-carta carta-tocco"
      style={passato ? { opacity: .68 } : undefined}>
      <div className="fila-fra">
        <span className="corsa-quando">{quando(v.oraPartenza)}</span>
        {guida && v.postiLiberi !== undefined && !passato && (
          v.postiLiberi === 0
            ? <span className="pastiglia pastiglia-verde">piena</span>
            : <span className="pastiglia">{v.postiLiberi} {v.postiLiberi === 1 ? 'posto' : 'posti'}</span>
        )}
      </div>
      <div className="corsa-dove">{v.destinazioneLabel}</div>
      <div className="corsa-da">da {v.origineLabel}</div>
      <div className="corsa-piede">
        <span className="corsa-persone">
          {guida
            ? v.altri === 0 ? 'ancora nessuno' : `${v.altri} ${v.altri === 1 ? 'persona' : 'persone'} a bordo`
            : v.altri > 0 ? `con altre ${v.altri}` : 'ti porta qualcun altro'}
        </span>
        {v.importoCent !== null && (
          <span className="corsa-rientro">
            <span className="numero">{euro(v.importoCent)}</span>
            <span className="corsa-rientro-nota">{guida ? 'ti rientrano' : 'hai pagato'}</span>
          </span>
        )}
      </div>
    </a>
  )
}

function VuotoScheda({ ruolo }: { ruolo: Viaggio['ruolo'] }) {
  return (
    <div className="vuoto">
      <h2 className="t-sezione">
        {ruolo === 'conducente'
          ? 'Non hai ancora pubblicato niente'
          : 'Non hai ancora prenotato niente'}
      </h2>
      <p className="vuoto-testo" style={{ marginTop: 'var(--s3)' }}>
        {ruolo === 'conducente'
          ? 'Quando pubblichi un viaggio lo trovi qui, con chi ha prenotato e quanto ti rientra.'
          : 'Quando prenoti un passaggio lo trovi qui, con l’ora, il punto di ritrovo e chi guida.'}
      </p>
      <a href={ruolo === 'conducente' ? '/pubblica' : '/'} className="azione azione-piena"
        style={{ marginTop: 'var(--s5)' }}>
        {ruolo === 'conducente' ? 'Pubblica un viaggio' : 'Cerca un passaggio'}
        <SegnoAvanti />
      </a>
    </div>
  )
}

function Nessuno({ modo }: { modo: Modo }) {
  return (
    <>
      <div className="fascia testata">
        <div className="dentro dentro-app testata-dentro">
          <div>
            <p className="occhiello">{modo === 'conducente' ? 'Le corse che guidi' : 'I passaggi che hai preso'}</p>
            <h1 className="t-titolo testata-titolo" style={{ marginTop: 'var(--s3)' }}>
              I miei viaggi
            </h1>
            <p className="testata-sotto">
              Quelli a cui partecipi e quelli che hai pubblicato, tenuti
              separati: il ruolo cambia cosa puoi fare.
            </p>
          </div>
        </div>
      </div>

    <div className="fascia">
      <div className="dentro dentro-app viaggi-dentro">
        <div className="vuoto" style={{ marginTop: 'var(--s5)' }}>
          <h2 className="t-sezione">Ancora niente</h2>
          <p className="vuoto-testo" style={{ marginTop: 'var(--s3)' }}>
            Qui finiscono i viaggi che prenoti e quelli che pubblichi, tenuti
            separati. Quando ce n&apos;è uno, questa schermata ti dice cosa devi
            fare e quando.
          </p>
          <div className="azioni" style={{ marginTop: 'var(--s5)' }}>
            <a href="/" className="azione azione-piena">
              {modo === 'conducente' ? 'Vai alla tua area' : 'Cerca un passaggio'}
            </a>
            <a href={modo === 'conducente' ? '/pubblica' : '/posti'} className="azione azione-vuota">
              {modo === 'conducente' ? 'Pubblica un viaggio' : 'Guarda dove si va'}
            </a>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}
