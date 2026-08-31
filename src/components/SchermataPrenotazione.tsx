import { Riquadro, Bottone, Etichetta, euro } from './base.tsx'
import { ContoAllaRovescia } from './ContoAllaRovescia.tsx'
import { EsitoViaggio } from './EsitoViaggio.tsx'
import { Disdici } from './Disdici.tsx'
import { AbilitaPush } from './AbilitaPush.tsx'
import { QuantoManca } from './InViaggio.tsx'
import { gratuita, testoDisdetta } from '../lib/disdette.ts'

/**
 * Dopo la prenotazione.
 *
 * È la schermata che il passeggero riapre più volte di chiunque altra: la
 * guarda quando prenota, la sera prima, mentre si veste, mentre aspetta.
 * Ogni volta cerca una cosa diversa, e la gerarchia deve cambiare con lei.
 *
 *   giorni prima   → «è tutto a posto?»       conferma e disdetta
 *   la sera        → «a che ora, dove?»       orario e punto di ritrovo
 *   l'ultima ora   → «quanto manca?»          conto alla rovescia
 *   al ritrovo     → «come lo riconosco?»     codice, targa, telefono
 *
 * Per questo l'ordine dei blocchi cambia con il tempo che manca, invece di
 * essere fisso con tutto sempre visibile.
 */


export interface DatiPrenotazione {
  id: string
  stato: 'richiesta' | 'autorizzata' | 'catturata' | 'completata' | 'annullata'
  esito: 'atteso' | 'ok' | 'problema' | 'non_salito'
  quotaCent: number
  deviazioneCent: number
  feeCent: number
  totaleCent: number
  catturatoCent: number | null
  ritrovo: string
  corsa: {
    id: string
    oraPartenza: string
    oraArrivo: string
    destinazioneLabel: string
    politica: 'flessibile' | 'rigida'
  }
  conducente: { nome: string; fotoUrl: string | null } | null
  veicolo: { marca: string; modello: string; colore: string | null; targa: string } | null
}

export function SchermataPrenotazione({ p }: { p: DatiPrenotazione }) {
  const c = p.corsa
  const { conducente, veicolo, ritrovo } = p

  const minutiAllaPartenza = Math.round(
    (new Date(c.oraPartenza).getTime() - Date.now()) / 60_000,
  )
  const imminente = minutiAllaPartenza <= 60
  const saltata = p.stato === 'annullata'
  const arrivata = new Date(c.oraArrivo).getTime() < Date.now() && !saltata
  const daSegnalare = arrivata && p.esito === 'atteso'

  return (
    <main className="schermo-stretto">
      {/* Il marchio sta in barra: qui basta lo stato. */}
      <p className="occhiello" style={{ marginBottom: 'var(--s5)' }}>
        {saltata ? 'annullato' : p.stato === 'richiesta' ? 'in attesa' : 'prenotato'}
      </p>

      <Intestazione stato={p.stato} arrivata={arrivata} nome={conducente?.nome ?? 'il conducente'} />

      {daSegnalare && (
        <div style={{ margin: '22px 0' }}>
          <EsitoViaggio
            prenotazione={p.id}
            conducente={conducente?.nome ?? 'chi ti ha portato'}
            sbloccoIl="Fra un giorno"
          />
        </div>
      )}

      {/* Il permesso alle notifiche si chiede QUI: c'è appena stata una
          prenotazione, quindi c'è qualcosa di concreto da comunicare, e lo
          si può dire. Chiesto al primo avvio verrebbe negato, e una volta
          negato il browser non lo richiede più. */}
      {!saltata && !arrivata && (
        <div style={{ margin: 'var(--s5) 0' }}>
          <AbilitaPush momento="dopo-prenotazione" />
        </div>
      )}

      {!saltata && !arrivata && (
        <div style={{ margin: '22px 0' }}>
          {/* Nell'ultima mezz'ora, se chi guida sta condividendo la
              posizione, «4 minuti» sostituisce il conto alla rovescia: è la
              stessa domanda, con una risposta vera invece che prevista. */}
          {minutiAllaPartenza <= 30
            ? <QuantoManca corsa={c.id} />
            : null}
          <div style={{ marginTop: minutiAllaPartenza <= 30 ? 14 : 0 }}>
            <ContoAllaRovescia partenza={c.oraPartenza} />
          </div>
        </div>
      )}

      {saltata ? (
        <Riquadro stile={{ marginBottom: 14 }} tono="accento">
          <div style={{ fontSize: 15, lineHeight: 1.5 }}>
            Ti abbiamo cercato altri passaggi per {c.destinazioneLabel} intorno
            alla stessa ora.
          </div>
          <div style={{ marginTop: 14 }}>
            <a href={`/cerca?a=${encodeURIComponent(c.destinazioneLabel)}`}
               style={{ textDecoration: 'none' }}>
              <Bottone>Vedi le alternative</Bottone>
            </a>
          </div>
        </Riquadro>
      ) : (
      <Riquadro stile={{ marginBottom: 14 }}>
        <Etichetta>ritrovo</Etichetta>
        <div style={{ fontSize: 19, fontWeight: 600, margin: '6px 0 2px', fontFamily: 'var(--titoli)' }}>
          {ritrovo}
        </div>
        <div style={{ fontSize: 15, color: 'var(--inchiostro-2)' }}>
          alle {orario(c.oraPartenza)} · arrivo previsto {orario(c.oraArrivo)}
        </div>
        {/* Dopo l'arrivo non si manda più nessuno da nessuna parte. */}
        {!arrivata && (
        <div style={{ marginTop: 14 }}>
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(ritrovo)}`}
            target="_blank" rel="noreferrer"
            style={{ fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
          >
            Portami al punto di ritrovo →
          </a>
        </div>
        )}
      </Riquadro>
      )}

      {!saltata && (
      <Riquadro stile={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
          <div style={{
            width: 46, height: 46, borderRadius: 23, flexShrink: 0,
            background: 'var(--superficie-2)',
            backgroundImage: conducente?.fotoUrl ? `url(${conducente.fotoUrl})` : undefined,
            backgroundSize: 'cover', backgroundPosition: 'center',
          }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 17 }}>{conducente?.nome}</div>
            <div style={{ fontSize: 14, color: 'var(--tenue)' }}>
              {veicolo?.marca} {veicolo?.modello}
              {veicolo?.colore ? ` · ${veicolo.colore.toLowerCase()}` : ''}
            </div>
          </div>
        </div>

        {imminente && veicolo?.targa && (
          <div style={{
            marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--riga-2)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 14, color: 'var(--tenue)' }}>targa</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 16, letterSpacing: '.08em' }}>
              {veicolo.targa}
            </span>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <a href={`/chat/${c.id}`} style={{ flex: 1, textDecoration: 'none' }}>
            <Bottone variante="contorno">Scrivi</Bottone>
          </a>
          {minutiAllaPartenza <= 30 && (
            <a href={`/chiama/${p.id}`} style={{ flex: 1, textDecoration: 'none' }}>
              <Bottone variante="contorno">Chiama</Bottone>
            </a>
          )}
        </div>
      </Riquadro>
      )}

      {/* Su una corsa saltata non si mostra nessun importo: la riga
          «Pagherai 4,45 €» sotto «Non ti abbiamo addebitato niente» è una
          contraddizione che fa dubitare di tutto il resto. */}
      {!saltata && (
      <Riquadro stile={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: 15, color: 'var(--inchiostro-2)' }}>
            {p.catturatoCent ? 'Hai pagato' : 'Pagherai'}
          </span>
          <span style={{ fontFamily: 'var(--titoli)', fontWeight: 700, fontSize: 26 }}>
            {euro(p.catturatoCent ?? p.totaleCent)}
          </span>
        </div>
        <details style={{ marginTop: 12 }}>
          <summary style={{ fontSize: 13, color: 'var(--tenue)', cursor: 'pointer' }}>
            Com&apos;è composto
          </summary>
          <dl style={{ margin: '12px 0 0', fontSize: 14 }}>
            <Voce nome={`Spese di viaggio a ${conducente?.nome ?? 'chi guida'}`} valore={p.quotaCent} />
            {p.deviazioneCent > 0 && (
              <Voce nome="Deviazione per venirti a prendere" valore={p.deviazioneCent} />
            )}
            <Voce nome="Servizio" valore={p.feeCent} />
          </dl>
          <p style={{ fontSize: 12, color: 'var(--tenue)', margin: '12px 0 0', lineHeight: 1.5 }}>
            Le spese di viaggio sono la tua parte del costo chilometrico
            dell&apos;auto, calcolata sulle tabelle ACI e divisa fra chi viaggia.
            Chi guida paga la sua parte come te e non ci guadagna nulla.
          </p>
        </details>
      </Riquadro>
      )}

      {(p.stato === 'autorizzata' || p.stato === 'richiesta') && (
        <div style={{ marginTop: 26 }}>
          <Disdetta politica={c.politica} minuti={minutiAllaPartenza} prenotazione={p.id} />
        </div>
      )}
    </main>
  )
}

function Intestazione({ stato, arrivata, nome }: { stato: string; arrivata: boolean; nome: string }) {
  if (arrivata) return <Titolo testo="Arrivato" sotto="Buona serata." tono="verde" />
  if (stato === 'richiesta') {
    return <Titolo
      testo={`${nome} deve accettare`}
      sotto="Non ti abbiamo addebitato niente. Ti avvisiamo appena risponde — di solito entro poche ore."
    />
  }
  if (stato === 'annullata') {
    return <Titolo testo="Il passaggio è saltato" sotto="Non ti abbiamo addebitato niente." tono="rosso" />
  }
  return <Titolo testo="È confermato" sotto={`${nome} ti aspetta.`} tono="verde" />
}

function Titolo({ testo, sotto, tono = 'neutro' }: {
  testo: string; sotto: string; tono?: 'neutro' | 'verde' | 'rosso'
}) {
  const colore = { neutro: 'var(--inchiostro)', verde: 'var(--verde)', rosso: 'var(--rosso)' }[tono]
  return (
    <div style={{ marginBottom: 4 }}>
      <h1 style={{ fontSize: 28, color: colore, marginBottom: 6 }}>{testo}</h1>
      <p style={{ margin: 0, color: 'var(--inchiostro-2)', fontSize: 15 }}>{sotto}</p>
    </div>
  )
}

function Voce({ nome, valore }: { nome: string; valore: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
      <dt style={{ color: 'var(--inchiostro-2)' }}>{nome}</dt>
      <dd style={{ margin: 0, fontFamily: 'var(--mono)', fontSize: 13 }}>{euro(valore)}</dd>
    </div>
  )
}

/**
 * La regola si dice PRIMA di premere, non dopo.
 *
 * Un pulsante "annulla" che scopre la penale solo nella schermata di
 * conferma è il modo più veloce di far sentire qualcuno raggirato.
 */
function Disdetta({ politica, minuti, prenotazione }: {
  politica: 'flessibile' | 'rigida'; minuti: number; prenotazione: string
}) {
  // Le regole stanno in un posto solo: qui si leggono, non si riscrivono.
  const ore = minuti / 60
  const senzaCosti = gratuita(ore, politica)
  const testo = testoDisdetta(ore, politica)

  return (
    <div>
      <p style={{ fontSize: 13, color: 'var(--tenue)', margin: '0 0 10px', textAlign: 'center' }}>
        {testo}
      </p>
      <Disdici prenotazione={prenotazione} gratuita={senzaCosti} />
    </div>
  )
}

const orario = (iso: string) =>
  new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })

interface Corsa {
  id: string; ora_partenza: string; ora_arrivo: string
  origine_label: string; destinazione_label: string
  politica: 'flessibile' | 'rigida'; conducente: string
  profili: { nome: string; foto_url: string | null; telefono: string } | null
  veicoli: { marca: string; modello: string; colore: string | null; targa: string } | null
}
