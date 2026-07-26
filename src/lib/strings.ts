/**
 * Central Thai UI copy. Keep every user-facing string here so translation /
 * copy edits never require touching components.
 */
export const S = {
  appName: 'NeuroMotion AI',
  tagline: 'ระบบคัดกรองความเสี่ยง\nโรคทางระบบประสาทเบื้องต้น',
  splashFootnote: 'เครื่องมือคัดกรองระบบประสาท',
  start: 'เริ่มต้นใช้งาน',
  ready: 'พร้อมแล้ว เริ่มเลย',
  restart: 'เริ่มใหม่',
  next: 'ถัดไป',
  back: 'กลับ',
  backHome: 'กลับหน้าหลัก',
  skip: 'ข้ามแบบทดสอบนี้',

  login: {
    title: 'เข้าสู่ระบบ',
    subtitle: 'เลือกประเภทผู้ใช้งานของคุณ',
    general: 'คนทั่วไป',
    generalDesc: 'ตรวจคัดกรองเพื่อดูแลสุขภาพ',
    patient: 'ผู้ป่วย',
    patientDesc: 'ติดตามอาการร่วมกับแพทย์',
    birthLabel: 'วันเกิด',
    ageShow: (a: number) => `อายุ ${a} ปี`,
    step1: 'คุณเป็นใคร',
    step2: 'วันเกิดของคุณ',
    sizeHelper: 'อ่านไม่ชัด? ปรับขนาดตัวอักษรได้',
    birthHelp: 'เลื่อนเลือก วัน / เดือน / ปี พ.ศ.',
    nidLabel: 'เลขบัตรประชาชน (ไม่บังคับ)',
    nidPlaceholder: 'กรอก 13 หลัก',
    nidNote: 'ระบบผู้ป่วยเต็มรูปแบบ (เชื่อมข้อมูลกับแพทย์) จะเพิ่มในอนาคต',
    noAccount: 'ยังไม่มีบัญชี?',
    register: 'สมัครใช้งาน',
  },

  register: {
    title: 'สมัครใช้งาน',
    subtitle: 'สร้างบัญชีเพื่อเก็บผลของคุณ — ข้อมูลทั้งหมดเก็บไว้ในเครื่องของคุณเท่านั้น',
    firstName: 'ชื่อ',
    firstNamePh: 'เช่น สมชาย',
    lastName: 'นามสกุล',
    lastNamePh: 'เช่น ใจดี',
    age: 'อายุ (ปี)',
    agePh: 'เช่น 65',
    phone: 'เบอร์โทรศัพท์',
    phonePh: 'เช่น 081-234-5678',
    email: 'อีเมล',
    emailPh: 'เช่น somchai@email.com',
    submit: 'สร้างบัญชีและเริ่มใช้งาน',
    required: 'กรุณากรอกชื่อและอายุ',
    haveAccount: 'มีบัญชีแล้ว?',
    backToLogin: 'เข้าสู่ระบบ',
  },

  consent: {
    title: 'ความยินยอมในการใช้ข้อมูล',
    subtitle: 'ตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA) ข้อมูลสุขภาพของคุณเป็นข้อมูลอ่อนไหว เราขอความยินยอมก่อนใช้งาน',
    box1Title: 'จัดเก็บผลการคัดกรองของฉัน',
    box1Desc: 'จำเป็นสำหรับการใช้งาน — เก็บเฉพาะตัวเลขผลคำนวณไว้ในเครื่องของคุณ เพื่อแสดงแนวโน้มสุขภาพ ไม่เก็บภาพหรือเสียงดิบ',
    box2Title: 'ใช้ข้อมูลแบบไม่ระบุตัวตนเพื่อพัฒนา AI (ไม่บังคับ)',
    box2Desc: 'อนุญาตให้ใช้ตัวเลขผลทดสอบแบบไม่ระบุตัวตน เพื่อปรับปรุงความแม่นยำของระบบในอนาคต',
    accept: 'ยอมรับและเริ่มใช้งาน',
    mustAccept: 'กรุณายอมรับข้อแรกเพื่อใช้งาน',
    readyToStart: 'พร้อมเริ่มใช้งานแล้ว',
    dataNote: 'ข้อมูลจะถูกใช้ตามวัตถุประสงค์ที่ยินยอมเท่านั้น และคุณถอนความยินยอมได้ทุกเมื่อ',
  },

  home: {
    hello: (name: string) => `สวัสดีค่ะ คุณ${name}`,
    questTitle: 'ภารกิจวันนี้',
    questProgress: (done: number, total: number) => `${done} / ${total} เสร็จแล้ว`,
    questDesc: (remain: number) => `ทำแบบทดสอบอีก ${remain} รายการ เพื่อติดตามสุขภาพวันนี้ให้ครบ`,
    questDone: 'ครบทุกรายการแล้ว เยี่ยมมาก! ดูผลของคุณได้เลย',
    continueBtn: 'ทำต่อเลย',
    viewResult: 'ดูผลของฉัน',
    testsTitle: 'แบบทดสอบ',
    doneToday: 'เสร็จแล้ววันนี้',
    pending: 'รอทำ',
    aboutMin: 'ประมาณ 1 นาที',
    weekTitle: 'สัปดาห์นี้',
    weekDone: (d: number, t: number) => `ทำครบ ${d} จาก ${t} วัน`,
    calendar: 'ดูปฏิทิน',
    retestAll: 'ทำการทดสอบอีกครั้ง',
    calendarTitle: 'ปฏิทินการทดสอบ',
    calendarHint: 'วันที่มีจุดสีเขียว = ทำแบบทดสอบแล้ว',
    doneRedo: 'เสร็จแล้ว · แตะทำซ้ำได้',
    menuLabel: 'ตัวเลือกเพิ่มเติม',
    settingsTitle: 'ตั้งค่า',
    textSizeLabel: 'ขนาดตัวอักษร',
    voiceLabel: 'เสียงแนะนำภาษาไทย',
    on: 'เปิด',
    off: 'ปิด',
    eraseLabel: 'ลบข้อมูลของฉันทั้งหมด',
    eraseConfirm: 'ยืนยันลบข้อมูลทั้งหมดของคุณ? การกระทำนี้ย้อนกลับไม่ได้',
  },

  tests: {
    spiral: { name: 'วาดก้นหอย', title: 'ทดสอบวาดก้นหอย', instruction: 'ลากนิ้วตามเส้นก้นหอย\nช้า ๆ จากด้านในออกด้านนอก' },
    tapping: { name: 'เคาะนิ้ว', title: 'ทดสอบเคาะนิ้ว', instruction: 'แตะปุ่มวงกลมตามจังหวะ\nให้สม่ำเสมอที่สุด' },
    tremor: { name: 'ความนิ่งของมือ', title: 'ทดสอบความนิ่งของมือ', instruction: 'ทำ 2 ท่า: ถือโทรศัพท์ยกขึ้นในอากาศ\nแล้ววางแขนบนโต๊ะหรือตัก' },
    facial: { name: 'หันศีรษะ', title: 'ทดสอบการหันศีรษะ', instruction: 'หันหน้าไปทางซ้าย แล้วไปทางขวา\nช้า ๆ ให้สุดทั้งสองข้าง' },
    voice: { name: 'เสียงพูด', title: 'ทดสอบเสียงพูด', instruction: 'ออกเสียง "อาาา" ยาว ๆ\nให้นิ่งที่สุด 5 วินาที' },
  },
  stepLabel: (n: number) => `แบบทดสอบ ${n} / 5`,
  advancedTest: 'การทดสอบขั้นสูง',
  testing: 'กำลังทดสอบ…',
  keepGoing: 'ลากต่อไปเรื่อย ๆ ทำได้ดีมาก!',
  progress: 'ความคืบหน้า',
  taps: 'ครั้ง',
  secondsLeft: 'วินาทีที่เหลือ',
  rhythm: 'จังหวะ',
  holdSmile: (s: number) => `ยิ้มค้างไว้… ${s}`,
  sayAhh: 'ออกเสียง "อาาา" ต่อไป…',
  holdStill: 'ถือให้นิ่ง…',
  levelSteady: 'นิ่งดีมาก!',
  levelAdjust: 'ปรับให้ลูกกลมอยู่กลางวง',
  facialPrivacy: 'ภาพใบหน้าใช้เพื่อการคัดกรองเท่านั้น ไม่มีการเก็บรูปภาพไว้',
  voicePrivacy: 'เสียงถูกวิเคราะห์ในเครื่องเท่านั้น ไม่มีการเก็บไฟล์เสียงไว้',
  motionUnsupported: 'อุปกรณ์นี้ไม่มีเซ็นเซอร์ตรวจการเคลื่อนไหว หรือเบราว์เซอร์ไม่รองรับ — ข้ามแบบทดสอบนี้ได้เลย',
  permissionDenied: 'ไม่ได้รับอนุญาตให้ใช้งาน กรุณาอนุญาตในการตั้งค่าเบราว์เซอร์ แล้วลองใหม่',

  /** Permission-denied copy. Avoids the word "เบราว์เซอร์" and always offers a
   *  real retry — the old screen said "then try again" with no way to. */
  permission: {
    retry: 'ขออนุญาตอีกครั้ง',
    camera: {
      title: 'ยังไม่ได้เปิดสิทธิ์กล้อง',
      body: 'แตะปุ่ม "ขออนุญาตอีกครั้ง" ด้านล่าง แล้วเลือก "อนุญาต"\nถ้าไม่มีข้อความขึ้นมา ให้แตะรูปกุญแจ 🔒 ข้างที่อยู่เว็บด้านบน แล้วเปิดสิทธิ์กล้อง',
    },
    mic: {
      title: 'ยังไม่ได้เปิดสิทธิ์ไมโครโฟน',
      body: 'แตะปุ่ม "ขออนุญาตอีกครั้ง" ด้านล่าง แล้วเลือก "อนุญาต"\nถ้าไม่มีข้อความขึ้นมา ให้แตะรูปกุญแจ 🔒 ข้างที่อยู่เว็บด้านบน แล้วเปิดสิทธิ์ไมโครโฟน',
    },
    motion: {
      title: 'ยังไม่ได้เปิดสิทธิ์เซ็นเซอร์',
      body: 'แตะปุ่ม "ขออนุญาตอีกครั้ง" ด้านล่าง แล้วเลือก "อนุญาต" เพื่อวัดการสั่นของมือ',
    },
  },
  cameraStarting: 'กำลังเปิดกล้อง…',
  modelLoading: 'กำลังโหลดระบบวิเคราะห์…',
  testDone: 'เสร็จเรียบร้อย!',
  analyzing: 'กำลังประมวลผล…',
  analyzingSub: 'กำลังวิเคราะห์การเคลื่อนไหวของคุณ',
  nextTest: (name: string) => `ถัดไป: ${name}`,
  testDoneSpoken: 'เสร็จเรียบร้อยแล้วค่ะ กดปุ่มสีส้มด้านล่างเพื่อทำแบบทดสอบถัดไป',
  allDoneSpoken: 'ทำครบทุกแบบทดสอบแล้วค่ะ เก่งมาก กดดูผลของคุณได้เลย',
  demoTitle: 'ดูวิธีทำ',
  demoCaption: {
    spiral: 'ใช้นิ้วลากตามเส้น จากจุดกลาง วนออกด้านนอก',
    tapping: 'แตะปุ่มวงกลมเป็นจังหวะสม่ำเสมอตามเสียง',
    tremor: 'ท่าที่ 1 ยกโทรศัพท์ขึ้นในอากาศ · ท่าที่ 2 วางแขนบนโต๊ะ/ตัก',
    facial: 'หันหน้าไปทางซ้ายจนสุด แล้วหันไปทางขวาจนสุด',
    voice: 'ออกเสียง "อาาา" ยาว ๆ ให้นิ่งที่สุด',
  } as Record<string, string>,
  replayVoice: 'ฟังคำแนะนำอีกครั้ง',

  /** Shown when a test produced too little data to score honestly. */
  invalid: {
    title: 'ยังทำไม่สำเร็จ',
    retry: 'ลองใหม่อีกครั้ง',
    note: 'ผลที่ไม่สมบูรณ์จะไม่ถูกบันทึก เพื่อไม่ให้คะแนนคลาดเคลื่อน',
    spiral: 'ยังลากไม่ครบเส้น ลองลากตามเส้นจากตรงกลางออกไปจนถึงวงนอกสุดนะคะ',
    tapping: 'แตะน้อยเกินไป จึงยังประเมินไม่ได้ ลองแตะตามจังหวะอีกครั้งนะคะ',
    tremor: 'เก็บข้อมูลการสั่นได้ไม่ครบ ลองถือโทรศัพท์ให้นิ่งแล้วทำใหม่นะคะ',
    facial: 'ยังหันไม่ครบทั้งสองข้าง ลองหันซ้ายให้สุด แล้วหันขวาให้สุดอีกครั้งนะคะ',
    voice: 'ยังไม่ได้ยินเสียงชัดพอ ลองออกเสียง "อาาา" ให้ดังและยาวขึ้นนะคะ',
  } as Record<string, string>,
  countdownReady: 'เตรียมตัว…',
  countdownGo: 'เริ่ม!',
  countdownHints: {
    spiral: 'วางนิ้วรอที่จุดสีส้มตรงกลาง',
    tapping: 'เตรียมนิ้วไว้เหนือปุ่ม แตะตามเสียง',
    tremor: 'ยกโทรศัพท์ขึ้นถือไว้ในอากาศ',
    facial: 'ยกมือถือให้เห็นใบหน้า มองตรงเตรียมไว้',
    voice: 'หายใจเข้า เตรียมออกเสียง "อาาา"',
  } as Record<string, string>,

  // 3-step test flow: watch video → practice → real test
  flow: {
    steps: ['ดูคลิป', 'ทดลองใช้', 'ทดสอบจริง'],
    watchTitle: 'ดูวิธีทำก่อน',
    // The demo animation IS the designed content; a video is a bonus. Never
    // mention admins to a patient.
    noVideo: 'ดูภาพสาธิตด้านบนให้เข้าใจก่อน แล้วไปลองทำในขั้นถัดไปได้เลย',
    toPractice: 'ต่อไป: ทดลองใช้',
    practiceTitle: 'ทดลองใช้',
    practiceHint: 'ลองทำดูก่อนได้เลย ยังไม่เก็บคะแนน',
    practiceTapping: 'ลองแตะปุ่มตามจังหวะเสียง',
    practiceSpiral: 'ลองใช้นิ้วลากตามเส้นดู',
    practiceGeneric: 'ทำความเข้าใจวิธีทำจากคลิปและภาพสาธิต',
    practiceTremor: 'ลองถือโทรศัพท์ให้นิ่ง — ยังไม่เก็บคะแนน',
    practiceFacial: 'ลองหันหน้าซ้าย-ขวาดู — ยังไม่เก็บคะแนน',
    practiceVoice: 'ลองออกเสียง "อาาา" ดู — ยังไม่เก็บคะแนน',
    practiceStart: 'แตะเพื่อเริ่มลอง',
    practiceNoSensor: 'อุปกรณ์นี้ไม่มีเซ็นเซอร์ตรวจการเคลื่อนไหว — ข้ามไปทดสอบจริงได้เลย',
    practiceNoCamera: 'ยังเปิดกล้องไม่ได้ — ข้ามไปทดสอบจริงได้เลย',
    practiceNoMic: 'ยังเปิดไมโครโฟนไม่ได้ — ข้ามไปทดสอบจริงได้เลย',
    voiceLoud: 'ดังพอดี',
    faceFound: 'เห็นใบหน้าแล้ว',
    toReal: 'พร้อมแล้ว ทดสอบจริง',
    watchAgain: 'ดูอีกครั้ง',
  },

  // Tapping runs in three blocks: paced, then max-speed on each hand
  tapBlock: {
    // short labels shown on the progress stepper — plain, not jargon
    pacedShort: 'เคาะตามจังหวะ',
    maxDominantShort: 'ใช้มือที่ถนัด',
    maxOtherShort: 'สลับไปอีกมือ',
    // instructions shown as the screen subtitle while tapping
    pacedInstr: 'แตะปุ่มตามเสียงจังหวะ ให้สม่ำเสมอที่สุด',
    maxInstr: 'แตะให้เร็วที่สุดเท่าที่ทำได้ ไม่ต้องตามจังหวะ',
    // switch screens — spell out WHICH hand, with an everyday example, since
    // "มือถนัด" (dominant hand) is not obvious to everyone
    switchToMaxTitle: 'ต่อไป: ใช้ "มือที่ถนัด"',
    switchToMaxDesc: 'มือที่ถนัด คือมือที่คุณใช้เขียนหนังสือหรือจับช้อน\nแตะปุ่มด้วยนิ้วชี้ให้เร็วที่สุดเท่าที่ทำได้',
    switchToOtherTitle: 'ตอนนี้เปลี่ยนไปใช้ "อีกมือหนึ่ง"',
    switchToOtherDesc: 'ใช้มือที่ยังไม่ได้ทำ (มือที่ไม่ถนัด) แตะให้เร็วที่สุด\nเราเทียบสองมือเพื่อดูว่าเท่ากันไหม',
    maxHint: 'เร็วที่สุด!',
    useDominant: 'ใช้มือที่ถนัด',
    useOther: 'ใช้อีกมือหนึ่ง',
  },

  // Rest / postural tremor two-phase test
  tremorPhase: {
    postural: 'ท่าที่ 1 — ยกขึ้นในอากาศ',
    rest: 'ท่าที่ 2 — วางแขนบนโต๊ะ/ตัก',
    posturalInstr: 'ยกโทรศัพท์ขึ้นถือไว้ในอากาศ แขนไม่พิง ถือให้นิ่งที่สุด',
    restInstr: 'วางข้อศอกและแขนบนโต๊ะหรือบนตัก ถือโทรศัพท์ให้นิ่งที่สุด',
    posturalShort: 'ยกขึ้นในอากาศ',
    restShort: 'วางแขนบนโต๊ะ/ตัก',
    nextPhase: 'ต่อไป: วางแขนบนโต๊ะ',
    switchNow: 'เปลี่ยนท่า! วางแขนลงบนโต๊ะหรือตัก',
  },

  // Head-turn test prompts
  headTurn: {
    lookLeft: 'หันหน้าไปทางซ้ายจนสุด',
    lookRight: 'หันหน้าไปทางขวาจนสุด',
    lookCenter: 'มองตรงไว้ก่อน',
    good: 'ดีมาก!',
    backToCenter: 'หันกลับมามองตรง',
    leftDone: 'ซ้ายเรียบร้อย ✓',
    rightDone: 'ขวาเรียบร้อย ✓',
    faceNotFound: 'จัดใบหน้าให้อยู่ในกรอบ',
  },

  admin: {
    title: 'ผู้ดูแลระบบ — คลิปสอน',
    subtitle: 'อัปโหลดคลิปวิดีโอสอนวิธีทำสำหรับแต่ละแบบทดสอบ (เก็บในเครื่องนี้เท่านั้น)',
    upload: 'อัปโหลดคลิป',
    replace: 'เปลี่ยนคลิป',
    remove: 'ลบคลิป',
    hasVideo: 'มีคลิปแล้ว',
    noVideo: 'ยังไม่มีคลิป',
    back: 'กลับ',
    openAdmin: 'ผู้ดูแลระบบ (คลิปสอน)',
    seedTitle: 'ข้อมูลตัวอย่างสำหรับสาธิต',
    seedDesc: 'ใส่ผลย้อนหลัง 7 วัน เพื่อให้กราฟและประวัติไม่ว่างตอนสาธิต',
    seedBtn: 'โหลดข้อมูลตัวอย่าง',
    seedDone: 'โหลดข้อมูลตัวอย่างแล้ว',
  },

  doctorAlert: {
    banner: 'ผลของคุณอยู่ในเกณฑ์เสี่ยงติดต่อกันหลายวัน',
    detail: (n: number) => `พบผลเสี่ยงสูงต่อเนื่อง ${n} วัน แนะนำให้ไปพบแพทย์เพื่อตรวจอย่างละเอียด`,
    cta: 'ปรึกษาแพทย์',
  },

  result: {
    badge: 'ผลการคัดกรองเบื้องต้น',
    riskLow: 'ความเสี่ยงต่ำ',
    riskMedium: 'ความเสี่ยงปานกลาง',
    riskHigh: 'พบสัญญาณที่ควรใส่ใจ',
    lowDesc: 'ผลของคุณวันนี้อยู่ในเกณฑ์ปกติ',
    // A "low" screening result must never be read as "you don't have the disease".
    lowCaveat:
      'ผลปกติไม่ได้ยืนยันว่าไม่มีโรค — หากมีอาการ เช่น มือสั่น เคลื่อนไหวช้าลง หรือลายมือเล็กลง ควรพบแพทย์แม้ผลจะปกติ',
    mediumDesc: 'มีบางรายการที่ควรเฝ้าดู ลองทำแบบทดสอบสม่ำเสมอ',
    highDesc: 'พบสัญญาณบางอย่างที่ควรปรึกษาแพทย์\nไม่ต้องกังวล เราอยู่เคียงข้างคุณ',
    perTest: 'ผลรายการทดสอบ',
    statusNormal: 'ปกติ',
    statusWatch: 'เฝ้าดู',
    statusCheck: 'ควรตรวจเพิ่ม',
    trend: 'แนวโน้มของคุณ',
    trendHint: 'คะแนนความเสี่ยง · ยิ่งต่ำยิ่งดี',
    trendTapHint: 'แตะกราฟเพื่อดูย้อนหลังแบบละเอียด',
    trendDetailTitle: 'ประวัติผลย้อนหลัง',
    latestBadge: 'ล่าสุด',
    latestScore: (n: number) => `คะแนนล่าสุด ${n}`,
    scoreUnit: 'คะแนน',
    todayLabel: 'วันนี้',
    trendGood: 'แนวโน้มดีขึ้น ทำได้ดีมาก!',
    trendWorse: 'แนวโน้มสูงขึ้น ควรสังเกตอาการและปรึกษาแพทย์',
    trendFlat: 'แนวโน้มค่อนข้างคงที่',
    trendNeedMore: 'ทำแบบทดสอบต่อเนื่องหลายวัน เพื่อดูแนวโน้มของคุณ',
    careTitle: 'คำแนะนำ',
    careLow: 'ทำแบบทดสอบต่อเนื่องทุกวัน เพื่อติดตามสุขภาพของคุณ',
    careMedium: 'ทำแบบทดสอบสม่ำเสมอ และสังเกตอาการ หากแนวโน้มสูงขึ้นควรปรึกษาแพทย์',
    careHigh: 'ควรพบแพทย์เพื่อตรวจอย่างละเอียด ผลนี้ยังไม่ใช่การวินิจฉัย — การตรวจแต่เนิ่น ๆ ช่วยให้ดูแลได้ดีที่สุด',
    consult: 'ปรึกษาแพทย์ออนไลน์',
    consultDesc: 'เลือกช่องทางที่สะดวก เจ้าหน้าที่พร้อมให้คำแนะนำเบื้องต้น',
    callHotline: 'โทรสายด่วน สปสช. 1330',
    callHotlineSub: 'ให้คำปรึกษาสุขภาพ ตลอด 24 ชั่วโมง',
    findHospital: 'ค้นหาโรงพยาบาลใกล้บ้าน',
    findHospitalSub: 'เปิดแผนที่ค้นหาสถานพยาบาลใกล้คุณ',
    close: 'ปิด',
    share: 'บันทึก / แชร์ผลของฉัน',
    disclaimer: 'ผลนี้เป็นการคัดกรองเบื้องต้นเท่านั้น ไม่ใช่การวินิจฉัยโรค\nโปรดปรึกษาแพทย์เพื่อการตรวจอย่างละเอียด',
    noData: 'ยังไม่มีผลทดสอบ — เริ่มทำแบบทดสอบแรกของคุณได้เลย',
    normalLegend: 'ปกติ',
    riskLegend: 'เสี่ยง',
    detailTitle: 'รายละเอียดผลแต่ละด้าน',
    tapToExpand: 'แตะเพื่อดูรายละเอียด',
    mostConcern: (label: string) => `จุดที่ควรใส่ใจ: ${label}`,
    allNormalDetail: 'ทุกด้านอยู่ในเกณฑ์ปกติ',
    metricGood: 'ปกติ',
    metricWatch: 'เฝ้าดู',
    metricConcern: 'ผิดปกติ',
    // per-condition risk (three tremor syndromes)
    conditionsTitle: 'ระดับความเสี่ยงแต่ละภาวะ',
    conditionsIntro: 'ประเมินความเสี่ยงของแต่ละภาวะที่คัดกรอง (เบื้องต้น ไม่ใช่การวินิจฉัย)',
    conditionsNeedTremor: 'ทำ "แบบทดสอบความนิ่งของมือ" ให้ครบ เพื่อดูความเสี่ยงแต่ละภาวะ',
    conditionRiskHigh: 'เสี่ยงสูง',
    conditionRiskMedium: 'เสี่ยงปานกลาง',
    conditionRiskLow: 'เสี่ยงต่ำ',
    conditionsDisclaimer: 'ความเสี่ยงนี้ประเมินจากลักษณะการเคลื่อนไหวเท่านั้น อาการสั่นมีได้หลายสาเหตุ ต้องให้แพทย์ตรวจยืนยัน',
    conditions: {
      parkinsonian: {
        name: 'กลุ่มอาการพาร์กินสัน',
        sub: 'Parkinsonian Syndrome',
        desc: 'มือสั่นขณะพัก เคลื่อนไหวช้าลง มักเริ่มจากข้างเดียว',
      },
      essential: {
        name: 'อาการสั่นไม่ทราบสาเหตุ',
        sub: 'Essential Tremor',
        desc: 'มือสั่นตอนขยับหรือเกร็งค้าง มักเป็นทั้งสองข้างพอ ๆ กัน',
      },
      physiological: {
        name: 'อาการสั่นตามธรรมชาติที่มากขึ้น',
        sub: 'Enhanced Physiological Tremor',
        desc: 'สั่นเล็ก ๆ ถี่ ๆ มักจากความเครียด กาแฟ หรือพักผ่อนน้อย',
      },
    } as Record<string, { name: string; sub: string; desc: string }>,
    detailSheetSub: 'ผลแต่ละตัวชี้วัด',
    // shown when one domain is severely abnormal even though the average is not
    redFlag: (names: string) => `แม้คะแนนรวมจะยังไม่สูง แต่พบความผิดปกติชัดเจนที่ "${names}" จึงยังไม่ถือว่าปกติ`,
    metricLegend: 'ยิ่งแถบยาว = ยิ่งควรใส่ใจ',
    testDisclaimer: 'ตัวเลขเหล่านี้เป็นการคัดกรองเบื้องต้น ไม่ใช่การวินิจฉัย',
  },

  /** One-line "what it measures" for each metric (shown in the detail sheet). */
  metricDesc: {
    rmsErrorNorm: 'เส้นที่ลากเบี่ยงจากแบบมากแค่ไหน',
    tremorBandPower: 'มีมือสั่นถี่ ๆ ขณะลากเส้นหรือไม่',
    spacingCV: 'ช่องไฟระหว่างวงสม่ำเสมอแค่ไหน',
    speedCV: 'ความเร็วการลากคงที่หรือสะดุด',
    rate: 'จำนวนครั้งที่เคาะได้ต่อวินาที',
    itiSD: 'จังหวะการเคาะสม่ำเสมอแค่ไหน',
    decrementSlope: 'เคาะช้าลงเรื่อย ๆ หรือไม่',
    timingError: 'เคาะตรงกับจังหวะที่กำหนดแค่ไหน',
    asymmetry: 'มือสองข้างเคาะได้เร็วต่างกันมากไหม',
    restBandPower: 'มือสั่นถี่ ๆ ขณะวางแขนพัก (สำคัญที่สุด)',
    restRms: 'แอมพลิจูด (ความแรง) ของการสั่นขณะวางแขน',
    posturalBandPower: 'การสั่นขณะยกมือค้างในอากาศ',
    posturalRms: 'แอมพลิจูด (ความแรง) ของการสั่นขณะยกมือ',
    turnRangeDeg: 'หันศีรษะได้กว้างแค่ไหน (ซ้าย+ขวา)',
    turnAsymmetry: 'หันซ้ายกับขวาได้เท่ากันหรือไม่',
    turnSmoothness: 'การหันลื่นไหลหรือสะดุด',
    jitterPct: 'ระดับเสียงสูงต่ำสั่นแค่ไหน',
    shimmerPct: 'ความดังของเสียงสั่นแค่ไหน',
    f0CV: 'เสียงคงที่ตลอดการออกเสียงหรือไม่',
  } as Record<string, string>,

  /** Human-readable Thai labels for each raw metric key (for the detail view). */
  metricLabels: {
    // spiral
    rmsErrorNorm: 'ความแม่นของเส้นที่ลาก',
    tremorBandPower: 'แรงสั่นขณะวาด',
    spacingCV: 'ความสม่ำเสมอของช่องไฟ',
    speedCV: 'ความลื่นไหลของการลาก',
    // tapping
    rate: 'ความเร็วในการเคาะ',
    itiSD: 'ความสม่ำเสมอของจังหวะ',
    decrementSlope: 'อาการเคาะช้าลงเรื่อย ๆ',
    timingError: 'ความตรงจังหวะ',
    asymmetry: 'ความต่างระหว่างสองมือ',
    // tremor
    restBandPower: 'แรงสั่นขณะวางแขน (พัก)',
    restRms: 'ขนาดการสั่นขณะวางแขน',
    posturalBandPower: 'แรงสั่นขณะยกมือ',
    posturalRms: 'ขนาดการสั่นขณะยกมือ',
    // facial (head-turn)
    turnRangeDeg: 'ช่วงการหันศีรษะ',
    turnAsymmetry: 'ความสมมาตรซ้าย-ขวา',
    turnSmoothness: 'ความลื่นไหลของการหัน',
    // voice
    jitterPct: 'ความสั่นของระดับเสียง',
    shimmerPct: 'ความสั่นของความดัง',
    f0CV: 'ความคงที่ของเสียง',
  } as Record<string, string>,

  daysShort: ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'],
};

/** Thai Buddhist-era date, e.g. "13 ก.ค. 2569" */
export function thaiDate(d: Date): string {
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
}

/** Thai long date with weekday, e.g. "วันจันทร์ที่ 13 ก.ค. 2569" */
export function thaiDateLong(d: Date): string {
  const days = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
  return `วัน${days[d.getDay()]}ที่ ${thaiDate(d)}`;
}
