-- ═══════════════════════════════════════════════════════════════════════
-- Andata e ritorno, un pagamento solo.
--
-- Il motore lo sapeva già fare: `autorizzazioneAndataRitorno` somma le due
-- tratte e SOLLEVA un'eccezione se una delle due non è privata, con la
-- ragione scritta dentro — su una corsa pubblica il pagamento unico
-- promette un rientro che non possiamo garantire. C'erano anche la colonna
-- `ritorno_incasso_unico` e un trigger che la spegne da solo se le
-- modalità non lo consentono.
--
-- Mancava il collegamento. Serve una cosa sola: dire quale prenotazione
-- porta i soldi di quale altra.
--
-- Perché conviene, con un numero: la commissione fissa di Stripe è 25
-- centesimi A PAGAMENTO. Su una quota da 3,55 € sono il 7%. Pagare una
-- volta invece di due dimezza quella parte, e su una comitiva che fa
-- andata e ritorno ogni sabato, in un anno è denaro vero.
-- ═══════════════════════════════════════════════════════════════════════

alter table prenotazioni add column if not exists saldata_con uuid
  references prenotazioni on delete set null;

comment on column prenotazioni.saldata_con is
  'La prenotazione dell''andata che porta l''autorizzazione per entrambe. '
  'Quando è valorizzata, questa riga non ha un PaymentIntent proprio.';

create index if not exists prenotazioni_saldata_con
  on prenotazioni (saldata_con) where saldata_con is not null;

/**
 * Il vincolo «l'autorizzato copre il totale» vale per chi paga da sé.
 *
 * Una prenotazione saldata da un'altra ha autorizzato_cent a zero e un
 * totale positivo: è corretto, ed è il punto. Il vincolo resta identico
 * per tutte le altre — cioè per tutte quelle in cui un errore di calcolo
 * potrebbe far catturare più di quanto la carta ha promesso.
 */
alter table prenotazioni drop constraint if exists autorizzato_copre;
alter table prenotazioni add constraint autorizzato_copre
  check (saldata_con is not null or autorizzato_cent >= totale_cent);

-- Una prenotazione non può saldare se stessa, e non si costruiscono catene:
-- chi salda deve essere una riga che paga davvero.
alter table prenotazioni drop constraint if exists saldo_non_circolare;
alter table prenotazioni add constraint saldo_non_circolare
  check (saldata_con is null or saldata_con <> id);
