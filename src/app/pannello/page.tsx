import { diario, numeri, lavoriRecenti } from '../../server/pannello.ts'
import { eModeratore } from '../../server/moderazione.ts'
import { richiediUtente } from '../../server/auth.ts'
import { quando } from '../../lib/tempo.ts'
import { Riquadro, Etichetta } from '../../components/base.tsx'

export const dynamic = 'force-dynamic'

/**
 * Il pannello.
 *
 * Serve a rispondere a una domanda sola, che all'inizio è l'unica che
 * conta: qualcuno la sta usando, e come?
 *
 * Non c'è nessun modo di leggere una conversazione da qui. Dei messaggi si
 * vede che ci sono stati, mai cosa dicono: leggerli si può solo dopo una
 * segnalazione, dalla coda di moderazione, e ogni apertura resta scritta.
 * Un pannello da cui si sfogliano le chat è la cosa che trasforma un
 * accesso difendibile in uno che non lo è.
 */
const SEGNO: Record<string, string> = {
  iscrizione: '◆', corsa: '↗', prenotazione: '◇', accettata: '✓',
  cerco: '?', ricerca: '⌕', recensione: '★', segnalazione: '!',
  messaggio: '·', comitiva: '◎', liquidazione: '€',
}

export default async function Pagina() {
  const utente = await richiediUtente()
  if (!eModeratore(utente)) {
    return (
      <main style={{ padding: 40, textAlign: 'center', color: 'var(--tenue)' }}>
        Non hai accesso a questa pagina.
      </main>
    )
  }

  const [eventi, n, lavori] = await Promise.all([diario(), numeri(), lavoriRecenti()])
  const vecchio = (iso: string) => Date.now() - new Date(iso).getTime() > 26 * 3600_000

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '24px 20px 60px' }}>
      <h1 style={{ fontSize: 26, marginBottom: 4 }}>Il pannello</h1>
      <p style={{ margin: '0 0 26px', color: 'var(--tenue)', fontSize: 14 }}>
        <a href="/moderazione">La coda di moderazione</a> sta di là.
      </p>

      {/* ── I numeri ─────────────────────────────────────────────────── */}
      <div style={{
        display: 'grid', gap: 10, marginBottom: 30,
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      }}>
        <Numero t="iscritti" v={n.iscritti} sotto={`+${n.iscrittiSettimana} in 7 giorni`} />
        <Numero t="corse pubblicate" v={n.corseSettimana} sotto="in 7 giorni" />
        <Numero t="prenotazioni" v={n.prenotazioniSettimana} sotto="in 7 giorni" />
        <Numero t="tornati" v={n.tornati} sotto="con almeno due corse" />
        <Numero t="ricerche" v={n.ricercheSettimana} sotto="in 7 giorni" />
        <Numero t="a vuoto" v={n.ricercheAVuoto}
          sotto="cercato e non trovato" allarme={n.ricercheAVuoto > 0} />
      </div>

      {/* ── I lavori ─────────────────────────────────────────────────── */}
      <h2 style={{ fontSize: 18, margin: '0 0 4px' }}>I lavori automatici</h2>
      <p style={{ margin: '0 0 12px', color: 'var(--tenue)', fontSize: 13.5 }}>
        Un lavoro che smette in silenzio è il modo in cui i soldi smettono di
        muoversi senza che nessuno se ne accorga.
      </p>
      <Riquadro stile={{ padding: '4px 16px', marginBottom: 30 }}>

        {lavori.map((l) => (
          <div key={l.nome} style={{
            display: 'flex', gap: 12, alignItems: 'baseline',
            padding: '9px 0', borderBottom: '1px solid var(--riga-2)',
            fontSize: 13.5,
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: 999, flexShrink: 0,
              background: l.errore ? 'var(--rosso)'
                : !l.eseguitoIl ? 'var(--rosso)'
                  : vecchio(l.eseguitoIl) ? 'var(--tenue)' : 'var(--verde)',
            }} />
            <span style={{ fontFamily: 'var(--mono)', flexGrow: 1 }}>{l.nome}</span>
            <span style={{ color: l.eseguitoIl ? 'var(--tenue)' : 'var(--rosso)' }}>
              {l.eseguitoIl ? quando(l.eseguitoIl) : 'mai'}
            </span>
            <span style={{
              color: 'var(--tenue)', fontVariantNumeric: 'tabular-nums',
              minWidth: 58, textAlign: 'right',
            }}>{l.durataMs !== null ? `${l.durataMs} ms` : '—'}</span>
          </div>
        ))}
      </Riquadro>

      {/* ── Il diario ────────────────────────────────────────────────── */}
      <h2 style={{ fontSize: 18, margin: '0 0 4px' }}>Il diario</h2>
      <p style={{ margin: '0 0 12px', color: 'var(--tenue)', fontSize: 13.5 }}>
        Tutto quello che è successo, in ordine. Dei messaggi si vede che ci sono
        stati, mai cosa dicono.
      </p>

      {eventi.length === 0 && (
        <p style={{ color: 'var(--tenue)', fontSize: 15 }}>
          Non è ancora successo niente.
        </p>
      )}

      <div style={{ display: 'grid', gap: 2 }}>
        {eventi.map((e, i) => (
          <div key={`${e.quando}-${i}`} style={{
            display: 'flex', gap: 12, alignItems: 'baseline',
            padding: '9px 12px', borderRadius: 'var(--raggio-s)',
            background: e.tipo === 'ricerca' && e.cosa.includes('NIENTE')
              ? 'var(--accento-velo)' : 'transparent',
            fontSize: 14,
          }}>
            <span style={{
              width: 16, textAlign: 'center', flexShrink: 0,
              color: 'var(--tenue)', fontFamily: 'var(--mono)',
            }}>{SEGNO[e.tipo] ?? '·'}</span>
            <span style={{
              color: 'var(--tenue)', fontSize: 12.5, minWidth: 92, flexShrink: 0,
              fontVariantNumeric: 'tabular-nums',
            }}>{quando(e.quando)}</span>
            <span style={{ minWidth: 0 }}>
              {e.chi
                ? <a href={`/pannello/${e.chi}`} style={{
                    fontWeight: 600, textDecoration: 'none', color: 'var(--inchiostro)',
                  }}>{e.nome}</a>
                : <strong>{e.nome}</strong>}
              {' '}
              <span style={{ color: 'var(--inchiostro-2)' }}>{e.cosa}</span>
            </span>
          </div>
        ))}
      </div>
    </main>
  )
}

function Numero({ t, v, sotto, allarme }: {
  t: string; v: number; sotto: string; allarme?: boolean
}) {
  return (
    <Riquadro stile={{ padding: '14px 16px' }}>
      <Etichetta tono={allarme ? 'accento' : 'tenue'}>{t}</Etichetta>
      <div style={{
        fontSize: 28, fontWeight: 700, lineHeight: 1.1, margin: '6px 0 2px',
        fontVariantNumeric: 'tabular-nums',
      }}>{v}</div>
      <div style={{ fontSize: 12.5, color: 'var(--tenue)' }}>{sotto}</div>
    </Riquadro>
  )
}
