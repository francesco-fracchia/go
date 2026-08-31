import { euro } from './base.tsx'
import { Prenota, type Metodo } from './Prenota.tsx'
import { orario, giorno } from '../lib/tempo.ts'

/**
 * Il dettaglio di una corsa: dove si decide.
 *
 * Prima era una pila: percorso, conducente, prezzo, pulsante, note legali —
 * e su uno schermo grande il pulsante finiva sotto la piega, cioè la sola
 * cosa che la schermata esiste per far premere si vedeva solo scorrendo.
 *
 * Adesso sono due colonne. A sinistra tutto quello che serve per decidere,
 * nell'ordine in cui lo si chiede: dove passa, chi guida, cosa aspettarsi.
 * A destra il prezzo e l'azione, incollati in alto mentre si legge il
 * resto. Su telefono la stessa cosa diventa una barra fissa in fondo, dove
 * arriva il pollice.
 *
 * Il prezzo è un numero grande e solo. La scomposizione c'è ma chiusa: chi
 * decide guarda quanto spende e con chi va, non come si divide la cifra.
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
    id?: string
    nome: string; fotoUrl: string | null; eta?: number
    corseConcluse: number; distintivi: string[]
  }
  veicolo: {
    marca: string; modello: string; colore: string | null
    fumo: boolean; animali: boolean
    /**
     * Quanto bagaglio ci sta, nelle parole in cui l'ha scelto chi guida.
     *
     * Era un sì/no, e la pagina chiedeva al database una colonna che una
     * migrazione aveva sostituito da mesi: l'interrogazione veniva
     * rifiutata, e il dettaglio di QUALUNQUE corsa rispondeva «pagina non
     * trovata». Quattro gradi dicono anche una cosa in più — «solo borse
     * piccole» e «il bagagliaio è pieno» non sono lo stesso viaggio per
     * chi parte con un trolley.
     */
    bagagli: 'nessuno' | 'piccoli' | 'medi' | 'grandi'
  }
}

export function Dettaglio({ c, metodo }: { c: DatiCorsa; metodo?: Metodo | null }) {
  const risparmio = c.confrontoTaxiCent ? c.confrontoTaxiCent - c.totaleCent : 0

  return (
    <div className="fascia">
      <div className="dentro dentro-app dettaglio-dentro">

        <div className="dettaglio-testa">
          <p className="occhiello">{giorno(c.oraPartenza)}</p>
          <h1 className="t-titolo" style={{ marginTop: 'var(--s2)' }}>
            {c.fermate[c.fermate.length - 1]?.etichetta ?? ''}
          </h1>
          <p className="t-guida" style={{ marginTop: 'var(--s2)' }}>
            Si parte alle {orario(c.oraPartenza)} da {c.fermate[0]?.etichetta ?? ''}
            {' '}· arrivo previsto alle {orario(c.oraArrivo)}
          </p>
        </div>

        <div className="dettaglio-corpo">
          {/* ══ La colonna che fa decidere ══ */}
          <div className="pila" style={{ gap: 'var(--s5)' }}>

            {/* ── Dove passa ── */}
            <section className="riquadro">
              <p className="occhiello">Il percorso</p>
              <div className="tappe">
                {c.fermate.map((f, i) => (
                  <div key={i} className="tappa">
                    <span className="tappa-ora">{f.orario}</span>
                    <span className="tappa-filo">
                      <span className={`tappa-punto${f.tipo === 'ritiro' ? ' tappa-punto-vuoto' : ''}`} />
                      {i < c.fermate.length - 1 && <span className="tappa-linea" />}
                    </span>
                    <span className="tappa-dove">
                      <span className={f.tipo === 'ritiro' ? 'tappa-nome-minore' : 'tappa-nome'}>
                        {f.etichetta}
                      </span>
                      {f.tipo === 'ritiro' && <span className="tappa-nota">fermata intermedia</span>}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Chi guida ── */}
            <section className="riquadro">
              <p className="occhiello">Chi guida</p>
              <div className="guidatore">
                <span className="faccia guidatore-faccia"
                  style={c.conducente.fotoUrl ? { backgroundImage: `url(${c.conducente.fotoUrl})` } : undefined}>
                  {!c.conducente.fotoUrl && c.conducente.nome.charAt(0)}
                </span>
                <span className="cresci">
                  <span className="guidatore-nome">
                    {c.conducente.nome}{c.conducente.eta ? `, ${c.conducente.eta}` : ''}
                  </span>
                  <span className="guidatore-auto">
                    {c.veicolo.marca} {c.veicolo.modello}
                    {c.veicolo.colore ? ` · ${c.veicolo.colore.toLowerCase()}` : ''}
                  </span>
                </span>
                {c.conducente.id && (
                  <a href={`/profilo/${c.conducente.id}`} className="azione azione-vuota azione-piccola">
                    Il profilo
                  </a>
                )}
              </div>

              {/* I distintivi vengono dai fatti, non dalle stelle: «non
                  annulla mai» si conta, non si opina. */}
              {c.conducente.distintivi.length > 0 && (
                <div className="fila" style={{ flexWrap: 'wrap', marginTop: 'var(--s4)' }}>
                  {c.conducente.distintivi.map((d) => (
                    <span key={d} className="pastiglia pastiglia-verde">{d}</span>
                  ))}
                </div>
              )}
              <p className="t-nota" style={{ marginTop: 'var(--s3)' }}>
                {c.conducente.corseConcluse === 0
                  ? 'Prima corsa su GO'
                  : `${c.conducente.corseConcluse} passaggi portati a termine`}
              </p>

              {c.note && <p className="guidatore-note">{c.note}</p>}

              {/* Le preferenze si leggono PRIMA di prenotare, non dopo. */}
              <div className="preferenze">
                <Preferenza attiva={c.veicolo.fumo} si="si fuma" no="non si fuma" />
                <Preferenza attiva={c.veicolo.animali} si="animali ok" no="niente animali" />
                <span className={c.veicolo.bagagli === 'nessuno' ? 'preferenza preferenza-no' : 'preferenza'}>
                  {BAGAGLI[c.veicolo.bagagli]}
                </span>
              </div>
            </section>

            {/* ── Cosa aspettarsi ── */}
            <section className="riquadro">
              <p className="occhiello">Prima di prenotare</p>
              <ul className="avvertenze">
                <li>
                  {c.prenotaImmediata
                    ? 'Il posto è tuo appena prenoti: non serve che nessuno accetti.'
                    : `${c.conducente.nome} riceve la tua richiesta e risponde. Fino ad allora non ti addebitiamo niente.`}
                </li>
                <li>
                  {c.politica === 'flessibile'
                    ? 'Puoi disdire senza costi fino a un’ora prima della partenza.'
                    : 'Puoi disdire senza costi fino a sei ore prima della partenza.'}
                </li>
                <li>
                  La carta viene bloccata adesso e addebitata quando il viaggio
                  parte davvero.
                </li>
                {!c.fermataPronta && (
                  <li>
                    Non passa dal tuo punto: sono{' '}
                    {c.kmDeviazione.toFixed(1).replace('.', ',')} km in più, che
                    paghi tu, e {c.conducente.nome} può accettare o rifiutare.
                  </li>
                )}
              </ul>
            </section>

            {/* Il ritorno è una corsa a sé: legarli prometterebbe un rientro
                garantito che non diamo. Ma non dirlo affatto lascia a metà
                chi sa già che dovrà tornare. */}
            {c.ritorno && (
              <a href={`/corsa/${c.ritorno.id}`} className="riquadro riquadro-tocco">
                <p className="occhiello">E per tornare</p>
                <p className="ritorno-titolo">
                  {c.conducente.nome} torna alle {c.ritorno.orario}
                </p>
                <p className="t-nota">
                  È una corsa separata: prenotala a parte, e potrai disdirne una
                  senza toccare l&apos;altra.
                </p>
              </a>
            )}

            <p className="dettaglio-legale">
              Questo passaggio è offerto da un privato che stava già andando lì,
              non da un&apos;impresa di trasporto: non si applica la normativa a
              tutela del consumatore, in particolare il diritto di recesso.{' '}
              {c.conducente.nome} è l&apos;unica responsabile del viaggio come
              descritto. GO mette a disposizione la piattaforma e l&apos;incasso.
            </p>
          </div>

          {/* ══ Il prezzo e l'azione ══ */}
          <aside className="colonna-azione">
            <div className="scatola-prezzo">
              <div className="fila-fra" style={{ alignItems: 'flex-end' }}>
                <div>
                  <p className="occhiello">A persona</p>
                  <div className="numero prezzo-grande">{euro(c.totaleCent)}</div>
                </div>
                {risparmio > 0 && (
                  <div className="prezzo-confronto">
                    <span className="prezzo-taxi">{euro(c.confrontoTaxiCent!)} in taxi</span>
                    <span className="prezzo-risparmio">risparmi {euro(risparmio)}</span>
                  </div>
                )}
              </div>

              <p className="prezzo-posti">
                {c.postiLiberi === 1 ? 'Resta un posto' : `${c.postiLiberi} posti liberi`}
              </p>

              <div style={{ marginTop: 'var(--s4)' }}>
                <Prenota
                  corsa={c.id} totaleCent={c.totaleCent} nomeConducente={c.conducente.nome}
                  metodoIniziale={metodo ?? null} prenotaImmediata={c.prenotaImmediata}
                  kmDeviazione={c.kmDeviazione} fermataPronta={c.fermataPronta}
                />
              </div>

              <details className="scomposizione">
                <summary>Com&apos;è composto</summary>
                <div className="scomposizione-corpo">
                  <Voce nome={`Spese di viaggio a ${c.conducente.nome}`} valore={c.quotaCent} />
                  <Voce nome="Servizio" valore={c.feeCent} />
                  <p className="t-nota" style={{ marginTop: 'var(--s3)' }}>
                    La quota è la tua parte del costo chilometrico dell&apos;auto,
                    sulle tabelle ACI, divisa fra chi viaggia — {c.conducente.nome}{' '}
                    compresa. Non ci guadagna: rientra solo di una parte di quello
                    che spende.
                  </p>
                </div>
              </details>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

const BAGAGLI: Record<DatiCorsa['veicolo']['bagagli'], string> = {
  nessuno: 'niente bagagli',
  piccoli: 'solo borse piccole',
  medi: 'una valigia a testa',
  grandi: 'bagagli grandi',
}

function Preferenza({ attiva, si, no }: { attiva: boolean; si: string; no: string }) {
  return <span className={attiva ? 'preferenza' : 'preferenza preferenza-no'}>{attiva ? si : no}</span>
}

function Voce({ nome, valore }: { nome: string; valore: number }) {
  return (
    <div className="fila-fra scomposizione-voce">
      <span>{nome}</span>
      <span className="scomposizione-cifra">{euro(valore)}</span>
    </div>
  )
}
