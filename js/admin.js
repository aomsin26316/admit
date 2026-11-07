/**
 * ระบบบริหารจัดการงานรับสมัครเรียน (Admin Portal) - วิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์
 * Back-end Integration, Authentication, Registry, Department Analytics & Individual PDF Export
 */

const ADMIN_CONFIG = {
  GAS_API_URL: "https://script.google.com/macros/s/AKfycbwLsG_kot3GcOny0zU_SwVrLpmyNHf5kSpN7MQQVk1GLA9VD3yb_zYRJLJfF1b75PM7/exec",
  STORAGE_KEY_APPLICANTS: "TCAT_APPLICANTS_DB_2570",
  STORAGE_KEY_SETTINGS: "TCAT_SETTINGS_2570",
  STORAGE_KEY_AUDIT: "TCAT_AUDIT_LOGS_2570",
  STORAGE_KEY_STAFF_SESSION: "TCAT_STAFF_SESSION"
};

const DEFAULT_STAFF = [
  { username: "admin", password: "admin1234", name: "นายผู้ดูแลระบบ ท่าหลวง", role: "ผู้ดูแลระบบ" },
  { username: "registrar", password: "reg1234", name: "นางสาวสมร ทะเบียนวิชาการ", role: "เจ้าหน้าที่ทะเบียน" }
];

let currentStaff = null;
let allApplicants = [];
let chartInstances = {};

// แผนกวิชาหลักของวิทยาลัย และการจับคู่สาขาวิชา
const DEPARTMENTS = {
  INDUSTRY: {
    name: "แผนกวิชาช่างอุตสาหกรรม",
    color: "#1e3a5f",
    quota: 180,
    keywords: ["ช่างยนต์", "เครื่องกล", "ช่างกล", "การผลิต", "เชื่อม", "ไฟฟ้า", "อิเล็กทรอนิกส์"]
  },
  IT: {
    name: "แผนกเทคโนโลยีคอมพิวเตอร์",
    color: "#4f46e5",
    quota: 80,
    keywords: ["คอมพิวเตอร์", "ไอที", "ซอฟต์แวร์"]
  },
  COMMERCE: {
    name: "แผนกพาณิชยกรรมและบริหารธุรกิจ",
    color: "#059669",
    quota: 100,
    keywords: ["บัญชี", "การตลาด", "โลจิสติกส์"]
  }
};

// ============================================================================
// Initialization & Authentication
// ============================================================================
document.addEventListener("DOMContentLoaded", function() {
  checkExistingSession();
  setupAdminNav();
});

function checkExistingSession() {
  const sessionData = sessionStorage.getItem(ADMIN_CONFIG.STORAGE_KEY_STAFF_SESSION);
  if (sessionData) {
    try {
      currentStaff = JSON.parse(sessionData);
      showAdminInterface();
    } catch (e) {
      sessionStorage.removeItem(ADMIN_CONFIG.STORAGE_KEY_STAFF_SESSION);
      showLoginScreen();
    }
  } else {
    showLoginScreen();
  }
}

function showLoginScreen() {
  document.getElementById("loginScreen").style.display = "block";
  document.getElementById("adminInterface").style.display = "none";
  document.getElementById("staffUserHeader").style.display = "none";
  document.getElementById("staffStatusBadge").textContent = "สถานะ: ยังไม่ได้เข้าสู่ระบบ";
}

function showAdminInterface() {
  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("adminInterface").style.display = "block";
  document.getElementById("staffUserHeader").style.display = "block";
  
  document.getElementById("currentStaffName").textContent = currentStaff.name;
  document.getElementById("currentStaffRole").textContent = `ตำแหน่ง: ${currentStaff.role}`;
  document.getElementById("staffStatusBadge").textContent = `เข้าสู่ระบบในชื่อ: ${currentStaff.name} (${currentStaff.role})`;

  const settingsNav = document.getElementById("adminSettingsNavItem");
  if (currentStaff.role !== "ผู้ดูแลระบบ") {
    if (settingsNav) settingsNav.style.display = "none";
  } else {
    if (settingsNav) settingsNav.style.display = "inline-block";
  }

  loadAllData();
}

function handleStaffLogin(e) {
  e.preventDefault();
  const u = document.getElementById("staffUsername").value.trim();
  const p = document.getElementById("staffPassword").value;

  const staff = DEFAULT_STAFF.find(s => s.username === u && s.password === p);
  if (staff) {
    currentStaff = { username: staff.username, name: staff.name, role: staff.role };
    sessionStorage.setItem(ADMIN_CONFIG.STORAGE_KEY_STAFF_SESSION, JSON.stringify(currentStaff));
    showAdminInterface();
  } else {
    alert("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง");
  }
}

function handleStaffLogout() {
  if (confirm("คุณต้องการออกจากระบบบริหารจัดการใช่หรือไม่?")) {
    sessionStorage.removeItem(ADMIN_CONFIG.STORAGE_KEY_STAFF_SESSION);
    currentStaff = null;
    showLoginScreen();
  }
}

function setupAdminNav() {
  const links = document.querySelectorAll("#adminNav .nav-link[data-tab]");
  links.forEach(l => {
    l.addEventListener("click", function(e) {
      e.preventDefault();
      const tabId = this.getAttribute("data-tab");
      switchAdminTab(tabId);
    });
  });
}

function switchAdminTab(tabId) {
  document.querySelectorAll("#adminInterface .tab-pane").forEach(p => p.style.display = "none");
  const target = document.getElementById(tabId);
  if (target) target.style.display = "block";

  document.querySelectorAll("#adminNav .nav-link").forEach(l => {
    l.classList.remove("active");
    if (l.getAttribute("data-tab") === tabId) l.classList.add("active");
  });

  if (tabId === "tab-admin-dashboard") {
    renderDashboardCharts();
  } else if (tabId === "tab-admin-audit") {
    renderAuditLogs();
  } else if (tabId === "tab-admin-enrollment") {
    renderEnrollmentTable();
  }
}

// ============================================================================
// Data Loading & Sample Seeding
// ============================================================================

async function loadAllData() {
  let list = [];

  if (ADMIN_CONFIG.GAS_API_URL) {
    try {
      const res = await fetch(`${ADMIN_CONFIG.GAS_API_URL}?action=getApplicants`);
      const data = await res.json();
      if (data && data.success && data.applicants && data.applicants.length > 0) {
        list = data.applicants;
      }
    } catch (e) {
      console.warn("Error fetching online applicants, fallback to local", e);
    }
  }

  if (list.length === 0) {
    const raw = localStorage.getItem(ADMIN_CONFIG.STORAGE_KEY_APPLICANTS);
    if (raw) {
      try { list = JSON.parse(raw); } catch (e) { list = []; }
    }
  }

  if (list.length === 0) {
    list = generateSampleApplicants();
    localStorage.setItem(ADMIN_CONFIG.STORAGE_KEY_APPLICANTS, JSON.stringify(list));
  }

  allApplicants = list;
  renderApplicantsTable(allApplicants);
  loadSettingsForm();
}

function generateSampleApplicants() {
  return [
    {
      applicationId: "Q70-0001",
      academicYear: "2570",
      applyLevel: "ปวช.",
      prefix: "นาย",
      firstName: "ธนภัทร",
      lastName: "เจริญสุข",
      citizenId: "1100201234567",
      birthDate: "15/5/2554",
      fatherName: "นายประเสริฐ เจริญสุข",
      fatherAge: "48",
      fatherJob: "รับจ้างทั่วไป",
      motherName: "นางสุภาพร เจริญสุข",
      motherAge: "45",
      motherJob: "ค้าขาย",
      address: {
        houseNo: "45/2", moo: "3", soi: "-", road: "ท่าหลวง",
        subdistrict: "บ้านครัว", district: "บ้านหมอ", province: "สระบุรี", zipcode: "18270", phone: "0812345678"
      },
      previousEducation: {
        level: "ม.3", schoolName: "โรงเรียนบ้านหมอ 'พัฒนานุกูล'", schoolNo: "12",
        subdistrict: "บ้านหมอ", district: "บ้านหมอ", province: "สระบุรี", gpax: "3.45", prevMajor: "-"
      },
      branches: {
        majorPws: "",
        majorPwc1: "สาขาวิชาช่างยนต์",
        majorPwc2: "สาขาวิชาช่างไฟฟ้ากำลัง"
      },
      status: "ผ่านการคัดเลือก",
      studentId: "70201010001",
      remarks: "เอกสารครบถ้วน คุณสมบัติผ่านเกณฑ์โควตาพิเศษ",
      createdDate: "05/12/2569 09:30",
      timestamp: "2026-12-05T09:30:00Z"
    },
    {
      applicationId: "Q70-0002",
      academicYear: "2570",
      applyLevel: "ปวส. (สายตรง)",
      prefix: "นางสาว",
      firstName: "กานดา",
      lastName: "รัตนมณี",
      citizenId: "1199900887766",
      birthDate: "20/8/2551",
      fatherName: "นายสมเกียรติ รัตนมณี",
      fatherAge: "52",
      fatherJob: "พนักงานบริษัท",
      motherName: "นางนภา รัตนมณี",
      motherAge: "50",
      motherJob: "แม่บ้าน",
      address: {
        houseNo: "88", moo: "1", soi: "เทศบาล 4", road: "-",
        subdistrict: "สระบัว", district: "เมืองสระบุรี", province: "สระบุรี", zipcode: "18000", phone: "0898765432"
      },
      previousEducation: {
        level: "ปวช.3", schoolName: "วิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์", schoolNo: "113",
        subdistrict: "บ้านครัว", district: "บ้านหมอ", province: "สระบุรี", gpax: "3.80", prevMajor: "สาขาวิชาการบัญชี"
      },
      branches: {
        majorPws: "สาขาวิชาการบัญชี",
        majorPwc1: "",
        majorPwc2: ""
      },
      status: "มอบตัวแล้ว",
      studentId: "70302010002",
      remarks: "มอบตัวเรียบร้อยแล้ว ได้รับรหัสนักเรียน 70302010002",
      createdDate: "06/12/2569 11:15",
      timestamp: "2026-12-06T11:15:00Z"
    },
    {
      applicationId: "Q70-0003",
      academicYear: "2570",
      applyLevel: "ปวส. (ม.6/ปวช. ต่างสาขา)",
      prefix: "นาย",
      firstName: "พิเชษฐ์",
      lastName: "บุญส่ง",
      citizenId: "1188800112233",
      birthDate: "02/11/2551",
      fatherName: "นายบุญมี บุญส่ง",
      fatherAge: "55",
      fatherJob: "เกษตรกร",
      motherName: "นางบัว บุญส่ง",
      motherAge: "53",
      motherJob: "เกษตรกร",
      address: {
        houseNo: "102/1", moo: "6", soi: "-", road: "สุวรรณศร",
        subdistrict: "หนองแค", district: "หนองแค", province: "สระบุรี", zipcode: "18140", phone: "0823456789"
      },
      previousEducation: {
        level: "ม.6", schoolName: "โรงเรียนหนองแค 'สรกิจพิทยา'", schoolNo: "55",
        subdistrict: "หนองแค", district: "หนองแค", province: "สระบุรี", gpax: "2.95", prevMajor: "วิทย์-คณิต"
      },
      branches: {
        majorPws: "สาขาวิชาเทคโนโลยีคอมพิวเตอร์",
        majorPwc1: "",
        majorPwc2: ""
      },
      status: "เอกสารไม่ครบ (แก้ไข)",
      remarks: "ใบ ปพ.1 ไม่ชัดเจน กรุณาถ่ายภาพเอกสารฉบับเต็มส่งใหม่อีกครั้ง",
      createdDate: "07/12/2569 14:20",
      timestamp: "2026-12-07T14:20:00Z"
    },
    {
      applicationId: "Q70-0004",
      academicYear: "2570",
      applyLevel: "ปวช.",
      prefix: "เด็กชาย",
      firstName: "อนุชา",
      lastName: "คงมั่น",
      citizenId: "1155500443322",
      birthDate: "10/01/2554",
      fatherName: "นายวิเชียร คงมั่น",
      fatherAge: "44",
      fatherJob: "ช่างซ่อมบำรุง",
      motherName: "นางวันเพ็ญ คงมั่น",
      motherAge: "42",
      motherJob: "รับจ้าง",
      address: {
        houseNo: "33", moo: "2", soi: "ร่วมใจ", road: "-",
        subdistrict: "พุกร่าง", district: "พระพุทธบาท", province: "สระบุรี", zipcode: "18120", phone: "0861112233"
      },
      previousEducation: {
        level: "ม.3", schoolName: "โรงเรียนสุทธิวิทยา", schoolNo: "8",
        subdistrict: "พระพุทธบาท", district: "พระพุทธบาท", province: "สระบุรี", gpax: "3.10", prevMajor: "-"
      },
      branches: {
        majorPws: "",
        majorPwc1: "สาขาวิชาเทคโนโลยีคอมพิวเตอร์",
        majorPwc2: "สาขาวิชาช่างอิเล็กทรอนิกส์"
      },
      status: "รอตรวจสอบ",
      remarks: "ยื่นใบสมัครใหม่ อยู่ระหว่างรอเจ้าหน้าที่ตรวจสอบหลักฐาน",
      createdDate: "08/12/2569 10:05",
      timestamp: "2026-12-08T10:05:00Z"
    }
  ];
}

// ============================================================================
// Table Rendering & Filters
// ============================================================================

function renderApplicantsTable(data) {
  const tbody = document.getElementById("applicantsTableBody");
  const countBadge = document.getElementById("applicantCountBadge");
  countBadge.textContent = `${data.length} รายการ`;

  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 25px; color: var(--text-muted);">ไม่พบข้อมูลผู้สมัครตามเงื่อนไขที่ระบุ</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(app => {
    let majorDisplay = "-";
    if (app.applyLevel && app.applyLevel.startsWith("ปวส.")) {
      majorDisplay = app.branches ? app.branches.majorPws : "-";
    } else {
      majorDisplay = app.branches ? `<span title="อันดับ 2: ${app.branches.majorPwc2 || '-'}">${app.branches.majorPwc1 || '-'}</span>` : "-";
    }

    let badgeClass = "status-pending";
    if (app.status === "เอกสารไม่ครบ (แก้ไข)") badgeClass = "status-fix";
    else if (app.status === "ผ่านการคัดเลือก") badgeClass = "status-approved";
    else if (app.status === "ไม่ผ่าน") badgeClass = "status-rejected";
    else if (app.status === "มอบตัวแล้ว") badgeClass = "status-enrolled";

    const gpax = app.previousEducation ? app.previousEducation.gpax : "-";

    return `
      <tr>
        <td><strong>${app.applicationId}</strong></td>
        <td><code>${app.citizenId}</code></td>
        <td><strong>${app.prefix || ""}${app.firstName || ""} ${app.lastName || ""}</strong></td>
        <td>${app.applyLevel}</td>
        <td>${majorDisplay}</td>
        <td style="text-align: center; font-weight: 600;">${gpax}</td>
        <td style="font-size: 12px; color: var(--text-muted);">${app.createdDate ? app.createdDate.split(" ")[0] : "-"}</td>
        <td style="text-align: center;"><span class="status-badge ${badgeClass}">${app.status || "รอตรวจสอบ"}</span></td>
        <td style="text-align: center;">
          <div style="display: flex; gap: 4px; justify-content: center;">
            <button class="btn btn-secondary btn-sm" onclick="openApplicantDetailModal('${app.applicationId}')" title="ดูข้อมูล">ตรวจ</button>
            <button class="btn btn-pdf btn-sm" onclick="downloadApplicationPdfFromAdmin('${app.applicationId}')" title="ดาวน์โหลด PDF ใบสมัคร">📄 PDF</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function filterApplicantsTable() {
  const search = document.getElementById("filterSearch").value.toLowerCase().trim();
  const level = document.getElementById("filterLevel").value;
  const status = document.getElementById("filterStatus").value;

  const filtered = allApplicants.filter(a => {
    const fullName = `${a.prefix || ""} ${a.firstName || ""} ${a.lastName || ""}`.toLowerCase();
    const citizen = (a.citizenId || "").toLowerCase();
    const appId = (a.applicationId || "").toLowerCase();

    const matchSearch = !search || fullName.includes(search) || citizen.includes(search) || appId.includes(search);
    
    let matchLevel = true;
    if (level === "ปวช.") matchLevel = a.applyLevel === "ปวช.";
    else if (level === "ปวส.") matchLevel = a.applyLevel && a.applyLevel.startsWith("ปวส.");
    else if (level) matchLevel = a.applyLevel === level;

    const matchStatus = !status || a.status === status;

    return matchSearch && matchLevel && matchStatus;
  });

  renderApplicantsTable(filtered);
}

function resetApplicantFilters() {
  document.getElementById("filterSearch").value = "";
  document.getElementById("filterLevel").value = "";
  document.getElementById("filterStatus").value = "";
  renderApplicantsTable(allApplicants);
}

// ============================================================================
// Applicant Review Modal & Status Update
// ============================================================================

let currentViewingApp = null;

function openApplicantDetailModal(applicationId) {
  const app = allApplicants.find(a => a.applicationId === applicationId);
  if (!app) return;
  currentViewingApp = app;

  document.getElementById("modalDetailTitle").textContent = `ใบสมัครเลขที่: ${app.applicationId} - ${app.prefix || ""}${app.firstName || ""} ${app.lastName || ""}`;
  
  let majorText = "";
  if (app.applyLevel && app.applyLevel.startsWith("ปวส.")) {
    majorText = `สาขาวิชา: <strong>${app.branches ? app.branches.majorPws : "-"}</strong>`;
  } else {
    majorText = `อันดับที่ 1: <strong>${app.branches ? app.branches.majorPwc1 : "-"}</strong> | อันดับที่ 2: <strong>${app.branches ? app.branches.majorPwc2 : "-"}</strong>`;
  }

  const files = app.files || {};
  let filesHtml = "";
  
  const renderDocRow = (label, fileObj) => {
    if (!fileObj || !fileObj.data) {
      return `<div><strong>${label}:</strong> <span style="color: var(--text-muted);">ไม่มีเอกสารแนบ</span></div>`;
    }
    return `
      <div style="margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between; background: #fff; padding: 6px 12px; border: 1px solid var(--border-color); border-radius: 4px;">
        <span><strong>${label}:</strong> ${fileObj.name || "ไฟล์เอกสาร"}</span>
        <div>
          <a href="${fileObj.data}" target="_blank" class="btn btn-secondary btn-sm" download="${label}_${app.applicationId}">ดู/ดาวน์โหลด</a>
        </div>
      </div>
    `;
  };

  filesHtml += renderDocRow("1. รูปถ่าย 1 นิ้ว", files.photo);
  filesHtml += renderDocRow("2. ผลการเรียน ปพ.1/รบ. (GPAX)", files.transcript);
  filesHtml += renderDocRow("3. สำเนาบัตรประชาชน/ทะเบียนบ้าน", files.idCard);
  filesHtml += renderDocRow("4. เกียรติบัตร/ผลงาน", files.cert);

  const body = document.getElementById("modalDetailBody");
  body.innerHTML = `
    <div class="form-section">
      <div class="section-legend"><span>ข้อมูลผู้สมัครและระดับการศึกษา</span></div>
      <div class="form-grid">
        <div class="col-4"><strong>ระดับที่สมัคร:</strong> ${app.applyLevel}</div>
        <div class="col-8">${majorText}</div>
        <div class="col-6"><strong>ชื่อ - นามสกุล:</strong> ${app.prefix || ""}${app.firstName || ""} ${app.lastName || ""}</div>
        <div class="col-6"><strong>เลขประจำตัวประชาชน:</strong> <code>${app.citizenId}</code></div>
        <div class="col-6"><strong>วันเกิด:</strong> ${app.birthDate || "-"}</div>
        <div class="col-6"><strong>เบอร์โทรศัพท์:</strong> ${app.address ? app.address.phone : "-"}</div>
      </div>
    </div>

    <div class="form-section">
      <div class="section-legend"><span>ข้อมูลครอบครัวและที่อยู่</span></div>
      <div class="form-grid">
        <div class="col-6"><strong>บิดา:</strong> ${app.fatherName || "-"} (อายุ ${app.fatherAge || "-"} ปี) อาชีพ: ${app.fatherJob || "-"}</div>
        <div class="col-6"><strong>มารดา:</strong> ${app.motherName || "-"} (อายุ ${app.motherAge || "-"} ปี) อาชีพ: ${app.motherJob || "-"}</div>
        <div class="col-12"><strong>ที่อยู่:</strong> บ้านเลขที่ ${app.address ? app.address.houseNo : "-"} ม.${app.address ? app.address.moo || "-" : "-"} ซ.${app.address ? app.address.soi || "-" : "-"} ถ.${app.address ? app.address.road || "-" : "-"} ต.${app.address ? app.address.subdistrict : "-"} อ.${app.address ? app.address.district : "-"} จ.${app.address ? app.address.province : "-"} ${app.address ? app.address.zipcode : "-"}</div>
      </div>
    </div>

    <div class="form-section">
      <div class="section-legend"><span>ข้อมูลสถานศึกษาเดิม</span></div>
      <div class="form-grid">
        <div class="col-8"><strong>โรงเรียนเดิม:</strong> ${app.previousEducation ? app.previousEducation.schoolName : "-"} (${app.previousEducation ? app.previousEducation.level : "-"})</div>
        <div class="col-4"><strong>จังหวัด:</strong> ${app.previousEducation ? app.previousEducation.province : "-"}</div>
        <div class="col-6"><strong>เกรดเฉลี่ยสะสม (GPAX 5 ภาคเรียน):</strong> <span style="font-size: 16px; font-weight: 700; color: var(--primary-navy);">${app.previousEducation ? app.previousEducation.gpax : "-"}</span></div>
        <div class="col-6"><strong>สาขาวิชาเดิม:</strong> ${app.previousEducation ? app.previousEducation.prevMajor || "-" : "-"}</div>
      </div>
    </div>

    <div class="form-section" style="background-color: #fbfcfd;">
      <div class="section-legend"><span>เอกสารหลักฐานที่แนบมาในระบบ</span></div>
      ${filesHtml}
    </div>

    <div class="form-section" style="border: 2px solid var(--primary-navy); background-color: #f8fafc;">
      <div class="section-legend"><span>การพิจารณาตรวจสอบคุณสมบัติและเปลี่ยนสถานะ</span></div>
      <div class="form-grid">
        <div class="col-6">
          <div class="form-group">
            <label class="form-label">สถานะการพิจารณา <span class="required">*</span></label>
            <select id="modalUpdateStatus" class="form-control" style="font-weight: 600;">
              <option value="รอตรวจสอบ" ${app.status === "รอตรวจสอบ" ? "selected" : ""}>รอตรวจสอบ</option>
              <option value="เอกสารไม่ครบ (แก้ไข)" ${app.status === "เอกสารไม่ครบ (แก้ไข)" ? "selected" : ""}>เอกสารไม่ครบ (แก้ไข)</option>
              <option value="ผ่านการคัดเลือก" ${app.status === "ผ่านการคัดเลือก" ? "selected" : ""}>ผ่านการคัดเลือก</option>
              <option value="ไม่ผ่าน" ${app.status === "ไม่ผ่าน" ? "selected" : ""}>ไม่ผ่าน</option>
              <option value="มอบตัวแล้ว" ${app.status === "มอบตัวแล้ว" ? "selected" : ""}>มอบตัวแล้ว</option>
            </select>
          </div>
        </div>
        <div class="col-6">
          <div class="form-group">
            <label class="form-label">รหัสนักเรียน (กรณีมอบตัวแล้ว)</label>
            <input type="text" id="modalStudentId" class="form-control" value="${app.studentId || ''}" placeholder="จะออกให้อัตโนมัติเมื่อมอบตัว">
          </div>
        </div>
        <div class="col-12">
          <div class="form-group">
            <label class="form-label">หมายเหตุ / คำแนะนำสำหรับผู้สมัคร (จะแสดงในหน้าตรวจสอบสถานะ)</label>
            <textarea id="modalUpdateRemarks" class="form-control" rows="2">${app.remarks || ""}</textarea>
          </div>
        </div>
      </div>
    </div>
  `;

  openModal("modalApplicantDetail");
}

async function submitStatusUpdate() {
  if (!currentViewingApp) return;

  const newStatus = document.getElementById("modalUpdateStatus").value;
  const newRemarks = document.getElementById("modalUpdateRemarks").value.trim();
  const studentId = document.getElementById("modalStudentId").value.trim();
  const oldStatus = currentViewingApp.status;

  const logEntry = {
    timestamp: new Date().toLocaleString("th-TH"),
    staffUsername: currentStaff ? currentStaff.username : "system",
    staffName: currentStaff ? currentStaff.name : "เจ้าหน้าที่",
    applicationId: currentViewingApp.applicationId,
    action: `เปลี่ยนสถานะจาก [${oldStatus}] เป็น [${newStatus}]`,
    remarks: newRemarks
  };
  saveAuditLog(logEntry);

  currentViewingApp.status = newStatus;
  currentViewingApp.remarks = newRemarks;
  if (studentId) currentViewingApp.studentId = studentId;

  localStorage.setItem(ADMIN_CONFIG.STORAGE_KEY_APPLICANTS, JSON.stringify(allApplicants));

  if (ADMIN_CONFIG.GAS_API_URL) {
    try {
      await fetch(ADMIN_CONFIG.GAS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "updateStatus",
          applicationId: currentViewingApp.applicationId,
          status: newStatus,
          remarks: newRemarks,
          studentId: studentId,
          staffUsername: currentStaff ? currentStaff.username : "admin"
        })
      });
    } catch (err) {
      console.warn("Update status online error:", err);
    }
  }

  alert("บันทึกการเปลี่ยนสถานะผู้สมัครเรียบร้อยแล้ว");
  closeModal("modalApplicantDetail");
  renderApplicantsTable(allApplicants);
}

// ============================================================================
// PDF Application Generation (Admin Side)
// ============================================================================

function toThaiNumerals(str) {
  if (str === undefined || str === null) return "";
  const thaiDigits = ["๐", "๑", "๒", "๓", "๔", "๕", "๖", "๗", "๘", "๙"];
  return str.toString().replace(/[0-9]/g, match => thaiDigits[parseInt(match, 10)]);
}

function buildA4ApplicationHtml(app) {
  const thaiYear = toThaiNumerals(app.academicYear || "2570");
  const thaiAppId = toThaiNumerals(app.applicationId || "Q70-0001");
  const fullName = `${app.prefix || ""}${app.firstName || ""} ${app.lastName || ""}`;
  
  let majorText = "";
  if (app.applyLevel && app.applyLevel.startsWith("ปวส.")) {
    majorText = app.branches ? app.branches.majorPws : "-";
  } else {
    majorText = app.branches ? `อันดับ ๑: ${app.branches.majorPwc1 || "-"} / อันดับ ๒: ${app.branches.majorPwc2 || "-"}` : "-";
  }

  const photoSrc = (app.files && app.files.photo) ? app.files.photo.data : "assets/images/logo.png";

  return `
    <div class="a4-header">
      <div class="a4-photo-box">
        <img src="${photoSrc}" alt="รูปถ่าย 1 นิ้ว">
      </div>
      <div class="a4-title-block">
        <img src="assets/images/logo.png" class="a4-logo" alt="ตราสัญลักษณ์">
        <div class="a4-title-main">วิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์</div>
        <div class="a4-title-sub">ใบสมัครเข้าศึกษาต่อ ประเภทโควตาพิเศษ ประจำปีการศึกษา ${thaiYear}</div>
        <div style="font-size: 10.5pt; margin-top: 2px;">สังกัดสำนักงานคณะกรรมการการอาชีวศึกษา กระทรวงศึกษาธิการ</div>
        <div class="a4-app-id">เลขที่ใบสมัคร: ${thaiAppId}</div>
      </div>
    </div>

    <div class="a4-section-title">ระดับการศึกษาและสาขาวิชาที่สมัคร</div>
    <div class="a4-row">
      <div class="a4-label">ระดับที่สมัคร:</div>
      <div class="a4-value">${app.applyLevel || "-"}</div>
      <div class="a4-label" style="margin-left: 18px;">สาขาวิชาที่เลือก:</div>
      <div class="a4-value">${majorText}</div>
    </div>

    <div class="a4-section-title">ข้อ ๑. ข้อมูลผู้สมัคร</div>
    <div class="a4-row">
      <div class="a4-label">ชื่อ - นามสกุล:</div>
      <div class="a4-value">${fullName}</div>
      <div class="a4-label" style="margin-left: 14px;">เลขประจำตัวประชาชน:</div>
      <div class="a4-value">${app.citizenId || "-"}</div>
    </div>
    <div class="a4-row">
      <div class="a4-label">วัน/เดือน/ปีเกิด:</div>
      <div class="a4-value">${app.birthDate || "-"}</div>
      <div class="a4-label" style="margin-left: 14px;">โทรศัพท์:</div>
      <div class="a4-value">${app.address ? app.address.phone : "-"}</div>
    </div>

    <div class="a4-section-title">ข้อ ๒ - ๓. ข้อมูลบิดา - มารดา</div>
    <div class="a4-row">
      <div class="a4-label">ชื่อบิดา:</div>
      <div class="a4-value">${app.fatherName || "-"} (อายุ ${app.fatherAge || "-"} ปี)</div>
      <div class="a4-label" style="margin-left: 14px;">อาชีพ:</div>
      <div class="a4-value">${app.fatherJob || "-"}</div>
    </div>
    <div class="a4-row">
      <div class="a4-label">ชื่อมารดา:</div>
      <div class="a4-value">${app.motherName || "-"} (อายุ ${app.motherAge || "-"} ปี)</div>
      <div class="a4-label" style="margin-left: 14px;">อาชีพ:</div>
      <div class="a4-value">${app.motherJob || "-"}</div>
    </div>

    <div class="a4-section-title">ข้อ ๔. ที่อยู่ปัจจุบันที่ติดต่อได้</div>
    <div class="a4-row">
      <div class="a4-value">
        บ้านเลขที่ ${app.address ? app.address.houseNo : "-"} หมู่ที่ ${app.address ? app.address.moo || "-" : "-"} 
        ซอย ${app.address ? app.address.soi || "-" : "-"} ถนน ${app.address ? app.address.road || "-" : "-"} 
        ตำบล/แขวง ${app.address ? app.address.subdistrict : "-"} อำเภอ/เขต ${app.address ? app.address.district : "-"} 
        จังหวัด ${app.address ? app.address.province : "-"} รหัสไปรษณีย์ ${app.address ? app.address.zipcode : "-"}
      </div>
    </div>

    <div class="a4-section-title">ข้อ ๕. ข้อมูลสถานศึกษาเดิม</div>
    <div class="a4-row">
      <div class="a4-label">สถานศึกษาเดิม:</div>
      <div class="a4-value">${app.previousEducation ? app.previousEducation.schoolName : "-"} (${app.previousEducation ? app.previousEducation.level : "-"})</div>
      <div class="a4-label" style="margin-left: 14px;">จังหวัด:</div>
      <div class="a4-value">${app.previousEducation ? app.previousEducation.province : "-"}</div>
      <div class="a4-label" style="margin-left: 14px;">GPAX ๕ ภาคเรียน:</div>
      <div class="a4-value"><strong>${app.previousEducation ? app.previousEducation.gpax : "-"}</strong></div>
    </div>

    <div class="a4-section-title">รายการตรวจสอบเอกสารหลักฐาน (สำหรับเจ้าหน้าที่ทะเบียน)</div>
    <table class="a4-table-check">
      <thead>
        <tr>
          <th style="width: 10%;">ผล</th>
          <th style="width: 50%;">รายการเอกสารหลักฐาน</th>
          <th style="width: 40%;">หมายเหตุ</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="text-align: center;">[ / ]</td>
          <td>๑. รูปถ่ายหน้าตรงขนาด ๑ นิ้ว</td>
          <td>แนบในระบบแล้ว</td>
        </tr>
        <tr>
          <td style="text-align: center;">[ / ]</td>
          <td>๒. เอกสารแสดงผลการเรียนเฉลี่ยสะสม ๕ ภาคเรียน (ปพ.๑ / รบ.)</td>
          <td>GPAX: ${app.previousEducation ? app.previousEducation.gpax : "-"}</td>
        </tr>
        <tr>
          <td style="text-align: center;">[ / ]</td>
          <td>๓. สำเนาบัตรประจำตัวประชาชน / สำเนาทะเบียนบ้าน</td>
          <td>ตรวจสอบแล้ว</td>
        </tr>
        <tr>
          <td style="text-align: center;">[ ${app.files && app.files.cert ? '/' : ' '} ]</td>
          <td>๔. สำเนาเกียรติบัตร / ใบรับรองความสามารถพิเศษ</td>
          <td>${app.files && app.files.cert ? 'มีเอกสารแนบ' : 'ไม่มี'}</td>
        </tr>
      </tbody>
    </table>

    <div class="a4-signatures">
      <div class="a4-sig-block">
        <p>ลงชื่อ..........................................................ผู้สมัคร</p>
        <p>(${fullName})</p>
        <p>วันที่ยื่นสมัคร: ${app.createdDate || "...../...../....."}</p>
      </div>
      <div class="a4-sig-block">
        <p>ลงชื่อ..........................................................เจ้าหน้าที่รับสมัคร</p>
        <p>(..........................................................)</p>
        <p>วันที่ตรวจสอบ: ...../...../.....</p>
      </div>
    </div>
  `;
}

function downloadApplicationPdfFromAdmin(targetAppId = null) {
  let app = null;
  if (targetAppId) {
    app = allApplicants.find(a => a.applicationId === targetAppId);
  } else if (currentViewingApp) {
    app = currentViewingApp;
  }

  if (!app) {
    alert("ไม่พบข้อมูลใบสมัครที่จะสร้างไฟล์ PDF");
    return;
  }

  const container = document.getElementById("pdfA4Template");
  container.innerHTML = buildA4ApplicationHtml(app);

  const opt = {
    margin: [8, 10, 8, 10],
    filename: `ใบสมัคร_${app.applicationId}_${app.firstName}_${app.lastName}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  if (typeof html2pdf !== "undefined") {
    html2pdf().set(opt).from(container).save().then(() => {
      console.log("Admin downloaded PDF successfully");
    }).catch(err => {
      console.warn("PDF export err:", err);
      window.print();
    });
  } else {
    window.print();
  }
}

// ============================================================================
// Enrollment Module (ระบบรายงานตัวและมอบตัว)
// ============================================================================

function renderEnrollmentTable() {
  const tbody = document.getElementById("enrollmentTableBody");
  const candidates = allApplicants.filter(a => a.status === "ผ่านการคัดเลือก" || a.status === "มอบตัวแล้ว");

  if (candidates.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: var(--text-muted);">ไม่มีผู้สมัครที่ผ่านการคัดเลือกเข้าศึกษาต่อในขณะนี้</td></tr>`;
    return;
  }

  tbody.innerHTML = candidates.map(app => {
    let major = app.applyLevel && app.applyLevel.startsWith("ปวส.") ? (app.branches ? app.branches.majorPws : "-") : (app.branches ? app.branches.majorPwc1 : "-");
    const isEnrolled = app.status === "มอบตัวแล้ว";

    return `
      <tr>
        <td><strong>${app.applicationId}</strong></td>
        <td>${app.prefix || ""}${app.firstName || ""} ${app.lastName || ""}</td>
        <td>${app.applyLevel}</td>
        <td>${major}</td>
        <td><strong style="color: var(--primary-navy);">${app.studentId || "-"}</strong></td>
        <td><span class="status-badge ${isEnrolled ? 'status-enrolled' : 'status-approved'}">${app.status}</span></td>
        <td style="text-align: center;">
          ${isEnrolled ? 
            `<button class="btn btn-secondary btn-sm" onclick="openEnrollmentModal('${app.applicationId}')">แก้ไขมอบตัว</button>` : 
            `<button class="btn btn-success btn-sm" onclick="openEnrollmentModal('${app.applicationId}')">บันทึกมอบตัว</button>`
          }
        </td>
      </tr>
    `;
  }).join("");
}

function openEnrollmentModal(applicationId) {
  const app = allApplicants.find(a => a.applicationId === applicationId);
  if (!app) return;

  document.getElementById("enrollAppId").value = app.applicationId;
  document.getElementById("enrollStudentName").textContent = `${app.prefix || ""}${app.firstName || ""} ${app.lastName || ""}`;
  
  let major = app.applyLevel && app.applyLevel.startsWith("ปวส.") ? (app.branches ? app.branches.majorPws : "-") : (app.branches ? app.branches.majorPwc1 : "-");
  document.getElementById("enrollLevelMajor").textContent = `${app.applyLevel} - ${major}`;

  if (!app.studentId) {
    generateStudentId(app.applyLevel);
  } else {
    document.getElementById("enrollStudentId").value = app.studentId;
  }

  document.getElementById("enrollDate").value = new Date().toISOString().split("T")[0];
  document.getElementById("enrollGuardianName").value = app.fatherName || app.motherName || "";
  document.getElementById("enrollGuardianPhone").value = (app.address && app.address.phone) || "";

  openModal("modalEnrollmentForm");
}

function generateStudentId(level) {
  const prefix = "70";
  const randomBranchCode = "20101";
  const randomSerial = Math.floor(1000 + Math.random() * 9000);
  const genId = `${prefix}${randomBranchCode}${randomSerial}`;
  document.getElementById("enrollStudentId").value = genId;
}

function submitEnrollment(e) {
  e.preventDefault();
  const appId = document.getElementById("enrollAppId").value;
  const studentId = document.getElementById("enrollStudentId").value.trim();
  const enrollDate = document.getElementById("enrollDate").value;
  const guardian = document.getElementById("enrollGuardianName").value.trim();
  const phone = document.getElementById("enrollGuardianPhone").value.trim();

  const app = allApplicants.find(a => a.applicationId === appId);
  if (!app) return;

  app.status = "มอบตัวแล้ว";
  app.studentId = studentId;
  app.enrollment = {
    date: enrollDate,
    guardianName: guardian,
    guardianPhone: phone,
    recordedBy: currentStaff ? currentStaff.name : "เจ้าหน้าที่"
  };
  app.remarks = `มอบตัวเรียบร้อยแล้วเมื่อวันที่ ${enrollDate} ได้รับรหัสนักเรียน ${studentId}`;

  saveAuditLog({
    timestamp: new Date().toLocaleString("th-TH"),
    staffUsername: currentStaff ? currentStaff.username : "system",
    staffName: currentStaff ? currentStaff.name : "เจ้าหน้าที่",
    applicationId: appId,
    action: `บันทึกการมอบตัวนักเรียน ออกรหัสนักเรียน [${studentId}]`,
    remarks: `ผู้ปกครอง: ${guardian} เบอร์: ${phone}`
  });

  localStorage.setItem(ADMIN_CONFIG.STORAGE_KEY_APPLICANTS, JSON.stringify(allApplicants));
  alert(`บันทึกการมอบตัวสำเร็จ นักเรียนได้รับรหัสประจำตัว: ${studentId}`);
  closeModal("modalEnrollmentForm");
  renderEnrollmentTable();
  renderApplicantsTable(allApplicants);
}

// ============================================================================
// Modern Dashboard & Department/Branch Analytics
// ============================================================================

function categorizeMajorToDepartment(majorName) {
  if (!majorName) return DEPARTMENTS.INDUSTRY.name;
  for (let key in DEPARTMENTS) {
    const dept = DEPARTMENTS[key];
    for (let kw of dept.keywords) {
      if (majorName.includes(kw)) {
        return dept.name;
      }
    }
  }
  return DEPARTMENTS.INDUSTRY.name;
}

function renderDashboardCharts() {
  const total = allApplicants.length;
  const pending = allApplicants.filter(a => a.status === "รอตรวจสอบ").length;
  const fix = allApplicants.filter(a => a.status === "เอกสารไม่ครบ (แก้ไข)").length;
  const approved = allApplicants.filter(a => a.status === "ผ่านการคัดเลือก").length;
  const enrolled = allApplicants.filter(a => a.status === "มอบตัวแล้ว").length;

  document.getElementById("statTotal").textContent = total;
  document.getElementById("statPending").textContent = pending;
  document.getElementById("statFix").textContent = fix;
  document.getElementById("statApproved").textContent = approved;
  document.getElementById("statEnrolled").textContent = enrolled;

  // 1. Department Breakdown
  const deptCounts = {
    [DEPARTMENTS.INDUSTRY.name]: 0,
    [DEPARTMENTS.IT.name]: 0,
    [DEPARTMENTS.COMMERCE.name]: 0
  };

  const majorCounts = {};
  allApplicants.forEach(a => {
    let m = "-";
    if (a.applyLevel && a.applyLevel.startsWith("ปวส.")) {
      m = a.branches ? a.branches.majorPws : "-";
    } else {
      m = a.branches ? a.branches.majorPwc1 : "-";
    }
    if (m && m !== "-") {
      majorCounts[m] = (majorCounts[m] || 0) + 1;
      const dept = categorizeMajorToDepartment(m);
      deptCounts[dept] = (deptCounts[dept] || 0) + 1;
    }
  });

  // 2. Render Quota Progress Bars
  const quotaContainer = document.getElementById("quotaProgressContainer");
  if (quotaContainer) {
    quotaContainer.innerHTML = Object.keys(DEPARTMENTS).map(key => {
      const dept = DEPARTMENTS[key];
      const count = deptCounts[dept.name] || 0;
      const pct = Math.min(Math.round((count / dept.quota) * 100), 100);
      let fillClass = "fill-industry";
      if (key === "COMMERCE") fillClass = "fill-commerce";
      else if (key === "IT") fillClass = "fill-it";

      return `
        <div class="quota-row">
          <div class="quota-meta">
            <div><strong>${dept.name}</strong> <span style="color: var(--text-muted); font-size: 12px;">(เป้าหมายโควตา: ${dept.quota} คน)</span></div>
            <div><strong>${count}</strong> / ${dept.quota} คน (${pct}%)</div>
          </div>
          <div class="quota-bar-track">
            <div class="quota-bar-fill ${fillClass}" style="width: ${pct}%;"></div>
          </div>
        </div>
      `;
    }).join("");
  }

  const safeRenderChart = (chartId, type, config) => {
    if (chartInstances[chartId]) chartInstances[chartId].destroy();
    const ctx = document.getElementById(chartId);
    if (ctx) {
      chartInstances[chartId] = new Chart(ctx, { type, ...config });
    }
  };

  // Chart 1: Department Doughnut
  safeRenderChart("chartDepartment", "doughnut", {
    data: {
      labels: Object.keys(deptCounts),
      datasets: [{
        data: Object.values(deptCounts),
        backgroundColor: [DEPARTMENTS.INDUSTRY.color, DEPARTMENTS.IT.color, DEPARTMENTS.COMMERCE.color],
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "bottom" }
      }
    }
  });

  // Chart 2: Major Horizontal Bars
  const majorLabels = Object.keys(majorCounts);
  const majorValues = Object.values(majorCounts);
  const majorColors = majorLabels.map(m => {
    const d = categorizeMajorToDepartment(m);
    if (d === DEPARTMENTS.IT.name) return DEPARTMENTS.IT.color;
    if (d === DEPARTMENTS.COMMERCE.name) return DEPARTMENTS.COMMERCE.color;
    return DEPARTMENTS.INDUSTRY.color;
  });

  safeRenderChart("chartMajor", "bar", {
    data: {
      labels: majorLabels.length ? majorLabels : ["ยังไม่มีข้อมูล"],
      datasets: [{
        label: "ผู้สมัคร (คน)",
        data: majorValues.length ? majorValues : [0],
        backgroundColor: majorColors.length ? majorColors : ["#1e3a5f"],
        borderRadius: 4
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: { legend: { display: false } }
    }
  });

  // Chart 3: Level Pie
  let pwcCount = allApplicants.filter(a => a.applyLevel === "ปวช.").length;
  let pwsCount = allApplicants.filter(a => a.applyLevel && a.applyLevel.startsWith("ปวส.")).length;
  safeRenderChart("chartLevel", "pie", {
    data: {
      labels: ["ระดับ ปวช.", "ระดับ ปวส."],
      datasets: [{
        data: [pwcCount, pwsCount],
        backgroundColor: ["#1e3a5f", "#3b82f6"]
      }]
    },
    options: { responsive: true, plugins: { legend: { position: "bottom" } } }
  });

  // Feeder Schools
  const schoolCounts = {};
  allApplicants.forEach(a => {
    const s = a.previousEducation ? a.previousEducation.schoolName : "ไม่ระบุ";
    if (s) schoolCounts[s] = (schoolCounts[s] || 0) + 1;
  });
  const schoolLabels = Object.keys(schoolCounts).slice(0, 5);
  const schoolValues = schoolLabels.map(k => schoolCounts[k]);
  safeRenderChart("chartSchool", "bar", {
    data: {
      labels: schoolLabels.length ? schoolLabels : ["ยังไม่มีข้อมูล"],
      datasets: [{
        label: "ผู้สมัคร",
        data: schoolValues.length ? schoolValues : [0],
        backgroundColor: "#64748b",
        borderRadius: 4
      }]
    },
    options: { responsive: true, plugins: { legend: { display: false } } }
  });

  // Province
  const provCounts = {};
  allApplicants.forEach(a => {
    const p = (a.address && a.address.province) || "สระบุรี";
    provCounts[p] = (provCounts[p] || 0) + 1;
  });
  const provLabels = Object.keys(provCounts);
  const provValues = Object.values(provCounts);
  safeRenderChart("chartProvince", "doughnut", {
    data: {
      labels: provLabels.length ? provLabels : ["ยังไม่มีข้อมูล"],
      datasets: [{
        data: provValues.length ? provValues : [1],
        backgroundColor: ["#1e3a5f", "#2563eb", "#38bdf8", "#0284c7", "#94a3b8"]
      }]
    },
    options: { responsive: true, plugins: { legend: { position: "bottom" } } }
  });
}

// ============================================================================
// Data Export (ศธ.02 Format for Ministry of Education Registry)
// ============================================================================

function exportApplicantsData(format) {
  if (allApplicants.length === 0) {
    alert("ไม่มีข้อมูลสำหรับส่งออก");
    return;
  }

  const headers = [
    "เลขที่ใบสมัคร",
    "รหัสนักเรียน",
    "เลขประจำตัวประชาชน",
    "คำนำหน้า",
    "ชื่อ",
    "นามสกุล",
    "ระดับการศึกษา",
    "สาขาวิชา",
    "GPAX 5 ภาคเรียน",
    "สถานศึกษาเดิม",
    "จังหวัดโรงเรียนเดิม",
    "เบอร์โทรศัพท์",
    "ชื่อบิดา",
    "ชื่อมารดา",
    "ที่อยู่",
    "สถานะการสมัคร",
    "หมายเหตุ",
    "วันที่ยื่นใบสมัคร"
  ];

  const rows = allApplicants.map(a => {
    let major = a.applyLevel && a.applyLevel.startsWith("ปวส.") ? (a.branches ? a.branches.majorPws : "-") : (a.branches ? a.branches.majorPwc1 : "-");
    const addr = a.address ? `${a.address.houseNo} ม.${a.address.moo || '-'} ต.${a.address.subdistrict} อ.${a.address.district} จ.${a.address.province} ${a.address.zipcode}` : "-";

    return [
      a.applicationId || "",
      a.studentId || "-",
      `'${a.citizenId}'`,
      a.prefix || "",
      a.firstName || "",
      a.lastName || "",
      a.applyLevel || "",
      major,
      a.previousEducation ? a.previousEducation.gpax : "-",
      a.previousEducation ? a.previousEducation.schoolName : "-",
      a.previousEducation ? a.previousEducation.province : "-",
      a.address ? `'${a.address.phone}'` : "-",
      a.fatherName || "-",
      a.motherName || "-",
      addr,
      a.status || "รอตรวจสอบ",
      a.remarks || "-",
      a.createdDate || a.timestamp || "-"
    ];
  });

  if (format === "csv") {
    let csvContent = "\uFEFF" + headers.join(",") + "\n";
    rows.forEach(r => {
      csvContent += r.map(col => `"${col.toString().replace(/"/g, '""')}"`).join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `รายงานผู้สมัคร_ศธ02_ปี2570_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  } else if (format === "excel") {
    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8"/></head>
      <body>
        <table border="1">
          <thead>
            <tr style="background-color: #1e3a5f; color: #ffffff;">${headers.map(h => `<th>${h}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}
          </tbody>
        </table>
      </body>
      </html>
    `;
    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `ทะเบียนผู้สมัคร_ศธ02_ปี2570_${new Date().toISOString().split("T")[0]}.xls`;
    link.click();
  }
}

// ============================================================================
// System Settings Form (Admin Only)
// ============================================================================

function loadSettingsForm() {
  const raw = localStorage.getItem(ADMIN_CONFIG.STORAGE_KEY_SETTINGS);
  let s = null;
  if (raw) {
    try { s = JSON.parse(raw); } catch (e) {}
  }

  if (s) {
    document.getElementById("settingIsOpen").value = s.isOpen ? "true" : "false";
    document.getElementById("settingStartDate").value = s.applyStartDate || "2026-12-01";
    document.getElementById("settingEndDate").value = s.applyEndDate || "2027-01-31";
    document.getElementById("settingBranchesPWC").value = s.branchesPWC ? s.branchesPWC.join("\n") : "";
    document.getElementById("settingBranchesPWS").value = s.branchesPWS ? s.branchesPWS.join("\n") : "";
    document.getElementById("settingLineToken").value = s.lineToken || "";
  } else {
    document.getElementById("settingBranchesPWC").value = [
      "สาขาวิชาช่างยนต์",
      "สาขาวิชาช่างกลโรงงาน",
      "สาขาวิชาช่างเชื่อมโลหะ",
      "สาขาวิชาช่างไฟฟ้ากำลัง",
      "สาขาวิชาช่างอิเล็กทรอนิกส์",
      "สาขาวิชาเทคโนโลยีคอมพิวเตอร์",
      "สาขาวิชาการบัญชี",
      "สาขาวิชาการตลาด"
    ].join("\n");

    document.getElementById("settingBranchesPWS").value = [
      "สาขาวิชาเทคนิคเครื่องกล",
      "สาขาวิชาเทคนิคการผลิต",
      "สาขาวิชาไฟฟ้ากำลัง",
      "สาขาวิชาอิเล็กทรอนิกส์",
      "สาขาวิชาเทคโนโลยีคอมพิวเตอร์",
      "สาขาวิชาการบัญชี",
      "สาขาวิชาการจัดการโลจิสติกส์และซัพพลายเชน"
    ].join("\n");
  }
}

async function handleSaveSettings(e) {
  e.preventDefault();
  if (currentStaff && currentStaff.role !== "ผู้ดูแลระบบ") {
    alert("เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่มีสิทธิ์แก้ไขการตั้งค่า");
    return;
  }

  const pwcList = document.getElementById("settingBranchesPWC").value.split("\n").map(l => l.trim()).filter(l => l.length > 0);
  const pwsList = document.getElementById("settingBranchesPWS").value.split("\n").map(l => l.trim()).filter(l => l.length > 0);

  const updated = {
    isOpen: document.getElementById("settingIsOpen").value === "true",
    academicYear: "2570",
    applyStartDate: document.getElementById("settingStartDate").value,
    applyEndDate: document.getElementById("settingEndDate").value,
    branchesPWC: pwcList,
    branchesPWS: pwsList,
    lineToken: document.getElementById("settingLineToken").value.trim()
  };

  localStorage.setItem(ADMIN_CONFIG.STORAGE_KEY_SETTINGS, JSON.stringify(updated));

  saveAuditLog({
    timestamp: new Date().toLocaleString("th-TH"),
    staffUsername: currentStaff ? currentStaff.username : "admin",
    staffName: currentStaff ? currentStaff.name : "ผู้ดูแลระบบ",
    applicationId: "SYSTEM",
    action: "แก้ไขการตั้งค่าระบบและรายชื่อสาขาวิชา",
    remarks: `เปิดรับสมัคร: ${updated.isOpen ? 'เปิด' : 'ปิด'}, สาขา ปวช. ${pwcList.length} สาขา, สาขา ปวส. ${pwsList.length} สาขา`
  });

  if (ADMIN_CONFIG.GAS_API_URL) {
    try {
      await fetch(ADMIN_CONFIG.GAS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "saveSettings", settings: updated })
      });
    } catch (err) {
      console.warn("Save settings online error:", err);
    }
  }

  alert("บันทึกการตั้งค่าระบบเรียบร้อยแล้ว การเปลี่ยนแปลงจะมีผลต่อหน้าเว็บรับสมัครทันที");
}

function saveAuditLog(entry) {
  const raw = localStorage.getItem(ADMIN_CONFIG.STORAGE_KEY_AUDIT);
  let logs = [];
  if (raw) {
    try { logs = JSON.parse(raw); } catch (e) { logs = []; }
  }
  logs.unshift(entry);
  localStorage.setItem(ADMIN_CONFIG.STORAGE_KEY_AUDIT, JSON.stringify(logs));
}

function renderAuditLogs() {
  const tbody = document.getElementById("auditTableBody");
  const raw = localStorage.getItem(ADMIN_CONFIG.STORAGE_KEY_AUDIT);
  let logs = [];
  if (raw) {
    try { logs = JSON.parse(raw); } catch (e) { logs = []; }
  }

  if (logs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px; color: var(--text-muted);">ยังไม่มีประวัติการบันทึก</td></tr>`;
    return;
  }

  tbody.innerHTML = logs.map(l => `
    <tr>
      <td style="font-size: 12px; color: var(--text-muted);">${l.timestamp}</td>
      <td><strong>${l.staffName || l.staffUsername}</strong></td>
      <td><code>${l.applicationId}</code></td>
      <td>${l.action}</td>
      <td>${l.remarks || "-"}</td>
    </tr>
  `).join("");
}

function openModal(modalId) {
  const m = document.getElementById(modalId);
  if (m) m.classList.add("is-active");
}

function closeModal(modalId) {
  const m = document.getElementById(modalId);
  if (m) m.classList.remove("is-active");
}
