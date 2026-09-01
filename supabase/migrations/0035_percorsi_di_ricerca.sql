-- ═══════════════════════════════════════════════════════════════════════
-- Il percorso di ricerca delle funzioni, fissato una volta per tutte.
--
-- È la classe di difetto che è costata mesi al GPS: `segna_posizione` era
-- dichiarata `security definer set search_path = public`, ma su Supabase i
-- tipi PostGIS vivono in `extensions`. Il cast a `geography` non si
-- risolveva e la funzione falliva a ogni chiamata — senza rompere niente
-- di visibile, perché una posizione che non si salva non fa rumore.
--
-- Tre funzioni hanno ancora solo `public`. Nessuna usa PostGIS OGGI,
-- quindi nessuna è rotta adesso: il punto è che la prossima riga che
-- qualcuno ci scriverà dentro potrebbe usarlo, e allora il difetto
-- tornerebbe identico e altrettanto silenzioso.
--
-- Fissarlo costa una migrazione e toglie la possibilità. E `search_path`
-- fissato su una funzione `security definer` non è solo comodità: senza,
-- chi la chiama può cambiare il significato dei nomi che la funzione usa.
-- ═══════════════════════════════════════════════════════════════════════

alter function risolvi_costo_km()          set search_path = public, extensions;
alter function segnala_problema(uuid, uuid, text) set search_path = public, extensions;
alter function viaggio_da_token(text)      set search_path = public, extensions;
