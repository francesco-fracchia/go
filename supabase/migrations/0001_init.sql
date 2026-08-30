-- ════════════════════════════════════════════════════════════════════════
-- GO · schema iniziale
--
-- Due principi che governano tutto quello che segue:
--   1. il costo chilometrico ACI non è mai scrivibile dal client
--   2. gli importi si scrivono solo lato server, mai dall'utente
-- Entrambi sono imposti dal database, non dall'applicazione: se domani
-- qualcuno scrive un client nuovo, i vincoli reggono lo stesso.
-- ════════════════════════════════════════════════════════════════════════

create extension if not exists "uuid-ossp";
create extension if not exists postgis;

-- ─── Enumerazioni ───────────────────────────────────────────────────────
create type alimentazione   as enum ('benzina','diesel','gpl','metano','ibrida','elettrica');
create type fascia_veicolo  as enum ('utilitaria','compatta','berlina','suv_compatto','suv_grande','monovolume');
create type modalita_corsa  as enum ('pubblica','link','privata');
create type stato_corsa     as enum ('bozza','pubblicata','confermata','in_corso','conclusa','annullata','scaduta');
create type stato_prenotazione as enum (
  'richiesta','rifiutata','scaduta','autorizzata','annullata',
  'catturata','completata','contestata','liquidata'
);
create type tipo_fermata    as enum ('partenza','ritiro','destinazione');
create type politica_cancellazione as enum ('flessibile','rigida');
create type stato_moderazione as enum ('in_attesa','pubblicata','rifiutata');
create type tipo_segnalazione as enum ('alcol','noshow','molestia','guida_pericolosa','altro');

-- ─── Tabella ACI ────────────────────────────────────────────────────────
-- Sorgente di verità del costo chilometrico. Si aggiorna una volta l'anno
-- dai dati ACI ufficiali. Nessun utente vi scrive: nessuna policy la apre.
create table aci_costi (
  fascia            fascia_veicolo not null,
  alimentazione     alimentazione  not null,
  centesimi_per_km  numeric(6,2)   not null check (centesimi_per_km > 0 and centesimi_per_km < 200),
  verificato        boolean        not null default false,
  fonte             text           not null,
  anno              smallint       not null,
  primary key (fascia, alimentazione, anno)
);
alter table aci_costi enable row level security;
create policy "aci in sola lettura" on aci_costi for select to authenticated using (true);

-- ─── Utenti ─────────────────────────────────────────────────────────────
create table profili (
  id                uuid primary key references auth.users on delete cascade,
  telefono          text not null unique,
  telefono_ok       boolean not null default false,
  email             text,
  email_ok          boolean not null default false,
  nome              text not null,
  cognome           text not null,
  foto_url          text,
  data_nascita      date,
  bio               text,
  -- Stripe Connect: nullo finché non incassa. L'onboarding si chiede
  -- solo quando ci sono già dei soldi da ritirare.
  stripe_account_id text unique,
  stripe_pronto     boolean not null default false,
  sospeso           boolean not null default false,
  creato_il         timestamptz not null default now(),

  -- Solo maggiorenni nella versione 1. Il vincolo è qui, non nell'interfaccia.
  constraint maggiorenne check (data_nascita is null or data_nascita <= current_date - interval '18 years')
);
alter table profili enable row level security;
create policy "vedo tutti i profili" on profili for select to authenticated using (true);
create policy "modifico solo il mio" on profili for update to authenticated using (auth.uid() = id);
create policy "creo solo il mio" on profili for insert to authenticated with check (auth.uid() = id);

-- ─── Veicoli ────────────────────────────────────────────────────────────
create table veicoli (
  id             uuid primary key default uuid_generate_v4(),
  proprietario   uuid not null references profili on delete cascade,
  marca          text not null,
  modello        text not null,
  fascia         fascia_veicolo not null,
  alimentazione  alimentazione not null,
  targa          text not null,
  colore         text,
  posti_totali   smallint not null check (posti_totali between 2 and 9),

  -- ⚠️  RISOLTO DAL TRIGGER, MAI DAL CLIENT. Vedi sotto.
  centesimi_per_km numeric(6,2) not null default 0,

  fumo           boolean not null default false,
  animali        boolean not null default false,
  bagagli_grandi boolean not null default true,
  attivo         boolean not null default true,
  creato_il      timestamptz not null default now()
);
create index on veicoli (proprietario);

-- Il trigger che rende il tetto un tetto: qualunque cosa il client mandi
-- nel campo centesimi_per_km viene sovrascritta dalla tabella ACI.
create or replace function risolvi_costo_km() returns trigger
language plpgsql security definer set search_path = public as $$
declare v numeric(6,2);
begin
  select centesimi_per_km into v
    from aci_costi
   where fascia = new.fascia
     and alimentazione = new.alimentazione
     and anno = (select max(anno) from aci_costi);
  -- Nessuna voce a tabella: si ripiega prudenzialmente al valore più basso.
  -- Sbagliare al ribasso è un problema commerciale; al rialzo è un problema legale.
  new.centesimi_per_km := coalesce(v, (select min(centesimi_per_km) from aci_costi));
  return new;
end $$;

create trigger veicoli_costo_km
  before insert or update of fascia, alimentazione, centesimi_per_km on veicoli
  for each row execute function risolvi_costo_km();

alter table veicoli enable row level security;
create policy "vedo i veicoli" on veicoli for select to authenticated using (true);
create policy "gestisco i miei veicoli" on veicoli for all to authenticated
  using (auth.uid() = proprietario) with check (auth.uid() = proprietario);

-- ─── Corse ──────────────────────────────────────────────────────────────
create table corse (
  id              uuid primary key default uuid_generate_v4(),
  conducente      uuid not null references profili on delete cascade,
  veicolo         uuid not null references veicoli on delete restrict,

  -- L'ancora è l'ORA DI ARRIVO, non quella di partenza: chi cerca un
  -- passaggio sa a che ora vuole essere lì, non a che ora deve uscire.
  ora_arrivo      timestamptz not null,
  ora_partenza    timestamptz not null,

  origine_label   text not null,
  origine_geo     geography(point,4326) not null,
  destinazione_label text not null,
  destinazione_geo   geography(point,4326) not null,

  km_base         numeric(7,2) not null check (km_base > 0),
  pedaggio_cent   integer not null default 0 check (pedaggio_cent >= 0),
  parcheggio_cent integer not null default 0 check (parcheggio_cent >= 0),

  posti_offerti   smallint not null check (posti_offerti between 1 and 8),
  modalita        modalita_corsa not null default 'pubblica',
  accetta_deviazioni boolean not null default true,
  politica        politica_cancellazione not null default 'flessibile',

  -- Sconto volontario sulla quota. Può solo abbassare: il segno e il tetto
  -- sono verificati qui e di nuovo nel motore dei prezzi.
  sconto_cent     integer not null default 0 check (sconto_cent >= 0),

  stato           stato_corsa not null default 'bozza',
  corsa_ritorno   uuid references corse on delete set null,
  token_link      text unique,
  note            text,
  creata_il       timestamptz not null default now(),

  constraint partenza_prima_di_arrivo check (ora_partenza < ora_arrivo),
  constraint posti_nel_veicolo check (posti_offerti <= 8)
);
create index on corse (stato, ora_partenza);
create index on corse (conducente);
create index using gist on corse (destinazione_geo);

alter table corse enable row level security;
create policy "vedo le corse pubbliche" on corse for select to authenticated
  using (modalita = 'pubblica' and stato in ('pubblicata','confermata') or conducente = auth.uid());
create policy "gestisco le mie corse" on corse for all to authenticated
  using (auth.uid() = conducente) with check (auth.uid() = conducente);

-- ─── Fermate ────────────────────────────────────────────────────────────
create table fermate (
  id           uuid primary key default uuid_generate_v4(),
  corsa        uuid not null references corse on delete cascade,
  ordine       smallint not null,
  tipo         tipo_fermata not null,
  etichetta    text not null,
  geo          geography(point,4326) not null,
  km_incrementali numeric(6,2) not null default 0 check (km_incrementali >= 0),
  ora_stimata  timestamptz,
  unique (corsa, ordine)
);
create index on fermate (corsa);
alter table fermate enable row level security;
create policy "vedo le fermate delle corse che vedo" on fermate for select to authenticated
  using (exists (select 1 from corse c where c.id = corsa));

-- ─── Prenotazioni ───────────────────────────────────────────────────────
create table prenotazioni (
  id            uuid primary key default uuid_generate_v4(),
  corsa         uuid not null references corse on delete cascade,
  passeggero    uuid not null references profili on delete cascade,
  fermata       uuid references fermate on delete set null,

  -- Importi congelati al momento della prenotazione, in centesimi.
  -- Li scrive SOLO il server: nessuna policy consente all'utente di
  -- inserire o modificare una prenotazione con importi propri.
  quota_cent      integer not null check (quota_cent >= 0),
  deviazione_cent integer not null default 0 check (deviazione_cent >= 0),
  fee_cent        integer not null check (fee_cent >= 0),
  totale_cent     integer not null check (totale_cent >= 0),
  autorizzato_cent integer not null check (autorizzato_cent >= 0),
  catturato_cent  integer,

  esente        boolean not null default false,
  stato         stato_prenotazione not null default 'richiesta',
  stripe_payment_intent text unique,
  autorizzata_il timestamptz,
  scade_il      timestamptz,
  messaggio     text,
  creata_il     timestamptz not null default now(),

  constraint totale_coerente check (totale_cent = quota_cent + deviazione_cent + fee_cent),
  constraint autorizzato_copre check (autorizzato_cent >= totale_cent),
  constraint cattura_non_eccede check (catturato_cent is null or catturato_cent <= autorizzato_cent),
  unique (corsa, passeggero)
);
create index on prenotazioni (corsa, stato);
create index on prenotazioni (passeggero);

alter table prenotazioni enable row level security;
-- Lettura: il passeggero la sua, il conducente quelle della sua corsa.
create policy "vedo le prenotazioni che mi riguardano" on prenotazioni for select to authenticated
  using (passeggero = auth.uid()
         or exists (select 1 from corse c where c.id = corsa and c.conducente = auth.uid()));
-- Scrittura: NESSUNA policy di insert o update per gli utenti.
-- Le prenotazioni passano tutte da funzioni server con la service key,
-- perché è lì che gira il motore dei prezzi.

-- ─── Il vincolo che vale più di tutti gli altri ─────────────────────────
-- Presidio di ultima istanza: il conducente non può incassare più del costo.
-- Se una prenotazione lo violasse, l'inserimento fallisce.
create or replace function verifica_incasso_conducente() returns trigger
language plpgsql as $$
declare
  costo_base   numeric;
  incassato    numeric;
  km_deviazioni numeric;
  c            record;
begin
  select co.*, v.centesimi_per_km into c
    from corse co join veicoli v on v.id = co.veicolo
   where co.id = new.corsa;

  costo_base := c.km_base * c.centesimi_per_km + c.pedaggio_cent + c.parcheggio_cent;

  select coalesce(sum(p.quota_cent + p.deviazione_cent), 0),
         coalesce(sum(p.deviazione_cent), 0) / nullif(c.centesimi_per_km, 0)
    into incassato, km_deviazioni
    from prenotazioni p
   where p.corsa = new.corsa
     and p.stato not in ('rifiutata','scaduta','annullata')
     and p.id <> new.id;

  incassato := incassato + new.quota_cent + new.deviazione_cent;

  if incassato >= costo_base + coalesce(km_deviazioni,0) * c.centesimi_per_km + new.deviazione_cent then
    raise exception
      'violazione di conformità: il conducente incasserebbe % su un costo di %',
      incassato, costo_base
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

create trigger prenotazioni_conformita
  before insert or update of quota_cent, deviazione_cent on prenotazioni
  for each row execute function verifica_incasso_conducente();

-- ─── Chat ───────────────────────────────────────────────────────────────
create table messaggi (
  id        uuid primary key default uuid_generate_v4(),
  corsa     uuid not null references corse on delete cascade,
  autore    uuid not null references profili on delete cascade,
  testo     text not null check (length(testo) between 1 and 2000),
  letto_il  timestamptz,
  creato_il timestamptz not null default now()
);
create index on messaggi (corsa, creato_il desc);
alter table messaggi enable row level security;
create policy "chat solo tra chi condivide la corsa" on messaggi for select to authenticated
  using (exists (select 1 from corse c where c.id = corsa and c.conducente = auth.uid())
         or exists (select 1 from prenotazioni p where p.corsa = messaggi.corsa
                    and p.passeggero = auth.uid() and p.stato not in ('rifiutata','scaduta')));
create policy "scrivo nelle chat a cui appartengo" on messaggi for insert to authenticated
  with check (autore = auth.uid()
    and (exists (select 1 from corse c where c.id = corsa and c.conducente = auth.uid())
         or exists (select 1 from prenotazioni p where p.corsa = messaggi.corsa
                    and p.passeggero = auth.uid() and p.stato not in ('rifiutata','scaduta'))));

-- ─── Recensioni, con coda di moderazione ────────────────────────────────
create table recensioni (
  id          uuid primary key default uuid_generate_v4(),
  prenotazione uuid not null references prenotazioni on delete cascade,
  autore      uuid not null references profili on delete cascade,
  destinatario uuid not null references profili on delete cascade,
  positiva    boolean not null,
  tag         text[] not null default '{}',
  testo       text check (testo is null or length(testo) <= 500),
  moderazione stato_moderazione not null default 'in_attesa',
  creata_il   timestamptz not null default now(),
  unique (prenotazione, autore)
);
create index on recensioni (destinatario, moderazione);
alter table recensioni enable row level security;
create policy "vedo le recensioni pubblicate e le mie" on recensioni for select to authenticated
  using (moderazione = 'pubblicata' or autore = auth.uid());
create policy "scrivo le mie recensioni" on recensioni for insert to authenticated
  with check (autore = auth.uid());

-- ─── Segnalazioni ───────────────────────────────────────────────────────
-- Anche l'adempimento base del DSA: il meccanismo di segnalazione.
create table segnalazioni (
  id           uuid primary key default uuid_generate_v4(),
  prenotazione uuid references prenotazioni on delete set null,
  corsa        uuid references corse on delete set null,
  autore       uuid not null references profili on delete cascade,
  tipo         tipo_segnalazione not null,
  nota         text,
  esito        text,
  chiusa_il    timestamptz,
  creata_il    timestamptz not null default now()
);
alter table segnalazioni enable row level security;
create policy "vedo le mie segnalazioni" on segnalazioni for select to authenticated
  using (autore = auth.uid());
create policy "segnalo" on segnalazioni for insert to authenticated
  with check (autore = auth.uid());

-- ─── Liquidazioni settimanali ───────────────────────────────────────────
create table liquidazioni (
  id            uuid primary key default uuid_generate_v4(),
  conducente    uuid not null references profili on delete restrict,
  settimana     date not null,
  importo_cent  integer not null check (importo_cent > 0),
  stripe_transfer_id text unique,
  eseguita_il   timestamptz,
  creata_il     timestamptz not null default now(),
  unique (conducente, settimana)
);
alter table liquidazioni enable row level security;
create policy "vedo le mie liquidazioni" on liquidazioni for select to authenticated
  using (conducente = auth.uid());
