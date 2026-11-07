/**
 * ระบบส่งข้อความแจ้งเตือนผ่าน LINE Notify / LINE Messaging
 * วิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์
 */

function sendLineNotify(token, message) {
  if (!token) return;

  const url = "https://notify-api.line.me/api/notify";
  const payload = {
    message: message
  };

  const options = {
    method: "post",
    headers: {
      "Authorization": "Bearer " + token
    },
    payload: payload,
    muteHttpExceptions: true
  };

  try {
    const res = UrlFetchApp.fetch(url, options);
    Logger.log("LINE Notify response: " + res.getContentText());
  } catch (err) {
    Logger.log("Error sending LINE Notify: " + err);
  }
}

/**
 * แจ้งเตือนเข้ากลุ่มงานทะเบียนเมื่อมีผู้สมัครรายใหม่
 */
function sendStaffAdmissionAlert(applicant, applicationId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const setSheet = ss.getSheetByName(SHEETS.SETTINGS);
  if (!setSheet) return;

  const data = setSheet.getDataRange().getValues();
  let token = "";
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === "LINE_NOTIFY_TOKEN") {
      token = data[i][1];
      break;
    }
  }

  if (!token) return;

  let majorName = "";
  if (applicant.applyLevel && applicant.applyLevel.startsWith("ปวส.")) {
    majorName = applicant.branches ? applicant.branches.majorPws : "-";
  } else {
    majorName = applicant.branches ? `${applicant.branches.majorPwc1 || "-"} (อันดับ 1)` : "-";
  }

  const msg = 
    "\n🔔 มีผู้สมัครเรียนออนไลน์รายใหม่!\n" +
    "-------------------------\n" +
    "📌 เลขที่ใบสมัคร: " + applicationId + "\n" +
    "👤 ชื่อ-สกุล: " + (applicant.prefix || "") + applicant.firstName + " " + applicant.lastName + "\n" +
    "🎓 ระดับ: " + applicant.applyLevel + "\n" +
    "⚙️ สาขาวิชา: " + majorName + "\n" +
    "🏫 โรงเรียนเดิม: " + (applicant.previousEducation ? applicant.previousEducation.schoolName : "-") + "\n" +
    "📊 เกรดเฉลี่ย (GPAX): " + (applicant.previousEducation ? applicant.previousEducation.gpax : "-") + "\n" +
    "📞 โทรศัพท์: " + (applicant.address ? applicant.address.phone : "-") + "\n" +
    "-------------------------\n" +
    "กรุณาเข้าสู่ระบบงานทะเบียนเพื่อตรวจสอบเอกสารหลักฐาน";

  sendLineNotify(token, msg);
}

/**
 * ส่งแจ้งเตือนเมื่อมีการเปลี่ยนสถานะการสมัคร
 */
function sendStatusChangeAlert(token, applicationId, applicantName, oldStatus, newStatus, remarks) {
  if (!token) return;

  const msg = 
    "\n📢 แจ้งผลการพิจารณาใบสมัคร\n" +
    "-------------------------\n" +
    "📌 เลขที่ใบสมัคร: " + applicationId + "\n" +
    "👤 ผู้สมัคร: " + applicantName + "\n" +
    "🔄 สถานะเดิม: " + oldStatus + "\n" +
    "✅ สถานะใหม่: " + newStatus + "\n" +
    "📝 คำแนะนำ: " + (remarks || "-") + "\n" +
    "-------------------------";

  sendLineNotify(token, msg);
}
