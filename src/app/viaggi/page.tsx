import { db } from '../../server/db.ts'
import { richiediUtente } from '../../server/auth.ts'
import { IMieiViaggi, type Viaggio } from '../../components/IMieiViaggi.tsx'
import { preventivo, type Corsa } from '../../lib/pricing.ts'

export const dynamic = 'force-dynamic'

import { Telaio } from '../../components/Telaio.tsx'

export default async function Pagina() {
  const utente = await richiediUtente()
  const adesso = Date.now()

  const [{ data: prenotazioni }, { data: guidate }] = await Promise.all([
    db.from('prenotazioni')
      .select(`id, stato, esito, totale_cent, catturato_cent,
               corse!inner(id, ora_partenza, origine_label, destinazione_label, conducente)`)
      .eq('passeggero', utente)
      .not('stato', 'in', '("rifiutata","scaduta")')
      .order('creata_il', { ascending: false })
      .limit(50),
    db.from('corse')
      .select(`id, stato, ora_partenza, origine_label, destinazione_label, km_base,
               pedaggio_cent, parcheggio_cent, posti_offerti, sconto_cent, modalita,
               veicoli(centesimi_per_km), prenotazioni(id, stato)`)
      .eq('conducente', utente)
      .not('stato', 'in', '("bozza")')
      .order('ora_partenza', { ascending: false })
      .limit(50),
  ])

  const viaggi: Viaggio[] = []

  for (const p of prenotazioni ?? []) {
    const c = p.corse as unknown as RigaCorsa
    viaggi.push({
      id: p.id,
      ruolo: 'passeggero',
      stato: p.stato,
      oraPartenza: c.ora_partenza,
      origineLabel: c.origine_label,
      destinazioneLabel: c.destinazione_label,
      importoCent: p.catturato_cent ?? p.totale_cent,
      altri: 0,
      daFare: p.stato === 'richiesta'
        ? 'In attesa di risposta'
        : p.stato === 'catturata' && p.esito === 'atteso'
            && new Date(c.ora_partenza).getTime() < adesso
          ? "Dicci se è andata male"
          : undefined,
    })
  }

  for (const c of guidate ?? []) {
    const attive = ((c.prenotazioni ?? []) as unknown as Array<{ stato: string }>)
      .filter((x) => !['rifiutata', 'scaduta', 'annullata'].includes(x.stato))
    const proposte = attive.filter((x) => x.stato === 'richiesta').length
    const minuti = (new Date(c.ora_partenza).getTime() - adesso) / 60_000

    // Il numero che interessa a chi guida è quanto rientra, non quanto
    // paga. Con nessuno a bordo non c'è ancora un numero: si mostra niente.
    const aBordo = attive.filter((x) => x.stato !== 'richiesta')
    let rientro: number | null = null
    if (aBordo.length > 0) {
      const km = Number(c.km_base)
      const cKm = Number((c.veicoli as unknown as { centesimi_per_km: number } | null)?.centesimi_per_km ?? 0)
      if (km > 0 && cKm > 0) {
        const corsa: Corsa = {
          modalita: c.modalita, kmBase: km, centesimiPerKm: cKm,
          pedaggio: c.pedaggio_cent, parcheggio: c.parcheggio_cent,
          postiOfferti: c.posti_offerti, scontoConducente: c.sconto_cent,
        }
        try {
          rientro = preventivo(corsa, aBordo.map((_, i) => ({
            id: `p${i}`, kmDeviazione: 0,
          }))).nettoConducente
        } catch { rientro = null }
      }
    }

    viaggi.push({
      id: c.id,
      ruolo: 'conducente',
      stato: c.stato,
      oraPartenza: c.ora_partenza,
      origineLabel: c.origine_label,
      destinazioneLabel: c.destinazione_label,
      importoCent: rientro,
      altri: aBordo.length,
      daFare: proposte > 0
        ? `${proposte} ${proposte === 1 ? 'richiesta' : 'richieste'} da guardare`
        : c.stato === 'pubblicata' && minuti <= 180 && minuti > 0 && attive.length > 0
          ? 'Conferma che parti'
          : undefined,
    })
  }

  // Chi ha qualcosa da fare va in cima, poi chi parte prima: la schermata
  // deve rispondere a «di cosa mi devo occupare adesso», non elencare.
  const futuri = viaggi
    .filter((v) => new Date(v.oraPartenza).getTime() > adesso - 3 * 3600_000)
    .sort((a, b) => {
      if (!!a.daFare !== !!b.daFare) return a.daFare ? -1 : 1
      return new Date(a.oraPartenza).getTime() - new Date(b.oraPartenza).getTime()
    })
  const passati = viaggi
    .filter((v) => new Date(v.oraPartenza).getTime() <= adesso - 3 * 3600_000)
    .sort((a, b) => new Date(b.oraPartenza).getTime() - new Date(a.oraPartenza).getTime())

  return <Telaio larga attiva="/viaggi"><IMieiViaggi prossimi={futuri} passati={passati} /></Telaio>
}

interface RigaCorsa {
  id: string; ora_partenza: string
  origine_label: string; destinazione_label: string; conducente: string
}
