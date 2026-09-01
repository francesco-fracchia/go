#!/usr/bin/env node
/**
 * Gli elenchi di valori che vivono in due posti.
 *
 * `tipo_notifica` è un enum nel database E un tipo unione in TypeScript.
 * Aggiungere un valore da una parte sola compila, passa i test, e fallisce
 * al primo invio vero — che per una notifica vuol dire di notte, a
 * qualcuno che aspettava. È successo con `account_sospeso`: TypeScript era
 * contento, il database no.
 *
 * Il confronto è fra il database VERO e le stringhe scritte nel codice,
 * perché è l'unica coppia che conta davvero.
 */
import { readFileSync } from 'node:fs'
import pg from 'pg'

const stringa = (process.env.DATABASE_URL ?? '').trim().replace(/^["']|["']$/g, '')
if (!stringa) { console.log('DATABASE_URL non impostata: controllo saltato.'); process.exit(0) }

/** enum del database → file e nome del tipo che lo rispecchia. */
const COPPIE = [
  { enum: 'tipo_notifica', file: 'src/server/notifiche.ts', tipo: 'Tipo' },
  { enum: 'tipo_segnalazione', file: 'src/server/segnalazioni.ts', tipo: 'TipoSegnalazione' },
  { enum: 'politica_cancellazione', file: 'src/lib/disdette.ts', tipo: 'Politica' },
  { enum: 'modalita_corsa', file: 'src/lib/pricing.ts', tipo: 'Modalita' },
]

const c = new pg.Client({ connectionString: stringa, ssl: { rejectUnauthorized: false } })
await c.connect()

let problemi = 0
for (const p of COPPIE) {
  const { rows } = await c.query(
    `select e.enumlabel as v from pg_enum e join pg_type t on t.oid = e.enumtypid
      where t.typname = $1 order by e.enumsortorder`, [p.enum])
  const nelDatabase = new Set(rows.map((r) => r.v))
  if (nelDatabase.size === 0) { console.log(`  ${p.enum}: non esiste nel database`); problemi++; continue }

  /**
   * L'elenco si legge riga per riga, non con un'espressione regolare.
   *
   * Una definizione può avere una nota in mezzo, e togliendo il commento
   * resta una riga vuota: qualunque espressione che si fermi al primo
   * vuoto taglia l'elenco a metà e dichiara mancante un valore che c'è.
   * È successo al primo tentativo — e un controllo che grida al lupo si
   * smette di ascoltarlo.
   *
   * Riga per riga la regola è semplice e si legge: si parte dalla
   * dichiarazione, si tengono le righe che continuano l'unione, ci si
   * ferma alla prima riga che dice altro.
   */
  const righe = readFileSync(p.file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
    .split('\n')
  const inizio = righe.findIndex((r) => r.includes(`export type ${p.tipo}`))
  if (inizio < 0) { console.log(`  ${p.tipo}: non trovato in ${p.file}`); problemi++; continue }

  const pezzi = [righe[inizio]]
  for (let i = inizio + 1; i < righe.length; i++) {
    const r = righe[i].trim()
    if (r === '') continue
    if (!r.startsWith('|')) break
    pezzi.push(r)
  }

  const nelCodice = new Set([...pezzi.join(' ').matchAll(/'([a-z_0-9]+)'/g)].map((x) => x[1]))

  const soloDb = [...nelDatabase].filter((v) => !nelCodice.has(v))
  const soloTs = [...nelCodice].filter((v) => !nelDatabase.has(v))
  if (soloDb.length || soloTs.length) {
    problemi++
    console.log(`\n  ${p.enum} ↔ ${p.tipo}`)
    if (soloTs.length) console.log(`      solo nel codice: ${soloTs.join(', ')}   ← il database li rifiuta`)
    if (soloDb.length) console.log(`      solo nel database: ${soloDb.join(', ')}`)
  }
}
await c.end()

if (problemi === 0) {
  console.log(`${COPPIE.length} elenchi di valori, database e codice d'accordo.`)
  process.exit(0)
}
console.log('\nUn valore che sta da una parte sola compila e fallisce a runtime.')
process.exit(1)
