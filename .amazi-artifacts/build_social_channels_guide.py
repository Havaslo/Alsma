from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "deliverables" / "pamyatka-podklyuchenie-socsetey-alsma.pdf"
FONT = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")
FONT_BOLD = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")

pdfmetrics.registerFont(TTFont("DV", str(FONT)))
pdfmetrics.registerFont(TTFont("DV-Bold", str(FONT_BOLD)))
pdfmetrics.registerFontFamily("DV", normal="DV", bold="DV-Bold", italic="DV", boldItalic="DV-Bold")

PAGE_W, PAGE_H = A4
LEFT = RIGHT = 19 * mm
TOP = 22 * mm
BOTTOM = 18 * mm
CONTENT_W = PAGE_W - LEFT - RIGHT

INK = colors.HexColor("#18221E")
MUTED = colors.HexColor("#58635D")
GREEN = colors.HexColor("#416B52")
GREEN_LIGHT = colors.HexColor("#EAF1EB")
LINE = colors.HexColor("#D7DED8")
PALE = colors.HexColor("#F5F7F4")

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(
    name="DocKicker", fontName="DV-Bold", fontSize=8.5, leading=12,
    textColor=GREEN, spaceAfter=10, tracking=1.2,
))
styles.add(ParagraphStyle(
    name="DocTitle", fontName="DV-Bold", fontSize=24, leading=30,
    textColor=INK, spaceAfter=10,
))
styles.add(ParagraphStyle(
    name="DocSubtitle", fontName="DV", fontSize=12, leading=17,
    textColor=MUTED, spaceAfter=12,
))
styles.add(ParagraphStyle(
    name="Section", fontName="DV-Bold", fontSize=16, leading=20,
    textColor=colors.black, spaceBefore=0, spaceAfter=8, keepWithNext=True,
))
styles.add(ParagraphStyle(
    name="Subsection", fontName="DV-Bold", fontSize=11.5, leading=15,
    textColor=colors.black, spaceBefore=9, spaceAfter=4, keepWithNext=True,
))
styles.add(ParagraphStyle(
    name="BodyRu", fontName="DV", fontSize=9.7, leading=14.2,
    textColor=INK, spaceAfter=6, alignment=TA_LEFT,
    splitLongWords=True, allowWidows=0, allowOrphans=0,
))
styles.add(ParagraphStyle(
    name="BodySmall", fontName="DV", fontSize=8.7, leading=12.2,
    textColor=MUTED, spaceAfter=5, splitLongWords=True,
))
styles.add(ParagraphStyle(
    name="Step", fontName="DV", fontSize=9.5, leading=13.8,
    textColor=INK, leftIndent=16, firstLineIndent=-16,
    spaceAfter=5, splitLongWords=True,
))
styles.add(ParagraphStyle(
    name="BulletRu", fontName="DV", fontSize=9.5, leading=13.8,
    textColor=INK, leftIndent=14, firstLineIndent=-9,
    spaceAfter=4, splitLongWords=True,
))
styles.add(ParagraphStyle(
    name="Mono", fontName="DV", fontSize=7.5, leading=10.3,
    textColor=INK, leftIndent=8, rightIndent=8,
    spaceBefore=3, spaceAfter=8, splitLongWords=True,
))
styles.add(ParagraphStyle(
    name="LinkSmall", fontName="DV", fontSize=8.0, leading=11.4,
    textColor=INK, spaceAfter=4, splitLongWords=True,
))
styles.add(ParagraphStyle(
    name="MiniLabel", fontName="DV-Bold", fontSize=8.3, leading=11,
    textColor=GREEN, spaceBefore=3, spaceAfter=2,
))
styles.add(ParagraphStyle(
    name="CoverLead", fontName="DV-Bold", fontSize=11.3, leading=16,
    textColor=INK, spaceBefore=8, spaceAfter=8,
))
styles.add(ParagraphStyle(
    name="CenterSmall", fontName="DV", fontSize=8.5, leading=12,
    textColor=MUTED, alignment=TA_CENTER,
))


def P(text, style="BodyRu"):
    return Paragraph(text, styles[style])


def step(n, text):
    return P(f"<b>{n}.</b>  {text}", "Step")


def bullet(text):
    return P(f"<font color='{GREEN.hexval()}'><b>•</b></font>  {text}", "BulletRu")


def check(text):
    return P(f"<b>[ ]</b>  {text}", "Step")


def section(num, title, intro=None):
    parts = [P(f"{num}  {title}", "Section")]
    if intro:
        parts.append(P(intro))
    return parts


def link(label, url):
    safe = url.replace("&", "&amp;")
    return f'<link href="{safe}" color="{GREEN.hexval()}"><u>{label}</u></link>'


def draw_page(canvas, doc):
    canvas.saveState()
    page = doc.page
    if page > 1:
        canvas.setStrokeColor(LINE)
        canvas.setLineWidth(0.6)
        canvas.line(LEFT, PAGE_H - 13 * mm, PAGE_W - RIGHT, PAGE_H - 13 * mm)
        canvas.setFont("DV-Bold", 7.5)
        canvas.setFillColor(GREEN)
        canvas.drawString(LEFT, PAGE_H - 10.7 * mm, "ALSMA  /  ПАМЯТКА ПО ПОДКЛЮЧЕНИЮ КАНАЛОВ")
    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(0.6)
    canvas.line(LEFT, 12 * mm, PAGE_W - RIGHT, 12 * mm)
    canvas.setFont("DV", 7.5)
    canvas.setFillColor(MUTED)
    canvas.drawString(LEFT, 8 * mm, "Для владельца и администратора каналов ALSMA  ·  22 октября 2026")
    canvas.drawRightString(PAGE_W - RIGHT, 8 * mm, f"{page}")
    canvas.restoreState()


class GuideDoc(BaseDocTemplate):
    def __init__(self, filename):
        super().__init__(
            str(filename), pagesize=A4,
            leftMargin=LEFT, rightMargin=RIGHT,
            topMargin=TOP, bottomMargin=BOTTOM,
            title="Подключение соцсетей к Фабрике контента ALSMA",
            author="ALSMA",
            subject="Пошаговая памятка для Instagram, Facebook, Meta, Дзена, Telegram и MAX",
        )
        frame = Frame(LEFT, BOTTOM, CONTENT_W, PAGE_H - TOP - BOTTOM, id="main")
        self.addPageTemplates([PageTemplate(id="main", frames=frame, onPage=draw_page)])


story = []

# Page 1: purpose and safe handoff overview.
story += [Spacer(1, 18 * mm), P("ALSMA  ·  ФАБРИКА КОНТЕНТА", "DocKicker")]
story += [P("Подключение соцсетей", "DocTitle")]
story += [P("Пошаговая памятка для Instagram, Facebook, Meta, Яндекс.Дзена, Telegram и MAX", "DocSubtitle")]
story += [Spacer(1, 3 * mm)]
story += [P("Что сделать в аккаунтах и что передать нам для настройки", "CoverLead")]
story += [P(
    "Эта инструкция разделяет действия владельца социальных сетей и настройку нашей Фабрики контента. Пароли и коды входа передавать не нужно. Секрет приложения Meta передаётся только через защищённую форму; код привязки Дзена вводится владельцем непосредственно в Telegram-боте.",
)]
story += [Spacer(1, 4 * mm), P("Коротко по результату", "Subsection")]
story += [
    check("Instagram/Facebook: связать профессиональный Instagram со Страницей Facebook, создать приложение Meta и передать нам App ID и App Secret защищённым способом."),
    check("Дзен/Telegram: связать Telegram-канал с каналом Дзена через синхробот. Код доступа остаётся только у владельца и вводится в самом боте."),
    check("MAX: добавить нашего бота в канал и выдать ему только право публикации. Токен бота владельцу сообщества передавать не нужно."),
]
story += [Spacer(1, 4 * mm), P("Важное ограничение на сегодня", "Subsection")]
story += [P(
    "Публикация из контент-плана сейчас работает для VK, MAX и блога сайта. Подключение Instagram пока означает OAuth-доступ к профилю, но не готовую автопубликацию. Связка Telegram → Дзен настраивается отдельно, а сама Фабрика контента пока не отправляет посты в Telegram. Мы не будем считать Instagram или Telegram → Дзен готовыми к автопостингу, пока отдельно не закончим и не проверим эти этапы.",
)]
story += [Spacer(1, 4 * mm), P("Перед началом", "Subsection")]
story += [
    bullet("Подготовьте человека, который имеет доступ к Странице Facebook компании и к нужному Instagram."),
    bullet("Для MAX и Telegram используйте существующие каналы. Создавать новый личный Facebook-профиль или самостоятельно выпускать токены ботов не нужно."),
    bullet("В обычный чат не отправляйте пароли, коды двухфакторной защиты, токены Telegram/MAX, код подключения Дзена или App Secret Meta."),
]
story += [PageBreak()]

# Page 2: Meta setup.
story += section("01", "Instagram, Facebook и приложение Meta", "Сначала проверьте связь аккаунтов, затем зарегистрируйте приложение, которое будет запрашивать разрешение на работу с профилем.")
story += [P("А. Свяжите Instagram со Страницей Facebook", "Subsection")]
story += [P("Если у компании ещё нет Страницы Facebook, создайте Страницу компании под существующим личным профилем: в меню Facebook откройте Страницы → Создать новую Страницу. Не создавайте второй личный профиль. Если Страница ALSMA уже есть, новую создавать не нужно.", "BodySmall")]
story += [
    step(1, "Войдите в Facebook под существующим личным профилем человека, который управляет Страницей ALSMA. Новый личный профиль создавать не нужно."),
    step(2, "Откройте именно Страницу компании ALSMA и перейдите в её Настройки → Связанные аккаунты (или Instagram). Если этот пункт не виден, откройте Meta Business Suite и найдите в настройках Страницу и Instagram-аккаунт."),
    step(3, "Нажмите «Подключить Instagram», войдите в профессиональный профиль и подтвердите связь. Проверьте, что у Страницы ALSMA отображается целевой профиль <b>@alsmannov</b>."),
]
story += [P("Связать аккаунты в Центре аккаунтов недостаточно: для выбранного способа входа профессиональный Instagram должен быть связан именно со Страницей Facebook.", "BodySmall")]
story += [P("Б. Создайте приложение разработчика Meta", "Subsection")]
story += [
    step(4, f"Откройте {link('developers.facebook.com/apps', 'https://developers.facebook.com/apps/')} и войдите под тем же Facebook-профилем. Если Meta предложит регистрацию разработчика, завершите её."),
    step(5, "Нажмите «Создать приложение» (Create App). Если потребуется выбрать тип, выберите Business / Бизнес и бизнес-портфель ALSMA, если он есть в списке. Название можно задать, например, «ALSMA Content Factory»."),
    step(6, "В списке сценариев или продуктов найдите путь <b>Instagram API with Facebook Login</b> (Instagram API с входом через Facebook). Не выбирайте вариант Instagram Login / Business Login, если Meta показывает несколько путей: текущая интеграция ALSMA настроена на Facebook Login."),
    step(7, "В настройках входа через Facebook найдите OAuth-настройки для веба. Если переключатели показаны, включите Client OAuth Login и Web OAuth Login."),
]
story += [P("В. Добавьте callback ALSMA", "Subsection")]
story += [P("В поле Valid OAuth Redirect URIs / Допустимые URI перенаправления вставьте адрес ниже без изменений и сохраните настройки:")]
story += [P("https://8dd6f7cf-ea71-419d-a99c-5f6416bace1f--b80b0d0e.projects.amazi.pro/api/instagram-publishing/callback", "Mono")]
story += [P("Не заменяйте адрес на alsma.ru, preview-ссылку или ссылку профиля. Если кабинет Meta сообщает, что URI не подходит, пришлите нам точный текст ошибки, не подбирая другой адрес самостоятельно.", "BodySmall")]
story += [PageBreak()]

# Page 3: Meta transfer and authorization.
story += section("02", "Данные Meta и подтверждение доступа", "Создание приложения не передаёт нам доступ к аккаунту. Владелец Instagram сам подтвердит разрешения через официальное окно Meta.")
story += [P("Что найти в приложении Meta", "Subsection")]
story += [
    step(1, "Откройте App Settings → Basic / Настройки приложения → Основные."),
    step(2, "Найдите App ID и App Secret. Чтобы показать App Secret, Meta может попросить повторный вход или подтверждение."),
    step(3, "Передайте оба значения только через защищённую форму настройки, которую мы предоставим. App ID не является паролем, но отправьте его вместе с App Secret через эту же защищённую форму."),
]
story += [P("Не отправляйте App Secret в обычный чат, по электронной почте или в документе. Мы не просим пароль Facebook/Instagram, SMS-код, код приложения-аутентификатора или готовый access token.")]
story += [P("Кто будет проходить первый тест", "Subsection")]
story += [
    bullet("Если приложение остаётся в режиме Development / Разработка, вход обычно доступен только людям, у которых есть роль в приложении (например, администратор, разработчик или тестировщик). Владелец приложения уже имеет такую роль."),
    bullet("Если вход будет проходить другой сотрудник, добавьте в роли приложения именно его Facebook-профиль и попросите принять приглашение. Затем он должен иметь доступ к Странице ALSMA и связанному Instagram."),
    bullet("Для подключения людей без роли Meta может потребовать Live-режим, расширенный доступ к нужным разрешениям, проверку приложения или бизнеса. Не переводите приложение в Live и не подавайте заявки на лишние разрешения без согласования с нами."),
]
story += [P("Разрешения, необходимые выбранному Facebook Login-сценарию", "Subsection")]
story += [P("При согласии Meta покажет разрешения, необходимые для обнаружения Страницы и профессионального Instagram-профиля и для публикации контента: <b>pages_show_list</b>, <b>pages_read_engagement</b>, <b>instagram_basic</b>, <b>instagram_content_publish</b>. Запрашивайте только разрешения, необходимые этому сценарию.")]
story += [P("Когда данные будут внесены на сервер", "Subsection")]
story += [
    step(4, "Войдите в Фабрику контента ALSMA и нажмите «Подключить Instagram»."),
    step(5, "В официальном окне Meta выберите Страницу ALSMA, связанную с @alsmannov, подтвердите разрешения и вернитесь в Фабрику."),
    step(6, "Сообщите нам, что авторизация завершилась. Мы проверим, что подключился именно целевой профиль."),
]
story += [P("Подключение OAuth подтверждает доступ к аккаунту, но не означает, что публикация постов Instagram уже реализована. На момент подготовки этой памятки автопубликация Instagram в Фабрике ещё не включена.", "BodySmall")]
story += [PageBreak()]

# Page 4: Zen/Telegram.
story += section("03", "Яндекс.Дзен и Telegram", "Синхробот связывает Telegram-канал с каналом Дзена. Это отдельный сервис; он не является нашим Telegram-ботом и не передаёт посты из Фабрики автоматически.")
story += [P("Подготовьте оба канала", "Subsection")]
story += [
    bullet("Убедитесь, что у компании есть канал в Студии Дзена и Telegram-канал, в котором можно назначать администраторов."),
    bullet("Для синхронизации удобнее отдельный Telegram-канал только для уже согласованных материалов: при автоматическом режиме в Дзен могут уходить новые подходящие публикации этого канала."),
]
story += [P("Свяжите Дзен с синхроботом", "Subsection")]
story += [
    step(1, "Откройте Студию Дзена и выберите нужный канал."),
    step(2, "В настройках канала найдите Кросспостинг → Telegram (названия пунктов могут отличаться). Нажмите «Получить код доступа»."),
    step(3, f"Откройте {link('@zen_sync_bot в Telegram', 'https://t.me/zen_sync_bot')} и нажмите «Запустить» / Start. Вставьте код доступа в диалог только с этим ботом и подтвердите привязку, если он спросит."),
    step(4, "Следуйте подсказкам бота, чтобы включить синхронизацию и подключить Telegram-канал. Если бот попросит добавить его администратором, откройте настройки Telegram-канала → Администраторы → Добавить администратора → найдите @zen_sync_bot. Выдайте только те права, которые бот запрашивает для синхронизации; не добавляйте лишние права на управление каналом."),
    step(5, "Если бот попросит ссылку на Telegram-канал, отправьте её только в диалог с @zen_sync_bot. Выберите автоматический режим, только если хотите переносить новые публикации этого канала в Дзен."),
]
story += [P("Код доступа Дзена не передавайте нам. Введите его сами в диалоге с @zen_sync_bot и сообщите нам только, что привязка завершена.")]
story += [P("Что прислать нам", "Subsection")]
story += [
    bullet("Публичную ссылку на канал Дзена."),
    bullet("Публичную ссылку на Telegram-канал."),
    bullet("Короткое подтверждение, что связь Дзен ↔ Telegram завершена и какой режим выбран: автоматический или ручной."),
]
story += [P("Важно: подключение синхробота ещё не подключает Telegram к нашей Фабрике. Сейчас очередь Фабрики не отправляет посты в Telegram. Сначала с нашей стороны нужно отдельно подготовить и подключить отправку в Telegram; мы сообщим точное имя нашего бота и безопасный порядок подключения, когда этот этап будет готов. Не создавайте собственного бота через BotFather и не передавайте нам токен.", "BodySmall")]
story += [P("После настройки проверьте один согласованный тестовый материал в Telegram и Дзене. Изменение или удаление поста в Telegram может не обновить уже скопированную запись в Дзене; такие правки проверьте и внесите отдельно в Студии Дзена.", "BodySmall")]
story += [PageBreak()]

# Page 5: MAX and handoff checklist/sources.
story += section("04", "Добавление бота MAX в сообщество", "Канал MAX уже выбран в настройках ALSMA. От владельца сообщества нужен доступ боту на публикацию; токен бота не передаётся.")
story += [P("Перед добавлением", "Subsection")]
story += [P("Сначала попросите нас прислать точную ссылку или имя нашего MAX-бота. Добавляйте только тот аккаунт, который мы подтвердим, а не похожего бота из поиска.")]
story += [P("Добавьте бота в канал", "Subsection")]
story += [
    step(1, "Откройте нужный канал в MAX и нажмите на его название."),
    step(2, "Откройте Подписчики → Добавить подписчика. Найдите подтверждённого нами бота и добавьте его в канал."),
    step(3, "Откройте Администраторы → Добавить администратора, выберите этого бота и назначьте ему право <b>write</b> / «Публиковать посты» (название может отличаться). Это право необходимо для отправки публикаций."),
    step(4, "Не выдавайте права на управление каналом, добавление администраторов или удаление чужих публикаций, если MAX не требует их для отдельной согласованной функции."),
    step(5, "Сообщите нам, когда бот добавлен и право публикации сохранено. Токен MAX присылать не нужно. Ссылку на канал вы уже передавали, повторно отправлять её не требуется."),
]
story += [P("После этого мы проверим настройку. Реальный тестовый пост отправим только после отдельного согласования.", "BodySmall")]
story += [P("Что передать нам после выполнения", "Subsection")]
story += [
    check("Meta: App ID и App Secret через защищённую форму; затем подтвердить, что владелец прошёл вход и выбран профиль @alsmannov."),
    check("Дзен/Telegram: публичные ссылки на оба канала и подтверждение завершённой привязки; код доступа не пересылать."),
    check("MAX: подтверждение, что выдано право публикации нашему подтверждённому боту; токен не пересылать."),
]
story += [P("Что не отправлять в переписке", "Subsection")]
story += [P("Пароли от Facebook, Instagram, Telegram или Яндекса; коды из SMS/аутентификатора; токен Telegram-бота; токен MAX-бота; код привязки Дзена. Для Meta используйте только отдельную защищённую форму, которую мы предоставим.")]
story += [P("Полезные ссылки", "Subsection")]
story += [
    P(f"Meta: {link('Instagram API with Facebook Login', 'https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api?entity=request-23987686-db99ce99-bf76-475c-8b76-718576c11cae')}", "LinkSmall"),
    P(f"MAX: {link('управление каналом и администраторами', 'https://dev.max.ru/docs/channels/manage')} · {link('права ботов и добавление в канал', 'https://dev.max.ru/docs/chatbots/bots-coding/prepare')}", "LinkSmall"),
    P(f"Telegram: {link('синхробот Дзена @zen_sync_bot', 'https://t.me/zen_sync_bot')} · {link('канал Дзена для авторов', 'https://t.me/zenforcreators')}", "LinkSmall"),
    P("Интерфейсы платформ могут менять названия пунктов меню. Если экран не совпадает с этой памяткой или Meta/MAX показывает предупреждение, остановитесь и пришлите нам снимок экрана без кодов, токенов и секретов.", "BodySmall"),
]


def build():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc = GuideDoc(OUTPUT)
    doc.build(story)
    print(f"Created {OUTPUT}")


if __name__ == "__main__":
    build()
