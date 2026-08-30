import { db } from './db.ts'
import { notifica } from './notifiche.ts'

/**
 * La chat di una corsa.
 *
 * Una conversazione per corsa, non per coppia: chi sale è un gruppo che
 * viaggia insieme, e sapere che ci sono altri tre a bordo è metà della
 * ragione per cui ci si fida a salire.
 *
 * Non si mandano notifiche a chi ha la chat aperta, e si aspetta qualche
 * secondo prima di avvisare: chi scrive tre righe di fila non deve far
 * vibrare tre volte il telefono degli altri.
 */

export const ATTESA_NOTIFICA_MS = 45_000

export async function messaggi(corsaId: string, utenteId: string) {
  const { data } = await db
    .from('messaggi')
    .select('id, autore, testo, creato_il, profili:autore(nome, foto_url)')
    .eq('corsa', corsaId)
    .order('creato_il', { ascending: true })
    .limit(200)

  await db.from('messaggi')
    .update({ letto_il: new Date().toISOString() })
    .eq('corsa', corsaId)
    .neq('autore', utenteId)
    .is('letto_il', null)

  return data ?? []
}

export async function scrivi(corsaId: string, autoreId: string, testo: string) {
  const pulito = testo.trim()
  if (!pulito || pulito.length > 2000) return null

  const { data, error } = await db.from('messaggi')
    .insert({ corsa: corsaId, autore: autoreId, testo: pulito })
    .select('id, testo, creato_il')
    .single()
  if (error) return null

  await avvisaGliAltri(corsaId, autoreId, pulito)
  return data
}

async function avvisaGliAltri(corsaId: string, autoreId: string, testo: string) {
  const [{ data: corsa }, { data: prenotazioni }, { data: autore }] = await Promise.all([
    db.from('corse').select('conducente, destinazione_label').eq('id', corsaId).single(),
    db.from('prenotazioni').select('passeggero')
      .eq('corsa', corsaId)
      .not('stato', 'in', '("rifiutata","scaduta","annullata")'),
    db.from('profili').select('nome').eq('id', autoreId).single(),
  ])

  const destinatari = new Set<string>()
  if (corsa?.conducente) destinatari.add(corsa.conducente)
  for (const p of prenotazioni ?? []) destinatari.add(p.passeggero)
  destinatari.delete(autoreId)

  // La chiave cambia ogni cinque minuti: due messaggi ravvicinati generano
  // una notifica sola, uno un'ora dopo ne genera un'altra.
  const finestra = Math.floor(Date.now() / 300_000)

  for (const d of destinatari) {
    await notifica({
      destinatario: d,
      tipo: 'proposta_ricevuta',
      titolo: autore?.nome ?? 'Nuovo messaggio',
      testo: testo.length > 90 ? testo.slice(0, 88) + '…' : testo,
      url: `/chat/${corsaId}`,
      corsa: corsaId,
      chiave: `chat:${corsaId}:${d}:${finestra}`,
    })
  }
}
