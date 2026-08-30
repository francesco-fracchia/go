import { Telaio } from '../../components/Telaio.tsx'
import { Racconto } from '../../components/Racconto.tsx'
import { guscio } from '../../server/guscio.ts'

export const dynamic = 'force-dynamic'

/**
 * Il racconto, per chi è già dentro.
 *
 * La stessa pagina che vede chi arriva la prima volta. Serve perché il
 * momento in cui uno si chiede «ma come funziona davvero, chi ci guadagna?»
 * quasi mai è il primo: è la terza volta, quando sta per mettere la carta.
 * Averla solo da sconnessi vorrebbe dire non averla proprio.
 */
export default async function Pagina() {
  const g = await guscio()
  return (
    <Telaio {...g}>
      <Racconto entrato={!!g.utente} />
    </Telaio>
  )
}
