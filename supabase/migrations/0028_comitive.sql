-- ═══════════════════════════════════════════════════════════════════════
-- La comitiva, il turno, e chi stasera non guida.
--
-- Fin qui GO conosceva viaggi e persone, ma non l'unità che i viaggi li
-- decide davvero: il gruppo di amici. È quella che sceglie dove si va,
-- chi passa a prendere chi, e — la domanda vera delle due di notte — chi
-- resta sobrio.
--
-- Tre tabelle per una cosa sola, e il legame fra loro è il punto:
--
--   comitive          il gruppo, con un codice per entrarci
--   turni             chi ha guidato, una riga per volta
--   non_guido         chi stasera beve, e quindi è fuori dal sorteggio
--
-- «Chi guida stasera?» non è un sorteggio casuale: pesca fra chi NON ha
-- detto «stasera non guido», e propone chi ha guidato meno. Un sorteggio
-- casuale è divertente una volta; un turno che si ricorda è una cosa che
-- si apre anche quando non si viaggia. Ed è la differenza fra un gioco e
-- il motivo per cui quel gruppo litigava.
--
-- Il conto fra amici si tiene in PASSAGGI, non in euro. Un debito in
-- natura è simpatico; lo stesso debito in denaro trasforma gli amici in
-- creditori, e ci porterebbe dentro cose — pagamenti, commissioni,
-- adempimenti — che qui non c'entrano niente.
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists comitive (
  id        uuid primary key default uuid_generate_v4(),
  nome      text not null check (btrim(nome) <> '' and length(nome) <= 40),
  creata_da uuid not null references profili on delete cascade,
  creata_il timestamptz not null default now()
);

create table if not exists comitive_membri (
  comitiva   uuid not null references comitive on delete cascade,
  persona    uuid not null references profili on delete cascade,
  entrato_il timestamptz not null default now(),
  primary key (comitiva, persona)
);
create index if not exists comitive_membri_persona on comitive_membri (persona);

-- Una riga per volta guidata. Nasce da una corsa vera quando c'è, e a mano
-- quando non c'è: il primo mese non ci sono corse su GO, ma le serate sì,
-- e un turno che parte vuoto non lo usa nessuno.
create table if not exists turni (
  id        uuid primary key default uuid_generate_v4(),
  comitiva  uuid not null references comitive on delete cascade,
  guidatore uuid not null references profili on delete cascade,
  quando    timestamptz not null default now(),
  corsa     uuid references corse on delete set null
);
create index if not exists turni_comitiva on turni (comitiva, quando desc);

-- «Stasera non guido»: una dichiarazione con una data, non uno stato.
-- Vale per una sera e scade da sola, perché è quello che fa nella realtà.
create table if not exists non_guido (
  persona  uuid not null references profili on delete cascade,
  sera     date not null,
  detto_il timestamptz not null default now(),
  primary key (persona, sera)
);

-- ─── Il codice per entrare in una comitiva ────────────────────────────
-- Stesso meccanismo degli inviti: derivato, non memorizzato, e senza
-- caratteri che si confondono quando li detti a voce in un locale.
create or replace function codice_comitiva(p_id uuid) returns text
language sql immutable as $$
  select upper(
    translate(
      substring(encode(digest(p_id::text || 'go-comitiva', 'sha1'), 'hex') from 1 for 6),
      'abcdef', 'HJKMNP'
    )
  )
$$;

create or replace function comitiva_da_codice(p_codice text)
returns table (id uuid, nome text, membri bigint)
language sql stable security definer set search_path = public, extensions as $$
  select c.id, c.nome, (select count(*) from comitive_membri m where m.comitiva = c.id)
    from comitive c
   where codice_comitiva(c.id) = upper(btrim(p_codice))
   limit 1
$$;

-- ─── Il turno ─────────────────────────────────────────────────────────
-- Chi ha guidato quante volte, e chi stasera è disponibile. Una funzione
-- sola perché la domanda è una sola, e perché farla in SQL evita di
-- riportare in memoria tutti i turni di sempre per contarli.
create or replace function turno_comitiva(p_comitiva uuid, p_sera date)
returns table (persona uuid, nome text, foto_url text, volte bigint, disponibile boolean)
language sql stable security definer set search_path = public, extensions as $$
  select p.id, p.nome, p.foto_url,
         (select count(*) from turni t where t.comitiva = m.comitiva and t.guidatore = p.id),
         not exists (select 1 from non_guido n where n.persona = p.id and n.sera = p_sera)
    from comitive_membri m
    join profili p on p.id = m.persona
   where m.comitiva = p_comitiva
   order by 4 asc, p.nome asc
$$;

-- ─── Permessi ─────────────────────────────────────────────────────────
alter table comitive        enable row level security;
alter table comitive_membri enable row level security;
alter table turni           enable row level security;
alter table non_guido       enable row level security;

-- Tutto passa dal server con la chiave di servizio, come il resto
-- dell'applicazione: RLS resta acceso e nessuna politica apre le tabelle
-- al client. È deliberato — l'appartenenza a una comitiva è la cosa che
-- decide chi vede cosa, e quel controllo sta in un posto solo.
grant execute on function codice_comitiva(uuid)        to service_role, authenticated;
grant execute on function comitiva_da_codice(text)     to service_role, authenticated, anon;
grant execute on function turno_comitiva(uuid, date)   to service_role;
