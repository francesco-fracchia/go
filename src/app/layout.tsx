import type { Metadata, Viewport } from 'next'
import { Instrument_Sans, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import 'maplibre-gl/dist/maplibre-gl.css'

/**
 * I caratteri arrivano da noi, non da Google.
 *
 * Con il collegamento al foglio di stile di Google ogni visitatore — anche
 * chi non si e registrato e sta solo leggendo la pagina — manda il proprio
 * indirizzo IP a un server statunitense prima di aver toccato niente. E il
 * caso su cui il tribunale di Monaco ha condannato un sito nel 2022, ed e
 * evitabile: `next/font` scarica i caratteri al momento della compilazione
 * e li serve dal nostro dominio. Zero richieste verso l'esterno.
 */
const testo = Instrument_Sans({
  subsets: ['latin'], weight: ['400', '500', '600', '700'],
  display: 'swap', variable: '--carattere-testo',
})
const mono = JetBrains_Mono({
  subsets: ['latin'], weight: ['400', '500'],
  display: 'swap', variable: '--carattere-mono',
})

export const metadata: Metadata = {
  title: 'GO — Se vai comunque, vai insieme.',
  description: 'Trova un passaggio con chi sta già andando dove vai tu.',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'GO' },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFFFFF' },
    { media: '(prefers-color-scheme: dark)', color: '#0A0A0F' },
  ],
  // Il pizzico per ingrandire resta attivo: disattivarlo è un danno di
  // accessibilità che nessun guadagno estetico compensa.
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={`${testo.variable} ${mono.variable}`}>
      <head>
      </head>
      <body>
        {/*
          Il tema si applica PRIMA del primo disegno.
          Leggerlo in un effetto farebbe lampeggiare il chiaro per un
          fotogramma su ogni caricamento — e questa è un'applicazione che si
          apre di notte, dove quel lampo è fisicamente fastidioso.
        */}
        <script
          dangerouslySetInnerHTML={{ __html:
            `try{var t=localStorage.getItem('tema');if(t)document.documentElement.dataset.tema=t}catch(e){}`,
          }}
        />
        {children}
      </body>
    </html>
  )
}
