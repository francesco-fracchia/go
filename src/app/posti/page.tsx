import { postiVicini, type Categoria } from '../../server/posti.ts'
import { Posti } from '../../components/Posti.tsx'

export const revalidate = 120

const CASA = { lat: 45.3142, lng: 9.5033 }

import { Telaio } from '../../components/Telaio.tsx'

export default async function Pagina({ searchParams }: {
  searchParams: Promise<{ lat?: string; lng?: string; categoria?: string }>
}) {
  const q = await searchParams
  const lat = Number(q.lat), lng = Number(q.lng)
  const posizione = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : CASA

  // Se il database non risponde la schermata compare vuota invece di
  // esplodere: qui non c'è niente di critico da mostrare.
  let posti: Awaited<ReturnType<typeof postiVicini>> = []
  try {
    posti = await postiVicini({
      ...posizione, categoria: q.categoria as Categoria | undefined,
    })
  } catch { /* si mostra il vuoto */ }

  return <Telaio larga attiva="/posti"><Posti iniziali={posti} categoriaIniziale={q.categoria as Categoria | undefined} /></Telaio>
}
