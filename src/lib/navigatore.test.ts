import test from 'node:test'
import assert from 'node:assert/strict'
import { collegamentoGoogle, collegamentoApple, collegamentoWaze, collegamento } from './navigatore.ts'

const lodi = { lat: 45.3142, lng: 9.5033 }
const fanfulla = { lat: 45.3168, lng: 9.4998 }
const milano = { lat: 45.4419, lng: 9.2447 }

test('Google riceve il giro intero, con le fermate nell’ordine', () => {
  const u = new URL(collegamentoGoogle([lodi, fanfulla, milano]))
  assert.equal(u.searchParams.get('origin'), '45.3142,9.5033')
  assert.equal(u.searchParams.get('destination'), '45.4419,9.2447')
  assert.equal(u.searchParams.get('waypoints'), '45.3168,9.4998')
  assert.equal(u.searchParams.get('travelmode'), 'driving')
})

test('senza fermate intermedie non si manda un parametro vuoto', () => {
  const u = new URL(collegamentoGoogle([lodi, milano]))
  assert.equal(u.searchParams.get('waypoints'), null)
})

test('Apple e Waze puntano alla PROSSIMA fermata, non alla destinazione', () => {
  // Non reggono le tappe: meglio una navigazione giusta verso il prossimo
  // ritiro che una sbagliata verso la fine del giro.
  assert.ok(collegamentoApple(fanfulla).includes('45.3168,9.4998'))
  assert.ok(collegamentoWaze(fanfulla).includes('45.3168,9.4998'))
  assert.ok(collegamento('apple', [lodi, fanfulla, milano]).includes('45.3168'))
  assert.ok(collegamento('waze', [lodi, fanfulla, milano]).includes('45.3168'))
})

test('con meno di due tappe non si apre niente', () => {
  assert.equal(collegamentoGoogle([lodi]), '')
  assert.equal(collegamento('google', []), '')
})

test('le coordinate non finiscono mai fuori dal parametro', () => {
  // Un’etichetta con un carattere strano non deve poter uscire dall’URL.
  const u = collegamentoGoogle([
    { ...lodi, etichetta: 'Bar "da Gigi" & C. #1' }, milano,
  ])
  assert.doesNotThrow(() => new URL(u))
  assert.ok(!u.includes('"'))
})
