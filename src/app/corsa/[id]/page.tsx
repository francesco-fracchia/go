import { notFound } from 'next/navigation'
import { db } from '../../../server/db.ts'
import { utenteCorrente } from '../../../server/auth.ts'
import { distintivi } from '../../../server/profili.ts'
import { metodoAttuale } from '../../../server/pagamento.ts'
import { Dettaglio, type DatiCorsa } from '../../../components/Dettaglio.tsx'
import { CorsaConducente, type DatiCorsaConducente } from '../../../components/CorsaConducente.tsx'
import {
  preventivo, quotaApplicata, feePasseggero, costoBase, tettoComplessivo, type Corsa,
} from '../../../lib/pricing.ts'

export const dynamic = 'force-dynamic'

/**
 * Una corsa ha due facce, non due indirizzi.
 *
 * Chi guida e chi cerca un passaggio guardano la stessa cosa con due
 * domande opposte — «chi sale?» e «mi conviene?» — e il collegamento che
 * girano fra loro è uno solo. Distinguere qui, invece che con due percorsi,
 * evita che qualcuno mandi a un amico un indirizzo che l'amico non può
 * aprire.
 */
import { guscio } from '../../../server/guscio.ts'
import { Telaio } from '../../../components/Telaio.tsx'

export default async function Pagina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const g = await guscio()
  const utente = g.utente

  const { data: r } = await db
    .from('corse')
    .select(`
      id, conducente, stato, modalita, ora_partenza, ora_arrivo,
      origine_label, destinazione_label, km_base, pedaggio_cent, parcheggio_cent,
      posti_offerti, sconto_cent, politica, note, prenota_immediata, corsa_ritorno,
      accetta_deviazioni, deviazioni_ritiro, deviazioni_deposito, token_link,
      profili:conducente ( nome, foto_url, data_nascita ),
      veicoli ( marca, modello, colore, fumo, animali, bagagli_grandi, centesimi_per_km ),
      fermate ( id, ordine, tipo, etichetta, ora_stimata, km_incrementali, geo )
    `)
    .eq('id', id)
    .single()

  if (!r) notFound()

  const v = r.veicoli as unknown as RigaVeicolo | null
  const p = r.profili as unknown as RigaProfilo | null
  if (!v) notFound()

  const { data: prenotazioni } = await db
    .from('prenotazioni')
    .select('id, passeggero, stato, messaggio, fermata, creata_il, fermate(etichetta, km_incrementali), profili:passeggero(nome, foto_url)')
    .eq('corsa', id)
    .not('stato', 'in', '("rifiutata","scaduta","annullata")')

  const attive = prenotazioni ?? []
  const corsa: Corsa = {
    modalita: r.modalita,
    kmBase: Number(r.km_base),
    centesimiPerKm: Number(v.centesimi_per_km),
    pedaggio: r.pedaggio_cent,
    parcheggio: r.parcheggio_cent,
    postiOfferti: r.posti_offerti,
    scontoConducente: r.sconto_cent,
  }

  // ── La vista di chi guida ──────────────────────────────────────────────
  if (utente && utente === r.conducente) {
    const aBordo = attive.filter((x) => x.stato !== 'richiesta')
    const proposte = attive.filter((x) => x.stato === 'richiesta')
    const minuti = (new Date(r.ora_partenza).getTime() - Date.now()) / 60_000

    const calcolo = aBordo.length > 0
      ? preventivo(corsa, aBordo.map((x) => ({
          id: x.passeggero,
          fermataId: x.fermata ?? undefined,
          kmDeviazione: Number(fermataDi(x)?.km_incrementali ?? 0),
        })))
      : null

    const dati: DatiCorsaConducente = {
      id: r.id,
      stato: r.stato,
      oraPartenza: r.ora_partenza,
      oraArrivo: r.ora_arrivo,
      origineLabel: r.origine_label,
      destinazioneLabel: r.destinazione_label,
      postiOfferti: r.posti_offerti,
      modalita: r.modalita,
      tokenLink: r.token_link,
      costoCent: costoBase(corsa),
      tettoCent: tettoComplessivo(corsa),
      tappe: ((r.fermate ?? []) as unknown as RigaFermata[])
        .slice()
        .sort((a, b) => a.ordine - b.ordine)
        .map((f) => {
          const g = (f as unknown as { geo?: { coordinates?: [number, number] } }).geo
          return g?.coordinates
            ? { lat: g.coordinates[1], lng: g.coordinates[0], etichetta: f.etichetta }
            : null
        })
        .filter((x): x is { lat: number; lng: number; etichetta: string } => x !== null),
      rientroNettoCent: calcolo?.nettoConducente ?? 0,
      // Si chiede la conferma da tre ore prima, e solo se qualcuno aspetta.
      daConfermare: r.stato === 'pubblicata' && aBordo.length > 0 && minuti <= 180 && minuti > 0,
      passeggeri: aBordo.map((x) => ({
        id: x.id,
        nome: profiloDi(x)?.nome ?? '',
        fotoUrl: profiloDi(x)?.foto_url ?? null,
        punto: fermataDi(x)?.etichetta ?? r.origine_label,
        quotaCent: quotaApplicata(corsa),
        corseFatte: 0,
      })),
      proposte: proposte.map((x) => {
        const km = Number(fermataDi(x)?.km_incrementali ?? 0)
        return {
          id: x.id,
          passeggero: {
            nome: profiloDi(x)?.nome ?? '',
            fotoUrl: profiloDi(x)?.foto_url ?? null,
            corseFatte: 0,
          },
          punto: fermataDi(x)?.etichetta ?? '',
          kmInPiu: km,
          incassoInPiuCent: Math.floor(km * corsa.centesimiPerKm),
          messaggio: x.messaggio ?? undefined,
          scadeFra: '6 ore',
        }
      }),
    }
    return <Telaio {...g} modo="conducente"><CorsaConducente c={dati} /></Telaio>
  }

  // ── La vista di chi cerca un passaggio ─────────────────────────────────
  const { data: ritorno } = r.corsa_ritorno
    ? await db.from('corse')
        .select('id, ora_partenza, stato')
        .eq('id', r.corsa_ritorno)
        .in('stato', ['pubblicata', 'confermata'])
        .maybeSingle()
    : { data: null }

  const d = await distintivi(r.conducente)
  const nPasseggeri = Math.max(1, attive.length + 1)
  const quota = quotaApplicata(corsa)
  const fee = feePasseggero(corsa, nPasseggeri)

  const fermate = ((r.fermate ?? []) as unknown as RigaFermata[])
    .sort((a, b) => a.ordine - b.ordine)
    .map((f) => ({
      etichetta: f.etichetta,
      orario: f.ora_stimata
        ? new Date(f.ora_stimata).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
        : '',
      tipo: f.tipo,
    }))

  const dati: DatiCorsa = {
    id: r.id,
    oraPartenza: r.ora_partenza,
    oraArrivo: r.ora_arrivo,
    fermate,
    postiLiberi: r.posti_offerti - attive.filter((x) => x.stato !== 'richiesta').length,
    quotaCent: quota,
    feeCent: fee,
    totaleCent: quota + fee,
    fermataPronta: true,
    kmDeviazione: 0,
    accettaDeviazioni: r.accetta_deviazioni,
    prenotaImmediata: r.prenota_immediata,
    politica: r.politica,
    note: r.note ?? undefined,
    ritorno: ritorno ? {
      id: ritorno.id,
      orario: new Date(ritorno.ora_partenza)
        .toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
    } : null,
    conducente: {
      id: r.conducente,
      nome: p?.nome ?? '',
      fotoUrl: p?.foto_url ?? null,
      eta: p?.data_nascita ? eta(p.data_nascita) : undefined,
      corseConcluse: d.corseConcluse,
      distintivi: d.etichette,
    },
    veicolo: {
      marca: v.marca, modello: v.modello, colore: v.colore,
      fumo: v.fumo, animali: v.animali, bagagliGrandi: v.bagagli_grandi,
    },
  }
  // Se la carta è già salvata il pannello di prenotazione la mostra invece
  // di chiedere di nuovo i sedici numeri.
  const metodo = utente ? await metodoAttuale(utente).catch(() => null) : null
  return <Telaio {...g} modo="passeggero"><Dettaglio c={dati} metodo={metodo} /></Telaio>
}

const fermataDi = (x: { fermate?: unknown }) =>
  x.fermate as { etichetta?: string; km_incrementali?: number } | null
const profiloDi = (x: { profili?: unknown }) =>
  x.profili as { nome?: string; foto_url?: string | null } | null

const eta = (nascita: string) => {
  const d = new Date(nascita), o = new Date()
  let a = o.getFullYear() - d.getFullYear()
  const m = o.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && o.getDate() < d.getDate())) a--
  return a
}

interface RigaVeicolo {
  marca: string; modello: string; colore: string | null
  fumo: boolean; animali: boolean; bagagli_grandi: boolean
  centesimi_per_km: number
}
interface RigaProfilo { nome: string; foto_url: string | null; data_nascita: string | null }
interface RigaFermata {
  id: string; ordine: number; tipo: 'partenza' | 'ritiro' | 'destinazione'
  etichetta: string; ora_stimata: string | null; km_incrementali: number
}
