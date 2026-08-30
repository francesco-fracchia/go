import test from 'node:test'
import assert from 'node:assert/strict'
import { numero, punto } from '../app/api/_numeri.ts'

const q = (s: string) => new URLSearchParams(s)

test('un parametro assente non diventa zero', () => {
  // `Number(null)` fa 0, e `Number.isFinite(0)` è vero: senza questo
  // controllo un parametro mancante supera qualunque validazione e diventa
  // uno zero credibile.
  assert.equal(numero(q(''), 'lat'), undefined)
  assert.equal(numero(q('lat='), 'lat'), undefined)
  assert.equal(numero(q('lat=   '), 'lat'), undefined)
})

test('uno zero scritto davvero resta zero', () => {
  assert.equal(numero(q('lat=0'), 'lat'), 0)
})

test('un punto senza coordinate non esiste', () => {
  assert.equal(punto(q('')), undefined)
  assert.equal(punto(q('lat=45.3')), undefined)
  assert.equal(punto(q('lng=9.5')), undefined)
})

test('un punto fuori dal mondo non esiste', () => {
  assert.equal(punto(q('lat=91&lng=9')), undefined)
  assert.equal(punto(q('lat=45&lng=181')), undefined)
})

test('un punto vero passa', () => {
  assert.deepEqual(punto(q('lat=45.3142&lng=9.5033')), { lat: 45.3142, lng: 9.5033 })
})

test('le scritture che non sono numeri non passano', () => {
  assert.equal(numero(q('lat=abc'), 'lat'), undefined)
  assert.equal(numero(q('lat=NaN'), 'lat'), undefined)
  assert.equal(numero(q('lat=Infinity'), 'lat'), undefined)
})
