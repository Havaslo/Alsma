from pathlib import Path
p=Path('src/pages/AdminDashboardPage.tsx')
s=p.read_text().replace('<AdminSpaEditor items={spaContent.data?.items} />','<AdminSpaEditor />')
s=s.replace('import { useAdminSiteContent } from "@/lib/site/useSiteContent";\n','')
s=s.replace('  const spaContent = useAdminSiteContent("spa");\n','')
p.write_text(s)
