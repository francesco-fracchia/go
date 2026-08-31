-- ═══════════════════════════════════════════════════════════════════════
-- Cercare la propria auto come la si nomina.
--
-- La ricerca chiedeva che le parole fossero attaccate, nell'ordine esatto
-- della tabella: «golf tdi» non trovava «VOLKSWAGEN GOLF 1.6 TDI 115CV»
-- perché in mezzo c'è la cilindrata. Ma nessuno chiama la propria auto
-- leggendo la riga dell'ACI: la chiama «golf tdi», «panda gpl», «stonic
-- 1.0».
--
-- Non trovarla non è un fastidio di ricerca. Chi non trova il proprio
-- modello prosegue senza, e senza modello il costo al chilometro ripiega
-- sul minimo della tabella — che sottostima sempre. Una ricerca che non
-- trova costa soldi a chi guida.
--
-- Adesso ogni parola deve comparire, in qualunque ordine, e vince chi ha il
-- nome più corto: fra dieci allestimenti della stessa auto, il più generico
-- è quello che chi cerca riconosce.
--
-- Nel testo cercabile entra anche l'alimentazione, che nella tabella è una
-- colonna a parte: «tucson diesel» è come la gente nomina la propria auto,
-- e non trovarla la manda sul ripiego.
-- ═══════════════════════════════════════════════════════════════════════

create or replace function cerca_modello_aci(p_testo text, p_limite integer default 8)
returns table (
  id uuid, marca text, modello text,
  alimentazione alimentazione, centesimi_per_km numeric
)
language sql stable as $$
  select m.id, m.marca, m.modello, m.alimentazione, m.centesimi_per_km
    from aci_modelli m
   where (
     select bool_and((m.marca || ' ' || m.modello || ' ' || m.alimentazione::text) ilike '%' || parola || '%')
       from unnest(
              string_to_array(regexp_replace(btrim(p_testo), '\s+', ' ', 'g'), ' ')
            ) as parola
     )
   order by length(m.marca || ' ' || m.modello), m.marca, m.modello
   limit p_limite;
$$;

grant execute on function cerca_modello_aci(text, integer) to service_role, authenticated;
