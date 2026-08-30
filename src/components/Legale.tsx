import type { ReactNode } from 'react'

/**
 * Impaginazione dei testi legali.
 *
 * Larghezza di lettura stretta, corpo grande, molto interlinea. Un
 * documento legale illeggibile non è più valido: è solo più facile da
 * contestare, e comunica che non volevamo fosse letto.
 */
export function Legale({ titolo, aggiornato, bozza, children }: {
  titolo: string
  aggiornato: string
  bozza?: boolean
  children: ReactNode
}) {
  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '32px 22px 80px' }}>
      <a href="/" style={{ fontSize: 14, textDecoration: 'none' }}>← GO</a>
      <h1 style={{ fontSize: 30, margin: '20px 0 6px' }}>{titolo}</h1>
      <p style={{ margin: 0, fontSize: 13.5, color: 'var(--tenue)' }}>
        Aggiornato il {aggiornato}
      </p>

      {bozza && (
        <div style={{
          margin: '22px 0 0', padding: '16px 18px',
          background: 'var(--rosso-velo)', borderRadius: 'var(--raggio)',
          fontSize: 14, lineHeight: 1.6, color: 'var(--inchiostro-2)',
        }}>
          <strong style={{ color: 'var(--rosso)' }}>Bozza di lavoro, non ancora in vigore.</strong>{' '}
          Questo testo è stato preparato per essere discusso con un avvocato:
          descrive fedelmente come funziona il prodotto, ma non è stato
          redatto né verificato da un professionista e non va pubblicato in
          questa forma.
        </div>
      )}

      <div style={{ fontSize: 16, lineHeight: 1.75, color: 'var(--inchiostro-2)' }}>
        {children}
      </div>
    </main>
  )
}

export function H2({ children }: { children: ReactNode }) {
  return <h2 style={{ fontSize: 20, margin: '34px 0 10px', color: 'var(--inchiostro)' }}>{children}</h2>
}
