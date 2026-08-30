import { notFound } from 'next/navigation'
import { db } from '../../../server/db.ts'
import { richiediUtente } from '../../../server/auth.ts'
import { messaggi } from '../../../server/chat.ts'
import { Chat, type Messaggio } from '../../../components/Chat.tsx'

export default async function Pagina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const utente = await richiediUtente()

  const { data: corsa } = await db
    .from('corse')
    .select('id, destinazione_label, ora_partenza')
    .eq('id', id)
    .single()
  if (!corsa) notFound()

  const righe = await messaggi(id, utente)
  const iniziali: Messaggio[] = righe.map((m) => ({
    id: m.id, autore: m.autore, testo: m.testo, creatoIl: m.creato_il,
    nomeAutore: (m.profili as unknown as { nome: string } | null)?.nome ?? '',
  }))

  const ora = new Date(corsa.ora_partenza)
    .toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })

  return <Chat corsaId={id} mio={utente} iniziali={iniziali}
    titolo={`${corsa.destinazione_label} · ${ora}`} />
}
