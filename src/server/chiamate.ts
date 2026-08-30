import { db, requireEnv } from './db.ts'

/**
 * Chiamate mascherate.
 *
 * I numeri veri non si scambiano mai. Twilio fa da centralino: entrambi
 * vedono un numero della piattaforma.
 *
 * Il collegamento si apre a MEZZ'ORA dalla partenza e si chiude un'ora dopo
 * l'arrivo. Un numero raggiungibile per sempre è un numero pubblico, e la
 * ragione per cui qualcuno accetta di salire in macchina con uno sconosciuto
 * è anche che non gli lascia il proprio numero.
 *
 * Un numero Twilio costa circa un euro al mese e regge molte corse: se ne
 * tiene UNO solo e si instrada in base a chi chiama e quando. Comprarne uno
 * per corsa sarebbe il modo più veloce di rendere il prodotto insostenibile.
 */

export const COSTO_CHIAMATA_AL_MINUTO_CENT = 2

export async function puoChiamare(corsaId: string, chiamanteId: string): Promise<boolean> {
  const { data } = await db.rpc('puo_chiamare', {
    p_corsa: corsaId, p_chiamante: chiamanteId,
  })
  return data === true
}

/**
 * A chi instradare una chiamata in arrivo sul numero della piattaforma.
 *
 * Si risale dal numero di chi chiama alla sua corsa in corso. Se ne ha più
 * d'una — raro ma possibile in una notte — si prende quella che parte prima.
 */
export async function destinazioneChiamata(numeroChiamante: string) {
  const { data: chiamante } = await db
    .from('profili').select('id').eq('telefono', numeroChiamante).maybeSingle()
  if (!chiamante) return null

  const ora = new Date()
  const da = new Date(ora.getTime() - 60 * 60_000).toISOString()
  const a = new Date(ora.getTime() + 30 * 60_000).toISOString()

  const { data: comeConducente } = await db
    .from('corse')
    .select('id, ora_partenza, prenotazioni(passeggero, stato, profili:passeggero(telefono))')
    .eq('conducente', chiamante.id)
    .in('stato', ['confermata', 'in_corso'])
    .gte('ora_partenza', da).lte('ora_partenza', a)
    .order('ora_partenza').limit(1).maybeSingle()

  if (comeConducente) {
    const p = (comeConducente.prenotazioni as unknown as Array<{
      stato: string; profili: { telefono: string } | null
    }>).find((x) => ['autorizzata', 'catturata'].includes(x.stato))
    if (p?.profili?.telefono) {
      return { numero: p.profili.telefono, corsa: comeConducente.id }
    }
  }

  const { data: comePasseggero } = await db
    .from('prenotazioni')
    .select('corsa, corse!inner(id, ora_partenza, stato, profili:conducente(telefono))')
    .eq('passeggero', chiamante.id)
    .in('stato', ['autorizzata', 'catturata'])
    .limit(5)

  for (const p of comePasseggero ?? []) {
    const c = p.corse as unknown as {
      id: string; ora_partenza: string; stato: string; profili: { telefono: string } | null
    }
    if (!['confermata', 'in_corso'].includes(c.stato)) continue
    if (c.ora_partenza < da || c.ora_partenza > a) continue
    if (c.profili?.telefono) return { numero: c.profili.telefono, corsa: c.id }
  }
  return null
}

/** TwiML: la risposta che Twilio si aspetta per inoltrare la chiamata. */
export function inoltra(numero: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${requireEnv('TWILIO_MITTENTE')}" timeout="25">${numero}</Dial>
</Response>`
}

export function nonDisponibile(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="it-IT">Questo numero funziona solo nella mezz'ora prima della partenza e durante il viaggio. Usa la chat sull'applicazione.</Say>
</Response>`
}

export async function registraChiamata(opts: {
  corsa: string; chiamante: string; chiamato: string; durataS: number
}) {
  await db.from('chiamate').insert({
    corsa: opts.corsa,
    chiamante: opts.chiamante,
    chiamato: opts.chiamato,
    durata_s: opts.durataS,
    costo_cent: Math.ceil(opts.durataS / 60) * COSTO_CHIAMATA_AL_MINUTO_CENT,
  })
}
