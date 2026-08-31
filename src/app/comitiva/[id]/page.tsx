import { notFound } from 'next/navigation'
import { Telaio } from '../../../components/Telaio.tsx'
import { Comitiva } from '../../../components/Comitiva.tsx'
import { guscio } from '../../../server/guscio.ts'
import { richiediUtente } from '../../../server/auth.ts'
import { db } from '../../../server/db.ts'
import { faParte, turno, chiTocca, conto, codiceDi } from '../../../server/comitive.ts'

export const dynamic = 'force-dynamic'

export default async function Pagina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const utente = await richiediUtente()

  // Chi non fa parte della comitiva non ne vede nemmeno il nome: l'elenco
  // di chi esce stasera è la cosa più privata che questa applicazione tenga.
  if (!await faParte(utente, id)) notFound()

  const [g, riga, membri, codice] = await Promise.all([
    guscio(),
    db.from('comitive').select('nome').eq('id', id).single(),
    turno(id),
    codiceDi(id),
  ])
  if (!riga.data) notFound()

  return (
    <Telaio {...g}>
      <Comitiva id={id} nome={riga.data.nome} codice={codice}
        membri={conto(membri)} tocca={chiTocca(membri)?.id ?? null} io={utente} />
    </Telaio>
  )
}
