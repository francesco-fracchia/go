import { notFound } from 'next/navigation'
import { db } from '../../../server/db.ts'
import { utenteCorrente } from '../../../server/auth.ts'
import { distintivi } from '../../../server/profili.ts'
import { recensioniDi, numeriDi, riassunto, abitudini } from '../../../server/recensioni.ts'
import { codiceDi, quantiInvitati } from '../../../server/inviti.ts'
import { Profilo, type DatiProfilo } from '../../../components/Profilo.tsx'
import { contaFatti } from '../../../lib/recensione.ts'

export const dynamic = 'force-dynamic'

import { guscio } from '../../../server/guscio.ts'
import { Telaio } from '../../../components/Telaio.tsx'

export default async function Pagina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const g = await guscio()
  const io = g.utente

  const mio = io === id
  const [{ data: p }, d, recensioni, tutte, codice, portati] = await Promise.all([
    db.from('profili')
      .select('id, nome, cognome, foto_url, data_nascita, bio, creato_il, telefono_ok, email_ok, stripe_pronto, veicoli(marca, modello, colore)')
      .eq('id', id).single(),
    distintivi(id),
    recensioniDi(id, 10),
    // I numeri su tutte, il testo sulle ultime dieci.
    numeriDi(id),
    mio ? codiceDi(id).catch(() => null) : Promise.resolve(null),
    mio ? quantiInvitati(id).catch(() => 0) : Promise.resolve(0),
  ])
  if (!p) notFound()

  const dati: DatiProfilo = {
    id: p.id, nome: p.nome, cognome: p.cognome, fotoUrl: p.foto_url,
    eta: p.data_nascita ? eta(p.data_nascita) : undefined,
    bio: p.bio ?? undefined,
    membroDal: new Date(p.creato_il).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }),
    distintivi: d.etichette,
    corseConcluse: d.corseConcluse,
    telefonoOk: p.telefono_ok,
    emailOk: p.email_ok,
    // Il documento lo verifica Stripe su chi incassa: non lo chiediamo noi,
    // e mostrarlo verificato quando lo è è un segnale di fiducia gratuito.
    documentoOk: p.stripe_pronto === true,
    veicoli: (p.veicoli ?? []) as unknown as DatiProfilo['veicoli'],
    invito: codice ? { codice, portati } : undefined,
    /**
     * Chi ha scritto non si nomina.
     *
     * «Bea» e «un passeggero» dicono la stessa cosa utile — da che parte
     * stava chi parla — ma solo il primo dice anche chi si può andare a
     * cercare. Anonima verso il pubblico, nota a noi.
     */
    recensioni: recensioni.map((r) => ({
      id: r.id, positiva: r.positiva, tag: r.tag ?? [],
      descrittori: r.descrittori ?? [], testo: r.testo,
      autore: r.ruolo_autore === 'conducente' ? 'Chi guidava' : 'Un passeggero',
      quando: new Date(r.creata_il).toLocaleDateString('it-IT', { month: 'short', year: 'numeric' }),
    })),
    sintesi: riassunto(tutte),
    abitudini: abitudini(tutte),
    fatti: contaFatti(tutte),
  }

  return <Telaio attiva="/profilo" {...g}><Profilo p={dati} mio={mio} /></Telaio>
}

const eta = (n: string) => {
  const d = new Date(n), o = new Date()
  let a = o.getFullYear() - d.getFullYear()
  const m = o.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && o.getDate() < d.getDate())) a--
  return a
}
