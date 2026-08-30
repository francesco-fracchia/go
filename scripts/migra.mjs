/**
 * Applica le migrazioni al database, una per volta e in ordine.
 *
 * Meglio di incollare a mano in una pagina web per tre ragioni: si ferma
 * al primo errore invece di lasciare metà schema applicato, dice QUALE
 * file e quale riga, e tiene il conto di cosa è già stato fatto — così
 * rilanciarlo dopo aver corretto un errore riprende da dove si era fermato
 * invece di ricominciare.
 *
 *   node scripts/migra.mjs            applica quelle che mancano
 *   node scripts/migra.mjs --stato    dice cosa è stato applicato
 *   node scripts/migra.mjs --tutto    riapplica tutto da capo
 */
import { readFile, readdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import pg from 'pg'

const STRINGA = process.env.DATABASE_URL
if (!STRINGA) {
  console.error(`
Manca DATABASE_URL.

Su Supabase: Project Settings → Database → Connection string → URI.
Copia quella che comincia con postgresql:// e mettila in go/.env.local:

  DATABASE_URL=postgresql://postgres.xxxx:LA_PASSWORD@aws-0-eu-central-1.pooler.supabase.com:5432/postgres

La password è quella che hai salvato quando hai creato il progetto.
`)
  process.exit(1)
}

const cliente = new pg.Client({
  connectionString: STRINGA,
  ssl: { rejectUnauthorized: false },
})

const impronta = (t) => createHash('sha256').update(t).digest('hex').slice(0, 16)

await cliente.connect()

// Il registro di cosa è già passato. Sta nel database perché è l'unico
// posto che sopravvive a un computer diverso.
await cliente.query(`
  create table if not exists _migrazioni (
    nome text primary key,
    impronta text not null,
    applicata_il timestamptz not null default now()
  )`)

const tutto = process.argv.includes('--tutto')
const soloStato = process.argv.includes('--stato')

const { rows: fatte } = await cliente.query('select nome, impronta from _migrazioni')
const gia = new Map(fatte.map((r) => [r.nome, r.impronta]))

const file = (await readdir('supabase/migrations')).filter((f) => f.endsWith('.sql')).sort()

if (soloStato) {
  for (const f of file) {
    const t = await readFile(`supabase/migrations/${f}`, 'utf8')
    const stato = !gia.has(f) ? 'da fare'
      : gia.get(f) === impronta(t) ? 'fatta'
      : 'CAMBIATA dopo essere stata applicata'
    console.log(`  ${stato.padEnd(38)} ${f}`)
  }
  await cliente.end()
  process.exit(0)
}

let applicate = 0
for (const f of file) {
  const testo = await readFile(`supabase/migrations/${f}`, 'utf8')
  if (!tutto && gia.get(f) === impronta(testo)) continue

  process.stdout.write(`  ${f} … `)
  try {
    // Ogni migrazione in una transazione: se fallisce a metà non lascia
    // dietro mezze tabelle da ripulire a mano.
    await cliente.query('begin')
    await cliente.query(testo)
    await cliente.query(
      `insert into _migrazioni (nome, impronta) values ($1, $2)
       on conflict (nome) do update set impronta = $2, applicata_il = now()`,
      [f, impronta(testo)],
    )
    await cliente.query('commit')
    console.log('fatta')
    applicate++
  } catch (e) {
    await cliente.query('rollback').catch(() => {})
    console.log('FALLITA\n')
    console.error(`  ${e.message}`)
    if (e.position) {
      const riga = testo.slice(0, Number(e.position)).split('\n').length
      const contesto = testo.split('\n').slice(Math.max(0, riga - 3), riga + 2)
      console.error(`\n  riga ${riga}:\n`)
      for (const c of contesto) console.error('    ' + c)
    }
    console.error('\n  Niente è stato applicato di questo file. Correggi e rilancia.')
    await cliente.end()
    process.exit(1)
  }
}

console.log(applicate === 0 ? '\nGià tutto a posto.' : `\n${applicate} migrazioni applicate.`)
await cliente.end()
