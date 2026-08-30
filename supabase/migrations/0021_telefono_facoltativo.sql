-- ════════════════════════════════════════════════════════════════════════
-- Il numero di telefono diventa facoltativo all'ingresso.
--
-- Registrandosi con l'email non c'è nessun numero da verificare, ma la
-- colonna era obbligatoria: ci finiva un segnaposto, e il profilo mostrava
-- «numero di telefono verificato» a chi non ne aveva dato nessuno.
--
-- Su un prodotto dove si sale in macchina con sconosciuti un segnale di
-- fiducia falso è peggio di uno assente: chi lo legge decide sulla base di
-- una cosa che non è successa.
--
-- Il numero resta necessario — serve alle chiamate mascherate — ma si
-- chiede DOVE SERVE: prima di pubblicare una corsa o di prenotarne una,
-- non all'ingresso.
-- ════════════════════════════════════════════════════════════════════════

alter table profili alter column telefono drop not null;

-- I segnaposto lasciati dalla registrazione via email tornano vuoti.
update profili
   set telefono = null, telefono_ok = false
 where telefono like 'email:%';

comment on column profili.telefono_ok is
  'vero SOLO dopo una verifica via SMS andata a buon fine. Non lo si mette '
  'a mano: è quello che gli altri utenti leggono per decidere se fidarsi.';

-- Chi pubblica una corsa deve avere un numero verificato: è il minimo per
-- essere raggiungibile da chi sale, e la verifica dell'identità più
-- economica che esista.
create or replace function verifica_conducente_raggiungibile() returns trigger
language plpgsql as $$
declare ok boolean;
begin
  if new.stato <> 'pubblicata' then return new; end if;
  select telefono_ok into ok from profili where id = new.conducente;
  if not coalesce(ok, false) then
    raise exception 'serve un numero di telefono verificato per pubblicare'
      using errcode = 'check_violation', hint = 'telefono';
  end if;
  return new;
end $$;

-- ⚠️  Non ancora attivo: si accende quando l'SMS è configurato. Prima,
--     bloccherebbe tutti — compreso chi sta provando il prodotto.
-- create trigger corse_conducente_raggiungibile
--   before insert or update of stato on corse
--   for each row execute function verifica_conducente_raggiungibile();
