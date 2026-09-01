import { confermaPassaggio } from '../../../../../server/pianifica.ts'
import { richiediUtente } from '../../../../../server/auth.ts'
import { json, rispostaErrore } from '../../../_risposta.ts'

/**
 * «Sono partito», e da qui in poi le ore sono vere.
 *
 * `quale` è «partenza» per l'uscita di casa, oppure l'identificativo della
 * fermata da cui si riparte dopo aver caricato qualcuno.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const utente = await richiediUtente()
    const { id } = await params
    const { quale } = await req.json()
    const e = await confermaPassaggio(id, utente, String(quale ?? 'partenza'))
    if (e.ok) return json({ avvisati: e.avvisati, arrivo: e.arrivo.toISOString() })

    const spiega: Record<string, [string, number]> = {
      non_tua: ['non è una tua corsa', 403],
      assente: ['questa corsa non esiste più', 404],
      gia_passata: ['lo avevi già confermato', 409],
    }
    const [messaggio, stato] = spiega[e.motivo] ?? ['non riuscito', 400]
    return json({ errore: messaggio, codice: e.motivo }, stato)
  } catch (e) { return rispostaErrore(e) }
}
