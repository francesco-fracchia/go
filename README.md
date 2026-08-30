# GO — *Se vai comunque, vai insieme.*

Piattaforma di carpooling per tratte notturne e locali.

## Cosa c'è finora

```
src/lib/money.ts        denaro in centesimi interi, mai float
src/lib/aci.ts          costi chilometrici ACI per fascia e alimentazione
src/lib/pricing.ts      motore dei prezzi — le sei invarianti di conformità
src/lib/pricing.test.ts le invarianti come test (36, tutti verdi)
src/server/db.ts        client con service key — mai importare dal browser
src/server/stripe.ts    autorizzazione, cattura, liquidazione
src/server/percorsi.ts  routing e cache dei percorsi
src/server/corse.ts     pubblicazione
src/server/prenotazioni.ts  l'unica via di scrittura sulle prenotazioni
src/server/cattura.ts   chiusura del prezzo alla partenza
src/server/ricerca.ts   ricerca per sotto-tratte
src/server/notifiche.ts push gratis, SMS solo dove serve
src/server/rimatch.ts   quando un conducente non si presenta
src/server/lavori.ts    i lavori schedulati
src/server/viaggio.ts   chiusura della corsa e sblocco automatico
src/server/luoghi.ts    indirizzo → coordinate, con cache
src/server/annullamenti.ts  disdette, penali, conferme
src/server/pagamento.ts     carta salvata una volta e riusata
src/middleware.ts       chi può vedere cosa
src/server/liquidazioni.ts  contestazioni e bonifici settimanali
src/server/auth.ts      identità dell'utente della richiesta
src/app/api/            le rotte
src/components/         le schermate, senza database dentro
scripts/genera-icone.py le icone PNG, disegnate senza dipendenze
public/sw.js            service worker: solo notifiche, nessuna cache
supabase/migrations/    schema, RLS, trigger di conformità
  0001_init.sql         entità, RLS, trigger ACI e trigger sull'incasso
  0002_aci_2026.sql     tabella dei costi chilometrici
  0003_fiducia_*.sql    approvazione, distintivi, soglie di sistematicità
  0004_gruppi_*.sql     prenotazioni di gruppo, deviazioni per fermata
  0005_ricerca.sql      percorso come geometria, ricerca per sotto-tratte
  0006_percorsi.sql     cache dei percorsi
  0007_notifiche.sql    push, SMS, lavori, richieste di passaggio
  0008_esito_viaggio.sql  sblocco automatico, segnalazioni, maturato

## Le pagine

```
/                    ricerca + serate + «ci vai in macchina?»
/entra               numero e codice SMS
/cerca               risultati per sotto-tratte
/corsa/[id]          una corsa, due facce: chi guida e chi cerca
/prenotazione/[id]   dopo la prenotazione, fino a dopo l'arrivo
/pubblica            tre passi, con la dichiarazione di privato in fondo
/veicoli/nuovo       marca, modello, alimentazione → tabella ACI
/chat/[id]           una conversazione per corsa
/viaggi              i tuoi viaggi, con quello che devi fare in cima
/invito/[token]      apre una corsa privata condivisa via link
/posti               dove si va: discoteche, cinema, stazioni, piazze
/serate              serate e importazione dei posti (solo moderatori)
/cerco               «cerco un passaggio»
/profilo/[id]        chi sei, per rispondere a «salgo con questa persona?»
/impostazioni        notifiche, carta, aspetto
/conto               maturato, bonifici, onboarding Stripe
/recensione/[id]     bene o male, testo facoltativo
/moderazione         la coda, dietro un elenco di identificativi
/legale/contatto     punto di contatto unico — obbligo DSA
/legale/termini      bozza da rivedere con l'avvocato
/legale/privacy      bozza da rivedere con l'avvocato
```

## Telefono e scrivania

La colonna resta stretta anche sul desktop: un elenco di passaggi largo 1200
pixel si legge peggio, non meglio — l'occhio deve attraversare mezzo schermo
per collegare l'orario al prezzo. Quello che cambia è il **contorno**: barra
di navigazione in cima invece che in fondo, e la colonna appoggiata su uno
sfondo invece che sospesa nel bianco.

Le sole schermate che diventano davvero larghe sono quelle a **elenco**
(`Telaio larga`), dove più colonne fanno vedere più opzioni insieme. Lo fanno
ridefinendo `--colonna`, non sovrascrivendo la larghezza: le schermate la
leggono da uno stile in linea, che batterebbe qualunque classe.

## Le piastrelle della mappa

MapLibre carica le immagini con `crossOrigin`, quindi servono le intestazioni
CORS — e **fra i fornitori gratuiti senza chiave non ne resta nessuno che le
mandi**: OpenStreetMap ed Esri rifiutano le richieste dal browser, CARTO
risponde ma stampa «API KEY REQUIRED» sopra la mappa.

Senza configurazione si usa CARTO senza chiave: la mappa si vede, con la
scritta addosso. Serve a capire che manca la configurazione, non a restare
così.

**Prima di andare online** basta una chiave gratuita — MapTiler dà centomila
caricamenti al mese — in `NEXT_PUBLIC_TILES_URL`:

```
NEXT_PUBLIC_TILES_URL=https://api.maptiler.com/maps/dataviz-light/{z}/{x}/{y}.png?key=LA_TUA_CHIAVE
NEXT_PUBLIC_TILES_ATTRIBUZIONE=© MapTiler © contributori OpenStreetMap
```

## I posti

I candidati vengono da **OpenStreetMap via Overpass**: stessi dati delle
mappe e dei percorsi, gratis, senza chiave. Si importano una volta per
provincia da `/serate` — Overpass è un servizio comunitario e non va
interrogato a ogni ricerca.

OSM però non sa quanto un posto sia frequentato, e non fingiamo di saperlo:
l'ordine è per **quante corse ci vanno su GO**, poi per quante persone lo
stanno cercando, poi per distanza. Al lancio quei numeri sono zero ovunque,
ed è il punto — un posto dove qualcuno cerca e nessuno va è l'informazione
più utile che possiamo dare a un conducente.

Attribuzione ODbL mostrata in fondo alla schermata.

## Provarla adesso, senza chiavi

```bash
npm run demo
```

L'applicazione gira **per intero** — pagine vere, navigazione vera, motore
dei prezzi vero — su un database in memoria. Si è già dentro come Francesco,
con due corse da guidare, una prenotata, una proposta di deviazione in
attesa e una corsa privata con il link da mandare.

I dati si azzerano a ogni riavvio: è una dimostrazione, non un ambiente.
L'unico punto dove la modalità dimostrativa mente è Stripe, ed è quello dove
deve — non si tocca denaro e non si chiama la rete.

## Anteprima (galleria dei componenti)

`/anteprima` mostra tutte le schermate affiancate, con la barra dei temi.
Serve a confrontarle fra loro — non è l'applicazione: per quella c'è
`npm run demo`.
```

## Come si verifica

```bash
npm test          # le 24 invarianti
npm run typecheck
```

## Perché le prenotazioni passano tutte dal server

Le RLS non espongono agli utenti né insert né update su `prenotazioni`.
Non è pignoleria: il motore dei prezzi gira lato server, e un client capace
di inserire importi propri renderebbe decorativo tutto il resto.

## La ricerca cerca sotto-tratte

Chi cerca Milano → Melegnano deve vedere anche la Treviso → Melegnano che
passa da Milano. Per questo `corse.percorso` conserva la polilinea: serve a
sapere se un punto sta lungo la strada, **in che ordine** due punti si
incontrano (`ST_LineLocatePoint` — senza, una corsa Melegnano → Milano
risponderebbe a chi cerca il contrario) e a stimare la deviazione.

Cercare per capolinea perde gran parte dell'offerta che si ha già: è il primo
modo in cui un mercato giovane sembra vuoto senza esserlo.

## Push gratis, SMS solo dove serve

Il push costa zero, l'SMS circa sette centesimi. Su un netto di due euro a
corsa, tre SMS per corsa azzerano il margine: la regola non è di stile, è di
conto economico. Push per tutto; SMS **solo** quando una notifica non letta
rovina la serata di qualcuno — conducente che non conferma, rimatch, corsa
annullata, «sono qui». Sono i momenti in cui il telefono è in tasca, la
musica è alta e nessuno guarda le notifiche.

`costoSmsPeriodo()` esiste per verificare che la regola tenga davvero.

## Il rimatch

Quando un conducente non conferma a T−60min, per ogni passeggero: si libera
la carta **prima di tutto il resto**, si cerca in una finestra larga (−90 /
+120 minuti, raggio 6 km — chi è a piedi accetta volentieri di arrivare
un'ora dopo), e se non c'è nulla si registra una richiesta di passaggio così
che il primo conducente che pubblica lo faccia sapere.

Un'ora è il minimo per trovare un'alternativa e arrivarci. Aspettare fino
alla partenza per dare al conducente un'altra possibilità significa lasciare
i passeggeri a piedi senza rimedio.

## Lo sblocco del pagamento: nessun gesto

Il pagamento matura **da solo, 24 ore dopo l'arrivo**. Nel caso normale non
fa niente nessuno.

Eravamo partiti dalla strada opposta — un codice che il conducente doveva
farsi mostrare da ciascun passeggero — ed era sbagliata: con tre persone a
bordo sono tre gesti, di notte, mentre si parte. Faceva pagare la frizione a
ogni corsa riuscita per proteggere dal caso raro.

Il caso raro è coperto altrove, e meglio:

- il conducente che non conferma a T−60min fa scattare **rimatch e rimborso
  prima della corsa**, quindi non arriva neppure qui;
- dopo l'arrivo il passeggero riceve **una domanda sola**, formulata perché
  rispondere non sia necessario: «non devi fare niente». Il silenzio vale
  conferma;
- una segnalazione ferma lo sblocco e apre una contestazione.

La fatica sta sul caso sbagliato, che è raro, invece che su ogni caso giusto.

## Quote personalizzate, e perché non ci sono mance

Su una corsa **privata** il gruppo può dividersi le spese come vuole: chi
scende a metà strada paga meno, chi ha insistito per la deviazione paga di
più, chi questo mese è a secco non paga. `verificaRipartizione` impone
l'unica regola che conta: **si ridistribuisce, non si aggiunge.** La somma
non può superare `tettoComplessivo`, che è la quota equa moltiplicata per i
posti — quello che resta fuori è la parte del conducente, e la paga sempre.

**Le mance non esistono, e non è una dimenticanza.** Una mancia è denaro al
conducente *oltre* il costo del viaggio: è profitto per definizione. Il
profitto è il primo dei tre elementi del test giurisprudenziale, ed è
l'unico che abbiamo eliminato per costruzione — tutto il resto poggia su
quello. Chi volesse dare di più a chi guida ha già la strada giusta: prendersi
una fetta più grande del costo vero.

C'è un test che esiste solo per fermare chi, un giorno, proverà ad
aggiungerle.

## La flessibilità dell'orario

Non è una preferenza della persona: è **una proprietà del viaggio**. La stessa
persona parte alle 8 spaccate il martedì e «verso le undici» il sabato.
Chiederglielo ogni volta significa farle rispondere sempre la stessa cosa, e
sbagliare quando la tratta cambia.

Quindi `proponi()` propone il valore giusto guardando **dove si va e quando**
— la categoria del posto ce l'abbiamo già — e chi vuole lo cambia:

| destinazione | proposta | perché |
|---|---|---|
| stazione, aeroporto | **ora esatta** | un treno non aspetta, nemmeno di sabato sera |
| cinema, stadio | ± 10 | comincia a un'ora precisa |
| discoteca, bar | ± 30 | mezz'ora prima o dopo non cambia la serata |
| niente, mattina feriale | **ora esatta** | la mattina si arriva all'ora giusta |
| niente, notte | ± 30 | di notte mezz'ora non cambia niente |

Due cose che la flessibilità **non** fa:

- **non rende vaga la partenza.** Serve a farsi *trovare*. Se l'orario
  restasse elastico fino all'ultimo, l'incertezza la pagherebbe il
  passeggero, in piedi a un angolo di notte.
- **non resta aperta.** Alla prima prenotazione l'orario si fissa, e lo fa un
  trigger del database: non è una regola da ricordarsi di applicare.

## Le sei invarianti

Non sono linee guida: sono test che rompono la build.

1. il conducente non incassa mai più di quanto la corsa gli costa
2. può abbassare la quota, mai alzarla
3. le esenzioni le assorbe chi le concede, mai gli altri passeggeri
4. si rimborsano chilometri e spese vive — mai il tempo
5. le deviazioni restano entro il 20 % (25 % al ritorno) e le paga chi le chiede
6. nessuna variabile di domanda entra nella formula

L'invariante 1 è verificata anche a runtime (`preventivo` solleva
`ViolazioneConformita`) **e** dal database (trigger `prenotazioni_conformita`).
Tre livelli, perché è l'unica che, se salta, cambia la natura giuridica
dell'attività.

## Il vincolo ACI

`veicoli.centesimi_per_km` è sovrascritto da un trigger `BEFORE INSERT OR
UPDATE` che lo risolve dalla tabella `aci_costi`. Qualunque valore mandi il
client viene ignorato. Se la coppia fascia/alimentazione non è a tabella si
ripiega **al valore più basso** disponibile: sbagliare al ribasso è un
problema commerciale, al rialzo è un problema legale.

## La commissione di incasso

Stripe trattiene 0,25 € + 1,5 % su **ogni** incasso, comprese le somme che
transitano verso il conducente e che non sono nostre. Si ripartisce pro
quota su quello che ciascuno riceve, con l'arrotondamento a carico del
conducente. Sul caso di riferimento: 0,81 € al conducente, 0,15 € a noi.

I 25 centesimi sono **per incasso, non per euro** — e li paghiamo comunque,
uno per passeggero. Prenotare insieme non è pagare insieme: nel gruppo i
posti si riservano insieme, ma **ognuno paga con la propria carta**. Far
anticipare i soldi a uno solo, che poi li rincorre, è precisamente il
problema che l'applicazione esiste per togliere di mezzo — tra sconosciuti
come tra amici. Quei 25 centesimi a testa sono il prezzo della comodità che
vendiamo.

Andata e ritorno insieme — stessa persona, proprie due tratte — **solo su
corse private**. Su una corsa
pubblica il pagamento unico fa credere al passeggero di avere il rientro
assicurato, mentre il conducente dell'andata può volersene andare prima o il
ritorno può essere di un altro: sarebbe la garanzia di rientro che abbiamo
scelto di non dare, reintrodotta di nascosto dal modo di pagare.
`autorizzazioneAndataRitorno` solleva `ViolazioneConformita` se una delle
due corse è pubblica.

## Le deviazioni appartengono alla fermata

Se il conducente devia 5 km per prendere due persone, i chilometri in più
sono cinque, non dieci. Chi condivide la fermata condivide la deviazione: la
si ripartisce fra loro, con l'arrotondamento per difetto a carico del
conducente. Contarla per passeggero anziché per fermata lo avrebbe mandato
in guadagno sulle deviazioni condivise.

## Sistematicità: si osserva, non si blocca

Il test giurisprudenziale è lucro + sistematicità + organizzazione, e **il
lucro è escluso per costruzione**: il motore garantisce che il conducente non
rientri mai del costo, su ogni singola corsa. Senza lucro, la frequenza da
sola non configura un'attività di trasporto — e chi fa la stessa tratta ogni
giorno per lavoro è l'utente migliore che possiamo avere.

Resta un segnale diverso e più specifico: **la stessa tratta, alla stessa
ora, con le stesse persone, ripetuta molte volte.** Non è «viaggiare tanto»:
è somigliare a un servizio di linea, che ha regole proprie. La vista
`ripetitivita_conducenti` lo misura e non impedisce niente — fa comparire un
nome in un elenco che una persona guarda.

Un account si sospende caso per caso con `profili.limitato`, su un giudizio,
mai su un contatore.

## Variabili d'ambiente

```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY   solo lato server
STRIPE_SECRET_KEY
ORS_API_KEY                 OpenRouteService
NEXT_PUBLIC_TILES_URL       piastrelle della mappa — vedi sotto
NEXT_PUBLIC_TILES_ATTRIBUZIONE
VAPID_PUBLIC_KEY            web push
VAPID_PRIVATE_KEY
CONTATTO_EMAIL              anche il punto di contatto unico DSA
TWILIO_SID
TWILIO_TOKEN
TWILIO_MITTENTE
SUPABASE_ANON_KEY           per leggere la sessione
CRON_SECRET                 protegge /api/cron
```

Le chiavi VAPID si generano con `npx web-push generate-vapid-keys`.

## Cosa manca ancora

Sotto, in ordine di quanto bloccano.

**Bloccano il lancio**
- [ ] un progetto Supabase con le migrazioni applicate
- [ ] account Stripe, webhook registrato, chiavi
- [ ] chiave OpenRouteService, numero Twilio, chiavi VAPID
- [ ] dominio e primo dispiegamento

**Servono prima del primo utente vero**
- [ ] sostituire le 29 voci ACI stimate con i dati ufficiali
- [ ] importare i posti della zona e inserire le prime serate da `/serate`

**Si possono fare dopo**
- [ ] test di integrazione (oggi ci sono solo quelli del motore prezzi)
- [ ] limitazione delle chiamate sulle rotte pubbliche
- [ ] monitoraggio degli errori
- [ ] passata di accessibilità

## Prima della produzione

- [ ] sostituire le voci `verificato = false` in `aci_costi` con i dati ACI reali
- [ ] parere legale sulla qualificazione dell'attività
- [ ] parere del commercialista sull'art. 15 DPR 633/72
- [ ] informativa privacy e DPA con Supabase e Stripe
- [ ] punto di contatto unico pubblicato (adempimento base DSA)
- [ ] confermare le soglie di `soglie_sistematicita`
- [ ] sostituire il fattore CO₂ con il dato ISPRA dell'anno
