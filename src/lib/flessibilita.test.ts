import test from 'node:test'
import assert from 'node:assert/strict'
import { proponi, SCELTE, etichetta } from './flessibilita.ts'

const alle = (giorno: number, ora: number) => {
  // 2026-08-31 è un lunedì: si scorre da lì per avere il giorno voluto.
  const d = new Date('2026-08-31T00:00:00')
  d.setDate(d.getDate() + ((giorno + 6) % 7))
  d.setHours(ora)
  return d
}

test('le coincidenze non aspettano', () => {
  for (const c of ['stazione', 'aeroporto'] as const) {
    // Vale anche di sabato sera: perdere un treno costa più che aspettare.
    assert.equal(proponi({ categoria: c, oraArrivo: alle(6, 23) }).minuti, 0)
    assert.equal(proponi({ categoria: c, oraArrivo: alle(2, 8) }).minuti, 0)
  }
})

test('la mattina feriale si arriva all’ora giusta', () => {
  for (const giorno of [1, 2, 3, 4, 5]) {
    assert.equal(proponi({ oraArrivo: alle(giorno, 8) }).minuti, 0)
  }
})

test('il sabato sera mezz’ora non cambia niente', () => {
  assert.equal(proponi({ categoria: 'discoteca', oraArrivo: alle(6, 23) }).minuti, 30)
  assert.equal(proponi({ oraArrivo: alle(6, 23) }).minuti, 30)
})

test('la stessa persona è rigida di lunedì ed elastica di sabato', () => {
  const lavoro = proponi({ oraArrivo: alle(1, 8) })
  const serata = proponi({ oraArrivo: alle(6, 23) })
  assert.ok(serata.minuti > lavoro.minuti)
})

test('ogni proposta è una scelta possibile, e ha una ragione', () => {
  const casi = [undefined, 'discoteca', 'stazione', 'cinema', 'ospedale',
    'bar', 'ristorante', 'aeroporto', 'stadio', 'piazza', 'palestra'] as const
  for (const categoria of casi) {
    for (let giorno = 0; giorno < 7; giorno++) {
      for (let ora = 0; ora < 24; ora++) {
        const p = proponi({ categoria, oraArrivo: alle(giorno, ora) })
        assert.ok((SCELTE as readonly number[]).includes(p.minuti),
          `${categoria} ${giorno}/${ora}: ${p.minuti} non è una scelta`)
        assert.ok(p.perche.length > 10, 'manca la ragione')
      }
    }
  }
})

test('l’etichetta dice ora esatta quando è zero', () => {
  assert.equal(etichetta(0), 'Ora esatta')
  assert.equal(etichetta(30), '± 30 min')
})
