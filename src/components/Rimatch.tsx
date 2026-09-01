import { euro } from './base.tsx'
import { SegnoAvanti } from './segni.tsx'

/**
 * Sei rimasto a piedi. Ecco cosa c'è.
 *
 * Chi arriva qui non sta navigando: sta in piedi da qualche parte, spesso
 * di notte, e ha appena letto che il suo passaggio è saltato. La schermata
 * ha un compito solo — mettergli davanti le alternative, subito, senza
 * spiegazioni e senza scuse in cima.
 *
 * Le scuse stanno in fondo, dopo le alternative. Chi ha una strada per
 * tornare non le legge, e chi non ce l'ha le legge dopo aver visto che non
 * c'è: è l'ordine giusto in tutti e due i casi.
 */

interface Alternativa {
  id: string
  oraPartenza: string
  oraArrivo: string
  prezzoCent: number
  postiLiberi: number
  fermataPronta: boolean
  ritiro: string | null
  scartoM: number
}

export function Rimatch({ destinazione, origine, oraPersa, alternative }: {
  destinazione: string
  origine: string
  oraPersa: string
  alternative: Alternativa[]
}) {
  return (
    <>
      <div className="fascia testata">
        <div className="dentro dentro-app testata-dentro">
          <div>
            <h1 className="t-titolo testata-titolo">
              {alternative.length > 0
                ? 'Il tuo passaggio è saltato. Questi ci sono.'
                : 'Il tuo passaggio è saltato'}
            </h1>
            <p className="testata-sotto">
              Verso {destinazione}, da {origine}, per le {oraPersa}.
              Non ti abbiamo addebitato niente.
            </p>
          </div>
        </div>
      </div>

      <div className="fascia">
        <div className="dentro dentro-app casa-dentro">

          {alternative.length > 0 ? (
            <section className="casa-sezione">
              <div className="griglia-elenco">
                {alternative.map((a) => (
                  <a key={a.id} href={`/corsa/${a.id}`} className="strada">
                    <span className="cresci">
                      <span className="strada-orario">
                        <span className="numero">{a.oraPartenza}</span>
                        <span className="strada-freccia">→</span>
                        <span className="numero">{a.oraArrivo}</span>
                      </span>
                      <span className="strada-sotto">
                        {a.ritiro
                          ? `Ti prende a ${a.ritiro}`
                          : 'Devi proporre un punto di ritiro'}
                        {a.scartoM > 400 && ` · ${Math.round(a.scartoM / 100) / 10} km da dove eri`}
                        {!a.fermataPronta && ' · va accettato'}
                      </span>
                    </span>
                    <span className="strada-prezzo numero">{euro(a.prezzoCent)}</span>
                    <span className="strada-azione"><SegnoAvanti dimensione={16} /></span>
                  </a>
                ))}
              </div>
            </section>
          ) : (
            <section className="casa-sezione">
              <div className="vuoto-leggero">
                <p className="vuoto-titolo">Al momento non c&apos;è nient&apos;altro</p>
                <p className="vuoto-testo">
                  Abbiamo già registrato dove devi andare: se qualcuno pubblica
                  su questa strada nelle prossime ore, ti avvisiamo per primo.
                  Nel frattempo puoi guardare da te.
                </p>
                <a href="/cerca" className="azione azione-piena"
                  style={{ marginTop: 'var(--s4)' }}>
                  Cerca un passaggio <SegnoAvanti dimensione={16} />
                </a>
              </div>
            </section>
          )}

          {/* Le scuse in fondo, dopo le alternative: chi ha una strada per
              tornare non le legge, e chi non ce l'ha le legge dopo aver
              visto che non c'è. */}
          <section className="casa-sezione">
            <div className="nota-guida">
              <p className="occhiello">Cosa è successo</p>
              <p className="nota-guida-testo">
                Chi guidava ha annullato, o non ha confermato in tempo. Non è
                colpa tua e non ti costa niente: la carta è già stata
                liberata. L&apos;annullamento resta sul suo profilo, dove chi
                prenota lo vede.
              </p>
            </div>
          </section>
        </div>
      </div>
    </>
  )
}
