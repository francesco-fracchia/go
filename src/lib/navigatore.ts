/**
 * Passare la corsa al navigatore del telefono.
 *
 * Non costruiamo un navigatore: ne esistono tre che la gente ha già
 * installato, conosce e si fida. Costruirne un quarto significherebbe
 * inseguire per anni la qualità delle mappe di Google e perdere comunque,
 * spendendo per ogni chilometro guidato.
 *
 * Il collegamento profondo costa **zero** e porta l'intero giro — punto di
 * partenza, fermate nell'ordine giusto, destinazione — dentro
 * l'applicazione che il conducente usa già. È un tocco.
 */

export interface Tappa { lat: number; lng: number; etichetta?: string }

export type Navigatore = 'google' | 'apple' | 'waze'

/**
 * Google Maps regge le tappe intermedie, e per noi è quello che conta: una
 * corsa con due ritiri è un giro solo, non tre navigazioni da riavviare a
 * ogni fermata.
 */
export function collegamentoGoogle(tappe: Tappa[]): string {
  if (tappe.length < 2) return ''
  const partenza = tappe[0]!
  const arrivo = tappe[tappe.length - 1]!
  const mezzo = tappe.slice(1, -1)

  const p = new URLSearchParams({
    api: '1',
    origin: `${partenza.lat},${partenza.lng}`,
    destination: `${arrivo.lat},${arrivo.lng}`,
    travelmode: 'driving',
  })
  if (mezzo.length > 0) {
    p.set('waypoints', mezzo.map((t) => `${t.lat},${t.lng}`).join('|'))
  }
  return `https://www.google.com/maps/dir/?${p}`
}

/**
 * Apple Maps non prende tappe intermedie: si punta alla prossima e basta.
 * Meglio una navigazione giusta verso il prossimo ritiro che una sbagliata
 * verso la destinazione finale.
 */
export function collegamentoApple(prossima: Tappa): string {
  return `https://maps.apple.com/?daddr=${prossima.lat},${prossima.lng}&dirflg=d`
}

/** Waze: una destinazione alla volta, e parte a navigare da sola. */
export function collegamentoWaze(prossima: Tappa): string {
  return `https://waze.com/ul?ll=${prossima.lat},${prossima.lng}&navigate=yes`
}

/**
 * Quale proporre per primo.
 *
 * Su iPhone Apple Maps si apre senza installare niente, ma chi guida spesso
 * usa Google o Waze. Si propongono tutti e tre e si ricorda la scelta: la
 * seconda volta è già quella giusta.
 */
export function predefinito(): Navigatore {
  if (typeof navigator === 'undefined') return 'google'
  try {
    const salvato = localStorage.getItem('navigatore')
    if (salvato === 'google' || salvato === 'apple' || salvato === 'waze') return salvato
  } catch { /* finestra privata */ }
  return /iPhone|iPad|Macintosh/.test(navigator.userAgent) ? 'apple' : 'google'
}

export function collegamento(n: Navigatore, tappe: Tappa[]): string {
  const prossima = tappe[1] ?? tappe[0]
  if (!prossima) return ''
  if (n === 'google') return collegamentoGoogle(tappe)
  if (n === 'apple') return collegamentoApple(prossima)
  return collegamentoWaze(prossima)
}

export const NOMI: Record<Navigatore, string> = {
  google: 'Google Maps', apple: 'Mappe', waze: 'Waze',
}
