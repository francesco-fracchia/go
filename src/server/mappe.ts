import { db } from './db.ts'

/**
 * Il freno della mappa.
 *
 * La soglia gratuita è 10.000 mappe create al mese. Ci fermiamo a 8.000:
 * il margine serve perché il conteggio arriva dal browser e qualcosa si
 * perde sempre — una scheda chiusa a metà, una rete che cade — e perché
 * accorgersi di aver sforato leggendo una fattura è troppo tardi.
 *
 * Superata la soglia non si rompe niente: smettiamo di OFFRIRE la mappa. Il
 * pulsante non compare e resta la ricerca per indirizzo, che è la strada che
 * quasi tutti usano comunque. È la differenza fra un servizio che si degrada
 * e uno che si guasta.
 */
export const SOGLIA_MENSILE = 8_000

export interface StatoMappa {
  attiva: boolean
  caricamenti: number
  soglia: number
  motivo?: 'nessuna_chiave' | 'soglia_superata'
}

export async function statoMappa(): Promise<StatoMappa> {
  if (!process.env.NEXT_PUBLIC_MAPTILER_KEY && !process.env.NEXT_PUBLIC_MAPS_KEY) {
    return { attiva: false, caricamenti: 0, soglia: SOGLIA_MENSILE, motivo: 'nessuna_chiave' }
  }

  // Se il conteggio non risponde la mappa resta accesa: un contatore rotto
  // non deve togliere una funzione che funziona.
  let caricamenti = 0
  try {
    const { data } = await db.rpc('caricamenti_del_mese')
    caricamenti = Number(data ?? 0)
  } catch {
    return { attiva: true, caricamenti: 0, soglia: SOGLIA_MENSILE }
  }

  return caricamenti >= SOGLIA_MENSILE
    ? { attiva: false, caricamenti, soglia: SOGLIA_MENSILE, motivo: 'soglia_superata' }
    : { attiva: true, caricamenti, soglia: SOGLIA_MENSILE }
}

/** Chiamata dal browser quando una mappa nasce davvero. */
export async function registraCaricamento(): Promise<number> {
  const { data } = await db.rpc('conta_caricamento_mappa')
  return Number(data ?? 0)
}
