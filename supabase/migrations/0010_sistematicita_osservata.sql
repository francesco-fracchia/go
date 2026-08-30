-- ════════════════════════════════════════════════════════════════════════
-- Sistematicità: si osserva, non si blocca.
--
-- Le soglie precedenti (4 corse a settimana come avviso, 8 come blocco)
-- erano calibrate male, e in modo dannoso: avrebbero fermato per primo
-- l'utente migliore. Chi fa Lodi–Milano ogni giorno per lavoro è il caso
-- puro del «ci vado comunque», non un trasportatore abusivo.
--
-- Il ragionamento corretto è questo. Il test giurisprudenziale è lucro +
-- sistematicità + organizzazione, e il lucro qui è escluso per costruzione:
-- il motore dei prezzi garantisce che il conducente non rientri mai del
-- costo, ed è dimostrabile su ogni singola corsa. Senza lucro, la sola
-- frequenza non configura un'attività di trasporto.
--
-- Resta un segnale diverso e più specifico, che conserviamo: la stessa
-- tratta, agli stessi orari, con gli stessi passeggeri, ripetuta. Non è
-- «viaggiare molto»: è somigliare a un servizio di linea, che ha regole
-- proprie. Lo misuriamo e non lo impediamo.
-- ════════════════════════════════════════════════════════════════════════

drop trigger if exists corse_sistematicita on corse;

update soglie_sistematicita set
  corse_settimana_avviso = 20,
  corse_settimana_blocco = 40,
  corse_anno_avviso      = 400,
  corse_anno_blocco      = 900
where id = 1;

comment on table soglie_sistematicita is
  'Soglie di OSSERVAZIONE, non di blocco. Nessun trigger le impone: '
  'servono a far comparire un conducente in una vista da guardare, non a '
  'impedirgli di pubblicare. Il blocco resta possibile caso per caso con '
  'profili.limitato, e va usato su un giudizio, mai su un contatore.';

-- ─── Il segnale che conta davvero ───────────────────────────────────────
-- Non «quante corse», ma «quanto si ripete uguale». Una tratta identica,
-- alla stessa ora, con gli stessi passeggeri, molte volte: è questo che
-- somiglia a un servizio di linea. Viaggiare tanto su tragitti diversi no.
create or replace view ripetitivita_conducenti as
with corse_recenti as (
  select c.conducente, c.id,
         c.origine_label, c.destinazione_label,
         extract(hour from c.ora_partenza)::int as ora,
         extract(dow  from c.ora_partenza)::int as giorno
    from corse c
   where c.stato = 'conclusa'
     and c.ora_partenza > now() - interval '90 days'
), tratte as (
  select conducente, origine_label, destinazione_label, ora, giorno,
         count(*) as volte
    from corse_recenti
   group by conducente, origine_label, destinazione_label, ora, giorno
), passeggeri_ricorrenti as (
  select c.conducente, p.passeggero, count(*) as volte
    from corse c join prenotazioni p on p.corsa = c.id
   where c.stato = 'conclusa'
     and c.ora_partenza > now() - interval '90 days'
     and p.stato in ('completata','liquidata')
   group by c.conducente, p.passeggero
)
select
  t.conducente,
  max(t.volte)                                     as tratta_piu_ripetuta,
  count(*)                                         as tratte_distinte,
  coalesce(max(pr.volte), 0)                       as passeggero_piu_ricorrente,
  -- Somiglia a un servizio di linea quando poche tratte si ripetono molto
  -- CON le stesse persone. Una sola delle due condizioni non basta.
  (max(t.volte) >= 20 and coalesce(max(pr.volte), 0) >= 15) as da_guardare
from tratte t
left join passeggeri_ricorrenti pr on pr.conducente = t.conducente
group by t.conducente;

comment on view ripetitivita_conducenti is
  'Segnale specifico, non un contatore di volume. `da_guardare` non blocca '
  'niente: fa comparire un nome in una lista che una persona guarda.';
