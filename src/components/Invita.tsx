'use client'
import { useState } from 'react'

/**
 * Portare qualcuno.
 *
 * Un mercato a due lati non parte da solo: la prima persona che arriva non
 * trova nessuno e se ne va. Parte se chi c'è porta qualcuno — e porta
 * qualcuno che già conosce, perché la prima corsa la si fa volentieri con
 * un amico di un amico.
 *
 * Il collegamento si condivide dove quelle persone già parlano, non dentro
 * la nostra applicazione. E non promette niente a nessuno: un premio in
 * denaro per iscrizione trasformerebbe un rimborso spese in un guadagno,
 * che è la linea che questo prodotto non attraversa. Dirlo apertamente
 * costa una riga e vale più di uno sconto che non possiamo dare.
 */
export function Invita({ codice, portati, nome }: {
  codice: string; portati: number; nome: string
}) {
  const [copiato, setCopiato] = useState(false)

  async function condividi() {
    const link = `${window.location.origin}/invito-amico/${codice}`
    const testo = `Sto usando GO per dividere le spese dei viaggi in auto. Se ti serve un passaggio — o hai posti liberi — entra da qui: ${link}`
    if (navigator.share) {
      try { await navigator.share({ text: testo }); return } catch { /* annullata */ }
    }
    try {
      await navigator.clipboard.writeText(testo)
      setCopiato(true); setTimeout(() => setCopiato(false), 2200)
    } catch { /* resta il codice scritto qui sotto */ }
  }

  return (
    <div className="riquadro invita">
      <p className="t-blocco">Le prime corse nascono fra chi si conosce</p>
      <p className="t-corpo" style={{ marginTop: 'var(--s2)' }}>
        Manda GO a chi fa le tue stesse strade. Più siete, più è probabile che
        qualcuno stia già andando dove devi andare tu.
      </p>

      <div className="invita-codice">
        <span className="t-nota">Il tuo collegamento</span>
        <code>/invito-amico/{codice}</code>
      </div>

      <button type="button" className="azione azione-piena azione-piccola"
        style={{ width: '100%', marginTop: 'var(--s4)' }} onClick={condividi}>
        {copiato ? 'Copiato ✓' : 'Manda il collegamento'}
      </button>

      <p className="t-nota" style={{ marginTop: 'var(--s3)' }}>
        {portati === 0
          ? 'Non hai ancora portato nessuno.'
          : `Hai portato ${portati} ${portati === 1 ? 'persona' : 'persone'}.`}
        {' '}Nessun premio in denaro, né per te né per loro: su GO non si
        guadagna, si divide.
      </p>
    </div>
  )
}
