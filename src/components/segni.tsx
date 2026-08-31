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

/** La freccia che torna indietro. */
export const SegnoIndietro = () => (
  <svg {...base}>
    <path d="M15 5 8 12l7 7" />
  </svg>
)

/** Una porta con la freccia che esce. */
export const SegnoEsci = () => (
  <svg {...base}>
    <path d="M15 4.5H18a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-3" />
    <path d="M10 8.5 6 12l4 3.5" />
    <path d="M6 12h8" />
  </svg>
)

/** Tre teste vicine: un gruppo, non una persona. */
export const SegnoComitiva = () => (
  <svg {...base}>
    <circle cx="8.5" cy="8" r="3" />
    <circle cx="16" cy="9.5" r="2.4" />
    <path d="M3 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
    <path d="M16 14.2c2.6.2 4.5 2 4.5 4.8" />
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

/* ── I segni dei tre pilastri ──────────────────────────────────────────
   Più grandi degli altri: qui non accompagnano una parola in una barra,
   sono il primo elemento che si vede di una sezione. */

const grande = { ...base, width: 30, height: 30, strokeWidth: 1.5 }

/** Una cifra divisa: quello che si paga è una spesa spezzata, non un prezzo. */
export const SegnoQuota = () => (
  <svg {...grande}>
    <circle cx="12" cy="12" r="9.2" />
    <path d="M7.6 8.6h8.8M7.6 15.4h8.8M14.2 5.6l-4.4 12.8" />
  </svg>
)

/** Una persona dentro un contorno: si sa chi è prima di salire. */
export const SegnoFiducia = () => (
  <svg {...grande}>
    <path d="M12 2.8 4.4 6v6.1c0 4.6 3.1 7.9 7.6 9.1 4.5-1.2 7.6-4.5 7.6-9.1V6Z" />
    <path d="M8.6 12.2l2.3 2.4 4.5-4.9" />
  </svg>
)

/** Una strada con un innesto: ti prende anche se non sei sul suo percorso. */
export const SegnoVicino = () => (
  <svg {...grande}>
    <path d="M3.4 19.4c3.6 0 4.2-4.6 7.4-6.2s5.4-.6 9.8-6.6" />
    <path d="M7 21.2c1.4-2 1.4-5.2 3.8-8" />
    <circle cx="10.8" cy="13.2" r="2.2" />
  </svg>
)

/* ── I segni delle opzioni di pubblicazione ────────────────────────────
   Su un elenco di scelte, l'icona non decora: dice di cosa si parla prima
   che si legga il titolo, e permette di saltare le domande che non
   riguardano. */

/** Un occhio: chi può vedere la corsa. */
export const SegnoOcchio = () => (
  <svg {...base}>
    <path d="M2 12s3.6-6.2 10-6.2S22 12 22 12s-3.6 6.2-10 6.2S2 12 2 12Z" />
    <circle cx="12" cy="12" r="2.9" />
  </svg>
)

/** Due persone: chi sale. */
export const SegnoPersone = () => (
  <svg {...base}>
    <circle cx="9" cy="8.4" r="3.4" />
    <path d="M2.9 19.6a6.6 6.6 0 0 1 12.2 0" />
    <path d="M16.4 5.6a3.4 3.4 0 0 1 0 5.6M17.8 14.4a6.6 6.6 0 0 1 3.3 5.2" />
  </svg>
)

/** Una strada che devia: passare a prendere qualcuno. */
export const SegnoDeviazione = () => (
  <svg {...base}>
    <path d="M4 20c4.6 0 5.4-6.4 9.4-8.6" />
    <path d="M8.6 20c1.8-2.6 1.4-6.6 4.8-8.6" />
    <path d="M13.4 11.4h5.4M18.8 11.4l-2.6-2.6M18.8 11.4l-2.6 2.6" />
  </svg>
)

/** Un orologio: entro quando si può disdire. */
export const SegnoOrologio = () => (
  <svg {...base}>
    <circle cx="12" cy="12" r="8.6" />
    <path d="M12 7.2V12l3.2 2" />
  </svg>
)

/** Una nota: cosa dire a chi sale. */
export const SegnoNota = () => (
  <svg {...base}>
    <path d="M20.2 13.4V6.2a2 2 0 0 0-2-2H5.8a2 2 0 0 0-2 2v11.6a2 2 0 0 0 2 2H13Z" />
    <path d="M13 19.8v-4.4a2 2 0 0 1 2-2h5.2ZM7.6 9h8.8M7.6 12.6h5.6" />
  </svg>
)

/* ── I segni delle categorie di luogo ──────────────────────────────────
   Su una fila di dodici filtri tutti uguali l'occhio deve leggere ogni
   parola per trovare quella giusta. Con un segno davanti si punta al
   simbolo, e la parola serve solo a confermare. */

export const SegnoDiscoteca = () => (
  <svg {...base}><circle cx="12" cy="12" r="8.4" /><circle cx="12" cy="12" r="2.4" />
    <path d="M12 3.6v3.6M12 16.8v3.6M3.6 12h3.6M16.8 12h3.6M6 6l2.6 2.6M15.4 15.4 18 18M18 6l-2.6 2.6M8.6 15.4 6 18" /></svg>
)
export const SegnoBar = () => (
  <svg {...base}><path d="M5 4h14l-7 8Z" /><path d="M12 12v7M8.4 19h7.2" /></svg>
)
export const SegnoRistorante = () => (
  <svg {...base}><path d="M6 3v8a2 2 0 0 0 4 0V3M8 11v10" /><path d="M17 3c-1.6 1-2.4 2.8-2.4 5s.8 3.4 2.4 3.4V21" /></svg>
)
export const SegnoCinema = () => (
  <svg {...base}><rect x="3" y="5.6" width="18" height="12.8" rx="2.4" />
    <path d="M9 5.6 7 18.4M15 5.6l2 12.8M3 10.4h18M3 13.6h18" /></svg>
)
export const SegnoNegozi = () => (
  <svg {...base}><path d="M4 8.4h16l-1.2 11a2 2 0 0 1-2 1.8H7.2a2 2 0 0 1-2-1.8Z" />
    <path d="M8.6 8.4V6a3.4 3.4 0 0 1 6.8 0v2.4" /></svg>
)
export const SegnoPiazza = () => (
  <svg {...base}><path d="M3 20.4h18M6 20.4V9.6l6-4.8 6 4.8v10.8" /><path d="M10 20.4v-5h4v5" /></svg>
)
export const SegnoTreno = () => (
  <svg {...base}><rect x="5.4" y="3.6" width="13.2" height="13.2" rx="3" />
    <path d="M5.4 11.4h13.2M9 20.4l-2 1.8M15 20.4l2 1.8M8.4 16.8h.01M15.6 16.8h.01" /></svg>
)
export const SegnoAereo = () => (
  <svg {...base}><path d="M21 15.6 3.6 9.6l2.4-2.4 5.4 1.2 3.6-3.6a2 2 0 0 1 2.8 2.8l-3.6 3.6 1.2 5.4-2.4 2.4-2.4-6" /></svg>
)
export const SegnoStadio = () => (
  <svg {...base}><ellipse cx="12" cy="12" rx="9" ry="6" /><ellipse cx="12" cy="12" rx="3.6" ry="2.4" /></svg>
)
export const SegnoUniversita = () => (
  <svg {...base}><path d="M12 4 2.4 8.4 12 12.8l9.6-4.4Z" /><path d="M6 10.6v4.8c0 1.6 2.7 3 6 3s6-1.4 6-3v-4.8" /></svg>
)
export const SegnoPalestra = () => (
  <svg {...base}><path d="M3.6 9.6v4.8M6.6 7.2v9.6M17.4 7.2v9.6M20.4 9.6v4.8M6.6 12h10.8" /></svg>
)
export const SegnoTutti = () => (
  <svg {...base}><circle cx="7.2" cy="7.2" r="3" /><circle cx="16.8" cy="7.2" r="3" />
    <circle cx="7.2" cy="16.8" r="3" /><circle cx="16.8" cy="16.8" r="3" /></svg>
)
