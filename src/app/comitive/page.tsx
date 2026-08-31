import { Telaio } from '../../components/Telaio.tsx'
import { Comitive } from '../../components/Comitive.tsx'
import { guscio } from '../../server/guscio.ts'
import { richiediUtente } from '../../server/auth.ts'
import { mieComitive } from '../../server/comitive.ts'

export const dynamic = 'force-dynamic'

export default async function Pagina() {
  const utente = await richiediUtente()
  const [g, comitive] = await Promise.all([guscio(), mieComitive(utente)])
  return <Telaio {...g}><Comitive comitive={comitive} /></Telaio>
}
