-- ═══════════════════════════════════════════════════════════════════════
-- Rileggere un percorso dalla cache.
--
-- La colonna `percorso` è una geography, e PostgREST la restituisce come
-- WKB esadecimale: una stringa. Il codice si aspettava un oggetto GeoJSON,
-- non lo trovava, e restituiva una polilinea VUOTA — senza errori, senza
-- avvisi, con i chilometri giusti accanto.
--
-- Il danno non era nella cache: era nella corsa. Il primo che pubblicava
-- una tratta la calcolava e la metteva in cache; il secondo la rileggeva
-- con zero punti e finiva per scrivere `LINESTRING()`, che PostGIS rifiuta
-- con «parse error - invalid geometry». La stessa tratta funzionava una
-- volta sola nella storia dell'applicazione.
--
-- Questa funzione restituisce il percorso già come GeoJSON, che è la forma
-- in cui il codice lo sa leggere.
-- ═══════════════════════════════════════════════════════════════════════

create or replace function leggi_percorso(p_chiave text)
returns table (km numeric, minuti smallint, percorso jsonb)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select c.km, c.minuti, st_asgeojson(c.percorso)::jsonb
  from percorsi_cache c
  where c.chiave = p_chiave
$$;

grant execute on function leggi_percorso(text) to service_role, authenticated;

-- Le righe già in cache non sono sbagliate — sono solo state lette male.
-- Con la funzione tornano leggibili, quindi non c'è niente da buttare.
