import { notFound } from 'next/navigation'
import { db } from '../../../server/db.ts'
import { richiediUtente } from '../../../server/auth.ts'
import {
  SchermataPrenotazione, type DatiPrenotazione,
} from '../../../components/SchermataPrenotazione.tsx'

/** Carica i dati e li passa alla vista, che non sa nulla del database. */
import { guscio } from '../../../server/guscio.ts'
import { Telaio } from '../../../components/Telaio.tsx'

export default async function Pagina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const utente = await richiediUtente()

  const { data: r } = await db
    .from('prenotazioni')
    .select(`
      id, stato, esito, quota_cent, deviazione_cent,
      fee_cent, totale_cent, catturato_cent,
      corse ( id, ora_partenza, ora_arrivo, origine_label, destinazione_label,
              politica, profili:conducente ( nome, foto_url ),
              veicoli ( marca, modello, colore, targa ) ),
      fermate ( etichetta )
    `)
    .eq('id', id)
    .eq('passeggero', utente)
    .single()

  if (!r) notFound()
  const c = r.corse as unknown as RigaCorsa

  const p: DatiPrenotazione = {
    id: r.id,
    stato: r.stato,
    esito: r.esito,
    quotaCent: r.quota_cent,
    deviazioneCent: r.deviazione_cent,
    feeCent: r.fee_cent,
    totaleCent: r.totale_cent,
    catturatoCent: r.catturato_cent,
    ritrovo: (r.fermate as unknown as { etichetta: string } | null)?.etichetta ?? c.origine_label,
    corsa: {
      id: c.id,
      oraPartenza: c.ora_partenza,
      oraArrivo: c.ora_arrivo,
      destinazioneLabel: c.destinazione_label,
      politica: c.politica,
    },
    conducente: c.profili ? { nome: c.profili.nome, fotoUrl: c.profili.foto_url } : null,
    veicolo: c.veicoli,
  }

  return <Telaio {...await guscio()} modo="passeggero"><SchermataPrenotazione p={p} /></Telaio>
}

interface RigaCorsa {
  id: string; ora_partenza: string; ora_arrivo: string
  origine_label: string; destinazione_label: string
  politica: 'flessibile' | 'rigida' | 'nessuna'
  profili: { nome: string; foto_url: string | null } | null
  veicoli: { marca: string; modello: string; colore: string | null; targa: string } | null
}
