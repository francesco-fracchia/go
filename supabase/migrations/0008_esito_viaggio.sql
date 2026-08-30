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
