import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { Telaio } from '../../../components/Telaio.tsx'
import { MarchioEsteso } from '../../../components/Marchio.tsx'
import { SegnoAvanti } from '../../../components/segni.tsx'
import { guscio } from '../../../server/guscio.ts'
import { chiInvita, BISCOTTO_INVITO } from '../../../server/inviti.ts'

export const dynamic = 'force-dynamic'

/**
 * L'arrivo da un invito.
 *
 * Chi apre questo collegamento non sa ancora cos'è GO: sa solo che gliel'ha
 * mandato una persona di cui si fida. Quel nome è l'unica cosa che conta in
 * questa schermata, e va detto per primo — spiegare il prodotto prima di
 * dire chi ti ha mandato qui butta via l'unica ragione per cui uno è
 * arrivato.
 *
 * Il codice si mette in un biscotto: chi si registra fra tre giorni resta
 * comunque attribuito a chi l'ha portato.
 */
export default async function Pagina({ params }: { params: Promise<{ codice: string }> }) {
  const { codice } = await params
  const chi = await chiInvita(codice)
  const g = await guscio()

  // Un codice che non esiste non merita una schermata d'errore: chi lo apre
  // non ha sbagliato niente, l'ha solo ricevuto storto.
  if (!chi) redirect('/')

  // Chi è già dentro non va registrato di nuovo.
  if (g.utente) redirect('/')

  const store = await cookies()
  store.set(BISCOTTO_INVITO, codice.toUpperCase(), {
    path: '/', maxAge: 60 * 60 * 24 * 30, sameSite: 'lax',
  })

  return (
    <Telaio vetrina {...g}>
      <div className="fascia">
        <div className="dentro dentro-stretto invito">
          <MarchioEsteso dimensione={44} id="invito" />
          <h1 className="t-titolo" style={{ marginTop: 'var(--s7)' }}>
            {chi.nome} ti ha invitato su GO
          </h1>
          <p className="t-guida" style={{ margin: 'var(--s4) 0 var(--s6)', maxWidth: '44ch' }}>
            GO mette in contatto chi sta già facendo un viaggio e chi deve
            farlo. Non è un taxi: chi guida sarebbe partito comunque, e si
            dividono le spese.
          </p>
          <div className="azioni">
            <a href="/entra" className="azione azione-piena">
              Crea il tuo account <SegnoAvanti />
            </a>
            <a href="/come-funziona" className="azione azione-vuota">Prima dimmi come funziona</a>
          </div>
          <p className="t-nota" style={{ marginTop: 'var(--s5)', maxWidth: '46ch' }}>
            Nessun premio, né per te né per {chi.nome}: serve solo a sapere
            come ci si passa parola. Puoi iscriverti anche senza questo
            collegamento.
          </p>
        </div>
      </div>
    </Telaio>
  )
}
