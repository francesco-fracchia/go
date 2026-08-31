import { db } from '../../server/db.ts'
import { richiediUtente } from '../../server/auth.ts'
import { metodoAttuale } from '../../server/pagamento.ts'
import { luoghiSalvati } from '../../server/preferiti.ts'
import { statoMappa } from '../../server/mappe.ts'
import { Impostazioni } from '../../components/Impostazioni.tsx'

export const dynamic = 'force-dynamic'

import { guscio } from '../../server/guscio.ts'
import { Telaio } from '../../components/Telaio.tsx'

export default async function Pagina() {
  const utente = await richiediUtente()
  const [{ data: p }, metodo, luoghi, mappa] = await Promise.all([
    db.from('profili').select('push_attive, sms_attivi, telefono').eq('id', utente).single(),
    metodoAttuale(utente).catch(() => null),
    luoghiSalvati(utente).catch(() => []),
    statoMappa().catch(() => ({ attiva: false })),
  ])
  return <Telaio attiva="/profilo" {...await guscio()}><Impostazioni iniziali={{
    push: p?.push_attive ?? true, sms: p?.sms_attivi ?? true, metodo,
    telefono: p?.telefono ?? null,
    luoghi, mappa: mappa.attiva,
  }} /></Telaio>
}
