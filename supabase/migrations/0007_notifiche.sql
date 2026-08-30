-- ════════════════════════════════════════════════════════════════════════
-- Notifiche e lavori schedulati.
-- ════════════════════════════════════════════════════════════════════════

create type canale_notifica as enum ('push','sms','email');
create type tipo_notifica as enum (
  'promemoria_24h','conferma_richiesta','conducente_non_conferma',
  'rimatch_proposto','in_arrivo','proposta_ricevuta','proposta_accettata',
  'proposta_rifiutata','corsa_annullata','pagamento_catturato',
  'recensione_invito','liquidazione'
);

create table push_iscrizioni (
  id        uuid primary key default uuid_generate_v4(),
  utente    uuid not null references profili on delete cascade,
  endpoint  text not null unique,
  p256dh    text not null,
  auth      text not null,
  creata_il timestamptz not null default now(),
  fallita_il timestamptz
);
create index on push_iscrizioni (utente) where fallita_il is null;
alter table push_iscrizioni enable row level security;
create policy "gestisco le mie iscrizioni" on push_iscrizioni for all to authenticated
  using (utente = auth.uid()) with check (utente = auth.uid());

-- Registro degli invii. Serve a due cose: non mandare due volte la stessa
-- cosa quando un job viene rieseguito, e sapere quanto costano gli SMS.
create table notifiche (
  id          uuid primary key default uuid_generate_v4(),
  destinatario uuid not null references profili on delete cascade,
  tipo        tipo_notifica not null,
  canale      canale_notifica not null,
  corsa       uuid references corse on delete cascade,
  prenotazione uuid references prenotazioni on delete cascade,
  costo_cent  integer not null default 0,
  inviata_il  timestamptz not null default now(),
  -- chiave di idempotenza: un job rieseguito non rimanda nulla
  chiave      text not null unique
);
create index on notifiche (destinatario, inviata_il desc);
create index on notifiche (canale, inviata_il) where costo_cent > 0;
alter table notifiche enable row level security;
create policy "vedo le mie notifiche" on notifiche for select to authenticated
  using (destinatario = auth.uid());

-- Preferenze: si può spegnere quasi tutto, tranne quello che riguarda una
-- corsa già prenotata. Chi ha pagato dev'essere raggiungibile.
alter table profili add column push_attive boolean not null default true;
alter table profili add column sms_attivi boolean not null default true;

-- ─── Registro dei lavori schedulati ─────────────────────────────────────
create table lavori (
  id        uuid primary key default uuid_generate_v4(),
  nome      text not null,
  corsa     uuid references corse on delete cascade,
  esito     text,
  errore    text,
  durata_ms integer,
  eseguito_il timestamptz not null default now(),
  chiave    text unique
);
create index on lavori (nome, eseguito_il desc);
alter table lavori enable row level security;

-- ─── Chi cerca un passaggio ─────────────────────────────────────────────
-- L'altra metà del mercato. Senza, il primo anno è un elenco vuoto: se
-- nessuno pubblica, nessuno cerca, e nessuno sa che qualcuno cercava.
create table richieste_passaggio (
  id            uuid primary key default uuid_generate_v4(),
  passeggero    uuid not null references profili on delete cascade,
  origine_label text not null,
  origine_geo   geography(point,4326) not null,
  destinazione_label text not null,
  destinazione_geo   geography(point,4326) not null,
  ora_arrivo    timestamptz not null,
  flessibilita_min smallint not null default 60,
  posti         smallint not null default 1,
  attiva        boolean not null default true,
  creata_il     timestamptz not null default now()
);
create index on richieste_passaggio (ora_arrivo) where attiva;
create index on richieste_passaggio using gist (destinazione_geo);
alter table richieste_passaggio enable row level security;
create policy "vedo le richieste attive" on richieste_passaggio for select to authenticated
  using (attiva or passeggero = auth.uid());
create policy "gestisco le mie richieste" on richieste_passaggio for all to authenticated
  using (passeggero = auth.uid()) with check (passeggero = auth.uid());

-- Richieste di passaggio compatibili con una corsa appena pubblicata.
create or replace function richieste_compatibili(
  p_corsa uuid, p_raggio_m integer default 5000, p_finestra_min integer default 90
)
returns table (id uuid, passeggero uuid)
language sql stable as $$
  select r.id, r.passeggero
    from richieste_passaggio r, corse c
   where c.id = p_corsa
     and r.attiva
     and r.passeggero <> c.conducente
     and abs(extract(epoch from (r.ora_arrivo - c.ora_arrivo))) <= p_finestra_min * 60
     and ST_DWithin(r.destinazione_geo, c.destinazione_geo, p_raggio_m)
     and (c.percorso is null or ST_DWithin(c.percorso, r.origine_geo, p_raggio_m));
$$;
