import { db } from '../../../server/db.ts'
import { richiediUtente } from '../../../server/auth.ts'
import { percorso } from '../../../server/percorsi.ts'
import {
  costoBase, quotaApplicata, feePasseggero, preventivo, scontoPerLivello,
  type Corsa, type LivelloRimborso, type Modalita,
} from '../../../lib/pricing.ts'
import { json, rispostaErrore } from '../_risposta.ts'

/**
 * Quanto rientra, prima di pubblicare.
 *
 * È il numero per cui uno pubblica, e finora lo vedeva solo DOPO — pubblicava
 * al buio e scopriva l'esito a cose fatte. Chi non sa quanto rientra non
 * pubblica: si tiene la macchina vuota.
 *
 * Qui non c'è logica nuova. Si mettono in fila due cose che esistono già —
 * il percorso (con la sua cache) e il motore dei prezzi — e si restituisce
 * quello che direbbero comunque al momento della pubblicazione. Se il
 * risultato di questa rotta e quello della corsa pubblicata divergessero
 * sarebbe un errore grave: è lo stesso calcolo, sugli stessi dati.
 */
export async function POST(req: Request) {
  try {
    const utente = await richiediUtente()
    const b = await req.json()

    const posti = Math.min(7, Math.max(1, Number(b.postiOfferti ?? 1)))
    const punti = [b.origine, b.destinazione]
    if (!punti.every((p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lng))) {
      return json({ errore: 'servono partenza e destinazione' }, 400)
    }

    // Il veicolo deve essere di chi chiede: il costo al chilometro è un dato
    // della sua auto, e restituirlo a chiunque lo chieda sarebbe raccontare
    // che macchina ha qualcun altro.
    const { data: v } = await db
      .from('veicoli')
      .select('centesimi_per_km, posti_totali, alimentazione, consumo_l100')
      .eq('id', b.veicoloId)
      .eq('proprietario', utente)
      .maybeSingle()
    if (!v) return json({ errore: 'auto non trovata' }, 404)

    const p = await percorso(punti)

    /**
     * Il preventivo deve rispondere alla domanda che si sta facendo ADESSO.
     *
     * Prima calcolava sempre a corsa pubblica e a rimborso pieno: chi
     * sceglieva «solo il carburante» per una corsa fra amici continuava a
     * leggere «ti rientrano 8,70 €» mentre stava per rientrare di 2,60. Il
     * numero su cui uno decide non può essere quello di un'altra corsa.
     */
    const modalita = (['pubblica', 'link', 'privata'] as const)
      .find((m) => m === b.modalita) ?? 'pubblica' as Modalita
    const livello = (['tutto', 'carburante_pedaggi', 'carburante', 'niente'] as const)
      .find((l) => l === b.livelloRimborso) ?? 'tutto' as LivelloRimborso

    const corsa: Corsa = {
      modalita,
      kmBase: p.km,
      centesimiPerKm: Number(v.centesimi_per_km),
      pedaggio: 0,
      parcheggio: 0,
      postiOfferti: posti,
    }
    corsa.scontoConducente = scontoPerLivello(
      corsa, livello, String(v.alimentazione), v.consumo_l100 as number | null,
    )

    const quota = quotaApplicata(corsa)
    const fee = feePasseggero(corsa, posti)

    // Due numeri, non uno: quello che rientra se si riempie e quello che
    // rientra con una persona sola. Mostrare solo il primo sarebbe una
    // promessa; mostrare solo il secondo scoraggerebbe senza motivo.
    const pieno = preventivo(corsa, Array.from({ length: posti }, (_, i) => ({ id: `p${i}`, kmDeviazione: 0 })))
    const uno = preventivo(corsa, [{ id: 'p0', kmDeviazione: 0 }])

    return json({
      km: p.km,
      minuti: p.minuti,
      costoViaggioCent: costoBase(corsa),
      quotaCent: quota,
      feeCent: fee,
      pagaPasseggeroCent: quota + fee,
      rientroPienoCent: pieno.nettoConducente,
      rientroUnoCent: uno.nettoConducente,
      postiMassimi: Math.max(1, v.posti_totali - 1),
    })
  } catch (e) { return rispostaErrore(e) }
}
