#!/usr/bin/env node
/**
 * Dalle risposte del questionario alle tratte su cui lanciare.
 *
 * Il sondaggio chiede DOVE si va, non quanti chilometri sono: cinquanta
 * persone che rispondono «40 km» possono andare in cinquanta posti
 * diversi, e in quel caso non c'è un mercato — ci sono cinquanta persone
 * sole. Il nome del posto invece si può raggruppare, ed è l'unica cosa
 * che dice su quale tratta mettere il primo conducente.
 *
 * I chilometri li mette questo script, con lo stesso geocoder e lo stesso
 * motore di percorsi che l'applicazione usa già.
 *
 *   node --experimental-strip-types --env-file=.env.local \
 *        scripts/tratte.ts risposte.csv
 */
import { readFileSync } from 'node:fs'
import { risolvi } from '../src/server/luoghi.ts'
import { percorso } from '../src/server/percorsi.ts'

/** Un CSV con le virgolette, senza portarsi dietro una libreria. */
function leggiCsv(testo: string): string[][] {
  const righe: string[][] = []
  let campo = '', riga: string[] = [], dentro = false
  for (let i = 0; i < testo.length; i++) {
    const c = testo[i]
    if (dentro) {
      if (c === '"' && testo[i + 1] === '"') { campo += '"'; i++ }
      else if (c === '"') dentro = false
      else campo += c
    } else if (c === '"') dentro = true
    else if (c === ',' || c === ';') { riga.push(campo); campo = '' }
    else if (c === '\n') { riga.push(campo); righe.push(riga); riga = []; campo = '' }
    else if (c !== '\r') campo += c
  }
  if (campo || riga.length) { riga.push(campo); righe.push(riga) }
  return righe.filter((r) => r.some((x) => x.trim()))
}

/**
 * Le colonne si riconoscono dalle parole, non dalla posizione.
 *
 * Google Forms mette come intestazione il testo intero della domanda, e
 * quel testo cambia se si corregge una virgola. Cercare una parola chiave
 * regge a una riscrittura; contare le colonne no.
 */
const COLONNE = {
  comune: ['comune', 'abiti'],
  destinazione: ['dove', 'posto', 'destinazione'],
  mezzo: ['come ci sei andato', 'mezzo'],
  posti: ['posti', 'vuoti'],
  perche: ['perché non in auto', 'perche non in auto'],
  porterebbe: ['passaggio a qualcuno', 'avresti dato'],
  salirebbe: ['saresti salito'],
  prezzo: ['quanto pagheresti', 'due di notte'],
} as const

const trovaColonne = (intestazione: string[]) => {
  const m = {} as Record<keyof typeof COLONNE, number>
  for (const [nome, parole] of Object.entries(COLONNE)) {
    m[nome as keyof typeof COLONNE] = intestazione.findIndex(
      (h) => parole.some((p) => h.toLowerCase().includes(p)))
  }
  return m
}

const pulisci = (s: string) => s.trim().toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')

interface Tratta {
  da: string; a: string
  km: number | null
  risposte: number
  conducenti: number   // ha guidato e aveva posti liberi
  passeggeri: number   // salirebbe con uno sconosciuto
  postiLiberi: number
  prezzi: number[]
}

const PREZZO: Record<string, number> = {
  'niente': 0, 'fino a 5': 5, 'fino a 10': 10, 'fino a 20': 20,
}

async function main() {
  const file = process.argv[2]
  if (!file) {
    console.error('uso: node --experimental-strip-types --env-file=.env.local scripts/tratte.ts risposte.csv')
    process.exit(1)
  }
  const righe = leggiCsv(readFileSync(file, 'utf8'))
  const intestazione = righe.shift()
  if (!intestazione) { console.error('csv vuoto'); process.exit(1) }
  const col = trovaColonne(intestazione)

  const mancanti = (['comune', 'destinazione'] as const).filter((k) => col[k] < 0)
  if (mancanti.length) {
    console.error(`colonne non trovate: ${mancanti.join(', ')}`)
    console.error('intestazioni lette:\n  ' + intestazione.join('\n  '))
    process.exit(1)
  }

  const per = new Map<string, Tratta>()
  let senzaViaggio = 0

  for (const r of righe) {
    const da = (r[col.comune] ?? '').trim()
    const a = (r[col.destinazione] ?? '').trim()
    if (!da) continue
    // Chi non ha un viaggio ripetuto è il risultato più importante del
    // sondaggio: si conta, non si butta.
    if (!a || /^(no|nessuno|niente|-)$/i.test(a)) { senzaViaggio++; continue }

    const chiave = `${pulisci(da)}→${pulisci(a)}`
    const t = per.get(chiave) ?? {
      da, a, km: null, risposte: 0, conducenti: 0, passeggeri: 0, postiLiberi: 0, prezzi: [],
    }
    t.risposte++

    const posti = Number((r[col.posti] ?? '').match(/\d/)?.[0] ?? 0)
    const guidava = /auto mia/i.test(r[col.mezzo] ?? '')
    if (guidava && posti > 0) { t.conducenti++; t.postiLiberi += posti }
    if (/^s[iì]/i.test((r[col.salirebbe] ?? '').trim())) t.passeggeri++

    const p = Object.entries(PREZZO).find(([k]) => (r[col.prezzo] ?? '').toLowerCase().includes(k))
    if (p) t.prezzi.push(p[1])

    per.set(chiave, t)
  }

  /* I chilometri, dal geocoder e dal motore che l'applicazione usa già. */
  for (const t of per.values()) {
    try {
      const [o, d] = await Promise.all([risolvi(t.da), risolvi(t.a)])
      if (o && d) t.km = (await percorso([o, d])).km
    } catch { /* una tratta senza chilometri resta senza: non si inventa */ }
  }

  /**
   * L'ordine è per COPPIE POSSIBILI, non per risposte totali.
   *
   * Una tratta con venti passeggeri e nessun conducente non vale niente:
   * non ci si incontra. Quello che conta è il minore fra chi offre e chi
   * cerca, perché è quante corse possono davvero accadere.
   */
  const tratte = [...per.values()]
    .map((t) => ({ ...t, coppie: Math.min(t.postiLiberi, t.passeggeri) }))
    .sort((x, y) => y.coppie - x.coppie || y.risposte - x.risposte)

  const eur = (v: number[]) => v.length
    ? (v.reduce((s, x) => s + x, 0) / v.length).toFixed(1) + ' €' : '—'

  console.log(`\n${righe.length} risposte · ${senzaViaggio} senza un viaggio ripetuto `
    + `(${Math.round(senzaViaggio / righe.length * 100)}%)\n`)
  console.log('coppie  tratta                                    km   risposte  posti  saliranno  prezzo')
  console.log('─'.repeat(96))
  for (const t of tratte.slice(0, 25)) {
    console.log(
      String(t.coppie).padStart(5)
      + '   ' + `${t.da} → ${t.a}`.slice(0, 40).padEnd(42)
      + (t.km !== null ? String(t.km).padStart(5) : '    —')
      + String(t.risposte).padStart(10)
      + String(t.postiLiberi).padStart(7)
      + String(t.passeggeri).padStart(11)
      + eur(t.prezzi).padStart(9))
  }
  console.log(`\nla prima riga è la tratta da cui partire: è quella dove `
    + `offerta e domanda esistono ENTRAMBE.`)
}

await main()
