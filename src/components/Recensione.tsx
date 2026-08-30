'use client'
import { useState } from 'react'
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

const TAG_BENE = ['puntuale', 'guida tranquilla', 'simpatico', 'auto pulita', 'flessibile']
const TAG_MALE = ['in ritardo', 'guida spericolata', 'non si è presentato', 'scortese', 'aveva bevuto']

export function Recensione({ prenotazione, nome }: { prenotazione: string; nome: string }) {
  const [positiva, setPositiva] = useState<boolean | null>(null)
  const [tag, setTag] = useState<string[]>([])
  const [testo, setTesto] = useState('')
  const [inviata, setInviata] = useState(false)

  if (inviata) {
    return (
      <main style={{ maxWidth: 480, margin: '0 auto', padding: '60px 20px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>Grazie</h1>
        <p style={{ color: 'var(--inchiostro-2)', fontSize: 15 }}>
          {testo.trim()
            ? 'Il giudizio è già visibile. Il commento lo leggiamo prima di pubblicarlo.'
            : 'Aiuta chi prenoterà dopo di te.'}
        </p>
      </main>
    )
  }

  const disponibili = positiva === null ? [] : positiva ? TAG_BENE : TAG_MALE

  return (
    <main style={{ maxWidth: 480, margin: '0 auto', padding: '20px 20px 40px' }}>
      <h1 style={{ fontSize: 26, marginBottom: 22 }}>Com&apos;è andata con {nome}?</h1>

      <div style={{ display: 'flex', gap: 10, marginBottom: 22 }}>
        <Scelta attiva={positiva === true} onClick={() => { setPositiva(true); setTag([]) }}
          testo="Bene" tono="verde" />
        <Scelta attiva={positiva === false} onClick={() => { setPositiva(false); setTag([]) }}
          testo="Male" tono="rosso" />
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

          <Bottone onClick={async () => {
            await fetch('/api/recensioni', {
              method: 'POST', headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ prenotazione, positiva, tag, testo }),
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
