-- ════════════════════════════════════════════════════════════════════════
-- Metodo di pagamento, serate, chiamate mascherate.
-- ════════════════════════════════════════════════════════════════════════

-- ─── Il metodo di pagamento del passeggero ──────────────────────────────
-- Si salva una volta, alla prima prenotazione, e si riusa. Ripeterlo a ogni
-- corsa è la ragione principale per cui una seconda prenotazione non
-- avviene: la prima costa fatica una volta, la ventesima non deve costarne
-- nessuna.
alter table profili add column stripe_cliente_id text unique;
alter table profili add column metodo_pagamento text;
alter table profili add column metodo_marchio text;   -- visa, mastercard, apple_pay…
alter table profili add column metodo_ultime4 char(4);

comment on column profili.metodo_pagamento is
  'PaymentMethod di Stripe, riusabile off-session. Non contiene mai il '
  'numero della carta: quello non transita né si conserva.';

-- ─── Serate ─────────────────────────────────────────────────────────────
-- Non sono un catalogo di eventi: sono la risposta al problema del primo
-- anno. Quando la ricerca è vuota danno qualcosa da guardare, e ad agosto —
-- quando le discoteche chiudono — dicono che l'applicazione è ancora viva.
create table serate (
  id            uuid primary key default uuid_generate_v4(),
  locale        text not null,
  citta         text not null,
  indirizzo     text,
  geo           geography(point,4326) not null,
  inizio        timestamptz not null,
  fine          timestamptz,
  titolo        text,
  url           text,
  pubblicata    boolean not null default true,
  creata_il     timestamptz not null default now()
);
create index on serate (inizio) where pubblicata;
create index using gist on serate (geo);
alter table serate enable row level security;
create policy "le serate si vedono" on serate for select to authenticated
  using (pubblicata);

-- Quante corse vanno a una serata. Il numero che conta di più è lo ZERO:
-- è quello che fa pubblicare un conducente.
create or replace function corse_per_serata(p_serata uuid)
returns integer language sql stable as $$
  select count(*)::integer
    from corse c, serate s
   where s.id = p_serata
     and c.stato in ('pubblicata','confermata')
     and c.modalita = 'pubblica'
     and ST_DWithin(c.destinazione_geo, s.geo, 800)
     and c.ora_arrivo between s.inizio - interval '3 hours'
                          and coalesce(s.fine, s.inizio + interval '6 hours');
$$;

-- ─── Chiamate mascherate ────────────────────────────────────────────────
-- I numeri veri non si scambiano mai. Il collegamento si apre a mezz'ora
-- dalla partenza e si chiude a fine corsa: un numero raggiungibile per
-- sempre è un numero pubblico.
create table chiamate (
  id            uuid primary key default uuid_generate_v4(),
  corsa         uuid not null references corse on delete cascade,
  chiamante     uuid not null references profili on delete cascade,
  chiamato      uuid not null references profili on delete cascade,
  durata_s      integer,
  costo_cent    integer not null default 0,
  iniziata_il   timestamptz not null default now()
);
create index on chiamate (corsa);
alter table chiamate enable row level security;
create policy "vedo le mie chiamate" on chiamate for select to authenticated
  using (chiamante = auth.uid() or chiamato = auth.uid());

-- Chi può chiamare chi, e quando.
create or replace function puo_chiamare(p_corsa uuid, p_chiamante uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from corse c
     where c.id = p_corsa
       and c.stato in ('confermata','in_corso')
       and now() between c.ora_partenza - interval '30 minutes'
                     and coalesce(c.ora_arrivo, c.ora_partenza) + interval '1 hour'
       and (
         c.conducente = p_chiamante
         or exists (select 1 from prenotazioni p
                     where p.corsa = c.id and p.passeggero = p_chiamante
                       and p.stato in ('autorizzata','catturata'))
       )
  );
$$;
