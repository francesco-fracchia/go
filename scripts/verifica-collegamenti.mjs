#!/usr/bin/env node
/**
 * Collegamenti che portano a pagine che non esistono.
 *
 * È la forma di difetto più imbarazzante: un pulsante in bella vista che
 * risponde 404, e che nessuno scopre finché non lo preme qualcuno — di
 * solito nel momento in cui serviva davvero. `/chiama/[id]` era lì, sulla
 * schermata di chi aspetta al punto di ritrovo, comparendo solo nella
 * mezz'ora prima della partenza.
 *
 * Non lo trova il compilatore: un href è una stringa. Non lo trova un test
 * che non clicca. Si trova solo confrontando le stringhe con l'elenco vero
 * delle rotte, che è quello che fa questo controllo.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const cammina = (d, out = []) => {
  for (const n of readdirSync(d)) {
    const p = join(d, n)
    if (statSync(p).isDirectory()) cammina(p, out)
    else out.push(p)
  }
  return out
}

/* ── 1. Le rotte che esistono davvero ────────────────────────────────── */
const rotte = new Set()
for (const f of cammina('src/app')) {
  const m = f.match(/^src\/app\/(.*)\/(page|route)\.tsx?$/)
  if (!m) continue
  // I gruppi (nome) non compaiono nell'indirizzo; [x] è un segmento qualsiasi.
  const percorso = '/' + m[1]
    .split('/')
    .filter((s) => !s.startsWith('('))
    .map((s) => (s.startsWith('[') ? '*' : s))
    .join('/')
  rotte.add(percorso === '/' ? '/' : percorso.replace(/\/$/, ''))
}
rotte.add('/')

/* ── 2. I collegamenti scritti nel codice ────────────────────────────── */
const sorgenti = [...cammina('src/components'), ...cammina('src/app')]
  .filter((f) => /\.tsx?$/.test(f) && !f.includes('.test.'))

const rotti = []
for (const f of sorgenti) {
  const testo = readFileSync(f, 'utf8')
  const trovati = [
    ...testo.matchAll(/href="(\/[^"#?]*)"/g),
    ...testo.matchAll(/href=\{`(\/[^`#?]*)`\}/g),
    ...testo.matchAll(/window\.location\.href\s*=\s*[`'"](\/[^`'"#?]*)/g),
  ]
  for (const [, grezzo] of trovati) {
    // `${...}` diventa un segmento qualsiasi, come [x] fra le rotte.
    const p = grezzo.replace(/\$\{[^}]*\}/g, '*').replace(/\/$/, '') || '/'
    if (p.startsWith('/api/')) continue
    if (rotte.has(p)) continue
    // Un segmento variabile può contenere una barra a runtime: si accetta
    // se esiste una rotta che comincia allo stesso modo.
    if ([...rotte].some((r) => r === p || r.startsWith(`${p}/`))) continue
    rotti.push({ file: relative('.', f), collegamento: grezzo })
  }
}

if (rotti.length === 0) {
  console.log(`${rotte.size} rotte, nessun collegamento rotto.`)
  process.exit(0)
}

console.log(`${rotti.length} collegamenti che non portano a nessuna rotta:\n`)
for (const r of rotti) console.log(`  ${r.file}\n      ${r.collegamento}`)
console.log('\nOgnuno è un pulsante che risponde 404 a chi lo preme.')
process.exit(1)
