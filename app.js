const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let people = [], debts = [], payments = [];

const $ = id => document.getElementById(id);
const money = n => new Intl.NumberFormat("km-KH").format(Number(n||0)) + "៛";
const today = () => new Date().toISOString().slice(0,10);
const esc = s => String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
function toast(msg, ok=true){const t=$("toast");t.textContent=msg;t.className=ok?"show ok":"show bad";setTimeout(()=>t.className="",2500)}
function openDialog(id){$(id).showModal()} function closeDialogs(){document.querySelectorAll("dialog").forEach(d=>d.close())}
document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",closeDialogs));

async function init(){
  const {data:{session}}=await client.auth.getSession();
  if(session) showApp(); else $("loginScreen").classList.remove("hidden");
  client.auth.onAuthStateChange((_e,s)=>{if(s)showApp();else{ $("app").classList.add("hidden");$("loginScreen").classList.remove("hidden")}});
}
async function showApp(){ $("loginScreen").classList.add("hidden");$("app").classList.remove("hidden"); await loadAll(); }

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
  const d=debts.filter(x=>x.customer_id===personId).reduce((a,x)=>a+Number(x.amount),0);
  const p=payments.filter(x=>x.customer_id===personId).reduce((a,x)=>a+Number(x.amount),0);
  return {d,p,r:Math.max(0,d-p)};
}
function render(){
  $("peopleCount").textContent=people.length;
  const td=debts.reduce((a,x)=>a+Number(x.amount),0), tp=payments.reduce((a,x)=>a+Number(x.amount),0);
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
$("addPersonBtn").onclick=()=>{ $("personForm").reset();$("personId").value="";$("personModalTitle").textContent="អ្នកជំពាក់ថ្មី";openDialog("personDialog")};
$("logoutBtn").onclick=()=>client.auth.signOut();

$("loginForm").onsubmit=async e=>{e.preventDefault();const {error}=await client.auth.signInWithPassword({email:$("email").value,password:$("password").value});if(error)toast(error.message,false)};
$("personForm").onsubmit=async e=>{e.preventDefault();const id=$("personId").value;const payload={name:$("personName").value.trim(),phone:$("personPhone").value.trim()||null,note:$("personNote").value.trim()||null};
  const res=id?await client.from("customers").update(payload).eq("id",id):await client.from("customers").insert(payload);
  if(res.error)toast(res.error.message,false);else{closeDialogs();toast("រក្សាទុករួចរាល់");await loadAll()}
};
function editPerson(id){const p=people.find(x=>x.id===id);if(!p)return;$("personId").value=p.id;$("personName").value=p.name;$("personPhone").value=p.phone||"";$("personNote").value=p.note||"";$("personModalTitle").textContent="កែព័ត៌មានអ្នកជំពាក់";openDialog("personDialog")}
async function deletePerson(id){const p=people.find(x=>x.id===id);if(!confirm(`លុប ${p?.name||""} និងប្រវត្តិទាំងអស់?`))return;const {error}=await client.from("customers").delete().eq("id",id);if(error)toast(error.message,false);else{toast("បានលុប");await loadAll()}}

function addDebt(id){const p=people.find(x=>x.id===id);$("debtForm").reset();$("debtPersonId").value=id;$("debtPersonName").textContent=p.name;$("debtDate").value=today();openDialog("debtDialog")}
$("debtForm").onsubmit=async e=>{e.preventDefault();const amount=Number($("debtAmount").value);if(amount<=0)return;const res=await client.from("debts").insert({customer_id:$("debtPersonId").value,item:$("debtItem").value.trim(),amount,debt_date:$("debtDate").value||today(),note:$("debtNote").value.trim()||null});if(res.error)toast(res.error.message,false);else{closeDialogs();toast("បានបន្ថែមការជំពាក់ ✓");await loadAll()}};

function addPayment(id){const p=people.find(x=>x.id===id),t=totals(id);if(t.r<=0){toast("មិនមានបំណុលនៅសល់ទេ",false);return}$("paymentForm").reset();$("paymentPersonId").value=id;$("paymentPersonName").textContent=p.name;$("paymentRemain").textContent=money(t.r);$("paymentAmount").max=t.r;$("paymentDate").value=today();openDialog("paymentDialog")}
$("paymentForm").onsubmit=async e=>{e.preventDefault();const id=$("paymentPersonId").value,amount=Number($("paymentAmount").value),remain=totals(id).r;if(amount<=0||amount>remain){toast("ចំនួនសងមិនត្រឹមត្រូវ",false);return}const res=await client.from("payments").insert({customer_id:id,amount,payment_date:$("paymentDate").value||today(),note:$("paymentNote").value.trim()||null});if(res.error)toast(res.error.message,false);else{closeDialogs();toast("បានកត់ត្រាការសង ✓");await loadAll()}};

function history(id){const p=people.find(x=>x.id===id);const ds=debts.filter(x=>x.customer_id===id).map(x=>({...x,type:"debt",date:x.debt_date}));const ps=payments.filter(x=>x.customer_id===id).map(x=>({...x,type:"payment",date:x.payment_date}));const rows=[...ds,...ps].sort((a,b)=>new Date(b.date)-new Date(a.date));$("historyTitle").textContent=`ប្រវត្តិ • ${p.name}`;$("historyContent").innerHTML=rows.length?rows.map(x=>x.type==="debt"?`<div class="history-row"><div><div class="history-type history-debt">ជំពាក់ • ${esc(x.item)}</div><div class="history-meta">${esc(x.date)} ${x.note?`• ${esc(x.note)}`:""}</div></div><div class="history-amt history-debt">+${money(x.amount)}</div></div>`:`<div class="history-row"><div><div class="history-type history-pay">សងប្រាក់</div><div class="history-meta">${esc(x.date)} ${x.note?`• ${esc(x.note)}`:""}</div></div><div class="history-amt history-pay">-${money(x.amount)}</div></div>`).join(""):`<div class="empty">មិនទាន់មានប្រវត្តិទេ</div>`;openDialog("historyDialog")}

init();
