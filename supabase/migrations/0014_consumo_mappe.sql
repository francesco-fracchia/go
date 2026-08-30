-- ════════════════════════════════════════════════════════════════════════
-- Quante volte è nata una mappa.
--
-- La soglia gratuita di Google è 10.000 mappe create al mese. Si può
-- impostare una quota dalla loro console, ma quella ROMPE la mappa: superato
-- il limite le richieste falliscono e l'utente vede un rettangolo grigio,
-- senza sapere perché.
--
-- Contarle noi permette una cosa migliore: superata la soglia smettiamo di
-- OFFRIRLA. Il pulsante «Scegli sulla mappa» non compare, resta la ricerca
-- per indirizzo — che è uno stato già previsto e che funziona. Nessuno vede
-- niente di rotto, e nessuno riceve una fattura.
-- ════════════════════════════════════════════════════════════════════════

create table consumo_mappe (
  mese          date primary key,
  caricamenti   integer not null default 0,
  aggiornato_il timestamptz not null default now()
);
alter table consumo_mappe enable row level security;
-- Nessuna policy: ci accede solo il server.

comment on table consumo_mappe is
  'un caricamento = una mappa creata. Trascinare e zoomare dentro la stessa '
  'mappa non conta: è tutto compreso in quell''unico caricamento.';

/**
 * Registra una mappa creata e restituisce il totale del mese.
 *
 * `insert ... on conflict` invece di leggere-e-scrivere: due persone che
 * aprono la mappa nello stesso istante non devono poter perdere un conteggio,
 * ed è esattamente il caso in cui un contatore letto e riscritto sbaglia.
 */
create or replace function conta_caricamento_mappa() returns integer
language sql volatile as $$
  insert into consumo_mappe (mese, caricamenti)
  values (date_trunc('month', now())::date, 1)
  on conflict (mese) do update
    set caricamenti = consumo_mappe.caricamenti + 1,
        aggiornato_il = now()
  returning caricamenti;
$$;

create or replace function caricamenti_del_mese() returns integer
language sql stable as $$
  select coalesce(
    (select caricamenti from consumo_mappe
      where mese = date_trunc('month', now())::date), 0);
$$;
