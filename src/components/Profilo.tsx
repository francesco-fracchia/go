import { SegnoAvanti } from './segni.tsx'
import { Invita } from './Invita.tsx'
import { Foto } from './Foto.tsx'

/**
 * Il profilo.
 *
 * Serve a una domanda sola: «salgo in macchina con questa persona?». Tutto
 * quello che non aiuta a rispondere sta fuori.
 *
 * I distintivi vengono prima delle recensioni perché sono ricavati dai
 * fatti — «non annulla mai» si calcola, non si opina — e perché il primo
 * anno le recensioni non ci sono ancora, mentre i distintivi sì dopo cinque
 * corse.
 *
 * Le verifiche si dicono per quello che sono. Un profilo che scrive
 * «verificato» quando ha solo confermato un'email insegna che la parola non
 * vuol dire niente, e la prima volta che serve davvero non ci crede
 * nessuno.
 */

export interface DatiProfilo {
  /** il codice personale e quante persone ha portato: solo sul proprio */
  invito?: { codice: string; portati: number }
  id: string
  nome: string
  cognome: string
  fotoUrl: string | null
  eta?: number
  bio?: string
  membroDal: string
  distintivi: string[]
  corseConcluse: number
  telefonoOk: boolean
  emailOk: boolean
  documentoOk: boolean
  veicoli: Array<{ marca: string; modello: string; colore: string | null }>
  recensioni: Array<{
    id: string; positiva: boolean; tag: string[]; testo: string | null
    autore: string; quando: string
  }>
}

export function Profilo({ p, mio }: { p: DatiProfilo; mio?: boolean }) {
  return (
    <div className="fascia">
      <div className="dentro dentro-app profilo-dentro">

        <header className="profilo-testa">
          {mio ? (
            <Foto fotoUrl={p.fotoUrl} nome={p.nome} compatta />
          ) : (
            <span className="faccia profilo-faccia"
              style={p.fotoUrl ? { backgroundImage: `url(${p.fotoUrl})` } : undefined}>
              {!p.fotoUrl && p.nome.charAt(0)}
            </span>
          )}
          <div className="cresci">
            {/* Solo il nome: il cognome intero di uno sconosciuto non serve a
                nessuno e regala un dato che non è necessario condividere. */}
            <h1 className="t-titolo">{p.nome} {p.cognome.charAt(0)}.</h1>
            <p className="profilo-sotto">
              {p.eta ? `${p.eta} anni · ` : ''}su GO dal {p.membroDal}
              {p.corseConcluse > 0 && ` · ${p.corseConcluse} ${p.corseConcluse === 1 ? 'viaggio' : 'viaggi'}`}
            </p>
            {p.distintivi.length > 0 && (
              <div className="fila" style={{ flexWrap: 'wrap', marginTop: 'var(--s3)' }}>
                {p.distintivi.map((d) => (
                  <span key={d} className="pastiglia pastiglia-verde">{d}</span>
                ))}
              </div>
            )}
          </div>
        </header>

        {p.bio && <p className="profilo-bio">{p.bio}</p>}

        <div className="profilo-corpo">
          <div className="pila" style={{ gap: 'var(--s5)' }}>

            {/* ── Le recensioni: solo se esistono davvero ── */}
            {p.recensioni.length > 0 ? (
              <section>
                <p className="occhiello" style={{ marginBottom: 'var(--s3)' }}>
                  Cosa dice chi ha viaggiato
                </p>
                <div className="pila-s">
                  {p.recensioni.map((r) => (
                    <div key={r.id} className="riquadro recensione">
                      <div className="fila-fra">
                        <span className="recensione-autore">{r.autore}</span>
                        <span className="t-nota">{r.quando}</span>
                      </div>
                      {r.tag.length > 0 && (
                        <div className={r.positiva ? 'recensione-tag' : 'recensione-tag recensione-tag-no'}>
                          {r.tag.join(' · ')}
                        </div>
                      )}
                      {r.testo && <p className="recensione-testo">{r.testo}</p>}
                    </div>
                  ))}
                </div>
              </section>
            ) : (
              <div className="riquadro">
                <p className="occhiello">Cosa dice chi ha viaggiato</p>
                <p className="t-corpo" style={{ marginTop: 'var(--s3)' }}>
                  {p.corseConcluse === 0
                    ? 'Nessun viaggio ancora, quindi nessuna recensione. Le lascia solo chi ha davvero viaggiato.'
                    : 'Ancora nessuna recensione. Le lascia solo chi ha davvero viaggiato, entro due settimane dal viaggio.'}
                </p>
              </div>
            )}

            {mio && p.invito && (
              <section>
                <p className="occhiello" style={{ marginBottom: 'var(--s3)' }}>Porta qualcuno</p>
                <Invita codice={p.invito.codice} portati={p.invito.portati} nome={p.nome} />
              </section>
            )}

            {mio && (
              <section>
                <p className="occhiello" style={{ marginBottom: 'var(--s3)' }}>Il tuo account</p>
                <div className="elenco-voci">
                  <Voce href="/conto" testo="Il tuo conto" nota="incassi e liquidazioni" />
                  <Voce href="/veicoli/nuovo" testo="Aggiungi un'auto" nota="serve per pubblicare" />
                  <Voce href="/impostazioni" testo="Notifiche, carta, aspetto" />
                  <Voce href="/come-funziona" testo="Come funziona GO" nota="e perché costa così poco" />
                  <Voce href="/aiuto" testo="Domande frequenti" />
                  <Voce href="/legale/termini" testo="Condizioni d'uso" />
                  <Voce href="/legale/privacy" testo="Come trattiamo i tuoi dati" />
                  <Voce href="/legale/contatto" testo="Contatti" />
                </div>

                {/* Uscire deve stare dove uno lo cerca: nel proprio profilo.
                    Era solo in fondo alle impostazioni, cioè dietro un altro
                    tocco — e su un dispositivo condiviso «dov'è il logout»
                    non è una domanda che si ha voglia di cercare. */}
                <div className="impostazioni-uscita" style={{ marginTop: 'var(--s6)' }}>
                  <a href="/api/esci" className="esci">Esci da questo dispositivo</a>
                  <p className="t-nota" style={{ marginTop: 'var(--s2)' }}>
                    Le tue prenotazioni e le tue corse restano dove sono.
                  </p>
                </div>
              </section>
            )}
          </div>

          <aside className="pila" style={{ gap: 'var(--s4)' }}>
            <div className="riquadro">
              <p className="occhiello">Cosa abbiamo verificato</p>
              <div style={{ marginTop: 'var(--s3)' }}>
                <Verifica ok={p.emailOk} testo="Email confermata" />
                <Verifica ok={p.telefonoOk} testo="Numero di telefono"
                  nota={!p.telefonoOk
                    ? (mio ? 'lo aggiungi quando pubblichi' : 'non ancora')
                    : undefined} />
                <Verifica ok={p.documentoOk} testo="Documento d'identità"
                  nota={!p.documentoOk ? 'lo verifica Stripe su chi incassa' : 'verificato da Stripe'} />
              </div>
            </div>

            {p.veicoli.length > 0 && (
              <div className="riquadro">
                <p className="occhiello">Guida</p>
                <div style={{ marginTop: 'var(--s3)' }}>
                  {p.veicoli.map((v, i) => (
                    <div key={i} className="profilo-auto">
                      {v.marca} {v.modello}
                      {v.colore && <span className="t-nota"> · {v.colore.toLowerCase()}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* La dichiarazione di non professionalità è pubblica: è
                l'artefatto che documenta la natura fra privati del rapporto,
                e nasconderlo lo renderebbe meno utile proprio dove serve. */}
            {p.veicoli.length > 0 && (
              <p className="t-nota" style={{ lineHeight: 1.6 }}>
                {p.nome} offre passaggi come privato, su tragitti che avrebbe
                percorso comunque. Non è un utente professionista e non esercita
                attività di trasporto di persone.
              </p>
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}

/** «kia stoni» è come l'ha battuto chi l'ha registrata: si presenta meglio. */
const maiuscola = (s: string) =>
  s.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

function Verifica({ ok, testo, nota }: { ok: boolean; testo: string; nota?: string }) {
  return (
    <div className={ok ? 'verifica verifica-ok' : 'verifica'}>
      <span className="verifica-segno" aria-hidden="true">{ok ? '✓' : '·'}</span>
      <span>
        {testo}
        {nota && <span className="verifica-nota"> — {nota}</span>}
      </span>
    </div>
  )
}

function Voce({ href, testo, nota }: { href: string; testo: string; nota?: string }) {
  return (
    <a href={href} className="voce-elenco">
      <span className="cresci">
        {testo}
        {nota && <span className="verifica-nota"> · {nota}</span>}
      </span>
      <SegnoAvanti dimensione={16} />
    </a>
  )
}
