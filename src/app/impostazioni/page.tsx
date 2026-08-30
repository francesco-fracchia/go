import { db } from '../../server/db.ts'
import { richiediUtente } from '../../server/auth.ts'
import { metodoAttuale } from '../../server/pagamento.ts'
import { Impostazioni } from '../../components/Impostazioni.tsx'

export const dynamic = 'force-dynamic'

import { Telaio } from '../../components/Telaio.tsx'

export default async function Pagina() {
  const utente = await richiediUtente()
  const [{ data: p }, metodo] = await Promise.all([
    db.from('profili').select('push_attive, sms_attivi').eq('id', utente).single(),
    metodoAttuale(utente).catch(() => null),
  ])
  return <Telaio attiva="/profilo"><Impostazioni iniziali={{
    push: p?.push_attive ?? true, sms: p?.sms_attivi ?? true, metodo,
  }} /></Telaio>
}
