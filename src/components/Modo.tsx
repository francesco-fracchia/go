'use client'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import type { Modo } from '../server/modo.ts'

/**
 * L'interruttore fra le due modalità.
 *
 * È il controllo più importante dell'applicazione e sta accanto al marchio,
 * perché è lì che si guarda per capire dove si è. Due segmenti, non un
 * menu: il cambio deve costare un tocco, altrimenti chi guida e cerca nella
 * stessa serata smette di cambiare e usa quella sbagliata.
 *
 * Il biscotto si scrive prima di navigare, così la pagina che arriva è già
 * quella giusta: scriverlo dopo farebbe comparire per un istante la barra
 * della modalità che si sta lasciando.
 */
/**
 * Le schermate che hanno senso in tutt'e due le vesti: lì cambiare modalità
 * vuol dire ridisegnare quello che si sta guardando. Altrove — la
 * pubblicazione, il dettaglio di una corsa — vuol dire che si è finito di
 * fare una cosa e si comincia l'altra, e la risposta giusta è la casa
 * dell'altra modalità: restare su un modulo di pubblicazione dopo aver
 * detto «cerco un posto» sarebbe l'applicazione che non ti ha ascoltato.
 */
const AMBEDUE = ['/', '/viaggi', '/profilo', '/posti', '/impostazioni', '/conto']

export function Interruttore({ modo }: { modo: Modo }) {
  const router = useRouter()
  const percorso = usePathname()
  const [ottimista, setOttimista] = useState(modo)
  const [, avvia] = useTransition()

  function cambia(m: Modo) {
    /**
     * Anche toccando il segmento già acceso si riscrive il biscotto.
     *
     * Alcune schermate esistono solo da un lato del mercato e si vestono di
     * quel lato a prescindere da come si era entrati: la pubblicazione è
     * sempre da conducente, i risultati sempre da passeggero. Lì
     * l'interruttore mostra la modalità della pagina, che può non essere
     * quella ricordata — e senza questa riconciliazione uno toccherebbe
     * «Cerco» già acceso, non succederebbe nulla, e alla schermata dopo si
     * ritroverebbe di nuovo da conducente.
     */
    if (m === ottimista && m === modo) return
    setOttimista(m)
    document.cookie = `modo=${m}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
    avvia(() => {
      if (AMBEDUE.includes(percorso ?? '/')) router.refresh()
      else router.push('/')
    })
  }

  return (
    <div className="modo" role="group" aria-label="Come stai usando GO">
      <button type="button" className="modo-voce"
        aria-pressed={ottimista === 'passeggero'}
        onClick={() => cambia('passeggero')}>
        <span className="modo-lungo">Cerco un posto</span>
        <span className="modo-corto">Cerco</span>
      </button>
      <button type="button" className="modo-voce"
        aria-pressed={ottimista === 'conducente'}
        onClick={() => cambia('conducente')}>
        <span className="modo-lungo">Offro un posto</span>
        <span className="modo-corto">Offro</span>
      </button>
    </div>
  )
}
