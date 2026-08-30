'use client'
import { useState } from 'react'

/**
 * Dopo l'arrivo.
 *
 * Il testo è costruito perché rispondere NON sia necessario. Chi arriva
 * alle quattro del mattino non compila un sondaggio: se pretendessimo una
 * conferma attiva non la riceveremmo, e poi non sapremmo se il silenzio
 * significa «tutto bene» o «non ho letto il telefono».
 *
 * Quindi si dice la cosa vera — non devi fare niente — e si lascia una
 * porta sola, per quando serve davvero.
 */
export function EsitoViaggio({ prenotazione, conducente, sbloccoIl }: {
  prenotazione: string
  conducente: string
  sbloccoIl: string
}) {
  const [stato, setStato] = useState<'chiuso' | 'aperto' | 'inviato'>('chiuso')
  const [nota, setNota] = useState('')

  if (stato === 'inviato') {
    return (
      <div style={{
        background: 'var(--rosso-velo)', borderRadius: 'var(--raggio)',
        padding: '16px 18px', fontSize: 14, color: 'var(--inchiostro-2)', lineHeight: 1.5,
      }}>
        Segnalato. Abbiamo fermato il pagamento e ti scriviamo entro un giorno.
      </div>
    )
  }

  return (
    <div style={{
      background: 'var(--superficie)', border: '1px solid var(--riga)',
      borderRadius: 'var(--raggio)', padding: '18px 20px',
    }}>
      <div style={{ fontSize: 17, fontWeight: 600, fontFamily: 'var(--titoli)' }}>
        Non devi fare niente
      </div>
      <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--inchiostro-2)', lineHeight: 1.55 }}>
        {sbloccoIl} {conducente} riceve la sua parte delle spese. Se qualcosa
        è andato storto, però, dillo adesso.
      </p>

      {stato === 'chiuso' ? (
        <button
          onClick={() => setStato('aperto')}
          style={{
            background: 'none', border: 'none', color: 'var(--rosso)',
            fontSize: 14, fontWeight: 600, padding: '14px 0 2px', textAlign: 'left',
          }}
        >
          È andata male
        </button>
      ) : (
        <div style={{ marginTop: 14 }}>
          <textarea
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Non si è presentato, ha guidato in modo pericoloso, aveva bevuto…"
            rows={3}
            style={{
              width: '100%', padding: 12, fontSize: 15, fontFamily: 'var(--testo)',
              borderRadius: 'var(--raggio-s)', border: '1px solid var(--riga)',
              background: 'var(--carta)', color: 'var(--inchiostro)', resize: 'vertical',
            }}
          />
          <button
            className="tocco"
            disabled={nota.trim().length < 3}
            onClick={async () => {
              await fetch('/api/esito', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ prenotazione, nota }),
              })
              setStato('inviato')
            }}
            style={{
              width: '100%', marginTop: 10, borderRadius: 'var(--raggio-s)',
              padding: '12px', fontWeight: 600, border: '1px solid transparent',
              background: nota.trim().length < 3 ? 'var(--superficie-2)' : 'var(--rosso)',
              color: nota.trim().length < 3 ? 'var(--tenue)' : '#fff',
            }}
          >
            Segnala e ferma il pagamento
          </button>
        </div>
      )}
    </div>
  )
}
