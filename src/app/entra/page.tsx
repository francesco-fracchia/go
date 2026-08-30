import { Entra } from '../../components/Entra.tsx'

export default async function Pagina({ searchParams }: {
  searchParams: Promise<{ ritorno?: string }>
}) {
  const { ritorno } = await searchParams
  // Solo percorsi interni: un ritorno verso l'esterno sarebbe un reindirizzamento
  // aperto, cioè un regalo a chiunque voglia costruire una pagina di accesso finta.
  const sicuro = ritorno?.startsWith('/') && !ritorno.startsWith('//') ? ritorno : '/'
  return <Entra ritorno={sicuro} />
}
