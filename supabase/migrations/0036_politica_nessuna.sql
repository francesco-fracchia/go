-- ═══════════════════════════════════════════════════════════════════════
-- «Non trattengo niente»: la terza politica di disdetta.
--
-- Chi guida poteva già scegliere fra due — fino a un'ora prima, fino a sei
-- ore prima — e il compromesso è scritto accanto a ciascuna: più gente
-- prenota ma può saltare, oppure posto più sicuro e meno prenotazioni.
--
-- Mancava la sola direzione che è SEMPRE lecita: verso il basso. È il
-- gemello dei livelli di rimborso — chi guida può sempre rinunciare a
-- qualcosa, mai pretendere di più. Su una tratta che faresti comunque, o
-- fra amici, è la scelta naturale.
--
-- ⚠️  Rinuncia alla QUOTA DEL CONDUCENTE, non alla quota di servizio:
--     quella non è sua e non può regalarla. Nelle ultime ventiquattro ore
--     resta, come per tutte le altre politiche, e l'interfaccia lo dice con
--     la cifra invece di chiamarlo «niente».
-- ═══════════════════════════════════════════════════════════════════════

alter type politica_cancellazione add value if not exists 'nessuna';
