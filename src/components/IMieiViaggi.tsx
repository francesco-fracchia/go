import { Riquadro, Etichetta, euro } from './base.tsx'

/**
 * I miei viaggi.
 *
 * Mancava, ed era il buco più grande del prodotto: si poteva prenotare e poi
 * non ritrovare più la prenotazione. L'unico modo di tornarci era la
 * notifica — che si può cancellare, non arrivare, o essere già stata letta.
 *
 * L'ordine è cronologico crescente per i viaggi futuri: quello che parte
 * prima sta in cima, perché è quello di cui ci si preoccupa adesso.
 */

export interface Viaggio {
  id: string
  ruolo: 'passeggero' | 'conducente'
  stato: string
  oraPartenza: string
  origineLabel: string
  destinazioneLabel: string
  /**
   * Quello che paghi (da passeggero) o quello che rientri (da conducente).
   * Nullo quando non c'è ancora un numero: uno «0,00 €» si legge come
   * «gratis» o come un errore, e nessuna delle due cose è vera.
   */
  importoCent: number | null
  altri: number
  daFare?: string
}

export function IMieiViaggi({ prossimi, passati }: {
  prossimi: Viaggio[]
  passati: Viaggio[]
}) {
  if (prossimi.length === 0 && passati.length === 0) {
    return (
      <main style={{ maxWidth: 480, margin: '0 auto', padding: '60px 24px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 24, marginBottom: 10 }}>Nessun viaggio</h1>
        <p style={{ color: 'var(--inchiostro-2)', fontSize: 15, lineHeight: 1.6, marginBottom: 24 }}>
          Quando prenoti o pubblichi un passaggio lo trovi qui.
        </p>
        <a href="/" style={{ fontWeight: 600 }}>Cerca un passaggio →</a>
      </main>
    )
  }

  return (
    <main style={{ maxWidth: 480, margin: '0 auto', padding: '20px 20px 40px' }}>
      <h1 style={{ fontSize: 26, marginBottom: 22 }}>I tuoi viaggi</h1>

      {prossimi.length > 0 && (
        <section style={{ marginBottom: 30 }}>
          <Etichetta>in programma</Etichetta>
          <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
            {prossimi.map((v) => <Riga key={v.id} v={v} />)}
          </div>
        </section>
      )}

      {passati.length > 0 && (
        <section>
          <Etichetta>già fatti</Etichetta>
          <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
            {passati.map((v) => <Riga key={v.id} v={v} passato />)}
          </div>
        </section>
      )}
    </main>
  )
}

function Riga({ v, passato }: { v: Viaggio; passato?: boolean }) {
  const dove = v.ruolo === 'conducente' ? `/corsa/${v.id}` : `/prenotazione/${v.id}`
  return (
    <a href={dove} style={{ textDecoration: 'none', color: 'inherit' }}>
      <Riquadro stile={{ padding: '15px 17px', opacity: passato ? 0.72 : 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, color: 'var(--tenue)', marginBottom: 2 }}>
              {quando(v.oraPartenza)} · {v.ruolo === 'conducente' ? 'guidi tu' : 'passeggero'}
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, fontFamily: 'var(--titoli)', lineHeight: 1.3 }}>
              {v.destinazioneLabel}
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--tenue)' }}>
              da {v.origineLabel}
              {v.altri > 0 && ` · con altre ${v.altri} ${v.altri === 1 ? 'persona' : 'persone'}`}
            </div>
          </div>
          {v.importoCent !== null && (
            <div style={{ flexShrink: 0, textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 15 }}>
                {euro(v.importoCent)}
              </div>
              {v.ruolo === 'conducente' && (
                <div style={{ fontSize: 11.5, color: 'var(--tenue)', marginTop: 1 }}>
                  ti rientrano
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quello che devi fare TU, se c'è qualcosa. È la ragione per cui
            questa schermata esiste: raccoglie in un posto solo tutte le
            cose in sospeso, che altrimenti vivono solo nelle notifiche. */}
        {v.daFare && (
          <div style={{
            marginTop: 12, padding: '10px 13px', borderRadius: 'var(--raggio-s)',
            background: 'var(--accento-velo)', color: 'var(--accento)',
            fontSize: 13.5, fontWeight: 600,
          }}>{v.daFare}</div>
        )}
      </Riquadro>
    </a>
  )
}

function quando(iso: string): string {
  const d = new Date(iso)
  const ora = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  const giorni = Math.round(
    (new Date(d.toDateString()).getTime() - new Date(new Date().toDateString()).getTime()) / 86_400_000,
  )
  if (giorni === 0) return `oggi · ${ora}`
  if (giorni === 1) return `domani · ${ora}`
  if (giorni === -1) return `ieri · ${ora}`
  if (giorni > 1 && giorni < 7) return `${d.toLocaleDateString('it-IT', { weekday: 'long' })} · ${ora}`
  return `${d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })} · ${ora}`
}
