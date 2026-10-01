// api.js — 기존 Railway 백엔드(FastAPI, JWT Bearer 인증) 공통 클라이언트
// 이 앱은 신규 백엔드를 만들지 않고 기존 운영 서버를 그대로 호출합니다.
const API_BASE = "https://member-management-production.up.railway.app";

const TokenStore = {
  async get() {
    try {
      const { Preferences } = window.Capacitor?.Plugins || {};
      if (Preferences) return (await Preferences.get({ key: "gw_token" })).value;
    } catch (e) {}
    return localStorage.getItem("gw_token");
  },
  async set(v) {
    try {
      const { Preferences } = window.Capacitor?.Plugins || {};
      if (Preferences) return await Preferences.set({ key: "gw_token", value: v || "" });
    } catch (e) {}
    localStorage.setItem("gw_token", v || "");
  },
  async clear() { await this.set(""); },
};

async function apiLogin(username, password) {
  const body = new URLSearchParams();
  body.set("username", username);
  body.set("password", password);
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const detail = (await res.json().catch(() => ({}))).detail || "로그인에 실패했습니다.";
    throw new Error(detail);
  }
  const data = await res.json(); // { access_token, token_type, username, role, full_name }
  await TokenStore.set(data.access_token);
  localStorage.setItem("gw_user", JSON.stringify(data));
  return data;
}

async function apiRequest(path, options = {}) {
  const token = await TokenStore.get();
  const headers = Object.assign(
    { "Content-Type": "application/json" },
    token ? { Authorization: `Bearer ${token}` } : {},
    options.headers || {}
  );
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (res.status === 401) {
    await TokenStore.clear();
    location.hash = "#/login";
    throw new Error("세션이 만료되었습니다. 다시 로그인해주세요.");
  }
  if (!res.ok) {
    const detail = (await res.json().catch(() => ({}))).detail || `요청 실패 (${res.status})`;
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : res.text();
}

function getCachedUser() {
  try { return JSON.parse(localStorage.getItem("gw_user") || "null"); } catch (e) { return null; }
}

async function apiUpload(path, formData, method='POST') {
  const token = await TokenStore.get();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(`${API_BASE}${path}`, { method, headers, body: formData });
  if (res.status === 401) { await TokenStore.clear(); location.hash='#/login'; throw new Error('세션이 만료되었습니다. 다시 로그인해주세요.'); }
  const data = await res.json().catch(()=>({}));
  if (!res.ok) throw new Error(data.detail || `요청 실패 (${res.status})`);
  return data;
}

async function downloadApiFile(path, fallbackName='download.xlsx') {
  try {
    const token = await TokenStore.get();
    const res = await fetch(`${API_BASE}${path}`, {headers: token ? {Authorization:`Bearer ${token}`} : {}});
    if (!res.ok) { const d=await res.json().catch(()=>({})); throw new Error(d.detail || `다운로드 실패 (${res.status})`); }
    const blob = await res.blob();
    const cd = res.headers.get('content-disposition') || '';
    let filename=fallbackName;
    const m=cd.match(/filename\*=UTF-8''([^;]+)/i); if(m){try{filename=decodeURIComponent(m[1])}catch(_){}}
    const url=URL.createObjectURL(blob), a=document.createElement('a'); a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    showToast('파일을 내려받았습니다.');
  } catch(e){ showToast(e.message,'err'); }
}
