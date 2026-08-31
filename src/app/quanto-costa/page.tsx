import type { Metadata } from 'next'
import { Telaio } from '../../components/Telaio.tsx'
import { QuantoCosta } from '../../components/QuantoCosta.tsx'
import { guscio } from '../../server/guscio.ts'
import { statoMappa } from '../../server/mappe.ts'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Quanto costa davvero un viaggio in auto — GO',
  description:
    'Il costo reale di un viaggio, sul modello esatto della tua auto, dalle '
    + 'tabelle ACI 2026: non solo la benzina, ma gomme, manutenzione, bollo, '
    + 'assicurazione e svalutazione. Senza account.',
}

/**
 * La pagina che si legge senza essere nessuno.
 *
 * Tutte le altre chiedono chi sei prima di darti qualcosa. Questa dà prima
 * di chiedere, e dà la cosa su cui poggia tutto il resto: che un'auto non
 * costa la benzina. È l'argomento di GO, e un argomento va speso dove
 * qualcuno lo può ancora sentire — cioè fuori.
 */
export default async function Pagina() {
  const [g, mappa] = await Promise.all([guscio(), statoMappa()])
  return (
    <Telaio {...g} vetrina={!g.utente}>
      <QuantoCosta mappa={mappa.attiva} />
    </Telaio>
  )
}
