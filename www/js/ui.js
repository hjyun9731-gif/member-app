const GW_REGIONS = [
  "춘천시","원주시","강릉시","동해시","태백시","속초시","삼척시",
  "홍천군","횡성군","영월군","평창군","정선군","철원군","화천군",
  "양구군","인제군","고성군","양양군"
];

function esc(v) {
  return String(v ?? "").replace(/[&<>'"]/g, (ch) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"
  }[ch]));
}

function fmt(v, fallback = "-") {
  const s = String(v ?? "").trim();
  return s && s !== "0" ? esc(s) : fallback;
}

function badge(text, tone = "gray") {
  return `<span class="badge b-${tone}">${esc(text || "-")}</span>`;
}

function statusBadge(v) {
  if (v === "가입") return badge(v, "ok");
  if (v === "미가입") return badge(v, "warn");
  return badge(v || "-", "gray");
}

function showToast(message, kind = "ok") {
  let host = document.getElementById("toastHost");
  if (!host) {
    host = document.createElement("div");
    host.id = "toastHost";
    document.body.appendChild(host);
  }
  const el = document.createElement("div");
  el.className = `toast ${kind === "err" ? "toast-err" : kind === "warn" ? "toast-warn" : ""}`;
  el.textContent = message;
  host.appendChild(el);
  setTimeout(() => el.classList.add("show"), 10);
  setTimeout(() => { el.classList.remove("show"); setTimeout(() => el.remove(), 180); }, 2300);
}

function openSheet(title, html, actions = "") {
  closeSheet();
  const host = document.createElement("div");
  host.id = "sheetHost";
  host.className = "sheet-host";
  host.innerHTML = `
    <div class="sheet-backdrop" onclick="closeSheet()"></div>
    <section class="sheet" role="dialog" aria-modal="true">
      <div class="sheet-head"><h2>${esc(title)}</h2><button class="icon-btn" onclick="closeSheet()">✕</button></div>
      <div class="sheet-body">${html}</div>
      ${actions ? `<div class="sheet-actions">${actions}</div>` : ""}
    </section>`;
  document.body.appendChild(host);
  requestAnimationFrame(() => host.classList.add("open"));
}

function closeSheet() {
  const host = document.getElementById("sheetHost");
  if (host) host.remove();
}

function confirmAction(message) {
  return window.confirm(message);
}

function loadingHtml(text = "불러오는 중...") {
  return `<div class="loading"><span class="spinner"></span><span>${esc(text)}</span></div>`;
}

function emptyHtml(text = "데이터가 없습니다.") {
  return `<div class="empty">${esc(text)}</div>`;
}

function errorHtml(message) {
  return `<div class="card error-card"><b>불러오지 못했습니다</b><p>${esc(message)}</p></div>`;
}

function regionSelect(id, value = "", includeAll = true) {
  return `<select id="${esc(id)}" class="control">
    ${includeAll ? '<option value="">전체 지역</option>' : '<option value="">지역 선택</option>'}
    ${GW_REGIONS.map(r => `<option value="${esc(r)}" ${r === value ? "selected" : ""}>${esc(r)}</option>`).join("")}
  </select>`;
}

function formField(name, label, value = "", opts = {}) {
  const type = opts.type || "text";
  const cls = opts.full ? " form-field full" : " form-field";
  const req = opts.required ? "required" : "";
  const placeholder = opts.placeholder ? `placeholder="${esc(opts.placeholder)}"` : "";
  return `<label class="${cls.trim()}"><span>${esc(label)}${opts.required ? ' <em>*</em>' : ''}</span>
    <input class="control" name="${esc(name)}" type="${esc(type)}" value="${esc(value ?? "")}" ${req} ${placeholder}>
  </label>`;
}

function textAreaField(name, label, value = "", full = true) {
  return `<label class="form-field ${full ? "full" : ""}"><span>${esc(label)}</span>
    <textarea class="control textarea" name="${esc(name)}" rows="3">${esc(value ?? "")}</textarea>
  </label>`;
}

function selectField(name, label, options, value = "", full = false) {
  return `<label class="form-field ${full ? "full" : ""}"><span>${esc(label)}</span>
    <select class="control" name="${esc(name)}">${options.map(o => {
      const val = typeof o === "string" ? o : o.value;
      const lab = typeof o === "string" ? o : o.label;
      return `<option value="${esc(val)}" ${String(val) === String(value ?? "") ? "selected" : ""}>${esc(lab)}</option>`;
    }).join("")}</select>
  </label>`;
}

function serializeForm(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function detailGrid(fields) {
  const visible = fields.filter(([,v]) => String(v ?? "").trim());
  if (!visible.length) return "";
  return `<div class="detail-grid">${visible.map(([k,v,full]) => `
    <div class="detail-item ${full ? "full" : ""}"><span>${esc(k)}</span><b>${fmt(v)}</b></div>`).join("")}</div>`;
}

function detailSection(title, fields) {
  const grid = detailGrid(fields);
  return grid ? `<section class="detail-section"><h3>${esc(title)}</h3>${grid}</section>` : "";
}

function pagerHtml(page, pages, fnName) {
  const p = Number(page || 1), total = Number(pages || 1);
  if (total <= 1) return "";
  return `<div class="pager">
    <button class="btn btn-soft btn-sm" ${p <= 1 ? "disabled" : ""} onclick="${fnName}(${p-1})">이전</button>
    <span>${p} / ${total}</span>
    <button class="btn btn-soft btn-sm" ${p >= total ? "disabled" : ""} onclick="${fnName}(${p+1})">다음</button>
  </div>`;
}

function isAdminUser() {
  const u = getCachedUser();
  return String(u?.role || "").toLowerCase() === "admin";
}
