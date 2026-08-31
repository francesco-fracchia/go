import { pubblicaCorsa } from '../../../server/corse.ts'
import { avvisaChiCercava } from '../../../server/lavori.ts'
import { richiediUtente } from '../../../server/auth.ts'
import { json, rispostaErrore } from '../_risposta.ts'

export async function POST(req: Request) {
  try {
    const utente = await richiediUtente()
    const corpo = await req.json()
    const esito = await pubblicaCorsa({ ...corpo, conducenteId: utente, oraArrivo: new Date(corpo.oraArrivo) })

    /**
     * Chi cercava questa tratta e non trovava nulla lo scopre subito: è il
     * meccanismo che tiene in vita il primo anno.
     *
     * Ma la corsa a questo punto ESISTE. Se avvisare fallisce — un canale
     * non configurato, un fornitore giù — la risposta non può diventare un
     * errore: chi ha pubblicato vedrebbe «qualcosa è andato storto» su una
     * corsa che è già in linea, e la ripubblicherebbe.
     */
    const avvisati = await avvisaChiCercava(esito.corsa.id).catch((e) => {
      console.error('avvisi non inviati:', e)
      return 0
    })

    return json({ ...esito, avvisati }, 201)
  } catch (e) {
    return rispostaErrore(e)
  }
}
