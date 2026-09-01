import { accettaProposta, rifiutaProposta } from '../../../server/proposte.ts'
import { richiediUtente } from '../../../server/auth.ts'
import { json, rispostaErrore } from '../_risposta.ts'

const MESSAGGI: Record<string, string> = {
  ok: 'accettata',
  pieno: 'il posto è stato preso mentre decidevi',
  gia_gestita: 'hai già risposto a questa richiesta',
  tardi: 'la corsa è già partita',
  non_tua: 'non è una tua corsa',
  non_trovata: 'richiesta non trovata',
  pagamento: 'il metodo di pagamento del passeggero non è più valido',
}

export async function POST(req: Request) {
  try {
    const utente = await richiediUtente()
    const { prenotazione, accetta, motivo, assorbe } = await req.json()

    if (!accetta) {
      const ok = await rifiutaProposta(prenotazione, utente, motivo)
      return json({ ok }, ok ? 200 : 409)
    }
    // «partenza» o «arrivo»: chi paga i minuti che la deviazione aggiunge.
    const r = await accettaProposta(prenotazione, utente,
      assorbe === 'arrivo' ? 'arrivo' : 'partenza')
    return json(
      { esito: r.esito, messaggio: MESSAGGI[r.esito], ...('totale' in r ? { totale: r.totale } : {}) },
      r.esito === 'ok' ? 200 : 409,
    )
  } catch (e) {
    return rispostaErrore(e)
  }
}
