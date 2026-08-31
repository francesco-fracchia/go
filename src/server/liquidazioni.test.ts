import { test } from 'node:test'
import assert from 'node:assert/strict'
import { settimanaScorsa } from './liquidazioni.ts'

/**
 * La settimana è quella PRECEDENTE, troncata al lunedì come nella vista
 * `maturato_conducente`. Sbagliare di un giorno qui vuol dire pagare la
 * settimana sbagliata, o non pagarla affatto — e non se ne accorge nessuno
 * finché un conducente non chiede dove sono i suoi soldi.
 */

test('lunedì mattina liquida la settimana appena chiusa', () => {
  // lunedì 31 agosto 2026 → la settimana del lunedì 24
  assert.equal(settimanaScorsa(new Date('2026-08-31T08:00:00Z')), '2026-08-24')
})

test('la domenica appartiene ancora alla settimana che sta finendo', () => {
  // domenica 30 agosto → la scorsa è quella del 17, non del 24
  assert.equal(settimanaScorsa(new Date('2026-08-30T23:00:00Z')), '2026-08-17')
})

test('a metà settimana la scorsa resta la stessa per tutti i giorni', () => {
  const giorni = ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05', '2026-09-06']
  const settimane = new Set(giorni.map((g) => settimanaScorsa(new Date(`${g}T10:00:00Z`))))
  assert.deepEqual([...settimane], ['2026-08-24'])
})

test('restituisce sempre un lunedì', () => {
  for (let i = 0; i < 40; i++) {
    const d = new Date(Date.UTC(2026, 0, 1 + i * 9))
    const s = new Date(`${settimanaScorsa(d)}T00:00:00Z`)
    assert.equal(s.getUTCDay(), 1, `${d.toISOString()} → ${s.toISOString()}`)
  }
})

test('scavalca il capodanno senza inventare date', () => {
  // lunedì 5 gennaio 2026 → la settimana del lunedì 29 dicembre 2025
  assert.equal(settimanaScorsa(new Date('2026-01-05T08:00:00Z')), '2025-12-29')
  // e la domenica precedente appartiene ancora alla settimana del 29,
  // quindi la scorsa è quella del 22
  assert.equal(settimanaScorsa(new Date('2026-01-04T23:00:00Z')), '2025-12-22')
})
