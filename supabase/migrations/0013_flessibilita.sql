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
