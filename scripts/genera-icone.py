"""
Genera le icone PNG dell'applicazione.

Il marchio è un segno figurativo — quadrato con angoli morbidi, sfumatura
radiale calda, le lettere GO in negativo — perché la parola «GO» da sola non
è registrabile. Qui si disegna con la matematica dei pixel invece che con
un font: serve solo per due lettere, e toglie una dipendenza da un carattere
che potrebbe non essere installato dove si costruisce.

Si disegna a quattro volte la dimensione e si riduce: è l'antialiasing del
poveraccio, e su un'icona da 192 pixel non si distingue da quello vero.
"""
import zlib, struct, math, os

SUPER = 4  # fattore di supercampionamento

def png(percorso, larghezza, altezza, pixel):
    grezzo = b''.join(
        b'\x00' + bytes(v for x in range(larghezza) for v in pixel[y * larghezza + x])
        for y in range(altezza)
    )
    def blocco(tipo, dati):
        c = tipo + dati
        return struct.pack('>I', len(dati)) + c + struct.pack('>I', zlib.crc32(c))
    with open(percorso, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n')
        f.write(blocco(b'IHDR', struct.pack('>IIBBBBB', larghezza, altezza, 8, 6, 0, 0, 0)))
        f.write(blocco(b'IDAT', zlib.compress(grezzo, 9)))
        f.write(blocco(b'IEND', b''))

def misto(a, b, t):
    t = max(0.0, min(1.0, t))
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))

# La stessa sfumatura del marchio nell'interfaccia.
LUCE   = (255, 217, 184)
MEDIO  = (242, 145, 94)
SCURO  = (200, 90, 42)

def sfumatura(x, y, n):
    """Radiale, con il fuoco al 68% di larghezza e al 42% di altezza."""
    d = math.hypot(x - 0.68 * n, y - 0.42 * n) / (n * 0.85)
    return misto(LUCE, MEDIO, d / 0.42) if d < 0.42 else misto(MEDIO, SCURO, (d - 0.42) / 0.58)

def dentro_quadrato_morbido(x, y, n, raggio):
    """Quadrato con angoli arrotondati: distanza di Chebyshev smussata."""
    dx = max(raggio - x, 0, x - (n - raggio))
    dy = max(raggio - y, 0, y - (n - raggio))
    return math.hypot(dx, dy) <= raggio

def dentro_o(x, y, cx, cy, r, spessore):
    d = math.hypot(x - cx, y - cy)
    return r - spessore <= d <= r

def dentro_g(x, y, cx, cy, r, spessore):
    d = math.hypot(x - cx, y - cy)
    if not (r - spessore <= d <= r):
        # la barretta orizzontale della G
        return (cx <= x <= cx + r) and (cy - spessore * 0.5 <= y <= cy + spessore * 0.5)
    ang = math.degrees(math.atan2(y - cy, x - cx))  # 0 = destra, positivo in basso
    return not (-38 <= ang <= 8)                     # apertura della G

def genera(percorso, n, mascherabile=False):
    N = n * SUPER
    # Un'icona mascherabile viene ritagliata: il segno sta nel 60% centrale,
    # il resto è margine che il sistema può mangiare senza tagliare le lettere.
    margine = int(N * 0.20) if mascherabile else 0
    lato = N - margine * 2
    raggio = lato * 0.29

    cy = margine + lato * 0.5
    r  = lato * 0.155
    sp = lato * 0.072
    cxg = margine + lato * 0.325
    cxo = margine + lato * 0.675

    grande = []
    for y in range(N):
        for x in range(N):
            lx, ly = x - margine, y - margine
            if not (0 <= lx < lato and 0 <= ly < lato and
                    dentro_quadrato_morbido(lx, ly, lato, raggio)):
                grande.append((0, 0, 0, 0)); continue
            if dentro_g(x, y, cxg, cy, r, sp) or dentro_o(x, y, cxo, cy, r, sp):
                grande.append((255, 255, 255, 255)); continue
            grande.append(sfumatura(lx, ly, lato) + (255,))

    # Riduzione: la media dei SUPER×SUPER pixel, premoltiplicata sull'alfa
    # per non veder comparire aloni scuri sui bordi trasparenti.
    piccolo = []
    for y in range(n):
        for x in range(n):
            sr = sg = sb = sa = 0
            for dy in range(SUPER):
                for dx in range(SUPER):
                    p = grande[(y * SUPER + dy) * N + (x * SUPER + dx)]
                    a = p[3] / 255
                    sr += p[0] * a; sg += p[1] * a; sb += p[2] * a; sa += a
            k = SUPER * SUPER
            if sa < 0.001:
                piccolo.append((0, 0, 0, 0))
            else:
                piccolo.append((round(sr / sa), round(sg / sa), round(sb / sa), round(sa / k * 255)))
    png(percorso, n, n, piccolo)
    print(f'  {percorso}  {n}×{n}')

os.makedirs('public', exist_ok=True)
print('icone:')
genera('public/icona-192.png', 192)
genera('public/icona-512.png', 512)
genera('public/icona-mascherabile.png', 512, mascherabile=True)
genera('public/badge.png', 96)
genera('public/apple-touch-icon.png', 180)
