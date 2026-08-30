import { riepilogo } from '../../server/conto.ts'
import { richiediUtente } from '../../server/auth.ts'
import { Conto } from '../../components/Conto.tsx'

export const dynamic = 'force-dynamic'

export default async function Pagina() {
  return <Conto c={await riepilogo(await richiediUtente())} />
}
