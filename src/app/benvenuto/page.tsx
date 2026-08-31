import { Telaio } from '../../components/Telaio.tsx'
import { Benvenuto, type Cosa } from '../../components/Benvenuto.tsx'
import { guscio } from '../../server/guscio.ts'
import { db } from '../../server/db.ts'
import { utentePagina } from '../../server/auth.ts'

export const dynamic = 'force-dynamic'

/**
 * La presentazione, una volta sola.
 *
 * Quello che manca per guidare non è una lista scritta a mano: si guarda il
 * database. Chi arriva qui con l'auto già messa non deve rileggersi che
 * bisogna metterla.
 */
export default async function Pagina({ searchParams }: {
  searchParams: Promise<{ ritorno?: string }>
}) {
  const utente = await utentePagina('/benvenuto')
  const q = await searchParams
  const ritorno = q.ritorno?.startsWith('/') && !q.ritorno.startsWith('//') ? q.ritorno : '/'

  const g = await guscio()
  const [{ data: p }, { data: veicoli }] = await Promise.all([
    db.from('profili').select('nome, telefono, foto_url, stripe_pronto, stripe_account_id').eq('id', utente).maybeSingle(),
    db.from('veicoli').select('id').eq('proprietario', utente).eq('attivo', true).limit(1),
  ])

  const cose: Cosa[] = [
    {
      fatta: (veicoli ?? []).length > 0,
      titolo: 'La tua auto',
      testo: 'Marca, modello e alimentazione: è da lì che esce quanto costa un chilometro, e quindi la quota di chi sale.',
      dove: '/veicoli/nuovo', azione: 'Aggiungi',
    },
    {
      fatta: !!p?.telefono,
      titolo: 'Un numero di telefono',
      testo: 'Chi sale deve poterti chiamare. La telefonata passa da un numero di appoggio: il tuo non lo vede nessuno.',
      dove: '/impostazioni', azione: 'Aggiungi',
    },
    {
      fatta: p?.stripe_pronto === true,
      titolo: 'Un conto dove ricevere',
      testo: p?.stripe_account_id
        ? 'Hai cominciato ma non hai finito: finché Stripe non ha verificato l’identità gli accrediti restano fermi.'
        : 'Serve solo per incassare. Puoi pubblicare anche senza, ma i soldi restano fermi finché non lo colleghi.',
      dove: '/conto', azione: 'Collega',
    },
  ]

  return (
    <Telaio {...g}>
      <Benvenuto nome={p?.nome ?? undefined} ritorno={ritorno} cose={cose}
        fotoUrl={p?.foto_url ?? null} />
    </Telaio>
  )
}
