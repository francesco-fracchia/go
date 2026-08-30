/**
 * Ritorno dalle carte che richiedono l'autenticazione della banca.
 *
 * Alcune carte europee mandano l'utente sul sito della banca e lo
 * riportano qui: senza questa pagina il viaggio finisce su un errore
 * proprio dopo che la banca ha detto di sì.
 */
export default function Pagina() {
  return (
    <main style={{ maxWidth: 420, margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
      <h1 style={{ fontSize: 24, marginBottom: 10 }}>Carta salvata</h1>
      <p style={{ color: 'var(--inchiostro-2)', fontSize: 15, marginBottom: 24 }}>
        Puoi tornare a prenotare.
      </p>
      <a href="/viaggi" style={{ fontWeight: 600 }}>I tuoi viaggi →</a>
    </main>
  )
}
