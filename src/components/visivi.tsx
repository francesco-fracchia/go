/**
 * Il linguaggio visivo di GO.
 *
 * Niente fotografie e niente illustrazioni da modello: entrambe raccontano
 * un'altra azienda. Qui si disegna quello che il prodotto fa davvero —
 * punti, percorsi, gettoni che si incontrano — con la stessa geometria del
 * marchio: tratti spessi, estremità tonde, un solo accento.
 *
 * Nessuno di questi disegni finge di essere una mappa. Una mappa finta a
 * questa dimensione si riconosce in un istante ed è peggio di niente: questi
 * dicono «da qui a lì, insieme», che è l'unica cosa che devono dire.
 */

/* ── Le due strade che diventano una ──────────────────────────────────
   L'immagine del prodotto. Una persona sta già andando da A a B; una
   seconda si innesta lungo la strada, e da quel punto in poi il percorso è
   uno solo. È letteralmente il modello di GO, disegnato. */

const STRADA = 'M 62 392 C 150 392 168 322 236 300 S 366 268 420 196 S 506 96 566 74'
const INNESTO = 'M 112 468 C 170 456 196 340 236 300'

export function Incontro({ id = 'incontro' }: { id?: string }) {
  return (
    <svg className="visivo" viewBox="0 0 640 520" fill="none"
      role="img" aria-label="Due persone che partono da punti diversi e fanno la stessa strada">
      <defs>
        <linearGradient id={`${id}-sf`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--accento)" stopOpacity=".07" />
          <stop offset="1" stopColor="var(--accento)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Il campo: strade che non c'entrano, tenute quasi invisibili.
          Servono a dire «questo è un territorio», non a essere lette. */}
      <g stroke="var(--riga)" strokeWidth="1.5" opacity=".85">
        <path d="M0 250 H640M0 118 H640M0 384 H640" strokeDasharray="2 12" />
        <path d="M170 0 V520M382 0 V520M528 0 V520" strokeDasharray="2 12" />
      </g>

      <circle cx="566" cy="74" r="120" fill={`url(#${id}-sf)`} />

      {/* La strada, in due passate: il corpo grigio dà spessore, il
          tratteggio viola dice che qualcosa si sta muovendo. */}
      <path d={STRADA} stroke="var(--strada)" strokeWidth="20" strokeLinecap="round" />
      <path d={INNESTO} stroke="var(--strada)" strokeWidth="13" strokeLinecap="round" />
      <path d={STRADA} stroke="var(--accento)" strokeWidth="3" strokeLinecap="round"
        className="tratteggio" opacity=".95" />

      {/* Il punto in cui si sale. È il momento del prodotto: si segna. */}
      <circle cx="236" cy="300" r="26" stroke="var(--accento)" strokeWidth="1.5"
        opacity=".3" className="pulsa" />
      <circle cx="236" cy="300" r="9" fill="var(--carta)" stroke="var(--accento)" strokeWidth="3.5" />

      {/* Partenza di chi guida, partenza di chi sale, arrivo comune. */}
      <circle cx="62" cy="392" r="9" fill="var(--carta)" stroke="var(--inchiostro)" strokeWidth="3" />
      <circle cx="96" cy="470" r="7" fill="var(--carta)" stroke="var(--tenue)" strokeWidth="3" />
      <circle cx="566" cy="74" r="13" fill="var(--accento)" />
      <circle cx="566" cy="74" r="25" stroke="var(--accento)" strokeWidth="1.5" opacity=".3" />

      {/* Il gettone che percorre la strada. Non è una macchina disegnata:
          è la cosa che si muove, ed è quanto basta. */}
      <g className="gettone">
        <rect x="-21" y="-14" width="42" height="28" rx="11" fill="var(--accento)" />
        <circle cx="-7" cy="0" r="4" fill="var(--su-accento)" opacity=".95" />
        <circle cx="7" cy="0" r="4" fill="var(--su-accento)" opacity=".5" />
      </g>
    </svg>
  )
}

/* ── Il momento della notte ───────────────────────────────────────────
   Tu, casa, e una macchina che sta già facendo una strada compatibile.
   Vive dentro una sezione sempre scura: i colori sono suoi, non del tema. */

export function Notte() {
  return (
    <svg className="visivo" viewBox="0 0 620 400" fill="none"
      role="img" aria-label="Sei lontano da casa, e qualcuno sta già tornando dalla tua parte">
      <g stroke="var(--notte-riga)" strokeWidth="1.5">
        <path d="M0 92 H620M0 208 H620M0 320 H620" strokeDasharray="2 13" />
      </g>

      <path d="M 74 322 C 190 322 214 214 330 190 S 470 150 552 92"
        stroke="var(--notte-carta)" strokeWidth="16" strokeLinecap="round" />
      <path d="M 74 322 C 190 322 214 214 330 190 S 470 150 552 92"
        stroke="#8A78FF" strokeWidth="2.5" strokeLinecap="round"
        className="tratteggio" opacity=".95" />

      <circle cx="74" cy="322" r="10" fill="var(--notte-fondo)" stroke="#8A78FF" strokeWidth="3.5" />
      <text x="74" y="362" textAnchor="middle" fill="var(--notte-tenue)"
        fontSize="15" fontFamily="var(--testo)">tu</text>

      <circle cx="552" cy="92" r="13" fill="#8A78FF" />
      <circle cx="552" cy="92" r="27" stroke="#8A78FF" strokeWidth="1.5" opacity=".35" className="pulsa" />
      <text x="552" y="140" textAnchor="middle" fill="#C9BEFF"
        fontSize="15" fontFamily="var(--testo)">casa</text>

      {/* L'altra macchina: già in strada, nella tua direzione. */}
      <g className="gettone gettone-notte">
        <rect x="-19" y="-13" width="38" height="26" rx="10" fill="#8A78FF" />
        <circle cx="-6" cy="0" r="3.6" fill="#0A0A12" opacity=".9" />
        <circle cx="6" cy="0" r="3.6" fill="#0A0A12" opacity=".5" />
      </g>
    </svg>
  )
}

/* ── Le spese ─────────────────────────────────────────────────────────
   Perché costa poco: non è uno sconto, è una divisione. Tre voci che
   entrano, una linea, il risultato diviso per le persone in macchina —
   conducente compreso, che è il punto che nessuno si aspetta. */

export function Spese({ persone = 4 }: { persone?: number }) {
  const voci = [
    { n: 'Carburante', d: 'quello che consumi davvero' },
    { n: 'Pedaggi', d: "l'autostrada, se la fai" },
    { n: 'Usura', d: 'gomme, tagliandi, il valore che perde' },
  ]
  return (
    <div className="spese">
      <ul className="spese-voci">
        {voci.map((v, i) => (
          <li key={v.n} className="spese-voce">
            <span className="spese-piu" aria-hidden="true">{i === 0 ? '' : '+'}</span>
            <span>
              <span className="spese-nome">{v.n}</span>
              <span className="spese-nota">{v.d}</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="spese-riga" aria-hidden="true" />

      <div className="spese-fondo">
        <p className="occhiello occhiello-accento">divise fra</p>
        <div className="spese-teste" aria-hidden="true">
          {Array.from({ length: persone }, (_, i) => (
            <span key={i} className={`spese-testa${i === 0 ? ' spese-testa-guida' : ''}`}>
              {i === 0 ? 'chi guida' : ''}
            </span>
          ))}
        </div>
        <p className="spese-chiusa">
          Chi guida è uno dei {persone}. Non incassa un prezzo:
          <em className="viola"> rientra di una parte di quello che ha speso.</em>
        </p>
      </div>
    </div>
  )
}

/* ── Il tracciato semplice ────────────────────────────────────────────
   Da qui a lì. Serve dove basta un accento, non una scena. */

export function Tracciato({ altezza = 130 }: { altezza?: number }) {
  return (
    <svg viewBox="0 0 320 150" fill="none" style={{ width: '100%', height: altezza }}
      role="img" aria-label="Un percorso fra due punti">
      <path d="M28 122 C 92 122, 82 62, 140 54 S 220 44, 292 22"
        stroke="var(--strada)" strokeWidth="13" strokeLinecap="round" />
      <path d="M28 122 C 92 122, 82 62, 140 54 S 220 44, 292 22"
        stroke="var(--accento)" strokeWidth="2.5" strokeLinecap="round"
        className="tratteggio" opacity=".9" />
      <circle cx="28" cy="122" r="8" fill="var(--carta)" stroke="var(--accento)" strokeWidth="3" />
      <circle cx="292" cy="22" r="8" fill="var(--accento)" />
    </svg>
  )
}
