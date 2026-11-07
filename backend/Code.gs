/**
 * ระบบรับสมัครเรียนออนไลน์ (โควตา) - วิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์
 * Backend Controller for Google Apps Script (GAS)
 * รองรับการเชื่อมต่อกับ Google Sheets, Google Drive, LINE Notify และ PDF Generation
 */

// ชื่อชีตมาตรฐาน 5 ชีต
const SHEETS = {
  APPLICANTS: "Applicants",
  DOCUMENTS: "Documents",
  STATUS_LOG: "StatusLog",
  STAFF: "Staff",
  SETTINGS: "Settings"
};

// ============================================================================
// Web App Entry Points (doGet & doPost)
// ============================================================================

function doGet(e) {
  const action = e.parameter.action;
  
  try {
    let result = {};

    switch (action) {
      case "getSettings":
        result = getSystemSettings();
        break;

      case "checkStatus":
        const citizenId = e.parameter.citizenId;
        result = checkApplicantStatus(citizenId);
        break;

      case "getApplicants":
        result = getAllApplicants();
        break;

      case "getAnalytics":
        result = getSystemAnalytics();
        break;

      case "initDb":
        result = initDatabase();
        break;

      default:
        result = { success: true, message: "ระบบรับสมัครออนไลน์ วิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์ พร้อมใช้งาน" };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    const action = postData.action;
    let result = {};

    switch (action) {
      case "submitApplication":
        result = handleApplicationSubmission(postData.data);
        break;

      case "reuploadDocument":
        result = handleReuploadDocument(postData);
        break;

      case "updateStatus":
        result = handleStatusUpdate(postData);
        break;

      case "enrollStudent":
        result = handleStudentEnrollment(postData);
        break;

      case "saveSettings":
        result = saveSystemSettings(postData.settings);
        break;

      case "staffLogin":
        result = verifyStaffLogin(postData.username, postData.password);
        break;

      default:
        result = { success: false, message: "Unknown action" };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================================
// Database Initialization (Auto-Create 5 Sheets with Sample Data)
// ============================================================================

function initDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Sheet: Applicants
  let appSheet = ss.getSheetByName(SHEETS.APPLICANTS);
  if (!appSheet) {
    appSheet = ss.insertSheet(SHEETS.APPLICANTS);
    appSheet.appendRow([
      "เลขที่ใบสมัคร", "ปีการศึกษา", "ระดับที่สมัคร", "คำนำหน้า", "ชื่อ", "นามสกุล", 
      "เลขบัตรประชาชน", "วันเกิด", "ชื่อบิดา", "อายุบิดา", "อาชีพบิดา", 
      "ชื่อมารดา", "อายุมารดา", "อาชีพมารดา", "บ้านเลขที่", "หมู่", "ซอย", "ถนน", 
      "ตำบล", "อำเภอ", "จังหวัด", "รหัสไปรษณีย์", "เบอร์โทร", "ระดับเดิม", 
      "โรงเรียนเดิม", "เลขที่โรงเรียน", "ตำบลโรงเรียน", "อำเภอโรงเรียน", "จังหวัดโรงเรียน", 
      "GPAX", "สาขาเดิม", "สาขาปวส", "สาขาปวช1", "สาขาปวช2", "สถานะ", 
      "รหัสนักเรียน", "หมายเหตุ", "วันที่ยื่นสมัคร", "อัปเดตล่าสุด"
    ]);
    formatHeaderRow(appSheet);
  }

  // 2. Sheet: Documents
  let docSheet = ss.getSheetByName(SHEETS.DOCUMENTS);
  if (!docSheet) {
    docSheet = ss.insertSheet(SHEETS.DOCUMENTS);
    docSheet.appendRow([
      "เลขที่ใบสมัคร", "เลขบัตรประชาชน", "ประเภทเอกสาร", "ชื่อไฟล์", 
      "Drive File ID", "URL แสดงเอกสาร", "วันที่อัปโหลด"
    ]);
    formatHeaderRow(docSheet);
  }

  // 3. Sheet: StatusLog (Audit Trail)
  let logSheet = ss.getSheetByName(SHEETS.STATUS_LOG);
  if (!logSheet) {
    logSheet = ss.insertSheet(SHEETS.STATUS_LOG);
    logSheet.appendRow(["วันเวลา", "ผู้ดำเนินการ", "เลขที่ใบสมัคร", "การดำเนินการ", "หมายเหตุ"]);
    formatHeaderRow(logSheet);
  }

  // 4. Sheet: Staff
  let staffSheet = ss.getSheetByName(SHEETS.STAFF);
  if (!staffSheet) {
    staffSheet = ss.insertSheet(SHEETS.STAFF);
    staffSheet.appendRow(["Username", "Password", "ชื่อ-สกุล", "ตำแหน่ง", "สิทธิ์การใช้งาน", "สถานะ"]);
    formatHeaderRow(staffSheet);
    staffSheet.appendRow(["admin", "admin1234", "นายผู้ดูแลระบบ ท่าหลวง", "ผู้ดูแลระบบ", "ผู้ดูแลระบบ", "Active"]);
    staffSheet.appendRow(["registrar", "reg1234", "นางสาวสมร ทะเบียนวิชาการ", "เจ้าหน้าที่ทะเบียน", "เจ้าหน้าที่ทะเบียน", "Active"]);
  }

  // 5. Sheet: Settings
  let setSheet = ss.getSheetByName(SHEETS.SETTINGS);
  if (!setSheet) {
    setSheet = ss.insertSheet(SHEETS.SETTINGS);
    setSheet.appendRow(["SettingKey", "SettingValue", "คำอธิบาย"]);
    formatHeaderRow(setSheet);

    const defaultSettings = [
      ["IS_OPEN", "true", "สถานะเปิด-ปิดรับสมัคร (true/false)"],
      ["ACADEMIC_YEAR", "2570", "ปีการศึกษา"],
      ["APPLY_START_DATE", "2026-12-01", "วันเปิดรับสมัคร"],
      ["APPLY_END_DATE", "2027-01-31", "วันปิดรับสมัคร"],
      ["BRANCHES_PWC", JSON.stringify([
        "สาขาวิชาช่างยนต์", "สาขาวิชาช่างกลโรงงาน", "สาขาวิชาช่างเชื่อมโลหะ",
        "สาขาวิชาช่างไฟฟ้ากำลัง", "สาขาวิชาช่างอิเล็กทรอนิกส์", "สาขาวิชาเทคโนโลยีคอมพิวเตอร์",
        "สาขาวิชาการบัญชี", "สาขาวิชาการตลาด"
      ]), "รายชื่อสาขาวิชา ปวช."],
      ["BRANCHES_PWS", JSON.stringify([
        "สาขาวิชาเทคนิคเครื่องกล", "สาขาวิชาเทคนิคการผลิต", "สาขาวิชาไฟฟ้ากำลัง",
        "สาขาวิชาอิเล็กทรอนิกส์", "สาขาวิชาเทคโนโลยีคอมพิวเตอร์", "สาขาวิชาการบัญชี",
        "สาขาวิชาการจัดการโลจิสติกส์และซัพพลายเชน"
      ]), "รายชื่อสาขาวิชา ปวส."],
      ["LINE_NOTIFY_TOKEN", "", "Token สำหรับแจ้งเตือนกลุ่มงานทะเบียน"],
      ["DRIVE_FOLDER_NAME", "ระบบรับสมัคร_วท_ท่าหลวง_2570", "โฟลเดอร์ Google Drive สำหรับเก็บเอกสาร"]
    ];

    defaultSettings.forEach(r => setSheet.appendRow(r));
  }

  return { success: true, message: "สร้างฐานข้อมูลและตารางเรียบร้อยครบทั้ง 5 ชีต" };
}

function formatHeaderRow(sheet) {
  const range = sheet.getRange(1, 1, 1, sheet.getLastColumn());
  range.setBackground("#1e3a5f");
  range.setFontColor("#ffffff");
  range.setFontWeight("bold");
  sheet.setFrozenRows(1);
}

// ============================================================================
// Settings Management
// ============================================================================

function getSystemSettings() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.SETTINGS);
  if (!sheet) return { success: false, message: "Settings sheet not found" };

  const data = sheet.getDataRange().getValues();
  const settingsMap = {};

  for (let i = 1; i < data.length; i++) {
    const key = data[i][0];
    const val = data[i][1];
    settingsMap[key] = val;
  }

  let pwc = [];
  let pws = [];
  try { pwc = JSON.parse(settingsMap["BRANCHES_PWC"] || "[]"); } catch(e) {}
  try { pws = JSON.parse(settingsMap["BRANCHES_PWS"] || "[]"); } catch(e) {}

  return {
    success: true,
    settings: {
      isOpen: settingsMap["IS_OPEN"] === "true",
      academicYear: settingsMap["ACADEMIC_YEAR"] || "2570",
      applyStartDate: settingsMap["APPLY_START_DATE"] || "2026-12-01",
      applyEndDate: settingsMap["APPLY_END_DATE"] || "2027-01-31",
      branchesPWC: pwc,
      branchesPWS: pws,
      lineToken: settingsMap["LINE_NOTIFY_TOKEN"] || ""
    }
  };
}

function saveSystemSettings(newSettings) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.SETTINGS);
  if (!sheet) return { success: false, message: "Settings sheet not found" };

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    const key = data[i][0];
    if (key === "IS_OPEN") sheet.getRange(i + 1, 2).setValue(newSettings.isOpen ? "true" : "false");
    if (key === "APPLY_START_DATE") sheet.getRange(i + 1, 2).setValue(newSettings.applyStartDate);
    if (key === "APPLY_END_DATE") sheet.getRange(i + 1, 2).setValue(newSettings.applyEndDate);
    if (key === "BRANCHES_PWC") sheet.getRange(i + 1, 2).setValue(JSON.stringify(newSettings.branchesPWC));
    if (key === "BRANCHES_PWS") sheet.getRange(i + 1, 2).setValue(JSON.stringify(newSettings.branchesPWS));
    if (key === "LINE_NOTIFY_TOKEN") sheet.getRange(i + 1, 2).setValue(newSettings.lineToken || "");
  }

  return { success: true, message: "บันทึกการตั้งค่าเรียบร้อยแล้ว" };
}

// ============================================================================
// Application Submission & File Upload to Google Drive
// ============================================================================

function handleApplicationSubmission(data) {
  const lock = LockService.getScriptLock();
  lock.tryLock(15000);

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const appSheet = ss.getSheetByName(SHEETS.APPLICANTS);
    const docSheet = ss.getSheetByName(SHEETS.DOCUMENTS);

    // ตรวจสอบการสมัครซ้ำด้วยเลขประจำตัวประชาชน
    const citizenId = data.citizenId;
    const existing = appSheet.getDataRange().getValues();
    for (let i = 1; i < existing.length; i++) {
      if (existing[i][6].toString() === citizenId.toString() && existing[i][1].toString() === data.academicYear) {
        return { success: false, message: "เลขประจำตัวประชาชนนี้ได้ยื่นใบสมัครในปีการศึกษานี้แล้ว ไม่สามารถสมัครซ้ำได้" };
      }
    }

    // สร้างเลขที่ใบสมัคร เช่น Q70-0001
    const nextSeq = existing.length; // แถวใหม่
    const seqPadded = ("0000" + nextSeq).slice(-4);
    const applicationId = "Q70-" + seqPadded;

    // สร้างโฟลเดอร์ใน Google Drive สำหรับเก็บไฟล์ของผู้สมัคร
    const driveFolder = getOrCreateDriveFolder("ระบบรับสมัคร_วท_ท่าหลวง_2570");
    const applicantFolder = driveFolder.createFolder(`${applicationId}_${citizenId}`);

    // บันทึกไฟล์แนบลง Google Drive
    const fileUrls = {};
    if (data.files) {
      if (data.files.photo) {
        fileUrls.photo = saveFileToDrive(applicantFolder, data.files.photo, `${applicationId}_photo`, citizenId, applicationId, docSheet, "รูปถ่าย 1 นิ้ว");
      }
      if (data.files.transcript) {
        fileUrls.transcript = saveFileToDrive(applicantFolder, data.files.transcript, `${applicationId}_transcript`, citizenId, applicationId, docSheet, "ผลการเรียน ปพ.1/รบ.");
      }
      if (data.files.idCard) {
        fileUrls.idCard = saveFileToDrive(applicantFolder, data.files.idCard, `${applicationId}_idCard`, citizenId, applicationId, docSheet, "สำเนาบัตรประชาชน");
      }
      if (data.files.cert) {
        fileUrls.cert = saveFileToDrive(applicantFolder, data.files.cert, `${applicationId}_cert`, citizenId, applicationId, docSheet, "สำเนาเกียรติบัตร");
      }
    }

    const nowTh = Utilities.formatDate(new Date(), "Asia/Bangkok", "dd/MM/yyyy HH:mm:ss");

    // บันทึกลง Sheet Applicants
    appSheet.appendRow([
      applicationId,
      data.academicYear,
      data.applyLevel,
      data.prefix,
      data.firstName,
      data.lastName,
      citizenId,
      data.birthDate,
      data.fatherName,
      data.fatherAge,
      data.fatherJob,
      data.motherName,
      data.motherAge,
      data.motherJob,
      data.address.houseNo,
      data.address.moo,
      data.address.soi,
      data.address.road,
      data.address.subdistrict,
      data.address.district,
      data.address.province,
      data.address.zipcode,
      data.address.phone,
      data.previousEducation.level,
      data.previousEducation.schoolName,
      data.previousEducation.schoolNo,
      data.previousEducation.subdistrict,
      data.previousEducation.district,
      data.previousEducation.province,
      data.previousEducation.gpax,
      data.previousEducation.prevMajor,
      data.branches.majorPws,
      data.branches.majorPwc1,
      data.branches.majorPwc2,
      "รอตรวจสอบ",
      "", // รหัสนักเรียน (ออกเมื่อมอบตัว)
      "ยื่นใบสมัครออนไลน์เรียบร้อย รอเจ้าหน้าที่ตรวจสอบเอกสาร",
      nowTh,
      nowTh
    ]);

    // แจ้งเตือนผ่าน LINE Notify
    try {
      sendStaffAdmissionAlert(data, applicationId);
    } catch(err) {
      Logger.log("Line notify error: " + err);
    }

    return {
      success: true,
      applicationId: applicationId,
      fileUrls: fileUrls,
      message: "ยื่นใบสมัครเรียนเรียบร้อยแล้ว"
    };

  } finally {
    lock.releaseLock();
  }
}

function saveFileToDrive(folder, fileObj, fileNamePrefix, citizenId, applicationId, docSheet, docTypeName) {
  try {
    const rawData = fileObj.data;
    const contentType = fileObj.type || "application/octet-stream";
    const base64Data = rawData.split(",")[1];
    const decodedBytes = Utilities.base64Decode(base64Data);
    
    // ตั้งชื่อไฟล์ทางการ
    const ext = fileObj.name.substring(fileObj.name.lastIndexOf("."));
    const finalName = `${fileNamePrefix}${ext}`;
    
    const blob = Utilities.newBlob(decodedBytes, contentType, finalName);
    const driveFile = folder.createFile(blob);
    driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const viewUrl = driveFile.getUrl();
    const downloadUrl = `https://drive.google.com/uc?export=download&id=${driveFile.getId()}`;
    const nowTh = Utilities.formatDate(new Date(), "Asia/Bangkok", "dd/MM/yyyy HH:mm:ss");

    if (docSheet) {
      docSheet.appendRow([
        applicationId, citizenId, docTypeName, finalName,
        driveFile.getId(), viewUrl, nowTh
      ]);
    }

    return {
      fileId: driveFile.getId(),
      viewUrl: viewUrl,
      downloadUrl: downloadUrl
    };
  } catch (err) {
    Logger.log("Error saving file to drive: " + err);
    return null;
  }
}

function getOrCreateDriveFolder(folderName) {
  const folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return DriveApp.createFolder(folderName);
}

// ============================================================================
// Status Check & Document Re-upload
// ============================================================================

function checkApplicantStatus(citizenId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const appSheet = ss.getSheetByName(SHEETS.APPLICANTS);
  const data = appSheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][6].toString() === citizenId.toString()) {
      return {
        success: true,
        applicant: {
          applicationId: data[i][0],
          academicYear: data[i][1],
          applyLevel: data[i][2],
          prefix: data[i][3],
          firstName: data[i][4],
          lastName: data[i][5],
          citizenId: data[i][6],
          birthDate: data[i][7],
          fatherName: data[i][8],
          fatherAge: data[i][9],
          fatherJob: data[i][10],
          motherName: data[i][11],
          motherAge: data[i][12],
          motherJob: data[i][13],
          address: {
            houseNo: data[i][14], moo: data[i][15], soi: data[i][16], road: data[i][17],
            subdistrict: data[i][18], district: data[i][19], province: data[i][20],
            zipcode: data[i][21], phone: data[i][22]
          },
          previousEducation: {
            level: data[i][23], schoolName: data[i][24], schoolNo: data[i][25],
            subdistrict: data[i][26], district: data[i][27], province: data[i][28],
            gpax: data[i][29], prevMajor: data[i][30]
          },
          branches: {
            majorPws: data[i][31],
            majorPwc1: data[i][32],
            majorPwc2: data[i][33]
          },
          status: data[i][34],
          studentId: data[i][35],
          remarks: data[i][36],
          createdDate: data[i][37]
        }
      };
    }
  }

  return { success: false, message: "ไม่พบข้อมูลผู้สมัครที่ตรงกับเลขบัตรประชาชนนี้" };
}

function handleReuploadDocument(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const appSheet = ss.getSheetByName(SHEETS.APPLICANTS);
  const docSheet = ss.getSheetByName(SHEETS.DOCUMENTS);
  const logSheet = ss.getSheetByName(SHEETS.STATUS_LOG);

  const appId = payload.applicationId;
  const citizenId = payload.citizenId;
  const file = payload.file;

  const driveFolder = getOrCreateDriveFolder("ระบบรับสมัคร_วท_ท่าหลวง_2570");
  const folders = driveFolder.getFoldersByName(`${appId}_${citizenId}`);
  const targetFolder = folders.hasNext() ? folders.next() : driveFolder.createFolder(`${appId}_${citizenId}`);

  saveFileToDrive(targetFolder, file, `${appId}_reupload_${file.docType}`, citizenId, appId, docSheet, `เอกสารแก้ไข: ${file.docType}`);

  // เปลี่ยนสถานะกลับเป็น "รอตรวจสอบ"
  const data = appSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === appId) {
      appSheet.getRange(i + 1, 35).setValue("รอตรวจสอบ");
      appSheet.getRange(i + 1, 37).setValue("ผู้สมัครได้อัปโหลดเอกสารแก้ไขเพิ่มเติมแล้ว");
      appSheet.getRange(i + 1, 39).setValue(Utilities.formatDate(new Date(), "Asia/Bangkok", "dd/MM/yyyy HH:mm:ss"));
      break;
    }
  }

  if (logSheet) {
    logSheet.appendRow([
      Utilities.formatDate(new Date(), "Asia/Bangkok", "dd/MM/yyyy HH:mm:ss"),
      "ผู้สมัคร (Self)",
      appId,
      "อัปโหลดเอกสารแก้ไขเพิ่มเติม",
      `ประเภทเอกสาร: ${file.docType}`
    ]);
  }

  return { success: true, message: "บันทึกเอกสารแก้ไขเรียบร้อยแล้ว" };
}

// ============================================================================
// Staff Operations: Status Updates & Enrollment
// ============================================================================

function handleStatusUpdate(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const appSheet = ss.getSheetByName(SHEETS.APPLICANTS);
  const logSheet = ss.getSheetByName(SHEETS.STATUS_LOG);

  const appId = payload.applicationId;
  const newStatus = payload.status;
  const remarks = payload.remarks || "";
  const studentId = payload.studentId || "";
  const staffUsername = payload.staffUsername || "admin";

  const data = appSheet.getDataRange().getValues();
  let oldStatus = "";

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === appId) {
      oldStatus = data[i][34];
      appSheet.getRange(i + 1, 35).setValue(newStatus);
      if (studentId) appSheet.getRange(i + 1, 36).setValue(studentId);
      appSheet.getRange(i + 1, 37).setValue(remarks);
      appSheet.getRange(i + 1, 39).setValue(Utilities.formatDate(new Date(), "Asia/Bangkok", "dd/MM/yyyy HH:mm:ss"));
      break;
    }
  }

  if (logSheet) {
    logSheet.appendRow([
      Utilities.formatDate(new Date(), "Asia/Bangkok", "dd/MM/yyyy HH:mm:ss"),
      staffUsername,
      appId,
      `เปลี่ยนสถานะจาก [${oldStatus}] เป็น [${newStatus}]`,
      remarks
    ]);
  }

  return { success: true, message: "อัปเดตสถานะสำเร็จ" };
}

function handleStudentEnrollment(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const appSheet = ss.getSheetByName(SHEETS.APPLICANTS);
  const logSheet = ss.getSheetByName(SHEETS.STATUS_LOG);

  const appId = payload.applicationId;
  const studentId = payload.studentId;
  const guardian = payload.guardianName;
  const staffUsername = payload.staffUsername || "admin";

  const data = appSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === appId) {
      appSheet.getRange(i + 1, 35).setValue("มอบตัวแล้ว");
      appSheet.getRange(i + 1, 36).setValue(studentId);
      appSheet.getRange(i + 1, 37).setValue(`มอบตัวเรียบร้อยแล้ว ได้รับรหัสนักเรียน ${studentId} (ผู้ปกครอง: ${guardian})`);
      appSheet.getRange(i + 1, 39).setValue(Utilities.formatDate(new Date(), "Asia/Bangkok", "dd/MM/yyyy HH:mm:ss"));
      break;
    }
  }

  if (logSheet) {
    logSheet.appendRow([
      Utilities.formatDate(new Date(), "Asia/Bangkok", "dd/MM/yyyy HH:mm:ss"),
      staffUsername,
      appId,
      `มอบตัวนักเรียน รหัสนักเรียน: ${studentId}`,
      `ผู้ปกครอง: ${guardian}`
    ]);
  }

  return { success: true, message: "บันทึกการมอบตัวสำเร็จ" };
}

function getAllApplicants() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const appSheet = ss.getSheetByName(SHEETS.APPLICANTS);
  if (!appSheet) return { success: false, message: "Sheet not found" };

  const data = appSheet.getDataRange().getValues();
  const applicants = [];

  for (let i = 1; i < data.length; i++) {
    applicants.push({
      applicationId: data[i][0],
      academicYear: data[i][1],
      applyLevel: data[i][2],
      prefix: data[i][3],
      firstName: data[i][4],
      lastName: data[i][5],
      citizenId: data[i][6],
      birthDate: data[i][7],
      fatherName: data[i][8],
      fatherAge: data[i][9],
      fatherJob: data[i][10],
      motherName: data[i][11],
      motherAge: data[i][12],
      motherJob: data[i][13],
      address: {
        houseNo: data[i][14], moo: data[i][15], soi: data[i][16], road: data[i][17],
        subdistrict: data[i][18], district: data[i][19], province: data[i][20],
        zipcode: data[i][21], phone: data[i][22]
      },
      previousEducation: {
        level: data[i][23], schoolName: data[i][24], schoolNo: data[i][25],
        subdistrict: data[i][26], district: data[i][27], province: data[i][28],
        gpax: data[i][29], prevMajor: data[i][30]
      },
      branches: {
        majorPws: data[i][31],
        majorPwc1: data[i][32],
        majorPwc2: data[i][33]
      },
      status: data[i][34],
      studentId: data[i][35],
      remarks: data[i][36],
      createdDate: data[i][37]
    });
  }

  return { success: true, applicants: applicants };
}

function verifyStaffLogin(username, password) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.STAFF);
  if (!sheet) return { success: false, message: "Staff sheet not found" };

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === username && data[i][1].toString() === password.toString() && data[i][5] === "Active") {
      return {
        success: true,
        staff: {
          username: data[i][0],
          name: data[i][2],
          role: data[i][4]
        }
      };
    }
  }

  return { success: false, message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" };
}
