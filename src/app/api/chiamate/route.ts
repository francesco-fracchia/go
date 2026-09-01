import { destinazioneChiamata, inoltra, nonDisponibile } from '../../../server/chiamate.ts'

/**
 * Il centralino: la rotta che Twilio chiama quando qualcuno compone il
 * numero della piattaforma.
 *
 * `chiamate.ts` era scritto per intero — instradamento, TwiML, registro —
 * e questa cartella era VUOTA. Il numero di telefono è obbligatorio per
 * pubblicare, con la motivazione «chi sale deve poterti chiamare», e quella
 * promessa non era mantenibile: non esisteva un indirizzo a cui Twilio
 * potesse parlare. Sesto caso in un giorno di codice corretto e
 * irraggiungibile.
 *
 * Twilio invia i parametri come modulo, non come JSON, e si aspetta TwiML
 * in risposta: non è una rotta come le altre e non deve provare a esserlo.
 */
export async function POST(req: Request) {
  const twiml = (xml: string) =>
    new Response(xml, { headers: { 'content-type': 'text/xml; charset=utf-8' } })

  try {
    const modulo = await req.formData()
    const chiamante = String(modulo.get('From') ?? '')
    if (!chiamante) return twiml(nonDisponibile())

    const destinazione = await destinazioneChiamata(chiamante)
    /**
     * Fuori finestra si RISPONDE, non si riattacca.
     *
     * Chi sente cadere la linea alle due di notte pensa che il numero sia
     * rotto e riprova cinque volte. Una voce che spiega quando quel numero
     * funziona, e dove scrivere nel frattempo, costa un secondo e chiude la
     * questione.
     */
    if (!destinazione) return twiml(nonDisponibile())

    return twiml(inoltra(destinazione.numero))
  } catch (e) {
    console.error('centralino:', e)
    // Anche in errore si risponde con una voce: un 500 a Twilio diventa un
    // silenzio in cuffia, che è la cosa peggiore in quel momento.
    return twiml(nonDisponibile())
  }
}

/**
 * Twilio prova anche in GET su alcune configurazioni: si risponde uguale
 * invece di lasciare un 405 che diventa una chiamata muta.
 */
export const GET = POST
