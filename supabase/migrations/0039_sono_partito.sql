-- ═══════════════════════════════════════════════════════════════════════
-- «Sono partito.»
--
-- Prima della partenza tutte le ore sono previsioni. Nel momento in cui
-- chi guida dice di essere uscito, smettono di esserlo: da lì in poi ogni
-- fermata ha un'ora che è una conseguenza, non una stima.
--
-- È la differenza fra «passo da te verso le nove e mezza» e «sono da te
-- fra dodici minuti». Solo la seconda permette a qualcuno di decidere se
-- scendere adesso o fra un po' — cioè di aspettare in casa invece che in
-- strada, di notte, senza sapere quanto manca.
--
-- Si registra sulla fermata e non sulla corsa perché il viaggio ha più
-- partenze: si riparte da casa, e si riparte da ogni persona caricata.
-- ═══════════════════════════════════════════════════════════════════════

alter table fermate add column if not exists passata_il timestamptz;

comment on column fermate.passata_il is
  'Quando chi guida ha confermato di essere ripartito da qui. Finché è '
  'nullo, l''ora stimata è una previsione; da lì in poi è un conto fatto '
  'su un''ora vera.';

create index if not exists fermate_da_passare
  on fermate (corsa) where passata_il is null;
