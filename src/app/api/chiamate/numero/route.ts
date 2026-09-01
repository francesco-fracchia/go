import { richiediUtente } from '../../../../server/auth.ts'
import { puoChiamare } from '../../../../server/chiamate.ts'
import { leggiEnv } from '../../../../server/db.ts'
import { json, rispostaErrore } from '../../_risposta.ts'

/**
 * «Posso chiamare, adesso?»
 *
 * Il numero della piattaforma è uno solo e non è un segreto: il segreto è
 * il numero vero dall'altra parte, e quello non passa mai di qui. Il
 * centralino instrada in base a CHI chiama e QUANDO, quindi dare il numero
 * a chi non è nella finestra non serve a niente — sentirebbe la voce che
 * dice di riprovare più tardi.
 *
 * Si controlla comunque prima, per non mostrare un pulsante che porta a un
 * messaggio registrato.
 */
export async function GET(req: Request) {
  try {
    const utente = await richiediUtente()
    const corsa = new URL(req.url).searchParams.get('corsa') ?? ''

    const numero = leggiEnv('TWILIO_MITTENTE')
    if (!numero) return json({ disponibile: false, motivo: 'non_configurato' })
    if (!corsa) return json({ disponibile: false, motivo: 'corsa_mancante' })

    const ok = await puoChiamare(corsa, utente)
    return json(ok ? { disponibile: true, numero } : { disponibile: false, motivo: 'fuori_finestra' })
  } catch (e) { return rispostaErrore(e) }
}
