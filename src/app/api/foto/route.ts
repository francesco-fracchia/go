import { db } from '../../../server/db.ts'
import { richiediUtente } from '../../../server/auth.ts'
import { json, rispostaErrore } from '../_risposta.ts'

/**
 * La foto del profilo.
 *
 * È l'unica cosa che, prima di salire in macchina con uno sconosciuto alle
 * due di notte, dice davvero qualcosa: un nome si scrive, una faccia no. Per
 * questo si chiede a tutti, e per questo la si chiede alla registrazione —
 * dopo, quando servirebbe, è tardi.
 *
 * L'immagine arriva già rimpicciolita dal browser: ridurla lì costa niente
 * a noi, risparmia dati a chi la manda, e ci evita di portarci dietro una
 * libreria di manipolazione immagini sul server. Qui si controlla soltanto
 * che sia davvero un'immagine e che stia nei limiti: un controllo fatto solo
 * dal browser non è un controllo, perché il browser lo sceglie chi manda.
 */

const TIPI = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MASSIMO = 2 * 1024 * 1024

export async function POST(req: Request) {
  try {
    const utente = await richiediUtente()

    const modulo = await req.formData()
    const file = modulo.get('foto')
    if (!(file instanceof File)) return json({ errore: 'manca la foto' }, 400)
    if (!TIPI.has(file.type)) {
      return json({ errore: 'la foto deve essere JPEG, PNG o WebP' }, 415)
    }
    if (file.size > MASSIMO) {
      return json({ errore: 'la foto è troppo grande' }, 413)
    }

    // Il nome contiene l'istante: un file che sostituisce il precedente con
    // lo stesso nome resterebbe nella cache dei browser per giorni, e la
    // foto nuova non la vedrebbe nessuno.
    const estensione = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
    const percorso = `${utente}/${Date.now()}.${estensione}`

    const { error } = await db.storage.from('foto').upload(percorso, file, {
      contentType: file.type, upsert: false,
    })
    if (error) return json({ errore: 'non siamo riusciti a salvarla' }, 400)

    const { data: pubblico } = db.storage.from('foto').getPublicUrl(percorso)
    const url = pubblico.publicUrl

    const { error: e2 } = await db.from('profili').update({ foto_url: url }).eq('id', utente)
    if (e2) return json({ errore: e2.message }, 400)

    // La vecchia si toglie dopo aver salvato la nuova, mai prima: se la
    // scrittura fallisce, chi guarda il profilo deve continuare a vedere
    // qualcosa.
    void ripulisci(utente, percorso)

    return json({ url }, 201)
  } catch (e) { return rispostaErrore(e) }
}

/** Le foto vecchie non servono a nessuno e occupano spazio. */
async function ripulisci(utente: string, tieni: string) {
  try {
    const { data } = await db.storage.from('foto').list(utente)
    const daTogliere = (data ?? [])
      .map((f) => `${utente}/${f.name}`)
      .filter((p) => p !== tieni)
    if (daTogliere.length > 0) await db.storage.from('foto').remove(daTogliere)
  } catch { /* uno spazio sprecato non è un guasto */ }
}
