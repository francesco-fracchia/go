import { db, DEMO } from './db.ts'
import { stripe } from './stripe.ts'

/**
 * Il metodo di pagamento del passeggero.
 *
 * Si salva UNA VOLTA e si riusa. Rifare l'inserimento della carta a ogni
 * prenotazione è la ragione più comune per cui una seconda prenotazione non
 * avviene: la prima può costare fatica, la ventesima no.
 *
 * Si usa un SetupIntent, non un pagamento: al momento in cui si salva la
 * carta non c'è niente da addebitare, e chiedere un euro «di verifica» per
 * poi restituirlo è il modo più veloce di far chiudere l'applicazione.
 */

export async function clienteStripe(utenteId: string): Promise<string> {
  if (DEMO) return 'cus_demo'
  const { data: p } = await db
    .from('profili')
    .select('stripe_cliente_id, nome, cognome, email, telefono')
    .eq('id', utenteId).single()
  if (!p) throw new Error('profilo non trovato')
  if (p.stripe_cliente_id) return p.stripe_cliente_id

  const cliente = await stripe.customers.create({
    name: `${p.nome} ${p.cognome}`,
    email: p.email ?? undefined,
    phone: p.telefono,
    metadata: { utente: utenteId },
  })
  await db.from('profili')
    .update({ stripe_cliente_id: cliente.id }).eq('id', utenteId)
  return cliente.id
}

/**
 * Prepara il salvataggio della carta.
 *
 * `off_session` dice a Stripe che la carta verrà usata più avanti senza
 * l'utente davanti allo schermo: è quello che fa raccogliere il consenso
 * SCA adesso, invece di far fallire l'autorizzazione la sera della corsa
 * con una richiesta di conferma che nessuno vedrà.
 */
export async function preparaCarta(utenteId: string) {
  if (DEMO) return { clientSecret: null, cliente: 'cus_demo' }
  const cliente = await clienteStripe(utenteId)
  const setup = await stripe.setupIntents.create({
    customer: cliente,
    usage: 'off_session',
    automatic_payment_methods: { enabled: true },
    metadata: { utente: utenteId },
  })
  return { clientSecret: setup.client_secret, cliente }
}

/** Salva il metodo scelto come predefinito. Chiamata a salvataggio riuscito. */
export async function salvaMetodo(utenteId: string, metodoId: string) {
  const cliente = await clienteStripe(utenteId)
  const metodo = await stripe.paymentMethods.retrieve(metodoId)

  if (metodo.customer && metodo.customer !== cliente) {
    throw new Error('metodo di pagamento di un altro utente')
  }
  if (!metodo.customer) {
    await stripe.paymentMethods.attach(metodoId, { customer: cliente })
  }

  // Marchio e ultime quattro cifre servono solo a mostrare «Visa ·· 4242»:
  // il numero della carta non transita e non si conserva.
  const carta = metodo.card
  await db.from('profili').update({
    metodo_pagamento: metodoId,
    metodo_marchio: carta?.brand ?? metodo.type,
    metodo_ultime4: carta?.last4 ?? null,
  }).eq('id', utenteId)

  return { marchio: carta?.brand ?? metodo.type, ultime4: carta?.last4 ?? null }
}

export async function metodoAttuale(utenteId: string) {
  const { data } = await db
    .from('profili')
    .select('metodo_pagamento, metodo_marchio, metodo_ultime4')
    .eq('id', utenteId).single()
  if (!data?.metodo_pagamento) return null
  return { marchio: data.metodo_marchio, ultime4: data.metodo_ultime4 }
}

export async function rimuoviMetodo(utenteId: string) {
  const { data } = await db
    .from('profili').select('metodo_pagamento').eq('id', utenteId).single()
  if (data?.metodo_pagamento) {
    try { await stripe.paymentMethods.detach(data.metodo_pagamento) } catch { /* già staccato */ }
  }
  await db.from('profili').update({
    metodo_pagamento: null, metodo_marchio: null, metodo_ultime4: null,
  }).eq('id', utenteId)
}
