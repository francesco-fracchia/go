/**
 * Il marchio.
 *
 * Ricostruito in vettoriale invece che ritagliato da un'immagine: è
 * geometria pura — due lettere fatte di archi e un rettangolo — quindi
 * resta nitido a ogni dimensione, pesa qualche centinaio di byte e cambia
 * colore da solo sul tema scuro. Un ritaglio raster avrebbe portato con sé
 * una risoluzione fissa, lo sfondo attaccato e i bordi morbidi.
 *
 * La G non è una G tipografica: è un anello con l'apertura tagliata in
 * diagonale e una barra che esce verso destra. È quella diagonale a
 * distinguerla da mille altre G geometriche, e va tenuta.
 *
 * La parola «GO» da sola non è registrabile: quello che si protegge è
 * questo segno. Per questo non esiste una versione a solo testo.
 */

export function Marchio({ dimensione = 34, variante = 'quadrato' }: {
  dimensione?: number
  /**
   * `quadrato` — il segno dentro il riquadro, per barre e icone.
   * `nudo` — le sole lettere, per quando c'è già una superficie sotto.
   */
  variante?: 'quadrato' | 'nudo'
}) {
  if (variante === 'nudo') {
    return (
      <svg width={dimensione * 1.82} height={dimensione} viewBox="0 0 219 120"
        role="img" aria-label="GO" style={{ display: 'block' }}>
        <Lettere colore="var(--accento)" />
      </svg>
    )
  }

  return (
    <svg width={dimensione} height={dimensione} viewBox="0 0 100 100"
      role="img" aria-label="GO" style={{ display: 'block', flexShrink: 0 }}>
      <rect x="0" y="0" width="100" height="100" rx="26" fill="var(--accento)" />
      <g transform="translate(11 28.6) scale(0.356)">
        <Lettere colore="var(--su-accento)" />
      </g>
    </svg>
  )
}

/**
 * Le due lettere, su una griglia 210×120.
 *
 * Sono disegnate come tratti spessi e non come forme piene: così lo
 * spessore è un numero solo, e la crenatura stretta — quasi si toccano —
 * resta quella voluta a ogni dimensione.
 */
function Lettere({ colore }: { colore: string }) {
  const s = 21   // spessore del tratto
  return (
    <g fill="none" stroke={colore} strokeWidth={s}>
      {/* G: anello aperto in diagonale sulla destra */}
      <path d="M 90.6 70.4 A 40 40 0 1 1 81.7 33.2" strokeLinecap="butt" />
      {/* la barra della G: parte dal centro e arriva al bordo esterno.
          È lei a chiudere il taglio, e la sua lunghezza è quello che
          distingue una G da una C con un trattino accanto. */}
      <path d="M 58 60 H 92" strokeLinecap="butt" />
      {/* O: anello chiuso */}
      <circle cx="158" cy="60" r="40" />
    </g>
  )
}
