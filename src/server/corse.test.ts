import test from 'node:test'
import assert from 'node:assert/strict'

/**
 * Niente chiavi e niente rete.
 *
 * `DEMO` si legge quando i moduli vengono caricati, e `import` viene
 * valutato prima del corpo del file: impostarla in cima con importazioni
 * normali arriverebbe comunque tardi, e il calcolo del percorso
 * pretenderebbe la chiave del servizio di navigazione. Con le importazioni
 * differite l'ordine è quello scritto.
 */
process.env.DEMO = '1'

const { db, usaDatabase } = await import('./db.ts')
const { fintoClient } = await import('./demo/finto.ts')
const { datiDemo, funzioniDemo, IO } = await import('./demo/dati.ts')

// Il database in memoria, consegnato a mano prima che qualcuno lo chieda.
const tabelle = datiDemo()
usaDatabase(fintoClient(tabelle, funzioniDemo(tabelle)))

const { pubblicaCorsa } = await import('./corse.ts')

/**
 * La dichiarazione di privato deve essere REGISTRATA, non solo pretesa.
 *
 * È il difetto che aveva bloccato la pubblicazione per tutti: il modulo
 * chiedeva la spunta, il server controllava il campo sul profilo, e niente
 * al mondo scriveva mai quel campo. La casella era decorativa, la corsa non
 * partiva mai, e il messaggio d'errore — «manca la dichiarazione di
 * privato» — compariva proprio a chi l'aveva appena data.
 *
 * Non è un dettaglio di modulo: quella dichiarazione è l'unico documento
 * che, utente per utente, dice perché quel passaggio non è un trasporto
 * abusivo. Una corsa pubblicata senza è una corsa senza giustificazione.
 */

const PARTENZA = { label: 'Lodi, piazza della Vittoria', lat: 45.3142, lng: 9.5033 }
const ARRIVO = { label: 'Fabrique, Milano', lat: 45.4869, lng: 9.1284 }

const richiesta = (dichiarazione?: boolean) => ({
  conducenteId: IO,
  veicoloId: 'v-mia',
  origine: PARTENZA,
  destinazione: ARRIVO,
  oraArrivo: new Date(Date.now() + 6 * 3600_000),
  postiOfferti: 2,
  modalita: 'pubblica' as const,
  dichiarazione,
})

/** Si riparte da un profilo che non ha mai dichiarato niente. */
async function azzera() {
  await db.from('profili')
    .update({ dichiarazione_privato: false, dichiarazione_il: null })
    .eq('id', IO)
}

test('senza la spunta non si pubblica', async () => {
  await azzera()
  await assert.rejects(
    () => pubblicaCorsa(richiesta(undefined)),
    (e: Error & { codice?: string }) => e.codice === 'dichiarazione',
  )
})

test('una spunta falsa non vale come dichiarazione', async () => {
  await azzera()
  await assert.rejects(
    () => pubblicaCorsa(richiesta(false)),
    (e: Error & { codice?: string }) => e.codice === 'dichiarazione',
  )
})

test('con la spunta la corsa parte e la dichiarazione resta scritta', async () => {
  await azzera()
  const esito = await pubblicaCorsa(richiesta(true))
  assert.ok(esito.corsa.id, 'la corsa deve esistere')

  const { data } = await db.from('profili')
    .select('dichiarazione_privato, dichiarazione_il').eq('id', IO).single()

  assert.equal(data?.dichiarazione_privato, true,
    'la dichiarazione deve essere registrata sul profilo, non solo spuntata nel browser')
  assert.ok(data?.dichiarazione_il, 'senza data non è un documento')
})

test('chi ha già dichiarato non deve rispuntare ogni volta', async () => {
  // La prima pubblicazione ha lasciato il campo a true: la seconda non
  // deve chiedere di nuovo qualcosa che è già agli atti.
  const esito = await pubblicaCorsa(richiesta(undefined))
  assert.ok(esito.corsa.id)
})
