import { notFound } from 'next/navigation'
import { db } from '../../../server/db.ts'
import { richiediUtente } from '../../../server/auth.ts'
import { Recensione } from '../../../components/Recensione.tsx'

export default async function Pagina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const utente = await richiediUtente()

  const { data: p } = await db
    .from('prenotazioni')
    .select('id, passeggero, corse!inner(conducente, profili:conducente(nome))')
    .eq('id', id)
    .single()
  if (!p) notFound()

  const c = p.corse as unknown as { conducente: string; profili: { nome: string } | null }
  const sonoPasseggero = p.passeggero === utente
  const altro = sonoPasseggero
    ? c.profili?.nome
    : (await db.from('profili').select('nome').eq('id', p.passeggero).single()).data?.nome

  // Le domande sono diverse nei due sensi: a chi guidava si chiede
  // dell'orario e della guida, a chi sale del bagaglio e dell'attesa.
  return <Recensione prenotazione={id} nome={altro ?? 'chi hai viaggiato'}
    ruolo={sonoPasseggero ? 'conducente' : 'passeggero'} />
}
