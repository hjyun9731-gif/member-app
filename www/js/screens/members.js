const memberState = {
  section: "members",
  page: 1,
  filters: {},
};

const MEMBER_SECTIONS = [
  ["members", "회원관리"],
  ["allocation", "부과대수"],
  ["candidates", "예정자"],
  ["transfers", "양도양수"],
  ["closures", "폐업현황"],
  ["changes", "변경이력"],
];

function memberSectionTabs() {
  return `<div class="segment-scroll">${MEMBER_SECTIONS.map(([id,label]) =>
    `<button class="segment ${memberState.section === id ? "on" : ""}" onclick="switchMemberSection('${id}')">${label}</button>`
  ).join("")}</div>`;
}

async function renderMembers() {
  document.getElementById("tabbar").style.display = "flex";
  document.getElementById("backBtn").style.visibility = "hidden";
  document.getElementById("appbarTitle").textContent = "회원";
  setActiveTab("members");
  const view = document.getElementById("view");
  view.innerHTML = `${memberSectionTabs()}<div style="display:flex;justify-content:flex-end;margin:-2px 2px 8px"><button class="link" onclick="openMemberModuleTools()">전체 기능 보기</button></div><div id="memberSectionBody">${loadingHtml()}</div>`;
  await renderMemberSection();
}

window.switchMemberSection = async function(id) {
  memberState.section = id;
  memberState.page = 1;
  memberState.filters = {};
  await renderMembers();
};

async function renderMemberSection() {
  if (memberState.section === "members") return renderMemberList(1);
  if (memberState.section === "allocation") return renderAllocation();
  if (memberState.section === "candidates") return renderCandidateList(1);
  if (memberState.section === "transfers") return renderTransferList(1);
  if (memberState.section === "closures") return renderClosureList(1);
  if (memberState.section === "changes") return renderChangeList(1);
}

function bindEnter(id, callback) {
  const el = document.getElementById(id);
  if (el) el.onkeydown = (e) => { if (e.key === "Enter") callback(); };
}

// ---------------- 회원관리 ----------------
window.renderMemberList = async function(page = 1) {
  memberState.page = page;
  const body = document.getElementById("memberSectionBody");
  const f = memberState.filters;
  body.innerHTML = `
    <div class="toolbar-card">
      <div class="toolbar-title"><b>회원관리</b><button class="btn btn-primary btn-sm" onclick="openMemberForm()">+ 회원 등록</button></div>
      <div class="filters">
        <select id="mCategory" class="control"><option value="">개인+택배</option><option value="개인" ${f.category==='개인'?'selected':''}>개인</option><option value="택배" ${f.category==='택배'?'selected':''}>택배</option></select>
        ${regionSelect("mRegion", f.region || "")}
        <select id="mStatus" class="control"><option value="">가입+미가입</option><option value="가입" ${f.membership_status==='가입'?'selected':''}>가입</option><option value="미가입" ${f.membership_status==='미가입'?'selected':''}>미가입</option></select>
        <input id="mSearch" class="control full-filter" value="${esc(f.search || "")}" placeholder="성명·차량번호·주소·자격번호">
        <button class="btn btn-primary btn-sm" onclick="memberSearch()">조회</button>
        <button class="btn btn-soft btn-sm" onclick="resetMemberSearch()">초기화</button>
      </div>
    </div>
    <div id="memberList">${loadingHtml()}</div>`;
  bindEnter("mSearch", () => memberSearch());

  const q = new URLSearchParams({ page, limit: 30 });
  Object.entries(f).forEach(([k,v]) => { if (v) q.set(k, v); });
  try {
    const d = await apiRequest(`/api/members?${q}`);
    const host = document.getElementById("memberList");
    if (!d.items?.length) { host.innerHTML = emptyHtml(); return; }
    host.innerHTML = `<div class="count-row">총 <b>${Number(d.total||0).toLocaleString()}</b>명</div>
      <div class="mobile-list">${d.items.map(r => `
        <button class="list-card" onclick="openMemberDetail(${Number(r.id)})">
          <div class="list-card-head"><div><b>${fmt(r.name)}</b><span>${fmt(r.vehicle_number)}</span></div>${statusBadge(r.membership_status)}</div>
          <div class="list-meta"><span>${fmt(r.management_number)}</span><span>${fmt(r.region)}</span><span>${fmt(r.category)}</span></div>
          <div class="list-sub"><span>${fmt(r.mobile)}</span><span>인가 ${fmt(r.approval_date)}</span></div>
        </button>`).join("")}</div>${pagerHtml(d.page, d.pages, "renderMemberList")}`;
  } catch (e) { document.getElementById("memberList").innerHTML = errorHtml(e.message); }
};

window.memberSearch = function() {
  memberState.filters = {
    category: document.getElementById("mCategory").value,
    region: document.getElementById("mRegion").value,
    membership_status: document.getElementById("mStatus").value,
    search: document.getElementById("mSearch").value.trim(),
  };
  renderMemberList(1);
};
window.resetMemberSearch = function() { memberState.filters = {}; renderMemberList(1); };

window.openMemberDetail = async function(id) {
  openSheet("회원 상세", loadingHtml());
  try {
    const r = await apiRequest(`/api/members/${id}`);
    const html = [
      detailSection("기본 정보", [["관리번호",r.management_number],["지역",r.region],["차량번호",r.vehicle_number],["성명",r.name],["구분",r.category],["가입여부",r.membership_status]]),
      detailSection("연락처 / 주소", [["전화번호",r.phone],["핸드폰",r.mobile],["주소",r.address,true],["공문주소",r.official_address,true]]),
      detailSection("인허가 정보", [["인가일자",r.approval_date],["가입일자",r.membership_date],["자격증명발급일자",r.certificate_issue_date],["자격증명발급번호",r.certificate_number],["운전면허번호",r.driver_license_number],["주민등록번호",r.resident_number],["사업자번호",r.business_number]]),
      detailSection("차량 / 소속", [["차종",r.vehicle_type],["유종",r.fuel_type],["소속업체",r.affiliated_company],["구조변경",r.structure_change,true],["비고",r.memo,true]]),
      r.transfer_info ? detailSection("양수 정보", [["대장 관리번호",r.transfer_info.management_number],["양도자",r.transfer_info.transferor],["접수일자",r.transfer_info.receipt_date],["인가일자",r.transfer_info.approval_date]]) : "",
      r.transfer_out_info ? detailSection("양도 정보", [["대장 관리번호",r.transfer_out_info.management_number],["양수자",r.transfer_out_info.transferee],["접수일자",r.transfer_out_info.receipt_date]]) : "",
      r.transfer_ledger_missing ? `<div class="notice warn">관리번호 ${fmt(r.management_number)}에 대응하는 양도양수대장 기록이 없습니다.<button class="btn btn-danger btn-sm" onclick="createMissingLedger(${id})">누락대장 생성</button></div>` : ""
    ].join("");
    openSheet("회원 상세", html, `
      <button class="btn btn-soft" onclick="toggleMemberPin(${id}, ${r.pinned ? 'false':'true'})">${r.pinned?'고정 해제':'📌 고정'}</button>
      <button class="btn btn-soft" onclick="openCloseMemberForm(${id}, '${esc(r.name)}', '${esc(r.vehicle_number)}')">폐업/양도/이관</button>
      <button class="btn btn-primary" onclick="openMemberForm(${id})">수정</button>
      ${isAdminUser()?`<button class="btn btn-danger" onclick="deleteMember(${id})">삭제</button>`:''}
    `);
  } catch (e) { openSheet("회원 상세", errorHtml(e.message)); }
};

window.openMemberForm = async function(id = null) {
  let r = {};
  try {
    if (id) r = await apiRequest(`/api/members/${id}`);
    else {
      const n = await apiRequest("/api/members/next-new-number").catch(() => ({}));
      r.management_number = n.next_number || "";
      r.membership_status = "가입";
    }
  } catch (e) { showToast(e.message, "err"); return; }
  const html = `<form id="memberForm" class="form-grid">
    ${formField("management_number","관리번호",r.management_number)}
    ${selectField("region","지역",[{value:"",label:"지역 선택"},...GW_REGIONS],r.region)}
    ${formField("vehicle_number","차량번호",r.vehicle_number,{required:true})}
    ${formField("name","성명",r.name,{required:true})}
    ${formField("phone","전화번호",r.phone)}
    ${formField("mobile","핸드폰",r.mobile)}
    ${formField("address","주소",r.address,{full:true})}
    ${selectField("membership_status","가입여부",["가입","미가입"],r.membership_status||"가입")}
    ${formField("membership_date","가입일자",r.membership_date)}
    ${formField("approval_date","인가일자",r.approval_date)}
    ${formField("certificate_issue_date","자격증명발급일자",r.certificate_issue_date)}
    ${formField("certificate_number","자격증명발급번호",r.certificate_number)}
    ${formField("driver_license_number","운전면허번호",r.driver_license_number)}
    ${formField("vehicle_type","차종",r.vehicle_type)}
    ${selectField("fuel_type","유종",["","경유","LPG","전기","휘발유","CNG","하이브리드"],r.fuel_type||"")}
    ${formField("business_number","사업자번호",r.business_number)}
    ${formField("affiliated_company","소속업체",r.affiliated_company)}
    ${formField("resident_number","주민등록번호",r.resident_number)}
    ${textAreaField("memo","비고",r.memo)}
  </form>`;
  openSheet(id ? "회원 수정" : "회원 등록", html,
    `<button class="btn btn-soft" onclick="closeSheet()">취소</button><button class="btn btn-primary" onclick="saveMember(${id ?? 'null'})">${id?'저장':'등록'}</button>`);
};

window.saveMember = async function(id) {
  const form = document.getElementById("memberForm");
  if (!form.reportValidity()) return;
  const data = serializeForm(form);
  data.category = String(data.vehicle_number || "").includes("배") ? "택배" : "개인";
  try {
    await apiRequest(id ? `/api/members/${id}` : "/api/members", {method:id?"PUT":"POST", body:JSON.stringify(data)});
    closeSheet(); showToast(id ? "회원 정보를 수정했습니다." : "회원을 등록했습니다."); renderMemberList(memberState.page);
  } catch (e) { showToast(e.message, "err"); }
};

window.toggleMemberPin = async function(id, next) {
  try { await apiRequest(`/api/members/${id}/pin`, {method:"PATCH", body:JSON.stringify({pinned:next})}); closeSheet(); showToast(next?"고정했습니다.":"고정을 해제했습니다."); renderMemberList(memberState.page); }
  catch (e) { showToast(e.message, "err"); }
};

window.createMissingLedger = async function(id) {
  if (!confirmAction("누락된 양도양수대장 기록을 생성할까?")) return;
  try { const r = await apiRequest(`/api/members/${id}/create-missing-transfer-ledger`, {method:"POST", body:"{}"}); showToast(r.message || "처리했습니다."); openMemberDetail(id); }
  catch (e) { showToast(e.message, "err"); }
};

window.deleteMember = async function(id) {
  if (!confirmAction("이 회원을 삭제할까? 삭제 후 복구가 어려울 수 있어.")) return;
  try { await apiRequest(`/api/members/${id}`, {method:"DELETE"}); closeSheet(); showToast("삭제했습니다."); renderMemberList(1); }
  catch (e) { showToast(e.message, "err"); }
};

window.openCloseMemberForm = async function(id, name, vehicle) {
  let nn = {};
  try { nn = await apiRequest("/api/closures/next-number/폐업"); } catch (_) {}
  const html = `<div class="notice">${esc(name)} · ${esc(vehicle)}</div><form id="closeMemberForm" class="form-grid">
    ${selectField("closure_type","처리구분",["폐업","양도","이관"],"폐업")}
    ${formField("management_number","처리 관리번호",nn.next_number||"")}
    ${formField("receipt_date","접수일자","")}
    ${formField("closure_date","처리일자","",{required:true})}
    ${formField("transferee","양수인","")}
    ${formField("transfer_region","이관/양도지역","")}
    ${textAreaField("reason","사유 / 비고","")}
  </form>`;
  openSheet("폐업·양도·이관 처리", html, `<button class="btn btn-soft" onclick="closeSheet()">취소</button><button class="btn btn-danger" onclick="saveCloseMember(${id})">처리</button>`);
  const sel = document.querySelector('#closeMemberForm [name="closure_type"]');
  if (sel) sel.onchange = async () => {
    try { const n = await apiRequest(`/api/closures/next-number/${encodeURIComponent(sel.value)}`); document.querySelector('#closeMemberForm [name="management_number"]').value=n.next_number||""; } catch (_) {}
  };
};

window.saveCloseMember = async function(id) {
  const form = document.getElementById("closeMemberForm"); if (!form.reportValidity()) return;
  const data = serializeForm(form);
  try { const r = await apiRequest(`/api/members/${id}/close`, {method:"POST",body:JSON.stringify(data)}); closeSheet(); showToast(`${data.closure_type} 처리 완료${r.management_number?` (${r.management_number})`:''}`); renderMemberList(1); }
  catch (e) { showToast(e.message, "err"); }
};

// ---------------- 부과대수 ----------------
async function renderAllocation() {
  const body = document.getElementById("memberSectionBody");
  body.innerHTML = `<div class="toolbar-card"><div class="toolbar-title"><b>부과대수</b><span class="hint">운영 대시보드 자동집계</span></div></div>${loadingHtml()}`;
  try {
    const [full, list] = await Promise.all([
      apiRequest("/api/dashboard/full-stats"),
      apiRequest("/api/allocation/list").catch(() => null),
    ]);
    const a = full.allocation || {};
    const keys = ["협회가입","양도누계","이관누계","폐업누계","탈퇴","택배신규","관리비폐지","70세","협회기본대수","총부과대수","택배관리"];
    body.innerHTML = `<div class="toolbar-card"><div class="toolbar-title"><b>부과대수</b><span class="hint">운영 대시보드 자동집계</span></div></div>
      <div class="kpi-grid">${keys.map(k=>`<div class="kpi"><span>${esc(k)}</span><b>${Number(a[k] ?? 0).toLocaleString()}</b></div>`).join("")}</div>
      ${list?.items?.length ? `<div class="card"><h3>저장된 부과대수 이력</h3>${list.items.slice(0,24).map(r=>`<div class="history-row"><b>${esc(r.year)}.${String(r.month).padStart(2,'0')}</b><span>총 ${Number(r.total_count||0).toLocaleString()}대</span></div>`).join("")}</div>` : ""}`;
  } catch (e) { body.innerHTML = errorHtml(e.message); }
}

// ---------------- 예정자 ----------------
window.renderCandidateList = async function(page = 1) {
  memberState.page=page; const body=document.getElementById("memberSectionBody"), f=memberState.filters;
  body.innerHTML=`<div class="toolbar-card"><div class="toolbar-title"><b>예정자</b><button class="btn btn-primary btn-sm" onclick="openCandidateForm()">+ 등록</button></div><div class="filters">${regionSelect('cRegion',f.region||'')}<input id="cSearch" class="control full-filter" value="${esc(f.search||'')}" placeholder="성명·차량번호·주민번호"><button class="btn btn-primary btn-sm" onclick="candidateSearch()">조회</button><button class="btn btn-soft btn-sm" onclick="resetCandidateSearch()">초기화</button></div></div><div id="candidateList">${loadingHtml()}</div>`;
  bindEnter("cSearch",()=>candidateSearch());
  const q=new URLSearchParams({page,limit:30});Object.entries(f).forEach(([k,v])=>v&&q.set(k,v));
  try { const d=await apiRequest(`/api/candidates?${q}`); const host=document.getElementById('candidateList'); if(!d.items?.length){host.innerHTML=emptyHtml();return;} host.innerHTML=`<div class="count-row">총 <b>${Number(d.total||0).toLocaleString()}</b>명</div><div class="mobile-list">${d.items.map(r=>`<button class="list-card" onclick="openCandidateDetail(${r.id})"><div class="list-card-head"><div><b>${fmt(r.name)}</b><span>${fmt(r.vehicle_number)}</span></div>${r.is_registered?badge('등록완료','ok'):badge('예정','info')}</div><div class="list-meta"><span>${fmt(r.region)}</span><span>${fmt(r.certificate_number)}</span><span>${fmt(r.vehicle_type)}</span></div><div class="list-sub"><span>${fmt(r.mobile)}</span><span>${fmt(r.affiliated_company)}</span></div></button>`).join('')}</div>${pagerHtml(d.page,d.pages,'renderCandidateList')}`; }
  catch(e){document.getElementById('candidateList').innerHTML=errorHtml(e.message);}
};
window.candidateSearch=()=>{memberState.filters={region:document.getElementById('cRegion').value,search:document.getElementById('cSearch').value.trim()};renderCandidateList(1);};
window.resetCandidateSearch=()=>{memberState.filters={};renderCandidateList(1);};
window.openCandidateDetail=async function(id){openSheet('예정자 상세',loadingHtml());try{const r=await apiRequest(`/api/candidates/${id}`);openSheet('예정자 상세',[
  detailSection('기본 정보',[["지역",r.region],["차량번호",r.vehicle_number],["성명",r.name],["주민등록번호",r.resident_number]]),
  detailSection('연락처 / 주소',[["전화번호",r.phone],["핸드폰",r.mobile],["주소",r.address,true]]),
  detailSection('자격 / 차량',[["자격증명발급일자",r.certificate_issue_date],["자격증명발급번호",r.certificate_number],["운전면허번호",r.driver_license_number],["차종",r.vehicle_type],["유종",r.fuel_type],["사업자번호",r.business_number],["소속업체",r.affiliated_company],["가입일자",r.membership_date],["비고",r.memo,true]])
].join(''),`<button class="btn btn-soft" onclick="registerCandidateToMember(${id})">정식회원 전환</button><button class="btn btn-primary" onclick="openCandidateForm(${id})">수정</button>${isAdminUser()?`<button class="btn btn-danger" onclick="deleteCandidateMobile(${id})">삭제</button>`:''}`);}catch(e){openSheet('예정자 상세',errorHtml(e.message));}};
window.openCandidateForm=async function(id=null){let r={};try{if(id)r=await apiRequest(`/api/candidates/${id}`);}catch(e){showToast(e.message,'err');return;}openSheet(id?'예정자 수정':'예정자 등록',`<form id="candidateForm" class="form-grid">${selectField('region','지역',[{value:'',label:'지역 선택'},...GW_REGIONS],r.region)}${formField('vehicle_number','차량번호',r.vehicle_number,{required:true})}${formField('name','성명',r.name,{required:true})}${formField('resident_number','주민등록번호',r.resident_number)}${formField('phone','전화번호',r.phone)}${formField('mobile','핸드폰',r.mobile)}${formField('address','주소',r.address,{full:true})}${formField('certificate_issue_date','자격증명발급일자',r.certificate_issue_date)}${formField('certificate_number','자격증명발급번호',r.certificate_number)}${formField('driver_license_number','운전면허번호',r.driver_license_number)}${formField('vehicle_type','차종',r.vehicle_type)}${selectField('fuel_type','유종',["","경유","LPG","전기","휘발유","CNG","하이브리드"],r.fuel_type||'')}${formField('business_number','사업자번호',r.business_number)}${formField('affiliated_company','소속업체',r.affiliated_company)}${formField('membership_date','가입일자',r.membership_date)}${textAreaField('memo','비고',r.memo)}</form>`,`<button class="btn btn-soft" onclick="closeSheet()">취소</button><button class="btn btn-primary" onclick="saveCandidate(${id??'null'})">${id?'저장':'등록'}</button>`);};
window.saveCandidate=async function(id){const form=document.getElementById('candidateForm');if(!form.reportValidity())return;const data=serializeForm(form);try{await apiRequest(id?`/api/candidates/${id}`:'/api/candidates',{method:id?'PUT':'POST',body:JSON.stringify(data)});closeSheet();showToast(id?'수정했습니다.':'등록했습니다.');renderCandidateList(1);}catch(e){showToast(e.message,'err');}};
window.registerCandidateToMember=async function(id){try{const [r,n]=await Promise.all([apiRequest(`/api/candidates/${id}`),apiRequest('/api/members/next-new-number')]);openSheet('정식회원 전환',`<div class="notice">${fmt(r.name)} · ${fmt(r.vehicle_number)}</div><form id="candidateRegisterForm" class="form-grid">${formField('approval_date','인가일자','',{required:true})}${formField('membership_date','가입일자',r.membership_date||'')}${formField('management_number','관리번호',n.next_number||'')}</form>`,`<button class="btn btn-soft" onclick="closeSheet()">취소</button><button class="btn btn-primary" onclick="saveCandidateRegister(${id})">전환</button>`);}catch(e){showToast(e.message,'err');}};
window.saveCandidateRegister=async function(id){const f=document.getElementById('candidateRegisterForm');if(!f.reportValidity())return;try{const r=await apiRequest(`/api/candidates/${id}/register`,{method:'POST',body:JSON.stringify(serializeForm(f))});closeSheet();showToast(`${r.category||''}회원 전환 완료 ${r.management_number||''}`);renderCandidateList(1);}catch(e){showToast(e.message,'err');}};
window.deleteCandidateMobile=async function(id){if(!confirmAction('이 예정자를 삭제할까?'))return;try{await apiRequest(`/api/candidates/${id}`,{method:'DELETE'});closeSheet();showToast('삭제했습니다.');renderCandidateList(1);}catch(e){showToast(e.message,'err');}};

// ---------------- 양도양수 ----------------
window.renderTransferList=async function(page=1){memberState.page=page;const body=document.getElementById('memberSectionBody'),f=memberState.filters;body.innerHTML=`<div class="toolbar-card"><div class="toolbar-title"><b>양도양수대장</b><button class="btn btn-primary btn-sm" onclick="openTransferForm()">+ 등록</button></div><div class="filters">${regionSelect('tRegion',f.region||'')}<select id="tOrder" class="control"><option value="desc" ${f.date_order!=='asc'?'selected':''}>최신 처리일자</option><option value="asc" ${f.date_order==='asc'?'selected':''}>오래된 처리일자</option></select><input id="tSearch" class="control full-filter" value="${esc(f.search||'')}" placeholder="양수자·양도자·차량번호"><button class="btn btn-primary btn-sm" onclick="transferSearch()">조회</button><button class="btn btn-soft btn-sm" onclick="resetTransferSearch()">초기화</button></div></div><div id="transferList">${loadingHtml()}</div>`;bindEnter('tSearch',()=>transferSearch());const q=new URLSearchParams({page,limit:30});Object.entries(f).forEach(([k,v])=>v&&q.set(k,v));try{const d=await apiRequest(`/api/transfer-ledger?${q}`);const host=document.getElementById('transferList');if(!d.items?.length){host.innerHTML=emptyHtml();return;}host.innerHTML=`<div class="count-row">총 <b>${Number(d.total||0).toLocaleString()}</b>건</div><div class="mobile-list">${d.items.map(r=>`<button class="list-card" onclick="openTransferDetail(${r.id})"><div class="list-card-head"><div><b>${fmt(r.transferee)}</b><span>${fmt(r.vehicle_number)}</span></div>${r.member_id?badge('회원등록','ok'):badge('대장','info')}</div><div class="list-meta"><span>${fmt(r.management_number)}</span><span>${fmt(r.region)}</span><span>양도자 ${fmt(r.transferor)}</span></div><div class="list-sub"><span>${fmt(r.mobile)}</span><span>접수 ${fmt(r.receipt_date)}</span></div></button>`).join('')}</div>${pagerHtml(d.page,d.pages,'renderTransferList')}`;}catch(e){document.getElementById('transferList').innerHTML=errorHtml(e.message);}};
window.transferSearch=()=>{memberState.filters={region:document.getElementById('tRegion').value,date_order:document.getElementById('tOrder').value,search:document.getElementById('tSearch').value.trim()};renderTransferList(1);};window.resetTransferSearch=()=>{memberState.filters={};renderTransferList(1);};
window.openTransferDetail=async function(id){openSheet('양도양수 상세',loadingHtml());try{const r=await apiRequest(`/api/transfer-ledger/${id}`);openSheet('양도양수 상세',detailSection('기본 정보',[["관리번호",r.management_number],["접수일자",r.receipt_date],["지역",r.region],["차량번호",r.vehicle_number],["양도자",r.transferor],["양수자",r.transferee],["주민등록번호",r.resident_number],["핸드폰",r.mobile],["주소",r.address,true]])+detailSection('인허가 / 차량',[["인가일자",r.approval_date],["가입일자",r.membership_date],["자격증명발급일자",r.certificate_issue_date],["자격증명발급번호",r.certificate_number],["운전면허번호",r.driver_license_number],["차종",r.vehicle_type],["유종",r.fuel_type],["소속업체",r.affiliated_company],["비고",r.memo,true]]),`<button class="btn btn-soft" onclick="registerTransferToMember(${id})">회원등록</button><button class="btn btn-primary" onclick="openTransferForm(${id})">수정</button>${isAdminUser()?`<button class="btn btn-danger" onclick="deleteTransferMobile(${id})">삭제</button>`:''}`);}catch(e){openSheet('양도양수 상세',errorHtml(e.message));}};
window.openTransferForm=async function(id=null){let r={};try{if(id)r=await apiRequest(`/api/transfer-ledger/${id}`);}catch(e){showToast(e.message,'err');return;}openSheet(id?'양도양수 수정':'양도양수 등록',`<form id="transferForm" class="form-grid">${formField('management_number','관리번호',r.management_number)}${formField('receipt_date','접수일자',r.receipt_date)}${selectField('region','지역',[{value:'',label:'지역 선택'},...GW_REGIONS],r.region)}${formField('vehicle_number','차량번호',r.vehicle_number,{required:true})}${formField('transferor','양도자',r.transferor)}${formField('transferee','양수자',r.transferee,{required:true})}${formField('resident_number','주민등록번호',r.resident_number)}${formField('phone','전화번호',r.phone)}${formField('mobile','핸드폰',r.mobile)}${formField('address','주소',r.address,{full:true})}${formField('approval_date','인가일자',r.approval_date)}${formField('membership_date','가입일자',r.membership_date)}${formField('certificate_issue_date','자격증명발급일자',r.certificate_issue_date)}${formField('certificate_number','자격증명발급번호',r.certificate_number)}${formField('driver_license_number','운전면허번호',r.driver_license_number)}${formField('vehicle_type','차종',r.vehicle_type)}${selectField('fuel_type','유종',["","경유","LPG","전기","휘발유","CNG","하이브리드"],r.fuel_type||'')}${formField('affiliated_company','소속업체',r.affiliated_company)}${textAreaField('memo','비고',r.memo)}</form>`,`<button class="btn btn-soft" onclick="closeSheet()">취소</button><button class="btn btn-primary" onclick="saveTransfer(${id??'null'})">${id?'저장':'등록'}</button>`);};
window.saveTransfer=async function(id){const f=document.getElementById('transferForm');if(!f.reportValidity())return;try{await apiRequest(id?`/api/transfer-ledger/${id}`:'/api/transfer-ledger',{method:id?'PUT':'POST',body:JSON.stringify(serializeForm(f))});closeSheet();showToast(id?'수정했습니다.':'등록했습니다.');renderTransferList(1);}catch(e){showToast(e.message,'err');}};
window.registerTransferToMember=async function(id){try{const n=await apiRequest('/api/transfer-ledger/next-number');openSheet('회원등록',`<form id="transferRegisterForm" class="form-grid">${formField('management_number','관리번호',n.next_number||'',{required:true})}</form>`,`<button class="btn btn-soft" onclick="closeSheet()">취소</button><button class="btn btn-primary" onclick="saveTransferRegister(${id})">등록</button>`);}catch(e){showToast(e.message,'err');}};
window.saveTransferRegister=async function(id){try{const d=serializeForm(document.getElementById('transferRegisterForm'));const r=await apiRequest(`/api/transfer-ledger/${id}/register-member`,{method:'POST',body:JSON.stringify(d)});closeSheet();showToast(`${r.category||''}회원 등록 완료`);renderTransferList(1);}catch(e){showToast(e.message,'err');}};
window.deleteTransferMobile=async function(id){if(!confirmAction('이 양도양수대장 기록을 삭제할까?'))return;try{await apiRequest(`/api/transfer-ledger/${id}`,{method:'DELETE'});closeSheet();showToast('삭제했습니다.');renderTransferList(1);}catch(e){showToast(e.message,'err');}};

// ---------------- 폐업현황 ----------------
window.renderClosureList=async function(page=1){memberState.page=page;const body=document.getElementById('memberSectionBody'),f=memberState.filters;body.innerHTML=`<div class="toolbar-card"><div class="toolbar-title"><b>폐업현황</b><button class="btn btn-primary btn-sm" onclick="openClosureForm()">+ 등록</button></div><div class="filters">${regionSelect('clRegion',f.region||'')}<select id="clType" class="control"><option value="">전체 구분</option>${['폐업','양도','이관'].map(x=>`<option value="${x}" ${f.closure_type===x?'selected':''}>${x}</option>`).join('')}</select><select id="clDataType" class="control"><option value="">신규+이전</option><option value="신규자료" ${f.data_type==='신규자료'?'selected':''}>신규자료</option><option value="이전자료" ${f.data_type==='이전자료'?'selected':''}>이전자료</option></select><input id="clSearch" class="control full-filter" value="${esc(f.search||'')}" placeholder="관리번호·성명·차량번호"><button class="btn btn-primary btn-sm" onclick="closureSearch()">조회</button><button class="btn btn-soft btn-sm" onclick="resetClosureSearch()">초기화</button></div></div><div id="closureList">${loadingHtml()}</div>`;bindEnter('clSearch',()=>closureSearch());const q=new URLSearchParams({page,limit:30,date_order:'desc'});Object.entries(f).forEach(([k,v])=>v&&q.set(k,v));try{const d=await apiRequest(`/api/closures?${q}`);const host=document.getElementById('closureList');if(!d.items?.length){host.innerHTML=emptyHtml();return;}host.innerHTML=`<div class="count-row">총 <b>${Number(d.total||0).toLocaleString()}</b>건</div><div class="mobile-list">${d.items.map(r=>`<button class="list-card" onclick="openClosureDetail(${r.id})"><div class="list-card-head"><div><b>${fmt(r.name)}</b><span>${fmt(r.vehicle_number)}</span></div>${badge(r.closure_type||'폐업',r.closure_type==='폐업'?'danger':'warn')}</div><div class="list-meta"><span>${fmt(r.previous_management_number||r.management_number)}</span><span>${fmt(r.region)}</span><span>${statusBadge(r.membership_status)}</span></div><div class="list-sub"><span>${fmt(r.mobile||r.phone)}</span><span>처리 ${fmt(r.closure_date)}</span></div></button>`).join('')}</div>${pagerHtml(d.page,d.pages,'renderClosureList')}`;}catch(e){document.getElementById('closureList').innerHTML=errorHtml(e.message);}};
window.closureSearch=()=>{memberState.filters={region:document.getElementById('clRegion').value,closure_type:document.getElementById('clType').value,data_type:document.getElementById('clDataType').value,search:document.getElementById('clSearch').value.trim()};renderClosureList(1);};window.resetClosureSearch=()=>{memberState.filters={};renderClosureList(1);};
window.openClosureDetail=async function(id){openSheet('폐업현황 상세',loadingHtml());try{const r=await apiRequest(`/api/closures/${id}`);openSheet('폐업현황 상세',detailSection('기본 정보',[["기존관리번호",r.previous_management_number],["처리관리번호",r.management_number],["처리구분",r.closure_type],["자료구분",r.data_type],["지역",r.region],["차량번호",r.vehicle_number],["성명",r.name],["상호",r.company_name]])+detailSection('처리 정보',[["접수일자",r.receipt_date],["처리일자",r.closure_date],["양수인",r.transferee],["이관/양도지역",r.transfer_region],["사유",r.reason,true],["비고",r.memo,true]])+detailSection('회원 / 차량',[["가입여부",r.membership_status],["가입일자",r.membership_date],["인가일자",r.approval_date],["핸드폰",r.mobile],["주소",r.address,true],["차종",r.vehicle_type],["유종",r.fuel_type],["자격증명발급번호",r.certificate_number]]),`<button class="btn btn-primary" onclick="openClosureForm(${id})">수정</button>${isAdminUser()?`<button class="btn btn-danger" onclick="deleteClosureMobile(${id})">삭제</button>`:''}`);}catch(e){openSheet('폐업현황 상세',errorHtml(e.message));}};
window.openClosureForm=async function(id=null){let r={closure_type:'폐업',data_type:'신규자료'};try{if(id)r=await apiRequest(`/api/closures/${id}`);else{const n=await apiRequest('/api/closures/next-number/폐업').catch(()=>({}));r.management_number=n.next_number||'';}}catch(e){showToast(e.message,'err');return;}openSheet(id?'폐업현황 수정':'폐업 등록',`<form id="closureForm" class="form-grid">${formField('management_number','관리번호',r.management_number)}${selectField('closure_type','처리구분',['폐업','양도','이관'],r.closure_type||'폐업')}${selectField('data_type','자료구분',['신규자료','이전자료'],r.data_type||'신규자료')}${formField('receipt_date','접수일자',r.receipt_date)}${formField('closure_date','처리일자',r.closure_date)}${selectField('region','지역',[{value:'',label:'지역 선택'},...GW_REGIONS],r.region)}${formField('vehicle_number','차량번호',r.vehicle_number,{required:true})}${formField('name','성명',r.name,{required:true})}${formField('company_name','상호',r.company_name)}${formField('phone','전화번호',r.phone)}${formField('mobile','핸드폰',r.mobile)}${formField('address','주소',r.address,{full:true})}${selectField('membership_status','가입여부',['미가입','가입'],r.membership_status||'미가입')}${formField('membership_date','가입일자',r.membership_date)}${formField('approval_date','인가일자',r.approval_date)}${formField('certificate_issue_date','자격증명발급일자',r.certificate_issue_date)}${formField('certificate_number','자격증명발급번호',r.certificate_number)}${formField('vehicle_type','차종',r.vehicle_type)}${selectField('fuel_type','유종',["","경유","LPG","전기","휘발유","CNG","하이브리드"],r.fuel_type||'')}${formField('transferee','양수인',r.transferee)}${formField('transfer_region','이관/양도지역',r.transfer_region)}${textAreaField('reason','사유',r.reason)}${textAreaField('memo','비고',r.memo)}</form>`,`<button class="btn btn-soft" onclick="closeSheet()">취소</button><button class="btn btn-primary" onclick="saveClosure(${id??'null'})">${id?'저장':'등록'}</button>`);const sel=document.querySelector('#closureForm [name="closure_type"]');if(sel&&!id)sel.onchange=async()=>{try{const n=await apiRequest(`/api/closures/next-number/${encodeURIComponent(sel.value)}`);document.querySelector('#closureForm [name="management_number"]').value=n.next_number||'';}catch(_){}};};
window.saveClosure=async function(id){const f=document.getElementById('closureForm');if(!f.reportValidity())return;try{await apiRequest(id?`/api/closures/${id}`:'/api/closures',{method:id?'PUT':'POST',body:JSON.stringify(serializeForm(f))});closeSheet();showToast(id?'수정했습니다.':'등록했습니다.');renderClosureList(1);}catch(e){showToast(e.message,'err');}};
window.deleteClosureMobile=async function(id){if(!confirmAction('이 폐업현황 기록을 삭제할까?'))return;try{await apiRequest(`/api/closures/${id}`,{method:'DELETE'});closeSheet();showToast('삭제했습니다.');renderClosureList(1);}catch(e){showToast(e.message,'err');}};

// ---------------- 변경이력 ----------------
window.renderChangeList=async function(page=1){memberState.page=page;const body=document.getElementById('memberSectionBody'),f=memberState.filters;body.innerHTML=`<div class="toolbar-card"><div class="toolbar-title"><b>변경이력</b><button class="btn btn-primary btn-sm" onclick="openChangeForm()">+ 등록</button></div><div class="filters">${regionSelect('chRegion',f.region||'')}<input id="chType" class="control" value="${esc(f.change_type||'')}" placeholder="변경유형"><input id="chSearch" class="control full-filter" value="${esc(f.search||'')}" placeholder="성명·차량번호·변경 전/후"><button class="btn btn-primary btn-sm" onclick="changeSearch()">조회</button><button class="btn btn-soft btn-sm" onclick="resetChangeSearch()">초기화</button></div></div><div id="changeList">${loadingHtml()}</div>`;bindEnter('chSearch',()=>changeSearch());const q=new URLSearchParams({page,limit:30,date_order:'desc'});Object.entries(f).forEach(([k,v])=>v&&q.set(k,v));try{const d=await apiRequest(`/api/change-history?${q}`);const host=document.getElementById('changeList');if(!d.items?.length){host.innerHTML=emptyHtml();return;}host.innerHTML=`<div class="count-row">총 <b>${Number(d.total||0).toLocaleString()}</b>건</div><div class="mobile-list">${d.items.map(r=>`<button class="list-card" onclick="openChangeDetail(${r.id})"><div class="list-card-head"><div><b>${fmt(r.name)}</b><span>${fmt(r.vehicle_number)}</span></div>${badge(r.change_type||'변경','info')}</div><div class="list-meta"><span>${fmt(r.region)}</span><span>${fmt(r.change_date||r.receipt_date)}</span></div><div class="list-sub"><span>${fmt(r.before_value)}</span><span>→ ${fmt(r.after_value)}</span></div></button>`).join('')}</div>${pagerHtml(d.page,d.pages,'renderChangeList')}`;}catch(e){document.getElementById('changeList').innerHTML=errorHtml(e.message);}};
window.changeSearch=()=>{memberState.filters={region:document.getElementById('chRegion').value,change_type:document.getElementById('chType').value.trim(),search:document.getElementById('chSearch').value.trim()};renderChangeList(1);};window.resetChangeSearch=()=>{memberState.filters={};renderChangeList(1);};
window.openChangeDetail=async function(id){openSheet('변경이력 상세',loadingHtml());try{const r=await apiRequest(`/api/change-history/${id}`);openSheet('변경이력 상세',detailSection('기본 정보',[["변경유형",r.change_type],["처리일자",r.change_date||r.receipt_date],["접수일자",r.receipt_date],["지역",r.region],["차량번호",r.vehicle_number],["성명",r.name]])+detailSection('변경 내용',[["변경 전",r.before_value,true],["변경 후",r.after_value,true],["비고",r.memo,true]]),`<button class="btn btn-primary" onclick="openChangeForm(${id})">수정</button>${isAdminUser()?`<button class="btn btn-danger" onclick="deleteChangeMobile(${id})">삭제</button>`:''}`);}catch(e){openSheet('변경이력 상세',errorHtml(e.message));}};
window.openChangeForm=async function(id=null){let r={change_type:'주소지변경'};try{if(id)r=await apiRequest(`/api/change-history/${id}`);}catch(e){showToast(e.message,'err');return;}openSheet(id?'변경이력 수정':'변경이력 등록',`<form id="changeForm" class="form-grid">${formField('change_type','변경유형',r.change_type||'주소지변경',{required:true})}${selectField('region','지역',[{value:'',label:'지역 선택'},...GW_REGIONS],r.region)}${formField('vehicle_number','차량번호',r.vehicle_number,{required:true})}${formField('name','성명',r.name,{required:true})}${formField('before_value','변경 전',r.before_value,{full:true})}${formField('after_value','변경 후',r.after_value,{full:true})}${formField('change_date','처리일자',r.change_date)}${textAreaField('memo','비고',r.memo)}</form>`,`<button class="btn btn-soft" onclick="closeSheet()">취소</button><button class="btn btn-primary" onclick="saveChange(${id??'null'})">${id?'저장':'등록'}</button>`);};
window.saveChange=async function(id){const f=document.getElementById('changeForm');if(!f.reportValidity())return;try{await apiRequest(id?`/api/change-history/${id}`:'/api/change-history',{method:id?'PUT':'POST',body:JSON.stringify(serializeForm(f))});closeSheet();showToast(id?'수정했습니다.':'등록했습니다.');renderChangeList(1);}catch(e){showToast(e.message,'err');}};
window.deleteChangeMobile=async function(id){if(!confirmAction('이 변경이력을 삭제할까?'))return;try{await apiRequest(`/api/change-history/${id}`,{method:'DELETE'});closeSheet();showToast('삭제했습니다.');renderChangeList(1);}catch(e){showToast(e.message,'err');}};


const MEMBER_MODULE_BY_SECTION={members:'회원관리',allocation:'부과대수',candidates:'예정자',transfers:'양도양수대장',closures:'폐업현황',changes:'변경이력'};
window.openMemberModuleTools=function(){
  const module=MEMBER_MODULE_BY_SECTION[memberState.section]||'회원관리';
  const items=(window.MOBILE_TOOL_CATALOG||MOBILE_TOOL_CATALOG).filter(x=>x.module===module);
  openSheet(`${module} 전체 기능`,`<div class="action-grid">${items.map((x,i)=>`<button class="action-card" onclick="closeSheet();openCatalogAction('${module}',${i})"><b>${esc(x.label)}</b><span>${esc(x.screen)} · ${esc(x.operation)}</span><div class="tiny">${esc(x.method)} ${esc(x.path.replace('/api/','/'))}</div></button>`).join('')}</div>`);
};
