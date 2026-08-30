import { daModerare } from '../../server/recensioni.ts'
import { richiediUtente } from '../../server/auth.ts'
import { Riquadro, Etichetta } from '../../components/base.tsx'
import { ModeraRecensione } from '../../components/ModeraRecensione.tsx'

export const dynamic = 'force-dynamic'

/**
 * La coda di moderazione.
 *
 * Sta dietro un elenco di identificativi in una variabile d'ambiente e non
 * dietro un ruolo nel database: finché a moderare è una persona sola, un
 * sistema di ruoli è complessità senza utilità — e una superficie in più da
 * sbagliare.
 */
export default async function Pagina() {
  const utente = await richiediUtente()
  const ammessi = (process.env.MODERATORI ?? '').split(',').map((s) => s.trim())
  if (!ammessi.includes(utente)) {
    return (
      <main style={{ padding: 40, textAlign: 'center', color: 'var(--tenue)' }}>
        Non hai accesso a questa pagina.
      </main>
    )
  }

  const coda = await daModerare()

  return (
    <main style={{ maxWidth: 620, margin: '0 auto', padding: '24px 20px 60px' }}>
      <h1 style={{ fontSize: 26, marginBottom: 6 }}>Da moderare</h1>
      <p style={{ margin: '0 0 24px', color: 'var(--tenue)', fontSize: 14.5 }}>
        {coda.length === 0
          ? 'Niente in coda.'
          : `${coda.length} ${coda.length === 1 ? 'commento' : 'commenti'} in attesa. Il giudizio è già pubblico: qui si decide solo del testo.`}
      </p>

      <div style={{ display: 'grid', gap: 12 }}>
        {coda.map((r) => {
          const autore = r.autore as unknown as { nome: string } | null
          const dest = r.destinatario as unknown as { nome: string } | null
          return (
            <Riquadro key={r.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <Etichetta tono={r.positiva ? 'verde' : 'tenue'}>
                  {r.positiva ? 'positiva' : 'negativa'}
                </Etichetta>
                <span style={{ fontSize: 12.5, color: 'var(--tenue)' }}>
                  {autore?.nome} → {dest?.nome}
                </span>
              </div>
              {r.tag?.length > 0 && (
                <div style={{ fontSize: 13, color: 'var(--tenue)', marginBottom: 8 }}>
                  {r.tag.join(' · ')}
                </div>
              )}
              <p style={{ margin: '0 0 14px', fontSize: 15, lineHeight: 1.55 }}>
                «{r.testo}»
              </p>
              <ModeraRecensione id={r.id} />
            </Riquadro>
          )
        })}
      </div>
    </main>
  )
}
