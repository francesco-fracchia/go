import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Chi può vedere cosa.
 *
 * Le pagine pubbliche restano aperte: la ricerca, i risultati, il dettaglio
 * di una corsa e le pagine legali. Chi arriva da un collegamento condiviso
 * deve poter guardare cosa gli stanno proponendo PRIMA di registrarsi —
 * chiedere il numero di telefono per vedere un prezzo è il modo più veloce
 * di non avere utenti.
 *
 * Si chiede di entrare solo al momento di fare qualcosa, e con il ritorno
 * al posto giusto.
 */
const PROTETTE = [
  '/viaggi', '/pubblica', '/conto', '/veicoli',
  '/prenotazione', '/chat', '/recensione', '/cerco', '/moderazione',
]

export async function middleware(req: NextRequest) {
  // In dimostrazione si è già dentro: chiedere di registrarsi per guardare
  // l'applicazione svuoterebbe la dimostrazione.
  if (process.env.DEMO === '1') return NextResponse.next()

  const percorso = req.nextUrl.pathname
  if (!PROTETTE.some((p) => percorso.startsWith(p))) return NextResponse.next()

  let risposta = NextResponse.next({ request: req })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (biscotti) => {
          for (const c of biscotti) req.cookies.set(c.name, c.value)
          risposta = NextResponse.next({ request: req })
          for (const c of biscotti) risposta.cookies.set(c.name, c.value, c.options)
        },
      },
    },
  )

  const { data } = await supabase.auth.getUser()
  if (!data.user) {
    const entra = new URL('/entra', req.url)
    entra.searchParams.set('ritorno', percorso + req.nextUrl.search)
    return NextResponse.redirect(entra)
  }
  return risposta
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json|.*\\.png$).*)'],
}
