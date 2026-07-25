from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether
)
from reportlab.platypus.flowables import HRFlowable


OUT = r"output\\pdf\\neuromotion-app-principles-th.pdf"
FONT_REGULAR = r"C:\\Windows\\Fonts\\LeelawUI.ttf"
FONT_BOLD = r"C:\\Windows\\Fonts\\leelawdb.ttf"

pdfmetrics.registerFont(TTFont("Thai", FONT_REGULAR))
pdfmetrics.registerFont(TTFont("ThaiBold", FONT_BOLD))

INK = colors.HexColor("#233A4D")
MUTED = colors.HexColor("#5A6B7A")
ORANGE = colors.HexColor("#E8762C")
BLUE = colors.HexColor("#1B6CA8")
WARM = colors.HexColor("#FFF9F2")
GREEN_BG = colors.HexColor("#E9F5EC")
GREEN = colors.HexColor("#256B43")
BORDER = colors.HexColor("#E8EAED")


def p(text, style):
    return Paragraph(text, style)


def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(BORDER)
    canvas.line(18 * mm, 14 * mm, A4[0] - 18 * mm, 14 * mm)
    canvas.setFont("Thai", 8.5)
    canvas.setFillColor(MUTED)
    canvas.drawString(18 * mm, 8.5 * mm, "NeuroMotion AI - หลักการของแอป")
    canvas.drawRightString(A4[0] - 18 * mm, 8.5 * mm, f"หน้า {doc.page}")
    canvas.restoreState()


styles = getSampleStyleSheet()
title = ParagraphStyle(
    "TitleThai", parent=styles["Title"], fontName="ThaiBold", fontSize=28,
    leading=35, textColor=INK, alignment=TA_CENTER, spaceAfter=6,
)
subtitle = ParagraphStyle(
    "SubtitleThai", parent=styles["Normal"], fontName="Thai", fontSize=13,
    leading=20, textColor=MUTED, alignment=TA_CENTER,
)
h1 = ParagraphStyle(
    "H1Thai", parent=styles["Heading1"], fontName="ThaiBold", fontSize=20,
    leading=27, textColor=INK, spaceBefore=12, spaceAfter=7,
)
h2 = ParagraphStyle(
    "H2Thai", parent=styles["Heading2"], fontName="ThaiBold", fontSize=15,
    leading=21, textColor=BLUE, spaceBefore=8, spaceAfter=4,
)
body = ParagraphStyle(
    "BodyThai", parent=styles["BodyText"], fontName="Thai", fontSize=11.5,
    leading=18, textColor=INK, spaceAfter=7,
)
small = ParagraphStyle(
    "SmallThai", parent=body, fontSize=9.3, leading=14, textColor=MUTED,
)
bullet = ParagraphStyle(
    "BulletThai", parent=body, leftIndent=14, firstLineIndent=-9, bulletIndent=2,
    spaceAfter=3,
)
card_title = ParagraphStyle(
    "CardTitle", parent=body, fontName="ThaiBold", textColor=INK, fontSize=12,
    leading=17, spaceAfter=1,
)
card_body = ParagraphStyle(
    "CardBody", parent=body, fontSize=10.2, leading=15, textColor=MUTED, spaceAfter=0,
)


def bullets(items):
    return [p(f"• {item}", bullet) for item in items]


def section(number, name, intro, analysis, screening, note=None, source=None):
    flow = [p(f"{number}. {name}", h1), p("<b>หลักการ</b><br/>" + intro, body)]
    flow.append(p("<b>ระบบวิเคราะห์</b>", h2))
    flow.extend(bullets(analysis))
    flow.append(p("<b>ช่วยคัดกรอง / ติดตาม</b>", h2))
    flow.extend(bullets(screening))
    if note:
        t = Table([[p(note, card_body)]], colWidths=[174 * mm])
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F4F8FB")),
            ("BOX", (0, 0), (-1, -1), 0.6, BORDER),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ]))
        flow.extend([Spacer(1, 2), t])
    if source:
        flow.extend([Spacer(1, 4), p(source, small)])
    flow.append(Spacer(1, 8))
    return flow


story = []
story += [
    Spacer(1, 28 * mm),
    p("NeuroMotion AI", title),
    p("หลักการทำงานของแอปคัดกรองความเสี่ยงด้านการเคลื่อนไหว", subtitle),
    Spacer(1, 13 * mm),
]

overview = [
    [p("<b>แนวคิดหลัก</b>", card_title), p("<b>ข้อมูลที่วัด</b>", card_title)],
    [p("ใช้โทรศัพท์เป็นเครื่องมือวัดการเคลื่อนไหว การสั่น สีหน้า และเสียง เพื่อเปลี่ยนเป็นค่าตัวเลขที่ติดตามได้", card_body),
     p("รูปแบบการวาด การแตะ ความเร่งจากเซ็นเซอร์ การเคลื่อนไหวของจุดบนใบหน้า และสัญญาณเสียง", card_body)],
]
table = Table(overview, colWidths=[87 * mm, 87 * mm])
table.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F4F8FB")),
    ("BACKGROUND", (0, 1), (-1, 1), colors.white),
    ("BOX", (0, 0), (-1, -1), 0.7, BORDER),
    ("INNERGRID", (0, 0), (-1, -1), 0.7, BORDER),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("LEFTPADDING", (0, 0), (-1, -1), 10),
    ("RIGHTPADDING", (0, 0), (-1, -1), 10),
    ("TOPPADDING", (0, 0), (-1, -1), 10),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
]))
story += [table, Spacer(1, 10 * mm)]

disclaimer = Table([[p(
    "<b>ข้อสำคัญ:</b> แอปนี้เป็นเครื่องมือคัดกรองความเสี่ยงเบื้องต้นและติดตามแนวโน้มเท่านั้น ไม่สามารถวินิจฉัยโรคพาร์กินสัน อาการสั่น หรือโรคทางระบบประสาทได้ หากมีอาการรบกวนการใช้ชีวิต ควรปรึกษาแพทย์ โดยเฉพาะแพทย์ระบบประสาทหรือคลินิกความผิดปกติด้านการเคลื่อนไหว", card_body)]], colWidths=[174 * mm])
disclaimer.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, -1), GREEN_BG),
    ("BOX", (0, 0), (-1, -1), 0.8, colors.HexColor("#B9DFC5")),
    ("LEFTPADDING", (0, 0), (-1, -1), 12),
    ("RIGHTPADDING", (0, 0), (-1, -1), 12),
    ("TOPPADDING", (0, 0), (-1, -1), 10),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
]))
story += [disclaimer, Spacer(1, 9 * mm)]

story += [p("แบบทดสอบในแอป", h1)]
test_rows = [
    ["1", "Spiral Drawing", "การควบคุมมัดเล็ก ความลื่นไหล และการสั่นระหว่างวาด"],
    ["2", "Finger Tapping", "จังหวะ ความเร็ว ความสม่ำเสมอ และการช้าลงเมื่อทำซ้ำ"],
    ["3", "Tremor Analysis", "รูปแบบการสั่นขณะพักและขณะคงท่า"],
    ["4", "Facial Analysis", "การยิ้ม ความสมมาตร และการแสดงสีหน้า"],
    ["5", "Voice Analysis", "ความดัง ความคงที่ และคุณภาพของเสียงสระยาว"],
]
test_table = Table(
    [[p("<b>ลำดับ</b>", card_body), p("<b>แบบทดสอบ</b>", card_body), p("<b>สิ่งที่ติดตาม</b>", card_body)]] +
    [[p(a, card_body), p(b, card_body), p(c, card_body)] for a, b, c in test_rows],
    colWidths=[16 * mm, 48 * mm, 110 * mm]
)
test_table.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#FFF1E6")),
    ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ("LEFTPADDING", (0, 0), (-1, -1), 8),
    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ("TOPPADDING", (0, 0), (-1, -1), 7),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
]))
story += [test_table, PageBreak()]

story += section(
    1, "Spiral Drawing Test - การวาดตามเส้นก้นหอย",
    "ให้ผู้ใช้วาดตามเส้นก้นหอยบนหน้าจอ เพื่อประเมินความแม่นยำและความลื่นไหลของการควบคุมมือและนิ้ว",
    [
        "ความเบี่ยงเบนของเส้นที่วาดจากเส้นก้นหอยต้นแบบ",
        "ความสม่ำเสมอของระยะห่างระหว่างรอบวง",
        "ความเร็ว เวลาที่ใช้ และความแปรปรวนของความเร็วขณะวาด",
        "กำลังของการสั่นในย่านความถี่ประมาณ 4-7 Hz",
    ],
    [
        "การเคลื่อนไหวช้าหรือไม่ลื่นไหล ซึ่งอาจสอดคล้องกับ bradykinesia",
        "การสั่นขณะเคลื่อนไหวและความผิดปกติของการควบคุมมือ",
        "แนวโน้มการเปลี่ยนแปลงของผลการทดสอบเมื่อติดตามซ้ำ",
    ],
    "<b>ข้อควรตีความ:</b> การวาดตามต้นแบบไม่ใช่การวัด Micrographia โดยตรง เพราะขนาดของต้นแบบถูกกำหนดไว้แล้ว หากต้องการวัด Micrographia ควรเพิ่มงานเขียนหรือวาดแบบอิสระ"
    ,
    "<b>อ่านเพิ่มเติม:</b> <link href=\"https://movementdisorders.onlinelibrary.wiley.com/doi/10.1002/mdc3.70278\"><font color=\"#1B6CA8\"><u>งานทบทวนการใช้ spiral drawing</u></font></link>"
)

story += section(
    2, "Finger Tapping Test - การแตะนิ้ว",
    "ใช้ประเมินการเคลื่อนไหวซ้ำ ๆ ของนิ้ว ทั้งการแตะให้ตรงจังหวะ และการแตะเร็วต่อเนื่อง โดยควรทดสอบแยกมือซ้ายและขวา",
    [
        "ความคลาดเคลื่อนจากจังหวะเป้าหมาย เวลาตอบสนอง และการข้ามจังหวะ",
        "จำนวนครั้ง อัตราการแตะต่อวินาที และเวลาค้างนิ้วบนหน้าจอ",
        "ความแปรปรวนของช่วงห่างระหว่างการแตะ",
        "ความเร็วที่ลดลงระหว่างทำซ้ำ หรือ sequence effect",
        "ความแตกต่างของผลระหว่างมือซ้ายและขวา",
    ],
    [
        "ความสามารถในการประสานงานของสมอง กล้ามเนื้อ และจังหวะเวลา",
        "Bradykinesia และความไม่สม่ำเสมอของการเคลื่อนไหวซ้ำ ๆ",
        "การเปลี่ยนแปลงของความคล่องตัวปลายนิ้วเมื่อทำซ้ำในแต่ละครั้ง",
    ],
    source="<b>อ่านเพิ่มเติม:</b> <link href=\"https://pmc.ncbi.nlm.nih.gov/articles/PMC4965104/\"><font color=\"#1B6CA8\"><u>งานศึกษาการแตะด้วยสมาร์ตโฟน</u></font></link>",
)

story += section(
    3, "Tremor Analysis - การวิเคราะห์อาการสั่น",
    "ใช้เซ็นเซอร์ความเร่งของโทรศัพท์วัดสัญญาณการสั่น แล้ววิเคราะห์ความถี่ ความแรง และความสม่ำเสมอของสัญญาณ",
    [
        "<b>Rest Tremor:</b> วัดขณะวางมือหรือถือโทรศัพท์บนตักในท่าผ่อนคลาย",
        "<b>Postural Tremor:</b> วัดขณะยกแขนหรือถือโทรศัพท์ค้างนิ่ง",
        "ความถี่เด่น ความแรง และกำลังสัญญาณของการสั่น",
        "ความแตกต่างของรูปแบบสั่นระหว่างท่าพักและท่าคงท่า",
    ],
    [
        "รูปแบบการสั่นขณะพัก ซึ่งอาจพบในกลุ่มอาการ Parkinsonism",
        "รูปแบบการสั่นขณะคงท่า ซึ่งอาจพบใน Essential Tremor หรือ enhanced physiological tremor",
        "การติดตามแนวโน้มความแรงและความถี่ของการสั่น",
    ],
    "<b>ข้อควรตีความ:</b> ความเครียด ความเหนื่อยล้า คาเฟอีน ยาบางชนิด และปัจจัยสุขภาพอื่น ๆ อาจทำให้การสั่นเด่นขึ้นได้ การวัดจากโทรศัพท์เพียงอย่างเดียวจึงไม่สามารถระบุสาเหตุของอาการสั่นได้",
    "<b>อ่านเพิ่มเติม:</b> <link href=\"https://www.ninds.nih.gov/sites/default/files/2025-05/Tremor.pdf\"><font color=\"#1B6CA8\"><u>เอกสาร NINDS เรื่อง Tremor</u></font></link> และ <link href=\"https://pmc.ncbi.nlm.nih.gov/articles/PMC6530552/\"><font color=\"#1B6CA8\"><u>บททบทวนการจำแนกอาการสั่น</u></font></link>"
)

story += [PageBreak()]
story += section(
    4, "Facial Analysis - การวิเคราะห์การแสดงสีหน้า",
    "ให้ผู้ใช้มองกล้องและยิ้มค้างตามเวลาที่กำหนด ระบบประมวลผลภาพบนอุปกรณ์และเก็บเฉพาะค่าการวัด ไม่อัปโหลดวิดีโอใบหน้า",
    [
        "ระยะการยกของมุมปาก",
        "ความสมมาตรของการยิ้มซ้ายและขวา",
        "ปริมาณและความเร็วของการเคลื่อนไหวบนใบหน้า",
        "ความสามารถในการคงหรือเปลี่ยนสีหน้า",
    ],
    [
        "การแสดงสีหน้าลดลง หรือ Hypomimia / Masked Face",
        "ข้อมูลประกอบการสังเกตความแตกต่างของการเคลื่อนไหวใบหน้าสองด้าน",
    ],
    "<b>ขอบเขต:</b> การวิเคราะห์ใบหน้าเป็นข้อมูลประกอบเท่านั้น ไม่ใช่เครื่องมือวินิจฉัยโรคพาร์กินสันหรือโรคหลอดเลือดสมอง",
    "<b>อ่านเพิ่มเติม:</b> <link href=\"https://pmc.ncbi.nlm.nih.gov/articles/PMC10814039/\"><font color=\"#1B6CA8\"><u>บททบทวนเรื่อง hypomimia</u></font></link>"
)

story += section(
    5, "Voice Analysis - การวิเคราะห์เสียง",
    "ให้ผู้ใช้ออกเสียงสระ “อา” ต่อเนื่องประมาณ 5 วินาทีในที่เงียบ ระบบวิเคราะห์สัญญาณเสียงภายในอุปกรณ์และไม่เก็บไฟล์เสียงดิบ",
    [
        "ระยะเวลาที่ออกเสียงต่อเนื่อง",
        "ความดังและความคงที่ของความดัง",
        "Pitch หรือความถี่พื้นฐานของเสียง (F0)",
        "Jitter: ความแปรปรวนของรอบเสียง",
        "Shimmer: ความแปรปรวนของความดังในแต่ละรอบเสียง",
        "เสียงรบกวนและความสม่ำเสมอของเสียง",
    ],
    [
        "Hypophonia: เสียงเบาหรือเสียงแผ่ว",
        "ความไม่คงที่ของเสียงและลักษณะเสียงสั่นที่ควรติดตาม",
        "ข้อมูลประกอบเกี่ยวกับการควบคุมกล้ามเนื้อที่ใช้ในการเปล่งเสียง",
    ],
    source="<b>อ่านเพิ่มเติม:</b> <link href=\"https://pmc.ncbi.nlm.nih.gov/articles/PMC11939921/\"><font color=\"#1B6CA8\"><u>งานทบทวนการวิเคราะห์เสียง</u></font></link>",
)

story += [p("การรวมคะแนนและการดูแลข้อมูล", h1)]
story += [p(
    "แต่ละแบบทดสอบสร้างค่าตัวเลขและคะแนนย่อย 0-100 โดยคะแนนสูงหมายถึงพบรูปแบบที่ควรเฝ้าระวังมากขึ้น ระบบนำเฉพาะแบบทดสอบที่ทำสำเร็จมาคำนวณเป็นคะแนนรวมและแบ่งเป็นระดับความเสี่ยงต่ำ ปานกลาง หรือสูง เพื่อช่วยให้ผู้ใช้ติดตามแนวโน้มตามเวลา", body
)]
privacy_rows = [
    [p("<b>เก็บอะไร</b>", card_title), p("เก็บผลการวัดและคะแนนของการทดสอบเพื่อดูแนวโน้ม", card_body)],
    [p("<b>ไม่เก็บอะไรเป็นค่าเริ่มต้น</b>", card_title), p("ไม่จัดเก็บวิดีโอใบหน้าหรือไฟล์เสียงดิบหลังประมวลผล", card_body)],
    [p("<b>ความยินยอม</b>", card_title), p("ผู้ใช้ต้องยินยอมให้เก็บผลคัดกรอง และเลือกได้แยกต่างหากว่าจะอนุญาตให้ใช้ข้อมูลที่ไม่ระบุตัวตนเพื่อพัฒนาโมเดลหรือไม่", card_body)],
]
privacy = Table(privacy_rows, colWidths=[48 * mm, 126 * mm])
privacy.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#F4F8FB")),
    ("GRID", (0, 0), (-1, -1), 0.6, BORDER),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("LEFTPADDING", (0, 0), (-1, -1), 10),
    ("RIGHTPADDING", (0, 0), (-1, -1), 10),
    ("TOPPADDING", (0, 0), (-1, -1), 8),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
]))
story += [privacy, Spacer(1, 10)]

story += [p("แหล่งอ้างอิงโดยสรุป", h1)]
references = [
    "<link href=\"https://www.parkinson.org/understanding-parkinsons/movement-symptoms\"><font color=\"#1B6CA8\"><u>Parkinson's Foundation. Movement Symptoms</u></font></link>: bradykinesia, tremor, rigidity, hypomimia และ hypophonia.",
    "<link href=\"https://movementdisorders.onlinelibrary.wiley.com/doi/10.1002/mdc3.70278\"><font color=\"#1B6CA8\"><u>Wang et al. (2025). Digitized Archimedes Spiral Drawing Test</u></font></link>.",
    "<link href=\"https://pmc.ncbi.nlm.nih.gov/articles/PMC4965104/\"><font color=\"#1B6CA8\"><u>Lee et al. (2016). Smartphone-Based Finger Tapping Application</u></font></link>.",
    "<link href=\"https://www.ninds.nih.gov/sites/default/files/2025-05/Tremor.pdf\"><font color=\"#1B6CA8\"><u>National Institute of Neurological Disorders and Stroke (NINDS). Tremor fact sheet</u></font></link>.",
    "<link href=\"https://pmc.ncbi.nlm.nih.gov/articles/PMC11939921/\"><font color=\"#1B6CA8\"><u>Vocal Feature Changes for Monitoring Parkinson's Disease Progression: A Systematic Review</u></font></link>.",
]
story += bullets(references)
story += [Spacer(1, 5), p("เอกสารฉบับนี้จัดทำเพื่ออธิบายแนวคิดของแอปสำหรับการสื่อสารและสาธิตผลิตภัณฑ์ ไม่ใช่คำแนะนำทางการแพทย์เฉพาะบุคคล", small)]

doc = SimpleDocTemplate(
    OUT, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm,
    topMargin=17 * mm, bottomMargin=21 * mm, title="NeuroMotion AI - หลักการของแอป"
)
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print(OUT)
