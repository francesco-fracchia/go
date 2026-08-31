import { db } from '../../../server/db.ts'
import { json, rispostaErrore } from '../_risposta.ts'
import { numero } from '../_numeri.ts'

/**
 * I modelli delle tabelle ACI, cercati mentre si scrive.
 *
 * Senza questa ricerca il modulo dell'auto chiedeva marca e modello come
 * testo libero, e nessuna riga corrispondeva mai a un modello vero: il
 * costo al chilometro finiva sul ripiego, che è il MINIMO della tabella
 * per quell'alimentazione — l'auto più economica d'Italia.
 *
 * Non è un errore neutro. Sottostima sempre, quindi chi guida rientra di
 * meno di quello che gli spetterebbe, e la frase che diciamo ovunque — «il
 * costo del modello esatto della tua auto» — non era vera per nessuno.
 */
/**
 * Senza account, apposta.
 *
 * La tabella ACI è un documento pubblico: marca, modello, alimentazione e
 * costo chilometrico. Non c'è dentro niente di nessuno. Chiedeva
 * l'autenticazione solo perché il suo primo lettore era il modulo
 * dell'auto — e quel requisito, ereditato senza motivo, avrebbe chiuso il
 * calcolatore pubblico a chi non si è ancora registrato: cioè a tutti
 * quelli per cui il calcolatore esiste.
 */
export async function GET(req: Request) {
  try {
    const q = new URL(req.url).searchParams
    const testo = (q.get('testo') ?? '').trim()
    if (testo.length < 2) return json({ modelli: [] })

    const { data, error } = await db.rpc('cerca_modello_aci', {
      p_testo: testo,
      p_limite: Math.min(12, Math.max(1, numero(q, 'limite') ?? 8)),
    })
    if (error) return json({ errore: error.message }, 400)

    return json({
      modelli: (data ?? []).map((m: Record<string, unknown>) => ({
        id: String(m.id),
        marca: String(m.marca),
        modello: String(m.modello),
        alimentazione: String(m.alimentazione),
        centesimiPerKm: Number(m.centesimi_per_km),
      })),
    })
  } catch (e) { return rispostaErrore(e) }
}
