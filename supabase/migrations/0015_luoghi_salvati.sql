-- ════════════════════════════════════════════════════════════════════════
-- Casa, lavoro, e gli altri posti di ciascuno.
--
-- Chi fa la stessa tratta ogni giorno riscrive lo stesso indirizzo ogni
-- giorno. È la ripetizione che decide se un'applicazione si usa la seconda
-- volta: la prima si perdona qualunque attrito, la ventesima no.
-- ════════════════════════════════════════════════════════════════════════

create table luoghi_salvati (
  id         uuid primary key default uuid_generate_v4(),
  utente     uuid not null references profili on delete cascade,
  etichetta  text not null check (length(etichetta) between 1 and 40),
  indirizzo  text not null,
  geo        geography(point,4326) not null,
  -- 'casa' e 'lavoro' hanno un posto fisso in cima e un'icona propria;
  -- gli altri sono liberi.
  tipo       text not null default 'altro'
             check (tipo in ('casa','lavoro','altro')),
  usato_volte integer not null default 0,
  usato_il   timestamptz,
  creato_il  timestamptz not null default now()
);
create index on luoghi_salvati (utente);
-- Una casa sola e un lavoro solo: se ne servono due, sono «altro» con un nome.
create unique index luoghi_salvati_unici on luoghi_salvati (utente, tipo)
  where tipo in ('casa','lavoro');

alter table luoghi_salvati enable row level security;
create policy "gestisco i miei luoghi" on luoghi_salvati for all to authenticated
  using (utente = auth.uid()) with check (utente = auth.uid());

-- Ricerca fra i posti conosciuti: locali, stazioni, piazze.
-- Ordina per quante corse ci vanno, non per quanto somiglia il nome: chi
-- cerca «fab» a Lodi intende il Fabrique dove stasera vanno in quattro, non
-- un bar omonimo a duecento chilometri.
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
    and p.nome ilike '%' || p_testo || '%'
  order by
    corse_verso(p.id) desc,
    case when p_geo is null then 0 else ST_Distance(p.geo, p_geo) end,
    length(p.nome)
  limit p_limite;
$$;
