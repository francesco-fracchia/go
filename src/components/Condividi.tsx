'use client'
import { useState } from 'react'

/**
 * Mandare la corsa a qualcuno.
 *
 * Su una corsa privata il collegamento È la modalità: non c'è nessuna
 * rubrica da riempire né inviti da mandare uno a uno. Su una corsa pubblica
 * serve a un'altra cosa — riempire i posti che restano — e quella è l'unica
 * leva che chi guida ha in mano, perché nel primo anno la maggior parte
 * delle corse parte mezza vuota.
 *
 * In tutt'e due i casi si copia e si incolla nel gruppo dove quelle persone
 * già parlano: è lì che si organizzano le serate, non dentro la nostra
 * applicazione.
 *
 * Prima, sulle corse pubbliche, c'era un pulsante che diceva «manda il link
 * a chi ci va» e non faceva niente: nessun gestore, nessun collegamento.
 * Un comando che non risponde insegna a non fidarsi degli altri comandi.
 */
export function Condividi({ percorso, destinazione, orario, privata, sotto }: {
  /** l'indirizzo da mandare, relativo: `/invito/xyz` oppure `/corsa/id` */
  percorso: string
  destinazione: string
  orario: string
  privata?: boolean
  /** la riga sotto al titolo: cambia con il perché si sta condividendo */
  sotto: string
}) {
  const [copiato, setCopiato] = useState(false)

  async function condividi() {
    const collegamento = `${window.location.origin}${percorso}`
    const testo = `Vado a ${destinazione} alle ${orario}, ho posto. Prenota qui: ${collegamento}`

    // La condivisione di sistema apre WhatsApp, Telegram e i messaggi con un
    // tocco. Dove non c'è — o se la si annulla — si copia e basta.
    if (navigator.share) {
      try { await navigator.share({ text: testo }); return } catch { /* annullata */ }
    }
    try {
      await navigator.clipboard.writeText(testo)
      setCopiato(true)
      setTimeout(() => setCopiato(false), 2200)
    } catch { /* niente appunti: resta il collegamento nella barra */ }
  }

  return (
    <div className="condividi">
      <p className="occhiello">{privata ? 'corsa privata' : 'posti liberi'}</p>
      <p className="condividi-testo">{sotto}</p>
      <button type="button" className="azione azione-piena azione-piccola"
        style={{ width: '100%' }} onClick={condividi}>
        {copiato ? 'Copiato ✓' : 'Manda il link'}
      </button>
    </div>
  )
}
