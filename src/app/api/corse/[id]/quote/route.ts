import { db } from '../../../../../server/db.ts'
import { richiediUtente } from '../../../../../server/auth.ts'
import { json, rispostaErrore } from '../../../_risposta.ts'
import {
  verificaRipartizione, ViolazioneConformita, type Corsa,
} from '../../../../../lib/pricing.ts'

/**
 * Quote personalizzate su una corsa privata.
 *
 * La verifica gira qui, lato server, prima di scrivere qualunque cosa: il
 * controllo nell'interfaccia serve a spiegare, non a proteggere.
 */
export async function POST(
  req: Request, { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const utente = await richiediUtente()
    const { quote } = await req.json() as { quote: Record<string, number> }

    const { data: c } = await db
      .from('corse')
      .select('id, conducente, modalita, km_base, pedaggio_cent, parcheggio_cent, posti_offerti, sconto_cent, veicoli(centesimi_per_km)')
      .eq('id', id).single()

    if (!c || c.conducente !== utente) return json({ errore: 'non è una tua corsa' }, 403)

    const corsa: Corsa = {
      modalita: c.modalita,
      kmBase: Number(c.km_base),
      centesimiPerKm: Number((c.veicoli as unknown as { centesimi_per_km: number })?.centesimi_per_km ?? 0),
      pedaggio: c.pedaggio_cent,
      parcheggio: c.parcheggio_cent,
      postiOfferti: c.posti_offerti,
      scontoConducente: c.sconto_cent,
    }

    verificaRipartizione(corsa, Object.values(quote))

    // Si scrive solo sulle prenotazioni non ancora addebitate: cambiare una
    // quota già catturata significherebbe promettere un rimborso che non
    // stiamo facendo.
    for (const [prenotazione, quotaCent] of Object.entries(quote)) {
      await db.from('prenotazioni')
        .update({ quota_cent: quotaCent })
        .eq('id', prenotazione)
        .eq('corsa', id)
        .in('stato', ['richiesta', 'autorizzata'])
    }
    return json({ ok: true })
  } catch (e) {
    if (e instanceof ViolazioneConformita) {
      return json({ errore: e.message }, 409)
    }
    return rispostaErrore(e)
  }
}
