import type { Tabelle } from './finto.ts'

/**
 * I dati della modalità dimostrativa.
 *
 * Non sono un catalogo: raccontano una serata reale nel lodigiano. Ci sono
 * corse piene e corse vuote, un posto con richieste e nessun conducente, una
 * proposta di deviazione in attesa — perché è negli stati imperfetti che si
 * vede se un'interfaccia funziona, non in quelli pieni.
 */

export const IO = 'demo-io'

const ora = () => Date.now()
const fra = (min: number) => new Date(ora() + min * 60_000).toISOString()

export function datiDemo(): Tabelle {
  return {
    profili: [
      { id: IO, telefono: '+393331234567', telefono_ok: true, email_ok: false,
        nome: 'Francesco', cognome: 'F.', foto_url: '/dimostrazione/francesco.jpg', data_nascita: '1999-04-12',
        creato_il: '2026-06-01T10:00:00Z', dichiarazione_privato: true,
        sospeso: false, limitato: false, push_attive: true, sms_attivi: true,
        stripe_cliente_id: 'cus_demo', metodo_pagamento: 'pm_demo',
        metodo_marchio: 'visa', metodo_ultime4: '4242',
        stripe_pronto: false, chiacchiere: 'dipende', musica: 'volentieri', soste: true },
      { id: 'u-giulia', telefono: '+393330000001', telefono_ok: true, email_ok: true,
        nome: 'Giulia', cognome: 'B.', foto_url: '/dimostrazione/giulia.jpg', data_nascita: '2002-02-20',
        creato_il: '2026-05-10T10:00:00Z', dichiarazione_privato: true,
        sospeso: false, limitato: false, push_attive: true, sms_attivi: true,
        stripe_pronto: true, chiacchiere: 'volentieri', musica: 'volentieri', soste: true },
      { id: 'u-marco', telefono: '+393330000002', telefono_ok: true, email_ok: false,
        nome: 'Marco', cognome: 'R.', foto_url: '/dimostrazione/marco.jpg', data_nascita: '1998-11-03',
        creato_il: '2026-07-02T10:00:00Z', dichiarazione_privato: true,
        sospeso: false, limitato: false, push_attive: true, sms_attivi: true,
        stripe_pronto: false, chiacchiere: 'poco', musica: 'dipende', soste: false },
      { id: 'u-sara', telefono: '+393330000003', telefono_ok: true, email_ok: true,
        nome: 'Sara', cognome: 'M.', foto_url: null, data_nascita: '2000-09-08',
        creato_il: '2026-04-18T10:00:00Z', dichiarazione_privato: true,
        sospeso: false, limitato: false, push_attive: true, sms_attivi: true,
        stripe_pronto: true, chiacchiere: 'dipende', musica: 'poco', soste: true },
      { id: 'u-ilaria', telefono: '+393330000004', telefono_ok: true, email_ok: false,
        nome: 'Ilaria', cognome: 'C.', foto_url: null, data_nascita: '2001-06-30',
        creato_il: '2026-08-01T10:00:00Z', dichiarazione_privato: false,
        sospeso: false, limitato: false, push_attive: true, sms_attivi: true,
        stripe_pronto: false, chiacchiere: 'volentieri', musica: 'volentieri', soste: true },
    ],

    veicoli: [
      { id: 'v-mia', proprietario: IO, marca: 'Volkswagen', modello: 'Polo',
        fascia: 'utilitaria', alimentazione: 'benzina', targa: 'FF123GO',
        colore: 'Grigia', posti_totali: 5, centesimi_per_km: 37.12,
        fumo: false, animali: true, bagagli: 'medi', attivo: true },
      { id: 'v-giulia', proprietario: 'u-giulia', marca: 'Fiat', modello: 'Panda',
        fascia: 'utilitaria', alimentazione: 'benzina', targa: 'GK471RT',
        colore: 'Bianca', posti_totali: 5, centesimi_per_km: 37.12,
        fumo: false, animali: false, bagagli: 'piccoli', attivo: true },
      { id: 'v-marco', proprietario: 'u-marco', marca: 'Volkswagen', modello: 'Golf',
        fascia: 'compatta', alimentazione: 'diesel', targa: 'EX882PL',
        colore: 'Nera', posti_totali: 5, centesimi_per_km: 41.0,
        fumo: true, animali: false, bagagli: 'grandi', attivo: true },
      { id: 'v-sara', proprietario: 'u-sara', marca: 'Toyota', modello: 'Yaris',
        fascia: 'utilitaria', alimentazione: 'ibrida', targa: 'GB204MN',
        colore: 'Rossa', posti_totali: 5, centesimi_per_km: 36.0,
        fumo: false, animali: true, bagagli: 'medi', attivo: true },
    ],

    corse: [
      // Quella che sto guidando io: due a bordo, una proposta in attesa.
      { id: 'c-mia', conducente: IO, veicolo: 'v-mia', stato: 'pubblicata',
        modalita: 'pubblica', ora_partenza: fra(160), ora_arrivo: fra(195),
        origine_label: 'Piazza della Vittoria, Lodi',
        destinazione_label: 'Fabrique, Milano',
        km_base: 40, pedaggio_cent: 0, parcheggio_cent: 0, posti_offerti: 3,
        sconto_cent: 0, politica: 'flessibile', prenota_immediata: false,
        accetta_deviazioni: true, deviazioni_ritiro: true, deviazioni_deposito: false,
        flessibilita_min: 30, orario_fissato: false,
        note: 'Parto puntuale. Musica alta, se non vi piace ditelo pure.',
        corsa_ritorno: 'c-mia-ritorno', token_link: null },
      { id: 'c-mia-ritorno', conducente: IO, veicolo: 'v-mia', stato: 'pubblicata',
        modalita: 'pubblica', ora_partenza: fra(400), ora_arrivo: fra(435),
        origine_label: 'Fabrique, Milano',
        destinazione_label: 'Piazza della Vittoria, Lodi',
        km_base: 40, pedaggio_cent: 0, parcheggio_cent: 0, posti_offerti: 3,
        sconto_cent: 0, politica: 'flessibile', prenota_immediata: false,
        accetta_deviazioni: true, deviazioni_ritiro: true, deviazioni_deposito: true,
        corsa_ritorno: 'c-mia', token_link: null },

      // Quelle che posso prenotare io.
      { id: 'c-giulia', conducente: 'u-giulia', veicolo: 'v-giulia', stato: 'pubblicata',
        modalita: 'pubblica', ora_partenza: fra(150), ora_arrivo: fra(185),
        origine_label: 'Stazione, Lodi', destinazione_label: 'Fabrique, Milano',
        km_base: 40, pedaggio_cent: 0, parcheggio_cent: 0, posti_offerti: 3,
        sconto_cent: 0, politica: 'flessibile', prenota_immediata: true,
        accetta_deviazioni: true, deviazioni_ritiro: true, deviazioni_deposito: true,
        flessibilita_min: 0, orario_fissato: true,
        note: 'Puntuale, se tardate avvisatemi!', token_link: null },
      { id: 'c-marco', conducente: 'u-marco', veicolo: 'v-marco', stato: 'confermata',
        modalita: 'pubblica', ora_partenza: fra(210), ora_arrivo: fra(248),
        origine_label: 'Codogno', destinazione_label: 'Alcatraz, Milano',
        km_base: 58, pedaggio_cent: 320, parcheggio_cent: 0, posti_offerti: 2,
        sconto_cent: 0, politica: 'rigida', prenota_immediata: false,
        accetta_deviazioni: false, deviazioni_ritiro: false, deviazioni_deposito: false,
        token_link: null },
      // Privata, con il link da mandare agli amici.
      { id: 'c-sara', conducente: 'u-sara', veicolo: 'v-sara', stato: 'pubblicata',
        modalita: 'privata', ora_partenza: fra(175), ora_arrivo: fra(212),
        origine_label: 'Sant’Angelo Lodigiano', destinazione_label: 'Bolgia, Osio Sopra',
        km_base: 62, pedaggio_cent: 0, parcheggio_cent: 0, posti_offerti: 3,
        sconto_cent: 0, politica: 'flessibile', prenota_immediata: true,
        accetta_deviazioni: true, deviazioni_ritiro: true, deviazioni_deposito: true,
        token_link: 'aVQ3x8Kd1Pm' },
    ],

    fermate: [
      { id: 'f1', corsa: 'c-mia', ordine: 0, tipo: 'partenza',
        etichetta: 'Piazza della Vittoria, Lodi', km_incrementali: 0, ora_stimata: fra(160),
        geo: { coordinates: [9.5033, 45.3142] } },
      { id: 'f2', corsa: 'c-mia', ordine: 99, tipo: 'destinazione',
        etichetta: 'Fabrique, Milano', km_incrementali: 0, ora_stimata: fra(195),
        geo: { coordinates: [9.2447, 45.4419] } },
      { id: 'f3', corsa: 'c-mia', ordine: 1, tipo: 'ritiro',
        etichetta: 'Via Fanfulla 12, Lodi', km_incrementali: 2.4, ora_stimata: fra(166),
        geo: { coordinates: [9.4998, 45.3168] } },
      { id: 'f4', corsa: 'c-giulia', ordine: 0, tipo: 'partenza',
        etichetta: 'Stazione, Lodi', km_incrementali: 0, ora_stimata: fra(150) },
      { id: 'f5', corsa: 'c-giulia', ordine: 99, tipo: 'destinazione',
        etichetta: 'Fabrique, Milano', km_incrementali: 0, ora_stimata: fra(185) },
    ],

    prenotazioni: [
      // A bordo della mia corsa.
      { id: 'p1', corsa: 'c-mia', passeggero: 'u-marco', stato: 'autorizzata',
        esito: 'atteso', fermata: 'f1', quota_cent: 371, deviazione_cent: 0,
        fee_cent: 74, totale_cent: 445, autorizzato_cent: 519, catturato_cent: null,
        esente: false, creata_il: '2026-08-29T10:00:00Z' },
      { id: 'p2', corsa: 'c-mia', passeggero: 'u-sara', stato: 'autorizzata',
        esito: 'atteso', fermata: 'f1', quota_cent: 371, deviazione_cent: 0,
        fee_cent: 74, totale_cent: 445, autorizzato_cent: 519, catturato_cent: null,
        esente: false, creata_il: '2026-08-29T11:00:00Z' },
      // La proposta in attesa: fuori strada, con un messaggio.
      { id: 'p3', corsa: 'c-mia', passeggero: 'u-ilaria', stato: 'richiesta',
        esito: 'atteso', fermata: 'f3', quota_cent: 371, deviazione_cent: 89,
        fee_cent: 74, totale_cent: 534, autorizzato_cent: 534, catturato_cent: null,
        esente: false, messaggio: 'È sulla strada per il casello, sono pronta 10 minuti prima!',
        scade_il: fra(120), creata_il: '2026-08-30T09:00:00Z' },
      // La mia prenotazione da passeggero, sulla corsa di Giulia.
      { id: 'p4', corsa: 'c-giulia', passeggero: IO, stato: 'autorizzata',
        esito: 'atteso', fermata: 'f4', quota_cent: 371, deviazione_cent: 0,
        fee_cent: 74, totale_cent: 445, autorizzato_cent: 519, catturato_cent: null,
        esente: false, creata_il: '2026-08-30T08:00:00Z' },
    ],

    messaggi: [
      { id: 'm1', corsa: 'c-giulia', autore: 'u-giulia',
        testo: 'Ciao! Parto puntuale dalla stazione, lato biglietteria',
        creato_il: '2026-08-30T08:05:00Z', letto_il: null },
      { id: 'm2', corsa: 'c-giulia', autore: IO,
        testo: 'Perfetto, ci sono', creato_il: '2026-08-30T08:07:00Z', letto_il: null },
    ],

    recensioni: [
      { id: 'r1', prenotazione: 'p0', autore: 'u-marco', destinatario: 'u-giulia',
        positiva: true, tag: ['puntuale', 'guida tranquilla'],
        testo: 'Puntualissima e viaggio tranquillo, la riprenderei.',
        moderazione: 'pubblicata', creata_il: '2026-08-20T10:00:00Z' },
      { id: 'r2', prenotazione: 'p0b', autore: 'u-sara', destinatario: 'u-giulia',
        positiva: true, tag: ['simpatica'], testo: null,
        moderazione: 'pubblicata', creata_il: '2026-08-12T10:00:00Z' },
      { id: 'r3', prenotazione: 'p0c', autore: 'u-ilaria', destinatario: 'u-giulia',
        positiva: true, tag: ['auto pulita'],
        testo: 'Molto gentile, mi ha aspettata cinque minuti.',
        moderazione: 'in_attesa', creata_il: '2026-08-30T07:00:00Z' },
    ],

    serate: [
      { id: 's1', locale: 'Fabrique', citta: 'Milano', inizio: fra(210),
        pubblicata: true, geo: null },
      { id: 's2', locale: 'Alcatraz', citta: 'Milano', inizio: fra(1600),
        pubblicata: true, geo: null },
      { id: 's3', locale: 'Bolgia', citta: 'Osio Sopra', inizio: fra(1660),
        pubblicata: true, geo: null },
    ],

    posti: [
      { id: 'po1', nome: 'Fabrique', categoria: 'discoteca', citta: 'Milano', nascosto: false },
      { id: 'po2', nome: 'Bolgia', categoria: 'discoteca', citta: 'Osio Sopra', nascosto: false },
      { id: 'po3', nome: 'Alcatraz', categoria: 'discoteca', citta: 'Milano', nascosto: false },
      { id: 'po4', nome: 'Piazza della Vittoria', categoria: 'piazza', citta: 'Lodi', nascosto: false },
      { id: 'po5', nome: 'Stazione di Lodi', categoria: 'stazione', citta: 'Lodi', nascosto: false },
      { id: 'po6', nome: 'Malpensa', categoria: 'aeroporto', citta: 'Ferno', nascosto: false },
      { id: 'po7', nome: 'Il Castello', categoria: 'centro_commerciale', citta: 'Lodi', nascosto: false },
      { id: 'po8', nome: 'Cinema Moderno', categoria: 'cinema', citta: 'Lodi', nascosto: false },
    ],

    richieste_passaggio: [
      { id: 'rp1', passeggero: 'u-ilaria', origine_label: 'Casalpusterlengo',
        destinazione_label: 'Bolgia, Osio Sopra', ora_arrivo: fra(1660),
        flessibilita_min: 120, posti: 2, attiva: true },
    ],

    liquidazioni: [
      { id: 'l1', conducente: IO, settimana: '2026-08-17', importo_cent: 2064,
        eseguita_il: '2026-08-18T08:00:00Z' },
      { id: 'l2', conducente: IO, settimana: '2026-08-10', importo_cent: 1032,
        eseguita_il: '2026-08-11T08:00:00Z' },
    ],

    // La vista dei distintivi è calcolata dal database: qui è una tabella,
    // con dentro una storia già vissuta. Senza, ogni conducente comparirebbe
    // al primo viaggio e le schermate direbbero il falso.
    distintivi_conducenti: [
      { conducente: 'u-giulia', corse_totali: 31, concluse: 31, annullate: 0,
        recensioni: 18, positive: 17,
        mai_annullato: true, affidabile: true, conducente_avviato: true, veterano: true },
      { conducente: 'u-sara', corse_totali: 9, concluse: 8, annullate: 1,
        recensioni: 5, positive: 5,
        mai_annullato: false, affidabile: false, conducente_avviato: true, veterano: false },
      { conducente: 'u-marco', corse_totali: 3, concluse: 3, annullate: 0,
        recensioni: 1, positive: 1,
        mai_annullato: false, affidabile: false, conducente_avviato: true, veterano: false },
      { conducente: IO, corse_totali: 6, concluse: 6, annullate: 0,
        recensioni: 4, positive: 4,
        mai_annullato: true, affidabile: false, conducente_avviato: true, veterano: false },
    ],

    consumo_mappe: [{ mese: 'demo', caricamenti: 137 }],

    push_iscrizioni: [], notifiche: [], lavori: [], segnalazioni: [],
    chiamate: [], percorsi_cache: [], luoghi_cache: [], aci_costi: [],
  }
}

/**
 * Le funzioni del database, riscritte in JavaScript.
 *
 * Sono le stesse regole della migrazione, espresse due volte — cosa che di
 * norma è un errore. Qui è il prezzo di poter vedere l'applicazione senza
 * database, e vale la pena solo perché la modalità dimostrativa non tocca
 * mai denaro vero.
 */
export function funzioniDemo(t: Tabelle): Record<string, (a: Record<string, unknown>) => unknown> {
  const vicino = (id: string, tipo: 'corse' | 'richieste') => {
    const posto = (t.posti ?? []).find((p) => p.id === id)
    if (!posto) return 0
    if (tipo === 'corse') {
      return (t.corse ?? []).filter((c) =>
        ['pubblicata', 'confermata'].includes(String(c.stato)) &&
        c.modalita === 'pubblica' &&
        String(c.destinazione_label).includes(String(posto.nome)),
      ).length
    }
    return (t.richieste_passaggio ?? []).filter((r) =>
      r.attiva && String(r.destinazione_label).includes(String(posto.nome)),
    ).length
  }

  return {
    corse_per_serata: (a) => {
      const s = (t.serate ?? []).find((x) => x.id === a.p_serata)
      return s ? (t.corse ?? []).filter((c) =>
        String(c.destinazione_label).includes(String(s.locale)) &&
        ['pubblicata', 'confermata'].includes(String(c.stato)),
      ).length : 0
    },
    corse_verso: (a) => vicino(String(a.p_posto), 'corse'),
    richieste_verso: (a) => vicino(String(a.p_posto), 'richieste'),
    posti_vicini: (a) => {
      const cat = a.p_categoria
      return (t.posti ?? [])
        .filter((p) => !p.nascosto && (!cat || p.categoria === cat))
        .map((p, i) => ({
          id: p.id, nome: p.nome, categoria: p.categoria, citta: p.citta,
          distanza_m: 400 + i * 4200,
          corse: vicino(String(p.id), 'corse'),
          richieste: vicino(String(p.id), 'richieste'),
          lat: 45.31 + i * 0.02, lng: 9.5 + i * 0.03,
        }))
        .sort((x, y) => y.corse - x.corse || y.richieste - x.richieste || x.distanza_m - y.distanza_m)
    },
    cerca_corse: () => {
      // In modalità dimostrativa la ricerca geografica non c'è: si mostrano
      // le corse pubbliche future, che è quello che serve per cliccarci.
      const posti = (c: Record<string, unknown>) =>
        Number(c.posti_offerti) - (t.prenotazioni ?? []).filter((p) =>
          p.corsa === c.id && !['rifiutata', 'scaduta', 'annullata'].includes(String(p.stato)),
        ).length
      return (t.corse ?? [])
        .filter((c) => c.modalita === 'pubblica' &&
          ['pubblicata', 'confermata'].includes(String(c.stato)) &&
          new Date(String(c.ora_partenza)) > new Date())
        .map((c) => {
          const v = (t.veicoli ?? []).find((x) => x.id === c.veicolo)
          const costo = Number(c.km_base) * Number(v?.centesimi_per_km ?? 37) +
            Number(c.pedaggio_cent) + Number(c.parcheggio_cent)
          return {
            corsa_id: c.id, conducente: c.conducente,
            ora_partenza: c.ora_partenza, ora_arrivo: c.ora_arrivo,
            posti_liberi: posti(c),
            quota_cent: Math.floor(costo / (Number(c.posti_offerti) + 1)) - Number(c.sconto_cent),
            scarto_origine_m: 300, scarto_destinazione_m: 120,
            fermata_ritiro: 'f1', km_deviazione_stimati: 0,
            deviazione_ammessa: !!c.deviazioni_ritiro,
            flessibilita_min: Number(c.flessibilita_min ?? 0),
          }
        })
        .filter((c) => c.posti_liberi > 0)
        .sort((a, b) => String(a.ora_arrivo).localeCompare(String(b.ora_arrivo)))
    },
    richieste_compatibili: () => [],
    tocca_percorso: () => null,
    sblocca_maturate: () => 0,
    apri_finestra_esito: () => 0,
    segnala_problema: () => true,
    conferma_imbarco_token: () => 'ok',
    assegna_codici_imbarco: () => 0,
    puo_chiamare: () => true,
    cerca_posti: (a) => {
      const testo = String(a.p_testo ?? '').toLowerCase()
      return (t.posti ?? []).filter((x) =>
        String(x.nome).toLowerCase().includes(testo))
    },
    segna_posizione: () => true,
    dimentica_posizioni: () => 0,
    caricamenti_del_mese: () => (t.consumo_mappe?.[0]?.caricamenti ?? 0),
    conta_caricamento_mappa: () => {
      const riga = (t.consumo_mappe ??= [{ mese: 'demo', caricamenti: 0 }])[0]!
      riga.caricamenti = Number(riga.caricamenti) + 1
      return riga.caricamenti
    },
  }
}
