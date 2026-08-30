-- Collega il veicolo al modello ACI vero, e la ricerca dei modelli.
-- Va DOPO i dati: il trigger legge da aci_modelli.

-- ─── Il veicolo punta al modello vero ───────────────────────────────────
alter table veicoli add column aci_modello uuid references aci_modelli;

/**
 * Il trigger che risolve il costo chilometrico, riscritto.
 *
 * Prima ricavava un valore da una tabella di STIME per fascia. Quelle stime
 * erano sbagliate in entrambe le direzioni: il modello benzina più economico
 * costa 0,2864 €/km contro una stima di 0,3712 per le utilitarie, e su
 * quelle auto il conducente avrebbe incassato più di quanto spende — con
 * tutti e tre i presidi che non se ne accorgevano, perché il tetto era
 * sbagliato in partenza.
 *
 * Ora si legge il modello vero. Se manca, si ripiega sul MINIMO della sua
 * alimentazione: sbagliare al ribasso è un problema commerciale, al rialzo
 * è un problema legale.
 */
create or replace function risolvi_costo_km() returns trigger
language plpgsql security definer set search_path = public as $$
declare v numeric(6,2);
begin
  if new.aci_modello is not null then
    select centesimi_per_km into v from aci_modelli where id = new.aci_modello;
  end if;

  if v is null then
    select min(centesimi_per_km) into v
      from aci_modelli where alimentazione = new.alimentazione;
  end if;

  if v is null then
    select min(centesimi_per_km) into v from aci_modelli;
  end if;

  new.centesimi_per_km := v;
  return new;
end $$;

drop trigger if exists veicoli_costo_km on veicoli;
create trigger veicoli_costo_km
  before insert or update of aci_modello, alimentazione, centesimi_per_km on veicoli
  for each row execute function risolvi_costo_km();

-- Ricerca dei modelli mentre si scrive.
create or replace function cerca_modello_aci(p_testo text, p_limite integer default 8)
returns table (
  id uuid, marca text, modello text,
  alimentazione alimentazione, centesimi_per_km numeric
)
language sql stable as $$
  select m.id, m.marca, m.modello, m.alimentazione, m.centesimi_per_km
    from aci_modelli m
   where (m.marca || ' ' || m.modello) ilike '%' || p_testo || '%'
   order by length(m.marca || ' ' || m.modello)
   limit p_limite;
$$
