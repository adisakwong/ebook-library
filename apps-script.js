/**
 * Google Apps Script สำหรับ Ebook Library (Optimized Version)
 * 
 * วิธีการตั้งค่าเพื่อประสิทธิภาพสูงสุด:
 * 1. เปิด Google Sheet ของคุณ
 * 2. คลิก Extensions → Apps Script
 * 3. **สำคัญมาก:** คลิกเมนู Services (ทางซ้าย) → เลือก "Google Sheets API" → คลิก Add
 * 4. ลบโค้ดเดิมทั้งหมด แล้ววางโค้ดนี้
 * 5. คลิก Deploy → New deployment
 * 6. เลือก type: Web app
 * 7. ตั้งค่า:
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 8. คลิก Deploy และนำ URL ไปใช้ใน script.js
 */

const SHEET_NAME = 'ebook';
const VISIT_COUNT_SHEET = 'visit_counter';
const DOWNLOAD_SHEET = 'download';
const DATA_RANGE = 'A2:F'; // Title, Author, Category, Cover, Description, Link

function doGet(e) {
    try {
        const action = e.parameter.action || 'view'; // view, download
        const ip = e.parameter.ip || 'Unknown';
        const userAgent = e.parameter.ua || 'Unknown';

        // --- 1. Handle Download Logging (เก็บประวัติการดาวน์โหลด) ---
        if (action === 'download') {
            const title = e.parameter.title || 'Unknown Book';
            logDownload(title, ip, userAgent);
            return createResponse(true, { message: 'Download logged successfully' });
        }

        // --- 2. Handle Visitor Counter (เก็บจำนวนรวมใน visit_counter) ---
        // ถ้าส่งพารามิเตอร์ inc=1 มาให้เพิ่มจำนวน (นับเฉพาะครั้งแรกที่โหลดหน้าเว็บ)
        const shouldIncrement = e.parameter.inc === '1';
        let visitorCount = 0;

        if (shouldIncrement) {
            visitorCount = incrementVisitorCount();
        } else {
            visitorCount = getVisitorCount();
        }

        // --- 3. Fetch Books Data (ดึงข้อมูลหนังสือ) ---
        // ใช้ Advanced Google Sheets API เพื่อความเร็ว
        const spreadsheetId = SpreadsheetApp.getActiveSpreadsheet().getId();

        // เรียกข้อมูล raw values
        const response = Sheets.Spreadsheets.Values.get(spreadsheetId, `'${SHEET_NAME}'!${DATA_RANGE}`);
        const rows = response.values;

        if (!rows || rows.length === 0) {
            return createResponse(true, [], 'ไม่มีข้อมูลในตาราง', visitorCount);
        }

        // แปลงข้อมูลเป็น array of objects
        const books = rows
            .filter(row => row && row[0]) // กรองแถวที่ไม่มีชื่อหนังสือ
            .map(row => ({
                title: row[0] || '',
                author: row[1] || 'ไม่ระบุผู้แต่ง',
                category: row[2] || 'ทั่วไป',
                coverUrl: row[3] || '',
                description: row[4] || '',
                linkdownload: row[5] || '#'
            }));

        // --- 4. การกรอง (Filter) ---
        let finalData = books;

        // กรองตามหมวดหมู่
        if (e.parameter.category && e.parameter.category !== 'all') {
            finalData = finalData.filter(book => book.category === e.parameter.category);
        }

        // ค้นหา
        if (e.parameter.search) {
            const term = e.parameter.search.toLowerCase();
            finalData = finalData.filter(book =>
                (book.title && book.title.toLowerCase().includes(term)) ||
                (book.author && book.author.toLowerCase().includes(term)) ||
                (book.category && book.category.toLowerCase().includes(term))
            );
        }

        return createResponse(true, finalData, null, visitorCount);

    } catch (error) {
        if (error.toString().includes("is not defined")) {
            return createResponse(false, "Error: กรุณาเปิดใช้งาน 'Google Sheets API' ในเมนู Services ก่อนใช้งาน", error.toString());
        }
        return createResponse(false, error.toString());
    }
}

/**
 * บันทึกประวัติการดาวน์โหลดลง Sheet "download"
 * Columns: Datetime, ebook_title, downloader_ip, User Agent
 */
function logDownload(title, ip, userAgent) {
    const sheet = getSheet(DOWNLOAD_SHEET);
    sheet.appendRow([new Date(), title, ip, userAgent]);
}

/**
 * เพิ่มจำนวนผู้เข้าชมใน Sheet "visit_counter" (เก็บค่าล่าสุดไว้ที่ A2)
 */
function incrementVisitorCount() {
    const sheet = getSheet(VISIT_COUNT_SHEET);
    const range = sheet.getRange("A2");

    let count = range.getValue();
    if (typeof count !== 'number') count = 0;

    count++;
    range.setValue(count);

    // อัปเดตเวลาล่าสุดที่ B2 (Option)
    sheet.getRange("B2").setValue(new Date());

    return count;
}

/**
 * อ่านจำนวนผู้เข้าชมปัจจุบันจาก A2
 */
function getVisitorCount() {
    const sheet = getSheet(VISIT_COUNT_SHEET);
    const count = sheet.getRange("A2").getValue();
    return (typeof count === 'number') ? count : 0;
}

/**
 * Helper: ดึง Sheet ตามชื่อ ถ้าไม่มีให้สร้างใหม่พร้อม Header
 */
function getSheet(name) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
        sheet = ss.insertSheet(name);
        // สร้าง Header อัตโนมัติและเตรียม Row แรก
        if (name === VISIT_COUNT_SHEET) {
            sheet.appendRow(['Total Visitors', 'Last Updated']);
            sheet.appendRow([0, new Date()]); // เริ่มต้นที่ 0
            sheet.setFrozenRows(1);
        } else if (name === DOWNLOAD_SHEET) {
            sheet.appendRow(['Datetime', 'Ebook Title', 'Downloader IP', 'User Agent']);
            sheet.setFrozenRows(1);
        }
    } else {
        // กรณี Sheet มีอยู่แล้ว แต่ยังไม่มี Header หรือ Row ตั้งต้น (เผื่อกันเหนียว)
        if (name === VISIT_COUNT_SHEET && sheet.getLastRow() === 0) {
            sheet.appendRow(['Total Visitors', 'Last Updated']);
            sheet.appendRow([0, new Date()]);
        }
        // กรณี Download sheet มีอยู่แล้ว แต่ column อาจจะไม่ครบ (จะ append ต่อไปเลย)
        if (name === DOWNLOAD_SHEET && sheet.getLastRow() === 0) {
            sheet.appendRow(['Datetime', 'Ebook Title', 'Downloader IP', 'User Agent']);
        }
    }
    return sheet;
}

/**
 * สร้าง HTTP Response
 */
function createResponse(success, data, message = null, visitorCount = null) {
    const result = {
        success: success,
        data: success ? data : [],
        message: message,
        visitorCount: visitorCount
    };

    if (!success) result.error = data;

    return ContentService
        .createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
}
