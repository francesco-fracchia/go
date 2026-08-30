import { notFound, redirect } from 'next/navigation'
import { db } from '../../../server/db.ts'

/**
 * Aprire un invito.
 *
 * Il collegamento porta direttamente alla corsa, senza chiedere di
 * registrarsi prima: chi riceve un invito nel gruppo del sabato sera deve
 * poter vedere che cosa gli stanno proponendo — dove, quando, quanto — e
 * decidere. Il numero di telefono glielo chiediamo quando prenota.
 */
export default async function Pagina({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const { data } = await db
    .from('corse')
    .select('id, stato')
    .eq('token_link', token)
    .maybeSingle()

  if (!data) notFound()
  if (!['pubblicata', 'confermata'].includes(data.stato)) {
    return (
      <main style={{ maxWidth: 420, margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 24, marginBottom: 10 }}>Questa corsa non c&apos;è più</h1>
        <p style={{ color: 'var(--inchiostro-2)', fontSize: 15, marginBottom: 24 }}>
          È partita o è stata annullata.
        </p>
        <a href="/" style={{ fontWeight: 600 }}>Cerca un passaggio →</a>
      </main>
    )
  }
  redirect(`/corsa/${data.id}`)
}
