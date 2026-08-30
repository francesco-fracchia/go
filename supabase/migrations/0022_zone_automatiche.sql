-- ════════════════════════════════════════════════════════════════════════
-- Le zone si popolano da sole, la prima volta che qualcuno le guarda.
--
-- Prima serviva che un moderatore andasse su /serate e premesse un
-- pulsante: va bene per preparare una provincia in anticipo, non per il
-- primo utente che arriva da una zona nuova e trova una schermata vuota
-- che non gli spiega perché.
--
-- Il registro serve a non ripetere: Overpass è un servizio della comunità,
-- e interrogarlo a ogni ricerca sarebbe scortese prima ancora che lento.
-- Una cella si importa UNA volta, e i posti non si spostano.
-- ════════════════════════════════════════════════════════════════════════

create table zone_importate (
  cella          text primary key,
  lat            double precision not null,
  lng            double precision not null,
  posti_trovati  integer not null default 0,
  importata_il   timestamptz not null default now()
);
alter table zone_importate enable row level security;
-- Nessuna policy: ci accede solo il server.

comment on table zone_importate is
  'cella = coordinate arrotondate a 0,2 gradi, circa venti chilometri: la '
  'stessa scala del raggio di importazione. Arrotondare è ciò che rende il '
  'registro utile — due utenti della stessa provincia ricadono nella stessa '
  'cella e la seconda volta non si importa niente.';

/**
 * Prenota una cella per l'importazione.
 *
 * Restituisce vero solo a chi arriva per primo: gli altri, anche nello
 * stesso istante, ricevono falso e non partono. Senza questo, due persone
 * che aprono la schermata insieme lancerebbero due importazioni identiche.
 */
create or replace function prenota_zona(p_cella text, p_lat double precision, p_lng double precision)
returns boolean language plpgsql as $$
begin
  insert into zone_importate (cella, lat, lng) values (p_cella, p_lat, p_lng);
  return true;
exception when unique_violation then
  return false;
end $$;
