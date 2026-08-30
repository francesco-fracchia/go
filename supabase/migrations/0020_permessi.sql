-- ════════════════════════════════════════════════════════════════════════
-- I permessi sulle tabelle, dati a mano.
--
-- Alla creazione del progetto abbiamo tolto «esponi automaticamente le
-- tabelle nuove» — è quello che Supabase stesso consiglia. La conseguenza,
-- che va capita: i ruoli non ricevono NESSUN permesso, nemmeno
-- `service_role`, e le query rispondono «permission denied» anche dal
-- server.
--
-- Darli qui è meglio che lasciarli dare in automatico per una ragione sola,
-- ma che conta: una tabella aggiunta fra sei mesi resta chiusa finché
-- qualcuno non decide di aprirla. Il valore predefinito diventa «negato»
-- invece di «concesso», e la dimenticanza smette di essere pericolosa.
--
-- I permessi sono la porta, le politiche RLS sono la serratura. Servono
-- entrambe: senza permesso non si entra affatto, con il permesso si entra
-- solo dove la politica lascia passare.
-- ════════════════════════════════════════════════════════════════════════

-- ─── Il server ──────────────────────────────────────────────────────────
-- `service_role` scavalca le politiche RLS per costruzione: è il ruolo che
-- usano le funzioni server, dove gira il motore dei prezzi e dove i
-- controlli sono già stati fatti nel codice.
grant usage on schema public to service_role;
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant all privileges on all functions in schema public to service_role;

-- ─── Chi ha fatto accesso ───────────────────────────────────────────────
-- Legge tutto ciò che una politica gli lascia leggere, e scrive solo dove
-- una politica di scrittura esiste davvero. Le tabelle senza politica di
-- INSERT — `prenotazioni` sopra tutte — restano in sola lettura anche per
-- lui: le prenotazioni passano dal server perché è lì che gira il calcolo
-- del prezzo, e un client che potesse inserirle da sé renderebbe
-- decorativo tutto il resto.
grant usage on schema public to authenticated;
grant select on all tables in schema public to authenticated;

grant insert, update, delete on
  corse, veicoli, luoghi_salvati, push_iscrizioni, richieste_passaggio
  to authenticated;

grant insert on messaggi, recensioni, segnalazioni to authenticated;
grant insert, update on profili to authenticated;

-- ─── Chi non ha fatto accesso ───────────────────────────────────────────
-- Solo i dati che non appartengono a nessuno e che servono a decidere se
-- registrarsi: dove si va, e quanto costa un chilometro. Tutto il resto
-- richiede un nome.
grant usage on schema public to anon;
grant select on posti, serate, aci_modelli, aci_costi to anon;

-- ─── Le tabelle di domani ───────────────────────────────────────────────
-- Senza questo, ogni tabella nuova nascerebbe inaccessibile e il problema
-- si ripresenterebbe identico alla prossima migrazione. Con questo, nasce
-- accessibile al server e leggibile da chi ha fatto accesso — e comunque
-- protetta dalle politiche RLS, che restano da scrivere una per una.
alter default privileges in schema public
  grant all on tables to service_role;
alter default privileges in schema public
  grant select on tables to authenticated;
