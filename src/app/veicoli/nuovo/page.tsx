import { FormVeicolo } from '../../../components/FormVeicolo.tsx'
import { guscio } from '../../../server/guscio.ts'
import { Telaio } from '../../../components/Telaio.tsx'

export const dynamic = 'force-dynamic'

export default async function Pagina() {
  return <Telaio attiva="/pubblica" {...await guscio()} modo="conducente"><FormVeicolo /></Telaio>
}
