import { json } from '../_risposta.ts'

/**
 * Che cosa è vivo, qui.
 *
 * Esiste perché la stessa domanda è tornata tre volte: «l'applicazione che
 * sto guardando ha già la correzione?». Senza una risposta si finisce a
 * indovinare dal comportamento — e si indovina male, perché un difetto
 * corretto e un difetto diverso si somigliano da fuori.
 *
 * Dice il commit e SE una chiave c'è. Mai il suo valore, mai la sua
 * lunghezza, mai un pezzo: sapere che una chiave manca serve a chi la deve
 * mettere, sapere com'è fatta serve solo a chi la vuole usare.
 */
export async function GET() {
  const c = (nome: string) => Boolean(process.env[nome])

  return json({
    commit: (process.env.VERCEL_GIT_COMMIT_SHA ?? 'locale').slice(0, 7),
    ambiente: process.env.VERCEL_ENV ?? 'sviluppo',
    chiavi: {
      supabase: c('NEXT_PUBLIC_SUPABASE_URL') && c('SUPABASE_SERVICE_ROLE_KEY'),
      percorsi: c('ORS_API_KEY'),
      mappe: c('NEXT_PUBLIC_MAPTILER_KEY'),
      pagamenti: c('STRIPE_SECRET_KEY') && c('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'),
      // Il collegamento di rientro dopo l'iscrizione a Stripe: senza, chi
      // guida finisce l'iscrizione e resta sul sito di Stripe.
      ritorni: c('NEXT_PUBLIC_URL'),
      firmaWebhook: c('STRIPE_WEBHOOK_SECRET'),
      notifiche: c('VAPID_PRIVATE_KEY'),
      sms: c('TWILIO_SID'),
    },
    /**
     * I nomi che la funzione vede davvero — mai i valori.
     *
     * Esiste perché «l'ho messa e ho fatto redeploy» e «la chiave c'è» sono
     * due fatti diversi, e da fuori si somigliano. Una variabile scritta
     * STRIPE_WEBOOK_SECRET, o aggiunta all'ambiente Preview invece che
     * Production, sparisce senza un errore: `process.env` risponde
     * `undefined` e tace. Elencare i nomi trasforma mezz'ora di tentativi in
     * una riga letta.
     *
     * Da togliere quando le chiavi sono al loro posto: i nomi non sono un
     * segreto, ma non sono nemmeno affari di chi passa di qui.
     */
    nomiVisti: Object.keys(process.env)
      .filter((n) => /stripe|webhook/i.test(n))
      .sort(),
  })
}
