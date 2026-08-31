'use client'
import { useState } from 'react'
import { SegnoAvanti, SegnoPiu } from './segni.tsx'

/**
 * Le comitive a cui appartieni.
 *
 * Due sole azioni, perché ce ne sono solo due: farne una, o entrare in
 * quella di qualcun altro. Chi arriva qui la prima volta non ha niente da
 * guardare, e la schermata deve dirgli cosa ci farà — non mostrargli un
 * elenco vuoto e un pulsante.
 */
export function Comitive({ comitive }: {
  comitive: Array<{ id: string; nome: string; codice: string; membri: number }>
}) {
  const [nome, setNome] = useState('')
  const [codice, setCodice] = useState('')
  const [attesa, setAttesa] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  async function crea() {
    if (!nome.trim()) return
    setAttesa(true); setErrore(null)
    const r = await fetch('/api/comitive', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ nome }),
    })
    const d = await r.json()
    setAttesa(false)
    if (!r.ok) { setErrore(d.errore ?? 'Non ci siamo riusciti.'); return }
    window.location.href = `/comitiva/${d.id}`
  }

  async function entra() {
    if (codice.trim().length < 4) return
    setAttesa(true); setErrore(null)
    const r = await fetch('/api/comitive/entra', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ codice }),
    })
    const d = await r.json()
    setAttesa(false)
    if (!r.ok) { setErrore(d.errore ?? 'Codice non valido.'); return }
    window.location.href = `/comitiva/${d.comitiva.id}`
  }

  return (
    <>
      <div className="fascia testata">
        <div className="dentro dentro-app testata-dentro">
          <div>
            <p className="occhiello">Le tue comitive</p>
            <h1 className="t-titolo testata-titolo" style={{ marginTop: 'var(--s3)' }}>
              Chi guida stasera?
            </h1>
            <p className="testata-sotto">
              La domanda vera non è dove si va: è chi resta sobrio. Una
              comitiva se la ricorda al posto vostro, e tiene il turno.
            </p>
          </div>
        </div>
      </div>

      <div className="fascia">
        <div className="dentro dentro-app casa-dentro">

          {comitive.length > 0 && (
            <section className="casa-sezione">
              <div className="griglia-elenco">
                {comitive.map((c) => (
                  <a key={c.id} href={`/comitiva/${c.id}`} className="corsa-carta carta-tocco">
                    <div className="fila-fra">
                      <span className="corsa-quando">{c.codice}</span>
                      <span className="pastiglia">
                        {c.membri === 1 ? 'solo tu' : `${c.membri} persone`}
                      </span>
                    </div>
                    <div className="corsa-dove">{c.nome}</div>
                  </a>
                ))}
              </div>
            </section>
          )}

          <section className="casa-sezione">
            <div className="pannello-ricerca">
              <p className="occhiello">Fanne una</p>
              <label className="campo" style={{ marginTop: 'var(--s4)' }}>
                <span className="campo-nome">Come vi chiamate</span>
                <input value={nome} maxLength={40} placeholder="Quelli del giovedì"
                  onChange={(e) => setNome(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') crea() }} />
              </label>
              <div className="ricerca-fondo">
                <p className="ricerca-manca">Ti daremo un codice da dettare agli altri.</p>
                <button type="button" className="azione azione-piena ricerca-invia"
                  aria-disabled={!nome.trim() || attesa} onClick={crea}>
                  <SegnoPiu /> Crea la comitiva
                </button>
              </div>
            </div>
          </section>

          <section className="casa-sezione">
            <div className="pannello-ricerca">
              <p className="occhiello">Oppure entra in una</p>
              <label className="campo" style={{ marginTop: 'var(--s4)' }}>
                <span className="campo-nome">Il codice che ti hanno dato</span>
                <input value={codice} maxLength={8} placeholder="H4KM9P"
                  style={{ textTransform: 'uppercase', letterSpacing: '.12em' }}
                  onChange={(e) => setCodice(e.target.value.toUpperCase())}
                  onKeyDown={(e) => { if (e.key === 'Enter') entra() }} />
              </label>
              {errore && <p className="errore">{errore}</p>}
              <div className="ricerca-fondo">
                <p className="ricerca-manca">Sei membro appena lo inserisci.</p>
                <button type="button" className="azione azione-vuota ricerca-invia"
                  aria-disabled={codice.trim().length < 4 || attesa} onClick={entra}>
                  Entra <SegnoAvanti dimensione={15} />
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  )
}
