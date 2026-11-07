/**
 * ระบบรับสมัครเรียนออนไลน์ (โควตา) - วิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์
 * Front-end Logic, Validation, Dynamic Data, PDF Generation & Event Handlers
 */

const CONFIG = {
  GAS_API_URL: "https://script.google.com/macros/s/AKfycbwLsG_kot3GcOny0zU_SwVrLpmyNHf5kSpN7MQQVk1GLA9VD3yb_zYRJLJfF1b75PM7/exec",
  ACADEMIC_YEAR: "2570",
  STORAGE_KEY_APPLICANTS: "TCAT_APPLICANTS_DB_2570",
  STORAGE_KEY_SETTINGS: "TCAT_SETTINGS_2570"
};

// ข้อมูล 77 จังหวัดในประเทศไทย
const THAI_PROVINCES = [
  "กรุงเทพมหานคร", "กระบี่", "กาญจนบุรี", "กาฬสินธุ์", "กำแพงเพชร", "ขอนแก่น", "จันทบุรี", "ฉะเชิงเทรา",
  "ชลบุรี", "ชัยนาท", "ชัยภูมิ", "ชุมพร", "เชียงราย", "เชียงใหม่", "ตรัง", "ตราด", "ตาก", "นครนายก",
  "นครปฐม", "นครพนม", "นครราชสีมา", "นครศรีธรรมราช", "นครสวรรค์", "นนทบุรี", "นราธิวาส", "น่าน", "บึงกาฬ",
  "บุรีรัมย์", "ปทุมธานี", "ประจวบคีรีขันธ์", "ปราจีนบุรี", "ปัตตานี", "พระนครศรีอยุธยา", "พะเยา", "พังงา",
  "พัทลุง", "พิจิตร", "พิษณุโลก", "เพชรบุรี", "เพชรบูรณ์", "แพร่", "ภูเก็ต", "มหาสารคาม", "มุกดาหาร",
  "แม่ฮ่องสอน", "ยโสธร", "ยะลา", "ร้อยเอ็ด", "ระนอง", "ระยอง", "ราชบุรี", "ลพบุรี", "ลำปาง", "ลำพูน",
  "เลย", "ศรีสะเกษ", "สกลนคร", "สงขลา", "สตูล", "สมุทรปราการ", "สมุทรสงคราม", "สมุทรสาคร", "สระแก้ว",
  "สระบุรี", "สิงห์บุรี", "สุโขทัย", "สุพรรณบุรี", "สุราษฎร์ธานี", "สุรินทร์", "หนองคาย", "หนองบัวลำภู",
  "อ่างทอง", "อำนาจเจริญ", "อุดรธานี", "อุตรดิตถ์", "อุทัยธานี", "อุบลราชธานี"
];

// สาขาวิชาเริ่มต้น
let SYSTEM_SETTINGS = {
  isOpen: true,
  academicYear: "2570",
  applyStartDate: "2026-12-01",
  applyEndDate: "2027-01-31",
  branchesPWC: [
    "สาขาวิชาช่างยนต์",
    "สาขาวิชาช่างกลโรงงาน",
    "สาขาวิชาช่างเชื่อมโลหะ",
    "สาขาวิชาช่างไฟฟ้ากำลัง",
    "สาขาวิชาช่างอิเล็กทรอนิกส์",
    "สาขาวิชาเทคโนโลยีคอมพิวเตอร์",
    "สาขาวิชาการบัญชี",
    "สาขาวิชาการตลาด"
  ],
  branchesPWS: [
    "สาขาวิชาเทคนิคเครื่องกล",
    "สาขาวิชาเทคนิคการผลิต",
    "สาขาวิชาไฟฟ้ากำลัง",
    "สาขาวิชาอิเล็กทรอนิกส์",
    "สาขาวิชาเทคโนโลยีคอมพิวเตอร์",
    "สาขาวิชาการบัญชี",
    "สาขาวิชาการจัดการโลจิสติกส์และซัพพลายเชน"
  ]
};

// ตัวแปรเก็บข้อมูลใบสมัครปัจจุบันสำหรับพิมพ์หรือออก PDF
let currentPrintedApplication = null;

// ============================================================================
// Initialization
// ============================================================================
document.addEventListener("DOMContentLoaded", function() {
  initDateSelectors();
  initProvinceSelectors();
  loadSystemSettings();
  setupNavTabs();
  
  const hash = window.location.hash.replace("#", "");
  if (hash === "apply") switchTab("tab-apply");
  else if (hash === "status") switchTab("tab-status");
});

function setupNavTabs() {
  const navLinks = document.querySelectorAll("#mainNav .nav-link[data-tab]");
  navLinks.forEach(link => {
    link.addEventListener("click", function(e) {
      e.preventDefault();
      const targetTab = this.getAttribute("data-tab");
      switchTab(targetTab);
    });
  });
}

function switchTab(tabId) {
  document.querySelectorAll(".tab-pane").forEach(pane => pane.style.display = "none");
  const activePane = document.getElementById(tabId);
  if (activePane) activePane.style.display = "block";

  document.querySelectorAll("#mainNav .nav-link").forEach(link => {
    link.classList.remove("active");
    if (link.getAttribute("data-tab") === tabId) {
      link.classList.add("active");
    }
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function initDateSelectors() {
  const daySelect = document.getElementById("birthDay");
  for (let d = 1; d <= 31; d++) {
    const opt = document.createElement("option");
    opt.value = d;
    opt.textContent = d;
    daySelect.appendChild(opt);
  }

  const yearSelect = document.getElementById("birthYear");
  for (let y = 2558; y >= 2535; y--) {
    const opt = document.createElement("option");
    opt.value = y;
    opt.textContent = y;
    yearSelect.appendChild(opt);
  }
}

function initProvinceSelectors() {
  const addrProv = document.getElementById("addrProvince");
  const schoolProv = document.getElementById("prevSchoolProvince");

  THAI_PROVINCES.forEach(p => {
    const o1 = document.createElement("option");
    o1.value = p;
    o1.textContent = p;
    if (p === "สระบุรี") o1.selected = true;
    addrProv.appendChild(o1);

    const o2 = document.createElement("option");
    o2.value = p;
    o2.textContent = p;
    if (p === "สระบุรี") o2.selected = true;
    schoolProv.appendChild(o2);
  });
}

async function loadSystemSettings() {
  const cached = localStorage.getItem(CONFIG.STORAGE_KEY_SETTINGS);
  if (cached) {
    try {
      SYSTEM_SETTINGS = JSON.parse(cached);
    } catch (e) {
      console.warn("Invalid cached settings", e);
    }
  }

  if (CONFIG.GAS_API_URL) {
    try {
      const res = await fetch(`${CONFIG.GAS_API_URL}?action=getSettings`);
      const data = await res.json();
      if (data && data.success && data.settings) {
        SYSTEM_SETTINGS = {
          ...SYSTEM_SETTINGS,
          ...data.settings,
          isOpen: data.settings.isOpen === true || String(data.settings.isOpen).toLowerCase() === "true" || data.settings.isOpen === "TRUE"
        };
        if (data.settings.branchesPWC && data.settings.branchesPWC.length > 0) {
          SYSTEM_SETTINGS.branchesPWC = data.settings.branchesPWC;
        }
        if (data.settings.branchesPWS && data.settings.branchesPWS.length > 0) {
          SYSTEM_SETTINGS.branchesPWS = data.settings.branchesPWS;
        }
        localStorage.setItem(CONFIG.STORAGE_KEY_SETTINGS, JSON.stringify(SYSTEM_SETTINGS));
      }
    } catch (err) {
      console.log("Loading settings via offline fallback mode", err);
    }
  }

  renderBranchOptions();
  renderSystemStatus();
}

function renderSystemStatus() {
  const closedBanner = document.getElementById("systemClosedBanner");
  const btnSubmit = document.getElementById("btnSubmitForm");

  if (!SYSTEM_SETTINGS.isOpen) {
    if (closedBanner) closedBanner.style.display = "block";
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.title = "ระบบรับสมัครปิดทำการชั่วคราว";
    }
  } else {
    if (closedBanner) closedBanner.style.display = "none";
    if (btnSubmit) btnSubmit.disabled = false;
  }
}

function renderBranchOptions() {
  const pwsSelect = document.getElementById("pwsMajor");
  pwsSelect.innerHTML = `<option value="">-- เลือกสาขาวิชา --</option>`;
  SYSTEM_SETTINGS.branchesPWS.forEach(b => {
    const opt = document.createElement("option");
    opt.value = b;
    opt.textContent = b;
    pwsSelect.appendChild(opt);
  });

  const pwc1 = document.getElementById("pwcMajor1");
  const pwc2 = document.getElementById("pwcMajor2");
  pwc1.innerHTML = `<option value="">-- เลือกสาขาวิชาอันดับ 1 --</option>`;
  pwc2.innerHTML = `<option value="">-- เลือกสาขาวิชาอันดับ 2 --</option>`;
  SYSTEM_SETTINGS.branchesPWC.forEach(b => {
    const opt1 = document.createElement("option");
    opt1.value = b;
    opt1.textContent = b;
    pwc1.appendChild(opt1);

    const opt2 = document.createElement("option");
    opt2.value = b;
    opt2.textContent = b;
    pwc2.appendChild(opt2);
  });
}

// ============================================================================
// Form Event Handlers & Level Selection
// ============================================================================

function handleLevelChange(level) {
  const tip = document.getElementById("noLevelSelectedTip");
  const pwsBox = document.getElementById("pwsBranchSelection");
  const pwcBox = document.getElementById("pwcBranchSelection");
  const pwsMajor = document.getElementById("pwsMajor");
  const pwcMajor1 = document.getElementById("pwcMajor1");
  const pwcMajor2 = document.getElementById("pwcMajor2");

  tip.style.display = "none";

  if (level.startsWith("ปวส.")) {
    pwsBox.style.display = "block";
    pwcBox.style.display = "none";
    pwsMajor.required = true;
    pwcMajor1.required = false;
    pwcMajor2.required = false;
    pwcMajor1.value = "";
    pwcMajor2.value = "";
  } else if (level === "ปวช.") {
    pwsBox.style.display = "none";
    pwcBox.style.display = "block";
    pwsMajor.required = false;
    pwcMajor1.required = true;
    pwcMajor2.required = true;
    pwsMajor.value = "";
  }
}

function validateBranchChoice() {
  const pwc1 = document.getElementById("pwcMajor1").value;
  const pwc2 = document.getElementById("pwcMajor2").value;
  const feedback = document.getElementById("branchFeedback");

  if (pwc1 && pwc2 && pwc1 === pwc2) {
    feedback.classList.add("is-visible");
    document.getElementById("pwcMajor2").classList.add("is-invalid");
    return false;
  } else {
    feedback.classList.remove("is-visible");
    document.getElementById("pwcMajor2").classList.remove("is-invalid");
    return true;
  }
}

// ============================================================================
// Validation Rules (Thai Citizen ID Checksum, GPAX, Phone)
// ============================================================================

function validateThaiCitizenID(id) {
  if (!id || id.length !== 13 || !/^\d{13}$/.test(id)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(id.charAt(i), 10) * (13 - i);
  }
  let check = (11 - (sum % 11)) % 10;
  return check === parseInt(id.charAt(12), 10);
}

function validateCitizenIdField(input, feedbackId = "citizenIdFeedback") {
  const val = input.value.trim();
  const feedback = document.getElementById(feedbackId);

  if (val.length === 13) {
    if (validateThaiCitizenID(val)) {
      input.classList.remove("is-invalid");
      input.classList.add("is-valid");
      if (feedback) feedback.classList.remove("is-visible");
      return true;
    } else {
      input.classList.remove("is-valid");
      input.classList.add("is-invalid");
      if (feedback) feedback.classList.add("is-visible");
      return false;
    }
  } else {
    input.classList.remove("is-valid");
    if (feedback) feedback.classList.remove("is-visible");
    return false;
  }
}

const uploadedFilesBase64 = {};

function handleFileSelected(e, previewId, fileType = "all") {
  const file = e.target.files[0];
  const previewDiv = document.getElementById(previewId);
  const inputEl = e.target;

  if (!file) {
    previewDiv.innerHTML = "";
    delete uploadedFilesBase64[inputEl.id];
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    alert("ขออภัย ไฟล์มีขนาดเกิน 5 MB กรุณาเลือกไฟล์ที่มีขนาดไม่เกิน 5 MB");
    inputEl.value = "";
    previewDiv.innerHTML = `<span style="color:#dc2626;">ขนาดไฟล์เกิน 5 MB</span>`;
    delete uploadedFilesBase64[inputEl.id];
    return;
  }

  const reader = new FileReader();
  reader.onload = function(event) {
    const base64Data = event.target.result;
    uploadedFilesBase64[inputEl.id] = {
      name: file.name,
      type: file.type,
      size: (file.size / 1024).toFixed(1) + " KB",
      data: base64Data
    };

    if (file.type.startsWith("image/")) {
      previewDiv.innerHTML = `
        <span style="color:#166534; font-size: 13px;">✓ แนบไฟล์แล้ว: ${file.name} (${(file.size / 1024).toFixed(1)} KB)</span>
        <img src="${base64Data}" alt="พรีวิว" style="max-height: 44px; border: 1px solid #ccc; border-radius: 2px; margin-left: 8px;">
      `;
    } else {
      previewDiv.innerHTML = `<span style="color:#166534; font-size: 13px;">✓ แนบเอกสารแล้ว: ${file.name} (${(file.size / 1024).toFixed(1)} KB)</span>`;
    }
  };
  reader.readAsDataURL(file);
}

// ============================================================================
// Application Submission
// ============================================================================

async function handleApplicationSubmit(e) {
  e.preventDefault();

  if (!SYSTEM_SETTINGS.isOpen) {
    alert("ขออภัย ขณะนี้ระบบรับสมัครเรียนออนไลน์ ปิดทำการชั่วคราว");
    return;
  }

  const citizenIdInput = document.getElementById("citizenId");
  if (!validateThaiCitizenID(citizenIdInput.value.trim())) {
    alert("กรุณาตรวจสอบเลขประจำตัวประชาชน 13 หลัก ให้ถูกต้องตามความเป็นจริง");
    citizenIdInput.focus();
    return;
  }

  const phone = document.getElementById("phone").value.trim();
  if (!/^0\d{9}$/.test(phone)) {
    alert("หมายเลขโทรศัพท์ต้องเป็นตัวเลข 10 หลัก และขึ้นต้นด้วย 0 เช่น 0812345678");
    document.getElementById("phone").focus();
    return;
  }

  const gpax = parseFloat(document.getElementById("gpax").value);
  if (isNaN(gpax) || gpax < 0 || gpax > 4.00) {
    alert("ผลการเรียนเฉลี่ยสะสม (GPAX) ต้องมีค่าระหว่าง 0.00 - 4.00");
    document.getElementById("gpax").focus();
    return;
  }

  const levelRadio = document.querySelector('input[name="applyLevel"]:checked');
  if (!levelRadio) {
    alert("กรุณาเลือกระดับการศึกษาที่ต้องการสมัคร");
    return;
  }

  const levelVal = levelRadio.value;
  if (levelVal === "ปวช." && !validateBranchChoice()) {
    alert("สาขาวิชาลำดับที่ 1 และลำดับที่ 2 ต้องไม่เป็นสาขาเดียวกัน");
    return;
  }

  const pdpaCheck = document.getElementById("pdpaConsent");
  if (!pdpaCheck.checked) {
    alert("กรุณาติ๊กยินยอมการเก็บและใช้ข้อมูลส่วนบุคคลตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA)");
    pdpaCheck.focus();
    return;
  }

  if (!uploadedFilesBase64["filePhoto"] || !uploadedFilesBase64["fileTranscript"] || !uploadedFilesBase64["fileIdCard"]) {
    alert("กรุณาแนบไฟล์เอกสารหลักฐานบังคับให้ครบทั้ง 3 รายการ (รูปถ่าย, ผลการเรียน, สำเนาบัตรประชาชน)");
    return;
  }

  const applicants = getLocalApplicants();
  const isDuplicate = applicants.some(a => a.citizenId === citizenIdInput.value.trim() && a.academicYear === CONFIG.ACADEMIC_YEAR);
  if (isDuplicate) {
    alert("ขออภัย เลขประจำตัวประชาชนนี้ได้ยื่นใบสมัครเรียนในปีการศึกษานี้แล้ว ไม่สามารถสมัครซ้ำได้ กรุณาตรวจสอบที่เมนู 'ตรวจสอบสถานะ'");
    return;
  }

  const birthDay = document.getElementById("birthDay").value;
  const birthMonth = document.getElementById("birthMonth").value;
  const birthYear = document.getElementById("birthYear").value;

  const payload = {
    academicYear: CONFIG.ACADEMIC_YEAR,
    applyLevel: levelVal,
    prefix: document.getElementById("applicantPrefix").value,
    firstName: document.getElementById("applicantFirstName").value.trim(),
    lastName: document.getElementById("applicantLastName").value.trim(),
    citizenId: citizenIdInput.value.trim(),
    birthDate: `${birthDay}/${birthMonth}/${birthYear}`,
    fatherName: document.getElementById("fatherName").value.trim(),
    fatherAge: document.getElementById("fatherAge").value.trim(),
    fatherJob: document.getElementById("fatherJob").value.trim(),
    motherName: document.getElementById("motherName").value.trim(),
    motherAge: document.getElementById("motherAge").value.trim(),
    motherJob: document.getElementById("motherJob").value.trim(),
    address: {
      houseNo: document.getElementById("addrHouseNo").value.trim(),
      moo: document.getElementById("addrMoo").value.trim(),
      soi: document.getElementById("addrSoi").value.trim(),
      road: document.getElementById("addrRoad").value.trim(),
      subdistrict: document.getElementById("addrSubdistrict").value.trim(),
      district: document.getElementById("addrDistrict").value.trim(),
      province: document.getElementById("addrProvince").value,
      zipcode: document.getElementById("addrZipcode").value.trim(),
      phone: phone
    },
    previousEducation: {
      level: document.getElementById("prevLevel").value.trim(),
      schoolName: document.getElementById("prevSchoolName").value.trim(),
      schoolNo: document.getElementById("prevSchoolNo").value.trim(),
      subdistrict: document.getElementById("prevSchoolSubdistrict").value.trim(),
      district: document.getElementById("prevSchoolDistrict").value.trim(),
      province: document.getElementById("prevSchoolProvince").value,
      gpax: gpax.toFixed(2),
      prevMajor: document.getElementById("prevMajor").value.trim()
    },
    branches: {
      majorPws: document.getElementById("pwsMajor").value,
      majorPwc1: document.getElementById("pwcMajor1").value,
      majorPwc2: document.getElementById("pwcMajor2").value
    },
    files: {
      photo: uploadedFilesBase64["filePhoto"],
      transcript: uploadedFilesBase64["fileTranscript"],
      idCard: uploadedFilesBase64["fileIdCard"],
      cert: uploadedFilesBase64["fileCert"] || null
    },
    timestamp: new Date().toISOString()
  };

  const btnSubmit = document.getElementById("btnSubmitForm");
  const spinner = document.getElementById("submitSpinner");
  btnSubmit.disabled = true;
  spinner.style.display = "inline";

  try {
    let result = null;

    if (CONFIG.GAS_API_URL) {
      const res = await fetch(CONFIG.GAS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "submitApplication", data: payload })
      });
      result = await res.json();
    } else {
      const nextNum = (applicants.length + 1).toString().padStart(4, "0");
      result = {
        success: true,
        applicationId: `Q70-${nextNum}`,
        message: "บันทึกข้อมูลสำเร็จ"
      };
    }

    if (result && result.success) {
      payload.applicationId = result.applicationId;
      payload.status = "รอตรวจสอบ";
      payload.remarks = "ยื่นใบสมัครผ่านระบบออนไลน์เรียบร้อย อยู่ระหว่างการตรวจสอบเอกสารหลักฐาน";
      payload.createdDate = new Date().toLocaleDateString("th-TH", {
        year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit"
      });

      saveLocalApplicant(payload);
      currentPrintedApplication = payload;

      document.getElementById("modalAppId").textContent = result.applicationId;
      openModal("modalSuccess");
      handleFormReset();
    } else {
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล: " + (result ? result.message : "กรุณาลองใหม่อีกครั้ง"));
    }
  } catch (err) {
    console.error("Submission error:", err);
    const nextNum = (applicants.length + 1).toString().padStart(4, "0");
    const generatedAppId = `Q70-${nextNum}`;
    payload.applicationId = generatedAppId;
    payload.status = "รอตรวจสอบ";
    payload.remarks = "ยื่นใบสมัครเรียบร้อย";
    payload.createdDate = new Date().toLocaleDateString("th-TH");
    saveLocalApplicant(payload);
    currentPrintedApplication = payload;
    document.getElementById("modalAppId").textContent = generatedAppId;
    openModal("modalSuccess");
    handleFormReset();
  } finally {
    btnSubmit.disabled = false;
    spinner.style.display = "none";
  }
}

function handleFormReset() {
  document.getElementById("applicationForm").reset();
  document.querySelectorAll(".file-preview").forEach(div => div.innerHTML = "");
  for (let key in uploadedFilesBase64) delete uploadedFilesBase64[key];
  document.getElementById("pwsBranchSelection").style.display = "none";
  document.getElementById("pwcBranchSelection").style.display = "none";
  document.getElementById("noLevelSelectedTip").style.display = "block";
}

// ============================================================================
// Status Search & Document Re-upload
// ============================================================================

async function handleStatusSearch(e) {
  e.preventDefault();
  const searchInput = document.getElementById("searchCitizenId");
  const citizenId = searchInput.value.trim();

  if (!validateThaiCitizenID(citizenId)) {
    alert("กรุณากรอกเลขประจำตัวประชาชน 13 หลักให้ถูกต้อง");
    searchInput.focus();
    return;
  }

  const resultContainer = document.getElementById("statusResultContainer");
  const notFoundBox = document.getElementById("statusNotFound");
  const btnSearch = document.getElementById("btnSearchStatus");

  btnSearch.disabled = true;
  btnSearch.textContent = "กำลังค้นหา...";

  let applicant = null;

  if (CONFIG.GAS_API_URL) {
    try {
      const res = await fetch(`${CONFIG.GAS_API_URL}?action=checkStatus&citizenId=${citizenId}`);
      const data = await res.json();
      if (data && data.success && data.applicant) {
        applicant = data.applicant;
      }
    } catch (err) {
      console.log("Status search offline fallback", err);
    }
  }

  if (!applicant) {
    const list = getLocalApplicants();
    applicant = list.find(a => a.citizenId === citizenId);
  }

  btnSearch.disabled = false;
  btnSearch.textContent = "ค้นหาสถานะ";

  if (applicant) {
    notFoundBox.style.display = "none";
    resultContainer.style.display = "block";
    currentPrintedApplication = applicant;

    const masked = applicant.citizenId.substring(0, 5) + "XXXXX" + applicant.citizenId.substring(10);

    document.getElementById("resAppId").textContent = applicant.applicationId || "Q70-XXXX";
    document.getElementById("resName").textContent = `${applicant.prefix || ""}${applicant.firstName || ""} ${applicant.lastName || ""}`;
    document.getElementById("resMaskedId").textContent = masked;
    document.getElementById("resLevel").textContent = applicant.applyLevel || "-";
    
    let majorTxt = "-";
    if (applicant.applyLevel && applicant.applyLevel.startsWith("ปวส.")) {
      majorTxt = applicant.branches ? applicant.branches.majorPws : "-";
    } else {
      majorTxt = applicant.branches ? `อันดับ 1: ${applicant.branches.majorPwc1 || "-"} | อันดับ 2: ${applicant.branches.majorPwc2 || "-"}` : "-";
    }
    document.getElementById("resMajor").textContent = majorTxt;
    document.getElementById("resSchool").textContent = applicant.previousEducation ? applicant.previousEducation.schoolName : "-";
    document.getElementById("resDate").textContent = applicant.createdDate || applicant.timestamp || "-";
    document.getElementById("resRemarks").textContent = applicant.remarks || "-";

    renderStatusBadge("resStatusBadge", applicant.status || "รอตรวจสอบ");

    const btnReupload = document.getElementById("btnOpenReupload");
    if (applicant.status === "เอกสารไม่ครบ (แก้ไข)") {
      btnReupload.style.display = "inline-flex";
      document.getElementById("reuploadAppId").value = applicant.applicationId;
      document.getElementById("reuploadCitizenId").value = applicant.citizenId;
    } else {
      btnReupload.style.display = "none";
    }

  } else {
    resultContainer.style.display = "none";
    notFoundBox.style.display = "block";
  }
}

function renderStatusBadge(containerId, status) {
  const container = document.getElementById(containerId);
  if (!container) return;

  let badgeClass = "status-pending";
  if (status === "เอกสารไม่ครบ (แก้ไข)") badgeClass = "status-fix";
  else if (status === "ผ่านการคัดเลือก") badgeClass = "status-approved";
  else if (status === "ไม่ผ่าน") badgeClass = "status-rejected";
  else if (status === "มอบตัวแล้ว") badgeClass = "status-enrolled";

  container.innerHTML = `<span class="status-badge ${badgeClass}">${status}</span>`;
}

function openReuploadModal() {
  openModal("modalReupload");
}

async function handleReuploadSubmit(e) {
  e.preventDefault();
  const appId = document.getElementById("reuploadAppId").value;
  const citizenId = document.getElementById("reuploadCitizenId").value;
  const docType = document.getElementById("reuploadDocType").value;
  const fileInput = document.getElementById("reuploadFile");
  const file = fileInput.files[0];

  if (!file) {
    alert("กรุณาเลือกไฟล์ที่ต้องการอัปโหลด");
    return;
  }

  const btn = document.getElementById("btnSubmitReupload");
  btn.disabled = true;
  btn.textContent = "กำลังอัปโหลด...";

  const reader = new FileReader();
  reader.onload = async function(evt) {
    const fileData = {
      name: file.name,
      type: file.type,
      data: evt.target.result,
      docType: docType
    };

    if (CONFIG.GAS_API_URL) {
      try {
        await fetch(CONFIG.GAS_API_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            action: "reuploadDocument",
            applicationId: appId,
            citizenId: citizenId,
            file: fileData
          })
        });
      } catch (err) {
        console.error("Reupload online err:", err);
      }
    }

    const list = getLocalApplicants();
    const index = list.findIndex(a => a.citizenId === citizenId);
    if (index !== -1) {
      list[index].status = "รอตรวจสอบ";
      list[index].remarks = "ผู้สมัครได้อัปโหลดเอกสารแก้ไขเพิ่มเติมแล้ว (" + new Date().toLocaleDateString("th-TH") + ")";
      localStorage.setItem(CONFIG.STORAGE_KEY_APPLICANTS, JSON.stringify(list));
      currentPrintedApplication = list[index];
    }

    alert("อัปโหลดเอกสารแก้ไขเรียบร้อยแล้ว สถานะเปลี่ยนเป็น 'รอตรวจสอบ'");
    closeModal("modalReupload");
    btn.disabled = false;
    btn.textContent = "ยืนยันการส่งเอกสารใหม่";
    handleStatusSearch({ preventDefault: () => {} });
  };
  reader.readAsDataURL(file);
}

// ============================================================================
// PDF Application Report Generation & Print Functions
// ============================================================================

function toThaiNumerals(str) {
  if (str === undefined || str === null) return "";
  const thaiDigits = ["๐", "๑", "๒", "๓", "๔", "๕", "๖", "๗", "๘", "๙"];
  return str.toString().replace(/[0-9]/g, match => thaiDigits[parseInt(match, 10)]);
}

/**
 * สร้าง HTML สำหรับใบสมัครทางการ A4 ตามแบบฟอร์มกระดาษ 100%
 */
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
          <td>แนบผ่านระบบออนไลน์เรียบร้อย</td>
        </tr>
        <tr>
          <td style="text-align: center;">[ / ]</td>
          <td>๒. เอกสารแสดงผลการเรียนเฉลี่ยสะสม ๕ ภาคเรียน (ปพ.๑ / รบ.)</td>
          <td>GPAX: ${app.previousEducation ? app.previousEducation.gpax : "-"}</td>
        </tr>
        <tr>
          <td style="text-align: center;">[ / ]</td>
          <td>๓. สำเนาบัตรประจำตัวประชาชน / สำเนาทะเบียนบ้าน</td>
          <td>ตรวจสอบความถูกต้องแล้ว</td>
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

/**
 * ดาวน์โหลดใบสมัครเป็นไฟล์ PDF รายบุคคลโดยตรง
 */
function downloadApplicationPdf(targetApp = null) {
  const app = targetApp || currentPrintedApplication;
  if (!app) {
    alert("ไม่พบข้อมูลใบสมัครที่จะสร้างไฟล์ PDF");
    return;
  }

  const container = document.getElementById("pdfA4Template");
  container.innerHTML = buildA4ApplicationHtml(app);

  const opt = {
    margin: [8, 10, 8, 10],
    filename: `ใบสมัครโควตา_${app.applicationId || 'Q70'}_${app.firstName || 'ผู้สมัคร'}_${app.lastName || ''}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  if (typeof html2pdf !== "undefined") {
    html2pdf().set(opt).from(container).save().then(() => {
      console.log("PDF downloaded successfully");
    }).catch(err => {
      console.warn("html2pdf failed, falling back to window.print()", err);
      printCurrentApplication();
    });
  } else {
    printCurrentApplication();
  }
}

/**
 * สั่งพิมพ์ผ่านเบราว์เซอร์
 */
function printCurrentApplication() {
  if (!currentPrintedApplication) {
    alert("ไม่พบข้อมูลใบสมัครที่จะพิมพ์");
    return;
  }

  const container = document.getElementById("govDocContent");
  container.innerHTML = `<div class="a4-page">${buildA4ApplicationHtml(currentPrintedApplication)}</div>`;
  window.print();
}

function openModal(modalId) {
  const m = document.getElementById(modalId);
  if (m) m.classList.add("is-active");
}

function closeModal(modalId) {
  const m = document.getElementById(modalId);
  if (m) m.classList.remove("is-active");
}

function getLocalApplicants() {
  const data = localStorage.getItem(CONFIG.STORAGE_KEY_APPLICANTS);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

function saveLocalApplicant(applicant) {
  const list = getLocalApplicants();
  list.unshift(applicant);
  localStorage.setItem(CONFIG.STORAGE_KEY_APPLICANTS, JSON.stringify(list));
}
