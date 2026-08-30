import type { ReactNode } from 'react'
import { Marchio } from './Marchio.tsx'

/**
 * Il telaio dell'applicazione.
 *
 * Le schermate erano larghe 460 pixel e centrate, punto: sul telefono
 * perfette, su un portatile una colonna stretta in mezzo al vuoto — che non
 * è una scelta, è un lavoro lasciato a metà.
 *
 * La correzione non è «rendere tutto largo». Un elenco di passaggi largo
 * 1200 pixel si legge peggio, non meglio: l'occhio deve attraversare mezzo
 * schermo per collegare l'orario al prezzo. Quello che cambia sul desktop è
 * il CONTORNO — una barra di navigazione permanente al posto di quella che
 * sul telefono sta in fondo, e la colonna appoggiata su uno sfondo invece
 * che sospesa nel bianco.
 *
 * Le sole schermate che diventano davvero larghe sono quelle a elenco, dove
 * più colonne fanno vedere più opzioni insieme: è l'unico caso in cui la
 * larghezza serve a qualcosa.
 */

export interface VoceNavigazione {
  href: string
  testo: string
  attiva?: boolean
}

const VOCI: VoceNavigazione[] = [
  { href: '/', testo: 'Cerca' },
  { href: '/posti', testo: 'Dove si va' },
  { href: '/pubblica', testo: 'Offri un passaggio' },
  { href: '/viaggi', testo: 'I tuoi viaggi' },
]

export function Telaio({ children, larga, attiva }: {
  children: ReactNode
  /** true per le schermate a elenco, che sul desktop guadagnano colonne */
  larga?: boolean
  attiva?: string
}) {
  return (
    <div className="telaio">
      <header className="intestazione">
        <div className="intestazione-dentro">
          <a href="/" className="marchio-collegamento" aria-label="GO">
            <Marchio dimensione={30} />
            <span className="marchio-testo">GO</span>
          </a>

          <nav className="navigazione">
            {VOCI.map((v) => (
              <a key={v.href} href={v.href}
                className={`voce${attiva === v.href ? ' voce-attiva' : ''}`}>
                {v.testo}
              </a>
            ))}
          </nav>

          <a href="/profilo" className="voce voce-profilo">Il tuo profilo</a>
        </div>
      </header>

      <div className={larga ? 'contenuto contenuto-largo' : 'contenuto'}>
        {children}
      </div>

      {/* Sul telefono la navigazione sta in fondo, dove arriva il pollice.
          Sul desktop sparisce: lì c'è già in cima, e ripeterla sarebbe
          rumore. */}
      <nav className="navigazione-bassa">
        {VOCI.map((v) => (
          <a key={v.href} href={v.href}
            className={`voce-bassa${attiva === v.href ? ' voce-bassa-attiva' : ''}`}>
            {v.testo}
          </a>
        ))}
      </nav>
    </div>
  )
}
