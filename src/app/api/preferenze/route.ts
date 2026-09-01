import { richiediUtente } from '../../../server/auth.ts'
import { salvaPreferenze, type Quanto } from '../../../server/profili.ts'
import { json, rispostaErrore } from '../_risposta.ts'

const QUANTI: Quanto[] = ['volentieri', 'dipende', 'poco']

/**
 * Le preferenze di viaggio.
 *
 * Le colonne esistono dalla migrazione 0011, `salvaPreferenze` è scritta, e
 * nessuna schermata le toccava: settimo caso di codice corretto e
 * irraggiungibile. Chi guida non poteva dire «di solito viaggio in
 * silenzio», e chi sale non poteva saperlo prima di essere in macchina.
 */
export async function POST(req: Request) {
  try {
    const utente = await richiediUtente()
    const b = await req.json() as Record<string, unknown>

    await salvaPreferenze(utente, {
      chiacchiere: QUANTI.find((q) => q === b.chiacchiere),
      musica: QUANTI.find((q) => q === b.musica),
      soste: typeof b.soste === 'boolean' ? b.soste : undefined,
    })
    return json({ ok: true })
  } catch (e) { return rispostaErrore(e) }
}
