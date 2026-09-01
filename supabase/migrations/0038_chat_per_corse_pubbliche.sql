-- ═══════════════════════════════════════════════════════════════════════
-- Su una corsa pubblica non si parla in gruppo.
--
-- La conversazione di gruppo ha senso fra chi si conosce: una comitiva che
-- va allo stesso locale è un gruppo davvero, e ogni messaggio ha dei
-- testimoni. Fra sconosciuti che si sono trovati con una ricerca è
-- un'altra cosa: la chat era l'UNICO posto in cui un passeggero scopriva
-- chi altro sale — la sua schermata non li elenca affatto, di proposito —
-- e quel posto lo apriva senza che nessuno lo avesse deciso.
--
-- Da qui in poi su una corsa pubblica ogni passeggero parla con chi guida,
-- e basta. Il conducente resta il centro: è l'unico che ha qualcosa da
-- perdere su ogni conversazione — la reputazione, i soldi, il documento
-- verificato da Stripe. Fra passeggero e passeggero non si apre niente.
--
-- `passeggero` dice a quale conversazione appartiene un messaggio. Nullo
-- vuol dire «la conversazione di tutti», che resta il caso delle corse
-- private e col collegamento.
-- ═══════════════════════════════════════════════════════════════════════

alter table messaggi add column if not exists passeggero uuid
  references profili on delete cascade;

comment on column messaggi.passeggero is
  'Su una corsa pubblica: con quale passeggero parla il conducente. '
  'Nullo sulle corse private e con collegamento, dove si parla in gruppo.';

create index if not exists messaggi_conversazione
  on messaggi (corsa, passeggero, creato_il desc);

-- ── Le politiche seguono la stessa regola ──────────────────────────────
--
-- Vanno riscritte, non aggiunte: quella vecchia diceva «se condividi la
-- corsa vedi tutto», che su una corsa pubblica adesso è troppo.

drop policy if exists "chat solo tra chi condivide la corsa" on messaggi;
drop policy if exists "scrivo nelle chat a cui appartengo" on messaggi;

create policy "vedo la conversazione a cui appartengo" on messaggi
  for select to authenticated
  using (
    -- chi guida vede tutte le conversazioni della propria corsa
    exists (select 1 from corse c where c.id = corsa and c.conducente = auth.uid())
    or (
      exists (
        select 1 from prenotazioni p
         where p.corsa = messaggi.corsa and p.passeggero = auth.uid()
           and p.stato not in ('rifiutata','scaduta')
      )
      -- il passeggero vede il gruppo, oppure la SUA conversazione
      and (messaggi.passeggero is null or messaggi.passeggero = auth.uid())
    )
  );

create policy "scrivo nella conversazione a cui appartengo" on messaggi
  for insert to authenticated
  with check (
    autore = auth.uid()
    and (
      exists (select 1 from corse c where c.id = corsa and c.conducente = auth.uid())
      or (
        exists (
          select 1 from prenotazioni p
           where p.corsa = messaggi.corsa and p.passeggero = auth.uid()
             and p.stato not in ('rifiutata','scaduta')
        )
        and (messaggi.passeggero is null or messaggi.passeggero = auth.uid())
      )
    )
  );
