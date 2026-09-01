import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import pg from 'pg'

const cammina = (d, out = []) => {
  for (const n of readdirSync(d)) {
    const p = join(d, n)
    if (statSync(p).isDirectory()) cammina(p, out); else out.push(p)
  }
  return out
}
const codice = [...cammina('src'), ...cammina('supabase/migrations')]
  .filter((f) => /\.(tsx?|sql|mjs)$/.test(f))
  .map((f) => ({ f, t: readFileSync(f, 'utf8') }))

// le migrazioni definiscono: per capire se una colonna è USATA serve il resto
const soloCodice = codice.filter((x) => x.f.startsWith('src/'))

const c = new pg.Client({ connectionString: (process.env.DATABASE_URL ?? '').trim().replace(/^["']|["']$/g, ''), ssl: { rejectUnauthorized: false } })
await c.connect()
const { rows } = await c.query(`
  select c.table_name as tabella, c.column_name as colonna
    from information_schema.columns c
    join pg_class p on p.relname = c.table_name
    join pg_namespace n on n.oid = p.relnamespace and n.nspname = 'public'
   where c.table_schema = 'public' and p.relkind = 'r'
   order by 1, 2`)
await c.end()

const IGNORA = new Set(['id', 'creato_il', 'creata_il', 'aggiornata_il', 'usato_il'])
const mai = []
for (const r of rows) {
  if (IGNORA.has(r.colonna)) continue
  if (r.tabella === '_migrazioni') continue
  const re = new RegExp(`\\b${r.colonna}\\b`)
  if (!soloCodice.some((x) => re.test(x.t))) mai.push(r)
}

console.log(`${rows.length} colonne, ${mai.length} che il codice non nomina mai:\n`)
let prec = ''
for (const r of mai) {
  if (r.tabella !== prec) { console.log(`  ${r.tabella}`); prec = r.tabella }
  console.log(`      ${r.colonna}`)
}
