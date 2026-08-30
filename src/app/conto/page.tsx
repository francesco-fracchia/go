import { riepilogo } from '../../server/conto.ts'
import { richiediUtente } from '../../server/auth.ts'
import { Conto } from '../../components/Conto.tsx'

export const dynamic = 'force-dynamic'

import { guscio } from '../../server/guscio.ts'
import { Telaio } from '../../components/Telaio.tsx'

export default async function Pagina() {
  return <Telaio attiva="/profilo" {...await guscio()}><Conto c={await riepilogo(await richiediUtente())} /></Telaio>
}
