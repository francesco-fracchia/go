import { daModerare } from '../../server/recensioni.ts'
import { codaSegnalazioni, sospesi, osservati, eModeratore } from '../../server/moderazione.ts'
import { richiediUtente } from '../../server/auth.ts'
import { quando, giorno } from '../../lib/tempo.ts'
import { Riquadro, Etichetta } from '../../components/base.tsx'
import { ModeraRecensione } from '../../components/ModeraRecensione.tsx'
import { DecidiSegnalazione, Riattiva } from '../../components/DecidiSegnalazione.tsx'

export const dynamic = 'force-dynamic'

const NOME_TIPO: Record<string, string> = {
  alcol: 'aveva bevuto',
  molestia: 'molestia',
  guida_pericolosa: 'guida pericolosa',
  noshow: 'non si è presentato',
  altro: 'altro',
}

const Punto = () => (
  <span aria-hidden style={{ color: 'var(--riga)', fontSize: 11 }}>·</span>
)

function Sezione({ titolo, sotto, children }: {
  titolo: string; sotto: string; children: React.ReactNode
}) {
  return (
    <section style={{ marginBottom: 38 }}>
      <h2 style={{ fontSize: 19, margin: '0 0 4px' }}>{titolo}</h2>
      <p style={{ margin: '0 0 16px', color: 'var(--tenue)', fontSize: 14 }}>{sotto}</p>
      <div style={{ display: 'grid', gap: 12 }}>{children}</div>
    </section>
  )
}

/**
 * La coda di moderazione.
 *
 * Sta dietro un elenco di identificativi in una variabile d'ambiente e non
 * dietro un ruolo nel database: finché a moderare è una persona sola, un
 * sistema di ruoli è complessità senza utilità — e una superficie in più da
 * sbagliare.
 *
 * L'ordine delle sezioni è l'ordine dell'urgenza. Le segnalazioni stanno in
 * cima perché sono l'unica cosa qui che riguarda l'incolumità di qualcuno,
 * e perché a ogni sospensione automatica corrisponde una persona che ha
 * ricevuto la promessa che qualcuno avrebbe guardato.
 */
export default async function Pagina() {
  const utente = await richiediUtente()
  if (!eModeratore(utente)) {
    return (
      <main style={{ padding: 40, textAlign: 'center', color: 'var(--tenue)' }}>
        Non hai accesso a questa pagina.
      </main>
    )
  }

  const [coda, fermi, recensioni, oss] = await Promise.all([
    codaSegnalazioni(), sospesi(), daModerare(), osservati(),
  ])

  const nulla = coda.length === 0 && fermi.length === 0
    && recensioni.length === 0 && oss.conducenti.length === 0

  return (
    <main style={{ maxWidth: 660, margin: '0 auto', padding: '24px 20px 60px' }}>
      <h1 style={{ fontSize: 26, marginBottom: 22 }}>Moderazione</h1>

      {nulla && (
        <p style={{ color: 'var(--tenue)', fontSize: 15 }}>
          Niente in coda: nessuna segnalazione aperta, nessun account fermo,
          nessun commento in attesa.
        </p>
      )}

      {coda.length > 0 && (
        <Sezione
          titolo={`Segnalazioni aperte · ${coda.length}`}
          sotto="Prima di decidere, senti tutti e due. Il contatto di chi ha segnalato è qui perché serve a quello."
        >
          {coda.map((s) => (
            <Riquadro key={s.id}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                <Etichetta tono={s.grave ? 'accento' : 'tenue'}>
                  {NOME_TIPO[s.tipo] ?? s.tipo}
                </Etichetta>
                {/* Le etichette sono testo nudo, non pastiglie: tre di fila si
                    leggerebbero come una frase sola — «aveva bevuto account
                    fermo un'altra aperta». Il punto le separa senza cambiare
                    un componente che tutto il resto usa una alla volta. */}
                {s.accusato?.sospeso && (
                  <><Punto /><Etichetta tono="accento">account fermo</Etichetta></>
                )}
                {s.altre > 0 && (
                  <><Punto /><Etichetta tono="tenue">
                    {s.altre === 1 ? "un'altra aperta" : `altre ${s.altre} aperte`}
                  </Etichetta></>
                )}
                <span style={{ marginLeft: 'auto', fontSize: 12.5, color: 'var(--tenue)' }}>
                  {quando(s.creata_il)}
                </span>
              </div>

              <div style={{ fontSize: 14.5, lineHeight: 1.6, marginBottom: 10 }}>
                <div>
                  <strong>Accusato:</strong>{' '}
                  {s.accusato ? s.accusato.nome : 'non ricostruibile da questa riga'}
                </div>
                <div>
                  <strong>Ha segnalato:</strong> {s.autore?.nome ?? '—'}
                  {s.autore?.telefono && (
                    <> · <a href={`tel:${s.autore.telefono}`}>{s.autore.telefono}</a></>
                  )}
                  {s.autore?.email && <> · {s.autore.email}</>}
                </div>
                {s.corsa && (
                  <div style={{ color: 'var(--tenue)' }}>
                    {s.corsa.partenza} → {s.corsa.destinazione} · {giorno(s.corsa.ora)}
                  </div>
                )}
              </div>

              {s.nota && (
                <p style={{
                  margin: '0 0 14px', fontSize: 15, lineHeight: 1.55,
                  padding: '10px 12px', borderRadius: 'var(--raggio-s)',
                  background: 'var(--superficie)',
                }}>
                  «{s.nota}»
                </p>
              )}

              <DecidiSegnalazione id={s.id} />
            </Riquadro>
          ))}
        </Sezione>
      )}

      {fermi.length > 0 && (
        <Sezione
          titolo={`Account fermi · ${fermi.length}`}
          sotto="La sospensione è cautelare. Resta finché qualcuno non decide, e chi decide sei tu."
        >
          {fermi.map((p) => (
            <Riquadro key={p.id}>
              <div style={{ fontSize: 15, marginBottom: 4 }}>
                <strong>{p.nome} {p.cognome ?? ''}</strong>
              </div>
              <div style={{ fontSize: 13.5, color: 'var(--tenue)', marginBottom: 14 }}>
                {[p.telefono, p.email].filter(Boolean).join(' · ') || 'nessun contatto'}
              </div>
              <Riattiva id={p.id} />
            </Riquadro>
          ))}
        </Sezione>
      )}

      {recensioni.length > 0 && (
        <Sezione
          titolo={`Commenti da leggere · ${recensioni.length}`}
          sotto="Il giudizio è già pubblico: qui si decide solo del testo."
        >
          {recensioni.map((r) => {
            const autore = r.autore as unknown as { nome: string } | null
            const dest = r.destinatario as unknown as { nome: string } | null
            return (
              <Riquadro key={r.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <Etichetta tono={r.positiva ? 'verde' : 'tenue'}>
                    {r.positiva ? 'positiva' : 'negativa'}
                  </Etichetta>
                  <span style={{ fontSize: 12.5, color: 'var(--tenue)' }}>
                    {autore?.nome} → {dest?.nome}
                  </span>
                </div>
                {r.tag?.length > 0 && (
                  <div style={{ fontSize: 13, color: 'var(--tenue)', marginBottom: 8 }}>
                    {r.tag.join(' · ')}
                  </div>
                )}
                <p style={{ margin: '0 0 14px', fontSize: 15, lineHeight: 1.55 }}>«{r.testo}»</p>
                <ModeraRecensione id={r.id} />
              </Riquadro>
            )
          })}
        </Sezione>
      )}

      {oss.soglie && oss.conducenti.length > 0 && (
        <Sezione
          titolo={`Da guardare · ${oss.conducenti.length}`}
          sotto={`Oltre ${oss.soglie.corse_settimana_avviso} corse in una settimana o ${oss.soglie.corse_anno_avviso} in un anno. Non è un divieto: chi fa la stessa tratta ogni giorno per lavoro è il caso normale, non un trasportatore. Si guarda se la stessa tratta, agli stessi orari, con le stesse persone, comincia a somigliare a un servizio di linea.`}
        >
          {oss.conducenti.map((c) => (
            <Riquadro key={c.conducente}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ fontSize: 15 }}>
                  <strong>{c.profilo?.nome ?? '—'} {c.profilo?.cognome ?? ''}</strong>
                  <div style={{ fontSize: 13.5, color: 'var(--tenue)', marginTop: 2 }}>
                    ultima corsa {quando(c.ultima_corsa)}
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: 13.5, fontVariantNumeric: 'tabular-nums' }}>
                  <div>{c.corse_7g} <span style={{ color: 'var(--tenue)' }}>in 7 giorni</span></div>
                  <div>{c.corse_365g} <span style={{ color: 'var(--tenue)' }}>in un anno</span></div>
                </div>
              </div>
            </Riquadro>
          ))}
        </Sezione>
      )}
    </main>
  )
}
