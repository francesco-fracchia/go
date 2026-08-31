-- ═══════════════════════════════════════════════════════════════════════
-- Gli inviti.
--
-- Un mercato a due lati non parte da solo: la prima persona che arriva non
-- trova nessuno, e se ne va. L'unico modo perché parta è che chi c'è porti
-- qualcuno — e quasi sempre porta qualcuno che già conosce, perché la prima
-- corsa la si fa volentieri con un amico di un amico.
--
-- Qui si registra soltanto CHI ha portato CHI. Nessun premio in denaro:
-- un incentivo che paga per iscrizione trasformerebbe un rimborso spese in
-- un guadagno, che è esattamente la linea che questo prodotto non attraversa.
-- Se un giorno si vorrà premiare, si premierà con qualcosa che non è
-- denaro, e sarà una decisione da prendere con chi di dovere.
-- ═══════════════════════════════════════════════════════════════════════

alter table profili add column if not exists invitato_da uuid references profili on delete set null;
alter table profili add column if not exists invitato_il timestamptz;

-- Il codice personale: corto, leggibile, senza caratteri che si confondono
-- a voce o in una foto — niente O/0, I/1, l.
create or replace function codice_invito(p_id uuid) returns text
language sql immutable as $$
  select upper(
    translate(
      substring(encode(digest(p_id::text || 'go-invito', 'sha1'), 'hex') from 1 for 6),
      'abcdef', 'HJKMNP'
    )
  )
$$;

comment on function codice_invito is
  'Codice di invito derivato dall''identificativo: stabile, non memorizzato, e senza caratteri ambigui.';

-- Risolvere un codice: serve a chi arriva da un invito, che non è ancora
-- nessuno e quindi non può leggere la tabella dei profili.
create or replace function chi_invita(p_codice text)
returns table (id uuid, nome text)
language sql stable security definer set search_path = public, extensions as $$
  select p.id, p.nome from profili p
   where codice_invito(p.id) = upper(btrim(p_codice))
   limit 1
$$;

grant execute on function codice_invito(uuid) to service_role, authenticated;
grant execute on function chi_invita(text) to service_role, authenticated, anon;
