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
/** Protette insieme a tutto quello che ci sta sotto. */
const PROTETTE = [
  '/viaggi', '/pubblica', '/conto', '/veicoli', '/impostazioni',
  '/prenotazione', '/chat', '/recensione', '/cerco', '/moderazione', '/notifiche',
  '/serate',
]

/**
 * Protette SOLO esattamente così.
 *
 * `/profilo` senza altro è il tuo, e richiede di sapere chi sei.
 * `/profilo/qualcuno` è il profilo di un altro, e si guarda prima di
 * decidere se salire in macchina con lui — anche senza essersi registrati.
 */
const PROTETTE_ESATTE = ['/profilo']

export async function middleware(req: NextRequest) {
  // In dimostrazione si è già dentro: chiedere di registrarsi per guardare
  // l'applicazione svuoterebbe la dimostrazione.
  if (process.env.DEMO === '1') return NextResponse.next()

  const percorso = req.nextUrl.pathname
  /**
   * Il confronto si ferma al confine della parola.
   *
   * Con un semplice `startsWith`, `/viaggio/xyz` risultava protetto da
   * `/viaggi`: «viaggio» comincia per «viaggi». La pagina fatta apposta per
   * chi NON ha un account — quella che si manda a casa uscendo la sera —
   * rimandava alla schermata di accesso.
   *
   * È il genere di difetto che non si vede rileggendo l'elenco, perché
   * l'elenco è giusto: sbagliato era il modo di confrontarlo. E si è
   * manifestato solo il giorno in cui è nata una rotta il cui nome
   * cominciava come un'altra.
   */
  const dentro = (p: string) => percorso === p || percorso.startsWith(`${p}/`)
  const protetta = PROTETTE.some(dentro) || PROTETTE_ESATTE.includes(percorso)

  /**
   * Senza le chiavi si lascia passare.
   *
   * Un middleware che solleva porta giù OGNI pagina del sito, comprese
   * quelle che non hanno bisogno di sapere chi sei: la prima cosa che si
   * vede al primo dispiegamento è un errore 500 su tutto. Meglio far
   * passare la richiesta e lasciare che sia la pagina a dire cosa manca —
   * senza database non c'è comunque niente da proteggere.
   */
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const chiave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !chiave) return NextResponse.next()

  let risposta = NextResponse.next({ request: req })

  const supabase = createServerClient(
    url,
    chiave,
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

  // E se la verifica fallisce per qualunque altra ragione — rete, servizio
  // giù, sessione illeggibile — si lascia passare invece di rompere tutto.
  let utente = null
  try {
    const { data } = await supabase.auth.getUser()
    utente = data.user
  } catch {
    return risposta
  }

  // Su una pagina aperta si passa comunque: qui la sessione è stata
  // rinnovata, che è l'unica ragione per cui il middleware gira anche lì.
  if (!protetta) return risposta

  if (!utente) {
    const entra = new URL('/entra', req.url)
    entra.searchParams.set('ritorno', percorso + req.nextUrl.search)
    return NextResponse.redirect(entra)
  }
  return risposta
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json|.*\\.png$).*)'],
}
