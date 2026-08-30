import { stripe } from '../../../../server/stripe.ts'
import { segnaProntoAIncassare } from '../../../../server/conto.ts'
import { requireEnv } from '../../../../server/db.ts'
import { json } from '../../_risposta.ts'

/**
 * Webhook di Stripe.
 *
 * La firma si verifica SEMPRE: senza, chiunque conosca l'indirizzo può
 * dichiarare che un conducente è pronto a incassare.
 *
 * Serve il corpo grezzo, non il JSON già interpretato: la firma è calcolata
 * sui byte esatti, e riserializzare l'oggetto la invalida.
 */
export async function POST(req: Request) {
  const firma = req.headers.get('stripe-signature')
  if (!firma) return json({ errore: 'firma mancante' }, 400)

  let evento
  try {
    evento = stripe.webhooks.constructEvent(
      await req.text(), firma, requireEnv('STRIPE_WEBHOOK_SECRET'),
    )
  } catch (e) {
    console.error('firma webhook non valida:', e)
    return json({ errore: 'firma non valida' }, 400)
  }

  switch (evento.type) {
    case 'account.updated': {
      const a = evento.data.object
      // «Pronto» significa che Stripe accetta di trasferire: non basta che
      // il modulo sia stato compilato.
      await segnaProntoAIncassare(a.id, a.payouts_enabled === true)
      break
    }
    default:
      break
  }
  return json({ ricevuto: true })
}
