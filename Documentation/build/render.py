import fitz, sys, os
pdf, out, pages = sys.argv[1], sys.argv[2], [int(x) for x in sys.argv[3].split(',')]
os.makedirs(out, exist_ok=True)
d = fitz.open(pdf)
for p in pages:
    d[p-1].get_pixmap(dpi=70).save(os.path.join(out, f'p{p:02d}.png'))
