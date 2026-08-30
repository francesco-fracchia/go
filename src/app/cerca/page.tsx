import { redirect } from 'next/navigation'
import { cerca, alternativeVicine } from '../../server/ricerca.ts'
import { db } from '../../server/db.ts'
import { Risultati, type Risultato } from '../../components/Risultati.tsx'
import { Etichetta } from '../../components/base.tsx'

export const dynamic = 'force-dynamic'

export default async function Pagina({ searchParams }: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const q = await searchParams
  const num = (k: string) => Number(q[k])

  // Arrivando da un posto la destinazione c'è ma la partenza no: si torna
  // alla ricerca con la destinazione già dentro, invece di dire «manca un
  // campo» a chi ha appena toccato un pulsante che credeva completo.
  if (!Number.isFinite(num('olat')) && Number.isFinite(num('dlat'))) {
    const p = new URLSearchParams({
      dlat: q.dlat!, dlng: q.dlng!, dove: q.dove ?? '',
    })
    redirect(`/?${p}`)
  }

  if (!Number.isFinite(num('olat')) || !Number.isFinite(num('dlat'))) {
    return (
      <main style={{ maxWidth: 480, margin: '0 auto', padding: '40px 20px', textAlign: 'center' }}>
        <p style={{ color: 'var(--tenue)' }}>Dicci da dove parti e dove vai.</p>
        <a href="/" style={{ fontWeight: 600 }}>Torna alla ricerca</a>
      </main>
    )
  }

  const filtri = {
    origine: { lat: num('olat'), lng: num('olng') },
    destinazione: { lat: num('dlat'), lng: num('dlng') },
    da: new Date(q.da ?? Date.now()),
    a: new Date(q.a ?? Date.now() + 12 * 3600_000),
    posti: Number(q.posti ?? 1),
  }

  const trovati = await cerca(filtri)
  const allargati = trovati.length === 0 ? await alternativeVicine(filtri) : []
  const risultati = await arricchisci([...trovati, ...allargati])
  const chiaviTrovate = new Set(trovati.map((r) => r.corsaId))

  return (
    <main style={{ maxWidth: 480, margin: '0 auto', padding: '20px 20px 40px' }}>
      <a href="/" style={{ fontSize: 14, textDecoration: 'none' }}>← Cambia ricerca</a>
      <div style={{ margin: '16px 0 18px' }}>
        <Etichetta>
          {trovati.length === 0
            ? 'niente a quell’ora'
            : `${trovati.length} ${trovati.length === 1 ? 'passaggio' : 'passaggi'}`}
        </Etichetta>
      </div>
      <Risultati
        risultati={risultati.filter((r) => chiaviTrovate.has(r.corsaId))}
        allargati={risultati.filter((r) => !chiaviTrovate.has(r.corsaId))}
      />
    </main>
  )
}

/**
 * La ricerca restituisce identificativi e prezzi; qui si aggiungono i volti.
 *
 * Si fa in una query sola per tutti i conducenti: una per riga sarebbe una
 * lista che si carica a scatti — e con quattro risultati non si nota, con
 * quaranta sì.
 */
async function arricchisci(base: Array<{
  corsaId: string; conducente: string; oraPartenza: string; oraArrivo: string
  postiLiberi: number; prezzoDa: number; fermataPronta: boolean
  kmDeviazione: number; flessibileMin: number
}>): Promise<Risultato[]> {
  if (base.length === 0) return []

  const [{ data: corse }, { data: profili }, { data: dist }] = await Promise.all([
    db.from('corse')
      .select('id, origine_label, destinazione_label, veicoli(marca, modello)')
      .in('id', base.map((r) => r.corsaId)),
    db.from('profili')
      .select('id, nome, foto_url')
      .in('id', [...new Set(base.map((r) => r.conducente))]),
    db.from('distintivi_conducenti')
      .select('conducente, mai_annullato, veterano, affidabile')
      .in('conducente', [...new Set(base.map((r) => r.conducente))]),
  ])

  const perCorsa = new Map((corse ?? []).map((c) => [c.id, c]))
  const perProfilo = new Map((profili ?? []).map((p) => [p.id, p]))
  const perDist = new Map((dist ?? []).map((d) => [d.conducente, d]))

  return base.map((r): Risultato => {
    const c = perCorsa.get(r.corsaId)
    const p = perProfilo.get(r.conducente)
    const d = perDist.get(r.conducente)
    const distintivi: string[] = []
    if (d?.mai_annullato) distintivi.push('non annulla mai')
    if (d?.veterano) distintivi.push('veterano')
    else if (d?.affidabile) distintivi.push('affidabile')

    return {
      corsaId: r.corsaId,
      oraPartenza: r.oraPartenza,
      oraArrivo: r.oraArrivo,
      partenzaLabel: r.fermataPronta
        ? c?.origine_label ?? ''
        : `Passa vicino a te`,
      arrivoLabel: c?.destinazione_label ?? '',
      postiLiberi: r.postiLiberi,
      prezzoDa: r.prezzoDa,
      fermataPronta: r.fermataPronta,
      kmDeviazione: r.kmDeviazione,
      flessibileMin: r.flessibileMin,
      conducente: { nome: p?.nome ?? '', fotoUrl: p?.foto_url ?? null, distintivi },
      veicolo: (c?.veicoli as unknown as { marca: string; modello: string }) ?? { marca: '', modello: '' },
    }
  })
}
