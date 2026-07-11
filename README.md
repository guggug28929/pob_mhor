# พบหมอ Smart Triage — Prototype v0.2

## ทดลองทันที
เปิด `index.html` ในเบราว์เซอร์ ระบบจะทำงานด้วย Smart Local Mode โดยไม่ส่งข้อมูลออกจากเครื่อง

## เปิด AI Mode บน Vercel
1. สร้าง GitHub repository แล้วอัปโหลดไฟล์ทั้งหมดในโฟลเดอร์นี้
2. Import repository เข้า Vercel
3. เพิ่ม Environment Variable:
   - `OPENAI_API_KEY` = API key ของคุณ
   - `OPENAI_MODEL` = `gpt-5.6-luna` (ไม่ใส่ก็ใช้ค่านี้)
4. Redeploy
5. ป้ายด้านบนจะเปลี่ยนจาก `Smart local mode` เป็น `AI + Safety Rules`

## สถาปัตยกรรม
- AI ใช้เฉพาะสกัดข้อมูลจากภาษาพูดเป็น structured facts
- กฎ deterministic ในหน้าเว็บตรวจ red flags, vital signs และ disposition ซ้ำ
- API key อยู่ฝั่ง server เท่านั้น
- API request ตั้ง `store: false`

## สำคัญ
เป็นต้นแบบสำหรับทดลอง UX/logic เท่านั้น ยังไม่ผ่าน clinical validation, regulatory review หรือการขึ้นทะเบียนเครื่องมือแพทย์ ห้ามใช้แทนการประเมินผู้ป่วยจริง

## v0.3 — Differential diagnosis layer

- Adds structured DDx: likely causes and important conditions to rule out.
- Shows supporting/contradicting features and what examination/test may distinguish each condition.
- Adds adaptive feature questions for headache, respiratory symptoms, abdominal pain, rash, and urinary symptoms.
- Disposition remains deterministic and takes priority over DDx.
