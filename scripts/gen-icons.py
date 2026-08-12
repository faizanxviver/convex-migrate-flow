import struct, zlib

def make_icon(size, path, bg=(11,18,32,255), fg=(52,211,153,255), fg2=(245,158,11,255)):
    r = int(size * 0.22)
    def inside(x, y):
        x0, y0 = r, r
        x1, y1 = size - 1 - r, size - 1 - r
        if x < x0 or x > x1 or y < y0 or y > y1:
            cx = min(max(x, x0), x1); cy = min(max(y, y0), y1)
            return (x-cx)**2 + (y-cy)**2 <= r*r
        return True
    rows = []
    vw = int(size * 0.16)
    vx = int(size * 0.22)
    vx2 = size - 1 - vx - vw
    top = int(size * 0.26); bot = size - 1 - int(size * 0.26)
    mh = int(size * 0.13)
    my = size // 2
    for y in range(size):
        row = bytearray()
        for x in range(size):
            if not inside(x, y):
                row += bytes(bg[:3] + (0,))
                continue
            t = (x + y) / (2 * (size - 1))
            c = tuple(int(a + (b - a) * t) for a, b in zip(fg, fg2))
            if (vx <= x <= vx + vw or vx2 <= x <= vx2 + vw) and top <= y <= bot:
                row += bytes(c + (255,))
            elif vx <= x <= vx2 + vw and my - mh <= y <= my + mh:
                row += bytes(c + (255,))
            else:
                row += bytes(bg + (255,))
        rows.append(bytes(row))
    raw = b''.join(b'\x00' + r for r in rows)
    def chunk(tag, data):
        c = struct.pack('>I', len(data)) + tag + data
        return c + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)
    png = b'\x89PNG\r\n\x1a\n'
    png += chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0))
    png += chunk(b'IDAT', zlib.compress(raw, 9))
    png += chunk(b'IEND', b'')
    open(path, 'wb').write(png)
    print('wrote', path, len(png), 'bytes')

make_icon(192, 'public/icon-192.png')
make_icon(512, 'public/icon-512.png')
