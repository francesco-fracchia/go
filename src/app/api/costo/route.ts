import { db } from '../../../server/db.ts'
import {
  percorso, giaInCache, percorsiNuoviOggi, SOGLIA_PERCORSI_GIORNO, type Punto,
} from '../../../server/percorsi.ts'
import { costoBase, type Corsa } from '../../../lib/pricing.ts'
import { scomponi } from '../../../lib/carburante.ts'
import { json, rispostaErrore } from '../_risposta.ts'

/**
 * Quanto costa davvero un viaggio.
 *
 * Senza account, e questo è il punto: il numero che questa rotta produce è
 * l'argomento di GO, e va consegnato PRIMA che uno si registri. Quasi
 * nessuno sa che un'auto costa cinquanta o sessanta centesimi al chilometro
 * invece dei dieci della benzina, e chi non lo sa non ha nessun motivo di
 * dividere le spese con qualcuno.
 *
 * Non c'è logica nuova: `costoBase` è la stessa funzione che calcola le
 * quote delle corse vere. Se questa pagina e l'applicazione dessero numeri
 * diversi sarebbe un difetto grave, non una differenza di contesto.
 */

interface Corpo {
  centesimiPerKm?: number
  alimentazione?: string
  origine?: Punto
  destinazione?: Punto
  evitaAutostrada?: boolean
  pedaggioCent?: number
  /** litri per 100 km, se chi chiede li sa. Facoltativo: affina la stima. */
  consumo?: number
}

const valido = (p?: Punto): p is Punto =>
  !!p && Number.isFinite(p.lat) && Number.isFinite(p.lng)
  && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180

export async function POST(req: Request) {
  try {
    const b = await req.json() as Corpo

    if (!valido(b.origine) || !valido(b.destinazione)) {
      return json({ errore: 'servono partenza e destinazione' }, 400)
    }

    const centesimiPerKm = Number(b.centesimiPerKm)
    if (!Number.isFinite(centesimiPerKm) || centesimiPerKm <= 0 || centesimiPerKm >= 200) {
      return json({ errore: 'serve un costo chilometrico' }, 400)
    }

    const punti = [b.origine, b.destinazione]
    const opzioni = { evitaAutostrada: b.evitaAutostrada === true }

    /**
     * Il freno, e dove sta.
     *
     * Una tratta già in cache non costa niente e si serve sempre. Una
     * tratta nuova è una chiamata a OpenRouteService: se oggi ne abbiamo
     * già fatte troppe, si dice di no A QUESTA, non si spegne la pagina.
     * Chi chiede Lodi-Milano continua a ricevere una risposta anche nel
     * giorno in cui qualcuno prova a spremere la quota.
     */
    if (!await giaInCache(punti, opzioni)) {
      if (await percorsiNuoviOggi() >= SOGLIA_PERCORSI_GIORNO) {
        return json({ errore: 'troppe tratte nuove oggi, riprova domani' }, 429)
      }
    }

    const p = await percorso(punti, opzioni)

    // Il pedaggio è l'unica cosa che nessuno può sapere per noi: ORS non
    // restituisce i costi dei caselli. Se non lo dichiari, vale zero — e
    // lo diciamo, invece di stimarlo e sbagliare.
    const pedaggio = Math.max(0, Math.round(Number(b.pedaggioCent) || 0))

    const corsa: Corsa = {
      modalita: 'pubblica',
      kmBase: p.km,
      centesimiPerKm,
      pedaggio,
      parcheggio: 0,
      postiOfferti: 1,
    }
    const totale = costoBase(corsa)

    /**
     * La scomposizione fra carburante e usura.
     *
     * Non è una stima inventata qui: la fa `scomponi`, che tiene il prezzo
     * alla pompa e il consumo tipico PER ALIMENTAZIONE — perché su
     * un'utilitaria a GPL il carburante è un quinto del totale e su un SUV
     * a benzina quasi un terzo, e una percentuale unica sbaglierebbe
     * entrambe. Se chi chiede sa quanto consuma la sua auto, quel numero
     * vince sul tipico.
     *
     * È la riga per cui esiste la pagina: il totale sorprende, ma è
     * VEDERE quanto poco sia la benzina che cambia idea a qualcuno.
     */
    const consumo = Number(b.consumo)
    const parti = scomponi({
      km: p.km,
      centesimiPerKm,
      alimentazione: String(b.alimentazione ?? 'benzina'),
      consumoL100: Number.isFinite(consumo) && consumo > 0 ? consumo : null,
    })

    return json({
      km: p.km,
      minuti: p.minuti,
      totaleCent: totale,
      pedaggioCent: pedaggio,
      benzinaCent: parti.carburanteCent,
      usuraCent: parti.usuraCent,
      /**
       * Diviso per le persone IN MACCHINA, conducente compreso. È la
       * stessa regola delle corse vere, ed è la ragione per cui su GO
       * nessuno guadagna: chi guida paga la sua parte come gli altri.
       */
      aTesta: [2, 3, 4, 5].map((n) => ({ persone: n, cent: Math.round(totale / n) })),
    })
  } catch (e) { return rispostaErrore(e) }
}
