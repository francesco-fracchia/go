'use client'
import { useState } from 'react'

/**
 * «Ti mando il link.»
 *
 * Sta sulla schermata di chi ha prenotato, sopra la disdetta, perché il
 * momento in cui serve è quello in cui si sta per uscire — non un menù di
 * impostazioni che nessuno apre alle undici di sera.
 *
 * Il testo che si copia è già scritto per intero, destinatario compreso:
 * chi lo manda alle due di notte, con una mano sola, non deve comporre una
 * frase. Deve premere e incollare.
 */
export function Scorta({ prenotazione, destinazione }: {
  prenotazione: string
  destinazione: string
}) {
  const [attesa, setAttesa] = useState(false)
  const [fatto, setFatto] = useState(false)

  async function manda() {
    setAttesa(true)
    try {
      const r = await fetch('/api/scorta', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ prenotazione }),
      })
      if (!r.ok) return
      const { percorso } = await r.json()
      const collegamento = `${window.location.origin}${percorso}`
      const testo = `Sto andando a ${destinazione}. Qui vedi con chi sono, `
        + `che macchina è e dove sono adesso: ${collegamento}`

      if (navigator.share) {
        try { await navigator.share({ text: testo }); setFatto(true); return } catch { /* annullata */ }
      }
      await navigator.clipboard.writeText(testo)
      setFatto(true)
    } finally { setAttesa(false) }
  }

  return (
    <div className="scorta-invito">
      <button type="button" className="azione azione-vuota" style={{ width: '100%' }}
        aria-disabled={attesa} onClick={manda}>
        {attesa ? 'Un attimo…' : fatto ? 'Copiato — mandalo a chi vuoi' : 'Fai seguire il viaggio a qualcuno'}
      </button>
      <p className="t-nota" style={{ marginTop: 'var(--s3)' }}>
        Chi lo riceve vede con chi sei, che macchina è, la targa e dove sei
        adesso. Non deve avere GO, e il collegamento smette di funzionare
        dodici ore dopo l&apos;arrivo.
      </p>
    </div>
  )
}
