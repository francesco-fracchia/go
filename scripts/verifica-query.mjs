#!/usr/bin/env node
/**
 * Ogni interrogazione, chiesta davvero al database.
 *
 * Nasce da un guasto che nessun test avrebbe preso: la pagina di una corsa
 * chiedeva `veicoli.bagagli_grandi`, una colonna che una migrazione aveva
 * sostituito da mesi. Il compilatore non lo sa — dentro `.select()` c'è una
 * stringa — e la modalità dimostrativa non protesta, perché il finto
 * database non conosce le colonne. Risultato: il dettaglio di QUALUNQUE
 * corsa rispondeva «pagina non trovata», e solo contro il Supabase vero.
 *
 * Qui si estrae ogni coppia `from('tabella').select(…)` dal codice e la si
 * manda al database con `limit(0)`: non legge niente, ma il database deve
 * comunque accettare ogni nome che compare. Se una colonna è stata
 * rinominata o tolta, si scopre qui invece che da un utente.
 *
 *   node --env-file=.env.local scripts/verifica-query.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const chiave = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !chiave) {
  console.error('Servono NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.')
  console.error('Prova con:  node --env-file=.env.local scripts/verifica-query.mjs')
  process.exit(2)
}
const db = createClient(url, chiave, { auth: { persistSession: false } })

const file = []
;(function cammina(d) {
  for (const n of readdirSync(d)) {
    const p = join(d, n)
    if (statSync(p).isDirectory()) { if (n !== 'demo') cammina(p) }
    else if (/\.tsx?$/.test(n) && !n.endsWith('.test.ts')) file.push(p)
  }
})('src')

const coppie = []
for (const f of file) {
  const s = readFileSync(f, 'utf8')
  // `.from('x')` seguito da `.select(…)`, anche a capo, con apici o backtick.
  const re = /\.from\(\s*'([a-z_]+)'\s*\)\s*(?:\r?\n\s*)*\.select\(\s*(`[^`]*`|'[^']*')/g
  let m
  while ((m = re.exec(s))) {
    coppie.push({ f, tabella: m[1], sel: m[2].slice(1, -1).replace(/\s+/g, ' ').trim() })
  }
}

let rotte = 0
for (const c of coppie) {
  const { error } = await db.from(c.tabella).select(c.sel).limit(0)
  if (error) {
    rotte++
    console.error(`✗ ${c.f}\n  from('${c.tabella}') → ${error.message}`)
  }
}

console.log(`${coppie.length} interrogazioni verificate su ${file.length} file.`)
if (rotte > 0) {
  console.error(`${rotte} che il database rifiuta.`)
  process.exit(1)
}
console.log('Tutte accettate.')
