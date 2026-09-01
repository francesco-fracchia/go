import { notFound } from 'next/navigation'
import { diarioDi } from '../../../server/pannello.ts'
import { eModeratore } from '../../../server/moderazione.ts'
import { richiediUtente } from '../../../server/auth.ts'
import { db } from '../../../server/db.ts'
import { quando } from '../../../lib/tempo.ts'

export const dynamic = 'force-dynamic'

/**
 * Una persona sola, in ordine.
 *
 * «Qualcuno la sta usando» è la prima domanda; «come la usa» è quella dopo,
 * e si risponde solo guardando la SEQUENZA: si è iscritto, ha cercato tre
 * volte la stessa tratta, non ha trovato niente, è tornato il giorno dopo.
 * Quella storia non si vede in nessun conteggio.
 *
 * Anche qui dei messaggi si vede che ci sono stati, mai cosa dicono.
 */
export default async function Pagina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const utente = await richiediUtente()
  if (!eModeratore(utente)) notFound()

  const [{ data: p }, eventi] = await Promise.all([
    db.from('profili').select('nome, cognome, creato_il').eq('id', id).maybeSingle(),
    diarioDi(id),
  ])
  if (!p) notFound()

  return (
    <main style={{ maxWidth: 700, margin: '0 auto', padding: '24px 20px 60px' }}>
      <a href="/pannello" style={{ fontSize: 13.5 }}>← il pannello</a>
      <h1 style={{ fontSize: 24, margin: '14px 0 2px' }}>
        {p.nome} {p.cognome?.charAt(0)}.
      </h1>
      <p style={{ margin: '0 0 24px', color: 'var(--tenue)', fontSize: 14 }}>
        Iscritto {quando(p.creato_il)} · {eventi.length} cose fatte ·{' '}
        <a href={`/profilo/${id}`}>il suo profilo</a>
      </p>

      {eventi.length === 0 && (
        <p style={{ color: 'var(--tenue)', fontSize: 15 }}>
          Si è iscritto e non ha ancora fatto niente.
        </p>
      )}

      <div style={{ display: 'grid', gap: 2 }}>
        {eventi.map((e, i) => (
          <div key={`${e.quando}-${i}`} style={{
            display: 'flex', gap: 12, alignItems: 'baseline',
            padding: '9px 12px', borderRadius: 'var(--raggio-s)', fontSize: 14,
            background: e.cosa.includes('NIENTE') ? 'var(--accento-velo)' : 'transparent',
          }}>
            <span style={{
              color: 'var(--tenue)', fontSize: 12.5, minWidth: 92, flexShrink: 0,
              fontVariantNumeric: 'tabular-nums',
            }}>{quando(e.quando)}</span>
            <span style={{ color: 'var(--inchiostro-2)' }}>{e.cosa}</span>
          </div>
        ))}
      </div>
    </main>
  )
}
