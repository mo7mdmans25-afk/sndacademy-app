/**
 * Google Apps Script & Google Sheets Integration Service
 * أكاديمية السند المتصل لخدمة القرآن الكريم
 */

import { db } from './database';
import {
  Student,
  Teacher,
  SessionRecord,
  RegistrationRequest,
  PaymentRecord,
  ExpenseRecord
} from '../types';

export interface SyncPayload {
  students: Student[];
  teachers: Teacher[];
  records: SessionRecord[];
  registrations: RegistrationRequest[];
  payments: PaymentRecord[];
  expenses: ExpenseRecord[];
}

export interface SyncResult {
  success: boolean;
  message: string;
  timestamp: string;
  details?: any;
}

/**
 * The Google Apps Script (Code.gs) template that the user pastes into their Google Sheet
 */
export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * ============================================================================
 * أكاديمية السند المتصل لخدمة القرآن الكريم - محرك الربط مع المنصة
 * Sanad Academy Platform - Google Apps Script Webhook Engine
 * ============================================================================
 */

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "active",
    name: "أكاديمية السند المتصل لخدمة القرآن الكريم",
    service: "Sanad Platform Google Sheets Webhook",
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (err) {
    return createJsonResponse(false, "تعذر الحصول على قفل التعديل المتزامن: " + err.toString());
  }

  try {
    var rawData = e.postData.contents;
    var payload = JSON.parse(rawData);
    var action = payload.action || "PING";
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === "PING") {
      return createJsonResponse(true, "تم الاتصال بنجاح مع جدول بيانات جوجل شيت لأكاديمية السند المتصل!");
    }

    // ------------------------------------------------------------------
    // التخزين الدائم (Snapshot) — يحل محل قاعدة البيانات الخارجية
    // ------------------------------------------------------------------
    if (action === "LOAD_SNAPSHOT") {
      return createSnapshotResponse(loadSnapshot(ss));
    }

    if (action === "SAVE_SNAPSHOT") {
      var entities = payload.entities || {};
      saveSnapshotEntities(ss, entities);
      return createJsonResponse(true, "تم حفظ البيانات في مخزن الأكاديمية الدائم.");
    }

    if (action === "SYNC_ALL") {
      var data = payload.data || {};
      syncStudentsSheet(ss, data.students || []);
      syncTeachersSheet(ss, data.teachers || []);
      syncSessionsSheet(ss, data.records || []);
      syncRegistrationsSheet(ss, data.registrations || []);
      syncPaymentsSheet(ss, data.payments || []);
      syncExpensesSheet(ss, data.expenses || []);

      return createJsonResponse(true, "تمت مزامنة كافة بيانات الأكاديمية بنجاح في الجداول الستة.");
    }

    if (action === "SYNC_SESSION") {
      appendSessionRow(ss, payload.record);
      return createJsonResponse(true, "تم تسجيل الحصة في شيت الحصص اليومية.");
    }

    if (action === "SYNC_REGISTRATION") {
      appendRegistrationRow(ss, payload.registration);
      return createJsonResponse(true, "تمت إضافة طلب التسجيل في شيت التسجيلات.");
    }

    if (action === "SYNC_PAYMENT") {
      appendPaymentRow(ss, payload.payment);
      return createJsonResponse(true, "تم تدوين إيصال السداد في شيت المالية.");
    }

    if (action === "SYNC_EXPENSE") {
      appendExpenseRow(ss, payload.expense);
      return createJsonResponse(true, "تم تدوين سند الصرف في شيت المصروفات.");
    }

    return createJsonResponse(false, "إجراء غير معروف: " + action);

  } catch (error) {
    return createJsonResponse(false, "خطأ أثناء معالجة الطلب: " + error.toString());
  } finally {
    lock.releaseLock();
  }
}

function createJsonResponse(success, message) {
  var output = {
    success: success,
    message: message,
    timestamp: new Date().toISOString()
  };
  return ContentService.createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON);
}

function createSnapshotResponse(snapshot) {
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: "تم تحميل بيانات الأكاديمية.",
    snapshot: snapshot,
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * ورقة التخزين الدائم: كل صف = كيان واحد (students, records, settings ...)
 * العمود الأول اسم الكيان، والثاني محتواه بصيغة JSON.
 * خلية جوجل شيت تتسع لـ 50,000 حرف، لذلك نقسّم الكيانات الكبيرة على عدة أجزاء.
 */
var SNAPSHOT_SHEET_NAME = "_DB_SNAPSHOT";
var SNAPSHOT_CHUNK_SIZE = 45000;

function getSnapshotSheet(ss) {
  var sheet = ss.getSheetByName(SNAPSHOT_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SNAPSHOT_SHEET_NAME);
    sheet.appendRow(["entityKey", "chunkIndex", "payload"]);
    sheet.getRange(1, 1, 1, 3).setFontWeight("bold").setBackground("#0B3B2E").setFontColor("#FFFFFF");
    sheet.setFrozenRows(1);
    sheet.hideSheet();
  }
  return sheet;
}

function loadSnapshot(ss) {
  var sheet = getSnapshotSheet(ss);
  var lastRow = sheet.getLastRow();
  var snapshot = {};
  if (lastRow < 2) return snapshot;

  var values = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
  var buckets = {};

  for (var i = 0; i < values.length; i++) {
    var key = String(values[i][0] || "").trim();
    if (!key) continue;
    var index = Number(values[i][1]) || 0;
    if (!buckets[key]) buckets[key] = [];
    buckets[key][index] = String(values[i][2] || "");
  }

  for (var entityKey in buckets) {
    var raw = buckets[entityKey].join("");
    if (!raw) continue;
    try {
      snapshot[entityKey] = JSON.parse(raw);
    } catch (err) {
      // نتجاهل الكيان التالف بدل إسقاط التحميل بالكامل
    }
  }
  return snapshot;
}

function saveSnapshotEntities(ss, entities) {
  var sheet = getSnapshotSheet(ss);
  var lastRow = sheet.getLastRow();
  var existing = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, 3).getValues() : [];

  // نحتفظ بالكيانات التي لم تُرسل في هذا الطلب كما هي
  var kept = [];
  for (var i = 0; i < existing.length; i++) {
    var key = String(existing[i][0] || "").trim();
    if (key && !entities.hasOwnProperty(key)) {
      kept.push(existing[i]);
    }
  }

  var rows = kept;
  for (var entityKey in entities) {
    var json = JSON.stringify(entities[entityKey]);
    var chunkIndex = 0;
    for (var pos = 0; pos < json.length; pos += SNAPSHOT_CHUNK_SIZE) {
      rows.push([entityKey, chunkIndex, json.substring(pos, pos + SNAPSHOT_CHUNK_SIZE)]);
      chunkIndex++;
    }
    if (json.length === 0) rows.push([entityKey, 0, ""]);
  }

  if (lastRow > 1) sheet.getRange(2, 1, lastRow - 1, 3).clearContent();
  if (rows.length > 0) sheet.getRange(2, 1, rows.length, 3).setValues(rows);
}

function getOrCreateSheet(ss, sheetName, headers) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  sheet.setRightToLeft(true);
  
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    styleHeaderRow(sheet, headers.length);
  }
  return sheet;
}

function styleHeaderRow(sheet, cols) {
  var headerRange = sheet.getRange(1, 1, 1, cols);
  headerRange.setBackground("#0B3B2E");
  headerRange.setFontColor("#FFFFFF");
  headerRange.setFontWeight("bold");
  headerRange.setFontSize(11);
  headerRange.setHorizontalAlignment("center");
  sheet.setFrozenRows(1);
}

function syncStudentsSheet(ss, students) {
  var headers = ["كود الطالب", "اسم الطالب", "العمر", "المرحلة العمرية", "كود المعلمة", "نوع الحلقة", "المستوى", "السورة الحالية", "الجزء", "إتقان السابق", "سرعة الحفظ", "الهاتف", "الدولة", "تاريخ الانضمام", "الحالة"];
  var sheet = getOrCreateSheet(ss, "الطلاب", headers);
  sheet.clearContents();
  sheet.appendRow(headers);
  styleHeaderRow(sheet, headers.length);

  if (students.length > 0) {
    var rows = students.map(function(s) {
      return [
        s.id, s.name, s.age, s.ageGroup, s.teacherId, s.circleType,
        s.level, s.currentSurah, s.currentJuz, s.oldMastery,
        s.memorizationSpeed, s.phone, s.country, s.joinDate, s.status
      ];
    });
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
}

function syncTeachersSheet(ss, teachers) {
  var headers = ["كود المعلمة", "اسم المعلمة", "الهاتف", "السعة القصوى", "نمط التدريس", "الفئات العمرية", "الحالة", "تاريخ الانضمام"];
  var sheet = getOrCreateSheet(ss, "المعلمات", headers);
  sheet.clearContents();
  sheet.appendRow(headers);
  styleHeaderRow(sheet, headers.length);

  if (teachers.length > 0) {
    var rows = teachers.map(function(t) {
      return [
        t.id, t.name, t.phone, t.capacity, t.teachingMode,
        (t.ageGroups || []).join("، "), t.status, t.joinDate
      ];
    });
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
}

function syncSessionsSheet(ss, records) {
  var headers = ["رقم الجلسة", "التاريخ", "كود الطالب", "كود المعلمة", "حالة الحضور", "السورة", "الجزء", "مقدار الحفظ", "درجة الحفظ", "مراجعة قريب", "مراجعة بعيد", "الواجب", "القيمة التربوية", "درجة اليوم", "ملاحظات"];
  var sheet = getOrCreateSheet(ss, "الحصص_اليومية", headers);
  sheet.clearContents();
  sheet.appendRow(headers);
  styleHeaderRow(sheet, headers.length);

  if (records.length > 0) {
    var rows = records.map(function(r) {
      return [
        r.id, r.date, r.studentId, r.teacherId, r.attendance,
        r.surah, r.juz, r.amount, r.hifzGrade, r.reviewNear,
        r.reviewFar, r.hifzHomework, r.value, r.dayScore, r.notes || ""
      ];
    });
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
}

function syncRegistrationsSheet(ss, registrations) {
  var headers = ["رقم الطلب", "نوع التسجيل", "الاسم", "الهاتف", "البريد", "العمر", "الدولة", "المستوى", "السورة", "باقة الرسوم", "كود المسوق", "المصدر", "الحالة"];
  var sheet = getOrCreateSheet(ss, "طلبات_التسجيل", headers);
  sheet.clearContents();
  sheet.appendRow(headers);
  styleHeaderRow(sheet, headers.length);

  if (registrations.length > 0) {
    var rows = registrations.map(function(reg) {
      return [
        reg.id, reg.type === "student" ? "طالب" : "معلمة", reg.name, reg.phone,
        reg.email || "", reg.age || "", reg.country, reg.level || "",
        reg.surah || "", reg.feePlan || "", reg.affiliateCode || "",
        reg.source || "", reg.status
      ];
    });
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
}

function syncPaymentsSheet(ss, payments) {
  var headers = ["رقم الإيصال", "كود الطالب", "رقم المطالبة", "المبلغ", "تاريخ السداد", "وسيلة الدفع", "المسجل"];
  var sheet = getOrCreateSheet(ss, "المالية_والسداد", headers);
  sheet.clearContents();
  sheet.appendRow(headers);
  styleHeaderRow(sheet, headers.length);

  if (payments.length > 0) {
    var rows = payments.map(function(p) {
      return [p.id, p.studentId, p.feeId, p.amount, p.date, p.method, p.recordedBy];
    });
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
}

function syncExpensesSheet(ss, expenses) {
  var headers = ["رقم السند", "التاريخ", "البند", "المستفيد", "الوصف", "المبلغ", "طريقة الدفع", "المعتمد"];
  var sheet = getOrCreateSheet(ss, "المصروفات", headers);
  sheet.clearContents();
  sheet.appendRow(headers);
  styleHeaderRow(sheet, headers.length);

  if (expenses.length > 0) {
    var rows = expenses.map(function(e) {
      return [e.id, e.date, e.category, e.beneficiary || e.recipient || "", e.description, e.amount, e.paymentMethod || "", e.approvedBy || ""];
    });
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
}

function appendSessionRow(ss, r) {
  if (!r) return;
  var headers = ["رقم الجلسة", "التاريخ", "كود الطالب", "كود المعلمة", "حالة الحضور", "السورة", "الجزء", "مقدار الحفظ", "درجة الحفظ", "مراجعة قريب", "مراجعة بعيد", "الواجب", "القيمة التربوية", "درجة اليوم", "ملاحظات"];
  var sheet = getOrCreateSheet(ss, "الحصص_اليومية", headers);
  sheet.appendRow([
    r.id, r.date, r.studentId, r.teacherId, r.attendance,
    r.surah, r.juz, r.amount, r.hifzGrade, r.reviewNear,
    r.reviewFar, r.hifzHomework, r.value, r.dayScore, r.notes || ""
  ]);
}

function appendRegistrationRow(ss, reg) {
  if (!reg) return;
  var headers = ["رقم الطلب", "نوع التسجيل", "الاسم", "الهاتف", "البريد", "العمر", "الدولة", "المستوى", "السورة", "باقة الرسوم", "كود المسوق", "المصدر", "الحالة"];
  var sheet = getOrCreateSheet(ss, "طلبات_التسجيل", headers);
  sheet.appendRow([
    reg.id, reg.type === "student" ? "طالب" : "معلمة", reg.name, reg.phone,
    reg.email || "", reg.age || "", reg.country, reg.level || "",
    reg.surah || "", reg.feePlan || "", reg.affiliateCode || "",
    reg.source || "", reg.status
  ]);
}

function appendPaymentRow(ss, p) {
  if (!p) return;
  var headers = ["رقم الإيصال", "كود الطالب", "رقم المطالبة", "المبلغ", "تاريخ السداد", "وسيلة الدفع", "المسجل"];
  var sheet = getOrCreateSheet(ss, "المالية_والسداد", headers);
  sheet.appendRow([p.id, p.studentId, p.feeId, p.amount, p.date, p.method, p.recordedBy]);
}

function appendExpenseRow(ss, e) {
  if (!e) return;
  var headers = ["رقم السند", "التاريخ", "البند", "المستفيد", "الوصف", "المبلغ", "طريقة الدفع", "المعتمد"];
  var sheet = getOrCreateSheet(ss, "المصروفات", headers);
  sheet.appendRow([e.id, e.date, e.category, e.beneficiary || e.recipient || "", e.description, e.amount, e.paymentMethod || "", e.approvedBy || ""]);
}
`;

/**
 * Dispatch an action to Google Apps Script Webhook
 * Using text/plain Content-Type to prevent CORS preflight blocking in browsers.
 */
async function sendToGoogleAppsScript(webhookUrl: string, payload: any): Promise<SyncResult> {
  if (!webhookUrl || !webhookUrl.startsWith('http')) {
    return {
      success: false,
      message: 'الرابط غير صالح؛ يرجى إدخال رابط نشر تطبيق الويب (Google Apps Script Web App URL)',
      timestamp: new Date().toISOString()
    };
  }

  const cleanUrl = webhookUrl.trim();

  try {
    // We send payload as a plain text string to avoid CORS preflight (OPTIONS request).
    // Apps Script doPost receives the body in e.postData.contents.
    const response = await fetch(cleanUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload),
      // follow redirects which Google Apps Script uses
      redirect: 'follow'
    });

    if (response.ok) {
      try {
        const data = await response.json();
        return {
          success: data.success !== false,
          message: data.message || 'تمت العملية بنجاح في جوجل شيت',
          timestamp: new Date().toISOString(),
          details: data
        };
      } catch (err) {
        // Some Google Apps Script deployments return HTML on redirect, but data was written
        return {
          success: true,
          message: 'تم إرسال البيانات إلى جوجل شيت بنجاح (رمز الحالة: ' + response.status + ')',
          timestamp: new Date().toISOString()
        };
      }
    } else {
      return {
        success: false,
        message: `تعذر الاتصال بجوجل شيت: خطأ من الخادم (${response.status})`,
        timestamp: new Date().toISOString()
      };
    }
  } catch (error: any) {
    // If standard fetch failed due to CORS opaque redirect, fallback check
    console.warn('Direct fetch to Apps Script had error/CORS warning:', error);
    return {
      success: false,
      message: 'تعذر الاتصال المباشر. تأكد من ضبط إذن النشر في Google Apps Script على: "Anyone" (أي شخص لديه الرابط).',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Test the Google Apps Script Webhook connection with a PING action
 */
export async function testGoogleSheetsConnection(webhookUrl: string): Promise<SyncResult> {
  return sendToGoogleAppsScript(webhookUrl, {
    action: 'PING',
    timestamp: new Date().toISOString()
  });
}

/**
 * Sync entire platform database in bulk to Google Sheets
 */
export async function syncAllToGoogleSheets(webhookUrl: string): Promise<SyncResult> {
  const payload = {
    action: 'SYNC_ALL',
    data: {
      students: db.getStudents(),
      teachers: db.getTeachers(),
      records: db.getRecords(),
      registrations: db.getRegistrations(),
      payments: db.getPayments(),
      expenses: db.getExpenses()
    }
  };

  const result = await sendToGoogleAppsScript(webhookUrl, payload);
  if (result.success) {
    db.updateSettings({
      GOOGLE_SHEET_LAST_SYNC: new Date().toISOString()
    });
  }
  return result;
}

/**
 * Auto-sync helpers for single items (called asynchronously if auto-sync is enabled)
 */
export async function syncSingleSession(record: SessionRecord): Promise<void> {
  const settings = db.getSettings();
  if (settings.GOOGLE_SHEET_AUTO_SYNC === 'ON' && settings.GOOGLE_SHEET_WEBHOOK_URL) {
    try {
      await sendToGoogleAppsScript(settings.GOOGLE_SHEET_WEBHOOK_URL, {
        action: 'SYNC_SESSION',
        record
      });
    } catch (e) {
      console.warn('Google Sheets auto-sync session error:', e);
    }
  }
}

export async function syncSingleRegistration(registration: RegistrationRequest): Promise<void> {
  const settings = db.getSettings();
  if (settings.GOOGLE_SHEET_AUTO_SYNC === 'ON' && settings.GOOGLE_SHEET_WEBHOOK_URL) {
    try {
      await sendToGoogleAppsScript(settings.GOOGLE_SHEET_WEBHOOK_URL, {
        action: 'SYNC_REGISTRATION',
        registration
      });
    } catch (e) {
      console.warn('Google Sheets auto-sync registration error:', e);
    }
  }
}

export async function syncSinglePayment(payment: PaymentRecord): Promise<void> {
  const settings = db.getSettings();
  if (settings.GOOGLE_SHEET_AUTO_SYNC === 'ON' && settings.GOOGLE_SHEET_WEBHOOK_URL) {
    try {
      await sendToGoogleAppsScript(settings.GOOGLE_SHEET_WEBHOOK_URL, {
        action: 'SYNC_PAYMENT',
        payment
      });
    } catch (e) {
      console.warn('Google Sheets auto-sync payment error:', e);
    }
  }
}

export async function syncSingleExpense(expense: ExpenseRecord): Promise<void> {
  const settings = db.getSettings();
  if (settings.GOOGLE_SHEET_AUTO_SYNC === 'ON' && settings.GOOGLE_SHEET_WEBHOOK_URL) {
    try {
      await sendToGoogleAppsScript(settings.GOOGLE_SHEET_WEBHOOK_URL, {
        action: 'SYNC_EXPENSE',
        expense
      });
    } catch (e) {
      console.warn('Google Sheets auto-sync expense error:', e);
    }
  }
}

/**
 * Direct Instant CSV Export with Arabic UTF-8 BOM
 * Allows the admin to download any dataset as an Excel / Google Sheets compatible CSV
 */
export function exportTableToCSV(filename: string, headers: string[], rows: (string | number | undefined | null)[][]): void {
  // \uFEFF ensures Excel and Google Sheets correctly recognize Arabic UTF-8 characters
  const bom = '\uFEFF';
  const csvContent = [
    headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(','),
    ...rows.map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
  ].join('\r\n');

  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
