import test from 'node:test'
import assert from 'node:assert/strict'

process.env.DEMO = '1'
const { usaDatabase } = await import('./db.ts')
const { fintoClient } = await import('./demo/finto.ts')
const { datiDemo, funzioniDemo, IO } = await import('./demo/dati.ts')
const tabelle = datiDemo()
usaDatabase(fintoClient(tabelle, funzioniDemo(tabelle)))
const { cerca } = await import('./ricerca.ts')

/**
 * Non ci si propone le proprie corse.
 *
 * Il server rifiuta di far prenotare la propria corsa — «non si prenota la
 * propria corsa» — quindi ogni riga di quelle è un risultato che occupa lo
 * spazio di uno vero e finisce in un vicolo cieco. Peggio: aprendola si
 * arriva alla schermata di chi guida, cioè dall'altra parte
 * dell'applicazione rispetto a quella in cui si stava cercando. È successo,
 * e da fuori sembra che l'applicazione abbia cambiato idea da sola.
 */

const FILTRI = {
  origine: { lat: 45.3142, lng: 9.5033 },
  destinazione: { lat: 45.4419, lng: 9.2447 },
  da: new Date(Date.now() - 6 * 3600_000),
  a: new Date(Date.now() + 12 * 3600_000),
}

test('senza esclusione ci sono anche le mie corse', async () => {
  const r = await cerca(FILTRI)
  assert.ok(r.some((x) => x.conducente === IO),
    'la prova serve solo se fra i dati c’è una corsa mia')
})

test('chi cerca non trova le proprie corse', async () => {
  const r = await cerca({ ...FILTRI, escludi: IO })
  assert.equal(r.filter((x) => x.conducente === IO).length, 0)
})

test('escludere me non toglie le corse degli altri', async () => {
  const tutte = await cerca(FILTRI)
  const senzaLeMie = await cerca({ ...FILTRI, escludi: IO })
  const altrui = tutte.filter((x) => x.conducente !== IO).length
  assert.equal(senzaLeMie.length, altrui)
  assert.ok(altrui > 0, 'devono restare le corse di qualcun altro')
})

test('senza utente non si esclude niente', async () => {
  // Chi non è entrato può guardare i risultati: `escludi` nullo non deve
  // diventare un filtro che toglie tutto.
  const r = await cerca({ ...FILTRI, escludi: null })
  assert.ok(r.length > 0)
})
