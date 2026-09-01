-- ═══════════════════════════════════════════════════════════════════════
-- Le notifiche cominciano a esistere anche quando non partono.
--
-- Il registro serviva a due cose: non mandare due volte la stessa cosa, e
-- sapere quanto costano gli SMS. Non serviva a DIRE niente a nessuno — la
-- riga si scriveva solo dopo una consegna riuscita, e non conteneva il
-- testo. Un messaggio non consegnato non esisteva da nessuna parte.
--
-- In produzione le iscrizioni push sono zero. Vuol dire che finora ogni
-- singola notifica è evaporata: prenotazione accettata, corsa annullata,
-- account sospeso. La politica «vedo le mie notifiche» era già scritta dal
-- primo giorno; la schermata per vederle no.
--
-- Il push resta il modo veloce. Smette di essere l'unico.
-- ═══════════════════════════════════════════════════════════════════════

alter type canale_notifica add value if not exists 'app';

alter table notifiche add column if not exists titolo text;
alter table notifiche add column if not exists testo  text;
alter table notifiche add column if not exists url    text;
alter table notifiche add column if not exists letta_il timestamptz;

-- Si leggono sempre così: le mie, le non lette prima.
create index if not exists notifiche_mie_da_leggere
  on notifiche (destinatario, inviata_il desc) where letta_il is null;

comment on table notifiche is
  'Ogni notifica, consegnata o no. Il canale dice come è arrivata: "app" '
  'vuol dire che è solo qui dentro, ed è il caso normale finché qualcuno '
  'non concede il permesso alle notifiche del telefono.';
