import { db } from '../../../server/db.ts'
import { richiediUtente } from '../../../server/auth.ts'
import { json, rispostaErrore } from '../_risposta.ts'

/**
 * «Cerco un passaggio».
 *
 * Una richiesta non impegna nessuno e non costa niente: serve a far sapere
 * che la domanda esiste. È il meccanismo che nel primo anno fa nascere le
 * corse, invece di aspettare che nascano da sole.
 */
export async function POST(req: Request) {
  try {
    const utente = await richiediUtente()
    const b = await req.json()

    const { error } = await db.from('richieste_passaggio').insert({
      passeggero: utente,
      origine_label: b.origineLabel,
      origine_geo: `SRID=4326;POINT(${b.origineLng ?? 0} ${b.origineLat ?? 0})`,
      destinazione_label: b.destinazioneLabel,
      destinazione_geo: `SRID=4326;POINT(${b.destinazioneLng ?? 0} ${b.destinazioneLat ?? 0})`,
      ora_arrivo: new Date(b.oraArrivo).toISOString(),
      flessibilita_min: Math.min(240, Math.max(15, Number(b.flessibilitaMin ?? 60))),
      posti: Math.min(4, Math.max(1, Number(b.posti ?? 1))),
    })
    if (error) return json({ errore: error.message }, 400)
    return json({ ok: true }, 201)
  } catch (e) { return rispostaErrore(e) }
}
