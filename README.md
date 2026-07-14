# NeuroMotion AI — Web Demo

PWA คัดกรองความเสี่ยงโรคทางระบบประสาทเบื้องต้น (โฟกัสพาร์กินสัน) ผ่านแบบทดสอบง่าย ๆ บนมือถือ:
วาดก้นหอย · เคาะนิ้ว · ความนิ่งของมือ · สแกนใบหน้า (ยิ้ม) · เสียงพูด ("อาาา")

> **ข้อจำกัด:** ผลเป็นการคัดกรองเบื้องต้น ไม่ใช่การวินิจฉัยโรค เกณฑ์คะแนนยังไม่ผ่านการตรวจสอบทางคลินิก

## รันบนเครื่อง (Development)

```bash
npm install
npm run dev        # เปิด http://localhost:5173 (หรือพอร์ตที่ vite เลือก)
```

ทดสอบบนมือถือในวง LAN เดียวกัน: `npm run dev -- --host` แล้วเปิด IP ที่แสดง
(กล้อง/ไมค์/เซ็นเซอร์ต้องใช้ **HTTPS** — บน localhost ใช้ได้เลย แต่ผ่าน IP LAN จะถูกบล็อก
ให้ทดสอบฟีเจอร์เหล่านั้นจากลิงก์ที่ deploy แล้วแทน)

## Build

```bash
npm run build      # ได้ไฟล์ static ที่ dist/
npm run preview    # ลองเสิร์ฟ dist/ ในเครื่อง
```

## Deploy (ลิงก์แชร์ได้ HTTPS ฟรี)

### วิธีที่ 1 — Netlify Drop (ง่ายสุด ไม่ต้องใช้ git)
1. `npm run build`
2. เปิด https://app.netlify.com/drop
3. ลากโฟลเดอร์ `dist/` ทั้งโฟลเดอร์ไปวางบนหน้านั้น
4. ได้ลิงก์ `https://xxxx.netlify.app` ทันที — เปิดบนมือถือได้เลย
   (ไฟล์ `public/_redirects` จัดการ SPA routing ให้แล้ว)

### วิธีที่ 2 — Vercel (ผูก GitHub, deploy อัตโนมัติทุก push)
1. สร้าง repo บน GitHub แล้ว push โค้ดขึ้นไป
2. เข้า https://vercel.com → **Add New → Project** → เลือก repo นี้
3. Vercel ตรวจพบ Vite เอง (Build: `npm run build`, Output: `dist`) → กด **Deploy**
4. ได้ลิงก์ `https://xxxx.vercel.app` และ deploy ใหม่อัตโนมัติทุกครั้งที่ push
   (ไฟล์ `vercel.json` จัดการ SPA routing ให้แล้ว)

### หลัง deploy — เช็คบนมือถือจริง
- เปิดลิงก์ → ลากก้นหอยลื่นไหม ปุ่มใหญ่พอไหม
- แบบทดสอบความนิ่งของมือ: iOS จะขอสิทธิ์ motion ตอนแตะ "พร้อมแล้ว เริ่มเลย"
- สแกนใบหน้า/เสียงพูด: เบราว์เซอร์จะขอสิทธิ์กล้อง/ไมค์ (ต้องเป็น HTTPS — ลิงก์ deploy ใช้ได้)
- Add to Home Screen ได้ (PWA)

## โครงสร้าง

- `src/lib/` — โลจิกคำนวณล้วน (spiral, tapping, tremor, facial, voice, fft, scoring)
  ค่าคงที่ปรับจูนทั้งหมดอยู่ที่ `src/lib/thresholds.ts`
- `src/routes/` — หน้าจอ (Splash, Login, Consent PDPA, Home, แบบทดสอบ 5 ตัว, Result)
- `src/lib/strings.ts` — ข้อความไทยทั้งหมดรวมที่เดียว
- `design/reference/` — ไฟล์ดีไซน์ต้นฉบับจาก Claude Design

ดูรายละเอียดเพิ่มใน `CLAUDE.md`
