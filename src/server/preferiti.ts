import { db } from './db.ts'

/**
 * I posti di ciascuno: casa, lavoro, e gli altri.
 *
 * Chi fa la stessa tratta ogni giorno riscrive lo stesso indirizzo ogni
 * giorno. È la ripetizione che decide se un'applicazione si usa la seconda
 * volta: la prima volta si perdona qualunque attrito, la ventesima no.
 */

export type TipoLuogo = 'casa' | 'lavoro' | 'altro'

export interface LuogoSalvato {
  id: string
  etichetta: string
  indirizzo: string
  lat: number
  lng: number
  tipo: TipoLuogo
}

export async function luoghiSalvati(utenteId: string): Promise<LuogoSalvato[]> {
  const { data } = await db
    .from('luoghi_salvati')
    .select('id, etichetta, indirizzo, tipo, geo, usato_volte')
    .eq('utente', utenteId)

  // Casa e lavoro in cima sempre, poi i più usati: l'ordine per frequenza
  // funziona solo dopo qualche settimana, e nel frattempo qualcosa deve
  // esserci comunque al posto giusto.
  const peso = (t: string) => (t === 'casa' ? 0 : t === 'lavoro' ? 1 : 2)

  return (data ?? [])
    .map((r) => {
      const c = (r.geo as unknown as { coordinates?: [number, number] })?.coordinates
      return {
        id: r.id,
        etichetta: r.etichetta,
        indirizzo: r.indirizzo,
        tipo: r.tipo as TipoLuogo,
        lat: c?.[1] ?? 0,
        lng: c?.[0] ?? 0,
        usate: r.usato_volte ?? 0,
      }
    })
    .sort((a, b) => peso(a.tipo) - peso(b.tipo) || b.usate - a.usate)
    .map(({ usate: _, ...l }) => l)
}

export async function salvaLuogo(utenteId: string, l: {
  etichetta: string; indirizzo: string; lat: number; lng: number; tipo?: TipoLuogo
}) {
  const tipo = l.tipo ?? 'altro'
  // Casa e lavoro sono unici: risalvarli sostituisce, non duplica.
  if (tipo !== 'altro') {
    await db.from('luoghi_salvati').delete().eq('utente', utenteId).eq('tipo', tipo)
  }
  const { data, error } = await db.from('luoghi_salvati').insert({
    utente: utenteId,
    etichetta: l.etichetta.trim(),
    indirizzo: l.indirizzo.trim(),
    geo: `SRID=4326;POINT(${l.lng} ${l.lat})`,
    tipo,
  }).select('id').single()
  if (error) throw new Error(error.message)
  return data.id as string
}

export async function dimenticaLuogo(utenteId: string, id: string) {
  await db.from('luoghi_salvati').delete().eq('utente', utenteId).eq('id', id)
}

/** Si segna l'uso: dopo qualche settimana l'ordine per frequenza è quello giusto. */
export async function segnaUso(utenteId: string, id: string) {
  const { data } = await db
    .from('luoghi_salvati').select('usato_volte').eq('id', id).eq('utente', utenteId).maybeSingle()
  if (!data) return
  await db.from('luoghi_salvati').update({
    usato_volte: (data.usato_volte ?? 0) + 1,
    usato_il: new Date().toISOString(),
  }).eq('id', id)
}
