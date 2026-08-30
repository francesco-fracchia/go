import { pubblicaCorsa } from '../../../server/corse.ts'
import { avvisaChiCercava } from '../../../server/lavori.ts'
import { richiediUtente } from '../../../server/auth.ts'
import { json, rispostaErrore } from '../_risposta.ts'

export async function POST(req: Request) {
  try {
    const utente = await richiediUtente()
    const corpo = await req.json()
    const esito = await pubblicaCorsa({ ...corpo, conducenteId: utente, oraArrivo: new Date(corpo.oraArrivo) })

    // Chi cercava questa tratta e non trovava nulla lo scopre subito: è il
    // meccanismo che tiene in vita il primo anno.
    const avvisati = await avvisaChiCercava(esito.corsa.id)

    return json({ ...esito, avvisati }, 201)
  } catch (e) {
    return rispostaErrore(e)
  }
}
