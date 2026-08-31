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
  $("peopleList").innerHTML=list.length?list.map(p=>{
    const t=totals(p.id);
    return `<article class="person-card">
      <div class="person-main"><div class="person-name">${esc(p.name)}</div><div class="phone">${esc(p.phone||"មិនមានលេខទូរស័ព្ទ")}</div>
      <div class="amounts"><div class="amount"><label>ជំពាក់សរុប</label><b>${money(t.d)}</b></div><div class="amount"><label>បានសង</label><b>${money(t.p)}</b></div><div class="amount"><label>នៅសល់</label><b class="remain">${money(t.r)}</b></div></div></div>
      <div class="actions"><button class="btn blue" onclick="addDebt('${p.id}')">＋ ជំពាក់</button><button class="btn green" onclick="addPayment('${p.id}')">✓ សង</button><button class="btn" onclick="history('${p.id}')">ប្រវត្តិ</button><button class="btn" onclick="editPerson('${p.id}')">កែ</button><button class="btn red" onclick="deletePerson('${p.id}')">លុប</button></div>
    </article>`;
  }).join(""):`<div class="empty">មិនទាន់មានអ្នកជំពាក់។<br>ចុច «អ្នកជំពាក់ថ្មី» ដើម្បីចាប់ផ្តើម។</div>`;
}

$("searchInput").addEventListener("input",render);
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

function history(id){
  const p=people.find(x=>x.id===id);currentHistoryPersonId=id;
  const ds=debts.filter(x=>x.customer_id===id).map(x=>({...x,type:"debt",date:x.debt_date}));
  const ps=payments.filter(x=>x.customer_id===id).map(x=>({...x,type:"payment",date:x.payment_date}));
  const rows=[...ds,...ps].sort((a,b)=>new Date(b.date)-new Date(a.date));
  $("historyTitle").textContent=`ប្រវត្តិ • ${p?.name||""}`;
  $("historyContent").innerHTML=rows.length?rows.map(x=>{
    const isDebt=x.type==="debt", cls=isDebt?"history-debt":"history-pay";
    const label=isDebt?`ជំពាក់ • ${esc(x.item||"")}`:"សងប្រាក់";
    const amount=isDebt?`+${money(x.amount)}`:`-${money(x.amount)}`;
    return `<div class="history-row"><div class="history-main"><div class="history-left"><div class="history-type ${cls}">${label}</div><div class="history-meta">${esc(x.date||"")}${x.note?` • ${esc(x.note)}`:""}</div></div><div class="history-actions"><div class="history-amt ${cls}">${amount}</div><button type="button" class="btn blue edit-history" onclick="editTransaction('${x.id}','${x.type}')">✏️ កែ</button></div></div></div>`;
  }).join(""):`<div class="empty">មិនទាន់មានប្រវត្តិទេ</div>`;
  openDialog("historyDialog");
}

function editTransaction(id,type){
  const x=type==="debt"?debts.find(x=>x.id===id):payments.find(x=>x.id===id);if(!x)return;
  const p=people.find(x=>x.id===x.customer_id);
  $("editTransactionId").value=id;$("editTransactionType").value=type;$("editTransactionPerson").textContent=p?.name||"";
  $("editTransactionTitle").textContent=type==="debt"?"កែការជំពាក់":"កែការសង";
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

init();
