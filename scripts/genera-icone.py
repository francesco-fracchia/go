"""
Genera le icone PNG dell'applicazione.

Stessa geometria del marchio vettoriale in `src/components/Marchio.tsx`,
tenuta allineata a mano: la G è un anello con l'apertura tagliata in
diagonale più una barra, la O un anello chiuso, su una griglia 219×120
riportata dentro un quadrato di 100.

Si disegna a quattro volte la dimensione e si riduce: è l'antialiasing del
poveraccio, e su un'icona da 192 pixel non si distingue da quello vero.
"""
import zlib, struct, math, os

SUPER = 4

VIOLA = (79, 53, 245)      # --accento
BIANCO = (255, 255, 255)   # --su-accento
NERO = (10, 10, 15)

# La stessa trasformazione dell'SVG: translate(11 28.6) scale(0.356)
SPOSTA_X, SPOSTA_Y, SCALA = 11.0, 28.6, 0.356
RAGGIO_SQUADRO = 26.0      # rx del rettangolo, su 100

def png(percorso, n, pixel):
    grezzo = b''.join(
        b'\x00' + bytes(v for x in range(n) for v in pixel[y * n + x])
        for y in range(n)
    )
    def blocco(tipo, dati):
        c = tipo + dati
        return struct.pack('>I', len(dati)) + c + struct.pack('>I', zlib.crc32(c))
    with open(percorso, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n')
        f.write(blocco(b'IHDR', struct.pack('>IIBBBBB', n, n, 8, 6, 0, 0, 0)))
        f.write(blocco(b'IDAT', zlib.compress(grezzo, 9)))
        f.write(blocco(b'IEND', b''))

def dentro_squadro(x, y, lato, raggio):
    dx = max(raggio - x, 0, x - (lato - raggio))
    dy = max(raggio - y, 0, y - (lato - raggio))
    return math.hypot(dx, dy) <= raggio

def dentro_segno(mx, my):
    """Vero se il punto, in coordinate del marchio, sta dentro le lettere."""
    # G: anello aperto fra -42° e 12.0° — l'estremo basso è dove la barra
    # copre esattamente il taglio radiale, non un grado più in là.
    d = math.hypot(mx - 52, my - 60)
    if 29.5 <= d <= 50.5:
        ang = math.degrees(math.atan2(my - 60, mx - 52))
        if not (-42 <= ang <= 12.0):
            return True
    # la barra della G
    if 58 <= mx <= 102.5 and abs(my - 60) <= 10.5:
        return True
    # il montante: senza, a trenta pixel il segno si legge «CO»
    if abs(mx - 92) <= 10.5 and 60 <= my <= 84:
        return True
    # O: anello chiuso
    return 29.5 <= math.hypot(mx - 166, my - 60) <= 50.5

def genera(percorso, n, fondo, segno, mascherabile=False):
    N = n * SUPER
    # Un'icona mascherabile viene ritagliata dal sistema: il segno sta nel
    # 60% centrale, il resto è margine che si può mangiare senza tagliarlo.
    margine = int(N * 0.20) if mascherabile else 0
    lato = N - margine * 2
    k = lato / 100.0

    grande = []
    for y in range(N):
        for x in range(N):
            lx, ly = (x - margine) / k, (y - margine) / k
            if not (0 <= lx <= 100 and 0 <= ly <= 100
                    and dentro_squadro(lx, ly, 100, RAGGIO_SQUADRO)):
                grande.append((0, 0, 0, 0)); continue
            mx = (lx - SPOSTA_X) / SCALA
            my = (ly - SPOSTA_Y) / SCALA
            grande.append((segno if dentro_segno(mx, my) else fondo) + (255,))

    piccolo = []
    for y in range(n):
        for x in range(n):
            sr = sg = sb = sa = 0
            for dy in range(SUPER):
                for dx in range(SUPER):
                    p = grande[(y * SUPER + dy) * N + (x * SUPER + dx)]
                    a = p[3] / 255
                    sr += p[0] * a; sg += p[1] * a; sb += p[2] * a; sa += a
            if sa < 0.001:
                piccolo.append((0, 0, 0, 0))
            else:
                piccolo.append((round(sr / sa), round(sg / sa), round(sb / sa),
                                round(sa / (SUPER * SUPER) * 255)))
    png(percorso, n, piccolo)
    print(f'  {percorso}  {n}×{n}')

os.makedirs('public', exist_ok=True)
print('icone:')
genera('public/icona-192.png', 192, VIOLA, BIANCO)
genera('public/icona-512.png', 512, VIOLA, BIANCO)
genera('public/icona-mascherabile.png', 512, VIOLA, BIANCO, mascherabile=True)
genera('public/apple-touch-icon.png', 180, VIOLA, BIANCO)
# Il distintivo delle notifiche viene mostrato monocromo: si disegna scuro
# su trasparente, che è come Android lo vuole.
genera('public/badge.png', 96, NERO, BIANCO)


def png_rettangolare(percorso, larghezza, altezza, pixel):
    """Come png(), ma non quadrato: il marchio disteso è largo il doppio."""
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


def orizzontale(percorso, altezza, segno):
    """Il marchio disteso, senza riquadro: per la firma di una mail, un
    volantino, la carta intestata di una convenzione. Fondo trasparente,
    così si appoggia dove serve."""
    larghezza = round(altezza * 219 / 120)
    pixel = []
    for y in range(altezza):
        for x in range(larghezza):
            copertura = 0
            for sy in range(SUPER):
                for sx in range(SUPER):
                    mx = (x + (sx + 0.5) / SUPER) / larghezza * 219
                    my = (y + (sy + 0.5) / SUPER) / altezza * 120
                    if dentro_segno(mx, my):
                        copertura += 1
            a = round(255 * copertura / (SUPER * SUPER))
            pixel.append((segno[0], segno[1], segno[2], a))
    png_rettangolare(percorso, larghezza, altezza, pixel)
    print(f'  {percorso}  {larghezza}×{altezza}')


import os
os.makedirs('public/marchio', exist_ok=True)
print('marchio disteso:')
orizzontale('public/marchio/go-viola.png', 120, VIOLA)
orizzontale('public/marchio/go-viola-grande.png', 320, VIOLA)
orizzontale('public/marchio/go-bianco.png', 120, BIANCO)
