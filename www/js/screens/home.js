async function renderHome() {
  const view = document.getElementById("view");
  document.getElementById("tabbar").style.display = "flex";
  document.getElementById("backBtn").style.visibility = "hidden";
  document.getElementById("appbarTitle").textContent = "강원 개인소형화물";
  setActiveTab("home");
  const user = getCachedUser();
  const now = new Date();
  const dateText = new Intl.DateTimeFormat('ko-KR',{year:'numeric',month:'long',day:'numeric',weekday:'short'}).format(now);
  view.innerHTML = `
    <section class="hero">
      <div class="eyebrow">${esc(dateText)}</div>
      <div class="hero-title">${user?.full_name ? esc(user.full_name)+"님, " : ""}오늘 업무를<br>바로 확인해</div>
      <div class="hero-sub">회원·미수금·예정자·최근 변경사항을 한 화면에서 확인해.</div>
    </section>
    <section class="card summary-card" id="homeSummary">${loadingHtml()}</section>
    <div class="section-head"><div class="section-title">오늘 확인할 일</div><button class="link" onclick="location.hash='#/more/stats'">전체보기</button></div>
    <div class="task-list" id="homeTasks">
      <div class="task"><div class="task-ico blue">₩</div><div class="task-body"><div class="task-title">미수금 불러오는 중</div><div class="task-sub">잠시만 기다려줘</div></div></div>
    </div>
    <div class="section-head"><div class="section-title">빠른 업무</div></div>
    <div class="quick">
      <button onclick="location.hash='#/members'"><div class="qico">⌕</div><span>회원조회</span></button>
      <button onclick="location.hash='#/members';setTimeout(()=>switchMemberSection('candidates'),120)"><div class="qico">＋</div><span>예정자</span></button>
      <button onclick="location.hash='#/members';setTimeout(()=>switchMemberSection('transfers'),120)"><div class="qico">⇄</div><span>양도양수</span></button>
      <button onclick="location.hash='#/more/deadlines'"><div class="qico">✓</div><span>기한관리</span></button>
    </div>
    <div id="homeErr"></div>`;

  try {
    const [full, rec, recent, candidateData] = await Promise.all([
      apiRequest('/api/dashboard/full-stats'),
      apiRequest('/api/receivables/summary').catch(()=>null),
      apiRequest('/api/dashboard/recent-by-type?limit=5').catch(()=>null),
      // 예정자 수는 대시보드 집계값에 의존하지 않고 실제 예정자 목록 API의 total을 사용한다.
      apiRequest('/api/candidates?page=1&limit=1').catch(()=>null),
    ]);
    const s = full.summary || {};
    document.getElementById('homeSummary').innerHTML = `
      <div class="summary-top"><div><div class="summary-label">전체 관리 회원</div><div class="summary-number">${num(s.total)}<small>명</small></div></div><div class="badge b-blue">실시간</div></div>
      <div class="summary-grid"><div class="metric"><strong>${num(s.not_joined)}</strong><span>미가입</span></div><div class="metric"><strong>${num(s.individual)}</strong><span>개인</span></div><div class="metric"><strong>${num(s.delivery)}</strong><span>택배</span></div></div>`;

    const recTotal = pickNumber(rec, ['total_balance','total_arrears','balance','arrears_total','total']) ;
    const recMembers = pickNumber(rec, ['member_count','arrears_members','members','count']);
    const candidates = Number(candidateData?.total ?? s.candidates ?? 0);
    const recentCount = Array.isArray(recent) ? recent.length : Array.isArray(recent?.items) ? recent.items.length : Number(recent?.total || 0);
    document.getElementById('homeTasks').innerHTML = `
      <button class="task" onclick="location.hash='#/receivables'"><div class="task-ico blue">₩</div><div class="task-body"><div class="task-title">미수금 확인</div><div class="task-sub">${recMembers ? `미수 회원 ${num(recMembers)}명` : '회원별 미수 현황'}${recTotal ? ` · ${money(recTotal)}` : ''}</div></div><div class="chev">›</div></button>
      <button class="task" onclick="location.hash='#/members';setTimeout(()=>switchMemberSection('candidates'),120)"><div class="task-ico orange">＋</div><div class="task-body"><div class="task-title">예정자 ${num(candidates)}명</div><div class="task-sub">등록 대기 예정자 확인</div></div><div class="chev">›</div></button>
      <button class="task" onclick="location.hash='#/more/stats'"><div class="task-ico green">↻</div><div class="task-body"><div class="task-title">최근 변경사항${recentCount ? ` ${num(recentCount)}건` : ''}</div><div class="task-sub">양도양수·폐업·변경이력 확인</div></div><div class="chev">›</div></button>`;
  } catch (e) {
    document.getElementById('homeErr').innerHTML = errorHtml(e.message);
  }
}
function num(v){ const n=Number(v); return Number.isFinite(n)?n.toLocaleString('ko-KR'):'-'; }
function money(v){ const n=Number(v); return Number.isFinite(n)?n.toLocaleString('ko-KR')+'원':'-'; }
function pickNumber(obj, keys){ for(const k of keys){ const n=Number(obj?.[k]); if(Number.isFinite(n)) return n; } return 0; }
function setActiveTab(name){ document.querySelectorAll('.tab').forEach(el=>el.classList.toggle('on',el.dataset.tab===name)); }
