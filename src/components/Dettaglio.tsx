import { Riquadro, Bottone, Etichetta, euro } from './base.tsx'
import { Prenota, type Metodo } from './Prenota.tsx'

/**
 * Il dettaglio di una corsa: dove si decide.
 *
 * Il prezzo è un numero grande e solo. La scomposizione c'è, ma sotto e
 * chiusa: chi sta decidendo guarda quanto spende e con chi va, non come
 * si divide la cifra. Aperta di default sposterebbe l'attenzione sulla
 * commissione invece che sul risparmio — e non aiuterebbe nessuno.
 *
 * In fondo, la dichiarazione che questo è un passaggio fra privati. Non è
 * cavillo legale nascosto nelle condizioni: è l'informazione che dice al
 * passeggero con che cosa ha a che fare, e va letta prima di prenotare.
 */

export interface DatiCorsa {
  id: string
  oraPartenza: string
  oraArrivo: string
  fermate: Array<{ etichetta: string; orario: string; tipo: 'partenza' | 'ritiro' | 'destinazione' }>
  postiLiberi: number
  quotaCent: number
  feeCent: number
  totaleCent: number
  confrontoTaxiCent?: number
  fermataPronta: boolean
  kmDeviazione: number
  accettaDeviazioni: boolean
  prenotaImmediata: boolean
  politica: 'flessibile' | 'rigida'
  note?: string
  ritorno?: { id: string; orario: string } | null
  conducente: {
    nome: string; fotoUrl: string | null; eta?: number
    corseConcluse: number; distintivi: string[]
  }
  veicolo: {
    marca: string; modello: string; colore: string | null
    fumo: boolean; animali: boolean; bagagliGrandi: boolean
  }
}

export function Dettaglio({ c, metodo }: { c: DatiCorsa; metodo?: Metodo | null }) {
  const risparmio = c.confrontoTaxiCent ? c.confrontoTaxiCent - c.totaleCent : 0

  return (
    <main style={{ maxWidth: 480, margin: '0 auto', padding: '18px 20px 40px' }}>
      {/* ── Il percorso, con le fermate in mezzo ── */}
      <Riquadro stile={{ marginBottom: 14 }}>
        {c.fermate.map((f, i) => (
          <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <div style={{ flexShrink: 0, width: 46, textAlign: 'right', paddingTop: 1 }}>
              <span style={{
                fontFamily: 'var(--titoli)', fontWeight: 600, fontSize: 15,
                color: f.tipo === 'ritiro' ? 'var(--tenue)' : 'var(--inchiostro)',
              }}>{f.orario}</span>
            </div>
            <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{
                width: 9, height: 9, borderRadius: 5, marginTop: 6,
                border: '2px solid var(--accento)',
                background: f.tipo === 'ritiro' ? 'var(--superficie)' : 'var(--accento)',
              }} />
              {i < c.fermate.length - 1 && (
                <div style={{ width: 2, flexGrow: 1, minHeight: 26, background: 'var(--riga)' }} />
              )}
            </div>
            <div style={{ paddingBottom: i < c.fermate.length - 1 ? 14 : 0, minWidth: 0 }}>
              <div style={{
                fontSize: f.tipo === 'ritiro' ? 14 : 16,
                fontWeight: f.tipo === 'ritiro' ? 400 : 600,
                color: f.tipo === 'ritiro' ? 'var(--inchiostro-2)' : 'var(--inchiostro)',
                lineHeight: 1.35,
              }}>{f.etichetta}</div>
              {f.tipo === 'ritiro' && (
                <div style={{ fontSize: 12, color: 'var(--tenue)' }}>fermata intermedia</div>
              )}
            </div>
          </div>
        ))}
      </Riquadro>

      {/* ── Chi guida ── */}
      <Riquadro stile={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 13, alignItems: 'center' }}>
          <div style={{
            width: 50, height: 50, borderRadius: 25, flexShrink: 0,
            background: 'var(--superficie-2)',
            backgroundImage: c.conducente.fotoUrl ? `url(${c.conducente.fotoUrl})` : undefined,
            backgroundSize: 'cover',
          }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 18, fontFamily: 'var(--titoli)' }}>
              {c.conducente.nome}{c.conducente.eta ? `, ${c.conducente.eta}` : ''}
            </div>
            <div style={{ fontSize: 14, color: 'var(--tenue)' }}>
              {c.veicolo.marca} {c.veicolo.modello}
              {c.veicolo.colore ? ` · ${c.veicolo.colore.toLowerCase()}` : ''}
            </div>
          </div>
        </div>

        {/* I distintivi vengono dai fatti, non dalle stelle. «Non annulla
            mai» dice quello che al passeggero interessa davvero. */}
        {c.conducente.distintivi.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 13 }}>
            {c.conducente.distintivi.map((d) => (
              <span key={d} style={{
                fontSize: 12, fontWeight: 600, padding: '4px 9px', borderRadius: 5,
                background: 'var(--verde-velo)', color: 'var(--verde)',
              }}>{d}</span>
            ))}
          </div>
        )}
        <div style={{ fontSize: 13, color: 'var(--tenue)', marginTop: 10 }}>
          {c.conducente.corseConcluse} passaggi portati a termine
        </div>

        {c.note && (
          <p style={{
            margin: '14px 0 0', paddingTop: 14, borderTop: '1px solid var(--riga-2)',
            fontSize: 14, color: 'var(--inchiostro-2)', lineHeight: 1.55,
          }}>{c.note}</p>
        )}

        {/* Le preferenze si leggono PRIMA di prenotare, non dopo. */}
        <div style={{
          display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 14,
          paddingTop: 14, borderTop: '1px solid var(--riga-2)', fontSize: 13,
        }}>
          <Preferenza attiva={c.veicolo.fumo} si="si fuma" no="non si fuma" />
          <Preferenza attiva={c.veicolo.animali} si="animali ok" no="niente animali" />
          <Preferenza attiva={c.veicolo.bagagliGrandi} si="bagagli grandi" no="solo borse piccole" />
        </div>
      </Riquadro>

      {/* ── Il prezzo. Un numero, il resto se lo chiedi. ── */}
      <Riquadro stile={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <Etichetta>a persona</Etichetta>
            <div style={{
              fontFamily: 'var(--titoli)', fontWeight: 700, fontSize: 38,
              letterSpacing: '-.03em', lineHeight: 1.05, marginTop: 4,
            }}>{euro(c.totaleCent)}</div>
          </div>
          {risparmio > 0 && (
            <div style={{ textAlign: 'right', paddingBottom: 5 }}>
              <div style={{ fontSize: 12, color: 'var(--tenue)', textDecoration: 'line-through' }}>
                {euro(c.confrontoTaxiCent!)} in taxi
              </div>
              <div style={{ fontSize: 14, color: 'var(--verde)', fontWeight: 600 }}>
                risparmi {euro(risparmio)}
              </div>
            </div>
          )}
        </div>

        <details style={{ marginTop: 14 }}>
          <summary style={{ fontSize: 13, color: 'var(--tenue)', cursor: 'pointer' }}>
            Com&apos;è composto
          </summary>
          <div style={{ marginTop: 10, fontSize: 14 }}>
            <Riga nome={`Spese di viaggio a ${c.conducente.nome}`} valore={c.quotaCent} />
            <Riga nome="Servizio" valore={c.feeCent} />
            <p style={{ fontSize: 12, color: 'var(--tenue)', margin: '10px 0 0', lineHeight: 1.5 }}>
              La quota è la tua parte del costo chilometrico dell&apos;auto,
              sulle tabelle ACI, divisa fra chi viaggia — {c.conducente.nome}
              {' '}compresa. Non ci guadagna: rientra solo di una parte di quello
              che spende.
            </p>
          </div>
        </details>
      </Riquadro>

      {/* ── L'azione ── */}
      <Prenota
        corsa={c.id} totaleCent={c.totaleCent} nomeConducente={c.conducente.nome}
        metodoIniziale={metodo ?? null} prenotaImmediata={c.prenotaImmediata}
        kmDeviazione={c.kmDeviazione} fermataPronta={c.fermataPronta}
      />
      {!c.fermataPronta && (
        <div>
          <p style={{
            fontSize: 13, color: 'var(--tenue)', textAlign: 'center',
            margin: '10px 0 0', lineHeight: 1.5,
          }}>
            Sono {c.kmDeviazione.toFixed(1).replace('.', ',')} km in più, che paghi
            tu. {c.conducente.nome} può accettare o rifiutare: finché non arriva
            una risposta non ti addebitiamo niente, e il posto resta
            prenotabile da altri.
          </p>
        </div>
      )}

      {/* Il ritorno è una corsa a sé, e va prenotato a parte: legarli
          prometterebbe un rientro garantito che non diamo. Ma non dirlo
          affatto lascerebbe a metà chi sa già che dovrà tornare. */}
      {c.ritorno && (
        <a href={`/corsa/${c.ritorno.id}`} style={{ textDecoration: 'none' }}>
          <div style={{
            marginTop: 14, padding: '14px 16px', borderRadius: 'var(--raggio-s)',
            border: '1px solid var(--riga)', background: 'var(--superficie)',
          }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--inchiostro)' }}>
              {c.conducente.nome} torna alle {c.ritorno.orario}
            </div>
            <div style={{ fontSize: 13, color: 'var(--tenue)', marginTop: 2, lineHeight: 1.45 }}>
              È una corsa separata: prenotala a parte, e potrai disdirne una
              senza toccare l&apos;altra.
            </div>
          </div>
        </a>
      )}

      <p style={{
        fontSize: 13, color: 'var(--tenue)', textAlign: 'center',
        margin: '16px 0 0',
      }}>
        {c.politica === 'flessibile'
          ? 'Disdici gratis fino a un’ora prima.'
          : 'Disdici gratis fino a sei ore prima.'}
      </p>

      {/* ── Che cosa è questo, detto chiaramente ── */}
      <div style={{
        marginTop: 26, paddingTop: 18, borderTop: '1px solid var(--riga-2)',
        fontSize: 12, color: 'var(--tenue)', lineHeight: 1.6,
      }}>
        Questo passaggio è offerto da un privato che stava già andando lì, non
        da un&apos;impresa di trasporto: non si applica la normativa a tutela
        del consumatore, in particolare il diritto di recesso.{' '}
        {c.conducente.nome} è l&apos;unica responsabile del viaggio come
        descritto. GO mette a disposizione la piattaforma e l&apos;incasso.
      </div>
    </main>
  )
}

function Preferenza({ attiva, si, no }: { attiva: boolean; si: string; no: string }) {
  return (
    <span style={{ color: attiva ? 'var(--inchiostro-2)' : 'var(--tenue)' }}>
      {attiva ? si : no}
    </span>
  )
}

function Riga({ nome, valore }: { nome: string; valore: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
      <span style={{ color: 'var(--inchiostro-2)' }}>{nome}</span>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 13 }}>{euro(valore)}</span>
    </div>
  )
}
