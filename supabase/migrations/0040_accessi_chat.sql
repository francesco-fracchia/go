-- ═══════════════════════════════════════════════════════════════════════
-- Leggere la conversazione di due persone lascia una traccia.
--
-- Chiudendo la chat ai soli partecipanti ho chiuso fuori anche chi modera:
-- una segnalazione per molestia arrivava in coda SENZA le prove, e chi
-- doveva decidere non poteva leggere i messaggi su cui decideva.
--
-- Riaprirla del tutto sarebbe stato peggio del problema. Quindi si riapre
-- stretta: solo su una corsa con una segnalazione APERTA, solo la
-- conversazione che riguarda quella segnalazione, e ogni accesso resta
-- scritto qui.
--
-- La traccia non serve a sfiduciare chi modera: serve a poter rispondere,
-- fra un anno, alla domanda «chi ha letto i miei messaggi, e perché».
-- Senza una risposta a quella domanda, «leggiamo solo dopo una
-- segnalazione» è una promessa che nessuno può verificare — nemmeno chi
-- l'ha fatta.
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists accessi_chat (
  id            uuid primary key default uuid_generate_v4(),
  moderatore    uuid not null references profili on delete cascade,
  corsa         uuid not null references corse on delete cascade,
  segnalazione  uuid references segnalazioni on delete set null,
  /** null = la conversazione di gruppo */
  passeggero    uuid references profili on delete set null,
  messaggi_letti integer not null default 0,
  quando        timestamptz not null default now()
);
create index if not exists accessi_chat_quando on accessi_chat (quando desc);

alter table accessi_chat enable row level security;
-- Nessuna politica: ci scrive solo il server, e si legge dal database.
-- Una traccia che chi è tracciato può cancellare non è una traccia.

comment on table accessi_chat is
  'Ogni volta che chi modera apre la conversazione di qualcun altro. '
  'Si scrive prima di mostrare i messaggi, non dopo: se la scrittura '
  'fallisce, la lettura non avviene.';
