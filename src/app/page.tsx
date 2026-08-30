import { Cerca } from '../components/Cerca.tsx'
import { prossimeSerate } from '../server/serate.ts'

export const revalidate = 300

import { Telaio } from '../components/Telaio.tsx'

import { statoMappa } from '../server/mappe.ts'

export default async function Home({ searchParams }: {
  searchParams: Promise<{ dlat?: string; dlng?: string; dove?: string }>
}) {
  const q = await searchParams
  const dlat = Number(q.dlat), dlng = Number(q.dlng)
  const destinazione = Number.isFinite(dlat) && Number.isFinite(dlng) && q.dove
    ? { etichetta: q.dove, lat: dlat, lng: dlng }
    : undefined

  // Se il database non risponde la schermata deve comparire lo stesso: le
  // serate sono un contorno, la ricerca no.
  const { attiva: mappa } = await statoMappa().catch(() => ({ attiva: false }))
  let serate: Awaited<ReturnType<typeof prossimeSerate>> = []
  try { serate = await prossimeSerate() } catch { /* si mostra senza */ }
  return <Telaio attiva="/"><Cerca serate={serate} destinazione={destinazione} mappa={mappa} /></Telaio>
}
