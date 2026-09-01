-- ═══════════════════════════════════════════════════════════════════════
-- Il diario: cosa è successo, in ordine.
--
-- Un elenco di corse dice cosa ESISTE. Non dice se qualcuno ha aperto
-- l'applicazione, ha cercato, non ha trovato niente ed è andato via — che
-- all'inizio è la cosa che succede più spesso, e l'unica da cui si impara
-- qualcosa.
--
-- Non serve strumentare niente: ogni tabella ha già la sua data. Serve
-- solo metterle in fila.
--
-- Dei messaggi si conta CHE ci sono stati, mai cosa dicono. La riga del
-- diario è «si sono scritti», e il testo resta dove sta. Un pannello da
-- cui si sfogliano le conversazioni è la cosa che trasforma un accesso
-- difendibile — quello dopo una segnalazione, tracciato — in uno che non
-- lo è.
-- ═══════════════════════════════════════════════════════════════════════

/**
 * Le ricerche: la metà dell'uso che non lascia nessuna riga.
 *
 * Chi cerca «Lodi → Milano» tre volte e non prenota mai è il dato più
 * utile che ci sia in un mercato a due lati appena nato: dice su quale
 * tratta manca un conducente. Senza questa tabella quella persona, per
 * noi, non è mai esistita.
 *
 * Si tiene poco e si tiene stretto: dove, quando, quanti risultati. Non
 * la posizione esatta — l'etichetta del luogo, che è quello che serve.
 */
create table if not exists ricerche (
  id         uuid primary key default uuid_generate_v4(),
  utente     uuid references profili on delete set null,
  origine    text not null,
  destinazione text not null,
  quando_partenza timestamptz,
  risultati  smallint not null default 0,
  creata_il  timestamptz not null default now()
);
create index if not exists ricerche_recenti on ricerche (creata_il desc);
create index if not exists ricerche_a_vuoto on ricerche (creata_il desc) where risultati = 0;

alter table ricerche enable row level security;
-- Ci scrive solo il server; si legge dal pannello, che passa dal server.

comment on table ricerche is
  'Cosa la gente cerca, e se lo trova. Novanta giorni: serve a capire '
  'dove manca un conducente, non a ricostruire i movimenti di qualcuno.';

-- ── Il diario ──────────────────────────────────────────────────────────

create or replace view diario as
  select p.creato_il as quando, 'iscrizione' as tipo, p.id as chi,
         p.nome, 'si è iscritto' as cosa, null::uuid as corsa
    from profili p
  union all
  select c.creata_il, 'corsa', c.conducente, pr.nome,
         'ha pubblicato ' || c.origine_label || ' → ' || c.destinazione_label, c.id
    from corse c join profili pr on pr.id = c.conducente
  union all
  select b.creata_il, 'prenotazione', b.passeggero, pr.nome,
         case when b.stato = 'richiesta' then 'ha chiesto un posto per '
              else 'ha prenotato ' end || c.destinazione_label, c.id
    from prenotazioni b
    join profili pr on pr.id = b.passeggero
    join corse c on c.id = b.corsa
  union all
  select b.autorizzata_il, 'accettata', c.conducente, pr.nome,
         'ha accettato ' || pa.nome || ' per ' || c.destinazione_label, c.id
    from prenotazioni b
    join corse c on c.id = b.corsa
    join profili pr on pr.id = c.conducente
    join profili pa on pa.id = b.passeggero
   where b.autorizzata_il is not null
  union all
  select r.creata_il, 'cerco', r.passeggero, pr.nome,
         'cerca un passaggio', null::uuid
    from richieste_passaggio r join profili pr on pr.id = r.passeggero
  union all
  select re.creata_il, 'recensione', re.autore, pr.nome,
         'ha recensito ' || pd.nome, null::uuid
    from recensioni re
    join profili pr on pr.id = re.autore
    join profili pd on pd.id = re.destinatario
  union all
  select s.creata_il, 'segnalazione', s.autore, pr.nome,
         'ha segnalato: ' || s.tipo::text, s.corsa
    from segnalazioni s join profili pr on pr.id = s.autore
  union all
  -- Dei messaggi si conta l'esistenza, mai il contenuto.
  select m.creato_il, 'messaggio', m.autore, pr.nome,
         'ha scritto un messaggio', m.corsa
    from messaggi m join profili pr on pr.id = m.autore
  union all
  select co.creata_il, 'comitiva', co.creata_da, pr.nome,
         'ha aperto la comitiva ' || co.nome, null::uuid
    from comitive co join profili pr on pr.id = co.creata_da
  union all
  select l.creata_il, 'liquidazione', l.conducente, pr.nome,
         'ha incassato ' || to_char(l.importo_cent / 100.0, 'FM999D00') || ' €', null::uuid
    from liquidazioni l join profili pr on pr.id = l.conducente
  union all
  select ri.creata_il, 'ricerca', ri.utente, coalesce(pr.nome, 'qualcuno'),
         'ha cercato ' || ri.origine || ' → ' || ri.destinazione
           || case when ri.risultati = 0 then ' · NIENTE'
                   else ' · ' || ri.risultati || ' risultati' end,
         null::uuid
    from ricerche ri left join profili pr on pr.id = ri.utente;

comment on view diario is
  'Tutto quello che è successo, in ordine. Dei messaggi si vede che ci '
  'sono stati, mai cosa dicono.';
