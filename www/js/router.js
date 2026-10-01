async function route(){
  const hash=location.hash||'#/home', token=await TokenStore.get();
  if(!token && hash!=='#/login'){location.hash='#/login';return}
  if(token && hash==='#/login'){location.hash='#/home';return}
  if(hash==='#/login')return renderLogin();
  if(hash==='#/home')return renderHome();
  if(hash==='#/members')return renderMembers();
  if(hash==='#/receivables')return renderReceivables();
  if(hash==='#/more')return renderMore();
  if(hash.startsWith('#/more/'))return renderMore(hash.split('/')[2]||'');
  location.hash='#/home';
}
window.addEventListener('hashchange',route);
window.addEventListener('DOMContentLoaded',()=>{
  document.querySelectorAll('.tab').forEach(btn=>btn.addEventListener('click',()=>{location.hash='#/'+btn.dataset.tab}));
  route();
});
