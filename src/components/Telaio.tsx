import type { ReactNode } from 'react'
import { Marchio, MarchioEsteso } from './Marchio.tsx'
import { Interruttore } from './Modo.tsx'
import { SegnoCerca, SegnoGuida, SegnoPosti, SegnoViaggi, SegnoTu, SegnoPiu } from './segni.tsx'
import type { Modo } from '../server/modo.ts'

/**
 * Il telaio.
 *
 * Prima era una barra sola con quattro voci — Cerca, Dove si va, Offri un
 * passaggio, I tuoi viaggi — per due mestieri opposti. Chi cercava un
 * passaggio doveva scorrere accanto a «Offri»; chi guidava vedeva «Cerca»
 * come prima voce. Nessuno dei due era a casa propria.
 *
 * Adesso la navigazione segue la modalità: sono due insiemi di voci
 * diversi, e l'interruttore per passare da uno all'altro sta accanto al
 * marchio, sempre visibile.
 *
 * La distinzione visiva non è un secondo colore di marca — sarebbe due
 * prodotti, non due modalità — ma il TERRENO: in conducente il fondo della
 * pagina diventa grigio e le carte restano bianche. Si riconosce da lontano,
 * senza leggere.
 *
 * Sul telefono la navigazione sta in fondo, dove arriva il pollice; sulla
 * scrivania in cima, a tutta larghezza, e in fondo sparisce.
 */

interface Voce {
  href: string
  testo: string
  /** L'etichetta della barra bassa, quando quella lunga non ci sta. */
  corto?: string
  segno: () => ReactNode
}

const VOCI: Record<Modo, Voce[]> = {
  passeggero: [
    { href: '/', testo: 'Cerca', segno: SegnoCerca },
    { href: '/posti', testo: 'Dove si va', corto: 'Posti', segno: SegnoPosti },
    { href: '/viaggi', testo: 'I miei viaggi', corto: 'Viaggi', segno: SegnoViaggi },
  ],
  conducente: [
    { href: '/', testo: 'Le mie corse', corto: 'Corse', segno: SegnoGuida },
    { href: '/pubblica', testo: 'Pubblica un viaggio', corto: 'Pubblica', segno: SegnoPiu },
    { href: '/viaggi', testo: 'I miei viaggi', corto: 'Viaggi', segno: SegnoViaggi },
  ],
}

export function Telaio({ children, attiva, modo = 'passeggero', utente, iniziale, fotoUrl, vetrina }: {
  children: ReactNode
  attiva?: string
  modo?: Modo
  /**
   * La vetrina: chi non è ancora entrato. Niente interruttore di modalità e
   * niente schede in fondo — sono voci che porterebbero tutte alla stessa
   * schermata di accesso, e una barra di navigazione che non naviga è
   * peggio di nessuna barra.
   */
  vetrina?: boolean
  /** Se c'è qualcuno collegato: cambia l'angolo in alto a destra. */
  utente?: string | null
  iniziale?: string
  fotoUrl?: string | null
}) {
  const voci = VOCI[modo]

  return (
    <div className="telaio" data-modo={modo}>
      <header className="intestazione">
        <div className="intestazione-dentro">
          {/* Il logotipo per esteso, non il riquadro.
              Il riquadro è un'icona: serve dove GO deve stare dentro una
              casella che non è sua — la scheda del telefono, il segnalibro.
              Qui la casella è nostra, e quello che si vede deve essere il
              marchio, sfumatura compresa. */}
          <a href="/" className="marchio-collegamento" aria-label="GO">
            <Marchio variante="nudo" dimensione={24} id="barra" />
          </a>

          {!vetrina && <Interruttore modo={modo} />}

          <nav className="navigazione" aria-label="Sezioni">
            {!vetrina && voci.map((v) => (
              <a key={v.href} href={v.href}
                className={`voce${attiva === v.href ? ' voce-attiva' : ''}`}>
                {v.testo}
              </a>
            ))}
          </nav>

          {utente ? (
            <a href="/profilo" className="pastiglia-profilo" aria-label="Il tuo profilo"
              style={fotoUrl ? { backgroundImage: `url(${fotoUrl})` } : undefined}>
              {!fotoUrl && (iniziale ?? '·')}
            </a>
          ) : (
            <a href="/entra" className="entra-barra">Entra</a>
          )}
        </div>
      </header>

      <div className="contenuto">{children}</div>

      {vetrina && <Piede />}

      {vetrina ? null : (
      <nav className="schede" aria-label="Sezioni">
        {voci.map((v) => {
          const qui = attiva === v.href
          const Segno = v.segno
          return (
            <a key={v.href} href={v.href}
              className={`scheda${qui ? ' scheda-attiva' : ''}`}
              aria-current={qui ? 'page' : undefined}>
              <Segno />
              {v.corto ?? v.testo}
            </a>
          )
        })}
        <a href={utente ? '/profilo' : '/entra'}
          className={`scheda${attiva === '/profilo' ? ' scheda-attiva' : ''}`}>
          <SegnoTu />
          {utente ? 'Tu' : 'Entra'}
        </a>
      </nav>
      )}
    </div>
  )
}

/**
 * Il piede, solo in vetrina.
 *
 * Dentro l'applicazione queste voci stanno nel profilo, dove uno le cerca.
 * Qui servono perché una pagina pubblica senza contatti e senza condizioni
 * non è soltanto scortese: il regolamento sui servizi digitali chiede un
 * punto di contatto raggiungibile, e questo è il posto dove si guarda.
 */
function Piede() {
  return (
    <footer className="piede">
      <div className="dentro piede-dentro">
        <MarchioEsteso dimensione={30} id="piede" />
        <nav className="piede-voci" aria-label="Informazioni">
          <a href="/come-funziona">Come funziona</a>
          <a href="/aiuto">Domande</a>
          <a href="/legale/termini">Condizioni d&apos;uso</a>
          <a href="/legale/privacy">Privacy</a>
          <a href="/legale/contatto">Contatti</a>
        </nav>
      </div>
    </footer>
  )
}
