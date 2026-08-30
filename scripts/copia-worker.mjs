/**
 * Impacchetta il worker di MapLibre in un file classico dentro `public/`.
 *
 * Due problemi in uno, e la soluzione deve risolverli entrambi:
 *
 * 1. La libreria carica il worker per percorso relativo, e il compilatore
 *    di Next non lo risolve: il browser riceve una pagina HTML al posto
 *    dello script.
 * 2. `setWorkerUrl` — l'unico appiglio che MapLibre offre — crea un worker
 *    CLASSICO, e il file spedito dalla libreria è un modulo ES con `import`
 *    dentro. Un modulo caricato come classico fallisce senza dire niente:
 *    la mappa monta, i controlli compaiono, e resta grigia per sempre.
 *
 * Quindi non si copia: si impacchetta worker e parte condivisa in un unico
 * file senza `import`. Gira prima di ogni avvio e di ogni build, così una
 * `npm update` non lascia un worker di versione diversa dalla libreria.
 */
import { build } from 'esbuild'
import { mkdir } from 'node:fs/promises'

await mkdir('public/maplibre', { recursive: true })

await build({
  entryPoints: ['node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs'],
  outfile: 'public/maplibre/worker.js',
  bundle: true,
  format: 'iife',
  minify: true,
  target: 'es2020',
  logLevel: 'error',
})

console.log('worker di MapLibre impacchettato in public/maplibre/worker.js')
