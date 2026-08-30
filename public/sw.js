/**
 * Service worker.
 *
 * Fa una cosa sola, e la fa perché è l'unica che il web non può fare senza:
 * ricevere una notifica quando l'applicazione è chiusa. Non mette in cache
 * niente — una schermata di passaggi vecchia di sei ore è peggio di una
 * schermata vuota, e su questo prodotto le informazioni scadono in minuti.
 */

self.addEventListener('push', (evento) => {
  if (!evento.data) return
  const d = evento.data.json()
  evento.waitUntil(
    self.registration.showNotification(d.title, {
      body: d.body,
      icon: '/icona-192.png',
      badge: '/badge.png',
      // Le notifiche di una stessa corsa si sostituiscono invece di
      // accumularsi: chi riapre il telefono alle 3 non vuole trovare
      // sei avvisi della stessa cosa.
      tag: d.tag || d.url,
      renotify: true,
      data: { url: d.url || '/' },
      // Vibra solo per le cose urgenti: il resto arriva mentre si balla.
      vibrate: d.urgente ? [80, 40, 80] : undefined,
    }),
  )
})

self.addEventListener('notificationclick', (evento) => {
  evento.notification.close()
  const url = evento.notification.data?.url || '/'
  evento.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((finestre) => {
      // Se l'applicazione è già aperta la si porta davanti invece di
      // aprirne una seconda.
      for (const f of finestre) {
        if ('focus' in f) { f.navigate(url); return f.focus() }
      }
      return self.clients.openWindow(url)
    }),
  )
})

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))
