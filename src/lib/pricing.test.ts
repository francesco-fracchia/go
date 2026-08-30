/**
 * Le sei invarianti di conformità, come test.
 * Se uno di questi fallisce, il prodotto non è più carpooling.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  preventivo, quotaPiena, quotaApplicata, feePasseggero, autorizzazioneMassima,
  costoBase, limiteDeviazione, costoProcessore, ViolazioneConformita,
  ripartisciProcessore, autorizzazioniGruppo, autorizzazioneAndataRitorno,
  tettoComplessivo,
  deviazioniPerPasseggero, risparmioIncassoUnico,
  FEE_CAP_PAX, FEE_MIN_PAX, STRIPE_FISSA,
  type Corsa, type Passeggero,
} from './pricing.ts'
import { eur, fmt } from './money.ts'
import { costoChilometrico, TETTO_MASSIMO_CENTESIMI_KM } from './aci.ts'

const panda = costoChilometrico('utilitaria', 'benzina').centesimiPerKm

const corsa = (o: Partial<Corsa> = {}): Corsa => ({
  modalita: 'pubblica',
  kmBase: 40,
  centesimiPerKm: panda,
  pedaggio: 0,
  parcheggio: 0,
  postiOfferti: 3,
  ...o,
})

const pax = (n: number, kmDeviazione = 0): Passeggero[] =>
  Array.from({ length: n }, (_, i) => ({ id: `p${i}`, kmDeviazione }))

// ─── Generatore per le prove esaustive ────────────────────────────────────
function* tutteLeCorse() {
  for (const kmBase of [1, 5, 12, 25, 40, 80, 150, 300, 700]) {
    for (const centesimiPerKm of [31, 37.12, 43, 52, TETTO_MASSIMO_CENTESIMI_KM]) {
      for (const postiOfferti of [1, 2, 3, 4, 5, 6, 7]) {
        for (const pedaggio of [0, eur(3.5), eur(28)]) {
          for (const sconto of [0, eur(1), eur(999)]) {
            yield {
              modalita: 'pubblica', kmBase, centesimiPerKm, postiOfferti, pedaggio,
              parcheggio: 0, scontoConducente: sconto,
            } as Corsa
          }
        }
      }
    }
  }
}

// ═══ INVARIANTE 1 ═════════════════════════════════════════════════════════
test('1 · il conducente non rientra mai del costo, su nessuna combinazione', () => {
  let combinazioni = 0
  for (const c of tutteLeCorse()) {
    for (let n = 1; n <= c.postiOfferti; n++) {
      const p = preventivo(c, pax(n))
      assert.ok(
        p.incassoConducente < p.costoEffettivo,
        `${c.kmBase}km ${c.postiOfferti}posti ${n}pax: incassa ${fmt(p.incassoConducente)} su ${fmt(p.costoEffettivo)}`,
      )
      assert.ok(p.restaACaricoConducente > 0)
      combinazioni++
    }
  }
  assert.ok(combinazioni > 1000, `solo ${combinazioni} combinazioni provate`)
})

test('1b · a macchina piena resta a carico almeno la quota del conducente', () => {
  for (const c of tutteLeCorse()) {
    const p = preventivo(c, pax(c.postiOfferti))
    // con sconto 0 il conducente paga esattamente la sua quota; con sconto, di più
    assert.ok(p.restaACaricoConducente >= p.quotaPiena)
  }
})

test('1c · le deviazioni sono rimborsate al costo, non ci si guadagna', () => {
  const c = corsa()
  const conDeviazione = preventivo(c, [{ id: 'a', kmDeviazione: 6 }])
  const senza = preventivo(c, [{ id: 'a', kmDeviazione: 0 }])
  // il supplemento pagato copre esattamente i km in più, né uno di più
  const kmInPiu = conDeviazione.costoEffettivo - senza.costoEffettivo
  assert.equal(conDeviazione.quote[0]!.deviazione, kmInPiu)
  assert.equal(conDeviazione.restaACaricoConducente, senza.restaACaricoConducente)
})

// ═══ INVARIANTE 2 ═════════════════════════════════════════════════════════
test('2 · lo sconto può solo abbassare, mai alzare', () => {
  const piena = quotaPiena(corsa())
  assert.equal(quotaApplicata(corsa({ scontoConducente: eur(-50) })), piena)
  assert.equal(quotaApplicata(corsa({ scontoConducente: 0 })), piena)
  assert.ok(quotaApplicata(corsa({ scontoConducente: eur(1) })) < piena)
  assert.equal(quotaApplicata(corsa({ scontoConducente: eur(99999) })), 0)
})

test('2b · il prezzo non cambia mai dopo la pubblicazione', () => {
  const c = corsa({ postiOfferti: 4 })
  const quote = [1, 2, 3, 4].map((n) => preventivo(c, pax(n)).quote[0]!.quota)
  assert.deepEqual(new Set(quote).size, 1, 'la quota è variata al variare dei prenotati')
})

// ═══ INVARIANTE 3 ═════════════════════════════════════════════════════════
test('3 · le esenzioni non le pagano gli altri passeggeri', () => {
  const c = corsa({ postiOfferti: 3 })
  const senza = preventivo(c, [
    { id: 'a', kmDeviazione: 0 }, { id: 'b', kmDeviazione: 0 }, { id: 'c', kmDeviazione: 0 },
  ])
  const con = preventivo(c, [
    { id: 'a', kmDeviazione: 0 }, { id: 'b', kmDeviazione: 0 },
    { id: 'c', kmDeviazione: 0, esente: true },
  ])
  for (const id of ['a', 'b']) {
    const prima = senza.quote.find((q) => q.passeggeroId === id)!
    const dopo = con.quote.find((q) => q.passeggeroId === id)!
    assert.equal(dopo.quota, prima.quota, `la quota di ${id} è cambiata`)
    assert.ok(dopo.totale <= prima.totale, `${id} paga di più per l'esenzione di un altro`)
  }
  assert.equal(con.quote.find((q) => q.passeggeroId === 'c')!.totale, 0)
  assert.ok(con.restaACaricoConducente > senza.restaACaricoConducente)
})

// ═══ INVARIANTE 4 ═════════════════════════════════════════════════════════
test('4 · il prezzo dipende solo da km e spese vive — mai dal tempo', () => {
  // Nessun campo di durata esiste nel tipo Corsa: la prova è strutturale.
  const campi = Object.keys(corsa())
  for (const vietato of ['durata', 'minuti', 'ore', 'orario', 'tempo', 'attesa']) {
    assert.ok(!campi.some((k) => k.toLowerCase().includes(vietato)),
      `il motore accetta un campo temporale: ${vietato}`)
  }
})

test('4b · il costo è lineare nei chilometri', () => {
  const a = costoBase(corsa({ kmBase: 20 }))
  const b = costoBase(corsa({ kmBase: 40 }))
  const c = costoBase(corsa({ kmBase: 80 }))
  assert.ok(Math.abs(b - a * 2) <= 1)
  assert.ok(Math.abs(c - a * 4) <= 1)
})

// ═══ INVARIANTE 5 ═════════════════════════════════════════════════════════
test('5 · le deviazioni oltre il limite sono rifiutate', () => {
  const c = corsa({ kmBase: 40 })
  assert.equal(limiteDeviazione(c), 8)
  assert.doesNotThrow(() => preventivo(c, [{ id: 'a', kmDeviazione: 8 }]))
  assert.throws(() => preventivo(c, [{ id: 'a', kmDeviazione: 8.5 }]), ViolazioneConformita)
})

test('5b · il limite vale sulla somma, non sul singolo', () => {
  const c = corsa({ kmBase: 40, postiOfferti: 3 })
  assert.throws(() => preventivo(c, [
    { id: 'a', kmDeviazione: 5 }, { id: 'b', kmDeviazione: 5 },
  ]), ViolazioneConformita)
})

test('5c · al ritorno il limite è più largo', () => {
  assert.ok(limiteDeviazione(corsa({ ritorno: true })) > limiteDeviazione(corsa()))
})

test('5d · la deviazione la paga chi la chiede, per intero', () => {
  const p = preventivo(corsa(), [
    { id: 'a', kmDeviazione: 6 }, { id: 'b', kmDeviazione: 0 },
  ])
  assert.ok(p.quote.find((q) => q.passeggeroId === 'a')!.deviazione > 0)
  assert.equal(p.quote.find((q) => q.passeggeroId === 'b')!.deviazione, 0)
})

// ═══ INVARIANTE 6 ═════════════════════════════════════════════════════════
test('6 · a parità di corsa il prezzo è identico, sempre', () => {
  const c = corsa()
  const risultati = Array.from({ length: 50 }, () => preventivo(c, pax(2)).quote[0]!.totale)
  assert.equal(new Set(risultati).size, 1)
})

test('6 · sabato notte e martedì mattina costano uguale', () => {
  // Nessun input di domanda esiste. Il tipo Corsa non ha né data né ora.
  const campi = Object.keys(corsa())
  for (const vietato of ['data', 'giorno', 'domanda', 'richiesta', 'moltiplicatore']) {
    assert.ok(!campi.some((k) => k.toLowerCase().includes(vietato)))
  }
})

// ═══ Fee, tetti e pavimenti ═══════════════════════════════════════════════
test('la fee scende al crescere del gruppo', () => {
  const c = corsa({ kmBase: 150, postiOfferti: 5 })
  const fee = [1, 2, 3, 4, 5].map((n) => feePasseggero(c, n))
  for (let i = 1; i < fee.length; i++) assert.ok(fee[i]! <= fee[i - 1]!)
})

test('la fee non supera mai il tetto per passeggero', () => {
  for (const c of tutteLeCorse()) {
    for (let n = 1; n <= c.postiOfferti; n++) {
      assert.ok(feePasseggero(c, n) <= FEE_CAP_PAX)
    }
  }
})

test('la fee non scende mai sotto il pavimento del processore', () => {
  for (const c of tutteLeCorse()) {
    for (let n = 1; n <= c.postiOfferti; n++) {
      assert.ok(feePasseggero(c, n) >= FEE_MIN_PAX)
    }
  }
})

test('nessuna prenotazione ci fa perdere denaro, in nessun caso', () => {
  let peggiore = Infinity
  let dove = ''
  for (const c of tutteLeCorse()) {
    for (let n = 1; n <= c.postiOfferti; n++) {
      for (const q of preventivo(c, pax(n)).quote) {
        if (q.nettoPiattaforma < peggiore) {
          peggiore = q.nettoPiattaforma
          dove = `${c.kmBase}km · ${c.centesimiPerKm}c/km · ${n}/${c.postiOfferti} pax`
        }
      }
    }
  }
  console.log(`  netto peggiore per passeggero: ${fmt(peggiore)} — ${dove}`)
  assert.ok(peggiore >= 0, `si perde ${fmt(peggiore)} su ${dove}`)
})

// ═══ Ripartizione della commissione di incasso ════════════════════════════
test('la commissione del processore è ripartita per intero, senza avanzi', () => {
  for (const c of tutteLeCorse()) {
    for (let n = 1; n <= c.postiOfferti; n++) {
      for (const q of preventivo(c, pax(n)).quote) {
        assert.equal(q.processoreConducente + q.processorePiattaforma, q.costoProcessore,
          'centesimi persi o creati nella ripartizione')
      }
    }
  }
})

test('ciascuno paga il costo di incassare la propria parte', () => {
  const q = preventivo(corsa(), pax(3)).quote[0]!
  // la piattaforma incassa il ~17 % del totale, quindi porta il ~17 % del costo
  const suaQuota = q.processorePiattaforma / q.costoProcessore
  const sueEntrate = q.fee / q.totale
  assert.ok(Math.abs(suaQuota - sueEntrate) < 0.02, 'ripartizione non proporzionale')
})

test('la ripartizione rende il conducente ancora più lontano dal costo', () => {
  for (const c of tutteLeCorse()) {
    for (let n = 1; n <= c.postiOfferti; n++) {
      const p = preventivo(c, pax(n))
      assert.ok(p.nettoConducente <= p.incassoConducente)
      assert.ok(p.nettoConducente < p.costoEffettivo, 'il netto supera il costo')
    }
  }
})

test('l\'arrotondamento della ripartizione va a carico del conducente', () => {
  // Nel dubbio il conducente incassa di meno: è la direzione sicura.
  const r = ripartisciProcessore(eur(4.45), eur(3.71), eur(0.74))
  assert.equal(r.conducente + r.piattaforma, r.totale)
  assert.ok(r.conducente > r.piattaforma)
})

test('i totali di corsa coincidono con la somma dei dettagli', () => {
  // Il test che mancava: le aggregazioni possono divergere dai dettagli
  // anche quando ogni singola riga è giusta.
  for (const c of tutteLeCorse()) {
    for (let n = 1; n <= c.postiOfferti; n++) {
      const p = preventivo(c, pax(n))
      const somma = (f: (q: (typeof p.quote)[number]) => number) => p.quote.reduce((s, q) => s + f(q), 0)
      assert.equal(p.ricavoPiattaforma, somma((q) => q.fee))
      assert.equal(p.costoProcessore, somma((q) => q.costoProcessore))
      assert.equal(p.processorePiattaforma, somma((q) => q.processorePiattaforma))
      assert.equal(p.nettoPiattaforma, somma((q) => q.nettoPiattaforma))
      assert.equal(p.nettoConducente, somma((q) => q.nettoConducente))
      assert.equal(p.incassoConducente, somma((q) => q.quota + q.deviazione))
      // niente centesimi che spariscono: tutto quello che entra, esce
      assert.equal(somma((q) => q.totale),
        p.nettoConducente + p.nettoPiattaforma + p.costoProcessore)
    }
  }
})

// ═══ Deviazioni condivise ═════════════════════════════════════════════════
test('chi condivide la fermata condivide la deviazione, non la raddoppia', () => {
  const c = corsa({ kmBase: 40, postiOfferti: 3 })
  const insieme = preventivo(c, [
    { id: 'a', fermataId: 'piazza', kmDeviazione: 6 },
    { id: 'b', fermataId: 'piazza', kmDeviazione: 6 },
  ])
  const separati = preventivo(c, [
    { id: 'a', kmDeviazione: 6 },
    { id: 'b', kmDeviazione: 0 },
  ])
  // stessi km in più per il conducente, stesso costo effettivo
  assert.equal(insieme.costoEffettivo, separati.costoEffettivo)
  // ma pagati in due invece che da uno solo
  const qa = insieme.quote.find((q) => q.passeggeroId === 'a')!
  const qb = insieme.quote.find((q) => q.passeggeroId === 'b')!
  assert.equal(qa.deviazione, qb.deviazione)
  assert.ok(qa.deviazione + qb.deviazione <= separati.quote[0]!.deviazione)
})

test('il conducente non guadagna sulle deviazioni condivise', () => {
  const c = corsa({ kmBase: 40, postiOfferti: 4 })
  for (const n of [2, 3, 4]) {
    const p = preventivo(c, Array.from({ length: n }, (_, i) => ({
      id: `p${i}`, fermataId: 'stessa', kmDeviazione: 7,
    })))
    const incassatoPerDeviazione = p.quote.reduce((s, q) => s + q.deviazione, 0)
    const costatoInDeviazione = Math.floor(7 * c.centesimiPerKm)
    assert.ok(incassatoPerDeviazione <= costatoInDeviazione,
      `${n} passeggeri: incassa ${fmt(incassatoPerDeviazione)} per ${fmt(costatoInDeviazione)} di km`)
  }
})

test('il limite di deviazione conta i km, non le persone', () => {
  const c = corsa({ kmBase: 40, postiOfferti: 3 })  // limite 8 km
  // tre persone alla stessa fermata a 7 km: sono 7 km, non 21
  assert.doesNotThrow(() => preventivo(c, [
    { id: 'a', fermataId: 'f', kmDeviazione: 7 },
    { id: 'b', fermataId: 'f', kmDeviazione: 7 },
    { id: 'c', fermataId: 'f', kmDeviazione: 7 },
  ]))
})

// ═══ Gruppo: si prenota insieme, si paga ciascuno per sé ═════════════════
test('nel gruppo ognuno ha la propria autorizzazione', () => {
  const c = corsa({ postiOfferti: 4 })
  const gruppo = pax(4)
  const auth = autorizzazioniGruppo(c, gruppo)
  assert.equal(auth.size, 4, 'non c\'è un\'autorizzazione per ciascuno')
  for (const p of gruppo) {
    assert.ok((auth.get(p.id) ?? 0) > 0, `${p.id} non ha una propria autorizzazione`)
  }
  // nessuno anticipa per gli altri: nessuna autorizzazione vale per due
  const totale = [...auth.values()].reduce((s, v) => s + v, 0)
  for (const v of auth.values()) assert.ok(v < totale)
})

test('prenotare insieme non cambia quello che ciascuno paga', () => {
  const c = corsa({ postiOfferti: 4 })
  const gruppo = pax(4)
  const auth = autorizzazioniGruppo(c, gruppo)
  const p = preventivo(c, gruppo)
  for (const q of p.quote) {
    assert.ok((auth.get(q.passeggeroId) ?? 0) >= q.totale)
  }
  // stessa quota di chi prenota da solo su quella corsa
  assert.equal(p.quote[0]!.quota, quotaApplicata(c))
})

test('il gruppo serve alla fermata condivisa, non al risparmio su Stripe', () => {
  const c = corsa({ postiOfferti: 3 })
  const insieme = preventivo(c, [
    { id: 'a', fermataId: 'f', kmDeviazione: 6 },
    { id: 'b', fermataId: 'f', kmDeviazione: 6 },
  ])
  // ognuno la sua transazione: due commissioni fisse, non una
  const commissioni = insieme.quote.reduce((s, q) => s + q.costoProcessore, 0)
  assert.ok(commissioni >= STRIPE_FISSA * 2)
  // ma la deviazione la dividono
  assert.equal(insieme.quote[0]!.deviazione, insieme.quote[1]!.deviazione)
})

// ═══ Andata e ritorno: solo dove l'impegno esiste già ═════════════════════
test('A/R in una transazione sola è rifiutato sulle corse pubbliche', () => {
  const p = { id: 'a', kmDeviazione: 0 }
  assert.throws(() => autorizzazioneAndataRitorno([
    { corsa: corsa({ modalita: 'pubblica' }), passeggero: p },
    { corsa: corsa({ modalita: 'pubblica', ritorno: true }), passeggero: p },
  ]), ViolazioneConformita)
  // basta che UNA delle due sia pubblica
  assert.throws(() => autorizzazioneAndataRitorno([
    { corsa: corsa({ modalita: 'privata' }), passeggero: p },
    { corsa: corsa({ modalita: 'pubblica', ritorno: true }), passeggero: p },
  ]), ViolazioneConformita)
})

test('A/R in una transazione sola è ammesso sulle corse private', () => {
  const p = { id: 'a', kmDeviazione: 0 }
  assert.doesNotThrow(() => autorizzazioneAndataRitorno([
    { corsa: corsa({ modalita: 'privata' }), passeggero: p },
    { corsa: corsa({ modalita: 'privata', ritorno: true }), passeggero: p },
  ]))
})

// ═══ Autorizzazione e cattura ═════════════════════════════════════════════
test('quanto si autorizza copre sempre quanto si cattura', () => {
  for (const c of tutteLeCorse()) {
    for (let n = 1; n <= c.postiOfferti; n++) {
      const passeggeri = pax(n)
      const p = preventivo(c, passeggeri)
      for (const q of p.quote) {
        const auth = autorizzazioneMassima(c, passeggeri.find((x) => x.id === q.passeggeroId)!)
        assert.ok(auth >= q.totale,
          `autorizzati ${fmt(auth)} ma da catturare ${fmt(q.totale)}`)
      }
    }
  }
})

test('chi prenota per primo paga meno se la macchina si riempie', () => {
  const c = corsa({ postiOfferti: 4 })
  const p1 = { id: 'p0', kmDeviazione: 0 }
  const auth = autorizzazioneMassima(c, p1)
  const cattura = preventivo(c, pax(4)).quote[0]!.totale
  assert.ok(cattura < auth, 'nessun risparmio a macchina piena')
})

// ═══ Ingressi malformati ══════════════════════════════════════════════════
test('più passeggeri che posti è rifiutato', () => {
  assert.throws(() => preventivo(corsa({ postiOfferti: 2 }), pax(3)), ViolazioneConformita)
})

test('zero posti offerti è rifiutato', () => {
  assert.throws(() => quotaPiena(corsa({ postiOfferti: 0 })), ViolazioneConformita)
})

// ═══ Il caso di riferimento, quello nei mockup ════════════════════════════
test('caso di riferimento: 40 km, Panda, 3 posti, 3 passeggeri', () => {
  const p = preventivo(corsa(), pax(3))
  const q = p.quote[0]!
  console.log(`
  costo della corsa      ${fmt(p.costoBase)}
  quota a testa          ${fmt(q.quota)}   (÷ 4 = 3 passeggeri + conducente)
  servizio               ${fmt(q.fee)}
  ─────────────────────────────
  il passeggero paga     ${fmt(q.totale)}
  ─────────────────────────────
  il conducente incassa  ${fmt(p.incassoConducente)}
    − commissione        ${fmt(p.incassoConducente - p.nettoConducente)}
    = riceve             ${fmt(p.nettoConducente)}
  gli resta a carico     ${fmt(p.costoEffettivo - p.nettoConducente)}
  ─────────────────────────────
  fee incassate          ${fmt(p.ricavoPiattaforma)}
    − sua quota comm.    ${fmt(p.processorePiattaforma)}
    = netto sulla corsa  ${fmt(p.nettoPiattaforma)}`)
  assert.ok(q.totale > 0 && q.totale < eur(10))
})

// ═══ Ripartizione personalizzata fra amici ════════════════════════════════
test('un gruppo di amici può ridistribuire le quote fra loro', () => {
  const c = corsa({ modalita: 'privata', postiOfferti: 3 })
  const equa = quotaApplicata(c)
  const p = preventivo(c, [
    { id: 'a', kmDeviazione: 0, quotaPersonalizzata: equa + 100 },
    { id: 'b', kmDeviazione: 0, quotaPersonalizzata: equa },
    { id: 'c', kmDeviazione: 0, quotaPersonalizzata: equa - 100 },
  ])
  assert.equal(p.quote[0]!.quota, equa + 100)
  assert.equal(p.quote[2]!.quota, equa - 100)
  // il conducente incassa esattamente quanto avrebbe incassato prima
  assert.equal(p.incassoConducente, equa * 3)
})

test('ridistribuire non può far crescere il totale', () => {
  const c = corsa({ modalita: 'privata', postiOfferti: 3 })
  const equa = quotaApplicata(c)
  assert.throws(() => preventivo(c, [
    { id: 'a', kmDeviazione: 0, quotaPersonalizzata: equa + 1 },
    { id: 'b', kmDeviazione: 0, quotaPersonalizzata: equa },
    { id: 'c', kmDeviazione: 0, quotaPersonalizzata: equa },
  ]), ViolazioneConformita)
})

test('le quote personalizzate non esistono sulle corse pubbliche', () => {
  const c = corsa({ modalita: 'pubblica', postiOfferti: 3 })
  assert.throws(() => preventivo(c, [
    { id: 'a', kmDeviazione: 0, quotaPersonalizzata: 100 },
  ]), ViolazioneConformita)
})

test('anche ridistribuendo, il conducente non rientra mai del costo', () => {
  const c = corsa({ modalita: 'privata', postiOfferti: 4 })
  const tetto = tettoComplessivo(c)
  // il caso estremo: una persona sola si accolla tutto il tetto
  const p = preventivo(c, [
    { id: 'a', kmDeviazione: 0, quotaPersonalizzata: tetto },
    { id: 'b', kmDeviazione: 0, quotaPersonalizzata: 0 },
    { id: 'c', kmDeviazione: 0, quotaPersonalizzata: 0 },
    { id: 'd', kmDeviazione: 0, quotaPersonalizzata: 0 },
  ])
  assert.ok(p.incassoConducente < p.costoEffettivo)
  assert.ok(p.restaACaricoConducente > 0)
})

test('nessuna quota negativa', () => {
  const c = corsa({ modalita: 'privata', postiOfferti: 2 })
  assert.throws(() => preventivo(c, [
    { id: 'a', kmDeviazione: 0, quotaPersonalizzata: -100 },
    { id: 'b', kmDeviazione: 0, quotaPersonalizzata: 200 },
  ]), ViolazioneConformita)
})

/**
 * Le mance non esistono, e non è una dimenticanza.
 *
 * Una mancia è denaro al conducente OLTRE il costo del viaggio: è profitto
 * per definizione. Il profitto è il primo dei tre elementi del test
 * giurisprudenziale, ed è l'unico che abbiamo eliminato per costruzione —
 * tutto il resto dell'impianto poggia su quello.
 *
 * Questo test esiste per fermare chi, un giorno, proverà ad aggiungerle.
 */
test('nessun modo di far incassare al conducente più del costo', () => {
  let provate = 0
  for (const c of tutteLeCorse()) {
    const privata = { ...c, modalita: 'privata' as const }
    const tetto = tettoComplessivo(privata)

    // Un conducente che sconta tutto porta il tetto a zero: nessuno paga
    // niente, ed è legittimo — è il passaggio offerto a un amico.
    if (tetto === 0) {
      const p = preventivo(privata, [{ id: 'a', kmDeviazione: 0, quotaPersonalizzata: 0 }])
      assert.equal(p.incassoConducente, 0)
      continue
    }

    // Qualunque tentativo di superare il tetto viene rifiutato.
    assert.throws(() => preventivo(privata, [
      { id: 'a', kmDeviazione: 0, quotaPersonalizzata: tetto + 1 },
    ]), ViolazioneConformita, `tetto ${tetto} superabile`)

    // E ogni ripartizione ammessa lascia comunque il conducente in perdita.
    const estrema = preventivo(privata, [
      { id: 'a', kmDeviazione: 0, quotaPersonalizzata: tetto },
      ...Array.from({ length: privata.postiOfferti - 1 }, (_, i) => ({
        id: `p${i}`, kmDeviazione: 0, quotaPersonalizzata: 0,
      })),
    ])
    assert.ok(estrema.restaACaricoConducente > 0)
    provate++
  }
  assert.ok(provate > 500, `solo ${provate} combinazioni provate`)
})
