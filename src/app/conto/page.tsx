import { riepilogo } from '../../server/conto.ts'
import { richiediUtente } from '../../server/auth.ts'
import { Conto } from '../../components/Conto.tsx'

export const dynamic = 'force-dynamic'

import { Telaio } from '../../components/Telaio.tsx'

export default async function Pagina() {
  return <Telaio attiva="/profilo"><Conto c={await riepilogo(await richiediUtente())} /></Telaio>
}
