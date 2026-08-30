import { db, requireEnv, DEMO } from './db.ts'
import { stripe } from './stripe.ts'

/**
 * Il conto del conducente.
 *
 * L'onboarding Stripe si chiede QUANDO I SOLDI CI SONO GIÀ, mai prima.
 * Un modulo di verifica identità chiesto alla registrazione fa perdere il
 * conducente prima che abbia visto un euro; lo stesso modulo, chiesto con
 * scritto «hai 12,40 € da ritirare», lo si compila.
 */

export async function creaAccountStripe(utenteId: string) {
  const { data: p } = await db
    .from('profili')
    .select('email, nome, cognome, stripe_account_id')
    .eq('id', utenteId).single()
  if (!p) throw new Error('profilo non trovato')
  if (p.stripe_account_id) return p.stripe_account_id

  const account = await stripe.accounts.create({
    type: 'express',
    country: 'IT',
    email: p.email ?? undefined,
    business_type: 'individual',
    capabilities: { transfers: { requested: true } },
    // Il conducente non è un esercente: non vende, riceve un rimborso spese.
    business_profile: { product_description: 'Condivisione spese di viaggio' },
    metadata: { utente: utenteId },
  })

  await db.from('profili')
    .update({ stripe_account_id: account.id })
    .eq('id', utenteId)
  return account.id
}

export async function collegamentoOnboarding(utenteId: string) {
  if (DEMO) return '/conto?fatto=1'
  const accountId = await creaAccountStripe(utenteId)
  const base = requireEnv('NEXT_PUBLIC_URL')
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${base}/conto?riprova=1`,
    return_url: `${base}/conto?fatto=1`,
    type: 'account_onboarding',
  })
  return link.url
}

/** Chiamata dal webhook quando Stripe dice che l'account è pronto. */
export async function segnaProntoAIncassare(accountId: string, pronto: boolean) {
  await db.from('profili')
    .update({ stripe_pronto: pronto })
    .eq('stripe_account_id', accountId)
}

/** Quello che il conducente vede nella sua pagina conto. */
export async function riepilogo(utenteId: string) {
  const [{ data: maturato }, { data: liquidazioni }, { data: p }] = await Promise.all([
    db.from('prenotazioni')
      .select('quota_cent, deviazione_cent, corse!inner(conducente)')
      .eq('corse.conducente', utenteId)
      .eq('stato', 'completata'),
    db.from('liquidazioni')
      .select('settimana, importo_cent, eseguita_il')
      .eq('conducente', utenteId)
      .order('settimana', { ascending: false })
      .limit(12),
    db.from('profili').select('stripe_pronto, stripe_account_id').eq('id', utenteId).single(),
  ])

  const inArrivo = (maturato ?? []).reduce((s, r) => s + r.quota_cent + r.deviazione_cent, 0)
  const totaleRicevuto = (liquidazioni ?? []).reduce((s, r) => s + r.importo_cent, 0)

  return {
    inArrivo,
    totaleRicevuto,
    liquidazioni: liquidazioni ?? [],
    contoCollegato: p?.stripe_pronto === true,
    onboardingIniziato: !!p?.stripe_account_id,
  }
}
