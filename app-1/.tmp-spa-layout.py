from pathlib import Path
p=Path('src/components/admin/AdminSpaEditor.tsx')
s=p.read_text()
s=s.replace('addLabel="Добавить процедуру" itemKey="massages"', 'addLabel="Добавить процедуру" layout="table" itemKey="massages"')
s=s.replace('addLabel="Добавить услугу" itemKey="additional-services"', 'addLabel="Добавить услугу" layout="table" itemKey="additional-services"')
p.write_text(s)
