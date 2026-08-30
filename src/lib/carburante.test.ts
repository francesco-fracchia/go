import test from 'node:test'
import assert from 'node:assert/strict'
import { scomponi, PREZZO_LITRO_CENT } from './carburante.ts'
import { fmt } from './money.ts'

test('Kia Stonic 1.0 T-GDI, 40 km: quanto è benzina', () => {
  const s = scomponi({ km: 40, centesimiPerKm: 40.48, alimentazione: 'benzina' })
  console.log(`
  costo del viaggio    ${fmt(s.totaleCent)}   (ACI 0,4048 €/km)
  di cui benzina       ${fmt(s.carburanteCent)}   ${(s.quotaCarburante * 100).toFixed(0)}%
  usura e fissi        ${fmt(s.usuraCent)}   ${((1 - s.quotaCarburante) * 100).toFixed(0)}%`)
  // Attorno a un quarto: è la proporzione che regge su quasi tutta la tabella.
  assert.ok(s.quotaCarburante > 0.2 && s.quotaCarburante < 0.35)
})

test('il carburante non supera mai il totale', () => {
  for (const alim of Object.keys(PREZZO_LITRO_CENT)) {
    for (const cKm of [28, 40, 55, 90, 200]) {
      const s = scomponi({ km: 100, centesimiPerKm: cKm, alimentazione: alim })
      assert.ok(s.carburanteCent <= s.totaleCent, `${alim} a ${cKm}c/km`)
      assert.ok(s.usuraCent >= 0)
      assert.equal(s.carburanteCent + s.usuraCent, s.totaleCent)
    }
  }
})

test('il GPL pesa meno della benzina sulla stessa auto', () => {
  const benzina = scomponi({ km: 100, centesimiPerKm: 40, alimentazione: 'benzina' })
  const gpl = scomponi({ km: 100, centesimiPerKm: 40, alimentazione: 'gpl' })
  assert.ok(gpl.quotaCarburante < benzina.quotaCarburante)
})

test('un’elettrica ha la quota di energia più bassa di tutte', () => {
  const e = scomponi({ km: 100, centesimiPerKm: 45, alimentazione: 'elettrica' })
  const b = scomponi({ km: 100, centesimiPerKm: 45, alimentazione: 'benzina' })
  assert.ok(e.quotaCarburante < b.quotaCarburante)
})
