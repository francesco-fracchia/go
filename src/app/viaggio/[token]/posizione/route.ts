import { viaggioDaToken } from '../../../../server/scorta.ts'
import { json } from '../../../api/_risposta.ts'

/**
 * Il punto, per chi segue.
 *
 * Passa dallo stesso token della pagina: chi non ce l'ha non ottiene niente,
 * e chi ce l'ha ottiene esattamente quello che la pagina già mostra — mai di
 * più. Non c'è nessuna autenticazione da aggiungere, perché il token È
 * l'autorizzazione, ed è quella che il viaggiatore ha scelto di dare.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params
  const v = await viaggioDaToken(token)
  if (!v) return json({ errore: 'non trovato' }, 404)
  return json({ posizione: v.posizione })
}
