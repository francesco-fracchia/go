/**
 * I segni.
 *
 * Un solo insieme, disegnato sulla stessa griglia del marchio: tratto 1.7,
 * estremità tonde, 24 unità. Icone prese da tre librerie diverse si
 * riconoscono anche a occhio distratto — spessori diversi, angoli diversi —
 * ed è il genere di incoerenza che fa sembrare un prodotto assemblato.
 *
 * Nella barra bassa non stanno per decorazione: a quella dimensione la
 * parola da sola si legge male in movimento, e la forma si riconosce prima
 * del testo.
 */

const base = {
  width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 1.7,
  strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

/** Una lente su una strada: si cerca un percorso, non un oggetto. */
export const SegnoCerca = () => (
  <svg {...base}>
    <circle cx="11" cy="11" r="6.4" />
    <path d="M20.5 20.5 15.6 15.6" />
  </svg>
)

/** Un volante: chi guida. */
export const SegnoGuida = () => (
  <svg {...base}>
    <circle cx="12" cy="12" r="8.6" />
    <circle cx="12" cy="12" r="2.6" />
    <path d="M12 3.4v6M4.1 14.2l5.4-1.5M19.9 14.2l-5.4-1.5" />
  </svg>
)

/** Un segnaposto: dove si va. */
export const SegnoPosti = () => (
  <svg {...base}>
    <path d="M12 21.5s7-5.9 7-11a7 7 0 1 0-14 0c0 5.1 7 11 7 11Z" />
    <circle cx="12" cy="10.4" r="2.5" />
  </svg>
)

/** Due punti e la linea fra loro: un viaggio. */
export const SegnoViaggi = () => (
  <svg {...base}>
    <circle cx="6" cy="6.5" r="2.6" />
    <circle cx="18" cy="17.5" r="2.6" />
    <path d="M8.4 8.4c1.4 1.6 1.1 3.6 3.6 3.6s2.2 2 4 3.6" />
  </svg>
)

/** Una persona. */
export const SegnoTu = () => (
  <svg {...base}>
    <circle cx="12" cy="8.2" r="3.7" />
    <path d="M4.9 20.4a7.4 7.4 0 0 1 14.2 0" />
  </svg>
)

/** Un più: si aggiunge una corsa. */
export const SegnoPiu = () => (
  <svg {...base}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)

/** La freccia che accompagna i collegamenti. */
export const SegnoAvanti = ({ dimensione = 18 }: { dimensione?: number }) => (
  <svg {...base} width={dimensione} height={dimensione}>
    <path d="M5 12h13M12.5 6l6 6-6 6" />
  </svg>
)
