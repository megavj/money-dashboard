/* money-dashboard shim: 원본 대시보드(dashboard.html)를 그대로 쓰고, 로그인과 데이터 통신만 Supabase로 바꿔 줌 */
(function(){
const SB=supabase.createClient("https://ztypllzgjivutzorhayz.supabase.co","sb_publishable_2oRYJ0sJcdPGBr3SK_XH0Q_SuA_yvHX",
 {auth:{persistSession:true,autoRefreshToken:true,storage:window.localStorage,storageKey:"money-dash-auth",detectSessionInUrl:true}});
window.__moneySB=SB;
let readyRes;const ready=new Promise(r=>readyRes=r);let shown=false;
const origFetch=window.fetch.bind(window);
async function gunzipB64(b64){const bin=atob(b64);const u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);
 return await new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip'))).text()}
const J=(o,s)=>new Response(typeof o==='string'?o:JSON.stringify(o),{status:s||200,headers:{'Content-Type':'application/json'}});
let staleEl=null;
function stale(ts){const a=(Date.now()-new Date(ts).getTime())/1000;
 if(!staleEl){staleEl=document.createElement('div');staleEl.style.cssText='position:fixed;top:0;left:0;right:0;z-index:99998;background:#b3263a;color:#fff;font:13px sans-serif;text-align:center;padding:3px;display:none';document.body&&document.body.appendChild(staleEl)}
 if(a>90){staleEl.textContent='⚠ 맥 미니와 연결이 끊겼습니다 — '+Math.round(a/60)+'분 전 자료';staleEl.style.display='block'}else staleEl.style.display='none'}
async function getBlob(key){await ready;
 let {data,error}=await SB.from('dash_blob').select('gz,updated_at').eq('key',key).maybeSingle();
 if(error&&/JWT|auth|token/i.test(error.message)){await SB.auth.refreshSession();({data,error}=await SB.from('dash_blob').select('gz,updated_at').eq('key',key).maybeSingle())}
 if(error)return J({ok:false,error:error.message},500);
 if(!data)return J({ok:false,error:'아직 데이터 없음'},404);
 try{stale(data.updated_at)}catch(e){}
 return J(await gunzipB64(data.gz))}
async function runCmd(action,body){await ready;
 const {data,error}=await SB.from('dash_cmd').insert({action,params:body||{}}).select('id').single();
 if(error)return J({ok:false,error:'요청 실패: '+error.message});
 for(let i=0;i<60;i++){await new Promise(r=>setTimeout(r,1000));
  const {data:r}=await SB.from('dash_cmd').select('status,result').eq('id',data.id).single();
  if(r&&r.status!=='queued'&&r.status!=='running')return J(r.result||{ok:r.status==='done',error:r.status==='done'?null:r.status})}
 return J({ok:false,error:'맥 미니 응답 대기 중입니다. 잠시 후 현황에서 확인하세요'})}
window.fetch=async function(input,init){
 const url=new URL(typeof input==='string'?input:input.url,location.href);
 if(url.origin===location.origin){
  const m=url.pathname.match(/\/(data|terminal|extra)\.json$/);
  if(m){const pg=url.searchParams.get('page');const key=m[1]+(m[1]==='extra'?'':':'+(pg==='stock'?'stock':'coin'));return getBlob(key)}
  const a=url.pathname.match(/\/api\/([a-z\/-]+)$/);
  if(a&&init&&String(init.method||'').toUpperCase()==='POST'){let b={};try{b=JSON.parse(init.body||'{}')}catch(e){}return runCmd(a[1],b)}
 }
 return origFetch(input,init)};
function gate(){if(shown)return;shown=true;
 const o=document.createElement('div');o.id='mgate';
 o.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(5,8,14,.97);display:flex;align-items:center;justify-content:center;font:15px -apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo",sans-serif;color:#dfe7f5';
 o.innerHTML='<div style="background:#141a26;border:1px solid #243047;border-radius:12px;padding:20px;width:min(92vw,380px)"><b style="font-size:17px">💰 MONEY 로그인</b><div style="color:#8796b0;font-size:13px;margin:6px 0 12px">등록된 이메일로 받은 숫자 인증번호를 입력하세요. 한 번 로그인하면 계속 유지됩니다.</div>'+
 '<input id="mg_em" type="email" placeholder="이메일" autocomplete="email" style="width:100%;padding:10px;border-radius:8px;border:1px solid #243047;background:#0f1420;color:#dfe7f5;font-size:15px;box-sizing:border-box"><button id="mg_send" style="margin-top:8px;width:100%;padding:10px;border-radius:8px;border:1px solid #243047;background:#1c2436;color:#dfe7f5;font-size:15px">인증 메일 받기</button>'+
 '<input id="mg_code" inputmode="numeric" placeholder="인증번호" autocomplete="one-time-code" style="margin-top:12px;width:100%;padding:10px;border-radius:8px;border:1px solid #243047;background:#0f1420;color:#dfe7f5;font-size:15px;box-sizing:border-box"><button id="mg_ok" style="margin-top:8px;width:100%;padding:10px;border-radius:8px;border:0;background:#1f6feb;color:#fff;font-size:15px">확인</button><div id="mg_msg" style="color:#8796b0;font-size:13px;margin-top:8px"></div></div>';
 document.body.appendChild(o);const $=i=>document.getElementById(i);
 $('mg_send').onclick=async()=>{const e=$('mg_em').value.trim().toLowerCase();if(!e)return;$('mg_send').disabled=true;
  const {error}=await SB.auth.signInWithOtp({email:e,options:{shouldCreateUser:false,emailRedirectTo:location.origin+location.pathname}});$('mg_send').disabled=false;
  $('mg_msg').textContent=error?'보내지 못했습니다: '+error.message:'인증 메일을 보냈습니다. 메일의 숫자 인증번호를 입력하세요.'};
 $('mg_ok').onclick=async()=>{const {error}=await SB.auth.verifyOtp({email:$('mg_em').value.trim().toLowerCase(),token:$('mg_code').value.trim(),type:'email'});
  if(error)$('mg_msg').textContent='인증 실패: '+error.message;else{o.remove();shown=false;readyRes()}}}
function onDom(f){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',f):f()}
SB.auth.getSession().then(({data})=>{
 if(location.hash.includes('access_token')||location.search.includes('code='))history.replaceState(null,'',location.pathname);
 if(data.session)readyRes();else onDom(gate)});
SB.auth.onAuthStateChange((ev,s)=>{if(s&&(ev==='SIGNED_IN'||ev==='INITIAL_SESSION')){const g=document.getElementById('mgate');if(g){g.remove();shown=false}readyRes()}
 else if(ev==='SIGNED_OUT')onDom(gate)});
})();
