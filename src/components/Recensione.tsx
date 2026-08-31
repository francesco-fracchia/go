'use client'
import { useState } from 'react'
import { SegnoAvanti } from './segni.tsx'
import { Bottone, Etichetta } from './base.tsx'

/**
 * Lasciare una recensione.
 *
 * Niente stelle. «È andata bene» oppure «c'è stato un problema», e basta.
 * Una media su venti viaggi non distingue il conducente pessimo da quello
 * che una volta è arrivato tardi, e spinge tutti verso il quattro e mezzo:
 * i distintivi ricavati dai fatti — «non annulla mai» — dicono molto di più.
 *
 * Il testo è facoltativo e passa dalla moderazione. Su un prodotto dove si
 * sale in macchina con sconosciuti di notte, una diffamazione pubblicata
 * anche solo per due ore è un danno che non si ripara.
 */

/**
 * Fatti, non virtù.
 *
 * «Simpatico» giudicava una persona, non un viaggio: infalsificabile, chi
 * lo riceve non può farci niente, e porta dentro tutti i pregiudizi
 * possibili — è un aggettivo che si assegna in modo diverso a seconda del
 * genere, dell'accento, dell'età. Era anche la cosa che metteva a disagio
 * a compilarla, che è il motivo per cui quasi nessuno lascia recensioni.
 *
 * L'asse è cambiato: non «che persona è», ma «cosa deve aspettarsi il
 * prossimo». Ogni voce qui è una cosa che chi c'era può confermare.
 */
const FATTI: Record<'conducente' | 'passeggero', { bene: string[]; male: string[] }> = {
  // Cosa dico di CHI GUIDAVA, se sono salito.
  conducente: {
    bene: [
      'è partito all\u2019ora che aveva detto',
      'il punto di ritiro era quello concordato',
      'l\u2019auto era come descritta',
      'mi sono sentito a mio agio come guidava',
    ],
    male: [
      'è partito in ritardo',
      'ha cambiato il punto di ritiro',
      'l\u2019auto non era come descritta',
      'non mi sono sentito a mio agio come guidava',
    ],
  },
  // Cosa dico di CHI È SALITO, se guidavo io.
  passeggero: {
    bene: [
      'era al punto d\u2019incontro all\u2019ora',
      'ha scritto quando è servito',
      'il bagaglio era quello annunciato',
      'ha lasciato l\u2019auto come l\u2019ha trovata',
    ],
    male: [
      'ha fatto aspettare',
      'non ha risposto ai messaggi',
      'aveva più bagaglio di quanto detto',
    ],
  },
}

/**
 * Descrizioni, non voti.
 *
 * Alcune cose non sono né buone né cattive: sono compatibilità. Trasformare
 * «si è viaggiato in silenzio» in un voto renderebbe un introverso
 * peggiore di un altro. Lasciarlo come fatto costruisce una cosa più utile
 * di una reputazione — un'aspettativa: chi vuole dormire alle quattro di
 * notte sa che è la macchina giusta.
 *
 * Perciò stanno in una colonna loro, non concorrono al positivo o
 * negativo, e si mostrano solo quando RICORRONO.
 */
const DESCRITTORI: Array<{ nome: string; voci: string[] }> = [
  { nome: 'In macchina', voci: ['si è chiacchierato', 'si è viaggiato in silenzio'] },
  { nome: 'Musica', voci: ['musica alta', 'musica bassa', 'niente musica'] },
  { nome: 'Il viaggio', voci: ['una sosta', 'filati dritti'] },
]

export function Recensione({ prenotazione, nome, ruolo }: {
  prenotazione: string
  nome: string
  /** Chi sto recensendo: chi guidava, o chi è salito. Le domande cambiano. */
  ruolo: 'conducente' | 'passeggero'
}) {
  const [positiva, setPositiva] = useState<boolean | null>(null)
  const [tag, setTag] = useState<string[]>([])
  const [descrittori, setDescrittori] = useState<string[]>([])
  const [testo, setTesto] = useState('')
  const [inviata, setInviata] = useState(false)

  if (inviata) {
    return (
      <main style={{ maxWidth: 'var(--colonna)', margin: '0 auto', padding: '60px 20px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>Grazie</h1>
        <p style={{ color: 'var(--inchiostro-2)', fontSize: 15 }}>
          {testo.trim()
            ? 'Il giudizio è già visibile. Il commento lo leggiamo prima di pubblicarlo.'
            : 'Aiuta chi prenoterà dopo di te.'}
        </p>
      </main>
    )
  }

  const disponibili = positiva === null ? []
    : positiva ? FATTI[ruolo].bene : FATTI[ruolo].male

  return (
    <main className="schermo-stretto">
      {/* La domanda che si fa a un amico, non a un modulo. E una sola
          domanda di sintesi: niente stelle. Una media a cinque stelle su
          una piattaforma di passaggi converge a 4,8 e smette di dire
          qualsiasi cosa. */}
      <h1 style={{ fontSize: 26, marginBottom: 8 }}>Com&apos;è andato il viaggio?</h1>
      <p className="t-guida" style={{ marginBottom: 22 }}>
        Con {nome}. Nessuno vede la tua finché non ha scritto anche
        {ruolo === 'conducente' ? ' chi guidava' : ' chi è salito'}.
      </p>

      <Etichetta>rifaresti un viaggio con {nome}</Etichetta>
      <div style={{ display: 'flex', gap: 10, margin: '10px 0 22px' }}>
        <Scelta attiva={positiva === true} onClick={() => { setPositiva(true); setTag([]) }}
          testo="Sì" tono="verde" />
        <Scelta attiva={positiva === false} onClick={() => { setPositiva(false); setTag([]) }}
          testo="No" tono="rosso" />
      </div>

      {positiva !== null && (
        <>
          <Etichetta>cosa in particolare</Etichetta>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '10px 0 22px' }}>
            {disponibili.map((t) => {
              const scelto = tag.includes(t)
              return (
                <button key={t}
                  onClick={() => setTag((v) => scelto ? v.filter((x) => x !== t) : [...v, t])}
                  style={{
                    fontSize: 14, padding: '9px 14px', borderRadius: 999,
                    border: `1px solid ${scelto ? 'transparent' : 'var(--riga)'}`,
                    background: scelto ? 'var(--accento)' : 'var(--superficie)',
                    color: scelto ? 'var(--su-accento)' : 'var(--inchiostro)',
                  }}>{t}</button>
              )
            })}
          </div>

          {/* Né bene né male: come è andata. */}
          <Etichetta>com&apos;era il viaggio</Etichetta>
          <div style={{ margin: '10px 0 22px', display: 'grid', gap: 12 }}>
            {DESCRITTORI.map((gruppo) => (
              <div key={gruppo.nome}>
                <div style={{ fontSize: 12.5, color: 'var(--tenue)', marginBottom: 6 }}>
                  {gruppo.nome}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {gruppo.voci.map((v) => {
                    const preso = descrittori.includes(v)
                    return (
                      <button key={v} type="button"
                        onClick={() => setDescrittori((d) => preso
                          // Uno per gruppo: sono alternative, non un elenco.
                          ? d.filter((x) => x !== v)
                          : [...d.filter((x) => !gruppo.voci.includes(x)), v])}
                        style={{
                          fontSize: 14, padding: '9px 14px', borderRadius: 999,
                          border: `1px solid ${preso ? 'var(--inchiostro)' : 'var(--riga)'}`,
                          background: preso ? 'var(--superficie-2)' : 'var(--superficie)',
                          color: 'var(--inchiostro)',
                        }}>{v}</button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          <Etichetta>vuoi aggiungere qualcosa</Etichetta>
          <textarea
            value={testo} onChange={(e) => setTesto(e.target.value)}
            placeholder="Facoltativo"
            rows={3}
            style={{
              width: '100%', marginTop: 10, padding: 13, fontSize: 15,
              fontFamily: 'var(--testo)', borderRadius: 'var(--raggio-s)',
              border: '1px solid var(--riga)', background: 'var(--superficie)',
              color: 'var(--inchiostro)', resize: 'vertical',
            }}
          />
          <p style={{ fontSize: 12.5, color: 'var(--tenue)', margin: '8px 0 20px', lineHeight: 1.5 }}>
            Il commento lo leggiamo prima di pubblicarlo. Il giudizio, invece,
            vale subito.
          </p>

          {/* La strada per le cose gravi è visibile ma separata, e lo dice
              anche nel modo in cui è scritta: non è un'etichetta in più, è
              un altro posto dove si va. */}
          <a href={`/segnala/${prenotazione}`} className="verso-segnalazione">
            <span className="cresci">
              <span className="verso-forte">È successo qualcosa di grave?</span>
              <span className="verso-debole">
                Ha bevuto, guidava in modo pericoloso, si è comportato male.
                Non è una recensione: la leggiamo noi, e può sospendere un account.
              </span>
            </span>
            <SegnoAvanti dimensione={16} />
          </a>

          <Bottone onClick={async () => {
            await fetch('/api/recensioni', {
              method: 'POST', headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ prenotazione, positiva, tag, descrittori, testo }),
            })
            setInviata(true)
          }}>Invia</Bottone>
        </>
      )}
    </main>
  )
}

function Scelta({ attiva, onClick, testo, tono }: {
  attiva: boolean; onClick: () => void; testo: string; tono: 'verde' | 'rosso'
}) {
  const colore = tono === 'verde' ? 'var(--verde)' : 'var(--rosso)'
  const velo = tono === 'verde' ? 'var(--verde-velo)' : 'var(--rosso-velo)'
  return (
    <button onClick={onClick} className="tocco" style={{
      flex: 1, padding: '18px 12px', borderRadius: 'var(--raggio)',
      border: `1px solid ${attiva ? colore : 'var(--riga)'}`,
      background: attiva ? velo : 'var(--superficie)',
      color: attiva ? colore : 'var(--inchiostro)',
      fontWeight: 600, fontSize: 17, fontFamily: 'var(--titoli)',
    }}>{testo}</button>
  )
}
