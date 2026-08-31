-- ═══════════════════════════════════════════════════════════════════════
-- «Ti mando il link».
--
-- La differenza fra la frase che una persona dice a sua madre uscendo —
-- «esco con uno che ho trovato su un'applicazione» — e quella che vorremmo
-- dicesse: «ti mando il link». È la stessa serata, cambia solo se qualcuno
-- fuori sa dove sei.
--
-- Non è un tracciamento: è un collegamento che apri TU e mandi a CHI VUOI
-- TU. Chi lo riceve non ha un account, non installa niente, e vede solo
-- questo viaggio — non te, non i tuoi altri viaggi, non gli altri
-- passeggeri.
--
-- E muore. Dodici ore dopo l'arrivo il collegamento smette di rispondere:
-- un indirizzo che resta vivo per sempre non è una condivisione, è una
-- cimice che ti sei messo in tasca da solo.
-- ═══════════════════════════════════════════════════════════════════════

alter table prenotazioni add column if not exists token_scorta text unique;

comment on column prenotazioni.token_scorta is
  'Collegamento pubblico per seguire QUESTO viaggio. Lo crea chi viaggia, '
  'scade dodici ore dopo l''arrivo, e non richiede un account a chi lo apre.';

-- Chi apre il collegamento non è nessuno: nemmeno autenticato. Serve una
-- funzione che legga per lui, esattamente e solo quello che deve vedere.
create or replace function viaggio_da_token(p_token text)
returns table (
  passeggero_nome text,
  conducente_nome text,
  conducente_foto text,
  auto text,
  targa text,
  origine text,
  destinazione text,
  ora_partenza timestamptz,
  ora_arrivo timestamptz,
  stato stato_corsa,
  corsa uuid
)
language sql stable security definer set search_path = public as $$
  select
    pp.nome, pc.nome, pc.foto_url,
    coalesce(v.marca || ' ' || v.modello, 'auto') ||
      coalesce(', ' || v.colore, ''),
    v.targa,
    c.origine_label, c.destinazione_label,
    c.ora_partenza, c.ora_arrivo, c.stato, c.id
  from prenotazioni p
  join corse c   on c.id = p.corsa
  join profili pp on pp.id = p.passeggero
  join profili pc on pc.id = c.conducente
  left join veicoli v on v.id = c.veicolo
  where p.token_scorta = p_token
    -- Il collegamento muore dodici ore dopo l'arrivo previsto.
    and now() < c.ora_arrivo + interval '12 hours'
    and p.stato in ('autorizzata','catturata','completata','liquidata')
  limit 1
$$;

comment on function viaggio_da_token is
  'Quello che vede chi ha ricevuto il collegamento: nomi propri, auto e targa, '
  'tratta e orari. Mai cognomi, telefoni, importi o altri passeggeri.';

grant execute on function viaggio_da_token(text) to service_role, anon, authenticated;
