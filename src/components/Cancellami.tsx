'use client'
import { useEffect, useState } from 'react'

/**
 * Andarsene.
 *
 * Sta in fondo alle impostazioni, sobria e senza rosso: un'azione
 * irreversibile che grida invita a provarla per curiosità. Chiede la parola
 * scritta a mano perché è l'unica cosa nell'applicazione che non si disfa —
 * non c'è cestino, non c'è annulla, non c'è assistenza che la recuperi.
 *
 * E dice PRIMA cosa succede: sparisce quello che serviva al servizio, il
 * profilo diventa muto, le scritture contabili restano perché la legge
 * pretende che restino. Scoprirlo dopo sarebbe un tradimento; dirlo prima
 * è l'unica versione onesta.
 */
export function Cancellami() {
  const [aperto, setAperto] = useState(false)
  const [blocchi, setBlocchi] = useState<string[] | null>(null)
  const [parola, setParola] = useState('')
  const [attesa, setAttesa] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  useEffect(() => {
    if (!aperto) return
    void fetch('/api/cancellami')
      .then((r) => r.json())
      .then((d) => setBlocchi(d.impedimenti ?? []))
      .catch(() => setBlocchi([]))
  }, [aperto])

  async function cancella() {
    setAttesa(true); setErrore(null)
    const r = await fetch('/api/cancellami', {
      method: 'DELETE', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ conferma: parola }),
    })
    if (r.ok) { window.location.href = '/'; return }
    setErrore((await r.json()).errore ?? 'Non ci siamo riusciti.')
    setAttesa(false)
  }

  if (!aperto) {
    return (
      <button type="button" className="collegamento-piccolo"
        style={{ marginTop: 'var(--s6)' }} onClick={() => setAperto(true)}>
        Cancella il mio account
      </button>
    )
  }

  return (
    <div className="riquadro" style={{ marginTop: 'var(--s6)' }}>
      <p className="t-blocco">Cancellare l&apos;account</p>

      {blocchi === null && <p className="t-nota">Un attimo…</p>}

      {blocchi !== null && blocchi.length > 0 && (
        <>
          <p className="t-guida" style={{ margin: 'var(--s3) 0 var(--s4)' }}>
            Non ancora: c&apos;è di mezzo qualcun altro.
          </p>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {blocchi.map((b) => (
              <li key={b} className="t-guida" style={{ marginBottom: 6 }}>{b}</li>
            ))}
          </ul>
        </>
      )}

      {blocchi !== null && blocchi.length === 0 && (
        <>
          <p className="t-guida" style={{ margin: 'var(--s3) 0 var(--s4)' }}>
            Spariscono i tuoi messaggi, i luoghi salvati, le richieste e le
            notifiche. Il tuo profilo resta come riga muta, senza nome, foto,
            telefono né email — perché ci sono corse e pagamenti che lo
            puntano. <strong>Le scritture contabili restano</strong>: la legge
            ci obbliga a conservarle, e dopo questa operazione non portano più
            a te.
          </p>
          <p className="t-guida" style={{ margin: '0 0 var(--s5)' }}>
            Non si torna indietro. Non c&apos;è un cestino.
          </p>

          <label className="campo">
            <span className="campo-nome">Scrivi CANCELLA per confermare</span>
            <input value={parola} autoComplete="off" placeholder="CANCELLA"
              style={{ textTransform: 'uppercase', letterSpacing: '.1em' }}
              onChange={(e) => setParola(e.target.value)} />
          </label>

          {errore && <p className="errore">{errore}</p>}

          <div style={{ display: 'flex', gap: 10, marginTop: 'var(--s5)' }}>
            <button type="button" className="azione azione-vuota"
              style={{ flex: 1 }} onClick={() => { setAperto(false); setParola('') }}>
              Ci ripenso
            </button>
            <button type="button" className="azione azione-piena"
              style={{ flex: 1 }}
              aria-disabled={attesa || parola.trim().toUpperCase() !== 'CANCELLA'}
              onClick={cancella}>
              {attesa ? 'Un attimo…' : 'Cancella'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
