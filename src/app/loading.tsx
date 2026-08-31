import { Marchio } from '../components/Marchio.tsx'

/**
 * Il momento in cui non c'è ancora niente.
 *
 * Next la mostra da sola mentre una schermata si prepara sul server. Non è
 * uno scheletro che finge il contenuto — a schermate così diverse fra loro
 * uno scheletro generico mente sulla forma di quello che arriva — ma il
 * segno, che pulsa piano. Dice «sto arrivando» senza promettere cosa.
 */
export default function Attesa() {
  return (
    <div className="attesa" role="status" aria-label="Un attimo">
      <Marchio variante="nudo" dimensione={34} id="attesa" />
    </div>
  )
}
