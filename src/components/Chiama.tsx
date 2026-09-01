'use client'
import { useEffect, useState } from 'react'

/**
 * Chiamare, senza scambiarsi il numero.
 *
 * Compare SOLO nella finestra in cui serve — mezz'ora prima della partenza
 * e durante il viaggio — perché un pulsante «chiama» sempre visibile
 * insegna a premerlo quando non funziona, e la seconda volta che una cosa
 * non funziona non la si prova più.
 *
 * Entrambi vedono un numero della piattaforma: il numero vero non passa mai
 * di qui. È anche la ragione per cui qualcuno accetta di salire in macchina
 * con uno sconosciuto — non gli lascia il proprio numero.
 */
export function Chiama({ corsa, chi, stretto }: {
  corsa: string; chi: string
  /** accanto a «Scrivi», senza la nota sotto */
  stretto?: boolean
}) {
  const [numero, setNumero] = useState<string | null>(null)

  useEffect(() => {
    let vivo = true
    void fetch(`/api/chiamate/numero?corsa=${encodeURIComponent(corsa)}`)
      .then((r) => r.json())
      .then((d) => { if (vivo && d.disponibile) setNumero(d.numero) })
      .catch(() => { /* si resta senza pulsante, che è meglio di uno rotto */ })
    return () => { vivo = false }
  }, [corsa])

  if (!numero) return null

  if (stretto) {
    return (
      <a href={`tel:${numero}`} className="azione azione-vuota" style={{ flex: 1 }}>
        Chiama
      </a>
    )
  }

  return (
    <div className="chiama">
      <a href={`tel:${numero}`} className="azione azione-vuota" style={{ width: '100%' }}>
        Chiama {chi}
      </a>
      <p className="t-nota" style={{ marginTop: 'var(--s2)' }}>
        Passa da un numero di GO: il tuo resta tuo, e il suo resta suo.
      </p>
    </div>
  )
}
