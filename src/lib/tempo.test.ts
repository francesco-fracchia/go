import { test } from 'node:test'
import assert from 'node:assert/strict'
import { orario, giorno, quando, giorniDaOggi, FUSO } from './tempo.ts'

/**
 * Il fuso non dipende da chi esegue.
 *
 * Questa prova esiste perché il difetto che copre era invisibile in
 * locale: la macchina di chi sviluppa sta a Roma, quindi tutto tornava.
 * Compariva solo in produzione, dove il server esegue in UTC — e non
 * come un errore, ma come un orario diverso di due ore. Nessun test
 * sarebbe mai diventato rosso.
 *
 * Per renderlo visibile bisogna eseguire le prove IN UTC, ed è il modo in
 * cui girano: `npm test` non fissa TZ, e su questa macchina sarebbe Roma.
 * Quindi il valore atteso è scritto in chiaro, non ricavato dalla stessa
 * funzione che si sta provando.
 */
test('l\'ora è quella italiana, non quella di chi esegue', () => {
  // 19:17 UTC del 1 settembre = 21:17 a Roma (ora legale, +2)
  assert.equal(orario('2026-09-01T19:17:00Z'), '21:17')
  // 23:30 UTC del 15 gennaio = 00:30 del 16 a Roma (ora solare, +1)
  assert.equal(orario('2026-01-15T23:30:00Z'), '00:30')
  assert.equal(FUSO, 'Europe/Rome')
})

test('il giorno segue il fuso italiano, non quello di chi esegue', () => {
  // Le 23:30 UTC del 15 gennaio in Italia sono già il 16.
  assert.equal(giorno('2026-01-15T23:30:00Z'), 'venerdì 16 gennaio')
  // E le 22:30 UTC dello stesso giorno sono ancora il 15.
  assert.equal(giorno('2026-01-15T22:30:00Z'), 'giovedì 15 gennaio')
})

test('«domani» comincia a mezzanotte italiana, non a quella di chi esegue', () => {
  const adesso = new Date('2026-09-01T21:30:00Z')  // 23:30 a Roma
  assert.equal(giorniDaOggi(new Date('2026-09-01T22:30:00Z'), adesso), 1,
    'mezz\'ora dopo è già domani in Italia')
  assert.equal(giorniDaOggi(new Date('2026-09-01T21:45:00Z'), adesso), 0)
})

test('le parole dei giorni vicini si possono cambiare', () => {
  const fra2h = new Date(Date.now() + 2 * 3600_000)
  assert.match(quando(fra2h, { oggi: 'stasera', domani: 'domani' }), /^(stasera|domani) · /)
})
