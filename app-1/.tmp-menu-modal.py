from pathlib import Path
p=Path('src/components/site/SpaAdditionalSections.tsx')
s=p.read_text()
s=s.replace('import { useState } from "react";\n','')
s=s.replace('import { Check } from "lucide-react";','import { useState } from "react";\nimport { Check } from "lucide-react";')
s=s.replace('import type { SpaRequestOpenHandler } from "@/components/site/SpaRequestModal";','import type { SpaRequestOpenHandler } from "@/components/site/SpaRequestModal";\nimport { Modal } from "@/components/ui/Modal";')
s=s.replace('}) => (\n  <>\n    <section className="mx-auto max-w-[100rem] px-5 py-24 sm:px-8">','}) => {\n  const [menuOpen, setMenuOpen] = useState(false);\n  return (\n  <>\n    <section className="mx-auto max-w-[100rem] px-5 py-24 sm:px-8">',1)
start='          <div className="mt-6 grid gap-2">'
end='          </div>\n          <button'
a=s.index(start); b=s.index(end,a)+len('          </div>')
s=s[:a]+s[b:]
s=s.replace('onClick={onOpenRequest}\n            type="button"\n          >\n            Меню','onClick={() => setMenuOpen(true)}\n            type="button"\n          >\n            Меню',1)
needle='  </>\n);\n'
s=s.replace(needle,'    <Modal closeLabel="Закрыть" onClose={() => setMenuOpen(false)} open={menuOpen} title="Меню кафе «Минерал»">\n      <div className="space-y-3">\n        {menu.map((item) => (\n          <div className="rounded-2xl bg-page px-5 py-4" key={item.name}>\n            <div className="flex items-start justify-between gap-4">\n              <strong>{item.name}</strong>\n              <span className="shrink-0 font-semibold text-brand">{item.price}</span>\n            </div>\n            <p className="mt-1 text-sm text-muted-ui-foreground">{item.description}</p>\n          </div>\n        ))}\n      </div>\n    </Modal>\n  </>\n  );\n};\n',1)
p.write_text(s)
