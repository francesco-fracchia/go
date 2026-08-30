-- ════════════════════════════════════════════════════════════════════════
-- Cache dei percorsi.
--
-- In un mercato locale le stesse tratte si ripetono all'infinito: dieci
-- conducenti fanno Lodi → Milano nella stessa serata. Ricalcolarle è
-- spreco e, con le quote gratuite dei servizi di routing, è anche il primo
-- limite che si tocca.
-- ════════════════════════════════════════════════════════════════════════
create table percorsi_cache (
  chiave      text primary key,
  km          numeric(7,2) not null check (km > 0),
  minuti      integer not null check (minuti > 0),
  percorso    geography(linestring,4326) not null,
  usato_volte integer not null default 1,
  usato_il    timestamptz not null default now(),
  creato_il   timestamptz not null default now()
);
create index on percorsi_cache (usato_il);

alter table percorsi_cache enable row level security;
-- Nessuna policy: ci accede solo il server.

comment on table percorsi_cache is
  'chiave = coordinate arrotondate a ~100 m. Arrotondare è ciò che rende la '
  'cache utile: due partenze dalla stessa piazza non sono mai identiche al '
  'centesimo di grado, ma sono lo stesso percorso.';

create or replace function tocca_percorso(p_chiave text) returns void
language sql as $$
  update percorsi_cache
     set usato_volte = usato_volte + 1, usato_il = now()
   where chiave = p_chiave;
$$;

-- ─── Cache dei luoghi ───────────────────────────────────────────────────
-- Il punto risolto per un indirizzo finisce nel prezzo: due risoluzioni a
-- distanza di mesi devono dare lo stesso risultato, o la stessa corsa
-- ripubblicata costerebbe una cifra diversa senza motivo.
create table luoghi_cache (
  chiave     text primary key,
  etichetta  text not null,
  lat        double precision not null,
  lng        double precision not null,
  comune     text,
  creato_il  timestamptz not null default now()
);
alter table luoghi_cache enable row level security;
