-- ═══════════════════════════════════════════════════════════════════════
-- Accettare una deviazione costa dei minuti. Chi li paga?
--
-- Il pianificatore li faceva pagare sempre alla partenza: ancorava l'ora
-- di arrivo e spostava indietro l'uscita di casa. È giusto per andare a un
-- concerto ed è sbagliato per tornare a casa, e nessuno l'aveva deciso —
-- era una scelta incorporata nel conto, che è il posto peggiore per
-- tenerne una.
--
-- Due opzioni, non tre. «Un po' e un po'» non rende il danno più piccolo:
-- costringe a rinegoziare con TUTTI E DUE i gruppi invece che con uno, e
-- peggiora due promesse per non peggiorarne una.
--
-- E la flessibilità dichiarata alla pubblicazione smette di sparire. Il
-- trigger la azzera alla prima prenotazione — giustamente, perché da lì
-- l'orario è quello e basta — ma azzerandola si perdeva anche il fatto che
-- chi guida AVEVA DETTO che un quarto d'ora sull'arrivo gli andava bene.
-- Al momento della scelta quella frase vale più di una domanda nuova.
-- ═══════════════════════════════════════════════════════════════════════

create type assorbimento as enum ('partenza', 'arrivo');

alter table corse add column if not exists assorbe assorbimento not null default 'partenza';
alter table corse add column if not exists flessibilita_pubblicata smallint not null default 0;
alter table corse add column if not exists orario_cambiato_il timestamptz;

comment on column corse.assorbe is
  'Chi paga i minuti che i ritiri aggiungono: «partenza» si esce prima e '
  'l''arrivo resta; «arrivo» si parte all''ora scritta e si arriva dopo.';
comment on column corse.flessibilita_pubblicata is
  'Quanto margine sull''arrivo chi guida aveva dichiarato PUBBLICANDO. '
  'Resta anche dopo che la prima prenotazione azzera flessibilita_min.';
comment on column corse.orario_cambiato_il is
  'Quando gli orari sono cambiati per una decisione di chi guida. Chi '
  'aveva già prenotato può disdire senza penale dopo questa data.';

-- Le corse già pubblicate: quello che avevano dichiarato è quello che c'è.
update corse set flessibilita_pubblicata = flessibilita_min
 where flessibilita_pubblicata = 0 and flessibilita_min > 0;

-- Alla pubblicazione si conserva; il trigger che azzera resta com'è.
create or replace function ricorda_flessibilita() returns trigger
language plpgsql as $$
begin
  if new.flessibilita_pubblicata = 0 then
    new.flessibilita_pubblicata := new.flessibilita_min;
  end if;
  return new;
end $$;

drop trigger if exists corse_ricordano_flessibilita on corse;
create trigger corse_ricordano_flessibilita
  before insert on corse
  for each row execute function ricorda_flessibilita();
