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
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
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

/**
 * Come `richiediUtente`, ma per le pagine: invece di sollevare, manda ad
 * accedere e torna dove si era.
 *
 * Un'eccezione dentro un componente server diventa una pagina bianca con
 * scritto 500, che non dice niente e non offre una via d'uscita. La
 * versione che reindirizza è quella giusta ovunque ci sia un utente
 * davanti; quella che solleva resta per le rotte, dove un 401 è la
 * risposta corretta.
 */
export async function utentePagina(percorso: string): Promise<string> {
  const id = await utenteCorrente()
  if (id) return id
  const { redirect } = await import('next/navigation')
  // `redirect` non torna mai, ma il compilatore non lo sa attraverso un
  // import dinamico: il throw esplicito glielo dice.
  redirect(`/entra?ritorno=${encodeURIComponent(percorso)}`)
  throw new NonAutenticato()
}
