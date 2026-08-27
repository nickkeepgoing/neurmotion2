/**
 * Rebuilds the .docx so it carries the same walkthrough screenshots as the PDF.
 * Filmstrips are tables: one row of images, one row of numbered captions.
 */
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle,
  ImageRun, PageBreak, TableOfContents, LevelFormat, Footer, PageNumber,
  convertInchesToTwip,
} = require('docx');

const DIR = __dirname;
const SH = path.join(DIR, 'shots');
const img = (f) => fs.readFileSync(path.join(SH, f));
const imgRoot = (f) => fs.readFileSync(path.join(DIR, f));

const INK = '233A4D', PRIMARY = 'BC5411', SECOND = '1B6CA8', MUTED = '64727E';
const LINE = 'E8EAED', SOFT = 'F7F9FB';
const LOW = '256B43', MED = '9C7A10', HIGH = 'B23A3A';
const FONT = 'Leelawadee UI';
const CONTENT = 9360; // DXA, 6.5in

const P = (text, o = {}) => new Paragraph({
  spacing: { before: o.before ?? 0, after: o.after ?? 110, line: o.line ?? 290 },
  alignment: o.align,
  children: [new TextRun({ text, font: FONT, size: o.size ?? 20, bold: o.bold, italics: o.italics, color: o.color ?? INK })],
});
const PR = (runs, o = {}) => new Paragraph({
  spacing: { before: o.before ?? 0, after: o.after ?? 110, line: o.line ?? 290 },
  alignment: o.align,
  children: runs.map(([t, ro = {}]) => new TextRun({
    text: t, font: FONT, size: ro.size ?? o.size ?? 20, bold: ro.bold, italics: ro.italics, color: ro.color ?? o.color ?? INK,
  })),
});
const H1 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_1, spacing: { before: 300, after: 60 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 18, color: PRIMARY } },
  children: [new TextRun({ text, font: FONT, size: 30, bold: true, color: INK })],
});
const H2 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_2, spacing: { before: 260, after: 120 },
  children: [new TextRun({ text, font: FONT, size: 24, bold: true, color: PRIMARY })],
});
const H3 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 100 },
  children: [new TextRun({ text, font: FONT, size: 22, bold: true, color: SECOND })],
});
const BUL = (text) => new Paragraph({
  numbering: { reference: 'bul', level: 0 }, spacing: { after: 80, line: 290 },
  children: [new TextRun({ text, font: FONT, size: 20, color: INK })],
});
const NUMP = (text) => new Paragraph({
  numbering: { reference: 'num', level: 0 }, spacing: { after: 80, line: 290 },
  children: [new TextRun({ text, font: FONT, size: 20, color: INK })],
});
const SPACER = (h = 100) => new Paragraph({ spacing: { after: h }, children: [] });

const NOTE = (title, body, color = MED, bg = 'FBF3D9') => new Table({
  width: { size: CONTENT, type: WidthType.DXA }, columnWidths: [CONTENT],
  borders: {
    top: { style: BorderStyle.SINGLE, size: 2, color: bg }, bottom: { style: BorderStyle.SINGLE, size: 2, color: bg },
    left: { style: BorderStyle.SINGLE, size: 18, color }, right: { style: BorderStyle.SINGLE, size: 2, color: bg },
    insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE },
  },
  rows: [new TableRow({ children: [new TableCell({
    width: { size: CONTENT, type: WidthType.DXA },
    shading: { type: ShadingType.CLEAR, fill: bg },
    margins: { top: 130, bottom: 130, left: 190, right: 190 },
    children: [PR([[title, { bold: true, color }]], { after: 50, size: 20 }), P(body, { size: 19, after: 0 })],
  })] })],
});

function TBL(headers, rows, widths) {
  const total = widths.reduce((a, b) => a + b, 0);
  const hdr = new TableRow({ tableHeader: true, children: headers.map((h, i) => new TableCell({
    width: { size: widths[i], type: WidthType.DXA },
    shading: { type: ShadingType.CLEAR, fill: INK },
    margins: { top: 85, bottom: 85, left: 120, right: 120 },
    children: [PR([[h, { bold: true, color: 'FFFFFF', size: 18 }]], { after: 0 })],
  })) });
  const body = rows.map((r, ri) => new TableRow({ children: r.map((c, i) => {
    const o = typeof c === 'object' && c !== null ? c : { t: c };
    return new TableCell({
      width: { size: widths[i], type: WidthType.DXA },
      shading: { type: ShadingType.CLEAR, fill: ri % 2 ? SOFT : 'FFFFFF' },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [PR([[o.t, { size: 18, bold: o.bold, color: o.color || INK }]], { after: 0, line: 250 })],
    });
  }) }));
  return new Table({
    width: { size: total, type: WidthType.DXA }, columnWidths: widths,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: LINE }, bottom: { style: BorderStyle.SINGLE, size: 2, color: LINE },
      left: { style: BorderStyle.SINGLE, size: 2, color: LINE }, right: { style: BorderStyle.SINGLE, size: 2, color: LINE },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: LINE }, insideVertical: { style: BorderStyle.SINGLE, size: 2, color: LINE },
    },
    rows: [hdr, ...body],
  });
}

/**
 * Filmstrip: N phone screenshots side by side, each with a numbered label and
 * caption underneath. Phone shots are 780x1688, so height follows from width.
 */
function STRIP(items) {
  const n = items.length;
  const col = Math.floor(CONTENT / n);
  const wPx = Math.floor((col / 1440) * 96) - 10;
  const hPx = Math.round(wPx * (1688 / 780));
  const noB = {
    top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
    left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
    insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE },
  };
  const imgRow = new TableRow({ children: items.map((it) => new TableCell({
    width: { size: col, type: WidthType.DXA }, borders: noB,
    margins: { top: 40, bottom: 40, left: 40, right: 40 },
    children: [new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { after: 40 },
      children: [new ImageRun({ type: 'png', data: img(it.file), transformation: { width: wPx, height: hPx } })],
    })],
  })) });
  const capRow = new TableRow({ children: items.map((it) => new TableCell({
    width: { size: col, type: WidthType.DXA }, borders: noB,
    margins: { top: 0, bottom: 60, left: 40, right: 40 },
    children: [
      PR([[`${it.n}. `, { bold: true, color: PRIMARY, size: 17 }], [it.label, { bold: true, size: 17 }]], { after: 30, line: 230 }),
      P(it.caption, { size: 15, color: MUTED, after: 0, line: 230 }),
    ],
  })) });
  return new Table({
    width: { size: CONTENT, type: WidthType.DXA },
    columnWidths: items.map(() => col),
    borders: noB,
    rows: [imgRow, capRow],
  });
}

const FIGW = (file, widthPx, caption, fromRoot = false, aspect = null) => [
  new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { before: 110, after: 50 },
    children: [new ImageRun({
      type: 'png', data: fromRoot ? imgRoot(file) : img(file),
      transformation: { width: widthPx, height: Math.round(widthPx * (aspect ?? (fromRoot ? 415 / 640 : 1688 / 780))) },
    })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { after: 190 },
    children: [new TextRun({ text: caption, font: FONT, size: 17, italics: true, color: MUTED })],
  }),
];

// ============================ CONTENT ============================
const c = [];

// cover
c.push(
  SPACER(1500),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 50 },
    children: [new TextRun({ text: 'NeuroMotion AI', font: FONT, size: 64, bold: true, color: PRIMARY })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 180 },
    children: [new TextRun({ text: 'ระบบคัดกรองความเสี่ยงโรคทางระบบประสาทเบื้องต้น', font: FONT, size: 26, color: INK })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 420 },
    children: [new TextRun({ text: 'คู่มือการใช้งานพร้อมภาพประกอบ · เวอร์ชัน 2', font: FONT, size: 23, bold: true, color: SECOND })] }),
  STRIP([
    { file: '01-login.png', n: 1, label: 'เข้าสู่ระบบ', caption: '' },
    { file: '05-home.png', n: 2, label: 'หน้าหลัก', caption: '' },
    { file: '25-spiral-5-tracing-live.png', n: 3, label: 'ทำแบบทดสอบ', caption: '' },
    { file: '08-result.png', n: 4, label: 'ดูผล', caption: '' },
  ]),
  SPACER(260),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 },
    children: [new TextRun({ text: 'Progressive Web App · React 18 + TypeScript · ประมวลผลบนเครื่องผู้ใช้ทั้งหมด', font: FONT, size: 18, color: MUTED })] }),
  new Paragraph({ alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'สอดคล้องกับ พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA)', font: FONT, size: 18, color: MUTED })] }),
  new Paragraph({ children: [new PageBreak()] }),
);

// toc
c.push(H1('สารบัญ'), SPACER(80), new TableOfContents('สารบัญ', { hyperlink: true, headingStyleRange: '1-3' }),
  SPACER(260),
  NOTE('เกี่ยวกับภาพประกอบในเอกสารนี้',
    'ภาพหน้าจอทั้งหมดเป็นภาพจากแอปพลิเคชันจริงที่ทำงานอยู่ ไม่ใช่ภาพจำลอง ถ่ายที่ขนาดหน้าจอโทรศัพท์จริง (390 พิกเซล) ยกเว้นส่วนที่แสดงภาพจากกล้อง ซึ่งถูกปิดทับด้วยกรอบสีเทาเพื่อความเป็นส่วนตัว',
    SECOND, 'E3EEF6'),
  new Paragraph({ children: [new PageBreak()] }));

// 1 overview
c.push(H1('1. ภาพรวมของระบบ'),
  P('NeuroMotion AI คือเว็บแอปพลิเคชัน (PWA) สำหรับคัดกรองความเสี่ยงเบื้องต้นของโรคทางระบบประสาท โดยเน้นกลุ่มอาการที่เกี่ยวกับการสั่นและการเคลื่อนไหว ผู้ใช้ทำแบบทดสอบสั้น ๆ 5 รายการผ่านโทรศัพท์มือถือ ระบบคำนวณค่าชี้วัดจากการเคลื่อนไหวจริง แล้วสรุปเป็นระดับความเสี่ยงพร้อมกราฟแนวโน้มย้อนหลัง'),
  NOTE('ข้อความสำคัญที่ต้องระบุเสมอ',
    'ผลลัพธ์ทั้งหมดเป็น "การคัดกรองเบื้องต้น" ไม่ใช่ "การวินิจฉัยโรค" ระบบนี้ไม่ทดแทนการตรวจโดยแพทย์ และค่าเกณฑ์ทั้งหมดยังไม่ผ่านการตรวจสอบความแม่นยำทางคลินิก',
    HIGH, 'FBEAEA'),
  H2('1.1 ภาพรวมการใช้งานทั้งหมด'),
  STRIP([
    { file: '01-login.png', n: 1, label: 'เข้าสู่ระบบ', caption: 'เลือกประเภทผู้ใช้ + วันเกิด' },
    { file: '04a-consent-top.png', n: 2, label: 'ให้ความยินยอม', caption: 'PDPA — ติ๊ก 2 ช่องแยกกัน' },
    { file: '05-home.png', n: 3, label: 'หน้าหลัก', caption: 'ภารกิจวันนี้ + รายการทดสอบ' },
    { file: '25-spiral-5-tracing-live.png', n: 4, label: 'ทำแบบทดสอบ', caption: 'ทำครบ 5 รายการ' },
    { file: '08-result.png', n: 5, label: 'ดูผล', caption: 'คะแนน ระดับเสี่ยง แนวโน้ม' },
  ]),
  SPACER(160),
  H2('1.2 เทคโนโลยีที่ใช้'),
  TBL(['ส่วนประกอบ', 'เทคโนโลยี', 'หน้าที่'], [
    ['ส่วนติดต่อผู้ใช้', 'React 18 + TypeScript + Vite', 'โครงสร้างแอปและการแสดงผล'],
    ['การออกแบบ', 'Tailwind CSS v4 (design tokens)', 'สี ตัวอักษร ระยะห่าง เป็นระบบเดียวกัน'],
    ['กราฟ', 'Recharts', 'กราฟแนวโน้มคะแนนความเสี่ยง'],
    ['วาดก้นหอย / เคาะนิ้ว', 'HTML5 Canvas + Pointer Events', 'รับการสัมผัสและวาดเส้นแบบเรียลไทม์'],
    ['ตรวจใบหน้า', '@mediapipe/tasks-vision', 'ตรวจจับจุดสังเกตบนใบหน้าในเครื่อง'],
    ['ตรวจเสียง', 'Web Audio API', 'บันทึกและวิเคราะห์คลื่นเสียง'],
    ['ตรวจการสั่น', 'DeviceMotion API', 'อ่านค่าความเร่งจากเซ็นเซอร์'],
    ['วิเคราะห์ความถี่', 'FFT (เขียนเอง, radix-2)', 'หาพลังงานย่านความถี่ 4–7 Hz'],
    ['จัดเก็บข้อมูล', 'localStorage / IndexedDB', 'เก็บผลไว้ในเครื่องผู้ใช้เท่านั้น'],
  ], [2100, 3300, 3960]),
  SPACER(140),
  NOTE('จุดสำคัญด้านสถาปัตยกรรม',
    'ทุกการประมวลผล รวมถึงภาพจากกล้องและเสียงจากไมโครโฟน เกิดขึ้นบนเครื่องของผู้ใช้ทั้งหมด ระบบไม่ส่งภาพหรือเสียงดิบออกไปยังเซิร์ฟเวอร์ใด ๆ',
    SECOND, 'E3EEF6'),
  new Paragraph({ children: [new PageBreak()] }));

// 2 onboarding
c.push(H1('2. เริ่มต้นใช้งาน'),
  P('ตั้งแต่เปิดแอปครั้งแรกจนถึงหน้าหลัก — ทำครั้งเดียว', { color: MUTED }),
  STRIP([
    { file: '00-splash.png', n: 1, label: 'หน้าเปิดแอป', caption: 'เปิดจากลิงก์ ไม่ต้องติดตั้งจาก App Store' },
    { file: '01-login.png', n: 2, label: 'เข้าสู่ระบบ', caption: 'เลือกประเภทผู้ใช้ แล้วเลื่อนเลือกวันเกิด' },
    { file: '02-login-textsize.png', n: 3, label: 'ปรับขนาดตัวอักษร', caption: 'เลือกได้ 3 ระดับ ขยายทั้งแอป' },
    { file: '04a-consent-top.png', n: 4, label: 'ความยินยอม PDPA', caption: 'ช่องติ๊ก 2 ช่อง ไม่ติ๊กล่วงหน้า' },
  ]),
  SPACER(160),
  H2('2.1 ข้อมูลที่ระบบขอ'),
  TBL(['ข้อมูล', 'บังคับ?', 'ใช้ทำอะไร'], [
    ['ประเภทผู้ใช้', 'บังคับ', 'ปรับข้อความและเส้นทางการใช้งาน'],
    ['วันเกิด (คำนวณอายุ)', 'บังคับ', 'ปรับเกณฑ์การให้คะแนนตามช่วงวัย'],
    ['ชื่อ', 'ไม่บังคับ', 'ใช้ทักทายบนหน้าหลักเท่านั้น'],
    ['เลขบัตรประชาชน', 'ไม่บังคับ', 'เฉพาะผู้ป่วย สำหรับอนาคต'],
    ['รูปโปรไฟล์', 'ไม่บังคับ', 'แสดงบนหน้าหลัก เก็บในเครื่องเท่านั้น'],
  ], [2600, 1700, 5060]),
  SPACER(160),
  NOTE('ทำไมไม่บังคับสมัครบัญชี',
    'การบังคับสมัครบัญชีเป็นอุปสรรคสำคัญสำหรับผู้สูงอายุ และขัดกับหลัก "เก็บข้อมูลเท่าที่จำเป็น" ตาม PDPA ผู้ใช้จึงเริ่มใช้งานได้ทันทีโดยไม่ต้องสมัคร',
    SECOND, 'E3EEF6'),
  new Paragraph({ children: [new PageBreak()] }));

// 3 main screens
c.push(H1('3. หน้าจอหลักทั้งหมด'),
  P('แอปแบ่งเป็น 3 แท็บที่แถบด้านล่าง สลับได้ตลอดเวลา', { color: MUTED }),
  STRIP([
    { file: '05-home.png', n: 1, label: 'แท็บ "หน้าหลัก"', caption: 'ภารกิจวันนี้ · ผลล่าสุด · รายการทดสอบ' },
    { file: '08-result.png', n: 2, label: 'แท็บ "ผลของฉัน"', caption: 'คะแนนรวม · ระดับเสี่ยง · กราฟ' },
    { file: '11a-settings-top.png', n: 3, label: 'แท็บ "ตั้งค่า"', caption: 'บัญชี · การอ่าน · การลบข้อมูล' },
    { file: '07-calendar.png', n: 4, label: 'ปฏิทินการทดสอบ', caption: 'วันที่ทำแล้วขึ้นสีเขียว' },
  ]),
  SPACER(160),
  H2('3.1 หน้าหลักแสดงอะไรบ้าง'),
  BUL('คำทักทายและวันที่ — แสดงชื่อเฉพาะเมื่อผู้ใช้กรอกไว้'),
  BUL('ภารกิจวันนี้ — ความคืบหน้า x/5 พร้อมปุ่มพาไปยังแบบทดสอบถัดไปที่ยังไม่ได้ทำ'),
  BUL('ผลล่าสุด — คะแนน ระดับความเสี่ยง และการเปลี่ยนแปลงเทียบกับวันก่อนหน้า'),
  BUL('รายการแบบทดสอบ — ทั้ง 5 รายการพร้อมสถานะ แตะเพื่อทำซ้ำได้'),
  BUL('สัปดาห์นี้ — แถบ 7 วันย้อนหลัง และปุ่มเปิดปฏิทินเต็มเดือน'),
  H2('3.2 หน้าผลลัพธ์และการปรึกษาแพทย์'),
  STRIP([
    { file: '08b-result-conditions.png', n: 1, label: 'ผลแบบเต็ม', caption: 'คะแนน กราฟ ผลรายรายการ และการแยกกลุ่มอาการ' },
    { file: '10-result-consult.png', n: 2, label: 'ปรึกษาแพทย์', caption: 'สายด่วน สปสช. 1330 และค้นหาโรงพยาบาล' },
  ]),
  new Paragraph({ children: [new PageBreak()] }));

// ---- the five tests ----
const tests = [
  {
    idx: 1, title: '4. แบบทดสอบที่ 1 — วาดก้นหอย',
    sub: 'Spiral Tracing · ประมาณ 60 วินาที · น้ำหนัก 30% ของคะแนนรวม',
    strip1: [
      { file: '20-spiral-1-watch.png', n: 1, label: 'ดูวิธีทำ', caption: 'ภาพสาธิตการลากจากกลางออกนอก' },
      { file: '22-spiral-2-practice-drawn.png', n: 2, label: 'ทดลองใช้', caption: 'ลองลากก่อน ยังไม่เก็บคะแนน' },
      { file: '23-spiral-3-countdown.png', n: 3, label: 'นับถอยหลัง', caption: '3–2–1 พร้อมภาพตัวอย่าง' },
      { file: '24-spiral-4-tracing-empty.png', n: 4, label: 'เริ่มทดสอบ', caption: 'แสดงเส้นแม่แบบให้ลากตาม' },
    ],
    strip2: [
      { file: '25-spiral-5-tracing-live.png', n: 5, label: 'กำลังลาก', caption: 'เส้นสีส้มคือเส้นที่ผู้ใช้ลาก พร้อมแถบความคืบหน้า' },
      { file: '26-spiral-6-done.png', n: 6, label: 'เสร็จสิ้น', caption: 'บันทึกผลแล้ว พาไปแบบทดสอบถัดไปอัตโนมัติ' },
    ],
    how: 'ระบบสร้างเส้นก้นหอยตามสมการ Archimedean (r = b·θ) แล้วเทียบตำแหน่งนิ้วของผู้ใช้กับเส้นแม่แบบตลอดเส้นทาง โดยแปลงพิกัดเป็นระบบเชิงขั้วรอบจุดศูนย์กลาง',
    metrics: [['ความคลาดเคลื่อนจากเส้น (RMS)', '35%'], ['พลังงานการสั่นย่าน 4–7 Hz', '30%'], ['ความลื่นไหลของความเร็ว', '20%'], ['ความสม่ำเสมอของระยะห่างระหว่างวง', '15%']],
    note: ['ทำไมย่าน 4–7 Hz', 'เป็นย่านความถี่ของการสั่นแบบพาร์กินสันตามงานวิจัยที่อ้างอิง ระบบทำ FFT พร้อมหน้าต่าง Hann และการกำจัดแนวโน้มเชิงเส้น เพื่อไม่ให้การลากช้า ๆ ถูกนับเป็นการสั่น', SECOND, 'E3EEF6'],
  },
  {
    idx: 2, title: '5. แบบทดสอบที่ 2 — เคาะนิ้ว',
    sub: 'Finger Tapping · ประมาณ 60 วินาที · น้ำหนัก 25% ของคะแนนรวม',
    strip1: [
      { file: '30-tapping-1-watch.png', n: 1, label: 'ดูวิธีทำ', caption: 'ภาพสาธิตการแตะตามจังหวะ' },
      { file: '31-tapping-2-practice.png', n: 2, label: 'ทดลองใช้', caption: 'ลองแตะตามเสียง ยังไม่เก็บคะแนน' },
      { file: '33-tapping-3-countdown.png', n: 3, label: 'นับถอยหลัง', caption: '3–2–1 ก่อนเริ่มจริง' },
      { file: '34-tapping-4-running.png', n: 4, label: 'ช่วงที่ 1/3', caption: 'แตะตามจังหวะ จุดสีส้มกะพริบพร้อมเสียง' },
    ],
    strip2: [
      { file: '35-tapping-5-midway.png', n: 5, label: 'กำลังนับ', caption: 'แสดงจำนวนครั้งและเวลาที่เหลือแบบเรียลไทม์' },
      { file: '36-tapping-6-after.png', n: 6, label: 'ช่วงถัดไป', caption: 'เปลี่ยนเป็นแตะเร็วสุด มือถนัด แล้วมืออีกข้าง' },
    ],
    how: 'อ้างอิงจากแบบประเมิน MDS-UPDRS ข้อ 3.4 ซึ่งเป็นมาตรฐานที่แพทย์ใช้ประเมินโรคพาร์กินสัน แบ่งเป็น 3 ช่วง: แตะตามจังหวะ, แตะเร็วสุดมือถนัด, แตะเร็วสุดมืออีกข้าง',
    metrics: [['อัตราการเคาะ (ครั้ง/วินาที)', '25%'], ['ความแปรปรวนของจังหวะ', '20%'], ['การเคาะช้าลงเรื่อย ๆ (decrement)', '20%'], ['ความไม่สมมาตรระหว่างสองมือ', '20%'], ['ความคลาดเคลื่อนจากจังหวะ', '15%']],
    note: ['ทำไมต้องแตะให้เร็วที่สุดทั้งสองมือ', 'โรคพาร์กินสันในระยะแรกมักเริ่มที่ร่างกายข้างเดียวก่อน การเปรียบเทียบมือสองข้างจึงเป็นสัญญาณสำคัญ หากวัดมือเดียวจะมองไม่เห็นความไม่สมมาตรนี้เลย', SECOND, 'E3EEF6'],
  },
  {
    idx: 3, title: '6. แบบทดสอบที่ 3 — ความนิ่งของมือ',
    sub: 'Rest & Postural Tremor · ประมาณ 30 วินาที · น้ำหนัก 20% ของคะแนนรวม',
    strip1: [
      { file: '40-tremor-1-watch.png', n: 1, label: 'ดูวิธีทำ', caption: 'อธิบายทั้ง 2 ท่า' },
      { file: '41-tremor-2-practice.png', n: 2, label: 'ทดลองใช้', caption: 'ลองถือให้นิ่ง ดูลูกกลมตอบสนอง' },
      { file: '42-tremor-3-countdown.png', n: 3, label: 'นับถอยหลัง', caption: '3–2–1 ก่อนท่าที่ 1' },
      { file: '43-tremor-4-postural.png', n: 4, label: 'ท่าที่ 1', caption: 'ยกโทรศัพท์ขึ้นในอากาศ แขนไม่พิง' },
    ],
    strip2: [
      { file: '44-tremor-5-switch.png', n: 5, label: 'เปลี่ยนท่า', caption: 'พักและอธิบายท่าถัดไป' },
      { file: '45-tremor-6-rest.png', n: 6, label: 'ท่าที่ 2', caption: 'วางแขนบนโต๊ะหรือตัก ให้ผ่อนคลาย' },
      { file: '46-tremor-7-done.png', n: 7, label: 'เสร็จสิ้น', caption: 'บันทึกผลทั้ง 2 ท่า' },
    ],
    how: 'อ่านค่าความเร่งจากเซ็นเซอร์แล้วทำ FFT หาพลังงานย่าน 4–7 Hz การแยกสองท่าคือหัวใจของการแยกโรค: สั่นขณะพักบ่งชี้กลุ่มอาการพาร์กินสัน ส่วนสั่นขณะยกค้างบ่งชี้ Essential Tremor',
    metrics: [['พลังงานการสั่น 4–7 Hz ขณะพัก', '40%'], ['พลังงานการสั่น 4–7 Hz ขณะยกค้าง', '25%'], ['ความแรงการสั่นขณะพัก', '20%'], ['ความแรงการสั่นขณะยกค้าง', '15%']],
    note: ['อุปกรณ์ที่ไม่มีเซ็นเซอร์', 'หากอุปกรณ์หรือเบราว์เซอร์ไม่รองรับเซ็นเซอร์ตรวจการเคลื่อนไหว ระบบจะแจ้งและให้ข้ามแบบทดสอบนี้ได้ โดยคะแนนรวมคำนวณจากแบบทดสอบที่ทำจริงเท่านั้น · บน iOS ต้องกดอนุญาตก่อน', MED, 'FBF3D9'],
  },
  {
    idx: 4, title: '7. แบบทดสอบที่ 4 — หันศีรษะ',
    sub: 'Head Turn · ประมาณ 30 วินาที · น้ำหนัก 15% ของคะแนนรวม',
    strip1: [
      { file: '50-facial-1-watch.png', n: 1, label: 'ดูวิธีทำ', caption: 'สาธิตการหันซ้าย–ขวา' },
      { file: '51-facial-2-practice.png', n: 2, label: 'ทดลองใช้', caption: 'ลองหันก่อน ตรวจว่ากล้องเห็นใบหน้า' },
      { file: '52-facial-3-loading.png', n: 3, label: 'เตรียมระบบ', caption: 'โหลดระบบวิเคราะห์ใบหน้า' },
      { file: '53-facial-4-scanning.png', n: 4, label: 'กำลังทดสอบ', caption: 'หันซ้ายสุด → ขวาสุด → กลับมาตรง' },
    ],
    strip2: null,
    how: 'ใช้ MediaPipe Face Landmarker ตรวจจับจุดสังเกตบนใบหน้าเพื่อคำนวณมุมการหัน (yaw) แบบเรียลไทม์ ป้ายทั้งสองด้านจะติ๊กเมื่อหันถึงมุมที่กำหนดและค้างไว้ครบเวลา ระบบจะยังไม่จบจนกว่าจะหันครบทั้งสามจังหวะ',
    metrics: [['ช่วงการหันศีรษะรวม (องศา)', '45%'], ['ความสมมาตรซ้าย–ขวา', '35%'], ['ความลื่นไหลของการหัน', '20%']],
    note: ['ความเป็นส่วนตัวของภาพใบหน้า', 'ภาพจากกล้องถูกวิเคราะห์บนเครื่องของผู้ใช้ทั้งหมด ไม่มีการอัปโหลดภาพหรือวิดีโอออกจากเครื่อง และไม่มีการบันทึกภาพไว้ · กรอบสีเทาในภาพประกอบคือตำแหน่งภาพจากกล้อง ถูกปิดทับในเอกสารนี้เพื่อความเป็นส่วนตัว', HIGH, 'FBEAEA'],
  },
  {
    idx: 5, title: '8. แบบทดสอบที่ 5 — เสียงพูด',
    sub: 'Sustained Vowel · ประมาณ 15 วินาที · น้ำหนัก 10% ของคะแนนรวม',
    strip1: [
      { file: '60-voice-1-watch.png', n: 1, label: 'ดูวิธีทำ', caption: 'สาธิตการออกเสียง "อาาา"' },
      { file: '61-voice-2-practice.png', n: 2, label: 'ทดลองใช้', caption: 'ลองออกเสียง ดูแถบความดังตอบสนอง' },
      { file: '62-voice-3-countdown.png', n: 3, label: 'นับถอยหลัง', caption: '3–2–1 ก่อนเริ่มบันทึก' },
      { file: '63-voice-4-recording.png', n: 4, label: 'กำลังบันทึก', caption: 'แถบความดัง + คลื่นความถี่ + เวลาถอยหลัง' },
    ],
    strip2: null,
    how: 'แถบวัดความดังมีขีดเป้าหมายสีเขียวบอกว่าต้องออกเสียงดังถึงระดับใด พร้อมสถานะ 3 แบบ คือ เบาไป / ดังพอดี / ดังเกินไป สิ่งนี้จำเป็นเพราะถ้าเสียงเบาเกินไป ระบบจะตรวจไม่พบเสียงจริงและต้องทำใหม่ทั้งหมด',
    metrics: [['Jitter — ความสั่นของระดับเสียง', '40%'], ['Shimmer — ความสั่นของความดัง', '35%'], ['ความคงที่ของเสียง (F0 CV)', '25%']],
    note: ['ข้อจำกัดที่ต้องระบุ', 'แถบวัดความดังใช้เพื่อช่วยให้ผู้ใช้ออกเสียงดังพอเท่านั้น ไม่ได้นำมาคิดคะแนน เพราะเบราว์เซอร์ไม่สามารถวัดระดับความดังจริง (SPL) ได้ และไมโครโฟนแต่ละเครื่องมีอัตราขยายต่างกัน', MED, 'FBF3D9'],
  },
];

for (const t of tests) {
  c.push(H1(t.title), P(t.sub, { color: MUTED, after: 160 }), H3('ขั้นตอนทั้งหมดที่ผู้ใช้เห็น'), STRIP(t.strip1));
  if (t.strip2) c.push(SPACER(90), STRIP(t.strip2));
  c.push(SPACER(160), H3('หลักการทำงาน'), P(t.how),
    H3('ค่าที่วัดและน้ำหนัก'),
    TBL(['ค่าที่วัด', 'น้ำหนัก'], t.metrics.map(([a, b]) => [a, { t: b, bold: true }]), [7200, 2160]),
    SPACER(140), NOTE(t.note[0], t.note[1], t.note[2], t.note[3]),
    new Paragraph({ children: [new PageBreak()] }));
}

// 9 scoring
c.push(H1('9. หลักการคำนวณคะแนนความเสี่ยง'),
  H2('9.1 ขั้นตอนการคำนวณ'),
  NUMP('แปลงค่าดิบแต่ละตัวเป็นคะแนน 0–100 โดยเทียบกับช่วงอ้างอิง "ปกติ" ถึง "ผิดปกติ"'),
  NUMP('รวมคะแนนของแต่ละแบบทดสอบด้วยค่าเฉลี่ยถ่วงน้ำหนักตามน้ำหนักของค่าที่วัด'),
  NUMP('รวมคะแนนทั้ง 5 แบบทดสอบด้วยน้ำหนัก 30 / 25 / 20 / 15 / 10 เปอร์เซ็นต์ (นับเฉพาะรายการที่ทำจริง)'),
  NUMP('ตรวจเงื่อนไขพิเศษ (red flag) แล้วสรุปเป็นระดับความเสี่ยง'),
  SPACER(120),
  TBL(['ระดับ', 'ช่วงคะแนน', 'ความหมาย'], [
    [{ t: 'ความเสี่ยงต่ำ', bold: true, color: LOW }, '0 – 33', 'ผลอยู่ในเกณฑ์ปกติสำหรับช่วงอายุ'],
    [{ t: 'ความเสี่ยงปานกลาง', bold: true, color: MED }, '34 – 66', 'มีบางรายการที่ควรเฝ้าดูและทำซ้ำสม่ำเสมอ'],
    [{ t: 'พบสัญญาณที่ควรใส่ใจ', bold: true, color: HIGH }, '67 – 100', 'ควรปรึกษาแพทย์เพื่อตรวจอย่างละเอียด'],
  ], [2800, 1700, 4860]),
  H2('9.2 การปรับตามอายุ'),
  P('ความสามารถในการเคลื่อนไหวลดลงตามวัยตามธรรมชาติ หากใช้เกณฑ์เดียวกับคนหนุ่มสาว ระบบจะแจ้งเตือนผู้สูงอายุมากเกินจริง ระบบจึงขยับเกณฑ์ "ปกติ" ให้ผ่อนปรนขึ้นตามอายุ โดยอ้างอิงที่อายุ 60 ปี และผ่อนปรนสูงสุดถึงประมาณ 90 ปี'),
  NOTE('ตัวอย่างที่ทดสอบแล้ว', 'ผลการเคาะนิ้วที่เท่ากันทุกประการ จะได้คะแนนความเสี่ยงประมาณ 30 เมื่ออายุ 55 ปี · 23 เมื่ออายุ 70 ปี · 10 เมื่ออายุ 85 ปี', SECOND, 'E3EEF6'),
  H2('9.3 เงื่อนไขพิเศษ: Red Flag'),
  P('คะแนนรวมเป็นค่าเฉลี่ยถ่วงน้ำหนัก ซึ่งมีจุดอ่อนคือ "หักลบกันเอง" ได้ หากผู้ใช้มีอาการสั่นขณะพักอย่างชัดเจนเพียงรายการเดียวแต่อีก 4 รายการปกติ ค่าเฉลี่ยจะกลบสัญญาณนั้นจนรายงานว่าความเสี่ยงต่ำ ระบบจึงกำหนดว่า หากแบบทดสอบใดได้คะแนนตั้งแต่ 80 ขึ้นไป จะไม่รายงานผลรวมว่า "ความเสี่ยงต่ำ" เด็ดขาด'),
  NOTE('ตัวอย่างที่ทดสอบแล้ว', 'ผู้ใช้ที่มีอาการสั่นเดี่ยว ๆ คะแนน 92 แต่คะแนนรวมเพียง 25 ระบบรายงานเป็น "ความเสี่ยงปานกลาง" แทนที่จะเป็น "ความเสี่ยงต่ำ"', SECOND, 'E3EEF6'),
  H2('9.4 การป้องกันผลลวง'),
  P('หากข้อมูลที่เก็บได้ไม่เพียงพอ ระบบจะไม่บันทึกผลและให้ทำใหม่ แทนที่จะให้คะแนนที่ดูดีแต่ไม่มีความหมาย'),
  TBL(['แบบทดสอบ', 'เงื่อนไขขั้นต่ำ'], [
    ['วาดก้นหอย', 'ต้องลากครอบคลุมเส้นอย่างน้อย 70%'],
    ['เคาะนิ้ว', 'ต้องเคาะอย่างน้อย 6 ครั้ง'],
    ['ความนิ่งของมือ', 'ต้องมีข้อมูลเซ็นเซอร์อย่างน้อย 20 ตัวอย่างในแต่ละท่า'],
    ['หันศีรษะ', 'ต้องตรวจพบใบหน้าอย่างน้อย 30 เฟรม'],
    ['เสียงพูด', 'ต้องมีเสียงจริงอย่างน้อย 25% ของช่วงบันทึก'],
  ], [2800, 6560]),
  H2('9.5 การแยกรูปแบบกลุ่มอาการ'),
  TBL(['กลุ่มอาการ', 'ลักษณะเด่นที่ใช้แยก'], [
    [{ t: 'Parkinsonian Syndrome', bold: true }, 'สั่นขณะพัก + เคลื่อนไหวช้าลง + ไม่สมมาตรซ้ายขวา + ช่วงการเคลื่อนไหวลดลง'],
    [{ t: 'Essential Tremor', bold: true }, 'สั่นขณะยกค้าง เป็นทั้งสองข้างใกล้เคียงกัน ไม่มีการเคลื่อนไหวช้าลง มักมีเสียงสั่นร่วมด้วย'],
    [{ t: 'Enhanced Physiological Tremor', bold: true }, 'สั่นละเอียดขณะยกค้าง ความแรงต่ำ ค่าอื่นปกติทั้งหมด'],
  ], [3100, 6260]),
  SPACER(140),
  NOTE('ค่าน้ำหนักเป็นการประมาณเชิงวิศวกรรม',
    'ค่าน้ำหนักและเกณฑ์ทั้งหมดมาจากลักษณะทางคลินิกตามตำรา ยังไม่ได้ผ่านการสอบเทียบกับข้อมูลผู้ป่วยจริง จึงใช้เพื่อบอกแนวโน้มเชิงเปรียบเทียบเท่านั้น ค่าทั้งหมดเก็บรวมไว้ในไฟล์เดียว (thresholds.ts) เพื่อให้ปรับแก้ได้ง่าย',
    HIGH, 'FBEAEA'),
  new Paragraph({ children: [new PageBreak()] }));

// 10 pdpa
c.push(H1('10. ความเป็นส่วนตัวและ PDPA'),
  P('ข้อมูลสุขภาพและชีวมิติจัดเป็นข้อมูลส่วนบุคคลอ่อนไหวตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล'),
  STRIP([
    { file: '04a-consent-top.png', n: 1, label: 'หน้าความยินยอม', caption: 'ช่องติ๊ก 2 ช่องแยกกัน ไม่ติ๊กไว้ล่วงหน้า' },
    { file: '11a-settings-top.png', n: 2, label: 'การถอนความยินยอม', caption: 'ปุ่มลบข้อมูลทั้งหมดอยู่ในแท็บตั้งค่า' },
  ]),
  SPACER(160),
  TBL(['หลักการ', 'การนำไปปฏิบัติจริง'], [
    ['เก็บเท่าที่จำเป็น', 'เก็บเฉพาะตัวเลขผลคำนวณ ไม่เก็บวิดีโอ ภาพนิ่ง หรือไฟล์เสียงดิบ'],
    ['ประมวลผลในเครื่อง', 'ภาพใบหน้าและเสียงถูกวิเคราะห์บนอุปกรณ์แล้วลบทิ้งทันที ไม่มีการอัปโหลด'],
    ['ถอนความยินยอมได้', 'ปุ่มลบข้อมูลทั้งหมดอยู่ในแท็บตั้งค่า ใช้ได้ทุกเมื่อ'],
    ['แยกออกจากระบบกับการลบ', '"ออกจากระบบ" ล้างข้อมูลระบุตัวตนแต่คงผลการทดสอบไว้ ส่วนการลบเป็นคนละปุ่ม'],
    ['ความยินยอมผูกกับบุคคล', 'เมื่อออกจากระบบ ระบบล้างความยินยอมด้วย ผู้ใช้คนถัดไปต้องให้ความยินยอมใหม่'],
    ['รูปโปรไฟล์', 'เก็บในเครื่องเท่านั้น ไม่ถูกวิเคราะห์ ไม่ผูกกับผลการทดสอบ ลบแยกได้'],
  ], [2600, 6760]),
  SPACER(140),
  NOTE('ทำไมไม่ต้องมีเซิร์ฟเวอร์',
    'เพราะทุกอย่างประมวลผลและจัดเก็บในเครื่องผู้ใช้ ระบบจึงไม่มีฐานข้อมูลกลางที่จะถูกเจาะ ไม่มีการส่งข้อมูลสุขภาพผ่านเครือข่าย และผู้ใช้ควบคุมข้อมูลของตนเองได้ทั้งหมด — Privacy by Design',
    SECOND, 'E3EEF6'),
  new Paragraph({ children: [new PageBreak()] }));

// 11 accessibility
c.push(H1('11. การออกแบบเพื่อผู้สูงอายุ'),
  P('ทุกการตัดสินใจยึดกลุ่มผู้ใช้อายุ 60 ปีขึ้นไปเป็นหลัก', { color: MUTED }),
  STRIP([
    { file: '02-login-textsize.png', n: 1, label: 'ปรับขนาดตัวอักษร', caption: 'เลือกได้ 3 ระดับ ขยายทั้งแอปพร้อมกัน' },
    { file: '34-tapping-4-running.png', n: 2, label: 'ปุ่มขนาดใหญ่', caption: 'ทุกปุ่มอย่างน้อย 56 พิกเซล' },
    { file: '08-result.png', n: 3, label: 'สีคู่กับข้อความ', caption: 'ผู้ที่ตาบอดสีเข้าใจได้เท่ากัน' },
    { file: '20-spiral-1-watch.png', n: 4, label: 'สอนก่อนทำจริง', caption: 'ทุกแบบทดสอบมี 3 ขั้น ดู–ลอง–ทำจริง' },
  ]),
  SPACER(160),
  TBL(['หลักเกณฑ์', 'ค่าที่ใช้จริง', 'เหตุผล'], [
    ['ขนาดตัวอักษรต่ำสุด', '18 พิกเซล', 'สายตาผู้สูงอายุอ่านตัวอักษรเล็กได้ยาก'],
    ['ขนาดปุ่มต่ำสุด', '56 พิกเซล', 'รองรับการกดที่ไม่แม่นยำและมือที่สั่น'],
    ['ปรับขนาดตัวอักษร', '3 ระดับ (16/18/20 px)', 'ผู้ใช้ปรับเองได้โดยไม่ต้องพึ่งการตั้งค่าเครื่อง'],
    ['สีบอกสถานะ', 'มีข้อความกำกับเสมอ', 'ผู้ที่มีภาวะตาบอดสีต้องเข้าใจได้เท่ากัน'],
    ['ค่าความต่างของสี', 'ผ่านมาตรฐาน WCAG AA', 'อ่านได้ชัดในทุกสภาพแสง'],
    ['เสียงแนะนำภาษาไทย', 'เปิดเป็นค่าเริ่มต้น', 'ช่วยผู้ที่อ่านหนังสือไม่สะดวก'],
    ['ปุ่มย้อนกลับ', 'ติดอยู่ด้านบนทุกหน้า', 'เมื่อติดตั้งเป็นแอปจะไม่มีปุ่มย้อนกลับของเบราว์เซอร์'],
    ['หนึ่งหน้าจอ หนึ่งงาน', 'ปุ่มหลักหนึ่งปุ่มต่อหน้า', 'ลดความสับสนในการตัดสินใจ'],
  ], [2500, 2500, 4360]),
  SPACER(140),
  NOTE('ไอคอนต้องมีคำกำกับเสมอ',
    'ระบบไม่ใช้ไอคอนเดี่ยว ๆ โดยไม่มีข้อความ เพราะผู้สูงอายุจำนวนมากไม่คุ้นเคยกับความหมายของไอคอน ทุกปุ่มจึงมีทั้งไอคอนและคำอธิบายควบคู่กัน',
    SECOND, 'E3EEF6'),
  new Paragraph({ children: [new PageBreak()] }));

// 12 admin
c.push(H1('12. มุมมองสำหรับบุคลากรทางการแพทย์'),
  NOTE('สถานะของส่วนนี้',
    'ทำเสร็จแล้วและกดใช้ได้จริง เปิดที่ /clinic รองรับทั้งเดสก์ท็อปและมือถือ · สิ่งที่ยังไม่ได้ทำคือฐานข้อมูลส่วนกลางและระบบบัญชีบุคลากร ระบบนี้อ่านข้อมูลจำลองในเครื่อง จึงยังไม่ใช่ระบบที่พร้อมใช้กับผู้ป่วยจริง',
    MED, 'FBF3D9'),
  SPACER(160),
  H2('12.1 วัตถุประสงค์'),
  P('แอปฝั่งผู้ใช้ตอบโจทย์ "ผู้ใช้หนึ่งคนติดตามตนเอง" แต่ในการนำไปใช้จริงระดับโรงพยาบาลหรือชุมชน จำเป็นต้องมีมุมมองฝั่งบุคลากรทางการแพทย์ เพื่อดูภาพรวมของประชากรและคัดกรองผู้ที่ควรได้รับการติดตามก่อน'),
  ...FIGW('clinic-desktop.png', 620, 'มุมมองบุคลากรบนเดสก์ท็อป — ภาพจากระบบจริง ข้อมูลในภาพเป็นข้อมูลจำลอง', false, 1800/2560),
  H2('12.2 ส่วนประกอบหลัก'),
  TBL(['ส่วนประกอบ', 'รายละเอียด'], [
    [{ t: 'ตัวเลขสรุป (KPI)', bold: true }, 'จำนวนผู้ใช้ · การคัดกรองวันนี้/สัปดาห์นี้ · เคสเสี่ยงสูง · คะแนนเฉลี่ย'],
    [{ t: 'กราฟแนวโน้ม', bold: true }, 'ปริมาณการคัดกรองเทียบกับคะแนนเสี่ยงเฉลี่ยรายสัปดาห์'],
    [{ t: 'สัดส่วนระดับความเสี่ยง', bold: true }, 'แผนภูมิวงกลมแสดงสัดส่วนผู้ใช้ระดับต่ำ / ปานกลาง / สูง'],
    [{ t: 'อัตราการเข้าร่วมรายแบบทดสอบ', bold: true }, 'ดูว่าแบบทดสอบใดมีผู้ทำไม่ครบ ช่วยชี้จุดที่ผู้ใช้ติดขัด'],
    [{ t: 'ตารางเคสความเสี่ยงสูง', bold: true }, 'รายการผู้ที่ต้องติดตาม เรียงตามความเร่งด่วน'],
    [{ t: 'แผงรายละเอียดรายบุคคล', bold: true }, 'กราฟย้อนหลัง 30 วัน · ผลรายแบบทดสอบ · สถานะการติดตาม'],
  ], [2900, 6460]),
  H2('12.3 ข้อกำหนดด้านความเป็นส่วนตัว'),
  BUL('แสดงเฉพาะรหัสอ้างอิงแบบไม่ระบุตัวตน ไม่แสดงชื่อ–นามสกุลหรือเลขบัตรประชาชน'),
  BUL('ต้องได้รับความยินยอมจากผู้ใช้ก่อนที่ข้อมูลจะปรากฏในระบบของบุคลากร'),
  BUL('ต้องมีระบบยืนยันตัวตนและกำหนดสิทธิ์การเข้าถึงตามบทบาท'),
  BUL('ต้องบันทึกประวัติการเข้าถึงข้อมูล (audit log)'),
  BUL('ทุกหน้าจอต้องคงข้อความกำกับว่าผลเป็นการคัดกรองเบื้องต้น ไม่ใช่การวินิจฉัย'),
  H2('12.4 สิ่งที่ต้องพัฒนาเพิ่ม'),
  NUMP('ระบบฐานข้อมูลส่วนกลาง (เช่น Supabase หรือ Firebase)'),
  NUMP('ระบบบัญชีและการยืนยันตัวตนของบุคลากรทางการแพทย์'),
  NUMP('กลไกจับคู่ข้อมูลแบบไม่ระบุตัวตนที่ปลอดภัย (pseudonymisation)'),
  NUMP('ระบบบันทึกประวัติการเข้าถึงข้อมูลตามข้อกำหนด PDPA'),
  NUMP('การตรวจสอบความแม่นยำทางคลินิกก่อนนำผลไปใช้ประกอบการตัดสินใจ'),
  SPACER(120),
  NOTE('ลำดับความสำคัญที่แนะนำ',
    'ข้อ 5 (การตรวจสอบความแม่นยำทางคลินิก) ควรทำก่อนข้ออื่นเสมอ เพราะการให้บุคลากรทางการแพทย์ใช้ผลที่ยังไม่ผ่านการสอบเทียบในการจัดลำดับการดูแลผู้ป่วย อาจนำไปสู่การตัดสินใจที่ผิดพลาดได้',
    SECOND, 'E3EEF6'),
  new Paragraph({ children: [new PageBreak()] }));

// 13 limits
c.push(H1('13. ข้อจำกัดของระบบ'),
  P('การระบุข้อจำกัดอย่างตรงไปตรงมาเป็นส่วนหนึ่งของความรับผิดชอบในการพัฒนาเครื่องมือด้านสุขภาพ'),
  H2('13.1 ข้อจำกัดด้านความแม่นยำ'),
  BUL('ค่าเกณฑ์ทั้งหมดเป็นการประมาณเชิงวิศวกรรม ยังไม่ผ่านการสอบเทียบกับข้อมูลผู้ป่วยจริง'),
  BUL('ยังไม่ได้ทดสอบความไว (sensitivity) และความจำเพาะ (specificity) กับกลุ่มตัวอย่างทางคลินิก'),
  BUL('ผลลัพธ์เหมาะสำหรับดูแนวโน้มการเปลี่ยนแปลงของตนเอง มากกว่าการเปรียบเทียบระหว่างบุคคล'),
  H2('13.2 ข้อจำกัดด้านอุปกรณ์'),
  BUL('เซ็นเซอร์ตรวจการเคลื่อนไหวมีคุณภาพต่างกันในแต่ละรุ่นของโทรศัพท์'),
  BUL('อุปกรณ์บางรุ่นไม่รองรับเซ็นเซอร์ตรวจการเคลื่อนไหว ระบบจะข้ามแบบทดสอบนั้นให้'),
  BUL('บน iOS ต้องกดอนุญาตให้เข้าถึงเซ็นเซอร์ก่อนใช้งาน'),
  BUL('ไมโครโฟนแต่ละเครื่องมีอัตราขยายต่างกัน จึงไม่สามารถวัดความดังเสียงจริงได้'),
  BUL('จำเป็นต้องใช้การเชื่อมต่อแบบ HTTPS เพื่อเข้าถึงกล้อง ไมโครโฟน และเซ็นเซอร์'),
  H2('13.3 สิ่งที่ยังไม่ได้พัฒนา'),
  BUL('การวัดลายมือที่เล็กลง (micrographia)'),
  BUL('การวัดภาวะใบหน้าไร้อารมณ์ (hypomimia)'),
  BUL('การวัด Jitter และ Shimmer ตามมาตรฐานระดับห้องปฏิบัติการ'),
  BUL('Dashboard สำหรับบุคลากรทางการแพทย์ (ตามหัวข้อ 12)'),
  BUL('การเชื่อมต่อฐานข้อมูลส่วนกลางและระบบบัญชีผู้ใช้'),
  H2('13.4 ทิศทางการพัฒนาต่อ'),
  NUMP('ศึกษาความแม่นยำทางคลินิกร่วมกับโรงพยาบาล เพื่อสอบเทียบค่าเกณฑ์ทั้งหมด'),
  NUMP('เพิ่มการวัด micrographia และ hypomimia ให้ครบตามอาการหลักของพาร์กินสัน'),
  NUMP('พัฒนาระบบฐานข้อมูลกลางและ Dashboard สำหรับบุคลากรทางการแพทย์'),
  NUMP('ขยายไปสู่แอปพลิเคชัน Android โดยใช้ตรรกะการคำนวณเดิม'),
  SPACER(160),
  NOTE('ข้อความปฏิเสธความรับผิดชอบ',
    'NeuroMotion AI เป็นเครื่องมือคัดกรองความเสี่ยงเบื้องต้นเท่านั้น ไม่ใช่เครื่องมือแพทย์ที่ผ่านการรับรอง ผลลัพธ์ไม่ใช่การวินิจฉัยโรค และไม่ควรใช้ทดแทนคำแนะนำจากแพทย์ผู้เชี่ยวชาญ หากมีอาการผิดปกติ ควรปรึกษาแพทย์โดยตรงเสมอ',
    HIGH, 'FBEAEA'));

const doc = new Document({
  creator: 'NeuroMotion AI',
  title: 'NeuroMotion AI — คู่มือการใช้งานพร้อมภาพประกอบ',
  features: { updateFields: true },
  numbering: { config: [
    { reference: 'bul', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: convertInchesToTwip(0.32), hanging: convertInchesToTwip(0.19) } } } }] },
    { reference: 'num', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: convertInchesToTwip(0.32), hanging: convertInchesToTwip(0.21) } } } }] },
  ] },
  styles: { default: { document: { run: { font: FONT, size: 20, color: INK } } } },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1100, bottom: 1100, left: 1260, right: 1260 } } },
    footers: { default: new Footer({ children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: 'NeuroMotion AI · คู่มือการใช้งาน · หน้า ', font: FONT, size: 15, color: MUTED }),
        new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 15, color: MUTED }),
      ],
    })] }) },
    children: c,
  }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(path.join(DIR, 'NeuroMotion-AI-Documentation.docx'), buf);
  console.log('WROTE docx', (buf.length / 1024 / 1024).toFixed(2), 'MB');
});
