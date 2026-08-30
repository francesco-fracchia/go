'use client'
import { useEffect, useState } from 'react'

/**
 * Il conto alla rovescia verso la partenza.
 *
 * Non è decorazione: è l'unica informazione che il passeggero cerca davvero
 * quando riapre l'applicazione. Nell'ultima ora diventa il pezzo più grande
 * della schermata, perché è quando l'ansia c'è.
 */
export function ContoAllaRovescia({ partenza }: { partenza: string }) {
  const [ora, setOra] = useState<number | null>(null)

  useEffect(() => {
    const aggiorna = () => setOra(Date.now())
    aggiorna()
    const t = setInterval(aggiorna, 20_000)
    return () => clearInterval(t)
  }, [])

  // Al primo disegno lato server non si conosce l'ora del dispositivo:
  // si lascia lo spazio vuoto invece di mostrare un valore che cambierà
  // subito dopo, che è il modo classico di far sfarfallare la pagina.
  if (ora === null) return <div style={{ minHeight: 62 }} />

  const minuti = Math.round((new Date(partenza).getTime() - ora) / 60_000)

  if (minuti < -5) return <Testo grande="Partita" piccolo="buon viaggio" />
  if (minuti <= 0) return <Testo grande="Adesso" piccolo="il conducente sta arrivando" urgente />
  if (minuti < 60) return <Testo grande={`${minuti} min`} piccolo="alla partenza" urgente />
  if (minuti < 60 * 20) {
    const h = Math.floor(minuti / 60)
    return <Testo grande={`${h} ${h === 1 ? 'ora' : 'ore'}`} piccolo="alla partenza" />
  }
  const giorni = Math.round(minuti / 1440)
  return <Testo grande={`${giorni} ${giorni === 1 ? 'giorno' : 'giorni'}`} piccolo="alla partenza" />
}

function Testo({ grande, piccolo, urgente = false }: {
  grande: string; piccolo: string; urgente?: boolean
}) {
  return (
    <div>
      <div style={{
        fontFamily: 'var(--titoli)', fontWeight: 700,
        fontSize: urgente ? 44 : 34, lineHeight: 1.05,
        letterSpacing: '-.03em',
        color: urgente ? 'var(--accento)' : 'var(--inchiostro)',
      }}>{grande}</div>
      <div style={{ fontSize: 14, color: 'var(--tenue)', marginTop: 2 }}>{piccolo}</div>
    </div>
  )
}
