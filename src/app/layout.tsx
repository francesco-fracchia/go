import type { Metadata, Viewport } from 'next'
import './globals.css'
import 'maplibre-gl/dist/maplibre-gl.css'

export const metadata: Metadata = {
  title: 'GO — Se vai comunque, vai insieme.',
  description: 'Trova un passaggio con chi sta già andando dove vai tu.',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'GO' },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAF8F6' },
    { media: '(prefers-color-scheme: dark)', color: '#0E1116' },
  ],
  // Il pizzico per ingrandire resta attivo: disattivarlo è un danno di
  // accessibilità che nessun guadagno estetico compensa.
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href={
            'https://fonts.googleapis.com/css2' +
            '?family=Familjen+Grotesk:wght@500;600;700' +
            '&family=Public+Sans:wght@400;500;600' +
            '&family=Space+Grotesk:wght@500;600;700' +
            '&family=Inter:wght@400;500;600' +
            '&family=Instrument+Sans:wght@400;500;600;700' +
            '&family=Manrope:wght@400;500;600;700;800' +
            '&family=Bricolage+Grotesque:opsz,wght@12..96,400..800' +
            '&family=JetBrains+Mono:wght@500' +
            '&display=swap'
          }
        />
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
