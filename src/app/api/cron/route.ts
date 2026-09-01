import { REGISTRO } from '../../../server/registro-lavori.ts'
import { db } from '../../../server/db.ts'
import { json } from '../_risposta.ts'

/**
 * Esecutore dei lavori schedulati.
 *
 * Protetto da un segreto condiviso: senza, chiunque conosca l'indirizzo può
 * far partire il rimatch di tutte le corse della serata.
 *
 * Tutti i lavori sono idempotenti, quindi una doppia esecuzione è innocua —
 * ed è bene che lo sia, perché prima o poi capiterà.
 */

/**
 * Vercel chiama i cron in GET. Noi esportavamo solo POST.
 *
 * Risultato: `405 Method Not Allowed` a ogni esecuzione, per tutti e dieci i
 * lavori, in silenzio — nessun errore applicativo, nessun log
 * dell'applicazione, solo un codice di stato in una dashboard che nessuno
 * guarda. Vuol dire che in produzione non è mai partita una cattura di
 * pagamento, una ri-autorizzazione prima della scadenza Stripe, un
 * promemoria, un rimatch, né la cancellazione delle posizioni.
 *
 * È il difetto più costoso trovato finora, e il più silenzioso: tutto il
 * codice funzionava, non lo chiamava nessuno.
 */
export async function GET(req: Request) {
  return POST(req)
}

export async function POST(req: Request) {
  const atteso = process.env.CRON_SECRET
  if (!atteso || req.headers.get('authorization') !== `Bearer ${atteso}`) {
    return json({ errore: 'non autorizzato' }, 401)
  }

  const nome = new URL(req.url).searchParams.get('lavoro') ?? ''
  const lavoro = REGISTRO[nome]
  if (!lavoro) return json({ errore: `lavoro sconosciuto: ${nome}` }, 404)

  const inizio = Date.now()
  try {
    const esito = await lavoro()
    await segnaEsecuzione(nome, Date.now() - inizio, esito, null)
    return json({ lavoro: nome, esito, ms: Date.now() - inizio })
  } catch (e) {
    console.error(`lavoro ${nome} fallito:`, e)
    await segnaEsecuzione(nome, Date.now() - inizio, null, String(e))
    return json({ lavoro: nome, errore: String(e), ms: Date.now() - inizio }, 500)
  }
}

/**
 * Una riga per lavoro, sovrascritta: quando è girato l'ultima volta e com'è
 * andata.
 *
 * Nessuno teneva il conto delle esecuzioni, ed è il motivo per cui un `405`
 * su tutti e dieci i lavori è passato inosservato per settimane: il codice
 * funzionava, i cron partivano dalla parte di Vercel, e non c'era un posto
 * dove guardare per accorgersi che le due cose non si incontravano.
 *
 * Si SOVRASCRIVE invece di accumulare. Dodici lavori ogni cinque minuti
 * farebbero tremila righe al giorno di rumore, e la domanda a cui questa
 * tabella deve rispondere è una sola: «gira?». Per quella basta l'ultima.
 */
async function segnaEsecuzione(
  nome: string, ms: number, esito: unknown, errore: string | null,
) {
  try {
    await db.from('lavori').upsert({
      chiave: `ultimo:${nome}`,
      nome,
      durata_ms: ms,
      esito: esito === undefined ? null : JSON.stringify(esito).slice(0, 500),
      errore,
      eseguito_il: new Date().toISOString(),
    }, { onConflict: 'chiave' })
  } catch (e) {
    // Un registro che non si scrive non deve far fallire il lavoro che ha
    // appena funzionato.
    console.error('registro dei lavori non scritto:', e)
  }
}
