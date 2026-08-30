import { segnaPosizione, posizioneDi } from '../../../server/posizione.ts'
import { richiediUtente } from '../../../server/auth.ts'
import { json, rispostaErrore } from '../_risposta.ts'

export async function GET(req: Request) {
  try {
    await richiediUtente()
    const corsa = new URL(req.url).searchParams.get('corsa')
    if (!corsa) return json({ errore: 'manca la corsa' }, 400)
    return json({ posizione: await posizioneDi(corsa) })
  } catch (e) { return rispostaErrore(e) }
}

export async function POST(req: Request) {
  try {
    const utente = await richiediUtente()
    const { corsa, lat, lng, verso } = await req.json()
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return json({ errore: 'coordinate non valide' }, 400)
    }
    const esito = await segnaPosizione({
      corsaId: String(corsa), conducenteId: utente,
      lat: Number(lat), lng: Number(lng), verso,
    })
    // Fuori dalla finestra il database rifiuta: si dice al telefono di
    // smettere, invece di lasciarlo mandare punti che nessuno registra.
    return json(esito, esito.accettata ? 200 : 409)
  } catch (e) { return rispostaErrore(e) }
}
