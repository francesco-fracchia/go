import Stripe from 'stripe'
import { requireEnv, DEMO } from './db.ts'
import type { Cents } from '../lib/money.ts'

/**
 * Anche qui l'inizializzazione è pigra: il client si costruisce al primo uso,
 * non all'import, così il progetto si compila anche senza le chiavi.
 */
let cache: Stripe | null = null

export const stripe = new Proxy({} as Stripe, {
  get: (_, prop) => {
    if (!cache) {
      cache = new Stripe(requireEnv('STRIPE_SECRET_KEY'), { apiVersion: '2026-08-26.dahlia' })
    }
    const c = cache as unknown as Record<string | symbol, unknown>
    const v = c[prop]
    return typeof v === 'function' ? v.bind(c) : v
  },
})

/**
 * Autorizza senza incassare.
 *
 * `capture_method: 'manual'` è quello che risolve il problema del prezzo
 * che scende: si blocca lo scenario peggiore — passeggero solo a bordo — e
 * alla partenza si cattura l'importo reale, che è minore o uguale. Nessun
 * rimborso, nessuna commissione buttata, nessuna carta vuota scoperta
 * all'ultimo momento.
 *
 * Si usano charge separati e transfer distinti, non i destination charge:
 * l'incasso resta sul saldo piattaforma fino a fine corsa, così un
 * conducente che non si presenta non ha già i soldi in tasca.
 */
/**
 * In dimostrazione non si chiama Stripe.
 *
 * Le funzioni restituiscono quello che il resto del codice si aspetta,
 * senza toccare denaro né rete. È l'unico punto dove la modalità
 * dimostrativa mente, ed è quello dove deve.
 */
const finto = (prefisso: string) =>
  ({ id: `${prefisso}_demo_${Math.floor(Date.now() % 1e9)}` })

export async function autorizza(opts: {
  importo: Cents
  clienteId: string
  metodoPagamento: string
  prenotazioneId: string
  descrizione: string
}): Promise<Stripe.PaymentIntent> {
  if (DEMO) return finto('pi') as Stripe.PaymentIntent
  return stripe.paymentIntents.create(
    {
      amount: opts.importo,
      currency: 'eur',
      customer: opts.clienteId,
      payment_method: opts.metodoPagamento,
      capture_method: 'manual',
      confirm: true,
      off_session: false,
      description: opts.descrizione,
      metadata: { prenotazione: opts.prenotazioneId },
    },
    { idempotencyKey: `auth:${opts.prenotazioneId}` },
  )
}

/** Cattura l'importo reale, sempre ≤ autorizzato. */
export async function cattura(intentId: string, importo: Cents) {
  if (DEMO) return finto('pi') as Stripe.PaymentIntent
  return stripe.paymentIntents.capture(
    intentId,
    { amount_to_capture: importo },
    { idempotencyKey: `cap:${intentId}:${importo}` },
  )
}

export async function annulla(intentId: string) {
  if (DEMO) return finto('pi') as Stripe.PaymentIntent
  return stripe.paymentIntents.cancel(intentId)
}

/**
 * L'autorizzazione Stripe scade dopo circa sette giorni. Le corse pubblicate
 * con più anticipo vanno ri-autorizzate da un job schedulato, altrimenti alla
 * partenza non c'è niente da catturare.
 */
export const SCADENZA_AUTORIZZAZIONE_GIORNI = 7

/** Trasferisce al conducente. I transfer verso account collegati sono gratuiti. */
export async function liquida(opts: {
  conducenteStripeId: string
  importo: Cents
  settimana: string
}) {
  if (DEMO) return finto('tr') as Stripe.Transfer
  return stripe.transfers.create(
    {
      amount: opts.importo,
      currency: 'eur',
      destination: opts.conducenteStripeId,
      description: `GO — liquidazione settimana ${opts.settimana}`,
    },
    { idempotencyKey: `payout:${opts.conducenteStripeId}:${opts.settimana}` },
  )
}
