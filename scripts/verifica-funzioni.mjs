#!/usr/bin/env node
/**
 * Le funzioni `security definer` e il loro percorso di ricerca.
 *
 * È la classe di difetto che è costata mesi al GPS. `segna_posizione` era
 * dichiarata `set search_path = public`, ma su Supabase i tipi PostGIS
 * stanno in `extensions`: il cast a `geography` non si risolveva e la
 * funzione falliva a OGNI chiamata. Nessun errore visibile — una posizione
 * che non si salva non rompe niente — e chi aspettava il puntino pensava
 * fosse la rete.
 *
 * Si guarda il DATABASE, non i file: le migrazioni sono una storia, e una
 * funzione può essere stata corretta da una migrazione successiva senza
 * che il file vecchio lo dica. `leggi_percorso` è proprio così.
 *
 * Le funzioni che non sono nostre — quelle di Supabase — si riconoscono
 * dal percorso `pg_catalog` e si lasciano stare.
 */
import pg from 'pg'

const stringa = (process.env.DATABASE_URL ?? '').trim().replace(/^["']|["']$/g, '')
if (!stringa) {
  console.log('DATABASE_URL non impostata: controllo saltato.')
  process.exit(0)
}

const c = new pg.Client({ connectionString: stringa, ssl: { rejectUnauthorized: false } })
await c.connect()
const { rows } = await c.query(`
  select p.proname as nome,
         coalesce(array_to_string(p.proconfig, ', '), '') as impostazioni
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.prosecdef
   order by 1`)
await c.end()

const nostre = rows.filter((r) => !r.impostazioni.includes('pg_catalog'))
const senza = nostre.filter((r) =>
  !/search_path=public,\s*extensions/.test(r.impostazioni.replace(/\s+/g, ' ')))

if (senza.length === 0) {
  console.log(`${nostre.length} funzioni security definer, tutte con search_path fissato.`)
  process.exit(0)
}

console.log(`${senza.length} funzioni security definer senza «public, extensions»:\n`)
for (const r of senza) {
  console.log(`  ${r.nome.padEnd(26)} ${r.impostazioni || '— nessun search_path'}`)
}
console.log(
  '\nOggi possono funzionare lo stesso, se non usano tipi PostGIS. Ma la\n'
  + 'prossima riga scritta lì dentro potrebbe usarli, e allora fallirebbero\n'
  + 'in silenzio — come è successo a segna_posizione per mesi.')
process.exit(1)
