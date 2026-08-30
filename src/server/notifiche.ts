import webpush from 'web-push'
import { db, requireEnv } from './db.ts'

/**
 * Notifiche.
 *
 * Il push costa zero, l'SMS costa circa sette centesimi. Su un netto di due
 * euro a corsa, mandare tre SMS per corsa azzera il margine: la regola non è
 * di stile, è di conto economico.
 *
 * Quindi: push per tutto; SMS SOLO per i momenti in cui una notifica non
 * letta rovina la serata di qualcuno — il conducente che non conferma, il
 * rimatch, la corsa annullata. Sono esattamente quelli in cui il telefono è
 * in tasca, la musica è alta e nessuno guarda le notifiche.
 */

export type Tipo =
  | 'promemoria_24h' | 'conferma_richiesta' | 'conducente_non_conferma'
  | 'rimatch_proposto' | 'in_arrivo' | 'proposta_ricevuta'
  | 'proposta_accettata' | 'proposta_rifiutata' | 'corsa_annullata'
  | 'pagamento_catturato' | 'recensione_invito' | 'liquidazione'

/** I tipi che giustificano un SMS quando il push non basta. */
const CRITICI: ReadonlySet<Tipo> = new Set<Tipo>([
  'conducente_non_conferma', 'rimatch_proposto', 'corsa_annullata', 'in_arrivo',
])

/** Costo indicativo di un SMS Twilio verso l'Italia. */
export const COSTO_SMS_CENT = 7

/** Configurata al primo invio, non all'import: vedi db.ts. */
let vapidPronto = false
function configuraVapid() {
  if (vapidPronto) return
  webpush.setVapidDetails(
    'mailto:' + requireEnv('CONTATTO_EMAIL'),
    requireEnv('VAPID_PUBLIC_KEY'),
    requireEnv('VAPID_PRIVATE_KEY'),
  )
  vapidPronto = true
}

export interface Notifica {
  destinatario: string
  tipo: Tipo
  titolo: string
  testo: string
  url?: string
  corsa?: string
  prenotazione?: string
  /**
   * Chiave di idempotenza. Un job rieseguito — e verranno rieseguiti — non
   * deve svegliare due volte la stessa persona alle quattro del mattino.
   */
  chiave: string
}

export async function notifica(n: Notifica): Promise<'push' | 'sms' | 'nessuno' | 'gia_inviata'> {
  const { data: gia } = await db
    .from('notifiche').select('id').eq('chiave', n.chiave).maybeSingle()
  if (gia) return 'gia_inviata'

  const { data: profilo } = await db
    .from('profili')
    .select('telefono, push_attive, sms_attivi')
    .eq('id', n.destinatario)
    .single()
  if (!profilo) return 'nessuno'

  let canale: 'push' | 'sms' | null = null

  if (profilo.push_attive) {
    const consegnato = await inviaPush(n)
    if (consegnato) canale = 'push'
  }

  // L'SMS interviene solo se il push non è arrivato E la cosa è critica.
  if (!canale && CRITICI.has(n.tipo) && profilo.sms_attivi && profilo.telefono) {
    await inviaSms(profilo.telefono, `${n.titolo}\n${n.testo}`)
    canale = 'sms'
  }

  if (!canale) return 'nessuno'

  await db.from('notifiche').insert({
    destinatario: n.destinatario,
    tipo: n.tipo,
    canale,
    corsa: n.corsa ?? null,
    prenotazione: n.prenotazione ?? null,
    costo_cent: canale === 'sms' ? COSTO_SMS_CENT : 0,
    chiave: n.chiave,
  })
  return canale
}

async function inviaPush(n: Notifica): Promise<boolean> {
  configuraVapid()
  const { data: iscrizioni } = await db
    .from('push_iscrizioni')
    .select('id, endpoint, p256dh, auth')
    .eq('utente', n.destinatario)
    .is('fallita_il', null)

  if (!iscrizioni?.length) return false
  const carico = JSON.stringify({ title: n.titolo, body: n.testo, url: n.url ?? '/' })
  let almenoUno = false

  for (const i of iscrizioni) {
    try {
      await webpush.sendNotification(
        { endpoint: i.endpoint, keys: { p256dh: i.p256dh, auth: i.auth } },
        carico,
      )
      almenoUno = true
    } catch (e) {
      // 404 e 410 significano iscrizione morta: si marca e si va avanti.
      const stato = (e as { statusCode?: number }).statusCode
      if (stato === 404 || stato === 410) {
        await db.from('push_iscrizioni')
          .update({ fallita_il: new Date().toISOString() }).eq('id', i.id)
      }
    }
  }
  return almenoUno
}

async function inviaSms(numero: string, testo: string) {
  const { default: twilio } = await import('twilio')
  const client = twilio(requireEnv('TWILIO_SID'), requireEnv('TWILIO_TOKEN'))
  await client.messages.create({
    to: numero,
    from: requireEnv('TWILIO_MITTENTE'),
    body: testo,
  })
}

/** Quanto sono costati gli SMS in un periodo. Serve a sapere se la regola tiene. */
export async function costoSmsPeriodo(da: Date, a: Date): Promise<number> {
  const { data } = await db
    .from('notifiche')
    .select('costo_cent')
    .eq('canale', 'sms')
    .gte('inviata_il', da.toISOString())
    .lte('inviata_il', a.toISOString())
  return (data ?? []).reduce((s, r) => s + r.costo_cent, 0)
}
