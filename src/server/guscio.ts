import { db } from './db.ts'
import { utenteCorrente } from './auth.ts'
import { modoCorrente, type Modo } from './modo.ts'
import { daLeggere } from './notifiche.ts'

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
  /** Quante notifiche non ha ancora visto. Il pallino sulla campanella. */
  daLeggere?: number
}

export async function guscio(): Promise<Guscio> {
  const [modo, utente] = await Promise.all([modoCorrente(), utenteCorrente().catch(() => null)])
  if (!utente) return { modo, utente: null }

  try {
    const [{ data }, quante] = await Promise.all([
      db.from('profili').select('nome, foto_url').eq('id', utente).maybeSingle(),
      daLeggere(utente).catch(() => 0),
    ])
    return {
      modo, utente,
      iniziale: (data?.nome ?? '').charAt(0).toUpperCase() || undefined,
      fotoUrl: data?.foto_url ?? null,
      daLeggere: quante,
    }
  } catch {
    return { modo, utente }
  }
}
