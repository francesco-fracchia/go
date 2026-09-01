import { notFound } from 'next/navigation'
import { conversazioneDi } from '../../../../server/moderazione.ts'
import { richiediUtente } from '../../../../server/auth.ts'
import { quando } from '../../../../lib/tempo.ts'

export const dynamic = 'force-dynamic'

/**
 * La conversazione di due persone, aperta per decidere su una segnalazione.
 *
 * Sta su una schermata a sé e non dentro la coda, di proposito: aprirla è
 * un ATTO, e ogni apertura resta scritta. Mostrarla in linea sotto ogni
 * segnalazione vorrebbe dire leggere la corrispondenza di dieci persone
 * ogni volta che si guarda la coda, e registrare dieci accessi che nessuno
 * ha voluto fare.
 */
export default async function Pagina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const utente = await richiediUtente()
  const c = await conversazioneDi(id, utente)
  if (!c) notFound()

  return (
    <main style={{ maxWidth: 620, margin: '0 auto', padding: '24px 20px 60px' }}>
      <a href="/moderazione" style={{ fontSize: 13.5 }}>← la coda</a>
      <h1 style={{ fontSize: 22, margin: '14px 0 4px' }}>
        {c.gruppo ? 'La conversazione della corsa' : 'La conversazione fra i due'}
      </h1>
      <p style={{ margin: '0 0 22px', color: 'var(--tenue)', fontSize: 14 }}>
        {c.destinazione} · questa apertura è registrata, con il tuo nome e l&apos;ora.
      </p>

      {c.messaggi.length === 0 && (
        <p style={{ color: 'var(--tenue)', fontSize: 15 }}>
          Non si sono scritti niente. Quello che è successo, è successo altrove.
        </p>
      )}

      <div style={{ display: 'grid', gap: 10 }}>
        {c.messaggi.map((m) => (
          <div key={m.id} style={{
            padding: '11px 14px', borderRadius: 'var(--raggio-s)',
            background: m.accusato ? 'var(--accento-velo)' : 'var(--carta)',
            border: '1px solid var(--riga)',
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: 12.5, color: 'var(--tenue)', marginBottom: 4,
            }}>
              <strong style={{ color: 'var(--inchiostro)' }}>{m.nome}</strong>
              <span>{quando(m.quando)}</span>
            </div>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5 }}>{m.testo}</p>
          </div>
        ))}
      </div>
    </main>
  )
}
