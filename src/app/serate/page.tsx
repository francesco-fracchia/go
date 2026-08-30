import { richiediUtente } from '../../server/auth.ts'
import { prossimeSerate } from '../../server/serate.ts'
import { GestioneSerate } from '../../components/GestioneSerate.tsx'

export const dynamic = 'force-dynamic'

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

  const serate = await prossimeSerate(30)
  return <GestioneSerate esistenti={serate.map((s) => ({
    id: s.id, locale: s.locale, citta: s.citta, inizio: s.inizio, corse: s.corsePubblicate,
  }))} />
}
