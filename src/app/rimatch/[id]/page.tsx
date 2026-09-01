import { notFound } from 'next/navigation'
import { Telaio } from '../../../components/Telaio.tsx'
import { Rimatch } from '../../../components/Rimatch.tsx'
import { guscio } from '../../../server/guscio.ts'
import { richiediUtente } from '../../../server/auth.ts'
import { db } from '../../../server/db.ts'
import { leggiPunto } from '../../../server/geo.ts'
import { cerca } from '../../../server/ricerca.ts'
import { orario } from '../../../lib/tempo.ts'

export const dynamic = 'force-dynamic'

/**
 * Dove si finisce quando il passaggio salta.
 *
 * Questa pagina NON esisteva. La notifica che parte a chi resta a piedi —
 * «Il tuo passaggio è saltato, ne abbiamo altri» — puntava a /rimatch/[id],
 * e chi la toccava trovava un 404. Nel momento in cui è già fuori casa, di
 * notte, senza un modo per tornare.
 *
 * Il rimatch è, per ammissione del suo stesso modulo, «la funzione col
 * miglior rapporto fra valore e righe di codice di tutto il prodotto».
 * Trovava le alternative, le contava, mandava la notifica — e la notifica
 * portava nel vuoto.
 *
 * Le alternative si ricalcolano ADESSO, non si leggono da una lista
 * congelata al momento dell'annullamento: fra allora e adesso qualcuno può
 * aver pubblicato, e qualcun altro può aver preso l'ultimo posto.
 */
export default async function Pagina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const utente = await richiediUtente()

  const { data: p } = await db
    .from('prenotazioni')
    .select(`id, passeggero, stato, fermata, fermate(geo, etichetta),
             corse!inner(id, ora_arrivo, destinazione_geo, destinazione_label, origine_label)`)
    .eq('id', id)
    .single()
  if (!p || p.passeggero !== utente) notFound()

  const c = p.corse as unknown as {
    id: string; ora_arrivo: string; destinazione_geo: unknown
    destinazione_label: string; origine_label: string
  }
  const fermata = p.fermate as unknown as { geo?: unknown; etichetta?: string } | null

  const destinazione = leggiPunto(c.destinazione_geo)
  const origine = leggiPunto(fermata?.geo) ?? destinazione
  const arrivo = new Date(c.ora_arrivo)

  /**
   * Finestra larga, come nel rimatch: chi è rimasto a piedi accetta
   * volentieri di arrivare un'ora dopo. Stringere qui vuol dire non
   * trovare niente proprio a chi non ha alternative.
   */
  const alternative = (origine && destinazione)
    ? await cerca({
        origine, destinazione,
        da: new Date(arrivo.getTime() - 90 * 60_000),
        a: new Date(arrivo.getTime() + 120 * 60_000),
        raggioM: 6000,
      }).catch(() => [])
    : []

  const g = await guscio()
  return (
    <Telaio {...g}>
      <Rimatch
        destinazione={c.destinazione_label}
        origine={fermata?.etichetta ?? c.origine_label}
        oraPersa={orario(c.ora_arrivo)}
        alternative={alternative
          .filter((a) => a.corsaId !== c.id)
          .slice(0, 6)
          .map((a) => ({
            id: a.corsaId,
            oraPartenza: orario(a.oraPartenza),
            oraArrivo: orario(a.oraArrivo),
            prezzoCent: a.prezzoDa,
            postiLiberi: a.postiLiberi,
            fermataPronta: a.fermataPronta,
            ritiro: a.fermataRitiro,
            scartoM: a.scartoOrigineM,
          }))}
      />
    </Telaio>
  )
}
