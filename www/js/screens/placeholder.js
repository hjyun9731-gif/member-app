// screens/placeholder.js — 회원 / 미수금 / 더보기: 다음 단계에서 실제 화면으로 교체 예정
function renderPlaceholder(tabName, title) {
  const view = document.getElementById("view");
  document.getElementById("tabbar").style.display = "flex";
  document.getElementById("backBtn").style.visibility = "hidden";
  document.getElementById("appbarTitle").textContent = title;
  setActiveTab(tabName);
  view.innerHTML = `
    <div class="card empty">
      "${title}" 화면은 다음 단계에서 실제 API(회원/미수금/자격증명 등)와 함께 구현됩니다.<br>
      지금은 로그인/토큰/탭 이동/홈 대시보드까지 실제 서버와 연결된 상태를 확인하는 단계입니다.
    </div>`;
}
