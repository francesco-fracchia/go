import { notFound } from 'next/navigation'
import { Telaio } from '../../../components/Telaio.tsx'
import { Segnala } from '../../../components/Segnala.tsx'
import { guscio } from '../../../server/guscio.ts'
import { richiediUtente } from '../../../server/auth.ts'
import { db } from '../../../server/db.ts'
import { quando } from '../../../lib/tempo.ts'

export const dynamic = 'force-dynamic'

/**
 * Si segnala una PRENOTAZIONE, non una persona.
 *
 * Perché è la prenotazione a provare che i due si sono davvero incontrati:
 * senza, chiunque potrebbe accusare chiunque. È lo stesso ancoraggio delle
 * recensioni, ed è la ragione per cui né l'una né l'altra si possono
 * fabbricare dal nulla.
 */
export default async function Pagina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const utente = await richiediUtente()

  const { data: p } = await db
    .from('prenotazioni')
    .select(`id, passeggero, stato, totale_cent,
             corse!inner(conducente, ora_partenza, destinazione_label,
                         profili!corse_conducente_fkey(nome))`)
    .eq('id', id)
    .single()
  if (!p) notFound()

  const c = p.corse as unknown as {
    conducente: string; ora_partenza: string; destinazione_label: string
    profili: { nome: string } | null
  }
  // Chi non ha viaggiato su questa corsa non ne vede nemmeno l'esistenza.
  if (p.passeggero !== utente && c.conducente !== utente) notFound()

  const sonoPasseggero = p.passeggero === utente
  const [g, altro] = await Promise.all([
    guscio(),
    sonoPasseggero
      ? Promise.resolve(c.profili?.nome ?? 'chi guida')
      : db.from('profili').select('nome').eq('id', p.passeggero).single()
        .then((r) => r.data?.nome ?? 'chi è salito'),
  ])

  return (
    <Telaio {...g}>
      <Segnala prenotazione={p.id} chi={altro}
        quando={quando(c.ora_partenza)}
        rimborsabileCent={p.totale_cent}
        disdicibile={sonoPasseggero && ['richiesta', 'autorizzata'].includes(p.stato)} />
    </Telaio>
  )
}
