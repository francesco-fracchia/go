import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { viaggioDaToken } from '../../../server/scorta.ts'
import { SeguiViaggio } from '../../../components/SeguiViaggio.tsx'

export const dynamic = 'force-dynamic'

/**
 * Fuori dal motore di ricerca, sempre.
 *
 * È un indirizzo che contiene dove sta andando una persona stanotte.
 * Indicizzarlo sarebbe l'esatto contrario di quello che questa pagina
 * serve a fare.
 */
export const metadata: Metadata = {
  title: 'Un viaggio su GO',
  robots: { index: false, follow: false },
}

/**
 * La pagina che apre chi non ha GO.
 *
 * Nessun telaio, nessuna barra, nessun invito a registrarsi: chi arriva qui
 * è preoccupato per qualcuno, non è un potenziale utente. Mettergli davanti
 * un «scarica l'app» in quel momento sarebbe la cosa più sgradevole che
 * questo prodotto possa fare.
 */
export default async function Pagina({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const v = await viaggioDaToken(token)
  // Scaduto e inesistente rispondono uguale: chi prova indirizzi a caso non
  // deve poter distinguere fra «sbagliato» e «finito ieri».
  if (!v) notFound()
  return <SeguiViaggio v={v} />
}
