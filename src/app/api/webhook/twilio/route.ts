import twilio from 'twilio'
import { destinazioneChiamata, inoltra, nonDisponibile, registraChiamata } from '../../../../server/chiamate.ts'
import { db, requireEnv } from '../../../../server/db.ts'

/**
 * Centralino.
 *
 * Twilio chiama questo indirizzo quando qualcuno compone il numero della
 * piattaforma. Si risale da chi chiama alla sua corsa in corso e si inoltra
 * al numero giusto, senza che nessuno dei due veda quello dell'altro.
 *
 * La firma di Twilio si verifica sempre: senza, chiunque conosca
 * l'indirizzo può farsi inoltrare a qualunque numero — cioè trasformare il
 * nostro centralino in un modo per scoprire i numeri dei nostri utenti.
 */
export async function POST(req: Request) {
  const corpo = await req.text()
  const firma = req.headers.get('x-twilio-signature') ?? ''
  const parametri = Object.fromEntries(new URLSearchParams(corpo))

  const valida = twilio.validateRequest(
    requireEnv('TWILIO_TOKEN'), firma, req.url, parametri as Record<string, string>,
  )
  if (!valida) {
    return new Response('firma non valida', { status: 403 })
  }

  const da = String(parametri.From ?? '')
  const stato = String(parametri.CallStatus ?? '')
  const durata = Number(parametri.CallDuration ?? 0)

  // Chiamata conclusa: si registra e basta.
  if (stato === 'completed') {
    const d = await destinazioneChiamata(da)
    if (d) {
      const { data: chiamante } = await db
        .from('profili').select('id').eq('telefono', da).maybeSingle()
      const { data: chiamato } = await db
        .from('profili').select('id').eq('telefono', d.numero).maybeSingle()
      if (chiamante && chiamato) {
        await registraChiamata({
          corsa: d.corsa, chiamante: chiamante.id,
          chiamato: chiamato.id, durataS: durata,
        })
      }
    }
    return xml('<Response/>')
  }

  const destinazione = await destinazioneChiamata(da)
  return xml(destinazione ? inoltra(destinazione.numero) : nonDisponibile())
}

const xml = (corpo: string) =>
  new Response(corpo, { headers: { 'content-type': 'text/xml; charset=utf-8' } })
