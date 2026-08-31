import { test } from 'node:test'
import assert from 'node:assert/strict'
import { riassunto, abitudini, MINIMO_PER_RAPPORTO } from './recensioni.ts'

const rec = (positiva: boolean, tag: string[] = [], descrittori: string[] = []) =>
  ({ positiva, tag, descrittori })

test('sotto la soglia non si dà nessun rapporto', () => {
  // Con tre viaggi una negativa vale il 33% e non significa niente.
  const r = riassunto([rec(true), rec(true), rec(false)])
  assert.equal(r.mostra, false)
  assert.equal(r.totale, 3)
})

test('sopra la soglia il rapporto c’è, e il no non è mai nudo', () => {
  const r = riassunto([
    rec(true), rec(true), rec(true), rec(true),
    rec(false, ['è partito in ritardo']),
  ])
  assert.equal(r.mostra, true)
  assert.equal(r.totale, 5)
  assert.equal(r.rifarebbero, 4)
  // Il motivo viaggia col numero: un no spiegato spaventa meno di un no muto.
  assert.deepEqual(r.motivi, ['è partito in ritardo'])
})

test('la soglia è quella dichiarata', () => {
  const sotto = Array.from({ length: MINIMO_PER_RAPPORTO - 1 }, () => rec(true))
  const sopra = Array.from({ length: MINIMO_PER_RAPPORTO }, () => rec(true))
  assert.equal(riassunto(sotto).mostra, false)
  assert.equal(riassunto(sopra).mostra, true)
})

test('un descrittore detto una volta non è un’abitudine', () => {
  const a = abitudini([
    rec(true, [], ['si è viaggiato in silenzio']),
    rec(true, [], ['si è chiacchierato']),
    rec(true, [], ['musica bassa']),
    rec(true, [], []),
  ])
  assert.deepEqual(a, [])
})

test('quello che ricorre nella metà dei viaggi diventa un’aspettativa', () => {
  const a = abitudini([
    rec(true, [], ['si è viaggiato in silenzio', 'niente musica']),
    rec(true, [], ['si è viaggiato in silenzio']),
    rec(true, [], ['si è viaggiato in silenzio', 'niente musica']),
    rec(true, [], ['si è chiacchierato']),
  ])
  assert.deepEqual(a, ['si è viaggiato in silenzio', 'niente musica'])
})

test('al massimo tre abitudini, le più ricorrenti', () => {
  const molte = Array.from({ length: 4 }, () =>
    rec(true, [], ['a', 'b', 'c', 'd', 'e']))
  assert.equal(abitudini(molte).length, 3)
})
