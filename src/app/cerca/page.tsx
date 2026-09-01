import { redirect } from 'next/navigation'
import { cerca, alternativeVicine } from '../../server/ricerca.ts'
import { db } from '../../server/db.ts'
import { Telaio } from '../../components/Telaio.tsx'
import { Risultati, type Risultato } from '../../components/Risultati.tsx'
import { RiapriRicerca } from '../../components/RiapriRicerca.tsx'
import { guscio } from '../../server/guscio.ts'
import { statoMappa } from '../../server/mappe.ts'
import { centroPer } from '../../server/centro.ts'
import { giorno, orario } from '../../lib/tempo.ts'

export const dynamic = 'force-dynamic'

/**
 * I risultati.
 *
 * Due colonne sulla scrivania: l'elenco a sinistra, largo quanto serve a
 * confrontare, e a destra la colonna che aiuta a decidere — cosa hai
 * chiesto, quanto costerebbe altrimenti, e la via d'uscita se non c'è
 * niente. Non una mappa: il percorso di una corsa lo sappiamo, ma disegnare
 * quaranta polilinee su una mappa a pagamento per una schermata di elenco è
 * spendere dove non serve.
 *
 * Su telefono la colonna di destra scende sotto l'elenco, dove diventa la
 * risposta a «e adesso?» invece di un ingombro prima dei risultati.
 */
export default async function Pagina({ searchParams }: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const q = await searchParams
  const num = (k: string) => Number(q[k])

  // Arrivando da un posto la destinazione c'è ma la partenza no: si torna
  // alla ricerca con la destinazione già dentro, invece di dire «manca un
  // campo» a chi ha appena toccato un pulsante che credeva completo.
  if (!Number.isFinite(num('olat')) && Number.isFinite(num('dlat'))) {
    redirect(`/?${new URLSearchParams({ dlat: q.dlat!, dlng: q.dlng!, dove: q.dove ?? '' })}`)
  }

  const g = await guscio()

  if (!Number.isFinite(num('olat')) || !Number.isFinite(num('dlat'))) {
    return (
      <Telaio attiva="/" {...g} modo="passeggero">
        <div className="dentro dentro-app" style={{ padding: 'var(--s8) 0' }}>
          <h1 className="t-sezione">Dicci da dove parti e dove vai.</h1>
          <a href="/" className="azione azione-piena" style={{ marginTop: 'var(--s5)' }}>
            Torna alla ricerca
          </a>
        </div>
      </Telaio>
    )
  }

  const filtri = {
    origine: { lat: num('olat'), lng: num('olng') },
    destinazione: { lat: num('dlat'), lng: num('dlng') },
    // I nomi dei due capi servono al diario: «Lodi → Milano» dice dove
    // manca un conducente, due coppie di coordinate no.
    origineLabel: q.parti || undefined,
    destinazioneLabel: q.dove || undefined,
    da: new Date(q.da ?? Date.now()),
    a: new Date(q.a ?? Date.now() + 12 * 3600_000),
    posti: Number(q.posti ?? 1),
    // Le proprie corse non si prenotano: mostrarle sarebbe mandare chi
    // cerca dall'altra parte dell'applicazione.
    escludi: g.utente,
  }

  const [trovati, { attiva: mappa }, vicino] = await Promise.all([
    cerca(filtri),
    statoMappa().catch(() => ({ attiva: false })),
    centroPer(g.utente),
  ])
  const allargati = trovati.length === 0 ? await alternativeVicine(filtri) : []
  const risultati = await arricchisci([...trovati, ...allargati])
  const chiaviTrovate = new Set(trovati.map((r) => r.corsaId))

  const dove = q.dove || 'la tua destinazione'
  const parti = q.parti || 'dove sei'

  return (
    <Telaio attiva="/" {...g} modo="passeggero">
      <div className="fascia">
        <div className="dentro dentro-app risultati-dentro">

          {/* ── Cosa hai chiesto, e come cambiarlo ── */}
          <div className="risultati-testa">
            <div className="cresci">
              <p className="occhiello">
                {trovati.length === 0
                  ? 'Nessun passaggio a quell’ora'
                  : `${trovati.length} ${trovati.length === 1 ? 'passaggio' : 'passaggi'}`}
              </p>
              <h1 className="t-sezione" style={{ marginTop: 'var(--s2)' }}>
                {parti} <span className="verso" aria-label="verso">→</span> {dove}
              </h1>
              <p className="t-nota" style={{ marginTop: 'var(--s2)' }}>
                {giorno(filtri.da)}, fra le {orario(filtri.da)} e le {orario(filtri.a)}
              </p>
            </div>
            <RiapriRicerca mappa={mappa} vicino={vicino} />
          </div>

          <div className="risultati-corpo">
            <div>
              <Risultati
                risultati={risultati.filter((r) => chiaviTrovate.has(r.corsaId))}
                allargati={risultati.filter((r) => !chiaviTrovate.has(r.corsaId))}
              />
            </div>

            <aside className="colonna-decisione">
              <div className="decisione">
                <p className="occhiello">Perché conviene</p>
                <p className="decisione-testo">
                  Su GO non paghi un passaggio: paghi la tua parte delle spese
                  di un viaggio che si sarebbe fatto comunque. Per questo le
                  cifre che vedi non somigliano a una tariffa.
                </p>
                <div className="decisione-riga" />
                <p className="decisione-voce">
                  <strong>La carta non viene addebitata subito.</strong> La
                  blocchiamo alla prenotazione e la addebitiamo quando il
                  viaggio parte davvero.
                </p>
                <p className="decisione-voce">
                  <strong>Il posto è tuo appena prenoti</strong> — o appena chi
                  guida accetta, se hai chiesto una deviazione.
                </p>
              </div>

              <a href="/cerco" className="decisione-uscita">
                <span className="cresci">
                  <span className="invito-forte">Non trovi quello che serve?</span>
                  <span className="invito-debole">
                    Dicci che stai cercando: ti avvisiamo appena qualcuno pubblica.
                  </span>
                </span>
              </a>
            </aside>
          </div>
        </div>
      </div>
    </Telaio>
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
      partenzaLabel: r.fermataPronta ? c?.origine_label ?? '' : 'Passa vicino a te',
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
