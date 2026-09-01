import { db } from './db.ts'
import { annulla as annullaIntent, cattura } from './stripe.ts'
import { notifica } from './notifiche.ts'
import { rimatch } from './rimatch.ts'
import type { Cents } from '../lib/money.ts'
import { calcolaPenale } from '../lib/disdette.ts'

/**
 * Disdette.
 *
 * Le finestre sono quelle scritte sulla corsa prima di prenotare, e qui si
 * applicano esattamente come sono state promesse. Un prodotto che dice «fino
 * a un'ora prima» e poi trattiene per un ritardo di due minuti perde più di
 * quanto trattiene.
 *
 *   flessibile   gratis fino a 1 ora prima, poi niente rimborso
 *   rigida       gratis fino a 6 ore prima, poi metà, sotto le 2 ore niente
 *
 * La quota di servizio si trattiene sotto le 24 ore: a quel punto il lavoro
 * di incasso, autorizzazione e organizzazione l'abbiamo già fatto.
 */

export interface EsitoDisdetta {
  ok: boolean
  rimborsatoCent: Cents
  trattenutoCent: Cents
  messaggio: string
}

export async function disdiciPasseggero(
  prenotazioneId: string, passeggeroId: string,
  opts: {
    /**
     * Scendere senza pagare niente.
     *
     * Vale solo quando la disdetta nasce da una segnalazione grave — chi
     * guida ha bevuto, guida in modo pericoloso, si è comportato male. Una
     * penale in quel momento è un pedaggio per mettersi in salvo, e chi
     * ci pensa due volte prima di scendere per non perdere tre euro è
     * esattamente la persona che non vogliamo far salire.
     *
     * Non lo decide il client: lo passa `segnalazioni.ts` dopo aver
     * verificato che la segnalazione esista e che chi disdice sia chi ha
     * segnalato.
     */
    senzaPenale?: boolean
  } = {},
): Promise<EsitoDisdetta> {
  const { data: p } = await db
    .from('prenotazioni')
    .select(`id, stato, totale_cent, quota_cent, deviazione_cent, fee_cent,
             stripe_payment_intent,
             corse!inner(id, conducente, ora_partenza, politica, destinazione_label)`)
    .eq('id', prenotazioneId)
    .eq('passeggero', passeggeroId)
    .single()

  if (!p) return no('prenotazione non trovata')
  const c = p.corse as unknown as RigaCorsa
  if (!['richiesta', 'autorizzata'].includes(p.stato)) {
    return no('questa prenotazione non si può più disdire')
  }

  const oreMancanti = (new Date(c.ora_partenza).getTime() - Date.now()) / 3600_000
  const penale = calcolaPenale({
    oreMancanti,
    politica: c.politica,
    quotaConducente: p.quota_cent + p.deviazione_cent,
    fee: p.fee_cent,
    totale: p.totale_cent,
  })
  const { alConducente, daCatturare } = opts.senzaPenale
    ? { alConducente: 0, daCatturare: 0 }
    : penale

  if (p.stripe_payment_intent) {
    // Si cattura solo la penale e si lascia cadere il resto: l'autorizzazione
    // non catturata si libera da sola. Catturare tutto e poi rimborsare
    // costerebbe la commissione fissa di Stripe su denaro che restituiamo.
    if (daCatturare > 0) await cattura(p.stripe_payment_intent, daCatturare)
    else await annullaIntent(p.stripe_payment_intent)
  }

  await db.from('prenotazioni').update({
    stato: 'annullata',
    catturato_cent: daCatturare,
  }).eq('id', p.id)

  if (alConducente > 0) {
    await notifica({
      destinatario: c.conducente,
      tipo: 'corsa_annullata',
      titolo: 'Una persona ha disdetto',
      testo: `Ha disdetto tardi, quindi la sua quota resta a te. Il posto è di nuovo libero.`,
      url: `/corsa/${c.id}`,
      corsa: c.id,
      chiave: `disdetta:${p.id}`,
    })
  } else {
    await notifica({
      destinatario: c.conducente,
      tipo: 'corsa_annullata',
      titolo: 'Un posto si è liberato',
      testo: `Una persona ha disdetto in tempo per ${c.destinazione_label}.`,
      url: `/corsa/${c.id}`,
      corsa: c.id,
      chiave: `disdetta:${p.id}`,
    })
  }

  return {
    ok: true,
    rimborsatoCent: opts.senzaPenale ? p.totale_cent : penale.rimborso,
    trattenutoCent: daCatturare,
    messaggio: daCatturare === 0
      ? 'Disdetta senza costi.'
      : `Trattenuti ${(daCatturare / 100).toFixed(2).replace('.', ',')} €.`,
  }
}

/**
 * Il conducente annulla.
 *
 * Non gli si applica nessuna penale in denaro — sarebbe un debito verso di
 * noi difficile da esigere e facile da contestare. Quello che gli costa è il
 * distintivo «non annulla mai», che è la cosa che i passeggeri guardano per
 * prima. È una sanzione che si autoapplica e non richiede di rincorrere
 * nessuno.
 *
 * Ai passeggeri parte immediatamente il rimatch: è il momento in cui si
 * perde un utente per sempre, e un'ora prima è già tardi.
 */
export async function annullaCorsa(corsaId: string, conducenteId: string) {
  const { data: c } = await db
    .from('corse').select('id, conducente, stato').eq('id', corsaId).single()
  if (!c || c.conducente !== conducenteId) return { ok: false }
  if (['conclusa', 'annullata'].includes(c.stato)) return { ok: false }

  const esito = await rimatch(corsaId, 'annullata')
  return { ok: true, ...esito }
}

/** Il conducente conferma che parte. Toglie la corsa dal rimatch. */
export async function confermaCorsa(corsaId: string, conducenteId: string) {
  const { error } = await db.from('corse')
    .update({ stato: 'confermata' })
    .eq('id', corsaId)
    .eq('conducente', conducenteId)
    .eq('stato', 'pubblicata')
  return !error
}

const no = (m: string): EsitoDisdetta => ({
  ok: false, rimborsatoCent: 0, trattenutoCent: 0, messaggio: m,
})

interface RigaCorsa {
  id: string; conducente: string; ora_partenza: string
  politica: 'flessibile' | 'rigida' | 'nessuna'; destinazione_label: string
}
