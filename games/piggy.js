{
const rnd=DR.rnd,shuffle=DR.shuffle;
const N=4,GOAL=5,ANS=20,DOUBT=10,MAXQ=30;
let root,G;
const $=s=>root.querySelector(s);
const on=(id,f)=>{const e=root.querySelector('#'+id);if(e)e.onclick=f};
const CN=['흑','백'];

function newGame(){
  const ps=shuffle([{name:'나',you:1}].concat(shuffle(DR.BOTS.slice()).slice(0,N-1).map(b=>({name:b[0],skill:.3+Math.random()*.6}))));
  ps.forEach((p,i)=>{p.id=i;p.score=0;p.lower=null;p.upper=null;p.reset=false});
  G={ps,banks:{},next:1,q:0,cur:0,ann:null,log:[],phase:'add',resets:0};
  deal();G.log.unshift({t:`순서 추첨: ${ps.map(p=>p.name).join(' → ')}. ${ps[0].name}부터.`});
  step();
}
function newBank(){const id=G.next++;G.banks[id]={b:1,w:1};G.ps.forEach(p=>{if(!p.you){p.mem=p.mem||{};p.mem[id]={b:1,w:1}}});return id}
function deal(){G.ps.forEach(p=>{p.lower=newBank();p.upper=null});G.ps[G.cur].upper=newBank()}
const me=()=>G.ps.find(p=>p.you);
const P=i=>G.ps[i];
const color=()=>G.q%2; // 0 흑, 1 백
// 봇의 기억: 넣을 때마다 (저금통 수와 동전 수에 따라) 1개쯤 틀리게 외울 수 있다
function hear(bank,b,w){
  G.ps.forEach(p=>{if(p.you)return;const m=p.mem[bank]||(p.mem[bank]={b:1,w:1});const load=Object.keys(G.banks).length*.04+(G.banks[bank].b+G.banks[bank].w)*.012;
    const err=Math.max(.02,(1-p.skill)*.35+load);
    m.b+=b+(Math.random()<err?(Math.random()<.5?1:-1):0);m.w+=w+(Math.random()<err?(Math.random()<.5?1:-1):0);m.b=Math.max(0,m.b);m.w=Math.max(0,m.w)});
}
function step(){
  if(G.phase=='end')return render();
  const c=P(G.cur);
  if(G.phase=='add'){render();if(!c.you){const cur=G.cur;DR.after(()=>{if(G.phase!='add'||G.cur!==cur)return;const t=1+rnd(5),b=rnd(t+1);const others=G.ps.filter(p=>p!==c);addAndPass(b,t-b,others[rnd(others.length)].id)},1500)}botResetMaybe();return}
}
function addAndPass(b,w,to){
  const c=P(G.cur),bank=c.lower;G.banks[bank].b+=b;G.banks[bank].w+=w;hear(bank,b,w);
  const t=P(to);t.upper=bank;c.lower=c.upper;c.upper=null;
  G.ann={who:c.id,bank,b,w,to};G.log.unshift({t:`${c.name}: ${bank}번에 ${[b?`흑 ${b}`:'',w?`백 ${w}`:''].filter(Boolean).join(', ')} 넣고 ${t.name}에게`});
  G.phase='answer';G.ans=null;G.t0=Date.now();G.asker=to;render();
  if(!t.you)DR.after(()=>{const m=t.mem[bank]||{b:0,w:0};giveAnswer(color()?m.w:m.b)},1800);else tick();
}
function tick(){
  if(G.phase=='answer'&&P(G.asker).you){const l=ANS-(Date.now()-G.t0)/1000;const e=$('#ac');if(e)e.textContent=Math.max(0,Math.ceil(l));if(l<=0)return giveAnswer(-1)}
  else if(G.phase=='doubt'){const l=DOUBT-(Date.now()-G.t0)/1000;const e=$('#dc');if(e)e.textContent=Math.max(0,Math.ceil(l));if(l<=0)return noDoubt()}
  else return;
  DR.after(tick,200);
}
function giveAnswer(v){
  if(G.phase!='answer')return;
  G.ans=v;const t=P(G.asker);G.log.unshift({t:`${t.name}: "${CN[color()]} ${v<0?'무응답':v+'개'}"`});
  G.phase='doubt';G.t0=Date.now();render();tick();
  // 봇의 의심
  const bank=t.upper,truthKnown=G.ps.filter(p=>!p.you&&p!==t).map(p=>{const m=p.mem[bank]||{b:0,w:0},bel=color()?m.w:m.b;
    return {p,want:bel!==v&&Math.random()<.55+.4*p.skill,delay:1500+Math.random()*6000}}).filter(x=>x.want).sort((a,b)=>a.delay-b.delay)[0];
  if(truthKnown)DR.after(()=>{if(G.phase=='doubt')doubt(truthKnown.p.id)},truthKnown.delay);
}
function noDoubt(){
  if(G.phase!='doubt')return;G.log.unshift({t:'의심한 플레이어가 없습니다.',c:'mut'});
  G.q++;G.cur=G.asker;if(checkEnd())return;G.phase='add';step();
}
function doubt(by){
  if(G.phase!='doubt')return;
  const t=P(G.asker),d=P(by),bank=t.upper,real=G.banks[bank][color()?'w':'b'],wrong=G.ans!==real;
  delete G.banks[bank];t.upper=null;
  let pen;
  if(wrong){d.score++;t.score--;pen=t}else{d.score--;pen=d}
  G.reveal={bank,real,real2:null,by,wrong,col:color()};
  G.log.unshift({t:`${d.name} 의심! ${bank}번 개봉 — ${CN[color()]} ${real}개. ${wrong?`의심 성공 (${d.name} +1, ${t.name} −1)`:`의심 실패 (${d.name} −1)`}`,c:'b'});
  pen.upper=newBank();G.log.unshift({t:`${pen.name}가 새 ${pen.upper}번 저금통을 받고 선이 된다.`});
  G.q++;G.cur=pen.id;
  if(checkEnd())return;
  G.phase='reveal';render();
  DR.after(()=>{if(G.phase=='reveal'){G.phase='add';step()}},3200);
}
function checkEnd(){
  const cap=G.q>=MAXQ;
  if(!cap){if(!G.ps.some(p=>p.score>=GOAL))return false;
  const lo=Math.min(...G.ps.map(p=>p.score));if(G.ps.filter(p=>p.score==lo).length>1)return false}
  G.capped=cap;
  G.phase='end';const r=G.ps.slice().sort((a,b)=>b.score-a.score),my=r.indexOf(me())+1;
  DR.record('piggy',{clear:my<N,score:me().score,text:`${me().score}점 · ${my}위`});render();return true;
}
/* ---------- 리셋과 도전 ---------- */
function pressReset(p){
  if(p.reset)return;p.reset=true;G.resets++;G.log.unshift({t:`${p.name}가 리셋 버튼을 눌렀다 (${G.resets}/3)`,c:'p'});
  if(G.resets>=3){G.prevPhase=G.phase;G.phase='challenge';G.chal={};render();
    // 봇 도전: 누르지 않은 봇이 가끔
    G.ps.filter(q=>!q.you&&!q.reset).forEach(q=>{if(q.skill>.6&&Math.random()<.15){const ok=Object.keys(G.banks).every(id=>{const m=q.mem[id]||{};return m.b===G.banks[id].b&&m.w===G.banks[id].w});G.chal[q.id]=ok}});
    if(me().reset)DR.after(finishReset,2500);
  }else render();
}
function botResetMaybe(){const tot=Object.values(G.banks).reduce((s,x)=>s+x.b+x.w,0);G.ps.forEach(p=>{if(!p.you&&!p.reset&&tot>30&&Math.random()<.08+(tot-30)*.004)pressReset(p)})}
function finishReset(myGuess){
  if(G.phase!='challenge')return;
  if(myGuess){const ok=Object.keys(G.banks).every(id=>myGuess[id]&&myGuess[id].b===G.banks[id].b&&myGuess[id].w===G.banks[id].w);G.chal[me().id]=ok}
  Object.entries(G.chal).forEach(([id,ok])=>{const p=P(+id);p.score+=ok?3:-2;G.log.unshift({t:`${p.name} 도전 ${ok?'성공 +3':'실패 −2'}`,c:'b'})});
  G.log.unshift({t:`리셋 확정 — 저금통 안: ${Object.entries(G.banks).map(([id,x])=>`${id}번 흑${x.b} 백${x.w}`).join(' · ')}`,c:'p'});
  G.banks={};G.ps.forEach(p=>{p.reset=false;p.mem={}});G.resets=0;G.next=1;deal();G.ann=null;
  if(checkEnd())return;G.phase='add';step();
}
/* ---------- 화면 ---------- */
function seat(p){
  const holder=id=>id==null?'<span class="pg empty">빈칸</span>':`<span class="pg">${id}</span>`;
  return `<div class="pseat ${G.cur==p.id&&G.phase=='add'?'cur':''} ${G.asker==p.id&&(G.phase=='answer'||G.phase=='doubt')?'ask':''}">
  <div class="row sp"><b>${p.name}</b><span class="sc">${p.score}점${p.reset?' · 리셋':''}</span></div>
  <div class="pgrow"><div><small>위 칸</small>${holder(p.upper)}</div><div><small>아래 칸</small>${holder(p.lower)}</div></div></div>`;
}
function center(){
  const c=P(G.cur),m=me();
  if(G.phase=='end'){const r=G.ps.slice().sort((a,b)=>b.score-a.score);return `${G.capped?`<p class="mut">질문 ${MAXQ}개 제한에 걸려 지금 점수로 끝냈다.</p>`:''}<h2>${r[0].you?'1위. 피스 3개':r.at(-1).you?'최하위. 탈락이다':`${r.indexOf(m)+1}위로 생존`}</h2>
    <table>${r.map((p,i)=>`<tr class="${i==r.length-1?'lose':p.you?'me':''}"><td>${i+1}</td><td>${p.name}</td><td class="n">${p.score}점</td></tr>`).join('')}</table><button class="go" id="re" style="margin-top:12px">다시 하기</button>`}
  if(G.phase=='challenge'){
    if(m.reset)return `<h2>리셋 확정</h2><p>리셋을 누르지 않은 사람이 도전할 수 있다…</p>`;
    return `<h2>리셋 확정 — 도전할까?</h2><p>쓰던 <b>모든</b> 저금통의 흑·백 개수를 전부 맞히면 +3, 하나라도 틀리면 −2.</p>
    <form id="cf"><div class="chal">${Object.keys(G.banks).map(id=>`<label>${id}번 흑 <input type="number" min="0" max="99" data-cb="${id}" required></label><label>백 <input type="number" min="0" max="99" data-cw="${id}" required></label>`).join('')}</div>
    <div class="row" style="margin-top:10px"><button class="go">도전</button><button type="button" id="skip">도전하지 않음</button></div></form>`}
  const ann=G.ann?`<div class="ann pop"><small>${P(G.ann.who).name}의 선언</small><b>${G.ann.bank}번 저금통에 ${[G.ann.b?`흑 ${G.ann.b}`:'',G.ann.w?`백 ${G.ann.w}`:''].filter(Boolean).join(', ')}</b><small>→ ${P(G.ann.to).name}에게</small></div>`:'';
  if(G.phase=='add'){
    if(!c.you)return `${ann}<p class="mut">${c.name}가 ${c.lower}번 저금통에 동전을 넣는 중…</p>`;
    return `${ann}<h3 style="font-size:24px;margin:8px 0">내 차례 — ${c.lower}번 저금통에 넣기</h3>
    <div class="row"><span>흑</span>${[0,1,2,3,4,5].map(n=>`<button class="nb ${G.addB==n?'sel':''}" data-ab="${n}">${n}</button>`).join('')}</div>
    <div class="row" style="margin-top:6px"><span>백</span>${[0,1,2,3,4,5].map(n=>`<button class="nb ${G.addW==n?'sel':''}" data-aw="${n}">${n}</button>`).join('')}</div>
    <p class="mut" style="font-size:14px">흑백 합쳐 1~5개. 넣은 것은 모두에게 사실대로 알려진다.</p>
    <div class="row">${G.ps.filter(p=>!p.you).map(p=>`<button class="go" data-to="${p.id}" ${(G.addB||0)+(G.addW||0)>=1&&(G.addB||0)+(G.addW||0)<=5?'':'disabled'}>${p.name}에게 건네기</button>`).join('')}</div>`}
  const t=P(G.asker);
  const q=`<h3 style="font-size:24px;margin:8px 0">${t.name}: ${t.upper}번 저금통의 <span style="color:var(--blood)">${CN[color()]}</span> 동전은?</h3>`;
  if(G.phase=='answer'){
    if(!t.you)return `${ann}${q}<p class="mut">${t.name}가 답을 고르는 중…</p>`;
    return `${ann}${q}<form id="af" class="row"><input type="number" id="av" min="0" max="99" inputmode="numeric" style="width:120px;font-size:22px" aria-label="동전 개수"><button class="go">답하기</button><span>남은 <b id="ac">20</b>초</span></form>`}
  if(G.phase=='doubt')return `${ann}${q}<p style="font-size:20px">답: <b>${G.ans<0?'무응답':G.ans+'개'}</b></p>${t.you?'<p class="mut">다른 사람들이 의심할지 기다리는 중…</p>':`<button class="go buzz" id="dz">의심!</button>`}<p>의심 마감 <b id="dc">10</b>초</p>`;
  if(G.phase=='reveal'){const r=G.reveal;return `<div class="ann pop"><small>${r.bank}번 저금통 개봉</small><b>${CN[r.col]} ${r.real}개</b><small>${r.wrong?'의심 성공':'의심 실패'}</small></div>`}
  return '';
}
function render(){
  DR.status(G.phase=='end'?'끝':`질문 ${G.q+1} · 다음 색 ${CN[color()]}`);
  root.innerHTML=`<div class="grid2"><div class="card"><div class="pseats">${G.ps.map(seat).join('')}</div><div class="pcen">${center()}</div></div>
  <div class="stackg"><div class="card"><div class="row sp"><p class="k">점수 · ${GOAL}점이 나오고 최하위가 정해지면 끝</p><button id="rs" ${me().reset||G.phase=='end'||G.phase=='challenge'?'disabled':''}>리셋 (${G.resets}/3)</button></div>
  <p class="mut" style="font-size:13px;margin:6px 0 0">동전을 늘어놓아 기록하는 것은 금지다. 지난 선언은 다시 보여 주지 않는다 — 머리로 더해라.</p></div>
  <div class="card"><p class="k">진행 (의심·리셋만 기록)</p><ul class="log">${G.log.filter(l=>l.c).slice(0,10).map(l=>`<li class="${l.c=='b'?'b':l.c=='p'?'p':''}">${l.t}</li>`).join('')||'<li class="mut">아직 없다</li>'}</ul></div></div></div>`;
  root.querySelectorAll('[data-ab]').forEach(b=>b.onclick=()=>{G.addB=+b.dataset.ab;render()});
  root.querySelectorAll('[data-aw]').forEach(b=>b.onclick=()=>{G.addW=+b.dataset.aw;render()});
  root.querySelectorAll('[data-to]').forEach(b=>b.onclick=()=>{const x=G.addB||0,y=G.addW||0;G.addB=G.addW=0;addAndPass(x,y,+b.dataset.to)});
  const af=$('#af');if(af){af.onsubmit=e=>{e.preventDefault();const v=$('#av').value;if(v!=='')giveAnswer(+v)};$('#av').focus()}
  on('dz',()=>doubt(me().id));on('rs',()=>pressReset(me()));on('re',newGame);
  on('skip',()=>finishReset(null));
  const cf=$('#cf');if(cf)cf.onsubmit=e=>{e.preventDefault();const g={};Object.keys(G.banks).forEach(id=>g[id]={b:+cf.querySelector(`[data-cb="${id}"]`).value,w:+cf.querySelector(`[data-cw="${id}"]`).value});finishReset(g)};
}
function intro(){
  DR.status('준비');
  root.innerHTML=`<div class="card"><p class="k">3일차 감옥 매치</p><h2>저금통 속 동전을 기억하라</h2>
  <div class="rule"><ol><li>각자 흑·백 동전이 1개씩 든 저금통을 <b>아래 칸</b>에, 선 플레이어는 하나 더 <b>위 칸</b>에 받는다.</li>
  <li>차례인 사람은 아래 칸 저금통에 흑·백 동전을 합쳐 <b>1~5개</b> 넣고, 넣은 것을 사실대로 말한 뒤 원하는 사람에게 건넨다. 그리고 자기 위 칸 저금통을 아래 칸으로 내린다.</li>
  <li>받은 사람은 위 칸에 놓고, <b>20초</b> 안에 그 저금통의 지정된 색(흑·백이 번갈아) 동전 개수를 답한다.</li>
  <li>답한 뒤 <b>10초</b> 동안 다른 사람이 <b>의심</b>할 수 있다. 저금통을 열어 답이 틀렸으면 의심한 사람 +1·답한 사람 −1, 맞았으면 의심한 사람 −1. 열린 저금통은 빠진다.</li>
  <li>감점당한 사람은 새 저금통을 받고 선이 된다. 아무도 의심하지 않으면 받은 사람이 이어서 넣는다.</li>
  <li>누구나 <b>리셋</b>을 누를 수 있고, 누적 3명이면 모든 저금통을 새로 나눈다. 그 직전, 리셋을 누르지 않은 사람은 모든 저금통의 흑·백을 전부 맞히는 <b>도전</b>을 할 수 있다 (+3 / −2).</li>
  <li>누군가 <b>5점</b>이 되고 최하위가 한 명으로 정해지면 끝. 최하위 탈락. (방송 규칙으로는 끝없이 갈 수 있어, 여기서는 질문 30개가 넘으면 그때 점수로 끝낸다.)</li></ol></div>
  <p class="mut" style="font-size:14px">4인전 (나 + 봇 3명). 봇도 동전을 외우다 가끔 틀린다.</p><button class="go" id="go">시작</button></div>`;on('go',newGame);
}
DR.games.piggy={title:'돼지 저금통',start(r){root=r;intro()}};
}
