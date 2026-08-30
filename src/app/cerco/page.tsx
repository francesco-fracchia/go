import { guscio } from '../../server/guscio.ts'
import { Telaio } from '../../components/Telaio.tsx'
import { CercoPassaggio } from '../../components/CercoPassaggio.tsx'
import { statoMappa } from '../../server/mappe.ts'
import { centroPer } from '../../server/centro.ts'
import { luoghiSalvati } from '../../server/preferiti.ts'

export const dynamic = 'force-dynamic'

export default async function Pagina() {
  const g = await guscio()
  const [{ attiva: mappa }, vicino, salvati] = await Promise.all([
    statoMappa().catch(() => ({ attiva: false })),
    centroPer(g.utente),
    g.utente ? luoghiSalvati(g.utente).catch(() => []) : Promise.resolve([]),
  ])
  const c = salvati.find((l) => l.tipo === 'casa')

  return (
    <Telaio attiva="/" {...g}>
      <CercoPassaggio mappa={mappa} vicino={vicino}
        casa={c ? { etichetta: c.indirizzo, lat: c.lat, lng: c.lng, fonte: 'salvato' } : undefined} />
    </Telaio>
  )
}
