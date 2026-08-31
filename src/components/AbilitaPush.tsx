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
 *
 * Per settimane questo componente è esistito senza essere montato da
 * nessuna parte. Nessuno poteva iscriversi, quindi la tabella delle
 * iscrizioni restava vuota, quindi nessuna notifica poteva essere
 * consegnata a nessuno — e l'interruttore «notifiche» nelle impostazioni
 * accendeva e spegneva un canale che non esisteva. Un pezzo di prodotto
 * scritto, funzionante, e invisibile: il modo più costoso di non avere una
 * funzionalità.
 */

const CHIAVE = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

type Stato = 'ignoto' | 'possibile' | 'attive' | 'negate' | 'impossibili'

export function AbilitaPush({ momento = 'dopo-prenotazione', sempre }: {
  momento?: 'dopo-prenotazione' | 'dopo-pubblicazione' | 'impostazioni'
  /**
   * Nelle impostazioni si mostra anche quando non c'è niente da fare: chi
   * ha negato il permesso deve poter capire perché non riceve niente, e
   * dove si riattiva. Altrove il riquadro sparisce e non disturba.
   */
  sempre?: boolean
}) {
  const [stato, setStato] = useState<Stato>('ignoto')
  const [attesa, setAttesa] = useState(false)

  useEffect(() => {
    // Senza la chiave pubblica l'iscrizione fallisce a metà: meglio non
    // offrirla che offrirla e romperla.
    if (!CHIAVE) { setStato('impossibili'); return }
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setStato('impossibili'); return
    }
    if (Notification.permission === 'granted') setStato('attive')
    else if (Notification.permission === 'denied') setStato('negate')
    else setStato('possibile')
  }, [])

  if (stato === 'ignoto') return null
  if (!sempre && stato !== 'possibile') return null
  if (stato === 'impossibili' && !sempre) return null

  async function attiva() {
    setAttesa(true)
    try {
      const permesso = await Notification.requestPermission()
      if (permesso !== 'granted') { setStato('negate'); return }

      const reg = await navigator.serviceWorker.register('/sw.js')
      const iscrizione = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: CHIAVE!,
      })
      await fetch('/api/push', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify(iscrizione.toJSON()),
      })
      setStato('attive')
    } catch {
      setStato('negate')
    } finally { setAttesa(false) }
  }

  return (
    <div className={stato === 'possibile' ? 'push push-invito' : 'push'}>
      <p className="push-titolo">
        {stato === 'attive' ? 'Notifiche attive'
          : stato === 'negate' ? 'Notifiche bloccate dal browser'
            : stato === 'impossibili' ? 'Notifiche non disponibili qui'
              : 'Ti avvisiamo se qualcosa cambia'}
      </p>
      <p className="push-testo">
        {stato === 'attive'
          ? 'Ti scriviamo solo quando serve: conducente che non conferma, corsa annullata, «sono qui».'
          : stato === 'negate'
            ? 'Le hai negate, e il browser non ce le fa richiedere. Si riattivano dalle impostazioni del sito, alla voce notifiche.'
            : stato === 'impossibili'
              ? 'Questo browser non le supporta, oppure non sono ancora configurate. Nel frattempo trovi tutto in «I miei viaggi».'
              : momento === 'dopo-prenotazione'
                ? 'Se il conducente non conferma ti cerchiamo un’alternativa — ma dobbiamo poterti raggiungere.'
                : momento === 'dopo-pubblicazione'
                  ? 'Quando qualcuno chiede di salire hai poche ore per rispondere. Ti avvisiamo noi.'
                  : 'Ti scriviamo solo quando serve davvero: mai per altro.'}
      </p>
      {stato === 'possibile' && (
        <button type="button" className="azione azione-piena azione-piccola"
          style={{ width: '100%', marginTop: 'var(--s3)' }}
          aria-disabled={attesa} onClick={attiva}>
          {attesa ? 'Un attimo…' : 'Va bene, avvisatemi'}
        </button>
      )}
    </div>
  )
}
