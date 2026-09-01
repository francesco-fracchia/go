import { Telaio } from '../../components/Telaio.tsx'
import { guscio } from '../../server/guscio.ts'
import { richiediUtente } from '../../server/auth.ts'
import { mieNotifiche, segnaLette } from '../../server/notifiche.ts'
import { quando } from '../../lib/tempo.ts'

export const dynamic = 'force-dynamic'

/**
 * Le notifiche.
 *
 * Esiste perché il push non basta: è un permesso che si può negare, che su
 * iPhone richiede di installare l'applicazione, e che in produzione non
 * aveva concesso nessuno. Senza questa schermata ogni avviso — prenotazione
 * accettata, corsa annullata, account sospeso — spariva nel momento in cui
 * non c'era un telefono pronto a riceverlo.
 */
export default async function Pagina() {
  const utente = await richiediUtente()
  const g = await guscio()
  const elenco = await mieNotifiche(utente)

  /**
   * Si segnano lette DOPO aver letto l'elenco, non prima.
   *
   * Invertendo le due righe il pallino si spegnerebbe correttamente e
   * questa schermata mostrerebbe tutto come già visto: chi apre non
   * riconoscerebbe più cosa era nuovo, che è l'unica cosa che era venuto
   * a sapere.
   */
  const nuove = new Set(elenco.filter((n) => !n.letta_il).map((n) => n.id))
  if (nuove.size > 0) await segnaLette(utente)

  return (
    <Telaio {...g} daLeggere={0}>
      <main style={{ maxWidth: 620, margin: '0 auto', padding: '24px 20px 60px' }}>
        <h1 style={{ fontSize: 26, marginBottom: 6 }}>Notifiche</h1>
        <p style={{ margin: '0 0 24px', color: 'var(--tenue)', fontSize: 14.5 }}>
          {elenco.length === 0
            ? 'Qui arrivano le cose che ti riguardano: una richiesta accettata, una corsa annullata, un rimborso partito.'
            : 'Le più recenti prima.'}
        </p>

        <div style={{ display: 'grid', gap: 10 }}>
          {elenco.map((n) => {
            const nuova = nuove.has(n.id)
            const dentro = (
              <>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  {nuova && (
                    <span aria-label="nuova" style={{
                      width: 7, height: 7, borderRadius: 999, flexShrink: 0,
                      background: 'var(--accento)', transform: 'translateY(-1px)',
                    }} />
                  )}
                  <strong style={{ fontSize: 15.5, lineHeight: 1.4 }}>{n.titolo}</strong>
                  <span style={{
                    marginLeft: 'auto', fontSize: 12.5, color: 'var(--tenue)', whiteSpace: 'nowrap',
                  }}>
                    {quando(n.inviata_il)}
                  </span>
                </div>
                <p style={{
                  margin: '4px 0 0', fontSize: 14.5, lineHeight: 1.55,
                  color: 'var(--inchiostro-2)', paddingLeft: nuova ? 15 : 0,
                }}>
                  {n.testo}
                </p>
              </>
            )

            const stile = {
              display: 'block', padding: '14px 16px',
              borderRadius: 'var(--raggio-s)', textDecoration: 'none',
              color: 'var(--inchiostro)',
              background: nuova ? 'var(--accento-velo)' : 'var(--carta)',
              border: '1px solid var(--riga)',
            } as const

            return n.url
              ? <a key={n.id} href={n.url} style={stile}>{dentro}</a>
              : <div key={n.id} style={stile}>{dentro}</div>
          })}
        </div>
      </main>
    </Telaio>
  )
}
