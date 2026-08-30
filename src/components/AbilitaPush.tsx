'use client'
import { useEffect, useState } from 'react'

/**
 * Iscrizione alle notifiche.
 *
 * NON si chiede al primo avvio. Il permesso alle notifiche chiesto da
 * un'applicazione che l'utente non ha ancora capito viene negato, e una
 * volta negato il browser non lo richiede più: si brucia l'unica occasione.
 *
 * Si chiede DOPO la prima prenotazione, quando c'è qualcosa di concreto da
 * comunicare — e lo si dice: «ti avvisiamo se il conducente non conferma».
 */
export function AbilitaPush({ momento = 'dopo-prenotazione' }: { momento?: string }) {
  const [stato, setStato] = useState<'ignoto' | 'possibile' | 'attive' | 'negate'>('ignoto')

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return
    if (Notification.permission === 'granted') setStato('attive')
    else if (Notification.permission === 'denied') setStato('negate')
    else setStato('possibile')
  }, [])

  if (stato !== 'possibile') return null

  async function attiva() {
    try {
      const permesso = await Notification.requestPermission()
      if (permesso !== 'granted') { setStato('negate'); return }

      const reg = await navigator.serviceWorker.register('/sw.js')
      const iscrizione = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      })
      await fetch('/api/push', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify(iscrizione.toJSON()),
      })
      setStato('attive')
    } catch {
      setStato('negate')
    }
  }

  return (
    <div style={{
      background: 'var(--accento-velo)', border: '1px solid var(--accento-riga)',
      borderRadius: 'var(--raggio)', padding: '16px 18px',
    }}>
      <div style={{ fontWeight: 600, fontSize: 15.5, fontFamily: 'var(--titoli)' }}>
        Ti avvisiamo se qualcosa cambia
      </div>
      <p style={{ margin: '5px 0 13px', fontSize: 14, color: 'var(--inchiostro-2)', lineHeight: 1.5 }}>
        {momento === 'dopo-prenotazione'
          ? 'Se il conducente non conferma ti cerchiamo un’alternativa — ma dobbiamo poterti raggiungere.'
          : 'Ti scriviamo solo quando serve davvero.'}
      </p>
      <button onClick={attiva} className="tocco" style={{
        width: '100%', borderRadius: 'var(--raggio-s)', padding: '12px',
        border: 'none', background: 'var(--accento)', color: 'var(--su-accento)',
        fontWeight: 600, fontSize: 15,
      }}>Va bene</button>
    </div>
  )
}
