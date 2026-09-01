#!/usr/bin/env node
/**
 * Codice scritto, corretto, e mai chiamato da nessuno.
 *
 * È la forma che avevano quattro difetti su cinque trovati in un solo
 * giorno: `dichiaraPrivato`, che rendeva impossibile pubblicare;
 * `carburante.ts`, che sapeva scomporre un costo e non lo importava
 * nessuno; `liquidaSettimana`, per cui i soldi non arrivavano mai a chi
 * guidava; `ritorno_incasso_unico`, una colonna con un trigger e nessun
 * lettore.
 *
 * Nessuno di questi rompe un test, perché ogni pezzo preso da solo
 * funziona. Non li trova il compilatore, perché sono export legittimi. Si
 * vedono solo chiedendo la domanda che nessuno fa: «e questa, chi la
 * chiama?»
 *
 * Il controllo è volutamente grezzo — cerca il nome nel testo degli altri
 * file — perché un'analisi vera del grafo delle dipendenze costerebbe dieci
 * volte tanto per trovare le stesse cose. I falsi positivi si annotano
 * nell'elenco qui sotto, con il motivo.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const RADICE = 'src'

/** Quello che è export apposta e non deve avere chiamanti nel progetto. */
const AMMESSI = new Set([
  // Next.js le chiama per convenzione, non per nome.
  'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS',
  'default', 'metadata', 'dynamic', 'revalidate', 'runtime', 'generateMetadata',
])

const file = []
;(function cammina(d) {
  for (const n of readdirSync(d)) {
    const p = join(d, n)
    if (statSync(p).isDirectory()) cammina(p)
    else if (/\.tsx?$/.test(n)) file.push(p)
  }
})(RADICE)

const testi = new Map(file.map((f) => [f, readFileSync(f, 'utf8')]))

const orfani = []
for (const [f, testo] of testi) {
  // I test esistono per chiamare cose: se un export lo usa solo un test,
  // in produzione è comunque orfano — quindi i test non contano come
  // chiamanti, ma non si analizzano nemmeno come sorgenti.
  if (f.includes('.test.')) continue

  const nomi = [...testo.matchAll(
    /^export\s+(?:async\s+)?(?:function|const|class)\s+([A-Za-z_$][\w$]*)/gm,
  )].map((m) => m[1])

  for (const nome of nomi) {
    if (AMMESSI.has(nome)) continue
    /**
     * Conta anche gli usi NELLO STESSO file, tolta la riga che lo esporta.
     *
     * Senza questo, ogni funzione usata solo dal suo modulo risultava orfana
     * — e in un elenco pieno di falsi positivi le tre righe vere non le
     * legge nessuno. Un controllo che grida sempre è un controllo spento.
     */
    const altrove = [...testi].some(([g, t]) =>
      g !== f && !g.includes('.test.') && new RegExp(`\\b${nome}\\b`).test(t))
    const quiDentro = [...testo.matchAll(new RegExp(`\\b${nome}\\b`, 'g'))].length > 1
    if (!altrove && !quiDentro) orfani.push({ file: relative('.', f), nome })
  }
}

if (orfani.length === 0) {
  console.log('Nessun orfano: ogni cosa esportata ha almeno un chiamante.')
  process.exit(0)
}

console.log(`${orfani.length} cose esportate che nessun altro file usa:\n`)
let precedente = ''
for (const o of orfani.sort((a, b) => a.file.localeCompare(b.file))) {
  if (o.file !== precedente) { console.log(`  ${o.file}`); precedente = o.file }
  console.log(`      ${o.nome}`)
}
console.log(
  '\nNon è detto che siano difetti: alcune cose sono esportate per essere\n'
  + 'provate, altre servono a un solo file. Ma ognuna merita la domanda —\n'
  + 'chi la chiama? — perché è la forma che avevano quattro difetti su\n'
  + 'cinque trovati in un giorno.')
