'use client'
import { useState } from 'react'
import { Bottone, Etichetta, euro } from './base.tsx'

/**
 * Dividere le spese come vuole il gruppo.
 *
 * Solo sulle corse private, e con una regola sola imposta dal motore:
 * si RIDISTRIBUISCE, non si aggiunge. Il totale non può superare il tetto,
 * che è quello che i passeggeri versano quando dividono in parti uguali.
 * Quello che resta fuori è la parte di chi guida, e la paga sempre.
 *
 * Serve ai casi veri di un gruppo di amici: chi scende a metà strada, chi
 * ha insistito per la deviazione, chi questo mese è a secco.
 *
 * Non esiste una mancia, e non è una dimenticanza: denaro a chi guida oltre
 * il costo del viaggio è profitto, e il profitto è la sola cosa che
 * renderebbe questo un trasporto a pagamento. Chi vuole dare di più si
 * prende una fetta più grande del costo vero — fino al tetto, e non oltre.
 */

export function QuotePersonalizzate({ corsa, tettoCent, passeggeri }: {
  corsa: string
  tettoCent: number
  passeggeri: Array<{ id: string; nome: string; quotaCent: number }>
}) {
  const [aperto, setAperto] = useState(false)
  const [quote, setQuote] = useState<Record<string, number>>(
    Object.fromEntries(passeggeri.map((p) => [p.id, p.quotaCent])),
  )
  const [salvato, setSalvato] = useState(false)
  const [invio, setInvio] = useState(false)

  const totale = Object.values(quote).reduce((s, q) => s + q, 0)
  const avanzo = tettoCent - totale
  const troppo = avanzo < 0

  if (!aperto) {
    return (
      <button onClick={() => setAperto(true)} style={{
        width: '100%', textAlign: 'left', padding: '14px 16px',
        borderRadius: 'var(--raggio)', border: '1px dashed var(--riga)',
        background: 'transparent', color: 'var(--inchiostro)',
      }}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>Dividere diversamente</div>
        <div style={{ fontSize: 13, color: 'var(--tenue)', marginTop: 2, lineHeight: 1.45 }}>
          Chi scende prima, chi è a secco, chi ha chiesto la deviazione.
        </div>
      </button>
    )
  }

  return (
    <div style={{
      border: '1px solid var(--riga)', borderRadius: 'var(--raggio)',
      background: 'var(--superficie)', padding: '18px 20px',
    }}>
      <Etichetta>chi mette quanto</Etichetta>

      <div style={{ margin: '14px 0' }}>
        {passeggeri.map((p) => (
          <div key={p.id} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '11px 0', borderBottom: '1px solid var(--riga-2)',
          }}>
            <span style={{ flexGrow: 1, fontSize: 15.5 }}>{p.nome}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input
                type="number" inputMode="decimal" step="0.10" min="0"
                value={(quote[p.id]! / 100).toFixed(2)}
                onChange={(e) => setQuote((q) => ({
                  ...q, [p.id]: Math.max(0, Math.round(Number(e.target.value) * 100)),
                }))}
                style={{
                  width: 78, padding: '9px 10px', fontSize: 16, textAlign: 'right',
                  fontFamily: 'var(--mono)', borderRadius: 'var(--raggio-s)',
                  border: '1px solid var(--riga)', background: 'var(--carta)',
                  color: 'var(--inchiostro)', outline: 'none',
                }}
              />
              <span style={{ color: 'var(--tenue)', fontSize: 15 }}>€</span>
            </div>
          </div>
        ))}
      </div>

      {/* L'avanzo è la parte in più che resta a chi guida. Mostrarlo mentre
          si digita è quello che rende comprensibile il vincolo, invece di
          farlo scoprire premendo Salva. */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        padding: '12px 14px', borderRadius: 'var(--raggio-s)',
        background: troppo ? 'var(--rosso-velo)' : 'var(--superficie-2)',
        marginBottom: 14,
      }}>
        <span style={{ fontSize: 14, color: troppo ? 'var(--rosso)' : 'var(--inchiostro-2)' }}>
          {troppo
            ? `${euro(-avanzo)} di troppo`
            : avanzo === 0 ? 'Coperto tutto il dividibile' : `Restano ${euro(avanzo)} a chi guida`}
        </span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 14, color: 'var(--tenue)' }}>
          max {euro(tettoCent)}
        </span>
      </div>

      {troppo && (
        <p style={{ fontSize: 13, color: 'var(--tenue)', margin: '0 0 14px', lineHeight: 1.55 }}>
          Si può ridistribuire fra voi, non aggiungere: oltre questa cifra chi
          guida rientrerebbe di più di quanto spende, e smetterebbe di essere
          una condivisione di spese.
        </p>
      )}

      {salvato && (
        <p style={{ fontSize: 14, color: 'var(--verde)', margin: '0 0 14px' }}>
          Salvato. Le nuove quote valgono dal prossimo addebito.
        </p>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <Bottone variante="contorno" style={{ flex: 1 }} onClick={() => setAperto(false)}>
          Chiudi
        </Bottone>
        <Bottone
          style={{ flex: 1 }}
          disabled={troppo || invio}
          onClick={async () => {
            setInvio(true)
            const r = await fetch(`/api/corse/${corsa}/quote`, {
              method: 'POST', headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ quote }),
            })
            setInvio(false)
            if (r.ok) { setSalvato(true); setTimeout(() => window.location.reload(), 1200) }
          }}
        >{invio ? '…' : 'Salva'}</Bottone>
      </div>
    </div>
  )
}
