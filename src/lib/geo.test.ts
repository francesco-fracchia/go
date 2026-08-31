import test from 'node:test'
import assert from 'node:assert/strict'
import { leggiPunto } from '../server/geo.ts'

/**
 * Il punto salvato di casa, come sta davvero nel database.
 *
 * Questo valore è preso da una riga vera: è «Vicolo Tito Speri, Lodi», e
 * per giorni è stato letto come zero, zero. Tenerlo qui significa che se
 * qualcuno riscrive questa lettura, il primo a lamentarsi è un test e non
 * qualcuno che sta cercando di pubblicare un viaggio alle due di notte.
 */
const CASA = '0101000020E61000005C8E57207A022340BD18CA8976A74640'

test('il WKB esadecimale di PostGIS si legge', () => {
  const p = leggiPunto(CASA)
  assert.ok(p, 'il punto deve esistere')
  assert.ok(Math.abs(p.lat - 45.31) < 0.05, `latitudine inattesa: ${p.lat}`)
  assert.ok(Math.abs(p.lng - 9.50) < 0.05, `longitudine inattesa: ${p.lng}`)
})

test('il GeoJSON continua a funzionare', () => {
  assert.deepEqual(leggiPunto({ coordinates: [9.5033, 45.3142] }), { lat: 45.3142, lng: 9.5033 })
  assert.deepEqual(leggiPunto('{"coordinates":[9.5033,45.3142]}'), { lat: 45.3142, lng: 9.5033 })
})

test('quello che non si legge non diventa zero', () => {
  // È il punto di tutto: prima `?? 0` faceva finire il viaggio nel Golfo
  // di Guinea, e il modulo lo accettava come una partenza qualunque.
  assert.equal(leggiPunto(null), null)
  assert.equal(leggiPunto(undefined), null)
  assert.equal(leggiPunto('non un punto'), null)
  assert.equal(leggiPunto({}), null)
  assert.equal(leggiPunto(''), null)
})

test('l’origine degli assi non è un luogo', () => {
  assert.equal(leggiPunto({ coordinates: [0, 0] }), null)
})

test('una linea non è un punto', () => {
  // Tipo 2 = LINESTRING: si rifiuta invece di leggere i primi due numeri
  // e spacciarli per una posizione.
  assert.equal(leggiPunto('0102000020E610000002000000' + '0'.repeat(64)), null)
})
