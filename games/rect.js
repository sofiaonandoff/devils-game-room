{
const rnd=DR.rnd,shuffle=DR.shuffle;
const LIMIT=120,ANS=10,WIN=2,N=8;
let root,G;
const $=s=>root.querySelector(s);
const on=(id,f)=>{const e=root.querySelector('#'+id);if(e)e.onclick=f};

/* ---------- 판과 셈 ---------- */
// 판: rows×cols, cell = null(칸 없음) | 0(빈칸) | 숫자. 네모 = 판에 있는 칸만으로 된 직사각형(한 칸짜리 포함), 빈칸은 0.
function rects(b){const out=[],R=b.length,C=b[0].length;
  for(let r1=0;r1<R;r1++)for(let c1=0;c1<C;c1++)for(let r2=r1;r2<R;r2++)for(let c2=c1;c2<C;c2++){
    let s=0,ok=true;for(let r=r1;r<=r2&&ok;r++)for(let c=c1;c<=c2;c++){if(b[r][c]===null){ok=false;break}s+=b[r][c]}
    if(ok)out.push({r1,c1,r2,c2,s})}
  return out}
function num(){return Math.random()<.15?0:(rnd(9)+1)*(Math.random()<.5?-1:1)}
function connected(b){const R=b.length,C=b[0].length,cells=[];b.forEach((row,r)=>row.forEach((v,c)=>{if(v!==null)cells.push([r,c])}));
  if(!cells.length)return false;const seen=new Set([cells[0].join()]),st=[cells[0]];
  while(st.length){const [r,c]=st.pop();[[1,0],[-1,0],[0,1],[0,-1]].forEach(([dr,dc])=>{const a=r+dr,d=c+dc;if(a>=0&&a<R&&d>=0&&d<C&&b[a][d]!==null&&!seen.has(a+','+d)){seen.add(a+','+d);st.push([a,d])}})}
  return seen.size==cells.length}
function board(){
  if(Math.random()<.35){const R=4,C=4+rnd(3),b=Array.from({length:R},()=>Array.from({length:C},num));
    let cut=Math.round(R*C*.3),tries=0;
    while(cut>0&&tries++<200){const r=rnd(R),c=rnd(C);if(b[r][c]===null)continue;
      const edge=r==0||c==0||r==R-1||c==C-1||[[1,0],[-1,0],[0,1],[0,-1]].some(([a,d])=>b[r+a]&&b[r+a][c+d]===null);
      if(!edge)continue;const keep=b[r][c];b[r][c]=null;if(connected(b))cut--;else b[r][c]=keep}
    return b}
  const [R,C]=[[3,3],[3,4],[4,4]][rnd(3)];return Array.from({length:R},()=>Array.from({length:C},num));
}
function problem(){
  const want=4+rnd(9);let best=null;
  for(let i=0;i<1000;i++){const b=board(),all=rects(b),cnt={};all.forEach(x=>cnt[x.s]=(cnt[x.s]||0)+1);
    for(let t=-6;t<=6;t++){const a=cnt[t]||0;if(a<4||a>12)continue;
      if(a==want)return {b,t,ans:a,list:all.filter(x=>x.s==t)};
      if(!best||Math.abs(a-want)<Math.abs(best.ans-want))best={b,t,ans:a,list:all.filter(x=>x.s==t)}}}
  return best;
}

/* ---------- 진행 ---------- */
function newGame(){
  const ps=[{id:0,name:'나',you:1,col:'#8a6a1c'}].concat(shuffle(DR.BOTS.slice()).map((b,i)=>({id:i+1,name:b[0],col:b[1],skill:.2+Math.random()*.8})));
  ps.forEach(p=>{p.wins=0;p.won=0});
  G={ps,qn:0,order:[],log:[]};nextProblem();
}
const active=()=>G.ps.filter(p=>!p.won);
const needed=()=>Math.ceil(N/2);
function nextProblem(){
  if(G.order.length>=needed()||G.qn>=20)return finish();
  G.qn++;const P=problem();
  Object.assign(G,{P,t0:Date.now(),out:new Set(),answering:null,ended:false,found:new Map(),anchor:null,sel:null,paused:0});
  active().forEach(p=>{if(!p.you){const cells=P.b.flat().filter(v=>v!==null).length;
    p.due=(8+cells*2.4)*(1.65-p.skill)*(.7+Math.random()*.7)*1000;p.acc=.55+.4*p.skill}});
  G.log.unshift({t:`${G.qn}번 문제 · 타깃 ${P.t}`});
  draw();tick();
}
const elapsed=()=>Date.now()-G.t0-G.paused;
function tick(){
  clearTimeout(G.tm);if(G.ended)return;
  const left=LIMIT*1000-elapsed();
  if(G.answering==null){
    if(left<=0)return close(null,'시간 초과 — 아무도 맞히지 못했다');
    const ready=active().filter(p=>!p.you&&!G.out.has(p.id)&&elapsed()>=p.due).sort((a,b)=>a.due-b.due)[0];
    if(ready)return botBuzz(ready);
  }
  paintClock();G.tm=DR.after(tick,200);
}
function paintClock(){const el=$('#clock');if(!el)return;const left=Math.max(0,LIMIT-elapsed()/1000);el.textContent=`${Math.floor(left/60)}:${String(Math.floor(left%60)).padStart(2,'0')}`;
  const a=$('#acl');if(a&&G.answering==0){const l=Math.max(0,ANS-(Date.now()-G.ansT)/1000);a.textContent=l.toFixed(1)+'초';if(l<=0)submit(null)}}
function botBuzz(p){
  G.answering=p.id;G.log.unshift({t:`${p.name}가 버저를 눌렀다!`,c:'p'});draw();
  DR.after(()=>{const right=Math.random()<p.acc,ans=right?G.P.ans:Math.max(0,G.P.ans+(Math.random()<.5?-1:1)*(1+rnd(2)));
    judge(p,ans);},1600);
}
function judge(p,ans){
  G.answering=null;
  if(ans===G.P.ans){p.wins++;G.log.unshift({t:`${p.name}: "${ans}" — 정답!`,c:'ok'});
    if(p.wins>=WIN){p.won=1;G.order.push(p.id);G.log.unshift({t:`${p.name} 승리 확정 (${G.order.length}번째)`,c:'b'})}
    return close(p.id,`${p.name}${p.you?'(나)':''}가 맞혔다`)}
  G.out.add(p.id);G.log.unshift({t:`${p.name}: "${ans??'무응답'}" — 오답. 이 문제에서 빠진다.`,c:'b'});
  if(active().every(q=>G.out.has(q.id)))return close(null,'남은 사람이 모두 틀렸다');
  draw();tick();
}
function close(who,msg){G.ended=true;G.msg=msg;G.revealI=0;draw();reveal()}
function reveal(){if(!G.ended||!$('#brd'))return;const L=G.P.list;paintSel(L[G.revealI%L.length],'rv');G.revealI++;if(G.revealI<=L.length*2)DR.after(reveal,650)}
function finish(){
  G.done=true;const winners=G.order.map(id=>G.ps[id]),losers=G.ps.filter(p=>!p.won).sort((a,b)=>b.wins-a.wins);
  const me=G.ps[0],win=!!me.won;G.base=win?7:-3;
  DR.record('rect',{clear:win,text:win?`${G.order.indexOf(0)+1}번째로 승리`:null});
  DR.status('게임 종료');
  root.innerHTML=`<div class="grid2"><div class="card pop"><p class="k">네모 세기 종료 · ${G.qn}문제</p><h2>${win?`승리. ${G.order.indexOf(0)+1}번째로 두 번 맞혔다`:'패배. 승리 팀이 절반을 채웠다'}</h2>
  <p>개인 플레이어 승점 <b class="${win?'ok':'warn'}">${win?'+7':'−3'}</b></p>
  <div class="rule"><b>세 번째 선택</b> — 개인 플레이어에게 주어진다.<br><b>도전</b>: 추가 대결(네모 세기 한 문제, 60초). 맞히면 피스 3개, 못 맞히면 승점 −3.<br><b>안전</b>: 대결하지 않고 승점 −1.</div>
  <div class="row"><button class="go" id="ch">도전</button><button id="sf">안전</button></div></div>
  <div class="card"><p class="k">결과</p><table><tr><th>순위</th><th>플레이어</th><th class="n">정답</th><th>결과</th></tr>
  ${winners.concat(losers).map((p,i)=>`<tr class="${p.you?'me':''}"><td>${i+1}</td><td>${p.name}${p.you?' (나)':''}</td><td class="n">${p.wins}</td><td>${p.won?'승리 +7':'패배 −3'}</td></tr>`).join('')}</table></div></div>`;
  on('ch',challenge);on('sf',()=>final(G.base-1,'안전을 골랐다. 승점 −1.'));
}
function challenge(){
  const P=problem();Object.assign(G,{P,t0:Date.now(),paused:0,found:new Map(),anchor:null,sel:null,ended:false,duel:1});
  DR.status('추가 대결');
  root.innerHTML=`<div class="grid2"><div class="card"><p class="k">추가 대결 · 60초</p>${boardHTML()}
  <form id="df" class="row" style="margin-top:12px"><input type="number" id="dv" inputmode="numeric" min="0" max="999" aria-label="네모 개수" style="width:120px;font-size:22px"><button class="go">답 제출</button></form></div>
  <div class="card"><p class="k">도전</p><h2>상대는 시계다</h2><p>60초 안에 정확한 개수를 한 번에 맞혀야 한다. 판을 드래그하면 네모의 합이 보이고, 타깃과 같으면 자동으로 기록된다.</p><p>남은 시간 <b id="dc">60</b>초</p></div></div>`;
  bindBoard();$('#dv').focus();
  const end=ok=>{G.duel=0;G.ended=true;const f=$('#df');if(f)f.outerHTML=`<p style="margin-top:12px">정답 <b>${G.P.ans}</b>개</p>`;paintAll();final(ok?G.base:G.base-3,ok?`정답 ${G.P.ans}! 피스 3개를 얻었다.`:`정답은 ${G.P.ans}. 승점 −3.`,ok)};
  $('#df').onsubmit=e=>{e.preventDefault();if(!G.duel)return;end(+$('#dv').value===G.P.ans)};
  const t=()=>{if(!G.duel)return;const l=60-(Date.now()-G.t0)/1000;const el=$('#dc');if(el)el.textContent=Math.max(0,Math.ceil(l));if(l<=0)return end(false);DR.after(t,250)};t();
}
function final(score,msg,piece){
  DR.status('끝');
  const box=document.createElement('div');box.className='card pop';
  box.innerHTML=`<p class="k">최종</p><h2>${msg}</h2><p>이번 미니게임 승점 합계 <b>${score>0?'+':''}${score}</b>${piece?' · 피스 ◆3':''}</p><div class="row"><button class="go" id="re">새 게임</button></div>`;
  root.prepend(box);root.querySelectorAll('#ch,#sf').forEach(b=>b.disabled=true);on('re',newGame);window.scrollTo(0,0);
}

/* ---------- 판 그리기와 드래그 ---------- */
function boardHTML(){
  const b=G.P.b,C=b[0].length;
  return `<div class="row sp"><div><span class="mut" style="font-size:13px">타깃 넘버</span><div class="tgt">${G.P.t}</div></div>
  <div style="text-align:right"><span class="mut" style="font-size:13px">선택한 네모의 합</span><div class="ssum" id="ss">—</div></div></div>
  <div class="brd" id="brd" style="grid-template-columns:repeat(${C},minmax(0,64px))" aria-label="문제 판. 드래그해서 네모를 고르세요">${b.map((row,r)=>row.map((v,c)=>v===null?`<div class="cl no"></div>`:`<div class="cl" data-r="${r}" data-c="${c}">${v===0?'':v}</div>`).join('')).join('')}</div>
  <div class="row sp" style="margin-top:8px"><span>찾은 네모 <b id="fc">${G.found.size}</b>개</span><button id="fr" style="min-height:36px;padding:4px 12px">찾은 기록 지우기</button></div>`;
}
function rectOf(a,b){return {r1:Math.min(a.r,b.r),r2:Math.max(a.r,b.r),c1:Math.min(a.c,b.c),c2:Math.max(a.c,b.c)}}
function sumOf(x){let s=0;for(let r=x.r1;r<=x.r2;r++)for(let c=x.c1;c<=x.c2;c++){const v=G.P.b[r][c];if(v===null)return null;s+=v}return s}
function paintSel(x,cls){
  root.querySelectorAll('.cl[data-r]').forEach(el=>{const r=+el.dataset.r,c=+el.dataset.c,inn=x&&r>=x.r1&&r<=x.r2&&c>=x.c1&&c<=x.c2;
    el.classList.toggle('on',!!inn&&cls!='rv');el.classList.toggle('rv',!!inn&&cls=='rv');
    el.classList.toggle('fd',[...G.found.values()].some(f=>r>=f.r1&&r<=f.r2&&c>=f.c1&&c<=f.c2))});
}
function paintAll(){paintSel(G.sel);const fc=$('#fc');if(fc)fc.textContent=G.found.size}
function bindBoard(){
  const brd=$('#brd');if(!brd)return;
  const cellAt=e=>{const el=document.elementFromPoint?document.elementFromPoint(e.clientX,e.clientY):e.target;return el&&el.closest&&el.closest('.cl[data-r]')};
  const pos=el=>({r:+el.dataset.r,c:+el.dataset.c});
  const show=()=>{const s=G.sel?sumOf(G.sel):null,ss=$('#ss');if(ss){ss.textContent=s===null?(G.sel?'칸 밖':'—'):s;ss.className='ssum'+(s===G.P.t?' hitc':'')}paintSel(G.sel)};
  brd.onpointerdown=e=>{const el=e.target.closest('.cl[data-r]');if(!el)return;e.preventDefault();G.anchor=pos(el);G.sel=rectOf(G.anchor,G.anchor);show()};
  brd.onpointermove=e=>{if(!G.anchor)return;const el=cellAt(e);if(el){G.sel=rectOf(G.anchor,pos(el));show()}};
  const up=()=>{if(!G.anchor)return;G.anchor=null;const s=G.sel?sumOf(G.sel):null;
    if(s===G.P.t){const k=`${G.sel.r1},${G.sel.c1},${G.sel.r2},${G.sel.c2}`;G.found.set(k,G.sel)}paintAll();show()};
  brd.onpointerup=up;brd.onpointerleave=e=>{if(e.pointerType=='mouse')up()};
  on('fr',()=>{G.found.clear();paintAll()});
  paintAll();
}

function draw(){
  const P=G.P,me=G.ps[0],can=!G.ended&&G.answering==null&&!me.won&&!G.out.has(0);
  DR.status(`${G.qn}번 문제 · 승리 ${G.order.length}/${needed()}`);
  const status=p=>p.won?'<span class="badge" style="--c:var(--G)">승리</span>':G.out.has(p.id)&&!G.ended?'<span class="badge">이번 문제 탈락</span>':G.answering==p.id?'<span class="badge new">답하는 중</span>':'';
  root.innerHTML=`<div class="grid2"><div class="card"><div class="row sp"><p class="k">${G.qn}번 문제</p><b id="clock" class="clock">2:00</b></div>
  ${boardHTML()}
  <div id="act" style="margin-top:14px">${G.ended?`<div class="rule pop"><b>${G.msg}</b><br>정답 <b style="font-size:22px">${P.ans}</b>개 — 정답 네모를 하나씩 비추는 중.</div><button class="go" id="nx">${G.order.length>=needed()?'결과 보기':'다음 문제'}</button>`
   :G.answering===0?`<form id="af" class="row"><input type="number" id="av" inputmode="numeric" min="0" max="999" aria-label="네모 개수" style="width:120px;font-size:22px"><button class="go">답하기</button><span>남은 <b id="acl">10.0초</b></span></form>`
   :G.answering!=null?`<p class="warn">${G.ps[G.answering].name}가 답하는 중…</p>`
   :me.won?'<p class="ok">이미 승리했다. 남은 문제는 지켜본다.</p>':G.out.has(0)?'<p class="warn">이 문제에서 틀려 빠졌다. 다음 문제를 기다린다.</p>'
   :`<button class="go buzz" id="bz" ${can?'':'disabled'}>버저 누르기</button><p class="mut" style="font-size:13px;margin:6px 0 0">버저를 누르면 10초 안에 답해야 한다. 틀리면 이 문제에서 빠진다.</p>`}</div></div>
  <div class="stackg"><div class="card"><p class="k">플레이어 · 두 번 맞히면 승리 · ${needed()}명이 이기면 끝</p>
  <table>${G.ps.map(p=>`<tr class="${p.you?'me':''}"><td>${p.name}${p.you?' (나)':''}</td><td>${'●'.repeat(p.wins)}${'○'.repeat(Math.max(0,WIN-p.wins))}</td><td>${status(p)}</td></tr>`).join('')}</table></div>
  <div class="card"><p class="k">진행 기록</p><ul class="log">${G.log.slice(0,14).map(l=>`<li class="${l.c=='b'?'b':l.c=='p'?'p':''}">${l.t}</li>`).join('')}</ul></div></div></div>`;
  bindBoard();paintClock();
  on('bz',()=>{G.answering=0;G.ansT=Date.now();G.log.unshift({t:'나: 버저!',c:'p'});draw();$('#av').focus()});
  const af=$('#af');if(af)af.onsubmit=e=>{e.preventDefault();const v=$('#av').value;submit(v===''?null:+v)};
  on('nx',nextProblem);
  if(G.ended)reveal();
}
function submit(v){if(G.answering!==0)return;judge(G.ps[0],v)}

function intro(){
  DR.status('준비');
  root.innerHTML=`<div class="grid2"><div class="card"><p class="k">1일차 메인 매치 〈양자택일〉 · 미니게임 2</p><h2>타깃이 되는 네모를 세어라</h2>
  <div class="rule"><ol>
  <li>숫자가 적힌 칸들로 된 판과 <b>타깃 넘버</b>가 공개된다.</li>
  <li>판 위의 칸으로 만든 직사각형 중, 안의 숫자 합이 타깃이 되는 <b>네모의 개수</b>를 센다. 한 칸짜리도 네모이고, 빈칸은 0이다. 판 밖으로 걸치는 네모는 없다.</li>
  <li>다 셌으면 <b>버저</b>를 누르고 10초 안에 답한다.</li>
  <li>틀리면 그 문제에서 다시 답할 수 없다. <b>두 번 맞히면 승리</b>하고 이후 문제에서 빠진다.</li>
  <li>문제당 제한 시간 2분. 8명 중 <b>절반이 승리</b>하면 끝난다. 개인 승리 +7, 패배 −3.</li></ol></div>
  <button class="go" id="go">게임 시작</button></div>
  <div class="card"><p class="k">조작</p><p>판을 <b>드래그</b>하면 고른 네모의 합이 바로 보인다. 합이 타깃과 같으면 자동으로 "찾은 네모"에 쌓이고 칸에 표시가 남는다. 다 찾았다고 확신할 때 버저를 눌러라 — 봇 7명도 같이 세고 있다.</p>
  <p class="mut" style="font-size:14px">방송의 문제 판은 7×7까지 나왔지만, 여기서는 화면에 맞게 3×3~4×6 크기로 매번 새로 만든다. 정답은 4~12개가 고르게 나온다.</p></div></div>`;
  on('go',newGame);
}
DR.games.rect={title:'네모 세기',start(r){root=r;intro()}};
}
