-- ════════════════════════════════════════════════════════════════════════
-- I posti dove si va.
--
-- I candidati vengono da OpenStreetMap: gli stessi dati delle mappe e dei
-- percorsi, gratis e senza chiave. Ma OSM non sa quanto un posto sia
-- frequentato, e non fingiamo di saperlo: l'ordinamento è per quante corse
-- vanno lì SU GO, che è il dato che conta e che possediamo.
--
-- Al lancio quel numero è zero ovunque, ed è proprio il punto: un posto
-- senza passaggi è l'informazione più utile che possiamo dare a un
-- conducente. È lo stesso principio delle serate.
-- ════════════════════════════════════════════════════════════════════════

create type categoria_posto as enum (
  'discoteca', 'bar', 'ristorante', 'cinema', 'centro_commerciale',
  'piazza', 'stazione', 'aeroporto', 'stadio', 'universita', 'ospedale', 'palestra'
);

create table posti (
  id           uuid primary key default uuid_generate_v4(),
  osm_id       text unique,
  nome         text not null,
  categoria    categoria_posto not null,
  citta        text,
  indirizzo    text,
  geo          geography(point,4326) not null,
  -- Cancellabile a mano quando OSM ha un doppione o un posto ha chiuso.
  nascosto     boolean not null default false,
  aggiornato_il timestamptz not null default now()
);
create index using gist on posti (geo);
create index on posti (categoria) where not nascosto;
alter table posti enable row level security;
create policy "i posti si vedono" on posti for select to authenticated
  using (not nascosto);

comment on table posti is
  'Dati © contributori OpenStreetMap, licenza ODbL. L''attribuzione va '
  'mostrata dove i posti compaiono.';

-- Quante corse future vanno a un posto. Non «quanto è famoso»: quanto è
-- raggiungibile con noi, adesso.
create or replace function corse_verso(p_posto uuid, p_raggio_m integer default 700)
returns integer language sql stable as $$
  select count(*)::integer
    from corse c, posti p
   where p.id = p_posto
     and c.stato in ('pubblicata','confermata')
     and c.modalita = 'pubblica'
     and c.ora_partenza > now()
     and ST_DWithin(c.destinazione_geo, p.geo, p_raggio_m);
$$;

-- Quante persone stanno cercando un passaggio verso quel posto. È il numero
-- che fa pubblicare un conducente, e vale più di quanti ci vanno già.
create or replace function richieste_verso(p_posto uuid, p_raggio_m integer default 700)
returns integer language sql stable as $$
  select count(*)::integer
    from richieste_passaggio r, posti p
   where p.id = p_posto
     and r.attiva
     and r.ora_arrivo > now()
     and ST_DWithin(r.destinazione_geo, p.geo, p_raggio_m);
$$;

-- I posti attorno a un punto, con i due numeri che contano.
create or replace function posti_vicini(
  p_geo geography, p_raggio_m integer default 30000,
  p_categoria categoria_posto default null, p_limite integer default 40
)
returns table (
  id uuid, nome text, categoria categoria_posto, citta text,
  distanza_m integer, corse integer, richieste integer,
  lat double precision, lng double precision
)
language sql stable as $$
  select
    p.id, p.nome, p.categoria, p.citta,
    ST_Distance(p.geo, p_geo)::integer,
    corse_verso(p.id), richieste_verso(p.id),
    ST_Y(p.geo::geometry), ST_X(p.geo::geometry)
  from posti p
  where not p.nascosto
    and ST_DWithin(p.geo, p_geo, p_raggio_m)
    and (p_categoria is null or p.categoria = p_categoria)
  -- Prima chi ha già passaggi, poi chi ha richieste in attesa, poi il più
  -- vicino. Un posto con qualcuno che cerca vale più di uno anonimo lontano.
  order by corse_verso(p.id) desc, richieste_verso(p.id) desc, ST_Distance(p.geo, p_geo)
  limit p_limite;
$$;
