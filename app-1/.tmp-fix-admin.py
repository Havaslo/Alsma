from pathlib import Path
p=Path('src/components/admin/AdminSpaEditor.tsx')
s=p.read_text().replace('itemKey,position:i+1,section:"spa",status:"published",title}', 'itemKey:itemKey as string,position:i+1,section:"spa",status:"published",title:title as string}')
p.write_text(s)
