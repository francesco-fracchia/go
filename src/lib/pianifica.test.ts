import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pianifica, SOSTA_MIN } from './pianifica.ts'

const ORE = (s: string) => new Date(`2026-09-01T${s}:00Z`)
const hhmm = (d: Date) => d.toISOString().slice(11, 16)

test('senza ritiri si parte e basta', () => {
  const p = pianifica({ oraArrivo: ORE('22:00'), tratte: [40], fermate: [] })
  assert.equal(hhmm(p.partenza), '21:20')
  assert.equal(p.passaggi.length, 0)
})

test('con un ritiro si esce prima, e la sosta conta', () => {
  // 10 min fino a Bea, 3 di sosta, 30 fino a destinazione = 43 minuti.
  const p = pianifica({
    oraArrivo: ORE('22:00'), tratte: [10, 30],
    fermate: [{ etichetta: 'via Roma', chi: ['Bea'] }],
  })
  assert.equal(hhmm(p.passaggi[0]!.quando), '21:27', 'a che ora essere da Bea')
  assert.equal(hhmm(p.partenza), '21:17', 'uscire 43 minuti prima')
})

test('tre ritiri: ogni sosta sposta indietro tutto quello che viene prima', () => {
  const p = pianifica({
    oraArrivo: ORE('22:00'), tratte: [8, 6, 5, 25],
    fermate: [
      { etichetta: 'via Roma', chi: ['Bea'] },
      { etichetta: 'piazza Castello', chi: ['Ciro'] },
      { etichetta: 'via Milano', chi: ['Dina'] },
    ],
  })
  assert.deepEqual(p.passaggi.map((x) => hhmm(x.quando)), ['21:15', '21:24', '21:32'])
  // 25 + 3+5 + 3+6 + 3+8 = 53
  assert.equal(hhmm(p.partenza), '21:07')
})

test('dice quanto costano i ritiri rispetto ad andarci dritti', () => {
  const p = pianifica({
    oraArrivo: ORE('22:00'), tratte: [8, 6, 5, 25],
    fermate: [
      { etichetta: 'a', chi: ['Bea'] }, { etichetta: 'b', chi: ['Ciro'] },
      { etichetta: 'c', chi: ['Dina'] },
    ],
    minutiDiretti: 40,
  })
  assert.equal(p.minutiAggiunti, 13)
})

test('due persone allo stesso punto sono una sosta sola', () => {
  const insieme = pianifica({
    oraArrivo: ORE('22:00'), tratte: [10, 30],
    fermate: [{ etichetta: 'via Roma', chi: ['Bea', 'Dina'] }],
  })
  const sola = pianifica({
    oraArrivo: ORE('22:00'), tratte: [10, 30],
    fermate: [{ etichetta: 'via Roma', chi: ['Bea'] }],
  })
  assert.equal(hhmm(insieme.partenza), hhmm(sola.partenza))
})

test('un conto che non torna si ferma invece di inventare', () => {
  assert.throws(() => pianifica({
    oraArrivo: ORE('22:00'), tratte: [10],
    fermate: [{ etichetta: 'via Roma', chi: ['Bea'] }],
  }), /una più delle fermate/)
})

test('la sosta è dichiarata, non nascosta in un numero', () => {
  assert.equal(SOSTA_MIN, 3)
})

/**
 * La prova che le due estremità tornano.
 *
 * Il difetto che copre dava l'ora di uscita GIUSTA e ogni ritiro tre
 * minuti tardi: guardando solo il totale non si vedeva. Qui si ricostruisce
 * il viaggio in avanti, passo per passo, e si controlla che arrivi dove
 * dice di arrivare.
 */
test('rifacendo il conto in avanti si arriva all\'ora promessa', () => {
  const tratte = [8, 6, 5, 25]
  const p = pianifica({
    oraArrivo: ORE('22:00'), tratte,
    fermate: [
      { etichetta: 'a', chi: ['Bea'] }, { etichetta: 'b', chi: ['Ciro'] },
      { etichetta: 'c', chi: ['Dina'] },
    ],
  })
  let t = p.partenza.getTime() + tratte[0]! * 60_000
  for (const [k, passo] of p.passaggi.entries()) {
    assert.equal(t, passo.quando.getTime(), `la fermata ${k} non torna`)
    t += (SOSTA_MIN + tratte[k + 1]!) * 60_000
  }
  assert.equal(t, p.arrivo.getTime(), 'il viaggio rifatto in avanti non arriva quando dovrebbe')
})
