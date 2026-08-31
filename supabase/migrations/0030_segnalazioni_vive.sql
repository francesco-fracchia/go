-- ═══════════════════════════════════════════════════════════════════════
-- Le segnalazioni cominciano a esistere davvero.
--
-- La tabella c'era dal primo giorno e non aveva un solo scrittore: le
-- accuse gravi vivevano fra le ETICHETTE DELLE RECENSIONI, accanto a
-- «simpatico». «Aveva bevuto» era un tag pubblico su un profilo.
--
-- Serve un tipo di notifica in più: una sospensione cautelare va detta a
-- chi la riceve, insieme al fatto che può rispondere. Un account che
-- smette di funzionare senza spiegazione è una porta chiusa senza
-- campanello.
-- ═══════════════════════════════════════════════════════════════════════

alter type tipo_notifica add value if not exists 'account_sospeso';

-- Una persona non segnala la stessa prenotazione due volte per lo stesso
-- motivo. Senza questo vincolo, «indipendenti» si conterebbe sulle righe e
-- dieci clic della stessa persona varrebbero dieci testimoni.
create unique index if not exists segnalazioni_una_per_motivo
  on segnalazioni (autore, prenotazione, tipo);

-- Si cercano sempre per accusato e per stato: le aperte, per tipo.
create index if not exists segnalazioni_aperte
  on segnalazioni (tipo) where chiusa_il is null;
