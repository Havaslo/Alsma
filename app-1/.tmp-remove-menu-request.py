from pathlib import Path
p=Path('src/pages/SpaPage.tsx')
s=p.read_text().replace('        menu={spa.menu}\n        onOpenRequest={() => setOpen(true)}','        menu={spa.menu}')
p.write_text(s)
