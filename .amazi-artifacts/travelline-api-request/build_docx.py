from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from xml.sax.saxutils import escape

OUT = Path('/workspace/deliverables/travelline-api-request-for-booking-and-agents.docx')
OUT.parent.mkdir(parents=True, exist_ok=True)

NS_W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'


def run(text, *, bold=False, italic=False, size=21, color='222222', font='Arial', hyperlink=None):
    rpr = [f'<w:rFonts w:ascii="{font}" w:hAnsi="{font}" w:eastAsia="{font}" w:cs="{font}"/>',
           f'<w:sz w:val="{size}"/><w:szCs w:val="{size}"/>', f'<w:color w:val="{color}"/>']
    if bold: rpr.append('<w:b/><w:bCs/>')
    if italic: rpr.append('<w:i/><w:iCs/>')
    r = f'<w:r><w:rPr>{"".join(rpr)}</w:rPr><w:t xml:space="preserve">{escape(text)}</w:t></w:r>'
    if hyperlink is not None:
        return f'<w:hyperlink r:id="{hyperlink}" w:history="1">{r}</w:hyperlink>'
    return r


def para(parts, *, style=None, before=0, after=100, line=270, align=None, left=0, first=0, keep=False):
    ppr = [f'<w:spacing w:before="{before}" w:after="{after}" w:line="{line}" w:lineRule="auto"/>']
    if style: ppr.append(f'<w:pStyle w:val="{style}"/>')
    if align: ppr.append(f'<w:jc w:val="{align}"/>')
    if left or first:
        ppr.append(f'<w:ind w:left="{left}" w:firstLine="{first}"/>')
    if keep: ppr.append('<w:keepNext/>')
    ppr.append('<w:widowControl/>')
    if isinstance(parts, str): parts = [run(parts)]
    return f'<w:p><w:pPr>{"".join(ppr)}</w:pPr>{"".join(parts)}</w:p>'


def cell_paragraph(text, *, bold_prefix=None, size=19, color='222222', bold=False):
    pieces = []
    lines = text.split('\n')
    for index, line_text in enumerate(lines):
        if index:
            pieces.append('<w:r><w:br/></w:r>')
        if bold_prefix and line_text.startswith(bold_prefix):
            pieces.extend([run(bold_prefix, bold=True, size=size, color=color), run(line_text[len(bold_prefix):], size=size, color=color)])
        else:
            pieces.append(run(line_text, bold=bold, size=size, color=color))
    return para(pieces, after=60, line=245)


def cell(text, width, *, fill=None, header=False, bold=False):
    shade = f'<w:shd w:fill="{fill}" w:val="clear"/>' if fill else ''
    valign = '<w:vAlign w:val="center"/>'
    margins = '<w:tcMar><w:top w:w="105" w:type="dxa"/><w:left w:w="130" w:type="dxa"/><w:bottom w:w="105" w:type="dxa"/><w:right w:w="130" w:type="dxa"/></w:tcMar>'
    tcpr = f'<w:tcPr><w:tcW w:w="{width}" w:type="dxa"/>{shade}{valign}{margins}</w:tcPr>'
    if isinstance(text, list):
        content = ''.join(text)
    else:
        content = cell_paragraph(text, size=19, color='FFFFFF' if header else '222222', bold=header)
    return f'<w:tc>{tcpr}{content}</w:tc>'


def table(rows):
    widths = [2800, 7640]
    border = '<w:tblBorders><w:top w:val="single" w:sz="5" w:space="0" w:color="D9D9D9"/><w:left w:val="single" w:sz="5" w:space="0" w:color="D9D9D9"/><w:bottom w:val="single" w:sz="5" w:space="0" w:color="D9D9D9"/><w:right w:val="single" w:sz="5" w:space="0" w:color="D9D9D9"/><w:insideH w:val="single" w:sz="5" w:space="0" w:color="D9D9D9"/><w:insideV w:val="single" w:sz="5" w:space="0" w:color="D9D9D9"/></w:tblBorders>'
    tblpr = f'<w:tblPr><w:tblW w:w="10440" w:type="dxa"/><w:tblLayout w:type="fixed"/>{border}<w:tblCellMar><w:top w:w="105" w:type="dxa"/><w:left w:w="130" w:type="dxa"/><w:bottom w:w="105" w:type="dxa"/><w:right w:w="130" w:type="dxa"/></w:tblCellMar></w:tblPr>'
    grid = '<w:tblGrid>' + ''.join(f'<w:gridCol w:w="{w}"/>' for w in widths) + '</w:tblGrid>'
    tr_xml = []
    for i, row in enumerate(rows):
        if i == 0:
            trpr = '<w:trPr><w:tblHeader w:val="true"/><w:cantSplit/></w:trPr>'
            cells = [cell(row[0], widths[0], fill='1F4E78', header=True), cell(row[1], widths[1], fill='1F4E78', header=True)]
        else:
            fill = 'F3F7FA' if i % 2 == 0 else None
            trpr = '<w:trPr><w:cantSplit/></w:trPr>'
            cells = [cell(row[0], widths[0], fill=fill), cell(row[1], widths[1], fill=fill)]
        tr_xml.append(f'<w:tr>{trpr}{"".join(cells)}</w:tr>')
    return f'<w:tbl>{tblpr}{grid}{"".join(tr_xml)}</w:tbl>'


body = []
body.append(para('Запрос на подключение TravelLine Partner API', style='Title', before=0, after=60, line=400, keep=True))
body.append(para('Собственный модуль бронирования и ИИ-агенты АЛСМА', style='Subtitle', before=0, after=180, line=300, keep=True))
body.append(para([
    run('Добрый день! ', bold=True),
    run('Для замены Eptera на TravelLine мы подключаем собственный модуль бронирования сайта, а также текстового и голосового ИИ-агентов. Просим подтвердить и предоставить доступ к API ниже для соответствующих объектов размещения. Запросы к TravelLine будет выполнять наш backend; секретные ключи не будут передаваться браузеру или ИИ-моделям.')
], after=150, line=280))
body.append(para('Необходимые API', style='Heading1', before=80, after=90, line=300, keep=True))
rows = [
    ['API и назначение', 'Что требуется для нашего сценария'],
    ['Search API\nОбязательно', [
        para([run('Поиск актуальных предложений: ', bold=True, size=19), run('доступность, категории номеров, тарифы, цена и условия по датам и составу гостей. Используется модулем сайта и всеми агентами, которым нужно отвечать о наличии номеров.', size=19)], after=50, line=245),
        para([run('Метод: ', bold=True, size=19), run('GET /api/search/v1/properties/{propertyId}/room-stays', size=19, font='Consolas')], after=30, line=245)
    ]],
    ['Content API\nДля каталога', [
        para([run('Контент объектов и номеров: ', bold=True, size=19), run('категории, тарифы, описания, фотографии, удобства и услуги; нужен для загрузки или сопоставления карточек сайта с ID TravelLine. Если контентная часть для нашего подключения недоступна, просим сообщить способ получить устойчивые ID и связать категории и тарифы.', size=19)], after=30, line=245)
    ]],
    ['Reservation API\nОбязательно', [
        para([run('Создание брони на конкретного заказчика и гостей: ', bold=True, size=19), run('проверка условий и цены (`verify`), затем создание (`create booking`) с передачей дат, выбранных ID категории и тарифа, контактных данных заказчика и списка гостей. Просим включить пилотный доступ и предоставить полную спецификацию методов.', size=19)], after=50, line=245),
        para([run('Методы: ', bold=True, size=19), run('POST /api/reservation/v1/bookings/verify и POST /api/reservation/v1/bookings', size=19, font='Consolas')], after=30, line=245)
    ]],
    ['Read Reservation API\nДля синхронизации', [
        para([run('Чтение списка, деталей и статусов брони: ', bold=True, size=19), run('для личного кабинета гостя и ответов агентов по существующим броням, включая брони из других каналов. Просим подтвердить, будут ли здесь доступны брони, созданные нашим модулем.', size=19)], after=30, line=245)
    ]],
    ['Вебхуки\nЕсли доступны', [
        para([run('Уведомления об изменениях: ', bold=True, size=19), run('создание, изменение и отмена броней, а также обновление контента/доступности. Если такие события не поддерживаются для данного типа подключения, просим указать рекомендуемый способ и периодичность синхронизации через Read Reservation API.', size=19)], after=30, line=245)
    ]],
]
body.append(table(rows))
body.append(para('Предлагаемый поток бронирования', style='Heading1', before=180, after=75, line=300, keep=True))
body.append(para([
    run('1. ', bold=True), run('Наш сервер ищет предложения через Search API.  '),
    run('2. ', bold=True), run('Гость выбирает тариф и передаёт данные заказчика и проживающих.  '),
    run('3. ', bold=True), run('Перед оплатой вызывается Reservation API verify; при изменении условий гость повторно подтверждает новый вариант.  '),
    run('4. ', bold=True), run('После успешной оплаты через нашу ЮKassa сервер создаёт бронь в TravelLine.  '),
    run('5. ', bold=True), run('Мы сохраняем номер брони TravelLine и отправляем гостю подтверждение.')
], after=90, line=260))
body.append(para('Просим подтвердить условия и предоставить', style='Heading1', before=100, after=75, line=300, keep=True))
for text in [
    'Модель подключения для нашего сайта и агентов: доступ от объекта размещения или регистрация/сертификация партнёрского канала; тестовая среда и порядок перехода в рабочую.',
    'Для каждого объекта: propertyId, доступы к указанным API и перечень доступных категорий, тарифов и услуг. client_id/client_secret просим передать по защищённому каналу.',
    'Активацию пилотного Reservation API и спецификацию verify/create, включая обязательные поля заказчика и гостей, checksum, createBookingToken, externalNumber, а также методы чтения, изменения, отмены и расчёта штрафа, если они входят в доступ.',
    'Подтверждение схемы оплаты через нашу ЮKassa: как передавать фактически полученную предоплату в бронь; предусмотрено ли удержание доступности между verify и созданием; как действовать, если оплата прошла, но TravelLine не подтвердил бронь.',
    'В переписке от 28 октября 2026 года вы указывали пилотное ручное включение API бронирования и комиссию 4%. Просим подтвердить актуальность этих условий для нашего объекта и подключения.'
]:
    body.append(para([run('• ', bold=True), run(text)], left=260, first=-180, after=45, line=255))
body.append(para([
    run('Важно: ', bold=True), run('TravelLine должен быть источником актуальной доступности и тарифов для сайта и агентов. Просим подтвердить, что нужные категории и тарифы будут открыты для нашего канала в Booking Engine/TravelLine и возвращаться в Search API.')
], before=65, after=110, line=255))
body.append(para('Официальные материалы', style='Heading1', before=70, after=50, line=300, keep=True))
body.append(para([
    run('TravelLine Partner API: ', bold=True, size=19), run('общая документация', size=19, color='0563C1', hyperlink='rId1'),
    run('  |  Search API: ', size=19), run('получение вариантов размещения', size=19, color='0563C1', hyperlink='rId2'),
    run('  |  Reservation API: ', size=19), run('бронирование', size=19, color='0563C1', hyperlink='rId3'),
    run('  |  Content API: ', size=19), run('данные объектов', size=19, color='0563C1', hyperlink='rId4')
], after=0, line=245))

footer = '''<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:pPr><w:tabs><w:tab w:val="right" w:pos="10440"/></w:tabs><w:spacing w:before="0" w:after="0"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="16"/><w:color w:val="777777"/></w:rPr><w:t>АЛСМА | Запрос по интеграции TravelLine</w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="16"/><w:color w:val="777777"/></w:rPr><w:tab/></w:r><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="16"/><w:color w:val="777777"/></w:rPr><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>1</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p></w:ftr>'''

document = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="{NS_W}" xmlns:r="{NS_R}" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><w:body>{''.join(body)}<w:sectPr><w:footerReference w:type="default" r:id="rId5"/><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="820" w:right="900" w:bottom="820" w:left="900" w:header="360" w:footer="360" w:gutter="0"/></w:sectPr></w:body></w:document>'''

styles = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="Arial" w:cs="Arial"/><w:sz w:val="21"/><w:szCs w:val="21"/><w:color w:val="222222"/><w:lang w:val="ru-RU" w:eastAsia="ru-RU"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="100" w:line="270" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="Arial"/><w:sz w:val="21"/><w:szCs w:val="21"/><w:color w:val="222222"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:after="60" w:line="400" w:lineRule="auto"/></w:pPr><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:sz w:val="38"/><w:szCs w:val="38"/><w:color w:val="000000"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:after="180"/></w:pPr><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:color w:val="000000"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="180" w:after="80" w:line="300" w:lineRule="auto"/></w:pPr><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:sz w:val="26"/><w:szCs w:val="26"/><w:color w:val="000000"/></w:rPr></w:style>
</w:styles>'''

rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://www.travelline.ru/dev-portal/docs/api/" TargetMode="External"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://www.travelline.ru/dev-portal/docs/scenarios/search-api/search-get-accommodation-options-by-property/" TargetMode="External"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://www.travelline.ru/support/knowledge-base/reservation-api-bronirovanie/" TargetMode="External"/>
<Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://www.travelline.ru/support/knowledge-base/content-api-opisanie-obektov-razmeshcheniya/" TargetMode="External"/>
<Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>
</Relationships>'''

root_rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>'''

content_types = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>'''

core = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>Запрос на подключение TravelLine Partner API</dc:title><dc:subject>Собственный модуль бронирования и ИИ-агенты АЛСМА</dc:subject><dc:creator>АЛСМА</dc:creator><cp:keywords>TravelLine, Partner API, бронирование</cp:keywords><dcterms:created xsi:type="dcterms:W3CDTF">2026-11-20T00:00:00Z</dcterms:created></cp:coreProperties>'''
app = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Microsoft Office Word</Application></Properties>'''

with ZipFile(OUT, 'w', ZIP_DEFLATED) as z:
    z.writestr('[Content_Types].xml', content_types)
    z.writestr('_rels/.rels', root_rels)
    z.writestr('word/document.xml', document)
    z.writestr('word/styles.xml', styles)
    z.writestr('word/_rels/document.xml.rels', rels)
    z.writestr('word/footer1.xml', footer)
    z.writestr('docProps/core.xml', core)
    z.writestr('docProps/app.xml', app)
print(OUT)
