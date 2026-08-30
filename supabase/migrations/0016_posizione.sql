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
