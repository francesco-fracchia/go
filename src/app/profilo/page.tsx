import { redirect } from 'next/navigation'
import { utentePagina } from '../../server/auth.ts'

/** Il tuo profilo: si risolve in quello con il tuo identificativo. */
export default async function Pagina() {
  redirect(`/profilo/${await utentePagina('/profilo')}`)
}
