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

export function Marchio({ dimensione = 34, variante = 'quadrato', id = 'go' }: {
  dimensione?: number
  /**
   * `quadrato` — il segno dentro il riquadro, per barre e icone.
   * `nudo` — le sole lettere, per quando c'è già una superficie sotto.
   */
  variante?: 'quadrato' | 'nudo'
  /**
   * Serve solo se due marchi nudi finiscono nella stessa pagina: la
   * sfumatura è un elemento con un identificativo, e due identici si
   * pestano i piedi.
   */
  id?: string
}) {
  if (variante === 'nudo') {
    const sfumatura = `${id}-sfumatura`
    return (
      <svg width={dimensione * 1.82} height={dimensione} viewBox="0 0 219 120"
        role="img" aria-label="GO" style={{ display: 'block' }}>
        <defs>
          {/* Violetto a sinistra, indaco a destra: la stessa direzione in
              cui si legge, e la stessa in cui si va. Vive solo qui, sul
              segno grande — a trenta pixel una sfumatura non si vede e
              costa un blocco di definizioni per niente. */}
          {/* `userSpaceOnUse`, e non è un dettaglio: è l'unica ragione per
              cui il marchio si legge.

              Per difetto una sfumatura usa `objectBoundingBox`, cioè le
              coordinate del riquadro di ciascun elemento. La traversa
              della G è una linea orizzontale: riquadro alto ZERO. Il
              montante è verticale: riquadro largo ZERO. Su un riquadro
              degenere quel sistema di coordinate non esiste, e per
              specifica il browser NON DISEGNA l'elemento — senza errori,
              senza avvisi.

              Risultato: l'arco si vedeva, i due tratti che lo rendono una
              G sparivano, e il marchio leggeva «CO». Erano lì, del colore
              giusto, con l'opacità giusta. Lo spazio utente ha coordinate
              vere anche per una riga dritta. */}
          <linearGradient id={sfumatura} gradientUnits="userSpaceOnUse"
            x1="12" y1="0" x2="206" y2="0">
            <stop offset="0" stopColor="var(--marchio-a)" />
            <stop offset="1" stopColor="var(--marchio-b)" />
          </linearGradient>
        </defs>
        <Lettere colore={`url(#${sfumatura})`} />
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
 * Il marchio con il claim sotto: il blocco che si usa quando GO si presenta
 * come marca — l'ingresso, il piede — e non come etichetta di chi ospita la
 * pagina.
 *
 * Il punto finale è dell'accento e il resto è inchiostro. È un dettaglio da
 * mezzo carattere, ed è quello che distingue una firma da una didascalia:
 * la frase finisce, e il colore dice di chi è.
 */
export function MarchioEsteso({ dimensione = 40, id = 'go', scuro }: {
  dimensione?: number; id?: string
  /** su fondo d'inchiostro: il claim diventa chiaro, il punto resta acceso */
  scuro?: boolean
}) {
  return (
    <div className={scuro ? 'lockup lockup-scuro' : 'lockup'}>
      <Marchio variante="nudo" dimensione={dimensione} id={id} />
      <p className="lockup-claim">
        Se vai comunque, vai insieme<em className="lockup-punto">.</em>
      </p>
    </div>
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
      {/* G: anello aperto in diagonale sulla destra.
          L'anello riprende a 12°, non a quindici: il taglio è radiale, e
          perché sparisca sotto la barra il suo punto più esterno deve
          cadere esattamente sul bordo inferiore della barra. Tre gradi più
          in là lasciavano una scheggia bianca fra le due forme — invisibile
          in barra, evidente su un volantino. */}
      <path d="M 91.1 68.3 A 40 40 0 1 1 81.7 33.2" strokeLinecap="butt" />
      {/* la barra della G: parte dal centro e arriva A FILO del bordo
          esterno — 102.5 è il raggio esterno, non 92. È lei a chiudere il
          taglio, e la sua lunghezza è quello che distingue una G da una C
          con un trattino accanto: ferma dentro l'anello si legge come un
          nodo, portata fuori diventa la barra della G. */}
      <path d="M 58 60 H 102.5" strokeLinecap="butt" />
      {/* Il montante: la barra scende e incontra l'anello.
          Senza, a trenta pixel la barra si perdeva dentro il tratto e il
          segno si leggeva «CO» — che è il modo peggiore in cui un marchio
          può sbagliare, perché non sembra brutto: sembra un'altra parola.
          È il montante che in ogni G geometrica — Futura, Circular — toglie
          l'equivoco, e costa un tratto. */}
      <path d="M 92 60 V 84" strokeLinecap="butt" />
      {/* O: anello chiuso.
          Il vuoto fra le due lettere è il 13% della loro larghezza. Prima
          era il 4: si toccavano quasi, e a dimensione piccola la G e la O
          si leggevano come un segno solo invece che come due lettere. */}
      <circle cx="166" cy="60" r="40" />
    </g>
  )
}
