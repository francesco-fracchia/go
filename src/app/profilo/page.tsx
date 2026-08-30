import { redirect } from 'next/navigation'
import { richiediUtente } from '../../server/auth.ts'

export default async function Pagina() {
  redirect(`/profilo/${await richiediUtente()}`)
}
