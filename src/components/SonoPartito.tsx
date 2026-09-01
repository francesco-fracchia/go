'use client'
import { useState } from 'react'

/**
 * Il bottone che trasforma una previsione in un fatto.
 *
 * Sta accanto alla riga da cui si riparte, e non altrove: un comando
 * unico «sono partito» in fondo alla schermata costringerebbe a ricordare
 * da dove. Qui la domanda e la risposta sono sulla stessa riga.
 *
 * Dopo il tocco non si torna indietro e non si chiede conferma: chi lo
 * preme è in macchina, spesso col motore acceso, e una finestra di
 * conferma in quel momento è una cosa da chiudere, non da leggere.
 */
export function SonoPartito({ corsa, quale, testo }: {
  corsa: string
  /** «partenza», oppure l'identificativo della fermata da cui si riparte. */
  quale: string
  testo: string
}) {
  const [stato, setStato] = useState<'pronto' | 'invio' | 'fatto' | 'errore'>('pronto')

  if (stato === 'fatto') {
    return <span style={{ fontSize: 12.5, color: 'var(--tenue)' }}>fatto</span>
  }

  const vai = async () => {
    setStato('invio')
    const r = await fetch(`/api/corse/${corsa}/partito`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ quale }),
    })
    if (!r.ok) { setStato('errore'); return }
    setStato('fatto')
    // Le ore di tutti sono cambiate: si rilegge la schermata invece di
    // aggiornarne un pezzo e lasciare il resto com'era.
    window.location.reload()
  }

  return (
    <button type="button" onClick={vai} disabled={stato === 'invio'}
      className="etichetta-pronta" style={{ flexShrink: 0, fontSize: 12.5, padding: '5px 11px' }}>
      {stato === 'invio' ? '…' : stato === 'errore' ? 'riprova' : testo}
    </button>
  )
}
