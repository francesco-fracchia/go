import { notFound } from 'next/navigation'
import { db } from '../../../server/db.ts'
import { utenteCorrente } from '../../../server/auth.ts'
import { distintivi } from '../../../server/profili.ts'
import { recensioniDi } from '../../../server/recensioni.ts'
import { Profilo, type DatiProfilo } from '../../../components/Profilo.tsx'

export const dynamic = 'force-dynamic'

import { Telaio } from '../../../components/Telaio.tsx'

export default async function Pagina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const io = await utenteCorrente()

  const [{ data: p }, d, recensioni] = await Promise.all([
    db.from('profili')
      .select('id, nome, cognome, foto_url, data_nascita, bio, creato_il, telefono_ok, email_ok, stripe_pronto, veicoli(marca, modello, colore)')
      .eq('id', id).single(),
    distintivi(id),
    recensioniDi(id, 10),
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
    recensioni: recensioni.map((r) => ({
      id: r.id, positiva: r.positiva, tag: r.tag ?? [], testo: r.testo,
      autore: (r.autore as unknown as { nome: string } | null)?.nome ?? '',
      quando: new Date(r.creata_il).toLocaleDateString('it-IT', { month: 'short', year: 'numeric' }),
    })),
  }

  return <Telaio attiva="/profilo"><Profilo p={dati} mio={io === id} /></Telaio>
}

const eta = (n: string) => {
  const d = new Date(n), o = new Date()
  let a = o.getFullYear() - d.getFullYear()
  const m = o.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && o.getDate() < d.getDate())) a--
  return a
}
