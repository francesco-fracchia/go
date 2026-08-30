import { utenteCorrente } from '../../../server/auth.ts'
import { db } from '../../../server/db.ts'
import { json } from '../_risposta.ts'
import { cookies } from 'next/headers'

/**
 * Chi sono, secondo il server.
 *
 * Esiste per una ragione sola: quando l'accesso «non funziona» ci sono
 * quattro punti in cui può rompersi — il biscotto non c'è, c'è ma il
 * server non lo legge, lo legge ma la sessione è scaduta, la sessione c'è
 * ma manca il profilo. Da fuori sembrano la stessa cosa, e senza questa
 * rotta si tira a indovinare.
 */
export async function GET() {
  const store = await cookies()
  const biscotti = store.getAll().map((c) => c.name).filter((n) => n.startsWith('sb-'))

  const utente = await utenteCorrente().catch((e) => ({ errore: String(e) }))
  if (typeof utente !== 'string') {
    return json({ biscotti, sessione: null, profilo: null, ...(utente ?? {}) })
  }

  const { data } = await db.from('profili')
    .select('id, nome, cognome, email').eq('id', utente).maybeSingle()

  return json({ biscotti, sessione: utente, profilo: data ?? null })
}
