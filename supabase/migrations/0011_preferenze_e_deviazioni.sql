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
