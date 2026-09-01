import test from 'node:test'
import assert from 'node:assert/strict'

/**
 * Il confronto dei percorsi si ferma al confine della parola.
 *
 * `/viaggio/xyz` NON è dentro `/viaggi`, per quanto la stringa cominci
 * uguale. È il difetto che ha reso privata la pagina fatta apposta per chi
 * non ha un account, e non si vedeva rileggendo l'elenco delle rotte
 * protette — perché l'elenco era giusto.
 */
const PROTETTE = [
  '/viaggi', '/pubblica', '/conto', '/veicoli', '/impostazioni',
  '/prenotazione', '/chat', '/recensione', '/cerco', '/moderazione', '/serate',
]
const dentro = (percorso: string) => (p: string) =>
  percorso === p || percorso.startsWith(`${p}/`)
const protetta = (percorso: string) => PROTETTE.some(dentro(percorso))

test('le rotte protette restano protette, con e senza coda', () => {
  for (const p of ['/viaggi', '/viaggi/', '/viaggi/abc', '/conto', '/chat/xyz']) {
    assert.equal(protetta(p), true, p)
  }
})

test('una rotta che COMINCIA come una protetta non lo è', () => {
  // Il caso vero: /viaggio è pubblica, /viaggi no.
  assert.equal(protetta('/viaggio/token123'), false)
  assert.equal(protetta('/contatti'), false)
  assert.equal(protetta('/cercatore'), false)
  assert.equal(protetta('/serateggiare'), false)
})

test('le pagine pubbliche restano aperte', () => {
  for (const p of ['/', '/cerca', '/corsa/abc', '/quanto-costa', '/legale/privacy', '/viaggio/x']) {
    assert.equal(protetta(p), false, p)
  }
})
