import { Telaio } from '../../components/Telaio.tsx'
import { guscio } from '../../server/guscio.ts'
import {
  Domande, PER_CHI_CERCA, PER_CHI_OFFRE, PER_TUTTI,
} from '../../components/Domande.tsx'
import { SegnoAvanti } from '../../components/segni.tsx'

export const dynamic = 'force-dynamic'

/**
 * Le domande, tutte.
 *
 * Divise per chi le fa: chi cerca un passaggio e chi lo offre hanno dubbi
 * diversi, e un elenco unico obbliga tutti a leggere metà roba che non li
 * riguarda.
 *
 * In fondo c'è come si parla con una persona vera. Un centro assistenza
 * che non finisce con un indirizzo è un muro con le domande scritte sopra.
 */
export default async function Pagina() {
  const g = await guscio()
  return (
    <Telaio {...g}>
      <div className="fascia">
        <div className="dentro dentro-app aiuto-dentro">
          <header className="aiuto-testa">
            <p className="occhiello">Domande</p>
            <h1 className="t-titolo" style={{ marginTop: 'var(--s3)' }}>
              Come funziona GO
            </h1>
            <p className="t-guida" style={{ marginTop: 'var(--s4)', maxWidth: '52ch' }}>
              Ogni risposta descrive quello che l&apos;applicazione fa davvero.
              Se qualcosa non c&apos;è, qui non lo trovi scritto.
            </p>
          </header>

          <section>
            <h2 className="t-sezione">Se cerchi un passaggio</h2>
            <Domande domande={PER_CHI_CERCA} aperte />
          </section>

          <section>
            <h2 className="t-sezione">Se offri un passaggio</h2>
            <Domande domande={PER_CHI_OFFRE} aperte />
          </section>

          <section>
            <h2 className="t-sezione">Fiducia e responsabilità</h2>
            <Domande domande={PER_TUTTI} aperte />
          </section>

          <section className="aiuto-contatto">
            <h2 className="t-sezione">Non c&apos;è la tua domanda?</h2>
            <p className="t-corpo" style={{ margin: 'var(--s3) 0 var(--s5)', maxWidth: '54ch' }}>
              Scrivici. Rispondiamo noi, non un modulo: siamo poche persone e
              GO è appena nato, quindi le domande che ci fai adesso cambiano
              quello che costruiamo dopo.
            </p>
            <a href="/legale/contatto" className="azione azione-piena">
              Come contattarci <SegnoAvanti />
            </a>
          </section>
        </div>
      </div>
    </Telaio>
  )
}
