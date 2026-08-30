import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { requireEnv, DEMO } from './db.ts'

/**
 * Identità dell'utente che sta facendo la richiesta.
 *
 * Usa la chiave anonima e la sessione, MAI la service key: qui si legge chi
 * è, e la service key non sa dirlo. Il client con i privilegi serve dopo,
 * per scrivere quello che l'utente non può scrivere da sé.
 */
export async function utenteCorrente(): Promise<string | null> {
  // In modalità dimostrativa si è sempre la stessa persona: chiedere di
  // registrarsi per guardare l'applicazione svuoterebbe la dimostrazione.
  if (DEMO) return 'demo-io'

  const store = await cookies()
  const supabase = createServerClient(
    requireEnv('SUPABASE_URL'),
    requireEnv('SUPABASE_ANON_KEY'),
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (c) => { for (const x of c) store.set(x.name, x.value, x.options) },
      },
    },
  )
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

export class NonAutenticato extends Error {
  constructor() { super('autenticazione richiesta'); this.name = 'NonAutenticato' }
}

export async function richiediUtente(): Promise<string> {
  const id = await utenteCorrente()
  if (!id) throw new NonAutenticato()
  return id
}
