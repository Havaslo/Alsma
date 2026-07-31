from pathlib import Path
p=Path('src/components/site/SpaAdditionalSections.tsx')
s=p.read_text().replace('additionalServices, menu, onOpenRequest', 'additionalServices, menu').replace('; readonly onOpenRequest: SpaRequestOpenHandler', '')
p.write_text(s)
