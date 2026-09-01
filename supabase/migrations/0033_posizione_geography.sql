-- ═══════════════════════════════════════════════════════════════════════
-- Il GPS non ha mai funzionato.
--
--     segna_posizione  →  400  «type "geography" does not exist»
--
-- La funzione era dichiarata `security definer set search_path = public`.
-- Su Supabase i tipi PostGIS non stanno in `public`: stanno in
-- `extensions`. Con quel percorso di ricerca `::geography` non si risolve,
-- e la funzione falliva a OGNI chiamata, dal primo giorno.
--
-- Altre funzioni del progetto lo fanno correttamente — `chi_invita`,
-- `comitiva_da_codice` e `turno_comitiva` dichiarano tutte
-- `public, extensions`. Questa no, e nessuno se n'è accorto perché una
-- posizione che non si salva non rompe niente: la corsa procede, il
-- pagamento matura, il viaggio finisce. Manca solo il puntino sulla mappa,
-- e chi lo aspettava pensa che sia la rete.
--
-- Peggio: il client controlla soltanto il codice 409 per capire se deve
-- smettere. Davanti a un 400 continuava a mandare punti e a scrivere
-- «posizione attiva» sullo schermo di chi guida. Diceva di condividere una
-- cosa che non condivideva.
-- ═══════════════════════════════════════════════════════════════════════

create or replace function segna_posizione(
  p_corsa uuid, p_conducente uuid, p_lat double precision, p_lng double precision,
  p_minuti smallint default null
) returns boolean
language plpgsql security definer set search_path = public, extensions as $$
declare ok boolean := false;
begin
  select true into ok
    from corse c
   where c.id = p_corsa
     and c.conducente = p_conducente
     and c.stato in ('confermata','in_corso')
     and now() between c.ora_partenza - interval '30 minutes'
                   and coalesce(c.ora_arrivo, c.ora_partenza) + interval '30 minutes';

  if not coalesce(ok, false) then return false; end if;

  insert into posizioni_corsa (corsa, conducente, geo, minuti_stimati, aggiornata_il)
  values (p_corsa, p_conducente,
          ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
          p_minuti, now())
  on conflict (corsa) do update
    set geo = excluded.geo,
        minuti_stimati = excluded.minuti_stimati,
        aggiornata_il = now();
  return true;
end $$;

grant execute on function segna_posizione(uuid, uuid, double precision, double precision, smallint)
  to service_role;
