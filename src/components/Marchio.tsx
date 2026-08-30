/**
 * Il marchio.
 *
 * La parola "GO" non è registrabile da sola: quello che si protegge è il
 * segno figurativo — il quadrato con la sfumatura e la lettera dentro. Per
 * questo non esiste una versione a solo testo del logo.
 */
export function Marchio({ dimensione = 34 }: { dimensione?: number }) {
  return (
    <div
      aria-label="GO"
      style={{
        position: 'relative', display: 'flex', alignItems: 'center',
        justifyContent: 'center', width: dimensione, height: dimensione,
        borderRadius: dimensione * 0.29,
        // Il segno segue il tema: un marchio terracotta su fondo lime è
        // il modo più veloce di far sembrare l'applicazione montata a pezzi.
        background:
          'radial-gradient(circle at 68% 42%, var(--marchio-luce) 0%, var(--accento-vivo) 45%, var(--accento) 100%)',
        boxShadow: '0 2px 10px var(--marchio-alone)',
        flexShrink: 0,
      }}
    >
      <span style={{
        fontFamily: 'var(--titoli)', fontWeight: 700,
        fontSize: dimensione * 0.5, letterSpacing: '-.05em', color: 'var(--su-accento)',
      }}>GO</span>
    </div>
  )
}
