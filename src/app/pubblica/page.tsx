import { db } from '../../server/db.ts'
import { richiediUtente } from '../../server/auth.ts'
import { FormPubblica } from '../../components/FormPubblica.tsx'

export const dynamic = 'force-dynamic'

export default async function Pagina({ searchParams }: {
  searchParams: Promise<{ dlat?: string; dlng?: string; dove?: string }>
}) {
  const q = await searchParams
  const dlat = Number(q.dlat), dlng = Number(q.dlng)
  // Arrivando da un posto la destinazione è già scelta: chi ha toccato
  // «Ci vado io» ha già detto dove va, e ripeterglielo è una domanda in più.
  const destinazione = Number.isFinite(dlat) && Number.isFinite(dlng) && q.dove
    ? { etichetta: q.dove, lat: dlat, lng: dlng }
    : undefined

  const utente = await richiediUtente()
  const { data } = await db
    .from('veicoli')
    .select('id, marca, modello, posti_totali')
    .eq('proprietario', utente)
    .eq('attivo', true)

  return <FormPubblica destinazione={destinazione} veicoli={(data ?? []).map((v) => ({
    id: v.id, marca: v.marca, modello: v.modello, postiTotali: v.posti_totali,
  }))} />
}
