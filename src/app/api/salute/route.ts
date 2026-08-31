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
      /* Senza questo i lavori programmati rispondono 401 e non gira niente:
         né la cattura dei pagamenti, né i promemoria, né la cancellazione
         delle posizioni. Vale la pena poterlo controllare da fuori. */
      lavori: c('CRON_SECRET'),
      // Acceso mostra la causa degli errori a chiunque: utile ora, da
      // spegnere prima di aprire le iscrizioni.
      dettagliErrori: process.env.DETTAGLI_ERRORI === '1',
      notifiche: c('VAPID_PRIVATE_KEY'),
      sms: c('TWILIO_SID'),
    },
  })
}
