-- ═══════════════════════════════════════════════════════════════════════
-- Aeroporti, non prati con la manica a vento.
--
-- `aeroway=aerodrome` in OpenStreetMap comprende gli scali di linea e le
-- aviosuperfici in mezzo ai campi. Filtrando per «Aeroporti» uscivano otto
-- risultati e nessuno era un aeroporto: aviosuperficie di Dovera, campo
-- volo di Castel Caladan, scuola volo Caravaggio.
--
-- Chi cerca un passaggio per l'aeroporto pensa a Malpensa e a Orio. Vedersi
-- proporre un prato con una manica a vento non è un dettaglio: fa
-- concludere che l'elenco sia preso a caso, e da lì in poi non ci si fida
-- più nemmeno delle categorie giuste.
--
-- Il codice IATA è il segno che distingue le due cose, ed è quello che
-- l'importazione chiede da adesso. Qui si nascondono quelli già entrati:
-- non si cancellano, perché un posto nascosto si può riportare a galla se
-- un giorno servisse, e una riga cancellata no.
-- ═══════════════════════════════════════════════════════════════════════

update posti
   set nascosto = true
 where categoria = 'aeroporto'
   and (
     nome ilike '%aviosuperficie%' or nome ilike '%campo volo%'
     or nome ilike '%scuola volo%' or nome ilike '%punto volo%'
     or nome ilike '%aeroclub%' or nome ilike '%elisuperficie%'
   );
