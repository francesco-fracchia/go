-- ════════════════════════════════════════════════════════════
-- GO — struttura completa del database.
-- Da incollare per PRIMO nel SQL Editor di Supabase.
-- ════════════════════════════════════════════════════════════



-- ══════ 0001_init.sql ══════

-- ════════════════════════════════════════════════════════════════════════
-- GO · schema iniziale
--
-- Due principi che governano tutto quello che segue:
--   1. il costo chilometrico ACI non è mai scrivibile dal client
--   2. gli importi si scrivono solo lato server, mai dall'utente
-- Entrambi sono imposti dal database, non dall'applicazione: se domani
-- qualcuno scrive un client nuovo, i vincoli reggono lo stesso.
-- ════════════════════════════════════════════════════════════════════════

create extension if not exists "uuid-ossp" with schema extensions;

-- PostGIS nello schema `extensions`, non in `public`.
--
-- È la convenzione di Supabase, e non è cosmetica: PostGIS crea centinaia
-- di funzioni, e in `public` finirebbero tutte esposte dall'API generata
-- automaticamente. Il tipo `geography` resta usabile senza qualificarlo
-- perché `extensions` è già nel percorso di ricerca.
create extension if not exists postgis with schema extensions;

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



-- ══════ 0002_aci_2026.sql ══════

-- Tabella ACI 2026.
-- ⚠️  I record con verificato = false sono STIME per fascia: vanno sostituiti
--     con la voce ACI del modello prima della produzione.
insert into aci_costi (fascia, alimentazione, centesimi_per_km, verificato, fonte, anno) values
 ('utilitaria','benzina',37.12,true,'ACI — Fiat Panda 1.2, tabelle costi chilometrici',2026),
 ('utilitaria','diesel',35.00,false,'stima per fascia',2026),
 ('utilitaria','gpl',33.00,false,'stima per fascia',2026),
 ('utilitaria','metano',32.00,false,'stima per fascia',2026),
 ('utilitaria','ibrida',36.00,false,'stima per fascia',2026),
 ('utilitaria','elettrica',31.00,false,'stima per fascia',2026),
 ('compatta','benzina',43.00,false,'stima per fascia',2026),
 ('compatta','diesel',41.00,false,'stima per fascia',2026),
 ('compatta','gpl',39.00,false,'stima per fascia',2026),
 ('compatta','metano',38.00,false,'stima per fascia',2026),
 ('compatta','ibrida',42.00,false,'stima per fascia',2026),
 ('compatta','elettrica',36.00,false,'stima per fascia',2026),
 ('berlina','benzina',52.00,false,'stima per fascia',2026),
 ('berlina','diesel',49.00,false,'stima per fascia',2026),
 ('berlina','ibrida',50.00,false,'stima per fascia',2026),
 ('berlina','elettrica',43.00,false,'stima per fascia',2026),
 ('suv_compatto','benzina',48.00,false,'stima per fascia',2026),
 ('suv_compatto','diesel',46.00,false,'stima per fascia',2026),
 ('suv_compatto','gpl',44.00,false,'stima per fascia',2026),
 ('suv_compatto','ibrida',47.00,false,'stima per fascia',2026),
 ('suv_compatto','elettrica',40.00,false,'stima per fascia',2026),
 ('suv_grande','benzina',58.00,false,'stima per fascia',2026),
 ('suv_grande','diesel',55.00,false,'stima per fascia',2026),
 ('suv_grande','ibrida',56.00,false,'stima per fascia',2026),
 ('suv_grande','elettrica',47.00,false,'stima per fascia',2026),
 ('monovolume','benzina',50.00,false,'stima per fascia',2026),
 ('monovolume','diesel',47.00,false,'stima per fascia',2026),
 ('monovolume','gpl',45.00,false,'stima per fascia',2026),
 ('monovolume','ibrida',48.00,false,'stima per fascia',2026),
 ('monovolume','elettrica',41.00,false,'stima per fascia',2026);



-- ══════ 0003_fiducia_e_sistematicita.sql ══════

-- ════════════════════════════════════════════════════════════════════════
-- Fiducia, comfort e monitoraggio della sistematicità.
--
-- Tre gruppi di modifiche, tutti nati dall'osservazione di come BlaBlaCar
-- risolve problemi che avevamo lasciato scoperti.
-- ════════════════════════════════════════════════════════════════════════

-- ─── 1. Approvazione o prenotazione immediata ───────────────────────────
-- Il conducente decide per ogni corsa se accettare chiunque all'istante o
-- approvare a mano. Ci mancava del tutto: avevamo l'approvazione solo per
-- le proposte di deviazione. Di notte, con sconosciuti, la scelta di
-- filtrare chi sale è esattamente quella che convince un conducente a
-- pubblicare la prima volta.
alter table corse add column prenota_immediata boolean not null default false;

-- Comfort: si offrono 3 posti ma se ne vendono 2 dietro, il centrale resta
-- vuoto. Costa una colonna e cambia la disponibilità a viaggiare.
alter table corse add column max_posti_dietro smallint
  check (max_posti_dietro is null or max_posti_dietro between 1 and 4);

-- ─── 2. Dichiarazione di non professionalità ────────────────────────────
-- Non è un dettaglio cosmetico: è l'artefatto con cui si documenta, utente
-- per utente, la natura tra privati del rapporto. Va raccolta all'atto della
-- prima pubblicazione e ripresentata a ogni rinnovo annuale.
alter table profili add column dichiarazione_privato boolean not null default false;
alter table profili add column dichiarazione_il timestamptz;
alter table profili add column limitato boolean not null default false;
comment on column profili.limitato is
  'sospeso dalla pubblicazione per superamento delle soglie di sistematicità';

-- ─── 3. Monitoraggio della sistematicità ────────────────────────────────
-- Il test giurisprudenziale è lucro + sistematicità + organizzazione. Sul
-- lucro siamo coperti dal motore dei prezzi. Sulla sistematicità no: finora
-- nulla impediva a un conducente di fare cinque corse a notte tutte le
-- notti, cioè di esercitare di fatto un'attività di trasporto — con noi
-- come organizzatore.
--
-- ⚠️  LE SOGLIE QUI SOTTO SONO PRUDENZIALI E ARBITRARIE. Non esiste un
--     numero di legge. Vanno confermate dall'avvocato insieme al parere
--     sulla qualificazione dell'attività.
create table soglie_sistematicita (
  id                smallint primary key default 1 check (id = 1),
  corse_settimana_avviso  smallint not null default 4,
  corse_settimana_blocco  smallint not null default 8,
  corse_anno_avviso       smallint not null default 100,
  corse_anno_blocco       smallint not null default 200,
  confermate_da_legale    boolean  not null default false,
  aggiornate_il           timestamptz not null default now()
);
insert into soglie_sistematicita (id) values (1);

create or replace view sistematicita_conducenti as
select
  c.conducente,
  count(*) filter (where c.ora_partenza > now() - interval '7 days')   as corse_7g,
  count(*) filter (where c.ora_partenza > now() - interval '30 days')  as corse_30g,
  count(*) filter (where c.ora_partenza > now() - interval '365 days') as corse_365g,
  coalesce(sum(p.catturato_cent) filter (
    where c.ora_partenza > now() - interval '365 days'), 0)            as incassato_365g_cent,
  max(c.ora_partenza)                                                  as ultima_corsa
from corse c
left join prenotazioni p on p.corsa = c.id and p.stato in ('catturata','completata','liquidata')
where c.stato = 'conclusa'
group by c.conducente;

-- Si valuta alla pubblicazione, non a posteriori: la corsa che supererebbe
-- la soglia non nasce proprio.
create or replace function verifica_sistematicita() returns trigger
language plpgsql as $$
declare s record; a record;
begin
  if new.stato <> 'pubblicata' or (tg_op = 'UPDATE' and old.stato = 'pubblicata') then
    return new;
  end if;

  select * into s from soglie_sistematicita where id = 1;
  select * into a from sistematicita_conducenti where conducente = new.conducente;

  if a is null then return new; end if;

  if a.corse_7g >= s.corse_settimana_blocco or a.corse_365g >= s.corse_anno_blocco then
    raise exception
      'soglia di sistematicità superata: % corse in 7 giorni, % in un anno',
      a.corse_7g, a.corse_365g
      using errcode = 'check_violation',
            hint = 'la frequenza rende l''attività assimilabile a un servizio di trasporto';
  end if;
  return new;
end $$;

create trigger corse_sistematicita
  before insert or update of stato on corse
  for each row execute function verifica_sistematicita();

-- ─── 4. Distintivi ricavati dal comportamento, non dalle opinioni ───────
-- Una stella media dice poco. "Non annulla mai i viaggi" dice tutto, ed è
-- calcolata dai fatti. Sul nostro prodotto il rischio numero uno è il
-- mancato passaggio: il distintivo che conta è quello.
create or replace view distintivi_conducenti as
with base as (
  select c.conducente,
         count(*)                                                as corse_totali,
         count(*) filter (where c.stato = 'conclusa')             as concluse,
         count(*) filter (where c.stato = 'annullata')            as annullate
    from corse c
   where c.stato in ('conclusa','annullata')
   group by c.conducente
), giudizi as (
  select r.destinatario,
         count(*)                                     as recensioni,
         count(*) filter (where r.positiva)           as positive
    from recensioni r
   where r.moderazione = 'pubblicata'
   group by r.destinatario
)
select
  b.conducente,
  b.corse_totali,
  b.concluse,
  b.annullate,
  coalesce(g.recensioni, 0)                                       as recensioni,
  coalesce(g.positive, 0)                                         as positive,
  -- I distintivi. Nessuno di questi è una media di stelle.
  (b.concluse >= 5  and b.annullate = 0)                          as mai_annullato,
  (b.concluse >= 20 and b.annullate::numeric / nullif(b.corse_totali,0) < 0.05)
                                                                  as affidabile,
  (b.concluse >= 3)                                               as conducente_avviato,
  (b.concluse >= 25 and coalesce(g.positive,0) >= 15)             as veterano
from base b
left join giudizi g on g.destinatario = b.conducente;

-- ─── 5. CO₂ evitata ─────────────────────────────────────────────────────
-- Non è marketing gratuito: è la metrica che apre le porte dei comuni e
-- delle convenzioni. Fattore medio per auto in Italia, in grammi per km.
-- FONTE: da sostituire con il dato ISPRA/EEA dell'anno in corso.
create or replace function co2_evitata_g(km numeric, passeggeri int)
returns numeric language sql immutable as $$
  select km * 120 * greatest(passeggeri, 0)
$$;
comment on function co2_evitata_g is
  'stima: 120 g/km per auto media. Sostituire con il fattore ISPRA aggiornato.';



-- ══════ 0004_gruppi_e_deviazioni.sql ══════

-- ════════════════════════════════════════════════════════════════════════
-- Incassi di gruppo e deviazioni condivise.
-- ════════════════════════════════════════════════════════════════════════

-- ─── 1. Prenotare insieme, pagare ciascuno per sé ───────────────────────
-- Il gruppo riserva i posti insieme — così nessuno resta a terra da solo e
-- si sale alla stessa fermata — ma OGNUNO PAGA CON LA PROPRIA CARTA.
--
-- Far anticipare i soldi a uno solo, che poi li rincorre, è esattamente il
-- problema che l'applicazione esiste per togliere di mezzo: vale tra
-- sconosciuti e vale anche tra amici. Costa 25 centesimi di Stripe a testa
-- invece che una volta sola, ed è il prezzo della comodità che vendiamo.
alter table prenotazioni add column gruppo uuid;
comment on column prenotazioni.gruppo is
  'prenotazioni riservate insieme sulla stessa corsa. NON un incasso unico: '
  'ogni prenotazione mantiene il proprio PaymentIntent e la propria carta.';
create index prenotazioni_gruppo on prenotazioni (gruppo) where gruppo is not null;

-- Il PaymentIntent resta unico per prenotazione: nessuno paga per altri.
-- (il vincolo di unicità di 0001 non si tocca)

-- Un gruppo non lega mai corse diverse.
create or replace function verifica_gruppo() returns trigger
language plpgsql as $$
begin
  if new.gruppo is null then return new; end if;
  if exists (
    select 1 from prenotazioni
     where gruppo = new.gruppo and id <> new.id and corsa <> new.corsa
  ) then
    raise exception 'un gruppo non può coprire corse diverse'
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

create trigger prenotazioni_gruppo before insert or update of gruppo, corsa
  on prenotazioni for each row execute function verifica_gruppo();

-- ─── 2. Andata e ritorno della STESSA persona, solo tra corse private ───
-- Qui nessuno anticipa per nessun altro: è la stessa persona che paga le
-- proprie due tratte. Ma su una corsa pubblica il pagamento unico fa credere
-- al passeggero di avere il rientro assicurato, mentre il conducente
-- dell'andata può volersene andare prima o il ritorno può essere di un
-- altro: sarebbe la garanzia di rientro che abbiamo deciso di non dare,
-- reintrodotta di nascosto dal modo di pagare.
create or replace function verifica_ritorno_collegato() returns trigger
language plpgsql as $$
declare m_and modalita_corsa; m_rit modalita_corsa;
begin
  if new.corsa_ritorno is null then return new; end if;
  select modalita into m_rit from corse where id = new.corsa_ritorno;
  m_and := new.modalita;
  if (m_and <> 'privata' or m_rit <> 'privata') then
    -- il collegamento resta, ma come suggerimento: non come incasso unico
    new.ritorno_incasso_unico := false;
  end if;
  return new;
end $$;

alter table corse add column ritorno_incasso_unico boolean not null default false;
create trigger corse_ritorno before insert or update of corsa_ritorno, modalita
  on corse for each row execute function verifica_ritorno_collegato();

-- ─── 3. Il trigger di conformità, riscritto ─────────────────────────────
-- Quello originale ricavava i km di deviazione dividendo gli importi per il
-- costo chilometrico: fragile, e soprattutto contava una deviazione per ogni
-- passeggero anziché per ogni fermata. Due persone alla stessa fermata
-- pagavano due volte gli stessi chilometri, e il conducente ne incassava il
-- doppio di quanto gli costavano. Ora si legge dalle fermate, che sono la
-- sorgente di verità dei chilometri.
create or replace function verifica_incasso_conducente() returns trigger
language plpgsql as $$
declare
  costo_base   numeric;
  costo_dev    numeric;
  incassato    numeric;
  c            record;
begin
  select co.km_base, co.pedaggio_cent, co.parcheggio_cent, v.centesimi_per_km
    into c
    from corse co join veicoli v on v.id = co.veicolo
   where co.id = new.corsa;

  costo_base := c.km_base * c.centesimi_per_km + c.pedaggio_cent + c.parcheggio_cent;

  -- I chilometri di deviazione si contano UNA VOLTA PER FERMATA usata,
  -- non una volta per passeggero.
  select coalesce(sum(f.km_incrementali), 0) * c.centesimi_per_km
    into costo_dev
    from fermate f
   where f.corsa = new.corsa
     and f.tipo = 'ritiro'
     and exists (
       select 1 from prenotazioni p
        where p.fermata = f.id
          and p.stato not in ('rifiutata','scaduta','annullata')
          and (p.id <> new.id or new.fermata = f.id)
     );

  select coalesce(sum(p.quota_cent + p.deviazione_cent), 0)
    into incassato
    from prenotazioni p
   where p.corsa = new.corsa
     and p.stato not in ('rifiutata','scaduta','annullata')
     and p.id <> new.id;

  incassato := incassato + new.quota_cent + new.deviazione_cent;

  if incassato >= costo_base + costo_dev then
    raise exception
      'violazione di conformità: il conducente incasserebbe % su un costo di %',
      incassato, costo_base + costo_dev
      using errcode = 'check_violation',
            hint = 'il conducente non può mai rientrare per intero del costo della corsa';
  end if;
  return new;
end $$;



-- ══════ 0005_ricerca.sql ══════

-- ════════════════════════════════════════════════════════════════════════
-- Ricerca per sotto-tratte.
--
-- Chi cerca Milano → Melegnano deve vedere anche la corsa Treviso → Melegnano
-- che passa da Milano. Cercando solo per capolinea si perde la maggior parte
-- dell'offerta che si ha già: è il primo modo in cui un mercato giovane
-- sembra vuoto pur non essendolo.
-- ════════════════════════════════════════════════════════════════════════

-- ─── Il percorso, non solo i due capolinea ──────────────────────────────
-- Serve per tre cose insieme: sapere se un punto sta lungo la strada, sapere
-- in che ORDINE due punti si incontrano, e stimare la deviazione. Si calcola
-- una volta alla pubblicazione e si conserva.
alter table corse add column percorso geography(linestring,4326);
create index corse_percorso on corse using gist (percorso);
comment on column corse.percorso is
  'polilinea del percorso, dal servizio di routing. Senza, la corsa è '
  'trovabile solo per capolinea.';

-- ─── Ricerca ────────────────────────────────────────────────────────────
create or replace function cerca_corse(
  p_origine       geography,
  p_destinazione  geography,
  p_da            timestamptz,
  p_a             timestamptz,
  p_raggio_m      integer default 3000,
  p_posti         integer default 1
)
returns table (
  corsa_id          uuid,
  conducente        uuid,
  ora_partenza      timestamptz,
  ora_arrivo        timestamptz,
  posti_liberi      integer,
  quota_cent        integer,
  -- quanto il passeggero è lontano dal percorso, in metri
  scarto_origine_m      integer,
  scarto_destinazione_m integer,
  -- fermata già esistente abbastanza vicina: se c'è, niente deviazione
  fermata_ritiro    uuid,
  -- stima dei km in più per venirlo a prendere: andata e ritorno dal percorso
  km_deviazione_stimati numeric,
  deviazione_ammessa    boolean
)
language sql stable as $$
with candidate as (
  select
    c.id, c.conducente, c.ora_partenza, c.ora_arrivo, c.km_base,
    c.pedaggio_cent, c.parcheggio_cent, c.posti_offerti, c.sconto_cent,
    c.accetta_deviazioni, c.percorso, v.centesimi_per_km,
    c.posti_offerti - coalesce((
      select count(*) from prenotazioni p
       where p.corsa = c.id
         and p.stato not in ('rifiutata','scaduta','annullata')
    ), 0) as liberi
  from corse c
  join veicoli v on v.id = c.veicolo
  where c.stato in ('pubblicata','confermata')
    and c.modalita = 'pubblica'
    and c.ora_partenza between p_da and p_a
    and c.percorso is not null
    -- entrambi i punti devono stare lungo la strada
    and ST_DWithin(c.percorso, p_origine, p_raggio_m)
    and ST_DWithin(c.percorso, p_destinazione, p_raggio_m)
    -- e nell'ordine giusto: si sale prima di scendere
    and ST_LineLocatePoint(c.percorso::geometry, p_origine::geometry)
      < ST_LineLocatePoint(c.percorso::geometry, p_destinazione::geometry)
)
select
  k.id,
  k.conducente,
  k.ora_partenza,
  k.ora_arrivo,
  k.liberi::integer,
  floor((k.km_base * k.centesimi_per_km + k.pedaggio_cent + k.parcheggio_cent)
        / (k.posti_offerti + 1))::integer - k.sconto_cent as quota_cent,
  ST_Distance(k.percorso, p_origine)::integer,
  ST_Distance(k.percorso, p_destinazione)::integer,
  (select f.id from fermate f
    where f.corsa = k.id and f.tipo in ('partenza','ritiro')
      and ST_DWithin(f.geo, p_origine, 400)
    order by ST_Distance(f.geo, p_origine) limit 1),
  -- uscire dal percorso e rientrarci: due volte la distanza, arrotondata
  round((ST_Distance(k.percorso, p_origine) * 2 / 1000.0)::numeric, 1),
  k.accetta_deviazioni
    and (ST_Distance(k.percorso, p_origine) * 2 / 1000.0) <= k.km_base * 0.20
from candidate k
where k.liberi >= p_posti
order by k.ora_arrivo;
$$;

comment on function cerca_corse is
  'Ricerca per sotto-tratte. ST_LineLocatePoint impone il verso di marcia: '
  'senza, una corsa Melegnano→Milano risponderebbe a chi cerca Milano→Melegnano.';

-- Le corse senza percorso restano trovabili almeno per capolinea, così una
-- pubblicazione non si perde se il servizio di routing è momentaneamente giù.
create or replace function cerca_corse_capolinea(
  p_origine geography, p_destinazione geography,
  p_da timestamptz, p_a timestamptz, p_raggio_m integer default 5000
)
returns setof corse language sql stable as $$
  select c.* from corse c
   where c.stato in ('pubblicata','confermata')
     and c.modalita = 'pubblica'
     and c.percorso is null
     and c.ora_partenza between p_da and p_a
     and ST_DWithin(c.origine_geo, p_origine, p_raggio_m)
     and ST_DWithin(c.destinazione_geo, p_destinazione, p_raggio_m)
   order by c.ora_arrivo;
$$;



-- ══════ 0006_percorsi.sql ══════

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



-- ══════ 0007_notifiche.sql ══════

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
create index using gist on richieste_passaggio (destinazione_geo);
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



-- ══════ 0008_esito_viaggio.sql ══════

-- ════════════════════════════════════════════════════════════════════════
-- Chiusura del viaggio e sblocco del pagamento.
--
-- NESSUN GESTO NEL CASO NORMALE. Il pagamento si sblocca da solo 24 ore
-- dopo l'arrivo.
--
-- Ci eravamo arrivati per la strada opposta — un codice che il conducente
-- doveva farsi mostrare da ciascun passeggero — e la strada era sbagliata:
-- con tre persone a bordo sono tre gesti, di notte, mentre si parte. La
-- frizione cadeva su ogni corsa riuscita per proteggere dal caso raro.
--
-- Il caso raro lo copriamo altrove, e meglio:
--   · il conducente che non conferma a T−60min fa scattare il rimatch e il
--     rimborso PRIMA della corsa — quindi non arriva neanche qui;
--   · dopo l'arrivo il passeggero riceve una domanda sola, e deve
--     rispondere SOLO se è andata male. Il silenzio vale conferma;
--   · una segnalazione blocca lo sblocco e apre una contestazione.
--
-- Il risultato è che la fatica sta sul caso sbagliato, che è raro, invece
-- che su ogni caso giusto.
-- ════════════════════════════════════════════════════════════════════════

create type esito_viaggio as enum (
  'atteso',      -- il viaggio non è ancora finito
  'ok',          -- confermato, o passato in silenzio
  'problema',    -- il passeggero ha segnalato: lo sblocco si ferma
  'non_salito'   -- il conducente dichiara che non si è presentato
);

alter table prenotazioni add column esito esito_viaggio not null default 'atteso';
alter table prenotazioni add column esito_il timestamptz;
alter table prenotazioni add column sbloccabile_dal timestamptz;

comment on column prenotazioni.sbloccabile_dal is
  '24 ore dopo l''arrivo. Passata questa data senza segnalazioni il '
  'pagamento matura da solo: il silenzio vale conferma.';

/** Ore fra l'arrivo e lo sblocco automatico. */
create or replace function ore_di_ripensamento() returns integer
language sql immutable as $$ select 24 $$;

-- Alla partenza si fissa la data di sblocco. Da lì in poi non serve che
-- nessuno faccia niente perché il conducente venga pagato.
create or replace function apri_finestra_esito(p_corsa uuid) returns integer
language plpgsql as $$
declare n integer;
begin
  update prenotazioni p
     set sbloccabile_dal = c.ora_arrivo + (ore_di_ripensamento() || ' hours')::interval
    from corse c
   where c.id = p.corsa and p.corsa = p_corsa and p.stato = 'catturata';
  get diagnostics n = row_count;
  return n;
end $$;

-- Lo sblocco automatico. Tutto quello su cui nessuno ha detto niente.
create or replace function sblocca_maturate() returns integer
language sql volatile as $$
  with sbloccate as (
    update prenotazioni
       set stato = 'completata',
           esito = case when esito = 'atteso' then 'ok' else esito end,
           esito_il = coalesce(esito_il, now())
     where stato = 'catturata'
       and sbloccabile_dal < now()
       and esito <> 'problema'
     returning 1
  ) select count(*)::integer from sbloccate;
$$;

-- Il passeggero segnala. È l'unica azione richiesta a qualcuno, ed è
-- richiesta solo quando qualcosa è andato storto.
create or replace function segnala_problema(
  p_prenotazione uuid, p_passeggero uuid, p_nota text
) returns boolean
language plpgsql security definer set search_path = public as $$
declare ok boolean;
begin
  update prenotazioni
     set esito = 'problema', esito_il = now()
   where id = p_prenotazione
     and passeggero = p_passeggero
     and stato in ('catturata','completata')
     and (sbloccabile_dal is null or sbloccabile_dal > now())
   returning true into ok;

  if coalesce(ok, false) then
    insert into segnalazioni (prenotazione, autore, tipo, nota)
    values (p_prenotazione, p_passeggero, 'altro', p_nota);
  end if;
  return coalesce(ok, false);
end $$;

-- Quello che il conducente ha maturato: tutto tranne le contestazioni aperte.
create or replace view maturato_conducente as
select
  c.conducente,
  c.id as corsa,
  date_trunc('week', c.ora_partenza)::date as settimana,
  sum(p.quota_cent + p.deviazione_cent) as lordo_cent,
  sum(p.totale_cent) as incassato_cent,
  count(*) as passeggeri
from corse c
join prenotazioni p on p.corsa = c.id
where p.stato in ('completata','liquidata')
  and p.esito <> 'problema'
group by c.conducente, c.id;



-- ══════ 0009_pagamenti_e_serate.sql ══════

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



-- ══════ 0010_sistematicita_osservata.sql ══════

-- ════════════════════════════════════════════════════════════════════════
-- Sistematicità: si osserva, non si blocca.
--
-- Le soglie precedenti (4 corse a settimana come avviso, 8 come blocco)
-- erano calibrate male, e in modo dannoso: avrebbero fermato per primo
-- l'utente migliore. Chi fa Lodi–Milano ogni giorno per lavoro è il caso
-- puro del «ci vado comunque», non un trasportatore abusivo.
--
-- Il ragionamento corretto è questo. Il test giurisprudenziale è lucro +
-- sistematicità + organizzazione, e il lucro qui è escluso per costruzione:
-- il motore dei prezzi garantisce che il conducente non rientri mai del
-- costo, ed è dimostrabile su ogni singola corsa. Senza lucro, la sola
-- frequenza non configura un'attività di trasporto.
--
-- Resta un segnale diverso e più specifico, che conserviamo: la stessa
-- tratta, agli stessi orari, con gli stessi passeggeri, ripetuta. Non è
-- «viaggiare molto»: è somigliare a un servizio di linea, che ha regole
-- proprie. Lo misuriamo e non lo impediamo.
-- ════════════════════════════════════════════════════════════════════════

drop trigger if exists corse_sistematicita on corse;

update soglie_sistematicita set
  corse_settimana_avviso = 20,
  corse_settimana_blocco = 40,
  corse_anno_avviso      = 400,
  corse_anno_blocco      = 900
where id = 1;

comment on table soglie_sistematicita is
  'Soglie di OSSERVAZIONE, non di blocco. Nessun trigger le impone: '
  'servono a far comparire un conducente in una vista da guardare, non a '
  'impedirgli di pubblicare. Il blocco resta possibile caso per caso con '
  'profili.limitato, e va usato su un giudizio, mai su un contatore.';

-- ─── Il segnale che conta davvero ───────────────────────────────────────
-- Non «quante corse», ma «quanto si ripete uguale». Una tratta identica,
-- alla stessa ora, con gli stessi passeggeri, molte volte: è questo che
-- somiglia a un servizio di linea. Viaggiare tanto su tragitti diversi no.
create or replace view ripetitivita_conducenti as
with corse_recenti as (
  select c.conducente, c.id,
         c.origine_label, c.destinazione_label,
         extract(hour from c.ora_partenza)::int as ora,
         extract(dow  from c.ora_partenza)::int as giorno
    from corse c
   where c.stato = 'conclusa'
     and c.ora_partenza > now() - interval '90 days'
), tratte as (
  select conducente, origine_label, destinazione_label, ora, giorno,
         count(*) as volte
    from corse_recenti
   group by conducente, origine_label, destinazione_label, ora, giorno
), passeggeri_ricorrenti as (
  select c.conducente, p.passeggero, count(*) as volte
    from corse c join prenotazioni p on p.corsa = c.id
   where c.stato = 'conclusa'
     and c.ora_partenza > now() - interval '90 days'
     and p.stato in ('completata','liquidata')
   group by c.conducente, p.passeggero
)
select
  t.conducente,
  max(t.volte)                                     as tratta_piu_ripetuta,
  count(*)                                         as tratte_distinte,
  coalesce(max(pr.volte), 0)                       as passeggero_piu_ricorrente,
  -- Somiglia a un servizio di linea quando poche tratte si ripetono molto
  -- CON le stesse persone. Una sola delle due condizioni non basta.
  (max(t.volte) >= 20 and coalesce(max(pr.volte), 0) >= 15) as da_guardare
from tratte t
left join passeggeri_ricorrenti pr on pr.conducente = t.conducente
group by t.conducente;

comment on view ripetitivita_conducenti is
  'Segnale specifico, non un contatore di volume. `da_guardare` non blocca '
  'niente: fa comparire un nome in una lista che una persona guarda.';



-- ══════ 0011_preferenze_e_deviazioni.sql ══════

-- ════════════════════════════════════════════════════════════════════════
-- Preferenze e deviazioni separate.
-- ════════════════════════════════════════════════════════════════════════

-- ─── 1. Le deviazioni non sono una cosa sola ────────────────────────────
-- Avevamo un interruttore unico, e non bastava. Chi ha tempo prima di
-- partire ma è di fretta all'arrivo — deve timbrare, ha un tavolo
-- prenotato, non conosce la zona — accetta volentieri di passare a prendere
-- qualcuno e non può fermarsi da nessun'altra parte all'arrivo. Con un solo
-- interruttore quella persona spegne tutto, e perde i passeggeri che
-- avrebbe potuto caricare.
alter table corse add column deviazioni_ritiro boolean not null default true;
alter table corse add column deviazioni_deposito boolean not null default true;

update corse set
  deviazioni_ritiro   = accetta_deviazioni,
  deviazioni_deposito = accetta_deviazioni;

comment on column corse.deviazioni_ritiro is
  'se il conducente può passare a prendere qualcuno fuori dal suo percorso';
comment on column corse.deviazioni_deposito is
  'se può lasciare qualcuno in un punto diverso dalla destinazione';

-- `accetta_deviazioni` resta come somma delle due: la ricerca e i vecchi
-- controlli continuano a funzionare senza sapere della distinzione.
create or replace function allinea_deviazioni() returns trigger
language plpgsql as $$
begin
  new.accetta_deviazioni := new.deviazioni_ritiro or new.deviazioni_deposito;
  return new;
end $$;

create trigger corse_deviazioni
  before insert or update of deviazioni_ritiro, deviazioni_deposito on corse
  for each row execute function allinea_deviazioni();

-- ─── 2. Preferenze della persona, non della macchina ────────────────────
-- Fumo, animali e bagagli dipendono dall'auto e restano lì. Chiacchiere,
-- musica e soste dipendono da chi guida, e cambiare macchina non le cambia.
-- Tenerle sul veicolo significava chiedere di ridichiararle a ogni auto
-- aggiunta, e ritrovarsi due risposte diverse alla stessa domanda.
create type quanto as enum ('volentieri', 'dipende', 'poco');

alter table profili add column chiacchiere quanto not null default 'dipende';
alter table profili add column musica      quanto not null default 'volentieri';
alter table profili add column soste       boolean not null default true;

comment on column profili.soste is
  'disponibile a fermarsi lungo il tragitto: conta solo sulle tratte lunghe';

-- ─── 3. Bagagli: una scala, non un sì o no ──────────────────────────────
-- «C'è posto per i bagagli» non dice niente a chi ha un trolley da stiva.
-- Tre gradini rispondono alla domanda vera, che è «ci sta la mia roba?».
create type capienza_bagagli as enum ('nessuno', 'piccoli', 'medi', 'grandi');

alter table veicoli add column bagagli capienza_bagagli not null default 'medi';
update veicoli set bagagli = case when bagagli_grandi then 'grandi' else 'piccoli' end;
alter table veicoli drop column bagagli_grandi;



-- ══════ 0012_posti.sql ══════

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



-- ══════ 0013_flessibilita.sql ══════

-- ════════════════════════════════════════════════════════════════════════
-- Flessibilità dell'orario.
--
-- Non è una preferenza della persona: è una proprietà del viaggio. Se vado
-- a lavorare parto alle 8 e basta; se vado a ballare, partire alle 22:30 o
-- alle 23 non cambia niente. La stessa persona è rigida il martedì mattina
-- ed elastica il sabato sera.
--
-- Due cose che questa colonna NON fa, e che è importante non facesse:
--
--   · non rende vaga la partenza. La finestra serve a farsi TROVARE. Se
--     l'orario restasse elastico fino all'ultimo, l'incertezza la pagherebbe
--     il passeggero, in piedi a un angolo di notte. Alla prima prenotazione
--     l'orario si fissa.
--   · non si chiede a freddo. Si propone il valore giusto guardando dove si
--     va e a che ora, e chi vuole lo cambia.
-- ════════════════════════════════════════════════════════════════════════

alter table corse add column flessibilita_min smallint not null default 0
  check (flessibilita_min between 0 and 60);
alter table corse add column orario_fissato boolean not null default false;

comment on column corse.flessibilita_min is
  'tolleranza in minuti sull''ora di arrivo, usata SOLO dalla ricerca. '
  'Si azzera alla prima prenotazione: da lì l''orario è quello e basta.';

-- Alla prima prenotazione l'orario si fissa. Non è una scelta di prodotto
-- da ricordarsi di applicare: lo fa il database, sempre.
create or replace function fissa_orario() returns trigger
language plpgsql as $$
begin
  update corse
     set orario_fissato = true, flessibilita_min = 0
   where id = new.corsa
     and not orario_fissato;
  return new;
end $$;

create trigger prenotazioni_fissano_orario
  after insert on prenotazioni
  for each row execute function fissa_orario();

-- La ricerca allarga la finestra di ciascuna corsa della sua flessibilità.
create or replace function cerca_corse(
  p_origine       geography,
  p_destinazione  geography,
  p_da            timestamptz,
  p_a             timestamptz,
  p_raggio_m      integer default 3000,
  p_posti         integer default 1
)
returns table (
  corsa_id uuid, conducente uuid,
  ora_partenza timestamptz, ora_arrivo timestamptz,
  posti_liberi integer, quota_cent integer,
  scarto_origine_m integer, scarto_destinazione_m integer,
  fermata_ritiro uuid, km_deviazione_stimati numeric,
  deviazione_ammessa boolean, flessibilita_min smallint
)
language sql stable as $$
with candidate as (
  select
    c.id, c.conducente, c.ora_partenza, c.ora_arrivo, c.km_base,
    c.pedaggio_cent, c.parcheggio_cent, c.posti_offerti, c.sconto_cent,
    c.accetta_deviazioni, c.percorso, c.flessibilita_min, v.centesimi_per_km,
    c.posti_offerti - coalesce((
      select count(*) from prenotazioni p
       where p.corsa = c.id
         and p.stato not in ('rifiutata','scaduta','annullata')
    ), 0) as liberi
  from corse c
  join veicoli v on v.id = c.veicolo
  where c.stato in ('pubblicata','confermata')
    and c.modalita = 'pubblica'
    -- La finestra della corsa si allarga della sua flessibilità: chi parte
    -- «verso le undici» va trovato anche da chi cerca le 22:45.
    and c.ora_partenza between p_da - (c.flessibilita_min || ' minutes')::interval
                           and p_a  + (c.flessibilita_min || ' minutes')::interval
    and c.percorso is not null
    and ST_DWithin(c.percorso, p_origine, p_raggio_m)
    and ST_DWithin(c.percorso, p_destinazione, p_raggio_m)
    and ST_LineLocatePoint(c.percorso::geometry, p_origine::geometry)
      < ST_LineLocatePoint(c.percorso::geometry, p_destinazione::geometry)
)
select
  k.id, k.conducente, k.ora_partenza, k.ora_arrivo, k.liberi::integer,
  floor((k.km_base * k.centesimi_per_km + k.pedaggio_cent + k.parcheggio_cent)
        / (k.posti_offerti + 1))::integer - k.sconto_cent,
  ST_Distance(k.percorso, p_origine)::integer,
  ST_Distance(k.percorso, p_destinazione)::integer,
  (select f.id from fermate f
    where f.corsa = k.id and f.tipo in ('partenza','ritiro')
      and ST_DWithin(f.geo, p_origine, 400)
    order by ST_Distance(f.geo, p_origine) limit 1),
  round((ST_Distance(k.percorso, p_origine) * 2 / 1000.0)::numeric, 1),
  k.accetta_deviazioni
    and (ST_Distance(k.percorso, p_origine) * 2 / 1000.0) <= k.km_base * 0.20,
  k.flessibilita_min
from candidate k
where k.liberi >= p_posti
order by k.ora_arrivo;
$$;



-- ══════ 0014_consumo_mappe.sql ══════

-- ════════════════════════════════════════════════════════════════════════
-- Quante volte è nata una mappa.
--
-- La soglia gratuita di Google è 10.000 mappe create al mese. Si può
-- impostare una quota dalla loro console, ma quella ROMPE la mappa: superato
-- il limite le richieste falliscono e l'utente vede un rettangolo grigio,
-- senza sapere perché.
--
-- Contarle noi permette una cosa migliore: superata la soglia smettiamo di
-- OFFRIRLA. Il pulsante «Scegli sulla mappa» non compare, resta la ricerca
-- per indirizzo — che è uno stato già previsto e che funziona. Nessuno vede
-- niente di rotto, e nessuno riceve una fattura.
-- ════════════════════════════════════════════════════════════════════════

create table consumo_mappe (
  mese          date primary key,
  caricamenti   integer not null default 0,
  aggiornato_il timestamptz not null default now()
);
alter table consumo_mappe enable row level security;
-- Nessuna policy: ci accede solo il server.

comment on table consumo_mappe is
  'un caricamento = una mappa creata. Trascinare e zoomare dentro la stessa '
  'mappa non conta: è tutto compreso in quell''unico caricamento.';

/**
 * Registra una mappa creata e restituisce il totale del mese.
 *
 * `insert ... on conflict` invece di leggere-e-scrivere: due persone che
 * aprono la mappa nello stesso istante non devono poter perdere un conteggio,
 * ed è esattamente il caso in cui un contatore letto e riscritto sbaglia.
 */
create or replace function conta_caricamento_mappa() returns integer
language sql volatile as $$
  insert into consumo_mappe (mese, caricamenti)
  values (date_trunc('month', now())::date, 1)
  on conflict (mese) do update
    set caricamenti = consumo_mappe.caricamenti + 1,
        aggiornato_il = now()
  returning caricamenti;
$$;

create or replace function caricamenti_del_mese() returns integer
language sql stable as $$
  select coalesce(
    (select caricamenti from consumo_mappe
      where mese = date_trunc('month', now())::date), 0);
$$;



-- ══════ 0015_luoghi_salvati.sql ══════

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



-- ══════ 0016_posizione.sql ══════

-- ════════════════════════════════════════════════════════════════════════
-- Dov'è chi guida, negli ultimi minuti.
--
-- Il passeggero non vuole una stima: vuole sapere se deve scendere adesso o
-- fra dieci minuti. Un orario previsto calcolato tre ore prima non risponde
-- a quella domanda; la posizione vera sì, e non costa niente — la manda il
-- telefono di chi guida, e i minuti che mancano li calcoliamo con lo stesso
-- servizio di percorsi che usiamo già.
--
-- Comprare un servizio di percorsi con il traffico costerebbe per ogni
-- corsa, e di notte il traffico non c'è: si pagherebbe per un dato che vale
-- zero proprio quando serve.
--
-- ⚠️  Seguire una persona è la cosa più delicata che questa applicazione
--     faccia. Tre limiti, tutti nel database e non solo nell'interfaccia:
--     si accende SOLO nella mezz'ora attorno alla partenza, la vedono SOLO
--     i passeggeri di quella corsa, e ogni punto scade dopo cinque minuti.
--     Nessuno storico: la riga si sovrascrive.
-- ════════════════════════════════════════════════════════════════════════

create table posizioni_corsa (
  corsa        uuid primary key references corse on delete cascade,
  conducente   uuid not null references profili on delete cascade,
  geo          geography(point,4326) not null,
  minuti_stimati smallint,
  aggiornata_il timestamptz not null default now()
);

alter table posizioni_corsa enable row level security;

-- La vedono il conducente e chi ha prenotato. E solo se è fresca: un punto
-- di venti minuti fa è peggio di nessun punto, perché sembra vero.
create policy "vedo dov'è chi mi porta" on posizioni_corsa for select to authenticated
  using (
    aggiornata_il > now() - interval '5 minutes'
    and (
      conducente = auth.uid()
      or exists (
        select 1 from prenotazioni p
         where p.corsa = posizioni_corsa.corsa
           and p.passeggero = auth.uid()
           and p.stato in ('autorizzata','catturata')
      )
    )
  );

comment on table posizioni_corsa is
  'una riga per corsa, sovrascritta. Nessuno storico: sapere dov''era '
  'qualcuno mezz''ora fa non serve a nessuno e sarebbe un archivio di '
  'spostamenti che non vogliamo avere.';

/**
 * Registra la posizione, ma solo dentro la finestra che conta.
 *
 * Il controllo è qui e non nell'interfaccia: un'applicazione modificata, o
 * semplicemente lasciata aperta, non deve poter continuare a mandare punti
 * dopo che la corsa è finita.
 */
create or replace function segna_posizione(
  p_corsa uuid, p_conducente uuid, p_lat double precision, p_lng double precision,
  p_minuti smallint default null
) returns boolean
language plpgsql security definer set search_path = public as $$
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

/** Si cancella a corsa conclusa: non resta niente da nessuna parte. */
create or replace function dimentica_posizioni() returns integer
language sql volatile as $$
  with tolte as (
    delete from posizioni_corsa p
     using corse c
     where c.id = p.corsa
       and (c.stato in ('conclusa','annullata')
            or p.aggiornata_il < now() - interval '2 hours')
     returning 1
  ) select count(*)::integer from tolte;
$$;



-- ══════ 0017_aci_struttura.sql ══════

-- ════════════════════════════════════════════════════════════════════════
-- Tabelle ACI 2026 — i costi chilometrici veri.
--
-- FONTE: Supplemento ordinario n. 40 alla Gazzetta Ufficiale, Serie
-- generale, 23 dicembre 2025 — tabelle nazionali dei costi chilometrici di
-- esercizio elaborate dall'ACI ai sensi dell'art. 51 c. 4 lett. a) del TUIR.
-- Colonna «COSTO KM» su 15.000 km annui.
--
-- Sostituiscono le stime per fascia, che erano sbagliate in entrambe le
-- direzioni: il modello benzina più economico costa 0,2864 €/km contro una
-- stima di 0,3712 per le utilitarie. Su quelle auto il conducente avrebbe
-- incassato PIÙ di quanto spende — l'invariante 1 violata, e nessun trigger
-- se ne sarebbe accorto, perché il tetto era sbagliato in partenza.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists aci_modelli (
  id            uuid primary key default uuid_generate_v4(),
  marca         text not null,
  modello       text not null,
  alimentazione alimentazione not null,
  centesimi_per_km numeric(6,2) not null check (centesimi_per_km > 0),
  anno          smallint not null default 2026,
  unique (marca, modello, alimentazione, anno)
);
create index if not exists aci_modelli_ricerca
  on aci_modelli using gin (to_tsvector('simple', marca || ' ' || modello));
alter table aci_modelli enable row level security;
create policy "i modelli si leggono" on aci_modelli for select to authenticated using (true);

