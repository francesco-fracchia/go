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
