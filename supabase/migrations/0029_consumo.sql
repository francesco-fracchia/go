-- ═══════════════════════════════════════════════════════════════════════
-- Quanto consuma l'auto.
--
-- Serve a una cosa sola: permettere a chi guida di farsi rimborsare SOLO
-- il carburante su una corsa fra amici, invece del costo pieno.
--
-- Perché non si ricava: le tabelle ACI che abbiamo importato hanno una
-- cifra sola, tutto compreso — carburante, gomme, manutenzione, bollo,
-- assicurazione, svalutazione. Non c'è dentro la scomposizione, e stimarla
-- a occhio vorrebbe dire inventare un numero dentro il meccanismo che
-- decide quanto una persona paga a un'altra. Quindi il consumo lo dichiara
-- chi guida, ed è dichiaratamente suo.
--
-- Facoltativo: senza, restano gli altri livelli di rimborso. Un campo in
-- più obbligatorio nel modulo dell'auto costerebbe più conducenti di
-- quanti ne farebbe felici questa opzione.
-- ═══════════════════════════════════════════════════════════════════════

alter table veicoli add column if not exists consumo_l100 numeric(4,1)
  check (consumo_l100 is null or (consumo_l100 > 1 and consumo_l100 < 40));

comment on column veicoli.consumo_l100 is
  'Litri per 100 km dichiarati dal proprietario. Facoltativo: serve solo ai livelli di rimborso «solo carburante».';
