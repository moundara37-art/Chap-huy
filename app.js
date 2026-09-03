const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    storageKey: "peo-mary-debt-auth"
  }
});

let people = [], debts = [], payments = [], currentHistoryPersonId = null, loadingApp = false;
const $ = id => document.getElementById(id);
const money = n => new Intl.NumberFormat("km-KH").format(Number(n || 0)) + "៛";
const today = () => new Date().toISOString().slice(0,10);
const esc = s => String(s ?? "").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
function toast(msg, ok=true){const t=$("toast");t.textContent=msg;t.className=ok?"show ok":"show bad";clearTimeout(window.__toastTimer);window.__toastTimer=setTimeout(()=>t.className="",2500)}

const SETTINGS_KEY="peo-mary-settings-v2";
function getSettings(){try{return JSON.parse(localStorage.getItem(SETTINGS_KEY)||"{}")}catch{return {}}}
function saveSettings(v){localStorage.setItem(SETTINGS_KEY,JSON.stringify(v))}
function applySettings(){
  const st=getSettings();
  const name=st.shopName||"ហាង ពៅមារី";
  $("shopNameDisplay").textContent=name;
  $("shopNameInput").value=name;
  document.body.dataset.bg=st.background||"shop";
  if(st.customBackground) document.body.style.setProperty("--custom-bg",`url("${st.customBackground}")`);
  else document.body.style.removeProperty("--custom-bg");
  document.querySelectorAll(".bg-option").forEach(b=>b.classList.toggle("active",b.dataset.bg===(st.background||"shop")));
}
function openSettings(){applySettings();openDialog("settingsDialog")}

function openDialog(id){$(id).showModal()}
function closeDialogs(){document.querySelectorAll("dialog[open]").forEach(d=>d.close())}
document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",closeDialogs));

async function init(){
  const {data:{session},error}=await client.auth.getSession();
  if(error){console.error(error);$("loginScreen").classList.remove("hidden");}
  else if(session){await showApp();}
  else{$("loginScreen").classList.remove("hidden");}

  client.auth.onAuthStateChange((event, session)=>{
    if(session && ["SIGNED_IN","TOKEN_REFRESHED","INITIAL_SESSION"].includes(event)){
      showApp();
    }else if(event === "SIGNED_OUT"){
      $("app").classList.add("hidden");
      $("loginScreen").classList.remove("hidden");
    }
  });
}

async function showApp(){
  if(loadingApp)return;
  loadingApp=true;
  $("loginScreen").classList.add("hidden");
  $("app").classList.remove("hidden");
  try{await loadAll();}finally{loadingApp=false;}
}

async function loadAll(){
  const [{data:p,error:e1},{data:d,error:e2},{data:pa,error:e3}] = await Promise.all([
    client.from("customers").select("*").order("created_at",{ascending:false}),
    client.from("debts").select("*").order("debt_date",{ascending:false}),
    client.from("payments").select("*").order("payment_date",{ascending:false})
  ]);
  if(e1||e2||e3){toast("មិនអាចទាញទិន្នន័យបាន។ សូមពិនិត្យ SQL និង Supabase key",false);console.error(e1,e2,e3);return}
  people=p||[];debts=d||[];payments=pa||[];render();
}

function totals(personId){
  const d=debts.filter(x=>x.customer_id===personId).reduce((a,x)=>a+Number(x.amount||0),0);
  const p=payments.filter(x=>x.customer_id===personId).reduce((a,x)=>a+Number(x.amount||0),0);
  return {d,p,r:Math.max(0,d-p)};
}

function render(){
  $("peopleCount").textContent=people.length;
  const td=debts.reduce((a,x)=>a+Number(x.amount||0),0), tp=payments.reduce((a,x)=>a+Number(x.amount||0),0);
  $("totalDebt").textContent=money(td);$("totalPaid").textContent=money(tp);$("totalRemain").textContent=money(Math.max(0,td-tp));
  const q=$("searchInput").value.trim().toLowerCase();
  const list=people.filter(p=>(p.name+" "+(p.phone||"")).toLowerCase().includes(q));
  $("peopleLabel").textContent=q?`រកឃើញ ${list.length} នាក់`:`សរុប ${people.length} នាក់`;
  $("peopleList").innerHTML=list.length?list.map(p=>{
    const t=totals(p.id);
    return `<article class="person-card">
      <div class="person-head">
        <div class="person-avatar">👤</div>
        <div class="person-main"><div class="person-name">${esc(p.name)}</div><div class="phone">☎ ${esc(p.phone||"មិនមានលេខទូរស័ព្ទ")}</div></div>
        <button class="history-pill" onclick="history('${p.id}')">◷ ប្រវត្តិ</button>
      </div>
      <div class="amounts"><div class="amount"><label>ជំពាក់សរុប</label><b>${money(t.d)}</b></div><div class="amount"><label>បានសង</label><b class="paid">${money(t.p)}</b></div><div class="amount"><label>នៅសល់</label><b class="remain">${money(t.r)}</b></div></div>
      <div class="actions"><button class="btn blue" onclick="addDebt('${p.id}')">＋ ជំពាក់</button><button class="btn green" onclick="addPayment('${p.id}')">✓ សង</button><button class="btn blue" onclick="history('${p.id}')">◷ ប្រវត្តិ</button><button class="btn" onclick="editPerson('${p.id}')">✎ កែ</button><button class="btn red" onclick="deletePerson('${p.id}')">▣ លុប</button></div>
    </article>`;
  }).join(""):`<div class="empty">មិនទាន់មានអ្នកជំពាក់។<br>ចុច «អ្នកជំពាក់ថ្មី» ដើម្បីចាប់ផ្តើម។</div>`;
}

$("searchInput").addEventListener("input",render);
$("settingsBtn").onclick=openSettings;
$("settingsNavBtn").onclick=openSettings;
$("saveShopNameBtn").onclick=()=>{
  const st=getSettings(); const name=$("shopNameInput").value.trim()||"ហាង ពៅមារី";
  st.shopName=name; saveSettings(st); applySettings(); toast("បានរក្សាទុកឈ្មោះហាង ✓");
};
document.querySelectorAll(".bg-option").forEach(btn=>btn.onclick=()=>{
  const st=getSettings(); st.background=btn.dataset.bg; delete st.customBackground; saveSettings(st); applySettings(); toast("បានប្តូរ Background ✓");
});
$("backgroundFile").onchange=async e=>{
  const file=e.target.files?.[0]; if(!file)return;
  if(file.size>2*1024*1024){toast("រូបធំពេក។ សូមជ្រើសរូបក្រោម 2MB",false);e.target.value="";return}
  const reader=new FileReader();
  reader.onload=()=>{const st=getSettings();st.background="custom";st.customBackground=reader.result;saveSettings(st);applySettings();toast("បានប្តូរ Background រួច ✓")};
  reader.readAsDataURL(file);
};
$("resetBackgroundBtn").onclick=()=>{const st=getSettings();st.background="shop";delete st.customBackground;saveSettings(st);applySettings();toast("បានប្រើរូបហាងវិញ ✓")};
$("refreshDataBtn").onclick=async()=>{await loadAll();toast("បាន Refresh ទិន្នន័យ ✓")};
$("logoutSettingsBtn").onclick=()=>$("logoutBtn").click();
$("addPersonBtn").onclick=()=>{$("personForm").reset();$("personId").value="";$("personModalTitle").textContent="អ្នកជំពាក់ថ្មី";openDialog("personDialog")};
$("logoutBtn").onclick=async()=>{const {error}=await client.auth.signOut();if(error)toast(error.message,false)};

$("loginForm").onsubmit=async e=>{e.preventDefault();const {error}=await client.auth.signInWithPassword({email:$("email").value.trim(),password:$("password").value});if(error)toast(error.message,false)};

$("personForm").onsubmit=async e=>{e.preventDefault();const id=$("personId").value;const payload={name:$("personName").value.trim(),phone:$("personPhone").value.trim()||null,note:$("personNote").value.trim()||null};if(!payload.name){toast("សូមបញ្ចូលឈ្មោះ",false);return}const res=id?await client.from("customers").update(payload).eq("id",id):await client.from("customers").insert(payload);if(res.error)toast(res.error.message,false);else{closeDialogs();toast("រក្សាទុករួចរាល់");await loadAll()}};
function editPerson(id){const p=people.find(x=>x.id===id);if(!p)return;$("personId").value=p.id;$("personName").value=p.name;$("personPhone").value=p.phone||"";$("personNote").value=p.note||"";$("personModalTitle").textContent="កែព័ត៌មានអ្នកជំពាក់";openDialog("personDialog")}
async function deletePerson(id){const p=people.find(x=>x.id===id);if(!confirm(`លុប ${p?.name||""} និងប្រវត្តិទាំងអស់?`))return;const {error}=await client.from("customers").delete().eq("id",id);if(error)toast(error.message,false);else{toast("បានលុប");await loadAll()}}

function addDebt(id){const p=people.find(x=>x.id===id);$("debtForm").reset();$("debtPersonId").value=id;$("debtPersonName").textContent=p.name;$("debtDate").value=today();openDialog("debtDialog")}
$("debtForm").onsubmit=async e=>{e.preventDefault();const amount=Number($("debtAmount").value);if(amount<=0){toast("ចំនួនលុយមិនត្រឹមត្រូវ",false);return}const res=await client.from("debts").insert({customer_id:$("debtPersonId").value,item:$("debtItem").value.trim(),amount,debt_date:$("debtDate").value||today(),note:$("debtNote").value.trim()||null});if(res.error)toast(res.error.message,false);else{closeDialogs();toast("បានបន្ថែមការជំពាក់ ✓");await loadAll()}};

function addPayment(id){const p=people.find(x=>x.id===id),t=totals(id);if(t.r<=0){toast("មិនមានបំណុលនៅសល់ទេ",false);return}$("paymentForm").reset();$("paymentPersonId").value=id;$("paymentPersonName").textContent=p.name;$("paymentRemain").textContent=money(t.r);$("paymentAmount").max=t.r;$("paymentDate").value=today();openDialog("paymentDialog")}
$("paymentForm").onsubmit=async e=>{e.preventDefault();const id=$("paymentPersonId").value,amount=Number($("paymentAmount").value),remain=totals(id).r;if(amount<=0||amount>remain){toast("ចំនួនសងមិនត្រឹមត្រូវ",false);return}const res=await client.from("payments").insert({customer_id:id,amount,payment_date:$("paymentDate").value||today(),note:$("paymentNote").value.trim()||null});if(res.error)toast(res.error.message,false);else{closeDialogs();toast("បានកត់ត្រាការសង ✓");await loadAll()}};

function getHistoryRows(id){
  const ds=debts.filter(x=>x.customer_id===id).map(x=>({...x,type:"debt",date:x.debt_date}));
  const ps=payments.filter(x=>x.customer_id===id).map(x=>({...x,type:"payment",date:x.payment_date}));
  return [...ds,...ps].sort((a,b)=>new Date(b.date)-new Date(a.date));
}

function history(id){
  const p=people.find(x=>x.id===id);currentHistoryPersonId=id;
  const rows=getHistoryRows(id);
  $("historyTitle").textContent=`ប្រវត្តិ • ${p?.name||""}`;
  $("historyContent").innerHTML=rows.length?rows.map(x=>{
    const isDebt=x.type==="debt", cls=isDebt?"history-debt":"history-pay";
    const label=isDebt?`ជំពាក់ • ${esc(x.item||"")}`:"សងប្រាក់";
    const amount=isDebt?`+${money(x.amount)}`:`-${money(x.amount)}`;
    return `<div class="history-row"><div class="history-main"><div class="history-left"><div class="history-type ${cls}">${label}</div><div class="history-meta">${esc(x.date||"")}${x.note?` • ${esc(x.note)}`:""}</div></div><div class="history-actions"><div class="history-amt ${cls}">${amount}</div><button type="button" class="btn blue edit-history" onclick="editTransaction('${x.id}','${x.type}')">✏️ កែ</button></div></div></div>`;
  }).join(""):`<div class="empty">មិនទាន់មានប្រវត្តិទេ</div>`;
  openDialog("historyDialog");
}

async function downloadHistoryPdf(){
  if(!currentHistoryPersonId){toast("សូមបើក History មុន",false);return}
  if(typeof html2pdf !== "function"){toast("មិនអាចផ្ទុក PDF បាន។ សូមពិនិត្យ Internet",false);return}
  const p=people.find(x=>x.id===currentHistoryPersonId);
  if(!p)return;
  const rows=getHistoryRows(p.id);
  const t=totals(p.id);
  const st=getSettings();
  const shopName=st.shopName||"ហាង ពៅមារី";
  const btn=$("downloadHistoryPdfBtn");
  btn.disabled=true;btn.textContent="⏳ កំពុងបង្កើត...";
  const sheet=document.createElement("div");
  sheet.className="pdf-sheet";
  sheet.innerHTML=`
    <div class="pdf-title">${esc(shopName)}</div>
    <div class="pdf-subtitle">ប្រវត្តិអ្នកជំពាក់</div>
    <div class="pdf-info"><b>ឈ្មោះ៖</b> ${esc(p.name)}${p.phone?`<br><b>ទូរស័ព្ទ៖</b> ${esc(p.phone)}`:""}<br><b>កាលបរិច្ឆេទ៖</b> ${esc(today())}</div>
    <div class="pdf-summary"><div><span>ជំពាក់សរុប</span><b>${money(t.d)}</b></div><div><span>បានសង</span><b>${money(t.p)}</b></div><div><span>នៅសល់</span><b>${money(t.r)}</b></div></div>
    <table><thead><tr><th>កាលបរិច្ឆេទ</th><th>ប្រភេទ / មុខទំនិញ</th><th>ចំណាំ</th><th>ចំនួន</th></tr></thead><tbody>
      ${rows.length?rows.map(x=>`<tr><td>${esc(x.date||"")}</td><td>${x.type==="debt"?`ជំពាក់ • ${esc(x.item||"")}`:"សងប្រាក់"}</td><td>${esc(x.note||"")}</td><td class="pdf-amount">${x.type==="debt"?"+":"-"}${money(x.amount)}</td></tr>`).join(""):`<tr><td colspan="4">មិនទាន់មានប្រវត្តិទេ</td></tr>`}
    </tbody></table>
    <div class="pdf-footer">បង្កើតពី Debt Book • ${esc(shopName)}</div>`;
  sheet.style.position="absolute";sheet.style.left="0";sheet.style.top="0";sheet.style.width="794px";sheet.style.minHeight="1123px";sheet.style.boxSizing="border-box";sheet.style.background="#fff";sheet.style.padding="40px";sheet.style.zIndex="2147483647";sheet.style.opacity="1";sheet.style.pointerEvents="none";
  document.body.appendChild(sheet);
  try{
    if(document.fonts && document.fonts.ready) await document.fonts.ready;
    await new Promise(r=>setTimeout(r,150));
    await html2pdf().set({margin:0,filename:`history-${p.name.replace(/[^\w\u1780-\u17FF-]/g,"_")}.pdf`,image:{type:"jpeg",quality:0.98},html2canvas:{scale:1.5,useCORS:true,allowTaint:false,backgroundColor:"#ffffff",logging:false,windowWidth:794},jsPDF:{unit:"mm",format:"a4",orientation:"portrait",compress:true},pagebreak:{mode:["css","legacy"]}}).from(sheet).save();
    toast("បានទាញយក PDF រួចរាល់ ✓");
  }catch(err){console.error(err);toast("បង្កើត PDF មិនបាន",false)}
  finally{sheet.remove();btn.disabled=false;btn.textContent="📄 PDF"}
}

$("downloadHistoryPdfBtn").onclick=downloadHistoryPdf;

function editTransaction(id,type){
  const x=type==="debt"?debts.find(x=>x.id===id):payments.find(x=>x.id===id);if(!x)return;
  const p=people.find(x=>x.id===x.customer_id);
  $("editTransactionId").value=id;$("editTransactionType").value=type;$("editTransactionPerson").textContent=p?.name||"";
  $("editTransactionTitle").textContent=type==="debt"?"កែការជំពាក់":"កែការសង";
  $("editTransactionDateLabel").textContent=type==="debt"?"ថ្ងៃជំពាក់":"ថ្ងៃសង";
  $("editDebtItemWrap").style.display=type==="debt"?"block":"none";
  $("editDebtItem").required=type==="debt";$("editDebtItem").value=x.item||"";
  $("editTransactionAmount").value=Number(x.amount)||0;
  $("editTransactionDate").value=type==="debt"?(x.debt_date||""):(x.payment_date||"");
  $("editTransactionNote").value=x.note||"";
  closeDialogs();openDialog("editTransactionDialog");
}

$("editTransactionForm").onsubmit=async e=>{
  e.preventDefault();
  const id=$("editTransactionId").value,type=$("editTransactionType").value,amount=Number($("editTransactionAmount").value);
  if(!id||!['debt','payment'].includes(type)||amount<=0){toast("ចំនួនលុយមិនត្រឹមត្រូវ",false);return}
  const date=$("editTransactionDate").value||today(),note=$("editTransactionNote").value.trim()||null;
  let res;
  if(type==="debt"){
    const item=$("editDebtItem").value.trim();if(!item){toast("សូមបញ្ចូលមុខទំនិញ",false);return}
    res=await client.from("debts").update({item,amount,debt_date:date,note}).eq("id",id);
  }else{
    const old=payments.find(x=>x.id===id);if(!old){toast("រកមិនឃើញប្រវត្តិនេះទេ",false);return}
    const totalDebt=debts.filter(x=>x.customer_id===old.customer_id).reduce((a,x)=>a+Number(x.amount||0),0);
    const otherPaid=payments.filter(x=>x.customer_id===old.customer_id&&x.id!==id).reduce((a,x)=>a+Number(x.amount||0),0);
    const maxAllowed=Math.max(0,totalDebt-otherPaid);
    if(amount>maxAllowed){toast(`ចំនួនសងអតិបរមា ${money(maxAllowed)}`,false);return}
    res=await client.from("payments").update({amount,payment_date:date,note}).eq("id",id);
  }
  if(res.error){toast(res.error.message,false);console.error(res.error);return}
  closeDialogs();toast("បានកែប្រវត្តិរួចរាល់ ✓");await loadAll();
  if(currentHistoryPersonId)history(currentHistoryPersonId);
};

applySettings();
init();
