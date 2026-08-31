import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { requireEnv } from '../../../server/db.ts'

/**
 * Il rientro da Google, da Apple, e dal collegamento per la password.
 *
 * Con il flusso PKCE il fornitore rimanda qui con un codice monouso, che va
 * scambiato con una sessione lato server: è l'unico posto dove si può
 * scrivere il biscotto della sessione, e senza questo scambio l'accesso con
 * Google finisce su una pagina che non sa chi sei.
 *
 * `vai` serve al collegamento della password, che deve atterrare sulla
 * schermata dove se ne sceglie una nuova invece che sulla casa.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const codice = url.searchParams.get('code')
  const ritorno = sicuro(url.searchParams.get('ritorno')) ?? '/'
  const vai = sicuro(url.searchParams.get('vai'))

  if (!codice) {
    return NextResponse.redirect(new URL('/entra?scaduto=1', url.origin))
  }

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

  const { error } = await supabase.auth.exchangeCodeForSession(codice)
  if (error) return NextResponse.redirect(new URL('/entra?scaduto=1', url.origin))

  if (vai) return NextResponse.redirect(new URL(vai, url.origin))

  /**
   * Chi arriva da Google non ha ancora un profilo su GO: ha una sessione.
   * Nome e cognome li conosciamo già dal fornitore, quindi non li
   * richiediamo — si passa direttamente dalla presentazione, che è dove
   * quel nome serve.
   */
  const { data: { user } } = await supabase.auth.getUser()
  const { data: p } = user
    ? await supabase.from('profili').select('id').eq('id', user.id).maybeSingle()
    : { data: null }

  const destinazione = p
    ? ritorno
    : `/benvenuto?ritorno=${encodeURIComponent(ritorno)}`
  return NextResponse.redirect(new URL(destinazione, url.origin))
}

/** Solo percorsi interni: un rientro verso l'esterno è un reindirizzamento aperto. */
const sicuro = (p: string | null) =>
  p && p.startsWith('/') && !p.startsWith('//') ? p : null
