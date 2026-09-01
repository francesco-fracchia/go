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
const soloTest = []
for (const [f, testo] of testi) {
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
    const re = new RegExp(`\\b${nome}\\b`)
    const inProduzione = [...testi].some(([g, t]) =>
      g !== f && !g.includes('.test.') && re.test(t))
    const quiDentro = [...testo.matchAll(new RegExp(`\\b${nome}\\b`, 'g'))].length > 1
    if (inProduzione || quiDentro) continue

    /**
     * «Usato solo dai test» è un avviso, non un allarme.
     *
     * Può essere legittimo — `aci.ts` dichiara nella sua intestazione di
     * restare solo come riferimento per le prove — oppure può essere
     * codice di produzione morto, tenuto in vita da un test che lo prova
     * e basta. Sono due cose diverse e vanno lette diversamente, quindi si
     * separano invece di finire nello stesso mucchio.
     */
    const neiTest = [...testi].some(([g, t]) =>
      g !== f && g.includes('.test.') && re.test(t))
    ;(neiTest ? soloTest : orfani).push({ file: relative('.', f), nome })
  }
}

const elenca = (titolo, righe) => {
  if (righe.length === 0) return
  console.log(`\n${titolo}\n`)
  let precedente = ''
  for (const o of righe.sort((a, b) => a.file.localeCompare(b.file))) {
    if (o.file !== precedente) { console.log(`  ${o.file}`); precedente = o.file }
    console.log(`      ${o.nome}`)
  }
}

if (orfani.length === 0 && soloTest.length === 0) {
  console.log('Nessun orfano: ogni cosa esportata ha almeno un chiamante.')
  process.exit(0)
}

elenca(`${orfani.length} cose che NON CHIAMA NESSUNO, nemmeno un test:`, orfani)
elenca(`${soloTest.length} cose che chiama SOLO un test:`, soloTest)
console.log(
  '\nNon è detto che siano difetti: alcune cose sono esportate per essere\n'
  + 'provate, altre servono a un solo file. Ma ognuna merita la domanda —\n'
  + 'chi la chiama? — perché è la forma che avevano quattro difetti su\n'
  + 'cinque trovati in un giorno.')
