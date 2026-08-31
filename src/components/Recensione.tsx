'use client'
import { useState } from 'react'
import { SegnoAvanti } from './segni.tsx'
import { FATTI, DESCRITTORI, type Ruolo } from '../lib/recensione.ts'
import { Bottone, Etichetta } from './base.tsx'

/**
 * Lasciare una recensione.
 *
 * Niente stelle. «È andata bene» oppure «c'è stato un problema», e basta.
 * Una media su venti viaggi non distingue il conducente pessimo da quello
 * che una volta è arrivato tardi, e spinge tutti verso il quattro e mezzo:
 * i distintivi ricavati dai fatti — «non annulla mai» — dicono molto di più.
 *
 * Il testo è facoltativo e passa dalla moderazione. Su un prodotto dove si
 * sale in macchina con sconosciuti di notte, una diffamazione pubblicata
 * anche solo per due ore è un danno che non si ripara.
 */

export function Recensione({ prenotazione, nome, ruolo }: {
  prenotazione: string
  nome: string
  /** Chi sto recensendo: chi guidava, o chi è salito. Le domande cambiano. */
  ruolo: Ruolo
}) {
  const [positiva, setPositiva] = useState<boolean | null>(null)
  const [tag, setTag] = useState<string[]>([])
  const [descrittori, setDescrittori] = useState<string[]>([])
  const [testo, setTesto] = useState('')
  const [inviata, setInviata] = useState(false)

  if (inviata) {
    return (
      <main style={{ maxWidth: 'var(--colonna)', margin: '0 auto', padding: '60px 20px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>Grazie</h1>
        {/* La conferma diceva «il giudizio è già visibile», e con il doppio
            cieco non è più vero: non si vede finché non scrive anche
            l'altro. Una conferma che descrive un comportamento che non c'è
            più è peggio di nessuna conferma. */}
        <p style={{ color: 'var(--inchiostro-2)', fontSize: 15, lineHeight: 1.55 }}>
          Non si vede ancora: comparirà quando avrà scritto anche l&apos;altra
          persona, o fra due settimane. Nessuno dei due può rispondere a quello
          che ha letto.
          {testo.trim() && ' Il commento lo leggiamo prima di pubblicarlo.'}
        </p>
      </main>
    )
  }

  const disponibili = positiva === null ? []
    : FATTI[ruolo].map((f) => positiva ? f.si : f.no)

  return (
    <main className="schermo-stretto">
      {/* La domanda che si fa a un amico, non a un modulo. E una sola
          domanda di sintesi: niente stelle. Una media a cinque stelle su
          una piattaforma di passaggi converge a 4,8 e smette di dire
          qualsiasi cosa. */}
      <h1 style={{ fontSize: 26, marginBottom: 8 }}>Com&apos;è andato il viaggio?</h1>
      <p className="t-guida" style={{ marginBottom: 22 }}>
        Con {nome}. Nessuno vede la tua finché non ha scritto anche
        {ruolo === 'conducente' ? ' chi guidava' : ' chi è salito'}.
      </p>

      <Etichetta>rifaresti un viaggio con {nome}</Etichetta>
      <div style={{ display: 'flex', gap: 10, margin: '10px 0 22px' }}>
        <Scelta attiva={positiva === true} onClick={() => { setPositiva(true); setTag([]) }}
          testo="Sì" tono="verde" />
        <Scelta attiva={positiva === false} onClick={() => { setPositiva(false); setTag([]) }}
          testo="No" tono="rosso" />
      </div>

      {positiva !== null && (
        <>
          <Etichetta>cosa in particolare</Etichetta>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '10px 0 22px' }}>
            {disponibili.map((t) => {
              const scelto = tag.includes(t)
              return (
                <button key={t}
                  onClick={() => setTag((v) => scelto ? v.filter((x) => x !== t) : [...v, t])}
                  style={{
                    fontSize: 14, padding: '9px 14px', borderRadius: 999,
                    border: `1px solid ${scelto ? 'transparent' : 'var(--riga)'}`,
                    background: scelto ? 'var(--accento)' : 'var(--superficie)',
                    color: scelto ? 'var(--su-accento)' : 'var(--inchiostro)',
                  }}>{t}</button>
              )
            })}
          </div>

          {/* Né bene né male: come è andata. */}
          <Etichetta>com&apos;era il viaggio</Etichetta>
          <div style={{ margin: '10px 0 22px', display: 'grid', gap: 12 }}>
            {DESCRITTORI.map((gruppo) => (
              <div key={gruppo.nome}>
                <div style={{ fontSize: 12.5, color: 'var(--tenue)', marginBottom: 6 }}>
                  {gruppo.nome}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {gruppo.voci.map(({ v, segno }) => {
                    const preso = descrittori.includes(v)
                    const altre = gruppo.voci.map((x) => x.v)
                    return (
                      <button key={v} type="button"
                        onClick={() => setDescrittori((d) => preso
                          // Uno per gruppo: sono alternative, non un elenco.
                          ? d.filter((x) => x !== v)
                          : [...d.filter((x) => !altre.includes(x)), v])}
                        style={{
                          fontSize: 14, padding: '9px 14px', borderRadius: 999,
                          border: `1px solid ${preso ? 'var(--inchiostro)' : 'var(--riga)'}`,
                          background: preso ? 'var(--superficie-2)' : 'var(--superficie)',
                          color: 'var(--inchiostro)',
                        }}>{segno} {v}</button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          <Etichetta>vuoi aggiungere qualcosa</Etichetta>
          <textarea
            value={testo} onChange={(e) => setTesto(e.target.value)}
            placeholder="Facoltativo"
            rows={3}
            style={{
              width: '100%', marginTop: 10, padding: 13, fontSize: 15,
              fontFamily: 'var(--testo)', borderRadius: 'var(--raggio-s)',
              border: '1px solid var(--riga)', background: 'var(--superficie)',
              color: 'var(--inchiostro)', resize: 'vertical',
            }}
          />
          <p style={{ fontSize: 12.5, color: 'var(--tenue)', margin: '8px 0 20px', lineHeight: 1.5 }}>
            Il commento lo leggiamo prima di pubblicarlo. Il giudizio, invece,
            vale subito.
          </p>

          {/* La strada per le cose gravi è visibile ma separata, e lo dice
              anche nel modo in cui è scritta: non è un'etichetta in più, è
              un altro posto dove si va. */}
          <a href={`/segnala/${prenotazione}`} className="verso-segnalazione">
            <span className="cresci">
              <span className="verso-forte">È successo qualcosa di grave?</span>
              <span className="verso-debole">
                Ha bevuto, guidava in modo pericoloso, si è comportato male.
                Non è una recensione: la leggiamo noi, e può sospendere un account.
              </span>
            </span>
            <SegnoAvanti dimensione={16} />
          </a>

          <Bottone onClick={async () => {
            await fetch('/api/recensioni', {
              method: 'POST', headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ prenotazione, positiva, tag, descrittori, testo }),
            })
            setInviata(true)
          }}>Invia</Bottone>
        </>
      )}
    </main>
  )
}

function Scelta({ attiva, onClick, testo, tono }: {
  attiva: boolean; onClick: () => void; testo: string; tono: 'verde' | 'rosso'
}) {
  const colore = tono === 'verde' ? 'var(--verde)' : 'var(--rosso)'
  const velo = tono === 'verde' ? 'var(--verde-velo)' : 'var(--rosso-velo)'
  return (
    <button onClick={onClick} className="tocco" style={{
      flex: 1, padding: '18px 12px', borderRadius: 'var(--raggio)',
      border: `1px solid ${attiva ? colore : 'var(--riga)'}`,
      background: attiva ? velo : 'var(--superficie)',
      color: attiva ? colore : 'var(--inchiostro)',
      fontWeight: 600, fontSize: 17, fontFamily: 'var(--titoli)',
    }}>{testo}</button>
  )
}
