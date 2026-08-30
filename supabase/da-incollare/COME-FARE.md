# Come installare il database

Sei file, in ordine. Ognuno si copia con un comando e si incolla in una
pagina web. Non serve altro.

## Dove incollare

Nel progetto Supabase, menu di sinistra → **SQL Editor** → **New query**.
È una casella di testo grande. Si incolla dentro e si preme **Run**
(o Cmd+Invio).

Deve comparire **Success**. Se compare un errore, fermati: non passare al
file dopo. Il primo errore è quello vero, gli altri sono conseguenze.

## I sei passi

Per ciascuno: incolla il comando nel Terminale, poi vai su Supabase e fai
Cmd+V dentro la casella, poi Run.

```bash
cd "/Users/francescofracchia/Desktop/Personale/FF TRANS/go"

pbcopy < supabase/da-incollare/1-struttura.sql       # ← poi incolla e Run
pbcopy < supabase/da-incollare/2-modelli-auto.sql    # ← poi incolla e Run
pbcopy < supabase/da-incollare/3-modelli-auto.sql    # ← poi incolla e Run
pbcopy < supabase/da-incollare/4-modelli-auto.sql    # ← poi incolla e Run
pbcopy < supabase/da-incollare/5-modelli-auto.sql    # ← poi incolla e Run
pbcopy < supabase/da-incollare/6-modelli-auto.sql    # ← poi incolla e Run
```

`pbcopy` copia il file negli appunti. Non stampa niente: se non dice
niente, ha funzionato.

## Come sapere che è andata

Nella stessa casella, incolla questo e premi Run:

```sql
select count(*) as modelli from aci_modelli;
```

Deve rispondere **4629**.

Poi questo, che è la prova che serve davvero:

```sql
select marca, modello, centesimi_per_km
  from aci_modelli
 where modello ilike '%STONIC 1.0 T-GDI 120%';
```

Deve rispondere **KIA · STONIC 1.0 T-GDI 120CV · 40.48**.

Se tornano entrambi, il database è a posto.
