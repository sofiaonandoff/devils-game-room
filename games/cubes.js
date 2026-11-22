{
const rnd=DR.rnd,shuffle=DR.shuffle;
const LIMIT=300,LOCK=20,N=8;
let root,G;
const $=s=>root.querySelector(s);
const on=(id,f)=>{const e=root.querySelector('#'+id);if(e)e.onclick=f};

/* ---------- 입체 만들기: 뒤쪽 모서리가 가장 높고 보는 쪽으로 계단처럼 낮아진다 ---------- */
function solid(){
  for(;;){const W=5+rnd(4),D=5+rnd(4),H=3+rnd(4),h=[];
    for(let x=0;x<W;x++){h[x]=[];for(let z=0;z<D;z++){
      if(!x&&!z){h[x][z]=H;continue}
      const m=Math.min(x?h[x-1][z]:H,z?h[x][z-1]:H);h[x][z]=Math.max(0,m-(Math.random()<.28?1:0)-(Math.random()<.06?1:0))}}
    const n=h.flat().reduce((a,b)=>a+b,0);if(n>=40&&n<=400)return {W,D,H,h,n};
  }
}
/* ---------- 그리기 (정사영, 면 단위로 먼 것부터) ---------- */
function draw(cv,S,yaw,pitch){
  const ctx=cv.getContext&&cv.getContext('2d');if(!ctx)return;const dpr=window.devicePixelRatio||1,cw=cv.clientWidth,ch=cv.clientHeight;
  if(!cw||!ch)return;cv.width=cw*dpr;cv.height=ch*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,cw,ch);
  const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
  const R=Math.sqrt(S.W*S.W+S.D*S.D+S.H*S.H)/2,sc=Math.min(cw,ch)*.47/R,ox=S.W/2,oz=S.D/2,oy=S.H/2;
  const P=(x,y,z)=>{x-=ox;y-=oy;z-=oz;const xr=x*cy-z*sy,zr=x*sy+z*cy;return [cw/2+xr*sc,ch/2-(y*cp-zr*sp)*sc,y*sp+zr*cp]};
  const filled=(x,y,z)=>x>=0&&z>=0&&x<S.W&&z<S.D&&y>=0&&y<S.h[x][z];
  const F=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]],faces=[];
  const light=[.35,.85,.4];
  for(let x=0;x<S.W;x++)for(let z=0;z<S.D;z++)for(let y=0;y<S.h[x][z];y++)F.forEach(([nx,ny,nz])=>{
    if(filled(x+nx,y+ny,z+nz))return;if(ny<0&&y==0)return;
    const dep=ny*sp+(nx*sy+nz*cy)*cp;if(dep<=1e-6)return;
    let pts;
    if(nx)pts=[[0,0,0],[0,1,0],[0,1,1],[0,0,1]].map(([a,b,c])=>[x+(nx>0?1:0),y+b,z+c]);
    else if(ny)pts=[[0,0,0],[1,0,0],[1,0,1],[0,0,1]].map(([a,b,c])=>[x+a,y+(ny>0?1:0),z+c]);
    else pts=[[0,0,0],[1,0,0],[1,1,0],[0,1,0]].map(([a,b,c])=>[x+a,y+b,z+(nz>0?1:0)]);
    const pr=pts.map(p=>P(...p)),d=pr.reduce((s,p)=>s+p[2],0)/4;
    const shade=.45+.55*Math.max(0,nx*light[0]+ny*light[1]+nz*light[2]);
    faces.push({pr,d,shade,top:ny>0});
  });
  faces.sort((a,b)=>a.d-b.d);
  const dark=document.documentElement.dataset.theme=='dark'||(document.documentElement.dataset.theme!='light'&&matchMedia('(prefers-color-scheme: dark)').matches);
  faces.forEach(f=>{ctx.beginPath();f.pr.forEach(([X,Y],i)=>i?ctx.lineTo(X,Y):ctx.moveTo(X,Y));ctx.closePath();
    const base=f.top?[232,194,98]:[200,60,80];const k=f.shade;ctx.fillStyle=`rgb(${base.map(v=>Math.round(v*k)).join(',')})`;ctx.fill();
    ctx.strokeStyle=dark?'rgba(10,6,8,.85)':'rgba(30,14,18,.8)';ctx.lineWidth=1.2;ctx.stroke()});
}

/* ---------- 진행 ---------- */
function newGame(){
  const S=solid();
  const ps=[{id:0,name:'나',you:1}].concat(shuffle(DR.BOTS.slice()).map((b,i)=>({id:i+1,name:b[0],skill:.2+Math.random()*.8})));
  ps.forEach(p=>{p.done=null;p.lock=0;p.miss=0;if(!p.you)p.due=(10+S.n/5)*(1.7-p.skill)*(.7+Math.random()*.7)*1000});
  G={S,ps,t0:Date.now(),order:[],log:[],yaw:Math.PI/4,pitch:.55,ended:false};
  render();loop();
}
const el=()=>Date.now()-G.t0;
function answer(p,v){
  if(G.ended||p.done!=null||Date.now()<p.lock)return;
  if(el()<5000){if(p.you)G.msg=`${Math.ceil((5000-el())/1000)}초 뒤부터 답할 수 있다.`;return paintSide()}
  if(v===G.S.n){p.done=el();G.order.push(p.id);G.log.unshift({t:`${p.name} 정답! (${G.order.length}위)`,c:'ok'});if(p.you)G.msg='정답!'}
  else{p.lock=Date.now()+LOCK*1000;p.miss++;G.log.unshift({t:`${p.name} 오답 — 20초 잠금`,c:'b'});if(p.you)G.msg=`${v}개는 아니다. 20초 동안 답할 수 없다.`;
    if(!p.you)p.due=el()+LOCK*1000+(4+Math.random()*12)*1000}
  if(G.order.length>=N-1)return end();
  paintSide();
}
function loop(){
  if(G.ended)return;
  G.ps.forEach(p=>{if(!p.you&&p.done==null&&el()>=p.due&&Date.now()>=p.lock){const ok=Math.random()<.6;answer(p,ok?G.S.n:G.S.n+(Math.random()<.5?-1:1)*(1+rnd(Math.max(2,Math.round(G.S.n*.06)))))}});
  if(el()>=LIMIT*1000)return end();
  const c=$('#clk');if(c){const l=Math.max(0,LIMIT-el()/1000);c.textContent=`${Math.floor(l/60)}:${String(Math.floor(l%60)).padStart(2,'0')}`}
  const lk=$('#lk'),me=G.ps[0];if(lk)lk.textContent=Date.now()<me.lock?`잠금 ${Math.ceil((me.lock-Date.now())/1000)}초`:'';
  DR.after(loop,250);
}
function end(){G.ended=true;const me=G.ps[0],rank=me.done!=null?G.order.indexOf(0)+1:null;
  DR.record('cubes',{clear:rank!=null,score:rank?me.done/1000:null,lowBetter:1,text:rank?`${(me.done/1000).toFixed(1)}초 · ${rank}위`:null});render()}
function sideHTML(){
  const ranked=G.order.map(id=>G.ps[id]),rest=G.ps.filter(p=>p.done==null);
  return `<p class="k">순위 · 맞힌 순서대로</p><table>${ranked.map((p,i)=>`<tr class="${p.you?'me':''}"><td>${i+1}</td><td>${p.name}</td><td class="n">${(p.done/1000).toFixed(1)}초</td></tr>`).join('')}
  ${rest.map(p=>`<tr class="${p.you?'me':''}"><td>-</td><td>${p.name}</td><td class="n mut">${Date.now()<p.lock?'잠금':G.ended?'못 맞힘':'세는 중'}</td></tr>`).join('')}</table>
  <ul class="log" style="margin-top:12px">${G.log.slice(0,10).map(l=>`<li class="${l.c=='b'?'b':''}">${l.t}</li>`).join('')}</ul>`;
}
function paintSide(){const s=$('#side');if(s)s.innerHTML=sideHTML();const m=$('#msg');if(m)m.textContent=G.msg||''}
function render(){
  const me=G.ps[0];DR.status(G.ended?'끝':'큐브를 세는 중');
  root.innerHTML=`<div class="grid2"><div class="card"><div class="row sp"><p class="k">${G.ended?`정답 ${G.S.n}개`:'큐브는 모두 몇 개?'}</p><b class="clock" id="clk">5:00</b></div>
  <div class="cubefig"><canvas id="cv" aria-label="큐브 입체. 끌어서 돌려 볼 수 있다"></canvas></div>
  <p class="mut" style="font-size:13px;margin:6px 0">끌어서 돌리기 · 위아래로 끌면 내려다보는 각도 · 방향키도 된다 · 보이는 큐브 아래 깔린 큐브도 센다</p>
  ${G.ended?`<div class="rule pop"><b>${me.done!=null?`${G.order.indexOf(0)+1}위 · ${(me.done/1000).toFixed(1)}초`:'시간 안에 맞히지 못했다'}</b> — 정답 ${G.S.n}개 (바닥 ${G.S.W}×${G.S.D}, 높이 ${G.S.H})</div><div class="row"><button class="go" id="re">새 문제</button><button id="vw">처음 각도로</button></div>`
   :me.done!=null?'<p class="ok">정답! 다른 사람들이 끝날 때까지 기다린다.</p>'
   :`<form id="af" class="row"><input type="number" id="av" inputmode="numeric" min="0" max="999" aria-label="큐브 개수" style="width:140px;font-size:22px"><button class="go">제출</button><span id="lk" class="warn"></span></form><p id="msg" class="mut" style="margin:8px 0 0">${G.msg||''}</p><button id="vw" style="margin-top:8px">처음 각도로 (V)</button>`}
  </div><div class="card" id="side">${sideHTML()}</div></div>`;
  const cv=$('#cv'),redraw=()=>draw(cv,G.S,G.yaw,G.pitch);
  if(window.ResizeObserver)new ResizeObserver(redraw).observe(cv);redraw();
  let drag=null;
  cv.onpointerdown=e=>{drag=[e.clientX,e.clientY];cv.setPointerCapture&&cv.setPointerCapture(e.pointerId)};
  cv.onpointermove=e=>{if(!drag)return;G.yaw-=(e.clientX-drag[0])*.01;G.pitch=Math.max(0,Math.min(Math.PI/2,G.pitch+(e.clientY-drag[1])*.01));drag=[e.clientX,e.clientY];redraw()};
  cv.onpointerup=cv.onpointercancel=()=>drag=null;
  root.onkeydown=e=>{if(e.target.tagName=='INPUT')return;const k={ArrowLeft:[.12,0],ArrowRight:[-.12,0],ArrowUp:[0,-.08],ArrowDown:[0,.08]}[e.key];
    if(k){G.yaw+=k[0];G.pitch=Math.max(0,Math.min(Math.PI/2,G.pitch+k[1]));redraw();e.preventDefault()}if(e.key=='v'||e.key=='V'){G.yaw=Math.PI/4;G.pitch=.55;redraw()}};
  cv.tabIndex=0;
  on('vw',()=>{G.yaw=Math.PI/4;G.pitch=.55;redraw()});on('re',newGame);
  const f=$('#af');if(f)f.onsubmit=e=>{e.preventDefault();const v=$('#av').value;if(v==='')return;const before=me.done;answer(me,+v);$('#av').value='';if(me.done!=null&&before==null&&!G.ended)render()};
}
function intro(){
  DR.status('준비');
  root.innerHTML=`<div class="card"><p class="k">1일차 메인 매치 〈양자택일〉 · 미니게임 1</p><h2>큐브가 모두 몇 개인지 세어라</h2>
  <div class="rule"><ol><li>큐브를 쌓은 입체 하나가 나온다. 개수를 세어 입력한다.</li><li>틀리면 <b>20초</b> 동안 답할 수 없다.</li>
  <li>맞힌 순서대로 순위가 정해지고, <b>한 명만 남기고 모두</b> 맞히면 끝난다. 이 순위는 방송에서 뒤 게임의 동점 우선권이 됐다.</li></ol></div>
  <p class="mut" style="font-size:14px">입체는 뒤쪽 모서리가 가장 높고 앞쪽으로 계단처럼 낮아지는 모양이라, 처음 각도에서는 숨은 기둥이 없다. 끌어서 돌려 볼 수 있다. 문제가 뜬 뒤 5초 동안은 답을 받지 않는다. 상대는 봇 7명, 제한 시간 5분.</p>
  <button class="go" id="go">문제 받기</button></div>`;on('go',newGame);
}
DR.games.cubes={title:'큐브 세기',start(r){root=r;intro()}};
}
