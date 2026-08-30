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
