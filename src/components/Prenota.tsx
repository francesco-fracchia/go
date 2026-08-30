'use client'
import { useState } from 'react'
import { Bottone, euro } from './base.tsx'
import { Carta, MetodoSalvato } from './Carta.tsx'

/**
 * Prenotare.
 *
 * La carta si chiede QUI, non alla registrazione: l'utente ha già scelto la
 * corsa, sa quanto costa e sa perché gliela stiamo chiedendo. Chiederla
 * prima, a chi sta ancora guardando, significa perderlo su un modulo di
 * pagamento per un servizio che non ha ancora capito.
 *
 * Il pannello si apre dal basso e mostra sempre il totale in cima: mentre si
 * digita una carta si deve poter rileggere quanto si sta per spendere senza
 * chiudere niente.
 */

export interface Metodo { marchio: string; ultime4: string | null }

export function Prenota({ corsa, totaleCent, nomeConducente, metodoIniziale, prenotaImmediata, kmDeviazione, fermataPronta }: {
  corsa: string
  totaleCent: number
  nomeConducente: string
  metodoIniziale: Metodo | null
  prenotaImmediata: boolean
  kmDeviazione: number
  fermataPronta: boolean
}) {
  const [aperto, setAperto] = useState(false)
  const [metodo, setMetodo] = useState<Metodo | null>(metodoIniziale)
  const [cambia, setCambia] = useState(false)
  const [invio, setInvio] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  const etichetta = fermataPronta
    ? (prenotaImmediata ? 'Prenota' : 'Chiedi di salire')
    : 'Proponi di passare da te'

  async function conferma() {
    setInvio(true); setErrore(null)
    const r = await fetch('/api/prenotazioni', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ corsaId: corsa, kmDeviazione: fermataPronta ? 0 : kmDeviazione }),
    })
    const d = await r.json()
    if (!r.ok) { setErrore(d.errore ?? 'Non è andata'); setInvio(false); return }
    window.location.href = `/prenotazione/${d.prenotazione}`
  }

  if (!aperto) {
    return <Bottone onClick={() => setAperto(true)}>{etichetta}</Bottone>
  }

  const serveCarta = !metodo || cambia

  return (
    <>
      <div
        onClick={() => !invio && setAperto(false)}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.42)', zIndex: 40,
        }}
      />
      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 41,
        background: 'var(--carta)', borderRadius: '20px 20px 0 0',
        padding: '10px 20px calc(24px + env(safe-area-inset-bottom))',
        maxHeight: '88dvh', overflowY: 'auto', boxShadow: 'var(--ombra-alta)',
      }}>
        <div style={{
          width: 40, height: 4, borderRadius: 2, background: 'var(--riga)',
          margin: '0 auto 18px',
        }} />

        {/* Il totale resta visibile mentre si digita la carta. */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          paddingBottom: 16, borderBottom: '1px solid var(--riga-2)', marginBottom: 18,
        }}>
          <span style={{ fontSize: 15, color: 'var(--inchiostro-2)' }}>
            {prenotaImmediata && fermataPronta ? 'Paghi' : 'Pagherai se accetta'}
          </span>
          <span style={{
            fontFamily: 'var(--titoli)', fontWeight: 700, fontSize: 26,
            letterSpacing: '-.02em',
          }}>{euro(totaleCent)}</span>
        </div>

        {serveCarta ? (
          <>
            <p style={{ margin: '0 0 16px', fontSize: 14.5, color: 'var(--inchiostro-2)', lineHeight: 1.55 }}>
              Serve una carta per bloccare l&apos;importo. Non addebitiamo
              niente adesso.
            </p>
            <Carta suSalvata={(m) => { setMetodo(m); setCambia(false) }} />
          </>
        ) : (
          <>
            <MetodoSalvato marchio={metodo!.marchio} ultime4={metodo!.ultime4}
              suCambia={() => setCambia(true)} />

            <p style={{ margin: '16px 0', fontSize: 13.5, color: 'var(--tenue)', lineHeight: 1.55 }}>
              {prenotaImmediata && fermataPronta
                ? `Blocchiamo ${euro(totaleCent)} sulla carta e li scaliamo alla partenza. Se la macchina si riempie paghi meno.`
                : `${nomeConducente} deve accettare. Finché non risponde non ti addebitiamo niente e il posto resta prenotabile da altri.`}
            </p>

            {errore && (
              <p style={{ color: 'var(--rosso)', fontSize: 14, marginBottom: 14 }}>{errore}</p>
            )}

            <Bottone disabled={invio} onClick={conferma}>
              {invio ? 'Un attimo…' : etichetta}
            </Bottone>
          </>
        )}
      </div>
    </>
  )
}
