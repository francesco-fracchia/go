import { db } from './db.ts'
import { utenteCorrente } from './auth.ts'
import { modoCorrente, type Modo } from './modo.ts'

/**
 * Quello che serve al telaio, in una chiamata sola.
 *
 * Ogni pagina ha bisogno delle stesse quattro cose per disegnare la barra:
 * chi sei, come ti chiami, la tua foto, in che modalità stai. Ripetere le
 * due letture in venti file significa dimenticarsene in una — e quella
 * pagina mostra «Entra» a chi è già dentro.
 *
 * Se il profilo non risponde la barra compare lo stesso: l'identità è un
 * contorno, la pagina no.
 */

export interface Guscio {
  modo: Modo
  utente: string | null
  iniziale?: string
  fotoUrl?: string | null
}

export async function guscio(): Promise<Guscio> {
  const [modo, utente] = await Promise.all([modoCorrente(), utenteCorrente().catch(() => null)])
  if (!utente) return { modo, utente: null }

  try {
    const { data } = await db
      .from('profili').select('nome, foto_url').eq('id', utente).maybeSingle()
    return {
      modo, utente,
      iniziale: (data?.nome ?? '').charAt(0).toUpperCase() || undefined,
      fotoUrl: data?.foto_url ?? null,
    }
  } catch {
    return { modo, utente }
  }
}
