import test from 'node:test'
import assert from 'node:assert/strict'
import { haCoordinate } from '../server/luoghi.ts'

/**
 * Un suggerimento senza coordinate è peggio di un suggerimento in meno.
 *
 * Chi lo sceglie vede il campo riempirsi e il modulo dichiararsi completo;
 * poi il preventivo, il percorso e il prezzo falliscono dicendo che manca
 * una destinazione che lui ha appena scelto. È il guasto che accusa chi lo
 * subisce, ed è successo davvero.
 */

const dove = (lat: number, lng: number) => ({ lat, lng })

test('un luogo vero passa', () => {
  assert.equal(haCoordinate(dove(45.3142, 9.5033)), true)
})

test('NaN non passa — è quello che fa Number(undefined)', () => {
  assert.equal(haCoordinate(dove(NaN, 9.5)), false)
  assert.equal(haCoordinate(dove(45.3, NaN)), false)
})

test('il punto zero non passa: è l’Atlantico, non un indirizzo', () => {
  assert.equal(haCoordinate(dove(0, 0)), false)
})

test('uno zero solo resta legittimo', () => {
  // Il meridiano di Greenwich passa per la Francia e la Spagna: una
  // longitudine zero è un posto vero.
  assert.equal(haCoordinate(dove(45.3, 0)), true)
})

test('fuori dal mondo non passa', () => {
  assert.equal(haCoordinate(dove(91, 9)), false)
  assert.equal(haCoordinate(dove(45, 181)), false)
})
