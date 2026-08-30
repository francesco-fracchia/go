import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Client con la service key. Scavalca le RLS, quindi vive SOLO lato server:
 * qualunque import di questo modulo da codice che finisce nel browser è un
 * incidente di sicurezza, non un errore di stile.
 *
 * L'inizializzazione è PIGRA. Creandolo al momento dell'import, ogni pagina
 * che lo importa esploderebbe durante la compilazione, quando le variabili
 * d'ambiente non ci sono ancora: un progetto che non si compila senza le
 * chiavi di produzione è un progetto che nessun altro può costruire.
 */
/**
 * Modalità dimostrativa.
 *
 * Con `DEMO=1` l'applicazione gira per intero — pagine vere, navigazione
 * vera, calcoli veri — su un database in memoria. Serve a guardarla e a
 * cliccarci dentro prima di avere le chiavi, che è l'unico modo di
 * scoprire i problemi che né i test né una galleria di componenti trovano.
 *
 * I dati si azzerano a ogni riavvio: è una dimostrazione, non un ambiente.
 */
export const DEMO = process.env.DEMO === '1'

let cache: SupabaseClient | null = null

function client(): SupabaseClient {
  if (!cache) {
    if (DEMO) {
      // Import sincrono differito: in produzione questo ramo non si tocca
      // mai, e il finto client non finisce nel pacchetto.
      const { fintoClient } = require('./demo/finto.ts')
      const { datiDemo, funzioniDemo } = require('./demo/dati.ts')
      const tabelle = datiDemo()
      cache = fintoClient(tabelle, funzioniDemo(tabelle)) as unknown as SupabaseClient
      return cache
    }
    cache = createClient(
      // Il nome ha il prefisso pubblico perché l'URL del progetto non è un
      // segreto e serve anche al browser: la chiave accanto sì, e quella
      // resta senza prefisso proprio per non poterci finire.
      requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
      requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
      { auth: { persistSession: false } },
    )
  }
  return cache
}

/**
 * Si comporta come il client vero, ma lo costruisce al primo uso reale.
 * Da fuori non cambia niente: `db.from(...)`, come sempre.
 */
export const db = new Proxy({} as SupabaseClient, {
  get: (_, prop) => {
    const c = client() as unknown as Record<string | symbol, unknown>
    const v = c[prop]
    return typeof v === 'function' ? v.bind(c) : v
  },
})

/**
 * I nomi delle variabili d'ambiente, in un posto solo.
 *
 * Sbagliarne uno costa una pagina intera in errore 500, e l'errore dice il
 * nome che hai cercato — non quello che avresti dovuto cercare. È successo
 * con SUPABASE_URL contro NEXT_PUBLIC_SUPABASE_URL, e la pagina del
 * profilo è rimasta rotta finché non l'abbiamo aperta.
 */
export const ENV = {
  supabaseUrl: 'NEXT_PUBLIC_SUPABASE_URL',
  supabaseAnon: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  supabaseServizio: 'SUPABASE_SERVICE_ROLE_KEY',
} as const

export function requireEnv(nome: string): string {
  const v = leggiEnv(nome)
  if (!v) throw new Error(`variabile d'ambiente mancante: ${nome}`)
  return v
}

/**
 * Legge una variabile togliendo i caratteri invisibili.
 *
 * Copiando una chiave da una pagina web capita che si attacchi un carattere
 * di controllo o uno spazio non separatore. Il valore sembra giusto a
 * occhio, e il servizio risponde 403 senza dire perché — è successo, e
 * abbiamo impiegato mezz'ora a capirlo guardando la lunghezza della
 * stringa. Toglierli costa una riga.
 */
export function leggiEnv(nome: string): string | undefined {
  const v = process.env[nome]
  return v?.replace(/[\u0000-\u001f\u007f\u00a0]/g, '').trim() || undefined
}
