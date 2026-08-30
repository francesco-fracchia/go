import { db } from './db.ts'
import { notifica } from './notifiche.ts'
import { ripartisciProcessore } from '../lib/pricing.ts'

/**
 * Chiusura del viaggio.
 *
 * Nel caso normale non fa nulla nessuno: il pagamento matura da solo 24 ore
 * dopo l'arrivo. Al passeggero si chiede una cosa sola, e solo se è andata
 * male.
 *
 * La versione precedente chiedeva al conducente di farsi mostrare un codice
 * da ciascun passeggero. Provava di più — la presenza fisica delle due
 * persone — ma faceva pagare tre gesti a ogni corsa riuscita per proteggere
 * dal caso raro. La fatica stava sul caso giusto invece che su quello
 * sbagliato.
 */

export const ORE_DI_RIPENSAMENTO = 24

/** Alla partenza: si fissa la data di sblocco e non serve altro. */
export async function apriFinestraEsito(corsaId: string): Promise<number> {
  const { data } = await db.rpc('apri_finestra_esito', { p_corsa: corsaId })
  return Number(data ?? 0)
}

/** Il job che paga tutto quello su cui nessuno ha detto niente. */
export async function sbloccaMaturate(): Promise<{ sbloccate: number }> {
  const { data } = await db.rpc('sblocca_maturate')
  return { sbloccate: Number(data ?? 0) }
}

/**
 * La domanda al passeggero, dopo l'arrivo.
 *
 * È formulata perché rispondere NON sia necessario: «se è andata bene non
 * devi fare niente». Chiedere una conferma attiva a chi è appena arrivato
 * alle quattro del mattino significa non riceverla, e poi non sapere se il
 * silenzio voglia dire «tutto bene» o «non ho letto».
 */
export async function chiediComEAndata(corsaId: string) {
  const { data: prenotazioni } = await db
    .from('prenotazioni')
    .select('id, passeggero, corse!inner(destinazione_label, conducente, profili:conducente(nome))')
    .eq('corsa', corsaId)
    .eq('stato', 'catturata')
    .eq('esito', 'atteso')

  for (const p of prenotazioni ?? []) {
    const c = p.corse as unknown as { profili: { nome: string } | null }
    await notifica({
      destinatario: p.passeggero,
      tipo: 'recensione_invito',
      titolo: 'Arrivato?',
      testo: `Se è andata bene non devi fare niente: fra un giorno ${c.profili?.nome ?? 'il conducente'} riceve la sua parte. Se è andata male, dillo ora.`,
      url: `/prenotazione/${p.id}`,
      corsa: corsaId,
      prenotazione: p.id,
      chiave: `esito:${p.id}`,
    })
  }
  return (prenotazioni ?? []).length
}

/** Il passeggero segnala. Blocca lo sblocco e apre una contestazione. */
export async function segnalaProblema(
  prenotazioneId: string, passeggeroId: string, nota: string,
): Promise<boolean> {
  const { data } = await db.rpc('segnala_problema', {
    p_prenotazione: prenotazioneId,
    p_passeggero: passeggeroId,
    p_nota: nota,
  })
  return data === true
}

/**
 * Il conducente dichiara che qualcuno non si è presentato.
 *
 * Non serve a farsi pagare — con lo sblocco automatico verrebbe pagato
 * comunque. Serve perché il posto risulti occupato senza colpa sua nelle
 * statistiche, e perché al passeggero arrivi la penale giusta.
 */
export async function segnaNonSalito(
  prenotazioneId: string, conducenteId: string,
): Promise<boolean> {
  const { data: p } = await db
    .from('prenotazioni')
    .select('id, corse!inner(conducente)')
    .eq('id', prenotazioneId)
    .single()
  const c = p?.corse as unknown as { conducente: string } | undefined
  if (!c || c.conducente !== conducenteId) return false

  await db.from('prenotazioni')
    .update({ esito: 'non_salito', esito_il: new Date().toISOString() })
    .eq('id', prenotazioneId)
  return true
}

export async function concludiCorsa(corsaId: string) {
  const aperte = await apriFinestraEsito(corsaId)
  await db.from('corse').update({ stato: 'conclusa' }).eq('id', corsaId)
  await chiediComEAndata(corsaId)
  return { finestreAperte: aperte }
}

/**
 * Quanto liquidare a un conducente.
 *
 * Si liquida il netto: la sua quota della commissione di incasso è già
 * scalata, quindi in banca arriva esattamente il numero che l'applicazione
 * gli mostrava. Un conducente che riceve meno di quanto letto non torna.
 */
export async function maturatoSettimana(conducenteId: string, settimana: string) {
  const { data } = await db
    .from('prenotazioni')
    .select('quota_cent, deviazione_cent, fee_cent, totale_cent, corse!inner(conducente)')
    .eq('corse.conducente', conducenteId)
    .eq('stato', 'completata')
    .neq('esito', 'problema')

  let netto = 0
  for (const p of data ?? []) {
    const r = ripartisciProcessore(p.totale_cent, p.quota_cent + p.deviazione_cent, p.fee_cent)
    netto += p.quota_cent + p.deviazione_cent - r.conducente
  }
  return { netto, prenotazioni: (data ?? []).length, settimana }
}
