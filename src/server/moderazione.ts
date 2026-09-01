import { db } from './db.ts'
import { notifica } from './notifiche.ts'
import { GRAVI, type TipoSegnalazione } from './segnalazioni.ts'

/**
 * La coda che rende vera una promessa già fatta.
 *
 * Quando due segnalazioni indipendenti fermano un account, alla persona
 * sospesa arriva questo: «guardiamo cos'è successo e ti chiediamo la tua
 * versione prima di decidere». Era una promessa che il prodotto non poteva
 * mantenere — le segnalazioni si scrivevano e non esisteva nessuna
 * schermata dove qualcuno potesse leggerle. La sospensione automatica
 * funzionava; l'istruttoria umana che la giustifica, no.
 *
 * Una sospensione cautelare senza istruttoria non è cautelare: è una
 * chiusura lenta.
 */

/**
 * Chi può moderare.
 *
 * Un elenco in una variabile d'ambiente, non un ruolo nel database:
 * finché a moderare è una persona sola, un sistema di ruoli è complessità
 * senza utilità. La regola stava scritta due volte — nella pagina e nella
 * rotta — ed è la forma classica del buco: se ne cambia una e l'altra
 * resta indietro, senza che niente si rompa.
 */
export function eModeratore(utente: string): boolean {
  return (process.env.MODERATORI ?? '')
    .split(',').map((s) => s.trim()).filter(Boolean).includes(utente)
}

/** Cosa serve per decidere: chi accusa, chi è accusato, e come raggiungerli. */
export interface VoceCoda {
  id: string
  tipo: TipoSegnalazione
  grave: boolean
  nota: string | null
  creata_il: string
  accusato: { id: string; nome: string; sospeso: boolean } | null
  autore: { id: string; nome: string; telefono: string | null; email: string | null } | null
  corsa: { partenza: string; destinazione: string; ora: string } | null
  /** Le altre segnalazioni aperte contro la stessa persona. */
  altre: number
}

export async function codaSegnalazioni(limite = 100): Promise<VoceCoda[]> {
  const { data } = await db
    .from('segnalazioni')
    .select(`
      id, tipo, nota, creata_il,
      autore:profili!segnalazioni_autore_fkey (id, nome, telefono, email),
      prenotazioni (
        passeggero,
        corse ( conducente, origine_label, destinazione_label, ora_partenza,
                profili:conducente (id, nome, sospeso) )
      )
    `)
    .is('chiusa_il', null)
    .order('creata_il', { ascending: true })
    .limit(limite)

  const righe = (data ?? []) as unknown as Array<Record<string, any>>

  /**
   * Chi è l'accusato dipende da chi ha scritto.
   *
   * Una segnalazione la può fare il passeggero contro il conducente o il
   * conducente contro il passeggero. Non c'è una colonna che lo dica: si
   * ricava da chi è l'autore. Sbagliarlo qui significa mostrare al
   * moderatore la persona sbagliata da sentire, che è peggio che non
   * mostrare niente.
   */
  const conteggi = new Map<string, number>()
  const voci: VoceCoda[] = []

  for (const r of righe) {
    const pren = r.prenotazioni
    const corsa = pren?.corse
    const cond = corsa?.profili
    const autoreId = r.autore?.id

    const accusaIlConducente = autoreId === pren?.passeggero
    const accusato = accusaIlConducente
      ? (cond ? { id: cond.id, nome: cond.nome, sospeso: cond.sospeso } : null)
      : null

    if (accusato) conteggi.set(accusato.id, (conteggi.get(accusato.id) ?? 0) + 1)

    voci.push({
      id: r.id,
      tipo: r.tipo,
      grave: GRAVI.includes(r.tipo),
      nota: r.nota,
      creata_il: r.creata_il,
      accusato,
      autore: r.autore ?? null,
      corsa: corsa
        ? { partenza: corsa.origine_label, destinazione: corsa.destinazione_label, ora: corsa.ora_partenza }
        : null,
      altre: 0,
    })
  }

  for (const v of voci) {
    if (v.accusato) v.altre = (conteggi.get(v.accusato.id) ?? 1) - 1
  }
  return voci
}

/** Gli account fermi adesso, con da quanto. */
export async function sospesi() {
  const { data } = await db
    .from('profili')
    .select('id, nome, cognome, email, telefono')
    .eq('sospeso', true)
  return data ?? []
}

/**
 * Chiudere una segnalazione.
 *
 * `fondata` decide solo cosa resta scritto: la riattivazione è una scelta
 * separata e volontaria. Chiudere un'accusa come infondata non riapre da
 * solo l'account, perché possono essercene altre aperte — e un ripristino
 * automatico su una sola assoluzione è come la sospensione automatica che
 * stiamo correggendo, solo nella direzione opposta.
 */
export async function decidi(
  segnalazione: string, fondata: boolean, nota: string,
): Promise<boolean> {
  const { error } = await db
    .from('segnalazioni')
    .update({
      esito: `${fondata ? 'fondata' : 'infondata'}: ${nota}`.slice(0, 500),
      chiusa_il: new Date().toISOString(),
    })
    .eq('id', segnalazione)
    .is('chiusa_il', null)
  return !error
}

/**
 * Riattivare un account fermo.
 *
 * Lo si dice alla persona. Una sospensione che finisce in silenzio lascia
 * qualcuno convinto di essere ancora escluso: se non si accorge che può
 * tornare, l'assoluzione non è servita a niente.
 */
export async function riattiva(profilo: string, motivo: string): Promise<boolean> {
  const { error } = await db
    .from('profili').update({ sospeso: false }).eq('id', profilo)
  if (error) return false

  await notifica({
    destinatario: profilo,
    tipo: 'account_sospeso',
    titolo: 'Il tuo account è di nuovo attivo',
    testo: motivo || 'Abbiamo guardato cos\'è successo. Puoi tornare a viaggiare.',
    url: '/',
    chiave: `riattivato:${profilo}:${Date.now()}`,
  })
  return true
}

/**
 * Chi ha superato le soglie di sistematicità.
 *
 * Le quattro soglie di avviso stavano in tabella da due migrazioni senza
 * un solo lettore: era un meccanismo di osservazione senza osservatore. La
 * tabella lo dice di sé stessa — «servono a far comparire un conducente in
 * una vista da guardare» — e la vista non era mai stata costruita.
 *
 * Non si blocca niente: il blocco per frequenza è stato tolto apposta,
 * perché senza lucro la sola frequenza non configura trasporto, e chi fa
 * Lodi–Milano ogni giorno per lavoro è il caso puro del «ci vado comunque».
 * Qui si guarda e basta.
 */
export async function osservati() {
  const { data: s } = await db.from('soglie_sistematicita').select('*').eq('id', 1).single()
  if (!s) return { soglie: null, conducenti: [] as any[] }

  const { data } = await db
    .from('sistematicita_conducenti')
    .select('conducente, corse_7g, corse_365g, incassato_365g_cent, ultima_corsa')
    .or(`corse_7g.gte.${s.corse_settimana_avviso},corse_365g.gte.${s.corse_anno_avviso}`)
    .order('corse_7g', { ascending: false })
    .limit(50)

  const righe = data ?? []
  if (righe.length === 0) return { soglie: s, conducenti: [] as any[] }

  const { data: nomi } = await db
    .from('profili').select('id, nome, cognome')
    .in('id', righe.map((r) => r.conducente))
  const per = new Map((nomi ?? []).map((n) => [n.id, n]))

  return {
    soglie: s,
    conducenti: righe.map((r) => ({
      ...r,
      profilo: per.get(r.conducente) ?? null,
      oltreSettimana: r.corse_7g >= s.corse_settimana_blocco,
      oltreAnno: r.corse_365g >= s.corse_anno_blocco,
    })),
  }
}
