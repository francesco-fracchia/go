-- ═══════════════════════════════════════════════════════════════════════
-- Recensioni: doppio cieco, e descrizioni che non sono voti.
--
-- 1. DOPPIO CIECO. Le persone non tacciono per imbarazzo: tacciono per
--    paura della ritorsione. Se scrivo che guida male, lui scrive che sono
--    un maleducato. La cura non è nascondere chi ha scritto — è la
--    SIMULTANEITÀ: nessuna delle due recensioni si vede finché non hanno
--    scritto tutti e due, o finché non scade la finestra dei quattordici
--    giorni. Chi scrive per primo non sa cosa riceverà, e chi scrive per
--    secondo non può rispondere a quello che ha letto.
--
--    La regola sta in una vista e non in una colonna calcolata da un
--    lavoro notturno: una vista è sempre vera, un lavoro notturno è vero
--    fino alla prima volta che non gira.
--
-- 2. DESCRITTORI. Alcune cose non sono né buone né cattive: sono
--    compatibilità. «Si è viaggiato in silenzio» non è un difetto, e
--    trasformarlo in un voto rende un introverso peggiore di un altro.
--    Lasciarlo come fatto costruisce una cosa più utile di una
--    reputazione: un'aspettativa. Perciò stanno in una colonna loro e non
--    fra i tag, che invece un giudizio ce l'hanno.
-- ═══════════════════════════════════════════════════════════════════════

alter table recensioni add column if not exists descrittori text[] not null default '{}';

comment on column recensioni.descrittori is
  'Come è andato il viaggio, senza giudizio: silenzio/chiacchiere, musica, soste. '
  'Non concorrono al positivo o negativo.';

create or replace view recensioni_visibili as
  select r.id, r.prenotazione, r.destinatario, r.positiva, r.tag,
         r.descrittori, r.testo, r.creata_il,
         -- Chi ha scritto NON si espone. Si dice solo da che parte stava,
         -- perché «un passeggero» e «chi guidava» cambiano il senso della
         -- frase, mentre il nome cambia solo chi si può andare a cercare.
         case when p.passeggero = r.autore then 'passeggero' else 'conducente' end
           as ruolo_autore
    from recensioni r
    join prenotazioni p on p.id = r.prenotazione
    join corse c on c.id = p.corsa
   where r.moderazione = 'pubblicata'
     and (
       exists (
         select 1 from recensioni s
          where s.prenotazione = r.prenotazione and s.autore <> r.autore
       )
       or now() > c.ora_arrivo + interval '14 days'
     );

comment on view recensioni_visibili is
  'Le recensioni che si possono mostrare: moderate, e sbloccate dal doppio cieco '
  '— o perché ha scritto anche l''altro, o perché la finestra è scaduta.';

-- Si legge solo dal server, come tutto il resto.
grant select on recensioni_visibili to service_role;
