/**
 * ระบบสร้างเอกสาร PDF ใบสมัครทางการ (Official A4 Government PDF Generator)
 * วิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์
 */

function generateApplicationPdf(applicant, targetFolder) {
  try {
    const thaiYear = toThaiNumerals(applicant.academicYear || "2570");
    const thaiAppId = toThaiNumerals(applicant.applicationId || "Q70-0001");
    const fullName = `${applicant.prefix || ""}${applicant.firstName || ""} ${applicant.lastName || ""}`;

    let majorText = "";
    if (applicant.applyLevel && applicant.applyLevel.startsWith("ปวส.")) {
      majorText = applicant.branches ? applicant.branches.majorPws : "-";
    } else {
      majorText = applicant.branches ? `อันดับ ๑: ${applicant.branches.majorPwc1 || "-"} / อันดับ ๒: ${applicant.branches.majorPwc2 || "-"}` : "-";
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
          @page {
            size: A4;
            margin: 15mm;
          }
          body {
            font-family: 'Sarabun', sans-serif;
            font-size: 13pt;
            line-height: 1.4;
            color: #000;
            margin: 0;
            padding: 0;
          }
          .header-table {
            width: 100%;
            margin-bottom: 15px;
          }
          .title-area {
            text-align: center;
            vertical-align: top;
          }
          .photo-box {
            width: 3cm;
            height: 4cm;
            border: 1px solid #000;
            text-align: center;
            vertical-align: middle;
            font-size: 10pt;
            background: #fafafa;
          }
          .gov-title-main {
            font-size: 16pt;
            font-weight: bold;
          }
          .gov-title-sub {
            font-size: 14pt;
            font-weight: bold;
          }
          .app-id-tag {
            display: inline-block;
            border: 1px solid #000;
            padding: 2px 10px;
            font-size: 12pt;
            font-weight: bold;
            margin-top: 6px;
          }
          .section-title {
            font-size: 12pt;
            font-weight: bold;
            margin-top: 10px;
            margin-bottom: 4px;
            border-bottom: 1px solid #444;
            padding-bottom: 2px;
          }
          .row {
            margin-bottom: 4px;
            font-size: 11pt;
          }
          .label {
            font-weight: bold;
          }
          .val {
            border-bottom: 1px dotted #555;
            padding-left: 4px;
          }
          table.check-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            font-size: 10pt;
          }
          table.check-table th, table.check-table td {
            border: 1px solid #000;
            padding: 4px 6px;
          }
          .sig-table {
            width: 100%;
            margin-top: 25px;
            font-size: 11pt;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <table class="header-table">
          <tr>
            <td class="title-area">
              <div class="gov-title-main">วิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์</div>
              <div class="gov-title-sub">ใบสมัครเข้าศึกษาต่อ ประเภทโควตาพิเศษ ประจำปีการศึกษา ${thaiYear}</div>
              <div style="font-size: 11pt; margin-top: 4px;">สังกัดสำนักงานคณะกรรมการการอาชีวศึกษา กระทรวงศึกษาธิการ</div>
              <div class="app-id-tag">เลขที่ใบสมัคร: ${thaiAppId}</div>
            </td>
            <td style="width: 3.2cm;" align="right">
              <div class="photo-box">
                ติดรูปถ่าย<br>ขนาด ๑ นิ้ว
              </div>
            </td>
          </tr>
        </table>

        <div class="section-title">ระดับการศึกษาและสาขาวิชาที่สมัคร</div>
        <div class="row">
          <span class="label">ระดับที่สมัคร:</span> <span class="val">${applicant.applyLevel || "-"}</span>
          <span class="label" style="margin-left: 20px;">สาขาวิชาที่เลือก:</span> <span class="val">${majorText}</span>
        </div>

        <div class="section-title">ข้อ ๑. ข้อมูลผู้สมัคร</div>
        <div class="row">
          <span class="label">ชื่อ - นามสกุล:</span> <span class="val">${fullName}</span>
          <span class="label" style="margin-left: 15px;">เลขประจำตัวประชาชน:</span> <span class="val">${applicant.citizenId || "-"}</span>
        </div>
        <div class="row">
          <span class="label">วัน/เดือน/ปีเกิด:</span> <span class="val">${applicant.birthDate || "-"}</span>
          <span class="label" style="margin-left: 15px;">โทรศัพท์:</span> <span class="val">${applicant.address ? applicant.address.phone : "-"}</span>
        </div>

        <div class="section-title">ข้อ ๒ - ๓. ข้อมูลบิดา - มารดา</div>
        <div class="row">
          <span class="label">ชื่อบิดา:</span> <span class="val">${applicant.fatherName || "-"} (อายุ ${applicant.fatherAge || "-"} ปี)</span>
          <span class="label" style="margin-left: 15px;">อาชีพ:</span> <span class="val">${applicant.fatherJob || "-"}</span>
        </div>
        <div class="row">
          <span class="label">ชื่อมารดา:</span> <span class="val">${applicant.motherName || "-"} (อายุ ${applicant.motherAge || "-"} ปี)</span>
          <span class="label" style="margin-left: 15px;">อาชีพ:</span> <span class="val">${applicant.motherJob || "-"}</span>
        </div>

        <div class="section-title">ข้อ ๔. ที่อยู่ปัจจุบันที่ติดต่อได้</div>
        <div class="row">
          บ้านเลขที่ ${applicant.address ? applicant.address.houseNo : "-"} หมู่ที่ ${applicant.address ? applicant.address.moo || "-" : "-"} 
          ซอย ${applicant.address ? applicant.address.soi || "-" : "-"} ถนน ${applicant.address ? applicant.address.road || "-" : "-"} 
          ตำบล/แขวง ${applicant.address ? applicant.address.subdistrict : "-"} อำเภอ/เขต ${applicant.address ? applicant.address.district : "-"} 
          จังหวัด ${applicant.address ? applicant.address.province : "-"} รหัสไปรษณีย์ ${applicant.address ? applicant.address.zipcode : "-"}
        </div>

        <div class="section-title">ข้อ ๕. ข้อมูลสถานศึกษาเดิม</div>
        <div class="row">
          <span class="label">สถานศึกษาเดิม:</span> <span class="val">${applicant.previousEducation ? applicant.previousEducation.schoolName : "-"} (${applicant.previousEducation ? applicant.previousEducation.level : "-"})</span>
          <span class="label" style="margin-left: 15px;">จังหวัด:</span> <span class="val">${applicant.previousEducation ? applicant.previousEducation.province : "-"}</span>
          <span class="label" style="margin-left: 15px;">GPAX ๕ ภาคเรียน:</span> <span class="val"><strong>${applicant.previousEducation ? applicant.previousEducation.gpax : "-"}</strong></span>
        </div>

        <div class="section-title">รายการตรวจสอบเอกสารหลักฐาน (สำหรับเจ้าหน้าที่ทะเบียน)</div>
        <table class="check-table">
          <thead>
            <tr style="background-color: #f1f5f9;">
              <th style="width: 10%;">ผล</th>
              <th style="width: 50%;">รายการเอกสารหลักฐาน</th>
              <th style="width: 40%;">หมายเหตุ</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td align="center">[ / ]</td>
              <td>๑. รูปถ่ายหน้าตรงขนาด ๑ นิ้ว</td>
              <td>แนบในระบบเรียบร้อย</td>
            </tr>
            <tr>
              <td align="center">[ / ]</td>
              <td>๒. เอกสารแสดงผลการเรียนเฉลี่ยสะสม ๕ ภาคเรียน (ปพ.๑ / รบ.)</td>
              <td>เกรดเฉลี่ยสะสม: ${applicant.previousEducation ? applicant.previousEducation.gpax : "-"}</td>
            </tr>
            <tr>
              <td align="center">[ / ]</td>
              <td>๓. สำเนาบัตรประจำตัวประชาชน / สำเนาทะเบียนบ้าน</td>
              <td>ตรวจสอบแล้ว</td>
            </tr>
            <tr>
              <td align="center">[ ${applicant.files && applicant.files.cert ? '/' : ' '} ]</td>
              <td>๔. สำเนาเกียรติบัตร / ใบรับรองความสามารถพิเศษ</td>
              <td>${applicant.files && applicant.files.cert ? 'มีเอกสารแนบ' : 'ไม่มี'}</td>
            </tr>
          </tbody>
        </table>

        <table class="sig-table">
          <tr>
            <td style="width: 50%;">
              ลงชื่อ..........................................................ผู้สมัคร<br>
              (${fullName})<br>
              วันที่ยื่นสมัคร: ${applicant.createdDate || "...../...../....."}
            </td>
            <td style="width: 50%;">
              ลงชื่อ..........................................................เจ้าหน้าที่รับสมัคร<br>
              (..........................................................)<br>
              วันที่ตรวจสอบ: ...../...../.....
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const htmlOutput = HtmlService.createHtmlOutput(htmlContent);
    const pdfBlob = htmlOutput.getAs('application/pdf').setName(`ใบสมัคร_${applicant.applicationId}_${applicant.citizenId}.pdf`);

    const folder = targetFolder || DriveApp.getRootFolder();
    const file = folder.createFile(pdfBlob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return {
      success: true,
      fileId: file.getId(),
      url: file.getUrl()
    };
  } catch (err) {
    Logger.log("Error generating PDF: " + err);
    return { success: false, error: err.toString() };
  }
}

function toThaiNumerals(str) {
  if (str === undefined || str === null) return "";
  const thaiDigits = ["๐", "๑", "๒", "๓", "๔", "๕", "๖", "๗", "๘", "๙"];
  return str.toString().replace(/[0-9]/g, match => thaiDigits[parseInt(match, 10)]);
}
