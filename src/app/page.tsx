import { Telaio } from '../components/Telaio.tsx'
import { Racconto } from '../components/Racconto.tsx'
import { CasaPasseggero, type ProssimoViaggio, type PostoVicino } from '../components/CasaPasseggero.tsx'
import { CasaConducente, type CorsaMia, type ChiCerca, type Cosa } from '../components/CasaConducente.tsx'
import { guscio } from '../server/guscio.ts'
import { db } from '../server/db.ts'
import { statoMappa } from '../server/mappe.ts'
import { centroPer } from '../server/centro.ts'
import { postiVicini } from '../server/posti.ts'
import { luoghiSalvati } from '../server/preferiti.ts'
import { preventivo, type Corsa } from '../lib/pricing.ts'
import { quando } from '../lib/tempo.ts'
import type { LuogoScelto } from '../components/CampoLuogo.tsx'

export const dynamic = 'force-dynamic'

/**
 * L'indirizzo principale, tre schermate.
 *
 * Non è un se-allora nascosto in un componente: è la scelta strutturale del
 * prodotto. Chi non è entrato deve capire cos'è GO; chi cerca un posto deve
 * poterlo cercare; chi ne offre uno deve vedere come vanno le sue corse.
 * Tre bisogni diversi, e mandarli tutti sullo stesso modulo di ricerca
 * significa servirne bene al massimo uno.
 *
 * Lo stesso indirizzo, invece di tre, perché la modalità è uno stato del
 * prodotto e non un posto dove si va: chi la cambia si aspetta di restare
 * dov'è e vedere l'altra faccia, non di essere spostato altrove.
 */
export default async function Home({ searchParams }: {
  searchParams: Promise<{ dlat?: string; dlng?: string; dove?: string }>
}) {
  const g = await guscio()

  if (!g.utente) {
    return <Telaio vetrina {...g}><Racconto /></Telaio>
  }

  return g.modo === 'conducente'
    ? <Telaio attiva="/" {...g}>{await guidatore(g.utente)}</Telaio>
    : <Telaio attiva="/" {...g}>{await passeggero(g.utente, await searchParams)}</Telaio>
}

/* ── Chi cerca un posto ─────────────────────────────────────────────── */

async function passeggero(utente: string, q: { dlat?: string; dlng?: string; dove?: string }) {
  const [{ attiva: mappa }, vicino, salvati, nome] = await Promise.all([
    statoMappa().catch(() => ({ attiva: false })),
    centroPer(utente),
    luoghiSalvati(utente).catch(() => []),
    nomeDi(utente),
  ])

  // La partenza si compila da sola quando sappiamo dove abita: chi fa la
  // stessa tratta ogni giorno non deve riscriverla ogni giorno.
  const casaSalvata = salvati.find((l) => l.tipo === 'casa')
  const casa: LuogoScelto | undefined = casaSalvata
    ? { etichetta: casaSalvata.indirizzo, lat: casaSalvata.lat, lng: casaSalvata.lng, fonte: 'salvato' }
    : undefined

  const [prossimo, posti] = await Promise.all([
    prossimaPrenotazione(utente),
    postiVicini({ ...vicino, raggioM: 40_000, limite: 10 }).catch(() => []),
  ])

  return (
    <CasaPasseggero
      nome={nome} casa={casa} mappa={mappa} vicino={vicino}
      prossimo={prossimo}
      posti={posti.map((p): PostoVicino => ({
        id: p.id, nome: p.nome, citta: p.citta ?? null, categoria: p.categoria,
        distanzaKm: p.distanzaM / 1000, lat: p.lat, lng: p.lng,
      }))}
    />
  )
}

async function prossimaPrenotazione(utente: string): Promise<ProssimoViaggio | null> {
  const { data } = await db
    .from('prenotazioni')
    .select(`id, stato, totale_cent, catturato_cent,
             corse!inner(ora_partenza, origine_label, destinazione_label)`)
    .eq('passeggero', utente)
    .not('stato', 'in', '("rifiutata","scaduta","annullata")')
    .gt('corse.ora_partenza', new Date(Date.now() - 3 * 3600_000).toISOString())
    .order('creata_il', { ascending: false })
    .limit(6)

  const righe = (data ?? [])
    .map((p) => ({ p, c: p.corse as unknown as RigaCorsa }))
    .sort((a, b) => new Date(a.c.ora_partenza).getTime() - new Date(b.c.ora_partenza).getTime())

  const primo = righe[0]
  if (!primo) return null

  return {
    id: primo.p.id,
    quando: quando(primo.c.ora_partenza),
    dove: primo.c.destinazione_label,
    da: primo.c.origine_label,
    importoCent: primo.p.catturato_cent ?? primo.p.totale_cent,
    daFare: primo.p.stato === 'richiesta' ? 'In attesa che chi guida risponda' : undefined,
  }
}

/* ── Chi offre un posto ─────────────────────────────────────────────── */

async function guidatore(utente: string) {
  const [profilo, { data: veicoli }, { data: mie }, { data: cercano }] = await Promise.all([
    profiloDi(utente),
    db.from('veicoli').select('id').eq('proprietario', utente).eq('attivo', true).limit(1),
    db.from('corse')
      .select(`id, stato, ora_partenza, origine_label, destinazione_label, km_base,
               pedaggio_cent, parcheggio_cent, posti_offerti, sconto_cent, modalita,
               veicoli(centesimi_per_km), prenotazioni(id, stato)`)
      .eq('conducente', utente)
      .in('stato', ['pubblicata', 'confermata', 'in_corso'])
      .gt('ora_partenza', new Date(Date.now() - 3 * 3600_000).toISOString())
      .order('ora_partenza', { ascending: true })
      .limit(8),
    // Chi sta cercando: la tabella esiste, ed è la ragione per cui uno
    // pubblica invece di partire da solo.
    db.from('richieste_passaggio')
      .select('id, origine_label, destinazione_label, ora_arrivo, posti, flessibilita_min')
      .eq('attiva', true)
      .gt('ora_arrivo', new Date().toISOString())
      .order('ora_arrivo', { ascending: true })
      .limit(8),
  ])

  const adesso = Date.now()
  const corse: CorsaMia[] = (mie ?? []).map((c) => {
    const attive = ((c.prenotazioni ?? []) as unknown as Array<{ stato: string }>)
      .filter((x) => !['rifiutata', 'scaduta', 'annullata'].includes(x.stato))
    const richieste = attive.filter((x) => x.stato === 'richiesta').length
    const aBordo = attive.filter((x) => x.stato !== 'richiesta')
    const minuti = (new Date(c.ora_partenza).getTime() - adesso) / 60_000

    return {
      id: c.id,
      quando: quando(c.ora_partenza),
      origine: c.origine_label,
      destinazione: c.destinazione_label,
      postiOfferti: c.posti_offerti,
      postiPresi: aBordo.length,
      richieste,
      rientroCent: rientro(c, aBordo.length),
      stato: c.stato,
      daFare: richieste > 0
        ? `${richieste} ${richieste === 1 ? 'richiesta' : 'richieste'} da guardare`
        : c.stato === 'pubblicata' && minuti <= 180 && minuti > 0 && aBordo.length > 0
          ? 'Conferma che parti'
          : undefined,
    }
  })

  const chiCercano: ChiCerca[] = (cercano ?? []).map((r) => ({
    id: r.id,
    quando: quando(r.ora_arrivo),
    origine: r.origine_label,
    destinazione: r.destinazione_label,
    posti: r.posti,
    flessibilitaMin: r.flessibilita_min,
  }))

  const cose: Cosa[] = [
    {
      fatta: (veicoli ?? []).length > 0,
      titolo: 'La tua auto',
      testo: 'Serve per calcolare quanto costa un chilometro, e quindi la quota di chi sale.',
      dove: '/veicoli/nuovo', azione: 'Aggiungi',
    },
    {
      fatta: !!profilo?.telefono,
      titolo: 'Un numero di telefono',
      testo: 'Chi sale deve poterti chiamare. Il tuo numero non lo vede nessuno: la telefonata passa da un numero di appoggio.',
      dove: '/impostazioni', azione: 'Aggiungi',
    },
    {
      fatta: profilo?.stripe_pronto === true,
      titolo: 'Un conto dove ricevere',
      testo: profilo?.stripe_account_id
        ? 'Hai cominciato e non hai finito: finché Stripe non verifica l’identità, gli accrediti restano fermi.'
        : 'Puoi pubblicare anche senza, ma quello che incassi resta fermo finché non lo colleghi.',
      dove: '/conto', azione: 'Collega',
    },
  ]

  return (
    <CasaConducente nome={profilo?.nome ?? undefined} corse={corse} chiCercano={chiCercano}
      haVeicolo={(veicoli ?? []).length > 0} cose={cose} />
  )
}

/**
 * Quanto rientra al conducente con le persone che ha già a bordo.
 *
 * Nullo quando non c'è ancora un numero: uno «0,00 €» si legge come
 * «gratis» o come un errore, e nessuna delle due cose è vera.
 */
function rientro(c: RigaMia, aBordo: number): number | null {
  if (aBordo === 0) return null
  const km = Number(c.km_base)
  const cKm = Number((c.veicoli as unknown as { centesimi_per_km: number } | null)?.centesimi_per_km ?? 0)
  if (!(km > 0) || !(cKm > 0)) return null
  const corsa: Corsa = {
    modalita: c.modalita, kmBase: km, centesimiPerKm: cKm,
    pedaggio: c.pedaggio_cent, parcheggio: c.parcheggio_cent,
    postiOfferti: c.posti_offerti, scontoConducente: c.sconto_cent,
  }
  try {
    return preventivo(corsa, Array.from({ length: aBordo }, (_, i) => ({
      id: `p${i}`, kmDeviazione: 0,
    }))).nettoConducente
  } catch { return null }
}

async function nomeDi(utente: string): Promise<string | undefined> {
  try {
    const { data } = await db.from('profili').select('nome').eq('id', utente).maybeSingle()
    return data?.nome || undefined
  } catch { return undefined }
}

interface RigaProfilo {
  nome: string | null; telefono: string | null
  stripe_pronto: boolean | null; stripe_account_id: string | null
}

/** Il profilo di chi guida: nome, e le tre cose che servono per incassare. */
async function profiloDi(utente: string): Promise<RigaProfilo | null> {
  try {
    const { data } = await db
      .from('profili').select('nome, telefono, stripe_pronto, stripe_account_id')
      .eq('id', utente).maybeSingle()
    return (data as RigaProfilo | null) ?? null
  } catch { return null }
}

interface RigaCorsa {
  ora_partenza: string; origine_label: string; destinazione_label: string
}
interface RigaMia {
  km_base: number | string; modalita: 'pubblica' | 'link' | 'privata'
  pedaggio_cent: number; parcheggio_cent: number
  posti_offerti: number; sconto_cent: number; veicoli: unknown
}
