const receivableState={page:1,pages:1,filters:{q:'',region:'',account_type:'',billing_status:''},selected:null,meta:null};

async function renderReceivables(){
  document.getElementById('tabbar').style.display='flex'; document.getElementById('backBtn').style.visibility='hidden';
  document.getElementById('appbarTitle').textContent='미수금'; setActiveTab('receivables');
  const view=document.getElementById('view');
  view.innerHTML=`<section class="hero"><div class="eyebrow">수납·미수금</div><div class="hero-title">받아야 할 금액을<br>한눈에 확인해</div><div class="hero-sub">현재 미수금부터 회원별 수납·연락이력까지 바로 처리해.</div></section>
    <div id="recSummary">${loadingHtml()}</div>
    <div class="section-head"><div class="section-title">회원별 미수금</div><button class="link" onclick="openReceivableTools()">가져오기·엑셀</button></div>
    <div class="filters"><input class="control full-filter" id="rSearch" placeholder="성명·차량번호·전화번호" value="${esc(receivableState.filters.q)}">${regionSelect('rRegion',receivableState.filters.region)}
      <select id="rAccount" class="control"><option value="">전체 계정</option><option>협회비</option><option>관리비</option><option>70세</option></select>
      <select id="rBilling" class="control"><option value="">전체 상태</option><option value="arrears">미수</option><option value="settled">완납</option><option value="prepaid">선납</option><option value="pending">부과대기</option></select>
      <button class="btn btn-primary" onclick="searchReceivables()">조회</button><button class="btn btn-soft" onclick="resetReceivables()">초기화</button></div>
    <div id="recList" style="margin-top:14px">${loadingHtml()}</div>`;
  document.getElementById('rSearch').onkeydown=e=>{if(e.key==='Enter')searchReceivables()};
  await Promise.all([loadReceivableSummary(),loadReceivableMembers(1)]);
}

async function loadReceivableSummary(){
  try{
    const [d,dash]=await Promise.all([apiRequest('/api/receivables/summary'),apiRequest('/api/receivables/dashboard').catch(()=>null)]);
    const total=Number(d.active_arrears_total||0), members=Number(d.active_arrears_members||0), prepaid=Number(d.active_prepaid_total||0), pending=Number(d.pending_members||0);
    document.getElementById('recSummary').innerHTML=`<section class="kpi-dark"><div class="summary-label">현재 활성 미수금</div><div class="summary-number">${money(total)}</div><div class="progress"><i style="width:${Math.min(100,Math.max(8,Number(dash?.collection_rate||68)))}%"></i></div><div class="kpi-pairs"><div><span>미수 회원</span><strong>${num(members)}명</strong></div><div><span>신규 부과대기</span><strong>${num(pending)}명</strong></div><div><span>활성 선납금</span><strong>${money(prepaid)}</strong></div><div><span>오늘 수납</span><strong>${money(d.today_paid||0)}</strong></div></div></section>`;
  }catch(e){document.getElementById('recSummary').innerHTML=errorHtml(e.message)}
}

window.searchReceivables=function(){receivableState.filters={q:document.getElementById('rSearch').value.trim(),region:document.getElementById('rRegion').value,account_type:document.getElementById('rAccount').value,billing_status:document.getElementById('rBilling').value};loadReceivableMembers(1)};
window.resetReceivables=function(){receivableState.filters={q:'',region:'',account_type:'',billing_status:''};renderReceivables()};

window.loadReceivableMembers=async function(page=1){
  receivableState.page=page; const host=document.getElementById('recList'); if(!host)return; host.innerHTML=loadingHtml();
  // 이름/차량번호/전화번호로 존재 여부와 잔액을 확인하는 화면이므로 기본 조회는 활성회원 전체다.
  // '미수' 필터를 선택했을 때만 billing_status=arrears로 서버가 좁혀서 조회한다.
  const p=new URLSearchParams({scope:'active',closure_mode:'current',arrears_only:'false',contacted_only:'false',page:String(page),limit:'30'});
  Object.entries(receivableState.filters).forEach(([k,v])=>{if(v)p.set(k,v)});
  try{
    const d=await apiRequest(`/api/receivables/members?${p}`); receivableState.pages=Number(d.pages||1);
    host.innerHTML=`<div class="count-row">총 <b>${num(d.count||0)}</b>명</div><div class="mobile-list">${(d.items||[]).map(m=>{
      const bal=Number(m.balance||0), state=bal>0?badge('미수','warn'):bal<0?badge('선납','blue'):badge('완납','ok');
      return `<button class="list-card" onclick="openReceivableDetail(${Number(m.member_id)})"><div class="list-card-head"><div><b>${fmt(m.name)}</b><span>${fmt(m.vehicle_number)}</span></div>${state}</div><div class="list-meta"><span>${fmt(m.region)}</span><span>${fmt(m.account_type)}</span><span>${fmt(m.mobile||m.phone)}</span></div><div class="list-sub"><span>${m.first_charge_date?`첫 부과 ${fmt(m.first_charge_date)}`:''}</span><b>${bal<0?'선납 ':''}${money(Math.abs(bal))}</b></div></button>`}).join('')}</div>${pagerHtml(d.page,d.pages,'loadReceivableMembers')}`;
  }catch(e){host.innerHTML=errorHtml(e.message)}
};

window.openReceivableDetail=async function(id){receivableState.selected=id;openSheet('미수금 상세',loadingHtml());try{
  const d=await apiRequest(`/api/receivables/members/${id}?year=${new Date().getFullYear()}`); const m=d.member||d;
  const payments=d.payments||[], contacts=d.contacts||[], charges=d.charges||[];
  openSheet('미수금 상세',[
    detailSection('회원', [['성명',m.name],['차량번호',m.vehicle_number],['지역',m.region],['계정',m.account_type],['현재잔액',Number(m.balance||0)<0?`선납 ${money(Math.abs(Number(m.balance||0)))}`:money(m.balance||0)]]),
    `<section class="detail-section"><h3>최근 수납</h3>${payments.length?`<div class="mobile-list">${payments.slice(0,5).map(x=>`<div class="list-card"><div class="list-card-head"><div><b>${money(x.amount)}</b><span>${fmt(x.payment_date)}</span></div><button class="btn btn-danger btn-sm" onclick="deleteReceivablePayment(${Number(x.id)},${id})">삭제</button></div><div class="list-meta"><span>${fmt(x.method)}</span><span>${fmt(x.memo)}</span></div></div>`).join('')}</div>`:emptyHtml('수납 기록이 없습니다.')}</section>`,
    `<section class="detail-section"><h3>최근 연락</h3>${contacts.length?contacts.slice(0,5).map(x=>`<div class="notice"><b>${fmt(x.contact_date)} · ${fmt(x.status)}</b><br>${fmt(x.contact_method)} · ${fmt(x.memo)}</div>`).join(''):emptyHtml('연락 기록이 없습니다.')}</section>`
  ].join(''),`<button class="btn btn-soft" onclick="openBalanceForm(${id},${Number(m.balance||0)})">잔액수정</button><button class="btn btn-soft" onclick="openContactForm(${id})">연락기록</button><button class="btn btn-primary" onclick="openPaymentForm(${id},${Number(m.balance||0)})">입금등록</button>`);
}catch(e){openSheet('미수금 상세',errorHtml(e.message))}};

window.openPaymentForm=function(id,balance){openSheet('입금 등록',`<form id="paymentForm" class="form-grid">${formField('payment_date','입금일',new Date().toISOString().slice(0,10),{type:'date',required:true})}${formField('amount','입금액',balance>0?balance:'',{type:'number',required:true})}${selectField('method','입금방법',['계좌이체','현금','카드','지로','기타'],'계좌이체')}${textAreaField('memo','메모','')}</form>`,`<button class="btn btn-soft" onclick="closeSheet()">취소</button><button class="btn btn-primary" onclick="saveReceivablePayment(${id})">저장</button>`)};
window.saveReceivablePayment=async function(id){const f=document.getElementById('paymentForm');if(!f.reportValidity())return;const d=serializeForm(f);d.amount=Number(d.amount||0);try{await apiRequest(`/api/receivables/members/${id}/payments`,{method:'POST',body:JSON.stringify(d)});showToast('입금을 저장했습니다.');await loadReceivableSummary();openReceivableDetail(id)}catch(e){showToast(e.message,'err')}};
window.deleteReceivablePayment=async function(pid,mid){if(!confirmAction('이 입금 기록을 삭제할까?'))return;try{await apiRequest(`/api/receivables/payments/${pid}`,{method:'DELETE'});showToast('입금 기록을 삭제했습니다.');openReceivableDetail(mid);loadReceivableSummary()}catch(e){showToast(e.message,'err')}};
window.openBalanceForm=function(id,balance){openSheet('잔액 수정',`<div class="notice">현재 ${balance<0?'선납 '+money(Math.abs(balance)):money(balance)}</div><form id="balanceForm" class="form-grid">${selectField('balance_type','구분',['미수금','완납','선납'],balance<0?'선납':balance>0?'미수금':'완납')}${formField('amount','금액',Math.abs(balance),{type:'number'})}${formField('effective_date','적용일',new Date().toISOString().slice(0,10),{type:'date'})}${textAreaField('reason','수정 사유','')}</form>`,`<button class="btn btn-soft" onclick="closeSheet()">취소</button><button class="btn btn-primary" onclick="saveReceivableBalance(${id})">저장</button>`)};
window.saveReceivableBalance=async function(id){const d=serializeForm(document.getElementById('balanceForm'));d.amount=Number(d.amount||0);try{await apiRequest(`/api/receivables/members/${id}/balance`,{method:'PATCH',body:JSON.stringify(d)});showToast('잔액을 수정했습니다.');loadReceivableSummary();openReceivableDetail(id)}catch(e){showToast(e.message,'err')}};
window.openContactForm=function(id){openSheet('연락 기록',`<form id="contactForm" class="form-grid">${formField('contact_date','연락일',new Date().toISOString().slice(0,10),{type:'date',required:true})}${selectField('contact_method','방법',['전화','문자','카카오톡','우편','방문','기타'],'전화')}${selectField('status','상태',['연락완료','부재','납부약속','재연락','거부','기타'],'연락완료')}${textAreaField('memo','내용','')}</form>`,`<button class="btn btn-soft" onclick="closeSheet()">취소</button><button class="btn btn-primary" onclick="saveReceivableContact(${id})">저장</button>`)};
window.saveReceivableContact=async function(id){try{await apiRequest(`/api/receivables/members/${id}/contacts`,{method:'POST',body:JSON.stringify(serializeForm(document.getElementById('contactForm')))});showToast('연락 기록을 저장했습니다.');openReceivableDetail(id)}catch(e){showToast(e.message,'err')}};

window.openReceivableTools=function(){openSheet('미수금 도구',`<div class="action-grid"><button class="action-card" onclick="openReceivableMonthly()"><b>월별 분석</b><span>월말 미수·수납 흐름 비교</span><div class="tiny">GET /monthly-analysis</div></button><button class="action-card" onclick="downloadApiFile('/api/receivables/export.xlsx','미수금.xlsx')"><b>엑셀 내보내기</b><span>현재 미수금 원장 다운로드</span><div class="tiny">XLSX</div></button><button class="action-card" onclick="openReceivableImport()"><b>입금파일 가져오기</b><span>통장·결제 파일 미리보기 후 반영</span><div class="tiny">미리보기 → 매칭 → 반영</div></button><button class="action-card" onclick="runJsonTool('미수금 메타','GET','/api/receivables/meta')"><b>코드·옵션</b><span>서버 메타정보 확인</span><div class="tiny">GET /meta</div></button><button class="action-card" onclick="closeSheet();renderCatalogModule('미수금')"><b>전체 미수금 기능</b><span>가져오기·수납·잔액·계좌 등 18개</span><div class="tiny">매핑표 전체</div></button></div>`)};
window.openReceivableMonthly=async function(){openSheet('월별 분석',loadingHtml());try{const d=await apiRequest('/api/receivables/monthly-analysis');openSheet('월별 분석',`<div class="json-box">${esc(JSON.stringify(d,null,2))}</div>`)}catch(e){openSheet('월별 분석',errorHtml(e.message))}};
window.openReceivableImport=function(){openSheet('입금파일 가져오기',`<div class="notice">파일을 먼저 분석하고 자동매칭 결과를 확인한 뒤에만 반영해.</div><form id="recImportForm"><label class="form-field"><span>자료구분</span><select name="source_type" class="control"><option value="bank">통장</option><option value="card">카드</option><option value="giro">지로</option><option value="cash">현금</option></select></label><label class="form-field" style="margin-top:12px"><span>파일</span><input id="recImportFile" type="file" class="control"></label></form><div id="recImportResult"></div>`,`<button class="btn btn-soft" onclick="closeSheet()">닫기</button><button class="btn btn-primary" onclick="previewReceivableImport()">미리보기</button>`)};
window.previewReceivableImport=async function(){const file=document.getElementById('recImportFile').files?.[0];if(!file)return showToast('파일을 선택해줘.','warn');const fd=new FormData();fd.append('source_type',new FormData(document.getElementById('recImportForm')).get('source_type'));fd.append('file',file);try{const d=await apiUpload('/api/receivables/imports/preview',fd);document.getElementById('recImportResult').innerHTML=`<div class="notice"><b>분석 완료</b><br>배치 ID ${fmt(d.batch?.id)} · 자동매칭 ${num(d.batch?.matched_rows||0)}건 · 확인필요 ${num(d.batch?.review_rows||0)}건</div>${d.batch?.id?`<button class="btn btn-primary" onclick="postReceivableImport(${Number(d.batch.id)})">자동매칭 건 반영</button>`:''}`;}catch(e){showToast(e.message,'err')}};
window.postReceivableImport=async function(id){if(!confirmAction('자동매칭된 입금 건을 원장에 반영할까?'))return;try{const d=await apiRequest(`/api/receivables/imports/${id}/post`,{method:'POST',body:'{}'});showToast(`반영 완료 ${d.posted_rows||''}`);loadReceivableSummary();closeSheet()}catch(e){showToast(e.message,'err')}};
