# 📚 Ebook Library - ห้องสมุดอิเล็กทรอนิกส์

ระบบห้องสมุดอิเล็กทรอนิกส์ที่ใช้ Google Sheets เป็นฐานข้อมูล และ Google Apps Script เป็น API

## 🎯 ฟีเจอร์

- ✅ แสดงรายการหนังสืออิเล็กทรอนิกส์
- ✅ ค้นหาหนังสือ (Real-time search with debounce)
- ✅ กรองตามหมวดหมู่
- ✅ Pagination (12 เล่มต่อหน้า)
- ✅ Modal แสดงรายละเอียด
- ✅ ดาวน์โหลดหนังสือ (พร้อมระบบเก็บ Log)
- ✅ Responsive Design
- ✅ Keyboard Navigation (Arrow keys สำหรับ pagination)
- ✅ Dark Blue Theme สวยงาม
- ✅ Smooth Animations
- ✅ ระบบนับผู้เข้าชมเว็บไซต์ (Visitor Counter)
- ✅ ระบบเก็บประวัติการดาวน์โหลด (Download Logs)

## 📁 โครงสร้างไฟล์

```
ebook-library/
├── index.html          # หน้าเว็บหลัก
├── style.css           # Stylesheet
├── script.js           # JavaScript logic
├── apps-script.js      # Google Apps Script (สำหรับวางใน Google Sheets)
└── README.md           # คู่มือนี้
```

## 🚀 วิธีการติดตั้ง

### ขั้นตอนที่ 1: ตั้งค่า Google Sheets

1. สร้าง Google Sheet ใหม่หรือใช้ที่มีอยู่
2. ตั้งชื่อ Sheet Tab หลักเป็น `ebook`
3. สร้างหัวตารางในแถวที่ 1 สำหรับ Sheet **`ebook`**:

| A | B | C | D | E | F |
|---|---|---|---|---|---|
| title | author | category | coverUrl | description | linkdownload |

4. เพิ่มข้อมูลหนังสือตั้งแต่แถวที่ 2 เป็นต้นไป

### ขั้นตอนที่ 2: ตั้งค่า Google Apps Script

1. ใน Google Sheet คลิก **Extensions** → **Apps Script**
2. **สำคัญ:** ที่เมนู Services (ด้านซ้าย) ให้กด + แล้วเพิ่ม **"Google Sheets API"**
3. ลบโค้ดเดิมออกทั้งหมด
4. คัดลอกโค้ดจากไฟล์ `apps-script.js` แล้ววาง
5. คลิก **Save** (💾)
6. คลิก **Deploy** → **New deployment**
7. คลิกไอคอน ⚙️ ข้างๆ "Select type" → เลือก **Web app**
8. ตั้งค่า:
   - **Description**: Ebook Library API
   - **Execute as**: Me (your-email@gmail.com)
   - **Who has access**: Anyone
9. คลิก **Deploy**
10. **คัดลอก Web app URL** (นำไปใช้ในขั้นตอนถัดไป)

*หมายเหตุ: Script จะสร้าง Sheet เพิ่มเติมให้อัตโนมัติเมื่อมีการใข้งาน ได้แก่ `visit_counter` (นับจำนวนคนเข้าชม) และ `download` (เก็บประวัติการดาวน์โหลด)*

### ขั้นตอนที่ 3: แก้ไข Frontend Code

1. เปิดไฟล์ `script.js`
2. แก้ไขบรรทัดที่ 12:

```javascript
// เปลี่ยนจาก const APPS_SCRIPT_URL = '...'; เป็น URL ที่คัดลอกมา
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby.../exec';
```

3. บันทึกไฟล์

### ขั้นตอนที่ 4: เปิดใช้งาน

1. เปิดไฟล์ `index.html` ในเบราว์เซอร์
2. เว็บจะโหลดข้อมูลจาก Google Sheets อัตโนมัติ

## 📊 ระบบติดตามผล (Analytics)

ระบบมีการเก็บข้อมูลสถิติโดยอัตโนมัติลงใน Google Sheets:

### 1. ตัวนับจำนวนผู้เข้าชม (Visitor Counter)
- เก็บข้อมูลใน Sheet ชื่อ: **`visit_counter`**
- รูปแบบ: เก็บตัวเลขรวม (Total Visitors) ไว้ที่ช่อง A2 และเวลาอัปเดตล่าสุดที่ B2
- การทำงาน: นับเพิ่มเฉพาะการเข้าชมครั้งแรกของ Session นั้นๆ

### 2. ประวัติการดาวน์โหลด (Download Logs)
- เก็บข้อมูลใน Sheet ชื่อ: **`download`**
- ข้อมูลที่เก็บต่อ 1 การดาวน์โหลด:
  - **Datetime**: วันเวลาที่กด
  - **Ebook Title**: ชื่อหนังสือ
  - **Downloader IP**: IP Address ของผู้ดาวน์โหลด
  - **User Agent**: ข้อมูล Browser/Device ของผู้ใช้

> **หมายเหตุความปลอดภัย:** มีการใช้ `api.ipify.org` เพื่อดึง IP Address ของผู้ใช้งานเพื่อวัตถุประสงค์ในการเก็บสถิติเท่านั้น

## 🎨 การปรับแต่ง

### เปลี่ยนจำนวนหนังสือต่อหน้า

แก้ไขในไฟล์ `script.js`:
```javascript
const ITEMS_PER_PAGE = 12; // เปลี่ยนเป็นจำนวนที่ต้องการ
```

### เปลี่ยนสีธีม

แก้ไขในไฟล์ `style.css` ที่ส่วน `:root`.

## 🔧 การแก้ไขปัญหาทั่วไป

### รูปปกหนังสือไม่แสดง
Google Drive ไม่อนุญาตให้ใช้ URL แบบ `uc?id=` โดยตรง ให้ใช้แบบ Thumbnail แทน:
❌ `https://drive.google.com/file/d/ID/view...`
✅ `https://drive.google.com/thumbnail?id=YOUR_FILE_ID&sz=w500`

### ข้อมูลไม่อัปเดต
ให้กดปุ่ม Refresh (🔄) ที่มุมขวาบนของเว็บ หรือกด `Ctrl + Shift + R` เพื่อเคลียร์ Cache

### Error: "Google Sheets API is not defined"
ต้องเปิดใช้งาน Service "Google Sheets API" ในหน้า Apps Script Editor ก่อน (ดูขั้นตอนการติดตั้งข้อ 2)

## 🎓 เทคโนโลยีที่ใช้

- HTML5 / CSS3 / Vanilla JavaScript
- Google Apps Script (Backend)
- Google Sheets API v4 (Database & High Performance)
- LocalStorage Caching

---

> [!TIP]
> หากมีปัญหาหรือข้อสงสัย สามารถตรวจสอบ Console Log (F12) เพื่อดู Error message ได้

**Made with ❤️ by Tech for Ummah**
