import { notFound } from 'next/navigation'
import { db } from '../../../server/db.ts'
import { richiediUtente } from '../../../server/auth.ts'
import { messaggi, filo } from '../../../server/chat.ts'
import { Chat, type Messaggio } from '../../../components/Chat.tsx'
import { orario } from '../../../lib/tempo.ts'

export default async function Pagina({ params, searchParams }: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ con?: string }>
}) {
  const { id } = await params
  const { con } = await searchParams
  const utente = await richiediUtente()

  const { data: corsa } = await db
    .from('corse')
    .select('id, destinazione_label, ora_partenza, conducente')
    .eq('id', id)
    .single()
  if (!corsa) notFound()

  /**
   * Quale conversazione, lo decide il server.
   *
   * `con` conta solo se a chiederlo è chi guida una corsa pubblica. A un
   * passeggero viene ignorato: il suo filo è il suo, e chiederne un altro
   * per nome non deve portarlo da nessuna parte.
   */
  const f = await filo(id, utente, con ?? null)
  if (!f.ok && f.motivo === 'estraneo') notFound()

  const righe = await messaggi(id, utente, con ?? null)
  const iniziali: Messaggio[] = righe.map((m) => ({
    id: m.id, autore: m.autore, testo: m.testo, creatoIl: m.creato_il,
    nomeAutore: (m.profili as unknown as { nome: string } | null)?.nome ?? '',
  }))

  /**
   * Il sottotitolo dice chi legge, e non è un dettaglio.
   *
   * Chi scrive si regola su quante persone lo leggeranno. «Vedono tutti
   * quelli che salgono» e «solo tu e Marco» portano a scrivere cose
   * diverse, ed è giusto che sia così: sbagliare quella stima è il modo in
   * cui si dice in pubblico una cosa detta per uno.
   */
  const gruppo = f.ok ? f.gruppo : true
  let conChi = ''
  if (!gruppo && f.ok) {
    const altro = utente === corsa.conducente ? f.passeggero : corsa.conducente
    const { data: p } = await db.from('profili').select('nome').eq('id', altro!).maybeSingle()
    conChi = p?.nome ?? ''
  }

  /**
   * Segnalare da qui dentro, senza uscire.
   *
   * Chi riceve una minaccia in chat non deve tornare indietro, trovare la
   * prenotazione e cercare dove si segnala: a quel punto la maggior parte
   * delle persone lascia perdere, ed è esattamente il caso in cui non
   * dovrebbero. Si segnala una PRENOTAZIONE perché è quella a provare che
   * i due si sono davvero incontrati.
   */
  const altro = f.ok && !f.gruppo
    ? (utente === corsa.conducente ? f.passeggero : corsa.conducente)
    : null
  const { data: daSegnalare } = await db
    .from('prenotazioni')
    .select('id')
    .eq('corsa', id)
    .eq('passeggero', utente === corsa.conducente ? (altro ?? utente) : utente)
    .not('stato', 'in', '("rifiutata","scaduta")')
    .maybeSingle()

  return (
    <Chat
      segnala={daSegnalare?.id ?? null}
      corsaId={id}
      con={f.ok ? f.passeggero : null}
      mio={utente}
      iniziali={iniziali}
      titolo={gruppo
        ? `${corsa.destinazione_label} · ${orario(corsa.ora_partenza)}`
        : conChi || corsa.destinazione_label}
      sottotitolo={gruppo
        ? 'Vedono tutti quelli che salgono'
        : `Solo tu e ${conChi || 'chi guida'} · ${corsa.destinazione_label}, ${orario(corsa.ora_partenza)}`}
      ritorno={`/corsa/${id}`}
    />
  )
}
