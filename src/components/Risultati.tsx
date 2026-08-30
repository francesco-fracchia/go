import { Riquadro, Etichetta, euro } from './base.tsx'

/**
 * I risultati.
 *
 * Tre cose che questa schermata deve fare e che nessuna lista di viaggi
 * fa per conto suo:
 *
 * 1. Un prezzo solo, grande. Non la scomposizione — quella sta nel
 *    dettaglio. Qui interessa quanto costa e a che ora si arriva.
 * 2. Distinguere chi è già prenotabile da chi va chiesto. Sono due
 *    azioni con due fatiche diverse, e presentarle uguali fa sembrare
 *    l'applicazione rotta quando la seconda non risponde.
 * 3. Non nascondere il confronto. «Risparmi 30 € sul taxi» è vero e va
 *    detto, ma una volta sola, in fondo — non su ogni riga.
 */

export interface Risultato {
  corsaId: string
  oraPartenza: string
  oraArrivo: string
  partenzaLabel: string
  arrivoLabel: string
  postiLiberi: number
  prezzoDa: number
  fermataPronta: boolean
  kmDeviazione: number
  conducente: { nome: string; fotoUrl: string | null; distintivi: string[] }
  veicolo: { marca: string; modello: string }
}

export function Risultati({ risultati, allargati }: {
  risultati: Risultato[]
  allargati?: Risultato[]
}) {
  const subito = risultati.filter((r) => r.fermataPronta)
  const daChiedere = risultati.filter((r) => !r.fermataPronta)

  if (risultati.length === 0) return <Vuoto allargati={allargati} />

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {subito.map((r) => <Riga key={r.corsaId} r={r} />)}

      {daChiedere.length > 0 && (
        <>
          <div style={{ margin: '14px 2px 2px' }}>
            <Etichetta>da chiedere</Etichetta>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--tenue)', lineHeight: 1.45 }}>
              Non passano dal tuo punto. Puoi proporre di essere preso dove sei:
              decide chi guida.
            </p>
          </div>
          {daChiedere.map((r) => <Riga key={r.corsaId} r={r} />)}
        </>
      )}
    </div>
  )
}

function Riga({ r }: { r: Risultato }) {
  return (
    <a href={`/corsa/${r.corsaId}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <Riquadro stile={{ padding: '16px 18px' }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          {/* Gli orari a sinistra, incolonnati: si scorre una lista
              cercando un'ora, non un nome. */}
          <div style={{ flexShrink: 0, minWidth: 52 }}>
            <div style={{
              fontFamily: 'var(--titoli)', fontWeight: 700, fontSize: 20,
              letterSpacing: '-.02em', lineHeight: 1.15,
            }}>{orario(r.oraPartenza)}</div>
            <div style={{
              width: 1, height: 16, background: 'var(--riga)', margin: '3px 0 3px 9px',
            }} />
            <div style={{ fontSize: 15, color: 'var(--tenue)', lineHeight: 1.15 }}>
              {orario(r.oraArrivo)}
            </div>
          </div>

          <div style={{ flexGrow: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.3 }}>
              {r.partenzaLabel}
            </div>
            <div style={{ fontSize: 14, color: 'var(--tenue)', lineHeight: 1.3 }}>
              {r.arrivoLabel}
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap',
            }}>
              <div style={{
                width: 24, height: 24, borderRadius: 12, flexShrink: 0,
                background: 'var(--superficie-2)',
                backgroundImage: r.conducente.fotoUrl ? `url(${r.conducente.fotoUrl})` : undefined,
                backgroundSize: 'cover',
              }} />
              <span style={{ fontSize: 14, fontWeight: 500 }}>{r.conducente.nome}</span>
              {r.conducente.distintivi.map((d) => (
                <span key={d} style={{
                  fontSize: 11, fontWeight: 600, padding: '2px 7px',
                  borderRadius: 4, background: 'var(--verde-velo)', color: 'var(--verde)',
                }}>{d}</span>
              ))}
            </div>
          </div>

          <div style={{ flexShrink: 0, textAlign: 'right' }}>
            <div style={{
              fontFamily: 'var(--titoli)', fontWeight: 700, fontSize: 21,
              letterSpacing: '-.02em', whiteSpace: 'nowrap',
            }}>{euro(r.prezzoDa)}</div>
            <div style={{ fontSize: 12, color: 'var(--tenue)', marginTop: 2 }}>
              {r.postiLiberi === 1 ? 'ultimo posto' : `${r.postiLiberi} posti`}
            </div>
            {!r.fermataPronta && (
              <div style={{
                fontSize: 11, color: 'var(--accento)', marginTop: 6, fontWeight: 600,
              }}>
                +{r.kmDeviazione.toFixed(1).replace('.', ',')} km
              </div>
            )}
          </div>
        </div>
      </Riquadro>
    </a>
  )
}

/**
 * Nessun risultato.
 *
 * È lo stato più frequente del primo anno, e trattarlo come un errore è il
 * modo migliore di perdere qualcuno per sempre. Non si dice «nessun
 * risultato»: si mostra cosa c'è intorno e si offre di avvisare.
 */
function Vuoto({ allargati }: { allargati?: Risultato[] }) {
  return (
    <div>
      <Riquadro tono="accento" stile={{ marginBottom: 18 }}>
        <div style={{ fontSize: 17, fontWeight: 600, fontFamily: 'var(--titoli)' }}>
          Nessuno va lì a quell&apos;ora
        </div>
        <p style={{ margin: '6px 0 14px', fontSize: 14, color: 'var(--inchiostro-2)', lineHeight: 1.5 }}>
          Ti avvisiamo appena qualcuno pubblica. Nel frattempo, dillo tu:
          chi guida vede chi sta cercando, ed è così che nascono i primi
          passaggi.
        </p>
        <a href="/cerco" style={{ fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>
          Cerco un passaggio →
        </a>
      </Riquadro>

      {allargati && allargati.length > 0 && (
        <>
          <div style={{ margin: '0 2px 10px' }}>
            <Etichetta>poco prima o poco dopo</Etichetta>
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            {allargati.map((r) => <Riga key={r.corsaId} r={r} />)}
          </div>
        </>
      )}
    </div>
  )
}

const orario = (iso: string) =>
  new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
