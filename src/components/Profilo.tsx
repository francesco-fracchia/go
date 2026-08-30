import { Riquadro, Etichetta } from './base.tsx'

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
 */

export interface DatiProfilo {
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
    <main style={{ maxWidth: 'var(--colonna)', margin: '0 auto', padding: '24px 20px 40px' }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 22 }}>
        <div style={{
          width: 72, height: 72, borderRadius: 36, flexShrink: 0,
          background: 'var(--superficie-2)',
          backgroundImage: p.fotoUrl ? `url(${p.fotoUrl})` : undefined,
          backgroundSize: 'cover', backgroundPosition: 'center',
        }} />
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: 25, lineHeight: 1.15 }}>
            {/* Solo il nome: il cognome intero di uno sconosciuto non serve a
                nessuno e regala un dato che non è necessario condividere. */}
            {p.nome} {p.cognome.charAt(0)}.
          </h1>
          <div style={{ fontSize: 14, color: 'var(--tenue)', marginTop: 3 }}>
            {p.eta ? `${p.eta} anni · ` : ''}su GO dal {p.membroDal}
          </div>
        </div>
      </div>

      {p.distintivi.length > 0 && (
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 18 }}>
          {p.distintivi.map((d) => (
            <span key={d} style={{
              fontSize: 13, fontWeight: 600, padding: '6px 12px', borderRadius: 6,
              background: 'var(--verde-velo)', color: 'var(--verde)',
            }}>{d}</span>
          ))}
        </div>
      )}

      {p.bio && (
        <p style={{
          margin: '0 0 18px', fontSize: 15, lineHeight: 1.6, color: 'var(--inchiostro-2)',
        }}>{p.bio}</p>
      )}

      <Riquadro stile={{ marginBottom: 14 }}>
        <div style={{ fontSize: 15.5, fontWeight: 600, marginBottom: 12 }}>
          {p.corseConcluse === 0
            ? 'Nessun viaggio ancora'
            : `${p.corseConcluse} ${p.corseConcluse === 1 ? 'viaggio' : 'viaggi'} portati a termine`}
        </div>
        <Verifica ok={p.telefonoOk} testo="Numero di telefono verificato"
          nota={!p.telefonoOk
            ? (mio ? 'serve per pubblicare — lo aggiungi quando ti serve' : 'non ancora')
            : undefined} />
        <Verifica ok={p.emailOk} testo="Email confermata" />
        <Verifica ok={p.documentoOk} testo="Documento verificato"
          nota={!p.documentoOk ? 'lo verifica Stripe su chi incassa' : undefined} />
      </Riquadro>

      {p.veicoli.length > 0 && (
        <Riquadro stile={{ marginBottom: 14 }}>
          <Etichetta>guida</Etichetta>
          <div style={{ marginTop: 8 }}>
            {p.veicoli.map((v, i) => (
              <div key={i} style={{ fontSize: 15, padding: '3px 0' }}>
                {v.marca} {v.modello}
                {v.colore && <span style={{ color: 'var(--tenue)' }}> · {v.colore.toLowerCase()}</span>}
              </div>
            ))}
          </div>
        </Riquadro>
      )}

      {p.recensioni.length > 0 && (
        <section style={{ marginTop: 22 }}>
          <Etichetta>cosa dicono</Etichetta>
          <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
            {p.recensioni.map((r) => (
              <Riquadro key={r.id} stile={{ padding: '14px 16px' }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', marginBottom: 6,
                }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{r.autore}</span>
                  <span style={{ fontSize: 12.5, color: 'var(--tenue)' }}>{r.quando}</span>
                </div>
                {r.tag.length > 0 && (
                  <div style={{
                    fontSize: 13, color: r.positiva ? 'var(--verde)' : 'var(--rosso)',
                    marginBottom: r.testo ? 6 : 0,
                  }}>{r.tag.join(' · ')}</div>
                )}
                {r.testo && (
                  <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.55, color: 'var(--inchiostro-2)' }}>
                    {r.testo}
                  </p>
                )}
              </Riquadro>
            ))}
          </div>
        </section>
      )}

      {mio && (
        <section style={{ marginTop: 26 }}>
          <Etichetta>il tuo account</Etichetta>
          <div style={{ marginTop: 10 }}>
            <Voce href="/conto" testo="Il tuo conto" />
            <Voce href="/veicoli/nuovo" testo="Aggiungi un'auto" />
            <Voce href="/impostazioni" testo="Notifiche, carta, aspetto" />
            <Voce href="/legale/termini" testo="Condizioni d'uso" />
            <Voce href="/legale/privacy" testo="Come trattiamo i tuoi dati" />
            <Voce href="/legale/contatto" testo="Contatti" />
          </div>
        </section>
      )}

      {/* La dichiarazione di non professionalità è pubblica: è l'artefatto
          che documenta la natura tra privati del rapporto, e nasconderlo lo
          renderebbe meno utile proprio dove serve. */}
      {p.veicoli.length > 0 && (
        <p style={{
          marginTop: 26, paddingTop: 18, borderTop: '1px solid var(--riga-2)',
          fontSize: 12.5, color: 'var(--tenue)', lineHeight: 1.6,
        }}>
          {p.nome} offre passaggi come privato, su tragitti che avrebbe
          percorso comunque. Non è un utente professionista e non esercita
          attività di trasporto di persone.
        </p>
      )}
    </main>
  )
}

function Verifica({ ok, testo, nota }: { ok: boolean; testo: string; nota?: string }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', padding: '4px 0' }}>
      <span style={{ color: ok ? 'var(--verde)' : 'var(--tenue)', fontSize: 14 }}>
        {ok ? '✓' : '·'}
      </span>
      <span style={{ fontSize: 14.5, color: ok ? 'var(--inchiostro-2)' : 'var(--tenue)' }}>
        {testo}
        {nota && <span style={{ fontSize: 12.5 }}> — {nota}</span>}
      </span>
    </div>
  )
}

function Voce({ href, testo }: { href: string; testo: string }) {
  return (
    <a href={href} style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '15px 2px', borderBottom: '1px solid var(--riga-2)',
      textDecoration: 'none', color: 'var(--inchiostro)', fontSize: 15.5,
    }}>
      {testo}
      <span style={{ color: 'var(--tenue)' }}>›</span>
    </a>
  )
}
