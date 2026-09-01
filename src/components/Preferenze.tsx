'use client'
import { useState } from 'react'
import type { Quanto } from '../server/profili.ts'

/**
 * Come viaggi.
 *
 * Non sono impostazioni dell'auto: sono della persona, e cambiare macchina
 * non le cambia. Servono a una cosa sola — che chi sale sappia cosa
 * aspettarsi PRIMA di essere in macchina, invece di scoprirlo a metà
 * strada e non dire niente per non essere sgarbato.
 *
 * Sono gli stessi assi dei descrittori delle recensioni, e non è un caso:
 * qui dici come vorresti che fosse, lì gli altri raccontano com'è stato.
 * Se le due cose divergono, è la seconda ad avere ragione.
 */

const SCALA: Array<{ v: Quanto; t: string }> = [
  { v: 'volentieri', t: 'Volentieri' },
  { v: 'dipende', t: 'Dipende' },
  { v: 'poco', t: 'Poco' },
]

export function Preferenze({ iniziali }: {
  iniziali: { chiacchiere: Quanto; musica: Quanto; soste: boolean }
}) {
  const [v, setV] = useState(iniziali)
  const [salvato, setSalvato] = useState(false)

  async function salva(p: Partial<typeof v>) {
    const nuovo = { ...v, ...p }
    setV(nuovo); setSalvato(false)
    const r = await fetch('/api/preferenze', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(nuovo),
    })
    if (r.ok) setSalvato(true)
  }

  return (
    <div className="preferenze">
      <Riga nome="Chiacchiere" nota="Se ti va di parlare durante il viaggio">
        <Scala valore={v.chiacchiere} onScegli={(q) => salva({ chiacchiere: q })} />
      </Riga>
      <Riga nome="Musica" nota="Radio accesa o silenzio">
        <Scala valore={v.musica} onScegli={(q) => salva({ musica: q })} />
      </Riga>
      <Riga nome="Soste" nota="Ti fermi lungo la strada, sulle tratte lunghe">
        <div className="scelte-fila">
          {[true, false].map((b) => (
            <button key={String(b)} type="button"
              className={`scelta${v.soste === b ? ' scelta-attiva' : ''}`}
              onClick={() => salva({ soste: b })}>{b ? 'Sì' : 'No'}</button>
          ))}
        </div>
      </Riga>
      {salvato && <p className="t-nota">Salvato.</p>}
    </div>
  )
}

function Riga({ nome, nota, children }: {
  nome: string; nota: string; children: React.ReactNode
}) {
  return (
    <div className="preferenza">
      <div>
        <p className="preferenza-nome">{nome}</p>
        <p className="preferenza-nota">{nota}</p>
      </div>
      {children}
    </div>
  )
}

function Scala({ valore, onScegli }: { valore: Quanto; onScegli: (q: Quanto) => void }) {
  return (
    <div className="scelte-fila">
      {SCALA.map((s) => (
        <button key={s.v} type="button"
          className={`scelta${valore === s.v ? ' scelta-attiva' : ''}`}
          onClick={() => onScegli(s.v)}>{s.t}</button>
      ))}
    </div>
  )
}
