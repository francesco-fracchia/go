import test from 'node:test'
import assert from 'node:assert/strict'
import { calcolaPenale, testoDisdetta, gratuita, ORE_FEE_GRATUITA } from './disdette.ts'
import { eur, fmt } from './money.ts'

const caso = (oreMancanti: number, politica: 'flessibile' | 'rigida') =>
  calcolaPenale({
    oreMancanti, politica,
    quotaConducente: eur(3.71), fee: eur(0.74), totale: eur(4.45),
  })

test('flessibile: gratis fino a un’ora prima, come promesso', () => {
  for (const ore of [72, 24, 6, 2, 1.5, 1.01]) {
    assert.equal(caso(ore, 'flessibile').alConducente, 0, `a ${ore} ore non è gratis`)
  }
  assert.equal(caso(0.99, 'flessibile').alConducente, eur(3.71))
})

test('rigida: gratis a sei ore, metà fino a due, tutto sotto', () => {
  assert.equal(caso(6.1, 'rigida').alConducente, 0)
  assert.equal(caso(5.9, 'rigida').alConducente, eur(1.85))   // metà di 3,71
  assert.equal(caso(2.1, 'rigida').alConducente, eur(1.85))
  assert.equal(caso(1.9, 'rigida').alConducente, eur(3.71))
})

test('la quota di servizio si trattiene solo sotto le 24 ore', () => {
  assert.equal(caso(ORE_FEE_GRATUITA + 0.1, 'flessibile').fee, 0)
  assert.equal(caso(ORE_FEE_GRATUITA - 0.1, 'flessibile').fee, eur(0.74))
})

test('rimborso e trattenuta sommano sempre al totale', () => {
  for (const politica of ['flessibile', 'rigida'] as const) {
    for (const ore of [100, 24, 12, 6, 5, 3, 2, 1.5, 1, 0.5, 0, -1]) {
      const p = caso(ore, politica)
      assert.equal(p.rimborso + p.daCatturare, eur(4.45),
        `${politica} a ${ore} ore: ${fmt(p.rimborso)} + ${fmt(p.daCatturare)}`)
    }
  }
})

test('non si trattiene mai più di quanto il passeggero ha autorizzato', () => {
  for (const politica of ['flessibile', 'rigida'] as const) {
    for (let ore = -2; ore <= 48; ore += 0.25) {
      const p = caso(ore, politica)
      assert.ok(p.daCatturare <= eur(4.45),
        `${politica} a ${ore} ore: ${fmt(p.daCatturare)} su 4,45 €`)
      assert.ok(p.daCatturare >= 0)
      assert.ok(p.rimborso >= 0)
    }
  }
})

test('la penale non scende mai avvicinandosi alla partenza', () => {
  // Chi disdice più tardi non può pagare meno di chi ha disdetto prima.
  for (const politica of ['flessibile', 'rigida'] as const) {
    let precedente = 0
    for (let ore = 48; ore >= 0; ore -= 0.25) {
      const attuale = caso(ore, politica).daCatturare
      assert.ok(attuale >= precedente,
        `${politica}: a ${ore} ore si paga ${fmt(attuale)} dopo ${fmt(precedente)}`)
      precedente = attuale
    }
  }
})

test('la rigida non è mai più conveniente della flessibile per chi disdice', () => {
  for (let ore = 0; ore <= 24; ore += 0.5) {
    assert.ok(caso(ore, 'rigida').daCatturare >= caso(ore, 'flessibile').daCatturare,
      `a ${ore} ore la rigida costa meno della flessibile`)
  }
})

test('il testo mostrato corrisponde a quello che si trattiene', () => {
  for (const politica of ['flessibile', 'rigida'] as const) {
    for (let ore = 0; ore <= 24; ore += 0.5) {
      const senzaCosti = testoDisdetta(ore, politica).includes('senza costi')
      assert.equal(senzaCosti, caso(ore, politica).alConducente === 0,
        `${politica} a ${ore} ore: il testo non corrisponde alla penale`)
      assert.equal(senzaCosti, gratuita(ore, politica))
    }
  }
})

test('a corsa già partita si trattiene tutto', () => {
  for (const politica of ['flessibile', 'rigida'] as const) {
    const p = caso(-1, politica)
    assert.equal(p.rimborso, 0)
    assert.equal(p.daCatturare, eur(4.45))
  }
})
