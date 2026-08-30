import { disdiciPasseggero } from '../../../../server/annullamenti.ts'
import { richiediUtente } from '../../../../server/auth.ts'
import { json, rispostaErrore } from '../../_risposta.ts'

/** Disdetta di una prenotazione da parte del passeggero. */
export async function DELETE(
  _req: Request, { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const esito = await disdiciPasseggero(id, await richiediUtente())
    return json(esito, esito.ok ? 200 : 409)
  } catch (e) { return rispostaErrore(e) }
}
