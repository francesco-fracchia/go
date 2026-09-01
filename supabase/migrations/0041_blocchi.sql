-- ═══════════════════════════════════════════════════════════════════════
-- Non voglio più viaggiare con questa persona.
--
-- Mancava del tutto. Si poteva segnalare qualcuno — cioè chiedere a noi di
-- occuparcene — e non si poteva fare la cosa più semplice e immediata:
-- non incontrarlo più. Fra la segnalazione e il nulla non c'era niente,
-- e la maggior parte dei casi sta lì in mezzo: nessun reato, nessuna
-- accusa da scrivere, solo un viaggio andato male con qualcuno che non si
-- vuole rivedere.
--
-- Il blocco vale nei DUE SENSI: se io blocco te, né tu sali con me né io
-- salgo con te. Un blocco a senso unico lascerebbe alla persona bloccata
-- il modo di ritrovarsi accanto lo stesso, prenotando lei.
--
-- E non si dice a chi è bloccato. Non per proteggere chi blocca da un
-- imbarazzo: perché dirlo è consegnargli l'informazione che qualcuno ha
-- deciso di evitarlo, che è precisamente ciò che potrebbe farlo reagire.
-- Chi è bloccato vede una corsa in meno, come quando è piena.
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists blocchi (
  id        uuid primary key default uuid_generate_v4(),
  chi       uuid not null references profili on delete cascade,
  bloccato  uuid not null references profili on delete cascade,
  motivo    text,
  creato_il timestamptz not null default now(),
  unique (chi, bloccato),
  check (chi <> bloccato)
);
create index if not exists blocchi_bloccato on blocchi (bloccato);

alter table blocchi enable row level security;
drop policy if exists "vedo e gestisco i miei blocchi" on blocchi;
create policy "vedo e gestisco i miei blocchi" on blocchi for all to authenticated
  using (chi = auth.uid()) with check (chi = auth.uid());

/**
 * Fra queste due persone c'è un blocco, in un verso o nell'altro.
 *
 * Una funzione e non due condizioni sparse: la regola «vale nei due sensi»
 * scritta in tre posti diventa «vale in un senso» il giorno che se ne
 * corregge una sola.
 */
create or replace function bloccati(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select exists (
    select 1 from blocchi
     where (chi = a and bloccato = b) or (chi = b and bloccato = a)
  )
$$;
