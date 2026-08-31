import { test } from 'node:test'
import assert from 'node:assert/strict'
import { seraCorrente, chiTocca, conto, type Membro } from './comitive.ts'

const m = (nome: string, volte: number, disponibile = true): Membro =>
  ({ id: nome, nome, fotoUrl: null, volte, disponibile })

test('la sera finisce alle sei, non a mezzanotte', () => {
  // È il motivo per cui la comitiva esiste: alle due di notte si sta
  // ancora nella serata di ieri, e chi ha detto «stasera non guido»
  // alle undici deve restare fuori dal sorteggio anche alle tre.
  assert.equal(seraCorrente(new Date('2026-08-30T23:30:00')), '2026-08-30')
  assert.equal(seraCorrente(new Date('2026-08-31T02:10:00')), '2026-08-30')
  assert.equal(seraCorrente(new Date('2026-08-31T07:00:00')), '2026-08-31')
})

test('tocca a chi ha guidato meno', () => {
  const scelto = chiTocca([m('Anna', 4), m('Bea', 1), m('Ciro', 3)])
  assert.equal(scelto?.nome, 'Bea')
})

test('chi stasera non guida resta fuori, anche se ha guidato meno di tutti', () => {
  const scelto = chiTocca([m('Anna', 4), m('Bea', 0, false), m('Ciro', 3)])
  assert.equal(scelto?.nome, 'Ciro')
})

test('se non guida nessuno non si inventa un guidatore', () => {
  assert.equal(chiTocca([m('Anna', 2, false), m('Bea', 1, false)]), null)
})

test('a parità si sceglie fra i pari, e solo fra quelli', () => {
  const pari = new Set<string>()
  for (let i = 0; i < 60; i++) {
    const s = chiTocca([m('Anna', 1), m('Bea', 1), m('Ciro', 5)])
    pari.add(s!.nome)
  }
  assert.deepEqual([...pari].sort(), ['Anna', 'Bea'])
})

test('il conto si tiene in passaggi, e somma a zero', () => {
  const righe = conto([m('Anna', 4), m('Bea', 0), m('Ciro', 2)])
  assert.deepEqual(righe.map((r) => r.saldo), [2, -2, 0])
  assert.equal(righe.reduce((s, r) => s + r.saldo, 0), 0)
})
