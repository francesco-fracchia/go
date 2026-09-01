'use client'
import { useState } from 'react'
import { Bottone } from './base.tsx'

/**
 * Confermare o rinunciare.
 *
 * Rinunciare passa da una conferma perché non è reversibile: fa partire il
 * rimatch, libera le carte e annulla la corsa. E la conferma dice cosa
 * succede a chi aspetta, non «sei sicuro?» — è l'unica informazione che può
 * far cambiare idea a qualcuno che stava rinunciando per pigrizia.
 */
export function AzioniConducente({ corsa, passeggeri }: {
  corsa: string; passeggeri: number
}) {
  const [fase, setFase] = useState<'fermo' | 'rinuncia' | 'invio' | 'fatto'>('fermo')

  const chiama = async (azione: 'conferma' | 'annulla') => {
    setFase('invio')
    await fetch(`/api/corse/${corsa}`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ azione }),
    })
    setFase('fatto')
    window.location.reload()
  }

  if (fase === 'rinuncia') {
    return (
      <div>
        <p style={{ margin: '0 0 14px', fontSize: 14.5, lineHeight: 1.55 }}>
          {passeggeri === 1
            ? 'Una persona resta a piedi'
            : `${passeggeri} persone restano a piedi`}. Cerchiamo subito
          un&apos;alternativa e non addebitiamo niente a nessuno, ma
          l&apos;annullamento resta sul tuo profilo.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <Bottone variante="contorno" style={{ flex: 1 }} onClick={() => setFase('fermo')}>
            Ci ripenso
          </Bottone>
          <Bottone variante="pericolo" style={{ flex: 1 }}
            disabled={fase !== 'rinuncia'} onClick={() => chiama('annulla')}>
            Annulla
          </Bottone>
        </div>
      </div>
    )
  }

  return (
    <>
      <Bottone disabled={fase === 'invio'} onClick={() => chiama('conferma')}>
        {fase === 'invio' ? 'Un attimo…' : 'Sì, parto'}
      </Bottone>
      <button onClick={() => setFase('rinuncia')} style={{
        width: '100%', marginTop: 8, background: 'transparent',
        border: 'none', color: 'var(--rosso)', fontSize: 14,
        fontWeight: 600, padding: 12,
      }}>
        Non ce la faccio più
      </button>
    </>
  )
}

export function RispondiProposta({ prenotazione, scadeFra, costoMin = 0, margineDetto = 0 }: {
  prenotazione: string; scadeFra: string
  /** Quanti minuti in più costa questo ritiro. Zero: nessuna deviazione. */
  costoMin?: number
  /** Il margine sull'arrivo dichiarato pubblicando, se ce n'era uno. */
  margineDetto?: number
}) {
  const [fase, setFase] = useState<
    'fermo' | 'scelta' | 'invio' | 'ok' | 'no' | 'errore'>('fermo')
  const [messaggio, setMessaggio] = useState('')

  if (fase === 'ok') return <Esito testo="Accettata. L'abbiamo avvisata." />
  if (fase === 'no') return <Esito testo="Rifiutata." />
  if (fase === 'errore') return <Esito testo={messaggio} />

  const rispondi = async (accetta: boolean, assorbe?: 'partenza' | 'arrivo') => {
    setFase('invio')
    const r = await fetch('/api/proposte', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prenotazione, accetta, assorbe }),
    })
    const d = await r.json()
    if (!r.ok) { setMessaggio(d.messaggio ?? d.errore ?? 'Non è andata'); setFase('errore'); return }
    setFase(accetta ? 'ok' : 'no')
  }

  /**
   * Con una deviazione non si dice solo sì: si dice CHI paga i minuti.
   *
   * Le due opzioni riguardano persone diverse — uscire prima tocca a chi
   * guida e a chi sale all'origine, arrivare dopo tocca a tutti quelli a
   * bordo — e per questo non c'è un valore ragionevole di sistema: chi va
   * a un concerto e chi torna a casa scelgono all'opposto.
   *
   * Il numero sta PRIMA della scelta. Senza, «parto prima» e «arrivo dopo»
   * sono due modi di subire una cosa che non si è valutata, e «No» smette
   * di essere una decisione informata.
   */
  if (fase === 'scelta') {
    const troppo = margineDetto > 0 && costoMin > margineDetto
    return (
      <div style={{ display: 'grid', gap: 10 }}>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5 }}>
          Passare da lì ti costa <strong>{costoMin} minuti</strong>. Chi li paga?
        </p>
        {margineDetto > 0 && (
          <p style={{ margin: 0, fontSize: 13, color: 'var(--tenue)', lineHeight: 1.5 }}>
            Pubblicando avevi detto che {margineDetto} minuti sull&apos;arrivo ti
            andavano bene{troppo ? ', e questi sono di più.' : '.'}
          </p>
        )}
        <Bottone variante="contorno" disabled={fase !== 'scelta'}
          onClick={() => rispondi(true, 'partenza')}>
          Esco {costoMin} minuti prima — si arriva in orario
        </Bottone>
        <Bottone variante="contorno" disabled={fase !== 'scelta'}
          onClick={() => rispondi(true, 'arrivo')}>
          Parto all&apos;ora scritta — si arriva {costoMin} minuti dopo
        </Bottone>
        <button type="button" onClick={() => setFase('fermo')} style={{
          background: 'transparent', border: 'none', color: 'var(--tenue)',
          fontSize: 13.5, padding: 8,
        }}>
          Torna indietro
        </button>
      </div>
    )
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 10 }}>
        <Bottone variante="contorno" style={{ flex: 1 }}
          disabled={fase === 'invio'} onClick={() => rispondi(false)}>No</Bottone>
        <Bottone style={{ flex: 2 }} disabled={fase === 'invio'}
          onClick={() => (costoMin > 0 ? setFase('scelta') : rispondi(true))}>
          {fase === 'invio' ? '…' : costoMin > 0 ? `Va bene · ${costoMin} min` : 'Va bene'}
        </Bottone>
      </div>
      <p style={{
        margin: '10px 0 0', fontSize: 12.5, color: 'var(--tenue)',
        textAlign: 'center', lineHeight: 1.45,
      }}>
        Scade fra {scadeFra}. Il posto resta prenotabile da altri finché non
        rispondi.
      </p>
    </>
  )
}

const Esito = ({ testo }: { testo: string }) => (
  <p style={{ fontSize: 14, color: 'var(--tenue)', textAlign: 'center', margin: 0 }}>{testo}</p>
)
