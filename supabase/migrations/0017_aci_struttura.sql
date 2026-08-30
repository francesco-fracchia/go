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

