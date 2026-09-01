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

/**
 * Questo test confrontava «senza costi» con `alConducente === 0`, cioè
 * ignorava la quota di servizio — e così affermava come corretta la
 * bugia: fra le ventiquattro ore e l'ora prima della partenza si leggeva
 * «puoi disdire senza costi» e si trattenevano trenta centesimi.
 *
 * Un test può bloccare un comportamento sbagliato tanto quanto
 * proteggerne uno giusto. Il confronto vero è con TUTTO quello che si
 * trattiene, che è quello che il passeggero vede sull'estratto conto.
 */
test('il testo mostrato corrisponde a quello che si trattiene', () => {
  for (const politica of ['flessibile', 'rigida'] as const) {
    for (let ore = 0; ore <= 48; ore += 0.5) {
      const senzaCosti = testoDisdetta(ore, politica).includes('senza costi')
      assert.equal(senzaCosti, caso(ore, politica).daCatturare === 0,
        `${politica} a ${ore} ore: il testo non corrisponde a quanto si trattiene`)
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

// ─── «Senza costi» deve voler dire zero ───────────────────────────────

test('gratuita è vera solo quando non si trattiene NIENTE', () => {
  const q = 355, fee = 30, tot = 385
  for (const politica of ['flessibile', 'rigida'] as const) {
    for (const ore of [0.5, 1, 1.5, 2, 3, 6, 7, 12, 23.9, 24, 25, 48]) {
      const p = calcolaPenale({ oreMancanti: ore, politica, quotaConducente: q, fee, totale: tot })
      assert.equal(
        gratuita(ore, politica), p.daCatturare === 0,
        `${politica} a ${ore}h: dice gratuita=${gratuita(ore, politica)} ma trattiene ${p.daCatturare}`,
      )
    }
  }
})

/**
 * Il caso che aveva il difetto: sotto le ventiquattro ore la quota di
 * servizio si trattiene sempre, anche quando a chi guida non va niente.
 * Prima lì si leggeva «puoi disdire senza costi», e poi arrivavano trenta
 * centesimi.
 */
test('fra le 24 ore e il gradino della quota si dice cosa resta, e quanto', () => {
  const testo = testoDisdetta(7, 'flessibile', 30)
  assert.match(testo, /0,30/)
  assert.doesNotMatch(testo, /senza costi/)
})

test('sopra le ventiquattro ore è davvero senza costi', () => {
  assert.equal(testoDisdetta(48, 'flessibile', 30), 'Puoi disdire senza costi.')
  assert.equal(testoDisdetta(48, 'rigida', 30), 'Puoi disdire senza costi.')
})

// ─── «Non trattengo niente» ───────────────────────────────────────────

test('con la politica nessuna, a chi guida non va mai niente', () => {
  for (const ore of [-1, 0, 0.5, 1, 2, 6, 12, 24, 48]) {
    const p = calcolaPenale({
      oreMancanti: ore, politica: 'nessuna',
      quotaConducente: 355, fee: 30, totale: 385,
    })
    assert.equal(p.alConducente, 0, `a ${ore} ore andrebbero ${p.alConducente} a chi guida`)
  }
})

/**
 * Il conducente rinuncia alla PROPRIA quota, non a quella di servizio:
 * quella non è sua. Chiamarla «niente» sarebbe la stessa bugia di prima,
 * detta da un'opzione che si vende come la più generosa delle tre.
 */
test('la quota di servizio resta anche con la politica nessuna', () => {
  const sotto = calcolaPenale({
    oreMancanti: 3, politica: 'nessuna', quotaConducente: 355, fee: 30, totale: 385,
  })
  assert.equal(sotto.daCatturare, 30)
  assert.equal(gratuita(3, 'nessuna'), false)

  const sopra = calcolaPenale({
    oreMancanti: 30, politica: 'nessuna', quotaConducente: 355, fee: 30, totale: 385,
  })
  assert.equal(sopra.daCatturare, 0)
  assert.equal(gratuita(30, 'nessuna'), true)
})

test('il testo resta vero anche per la terza politica', () => {
  for (let ore = 0; ore <= 48; ore += 0.5) {
    const senzaCosti = testoDisdetta(ore, 'nessuna').includes('senza costi')
    const p = calcolaPenale({
      oreMancanti: ore, politica: 'nessuna', quotaConducente: 355, fee: 30, totale: 385,
    })
    assert.equal(senzaCosti, p.daCatturare === 0, `a ${ore} ore il testo non corrisponde`)
  }
})
