-- ════════════════════════════════════════════════════════════════════════
-- Incassi di gruppo e deviazioni condivise.
-- ════════════════════════════════════════════════════════════════════════

-- ─── 1. Prenotare insieme, pagare ciascuno per sé ───────────────────────
-- Il gruppo riserva i posti insieme — così nessuno resta a terra da solo e
-- si sale alla stessa fermata — ma OGNUNO PAGA CON LA PROPRIA CARTA.
--
-- Far anticipare i soldi a uno solo, che poi li rincorre, è esattamente il
-- problema che l'applicazione esiste per togliere di mezzo: vale tra
-- sconosciuti e vale anche tra amici. Costa 25 centesimi di Stripe a testa
-- invece che una volta sola, ed è il prezzo della comodità che vendiamo.
alter table prenotazioni add column gruppo uuid;
comment on column prenotazioni.gruppo is
  'prenotazioni riservate insieme sulla stessa corsa. NON un incasso unico: '
  'ogni prenotazione mantiene il proprio PaymentIntent e la propria carta.';
create index prenotazioni_gruppo on prenotazioni (gruppo) where gruppo is not null;

-- Il PaymentIntent resta unico per prenotazione: nessuno paga per altri.
-- (il vincolo di unicità di 0001 non si tocca)

-- Un gruppo non lega mai corse diverse.
create or replace function verifica_gruppo() returns trigger
language plpgsql as $$
begin
  if new.gruppo is null then return new; end if;
  if exists (
    select 1 from prenotazioni
     where gruppo = new.gruppo and id <> new.id and corsa <> new.corsa
  ) then
    raise exception 'un gruppo non può coprire corse diverse'
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

create trigger prenotazioni_gruppo before insert or update of gruppo, corsa
  on prenotazioni for each row execute function verifica_gruppo();

-- ─── 2. Andata e ritorno della STESSA persona, solo tra corse private ───
-- Qui nessuno anticipa per nessun altro: è la stessa persona che paga le
-- proprie due tratte. Ma su una corsa pubblica il pagamento unico fa credere
-- al passeggero di avere il rientro assicurato, mentre il conducente
-- dell'andata può volersene andare prima o il ritorno può essere di un
-- altro: sarebbe la garanzia di rientro che abbiamo deciso di non dare,
-- reintrodotta di nascosto dal modo di pagare.
create or replace function verifica_ritorno_collegato() returns trigger
language plpgsql as $$
declare m_and modalita_corsa; m_rit modalita_corsa;
begin
  if new.corsa_ritorno is null then return new; end if;
  select modalita into m_rit from corse where id = new.corsa_ritorno;
  m_and := new.modalita;
  if (m_and <> 'privata' or m_rit <> 'privata') then
    -- il collegamento resta, ma come suggerimento: non come incasso unico
    new.ritorno_incasso_unico := false;
  end if;
  return new;
end $$;

alter table corse add column ritorno_incasso_unico boolean not null default false;
create trigger corse_ritorno before insert or update of corsa_ritorno, modalita
  on corse for each row execute function verifica_ritorno_collegato();

-- ─── 3. Il trigger di conformità, riscritto ─────────────────────────────
-- Quello originale ricavava i km di deviazione dividendo gli importi per il
-- costo chilometrico: fragile, e soprattutto contava una deviazione per ogni
-- passeggero anziché per ogni fermata. Due persone alla stessa fermata
-- pagavano due volte gli stessi chilometri, e il conducente ne incassava il
-- doppio di quanto gli costavano. Ora si legge dalle fermate, che sono la
-- sorgente di verità dei chilometri.
create or replace function verifica_incasso_conducente() returns trigger
language plpgsql as $$
declare
  costo_base   numeric;
  costo_dev    numeric;
  incassato    numeric;
  c            record;
begin
  select co.km_base, co.pedaggio_cent, co.parcheggio_cent, v.centesimi_per_km
    into c
    from corse co join veicoli v on v.id = co.veicolo
   where co.id = new.corsa;

  costo_base := c.km_base * c.centesimi_per_km + c.pedaggio_cent + c.parcheggio_cent;

  -- I chilometri di deviazione si contano UNA VOLTA PER FERMATA usata,
  -- non una volta per passeggero.
  select coalesce(sum(f.km_incrementali), 0) * c.centesimi_per_km
    into costo_dev
    from fermate f
   where f.corsa = new.corsa
     and f.tipo = 'ritiro'
     and exists (
       select 1 from prenotazioni p
        where p.fermata = f.id
          and p.stato not in ('rifiutata','scaduta','annullata')
          and (p.id <> new.id or new.fermata = f.id)
     );

  select coalesce(sum(p.quota_cent + p.deviazione_cent), 0)
    into incassato
    from prenotazioni p
   where p.corsa = new.corsa
     and p.stato not in ('rifiutata','scaduta','annullata')
     and p.id <> new.id;

  incassato := incassato + new.quota_cent + new.deviazione_cent;

  if incassato >= costo_base + costo_dev then
    raise exception
      'violazione di conformità: il conducente incasserebbe % su un costo di %',
      incassato, costo_base + costo_dev
      using errcode = 'check_violation',
            hint = 'il conducente non può mai rientrare per intero del costo della corsa';
  end if;
  return new;
end $$;
