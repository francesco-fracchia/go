'use client'
import { useEffect, useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements, PaymentElement, useStripe, useElements,
} from '@stripe/react-stripe-js'
import { Bottone } from './base.tsx'

/**
 * Salvare la carta.
 *
 * Il modulo è di Stripe: il numero della carta non passa mai per il nostro
 * codice, e non è una comodità — è la differenza fra dover essere conformi
 * allo standard PCI e non doverlo essere.
 *
 * `PaymentElement` mostra da solo Apple Pay e Google Pay dove sono
 * disponibili, e su un telefono sono la differenza fra due tocchi e la
 * digitazione di sedici cifre alle undici di sera.
 *
 * Non si chiede al primo avvio. Si chiede quando si prenota, cioè quando
 * l'utente ha già deciso e sa perché gliela stiamo chiedendo.
 */

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null

export function Carta({ suSalvata, scuro }: {
  suSalvata?: (m: { marchio: string; ultime4: string | null }) => void
  scuro?: boolean
}) {
  const [segreto, setSegreto] = useState<string | null>(null)
  const [errore, setErrore] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/carta', { method: 'POST' })
      .then((r) => r.json())
      .then((d) => d.clientSecret ? setSegreto(d.clientSecret) : setErrore('Non siamo riusciti ad aprire il pagamento'))
      .catch(() => setErrore('Non siamo riusciti ad aprire il pagamento'))
  }, [])

  if (errore) return <p style={{ color: 'var(--rosso)', fontSize: 14 }}>{errore}</p>
  if (!stripePromise) {
    return <p style={{ color: 'var(--tenue)', fontSize: 14 }}>Pagamenti non configurati.</p>
  }
  if (!segreto) {
    return <p style={{ color: 'var(--tenue)', fontSize: 14 }}>Un attimo…</p>
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret: segreto,
        locale: 'it',
        // Il modulo di Stripe eredita i nostri colori invece di piantare un
        // riquadro bianco in mezzo a un tema scuro.
        appearance: {
          theme: scuro ? 'night' : 'stripe',
          variables: {
            colorPrimary: '#C85A2A',
            borderRadius: '10px',
            fontFamily: 'Public Sans, system-ui, sans-serif',
          },
        },
      }}
    >
      <Modulo suSalvata={suSalvata} />
    </Elements>
  )
}

function Modulo({ suSalvata }: {
  suSalvata?: (m: { marchio: string; ultime4: string | null }) => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [invio, setInvio] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        if (!stripe || !elements) return
        setInvio(true); setErrore(null)

        const { error, setupIntent } = await stripe.confirmSetup({
          elements,
          confirmParams: { return_url: `${window.location.origin}/carta/fatto` },
          redirect: 'if_required',
        })

        if (error) {
          setErrore(error.message ?? 'Carta non accettata')
          setInvio(false); return
        }
        const metodo = setupIntent?.payment_method
        if (!metodo) { setErrore('Carta non salvata'); setInvio(false); return }

        const r = await fetch('/api/carta', {
          method: 'PUT', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ metodo }),
        })
        if (!r.ok) { setErrore('Carta non salvata'); setInvio(false); return }
        suSalvata?.(await r.json())
      }}
    >
      <PaymentElement options={{ layout: 'tabs' }} />

      {errore && (
        <p style={{ color: 'var(--rosso)', fontSize: 14, margin: '14px 0 0' }}>{errore}</p>
      )}

      <div style={{ marginTop: 18 }}>
        <Bottone type="submit" disabled={!stripe || invio}>
          {invio ? 'Un attimo…' : 'Salva'}
        </Bottone>
      </div>

      <p style={{
        fontSize: 12.5, color: 'var(--tenue)', margin: '12px 0 0',
        lineHeight: 1.55, textAlign: 'center',
      }}>
        Non addebitiamo niente adesso. Blocchiamo l&apos;importo quando prenoti
        e lo scaliamo alla partenza — spesso è meno, se la macchina si riempie.
      </p>
    </form>
  )
}

/** Il metodo già salvato, con la possibilità di cambiarlo. */
export function MetodoSalvato({ marchio, ultime4, suCambia }: {
  marchio: string; ultime4: string | null; suCambia: () => void
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 12, padding: '14px 16px', borderRadius: 'var(--raggio-s)',
      border: '1px solid var(--riga)', background: 'var(--superficie)',
    }}>
      <span style={{ fontSize: 15 }}>
        {nomeMarchio(marchio)}{ultime4 ? ` ·· ${ultime4}` : ''}
      </span>
      <button onClick={suCambia} style={{
        background: 'none', border: 'none', color: 'var(--accento)',
        fontSize: 14, fontWeight: 600,
      }}>Cambia</button>
    </div>
  )
}

const nomeMarchio = (m: string) => ({
  visa: 'Visa', mastercard: 'Mastercard', amex: 'American Express',
  apple_pay: 'Apple Pay', google_pay: 'Google Pay', link: 'Link',
}[m] ?? m)
