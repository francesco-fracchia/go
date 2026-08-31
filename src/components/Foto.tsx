'use client'
import { useRef, useState } from 'react'

/**
 * La foto del profilo.
 *
 * È l'unica cosa che, prima di salire in macchina con uno sconosciuto alle
 * due di notte, dice davvero qualcosa. Un nome si scrive; una faccia no.
 *
 * Si rimpicciolisce nel browser prima di mandarla: una foto di un telefono
 * moderno pesa cinque megabyte e nessuno la guarderà mai più grande di
 * duecento pixel. Ridurla qui costa niente a noi, risparmia dati a chi la
 * manda — che spesso la manda in mobilità — e ci evita di portarci dietro
 * una libreria di immagini sul server.
 */

const LATO = 512

export function Foto({ fotoUrl, nome, suCaricata, compatta }: {
  fotoUrl: string | null
  nome: string
  suCaricata?: (url: string) => void
  /** nel profilo, dove la foto c'è già e si cambia soltanto */
  compatta?: boolean
}) {
  const [url, setUrl] = useState(fotoUrl)
  const [attesa, setAttesa] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const campo = useRef<HTMLInputElement>(null)

  async function scegli(file: File) {
    setErrore(null); setAttesa(true)
    try {
      const ridotta = await rimpicciolisci(file)
      const modulo = new FormData()
      modulo.append('foto', ridotta, 'profilo.jpg')
      const r = await fetch('/api/foto', { method: 'POST', body: modulo })
      const d = await r.json()
      if (!r.ok) { setErrore(d.errore ?? 'Non è andata'); return }
      setUrl(d.url); suCaricata?.(d.url)
    } catch {
      setErrore('Non siamo riusciti a leggere questa immagine.')
    } finally { setAttesa(false) }
  }

  return (
    <div className={compatta ? 'foto foto-compatta' : 'foto'}>
      <button type="button" className="foto-cerchio" onClick={() => campo.current?.click()}
        aria-label={url ? 'Cambia la foto' : 'Aggiungi una foto'}
        style={url ? { backgroundImage: `url(${url})` } : undefined}>
        {!url && <span className="foto-iniziale">{nome.charAt(0).toUpperCase()}</span>}
        <span className="foto-velo">{attesa ? '…' : url ? 'Cambia' : 'Aggiungi'}</span>
      </button>

      <input ref={campo} type="file" accept="image/jpeg,image/png,image/webp"
        className="nascosto"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void scegli(f) }} />

      {!compatta && (
        <div className="cresci">
          <p className="foto-titolo">{url ? 'Ci sei' : 'Metti una tua foto'}</p>
          <p className="foto-testo">
            {url
              ? 'Puoi cambiarla quando vuoi. La vedono solo le persone che viaggiano con te.'
              : 'La vedono le persone con cui viaggerai, prima di salire in macchina. È il modo più semplice che abbiamo per non farvi incontrare da sconosciuti del tutto.'}
          </p>
          {errore && <p className="errore">{errore}</p>}
        </div>
      )}
    </div>
  )
}

/**
 * Riduce l'immagine a un quadrato di 512 pixel, ritagliando al centro.
 *
 * Il ritaglio centrale è quello che sbaglia meno su una foto di persona:
 * quasi tutti si fotografano al centro dell'inquadratura, e una faccia
 * schiacciata in un ovale si riconosce peggio di una faccia tagliata ai
 * lati.
 */
async function rimpicciolisci(file: File): Promise<Blob> {
  const immagine = await creaImmagine(file)
  const lato = Math.min(immagine.width, immagine.height)
  const x = (immagine.width - lato) / 2
  const y = (immagine.height - lato) / 2

  const tela = document.createElement('canvas')
  tela.width = LATO; tela.height = LATO
  const c = tela.getContext('2d')
  if (!c) throw new Error('niente tela')
  c.drawImage(immagine, x, y, lato, lato, 0, 0, LATO, LATO)

  return await new Promise<Blob>((risolvi, rifiuta) => {
    tela.toBlob((b) => (b ? risolvi(b) : rifiuta(new Error('niente blob'))), 'image/jpeg', 0.86)
  })
}

function creaImmagine(file: File): Promise<HTMLImageElement> {
  return new Promise((risolvi, rifiuta) => {
    const url = URL.createObjectURL(file)
    const i = new Image()
    i.onload = () => { URL.revokeObjectURL(url); risolvi(i) }
    i.onerror = () => { URL.revokeObjectURL(url); rifiuta(new Error('non è un\'immagine')) }
    i.src = url
  })
}
