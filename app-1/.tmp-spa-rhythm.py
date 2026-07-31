from pathlib import Path
p=Path('src/pages/SpaPage.tsx')
s=p.read_text().replace('className="min-h-screen bg-page text-page-foreground"','className="spa-page min-h-screen bg-page text-page-foreground [&>section]:py-12 sm:[&>section]:py-16 lg:[&>section]:py-20"')
p.write_text(s)
