-- ═══════════════════════════════════════════════════════════════════════
-- Cercare un posto come lo si nomina.
--
-- La ricerca voleva le parole attaccate e nell'ordine esatto del nome, e
-- guardava SOLO il nome: «fitactive lodi» non trovava una palestra che si
-- chiama «FitActive» e sta a Lodi, perché la città è una colonna a parte e
-- «lodi» non compare nel nome.
--
-- È lo stesso difetto che avevamo sui modelli di auto, e costa lo stesso:
-- chi non trova il proprio posto scrive un indirizzo approssimativo, e da
-- lì in poi tutto — il percorso, il prezzo, il punto di ritrovo — è
-- approssimativo con lui.
--
-- Adesso ogni parola deve comparire, in qualunque ordine, dentro il nome
-- OPPURE nella città.
-- ═══════════════════════════════════════════════════════════════════════

create or replace function cerca_posti(
  p_testo text, p_geo geography default null, p_limite integer default 5
)
returns table (
  id uuid, nome text, categoria categoria_posto, citta text,
  lat double precision, lng double precision,
  corse integer, distanza_m integer
)
language sql stable as $$
  select
    p.id, p.nome, p.categoria, p.citta,
    ST_Y(p.geo::geometry), ST_X(p.geo::geometry),
    corse_verso(p.id),
    case when p_geo is null then null else ST_Distance(p.geo, p_geo)::integer end
  from posti p
  where not p.nascosto
    and (
      select bool_and(
        (p.nome || ' ' || coalesce(p.citta, '')) ilike '%' || parola || '%'
      )
      from unnest(
             string_to_array(regexp_replace(btrim(p_testo), '\s+', ' ', 'g'), ' ')
           ) as parola
    )
  order by
    corse_verso(p.id) desc,
    case when p_geo is null then 0 else ST_Distance(p.geo, p_geo) end,
    length(p.nome)
  limit p_limite;
$$;

grant execute on function cerca_posti(text, geography, integer) to service_role, authenticated;
