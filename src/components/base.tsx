import type { CSSProperties, ReactNode } from 'react'

export function Riquadro({ children, stile, tono = 'neutro' }: {
  children: ReactNode
  stile?: CSSProperties
  tono?: 'neutro' | 'accento' | 'verde' | 'rosso'
}) {
  const toni = {
    neutro: { background: 'var(--carta)', border: '1px solid var(--riga)' },
    accento: { background: 'var(--accento-velo)', border: '1px solid var(--accento-riga)' },
    verde: { background: 'var(--verde-velo)', border: '1px solid transparent' },
    rosso: { background: 'var(--rosso-velo)', border: '1px solid transparent' },
  }[tono]
  return (
    <div style={{ borderRadius: 'var(--r-l)', padding: 'var(--s5)', ...toni, ...stile }}>
      {children}
    </div>
  )
}

export function Bottone({ children, variante = 'pieno', ...resto }: {
  children: ReactNode
  variante?: 'pieno' | 'contorno' | 'nudo' | 'pericolo'
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const varianti: Record<string, CSSProperties> = {
    pieno: { background: 'var(--accento)', color: 'var(--su-accento)', border: '1px solid transparent' },
    contorno: { background: 'var(--superficie)', color: 'var(--inchiostro)', border: '1px solid var(--riga)' },
    nudo: { background: 'transparent', color: 'var(--accento)', border: '1px solid transparent' },
    pericolo: { background: 'var(--rosso-velo)', color: 'var(--rosso)', border: '1px solid transparent' },
  }
  return (
    <button
      {...resto}
      className="tocco"
      style={{
        width: '100%', borderRadius: 999, padding: '14px 22px',
        fontWeight: 600, fontSize: 16, letterSpacing: '-.012em',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        transition: 'transform .12s ease, background .16s ease',
        ...varianti[variante], ...resto.style,
      }}
    >
      {children}
    </button>
  )
}

export function Etichetta({ children, tono = 'tenue' }: { children: ReactNode; tono?: 'tenue' | 'verde' | 'accento' }) {
  const colori = { tenue: 'var(--tenue)', verde: 'var(--verde)', accento: 'var(--accento)' }
  return (
    <span style={{
      fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.09em',
      textTransform: 'uppercase', color: colori[tono],
    }}>{children}</span>
  )
}

/** Importi sempre con la stessa formattazione, ovunque. */
export const euro = (centesimi: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(centesimi / 100)
