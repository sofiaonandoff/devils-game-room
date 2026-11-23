{
const rnd=DR.rnd,shuffle=DR.shuffle;
let root,G;
const $=s=>root.querySelector(s);
const on=(id,f)=>{const e=root.querySelector('#'+id);if(e)e.onclick=f};
const fmt=ms=>{const s=Math.max(0,Math.floor(ms/1000));return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`};

/* ---------- 유배지 매치 공통: 4명이 같은 문제를 풀고, 가장 늦은 1명이 최종 탈락 ---------- */
function race(id,lo,hi,limit){
  const bots=shuffle(DR.BOTS.slice()).slice(0,3).map(b=>({name:b[0],t:(lo+Math.random()*(hi-lo))*1000}));
  return {id,t0:Date.now(),bots,limit:limit*1000,me:null,done:false};
}
function raceStatus(R){
  const el=Date.now()-R.t0,rows=R.bots.map(b=>({name:b.name,t:b.t<=el?b.t:null})).concat([{name:'나',me:1,t:R.me}]);
  const doneN=rows.filter(r=>r.t!=null).length;
  return {el,rows,doneN};
}
function raceBox(R){
  const {el,rows}=raceStatus(R);
  const sorted=rows.slice().sort((a,b)=>(a.t??1e12)-(b.t??1e12));
  return `<div class="row sp"><p class="k">유배지 매치 · 4명 중 가장 늦은 1명이 최종 탈락</p><b class="clock">${fmt(R.limit-el)}</b></div>
  <table>${sorted.map((r,i)=>`<tr class="${r.me?'me':''}"><td>${r.t!=null?i+1:'-'}</td><td>${r.name}</td><td class="n">${r.t!=null?fmt(r.t)+' 완성':'푸는 중'}</td></tr>`).join('')}</table>`;
}
// 끝났는지: 내가 풀었거나, 봇 셋이 모두 먼저 풀었거나, 시간이 다 됐을 때
function raceCheck(R,onEnd){
  if(R.done)return true;const {el,rows}=raceStatus(R);
  const botsDone=rows.filter(r=>!r.me&&r.t!=null).length;
  if(R.me!=null||botsDone==3||el>=R.limit){R.done=true;
    const sorted=rows.slice().sort((a,b)=>(a.t??1e12)-(b.t??1e12)),rank=sorted.findIndex(r=>r.me)+1,out=rank==4;
    DR.record(R.id,{clear:!out,score:R.me!=null?R.me/1000:null,lowBetter:1,text:R.me!=null?`${fmt(R.me)} · ${rank}위`:null});
    onEnd({rank,out,sorted});return true}
  return false;
}
function raceEnd(R,res,extra){
  return `<div class="rule pop"><b style="font-size:20px">${res.out?'가장 늦었다 — 유배지에서도 탈락, 데블스 플랜을 완전히 떠난다':`${res.rank}위로 통과 — 유배지에 남는다`}</b>${extra?`<br>${extra}`:''}</div><button class="go" id="re">새 문제</button>`;
}

/* =================== 달라진 그림 찾기 (2일차) =================== */
const PAL=['#e0384f','#e8c262','#2f8a5b','#2f6fb0','#7b5cc4','#c9741f','#3f8f8a','#b0397a'];
function shapeSVG(s){const t=`transform="translate(${s.x} ${s.y}) rotate(${s.rot}) scale(${s.k})"`;
  if(s.type=='c')return `<circle ${t} r="${s.r}" fill="${s.col}"/>`;
  if(s.type=='r')return `<rect ${t} x="${-s.r}" y="${-s.r*.7}" width="${s.r*2}" height="${s.r*1.4}" rx="4" fill="${s.col}"/>`;
  if(s.type=='t')return `<polygon ${t} points="0,${-s.r} ${s.r*.9},${s.r*.7} ${-s.r*.9},${s.r*.7}" fill="${s.col}"/>`;
  const p=[...Array(10)].map((_,i)=>{const a=i*Math.PI/5-Math.PI/2,rr=i%2?s.r*.45:s.r;return `${(rr*Math.cos(a)).toFixed(1)},${(rr*Math.sin(a)).toFixed(1)}`}).join(' ');
  return `<polygon ${t} points="${p}" fill="${s.col}"/>`;}
function diffNew(){
  const shapes=[];let tries=0;
  while(shapes.length<24&&tries++<2000){const r=10+rnd(16),x=r+rnd(400-2*r),y=r+rnd(300-2*r);if(shapes.some(s=>Math.hypot(s.x-x,s.y-y)<s.r+r+4))continue;
    shapes.push({type:'crts'[rnd(4)],x,y,r,col:PAL[rnd(PAL.length)],rot:rnd(360),k:1})}
  const right=shapes.map(s=>({...s})),diffs=[],idx=shuffle([...shapes.keys()]).slice(0,7);
  idx.forEach((i,n)=>{const s=right[i],kind=['col','gone','size','move','rot','col','gone'][n];
    if(kind=='col')s.col=PAL.filter(c=>c!==s.col)[rnd(PAL.length-1)];else if(kind=='gone')s.gone=1;else if(kind=='size')s.k=s.k>1?.6:1.45;else if(kind=='move'){s.x+=s.x>200?-16:16}else s.rot+=s.type=='c'?0:45;
    if(kind=='rot'&&s.type=='c')s.col=PAL.filter(c=>c!==s.col)[0];
    diffs.push({x:(shapes[i].x+s.x)/2,y:(shapes[i].y+s.y)/2,r:Math.max(shapes[i].r,18)+10,found:false})});
  G={game:'diff',shapes,right,diffs,miss:[],lock:0,R:race('diff',70,170,300)};diffDraw();diffLoop();
}
function diffLoop(){if(G.game!='diff'||G.R.done)return;if(raceCheck(G.R,res=>{G.res=res;diffDraw()}))return;const c=$('.clock');if(c)c.textContent=fmt(G.R.limit-(Date.now()-G.R.t0));
  const b=$('#rb');if(b)b.innerHTML=raceBox(G.R);DR.after(diffLoop,500)}
function diffDraw(){
  const found=G.diffs.filter(d=>d.found).length;DR.status(`찾은 차이 ${found} / 7`);
  const marks=G.diffs.filter(d=>d.found||G.res).map(d=>`<circle cx="${d.x}" cy="${d.y}" r="${d.r}" fill="none" stroke="${d.found?'#e8c262':'#e0384f'}" stroke-width="3"/>`).join('')+G.miss.map(m=>`<text x="${m.x}" y="${m.y}" fill="#e0384f" font-size="22" text-anchor="middle" dominant-baseline="middle">×</text>`).join('');
  const pic=(arr,id)=>`<svg id="${id}" viewBox="0 0 400 300" class="dpic" role="img" aria-label="${id=='pl'?'원본 그림':'달라진 그림'}"><rect width="400" height="300" fill="var(--pan2)"/>${arr.filter(s=>!s.gone).map(shapeSVG).join('')}${marks}</svg>`;
  root.innerHTML=`<div class="card"><div class="row sp"><p class="k">2일차 유배지 매치 · 달라진 그림 찾기</p><span>찾은 차이 <b>${found} / 7</b>${Date.now()<G.lock?' · <span class="warn">잠깐 멈춤</span>':''}</span></div>
  <div class="dpics">${pic(G.shapes,'pl')}${pic(G.right,'pr')}</div><p class="mut" style="font-size:13px">두 그림에서 다른 곳 7군데를 어느 쪽에서든 누르세요. 틀린 곳을 누르면 3초 동안 누를 수 없다.</p></div>
  <div class="grid2"><div class="card" id="rb">${raceBox(G.R)}</div><div class="card">${G.res?raceEnd(G.R,G.res,`놓친 차이는 붉은 원으로 표시했다.`):'<p class="mut">일곱 군데를 모두 찾으면 완성.</p>'}</div></div>`;
  root.querySelectorAll('.dpic').forEach(svg=>svg.onclick=e=>{if(G.res||Date.now()<G.lock)return;const b=svg.getBoundingClientRect();if(!b.width)return;
    const x=(e.clientX-b.left)/b.width*400,y=(e.clientY-b.top)/b.height*300;const d=G.diffs.find(d=>!d.found&&Math.hypot(d.x-x,d.y-y)<=d.r);
    if(d){d.found=true;if(G.diffs.every(d=>d.found)){G.R.me=Date.now()-G.R.t0;raceCheck(G.R,res=>G.res=res)}}else{G.miss.push({x,y});G.lock=Date.now()+3000}diffDraw()});
  on('re',diffNew);
}

/* =================== 울타리 치기 (3일차) =================== */
function fenceNew(n){
  n=n||7;let reg;
  for(let t=0;t<3000;t++){reg=[...Array(n)].map(()=>Array(n).fill(0));let r=rnd(n),c=rnd(n);reg[r][c]=1;let cnt=1,goal=Math.round(n*n*(.35+Math.random()*.2));
    while(cnt<goal){const cells=[];reg.forEach((row,i)=>row.forEach((v,j)=>{if(v)[[1,0],[-1,0],[0,1],[0,-1]].forEach(([a,b])=>{const x=i+a,y=j+b;if(x>=0&&y>=0&&x<n&&y<n&&!reg[x][y])cells.push([x,y])})}));const [x,y]=cells[rnd(cells.length)];reg[x][y]=1;cnt++}
    if(fenceValid(reg,n))break}
  const clue=[...Array(n)].map((_,r)=>[...Array(n)].map((_,c)=>{const g=(x,y)=>x<0||y<0||x>=n||y>=n?0:reg[x][y];return [[-1,0],[1,0],[0,-1],[0,1]].filter(([a,b])=>g(r+a,c+b)!=reg[r][c]).length}));
  const show=clue.map(row=>row.map(()=>Math.random()<.72));
  G={game:'fence',n,reg,clue,show,h:[...Array(n+1)].map(()=>Array(n).fill(0)),v:[...Array(n)].map(()=>Array(n+1).fill(0)),R:race('fence',n*n*2.2,n*n*5.5,n*n*12),msg:''};
  fenceDraw();fenceLoop();
}
function fenceValid(reg,n){
  const g=(x,y)=>x<0||y<0||x>=n||y>=n?0:reg[x][y];
  for(let x=-1;x<n;x++)for(let y=-1;y<n;y++){const a=g(x,y),b=g(x,y+1),c=g(x+1,y),d=g(x+1,y+1);if(a==d&&b==c&&a!=b)return false}
  // 구멍 없음: 바깥과 이어지지 않은 빈칸이 없어야
  const seen=new Set(),st=[];for(let i=-1;i<=n;i++)for(let j=-1;j<=n;j++)if(i<0||j<0||i==n||j==n){seen.add(i+','+j);st.push([i,j])}
  while(st.length){const [x,y]=st.pop();[[1,0],[-1,0],[0,1],[0,-1]].forEach(([a,b])=>{const p=x+a,q=y+b,k=p+','+q;if(p<-1||q<-1||p>n||q>n||seen.has(k)||g(p,q))return;seen.add(k);st.push([p,q])})}
  for(let x=0;x<n;x++)for(let y=0;y<n;y++)if(!reg[x][y]&&!seen.has(x+','+y))return false;
  return true;
}
function fenceSolved(){
  const {n,h,v,clue,show}=G;
  for(let r=0;r<n;r++)for(let c=0;c<n;c++){if(!show[r][c])continue;const k=(h[r][c]==1)+(h[r+1][c]==1)+(v[r][c]==1)+(v[r][c+1]==1);if(k!=clue[r][c])return false}
  const deg={},adj={},add=(a,b)=>{(adj[a]=adj[a]||[]).push(b);(adj[b]=adj[b]||[]).push(a);deg[a]=(deg[a]||0)+1;deg[b]=(deg[b]||0)+1};
  for(let r=0;r<=n;r++)for(let c=0;c<n;c++)if(h[r][c]==1)add(r+','+c,r+','+(c+1));
  for(let r=0;r<n;r++)for(let c=0;c<=n;c++)if(v[r][c]==1)add(r+','+c,(r+1)+','+c);
  const vs=Object.keys(deg);if(!vs.length||vs.some(k=>deg[k]!=2))return false;
  const seen=new Set([vs[0]]),st=[vs[0]];while(st.length){const x=st.pop();adj[x].forEach(y=>{if(!seen.has(y)){seen.add(y);st.push(y)}})}
  return seen.size==vs.length;
}
function fenceLoop(){if(G.game!='fence'||G.R.done)return;if(raceCheck(G.R,res=>{G.res=res;fenceDraw()}))return;const b=$('#rb');if(b)b.innerHTML=raceBox(G.R);DR.after(fenceLoop,500)}
function fenceDraw(){
  const {n}=G,S=40,P=20,W=n*S+2*P;DR.status(`울타리 치기 ${n}×${n}`);
  let s=`<svg viewBox="0 0 ${W} ${W}" class="fsvg" role="img" aria-label="울타리 치기 판">`;
  for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(G.show[r][c])s+=`<text x="${P+c*S+S/2}" y="${P+r*S+S/2}" text-anchor="middle" dominant-baseline="central" font-family="Black Han Sans" font-size="22" fill="currentColor">${G.clue[r][c]}</text>`;
  const edge=(x1,y1,x2,y2,st,k)=>`<g class="fe" data-e="${k}"><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="transparent" stroke-width="16"/>${st==1?`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--blood)" stroke-width="5" stroke-linecap="round"/>`:st==2?`<text x="${(x1+x2)/2}" y="${(y1+y2)/2}" text-anchor="middle" dominant-baseline="central" font-size="13" fill="var(--mut)">×</text>`:`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--line)" stroke-width="1" stroke-dasharray="2 4"/>`}</g>`;
  for(let r=0;r<=n;r++)for(let c=0;c<n;c++)s+=edge(P+c*S,P+r*S,P+(c+1)*S,P+r*S,G.h[r][c],`h${r},${c}`);
  for(let r=0;r<n;r++)for(let c=0;c<=n;c++)s+=edge(P+c*S,P+r*S,P+c*S,P+(r+1)*S,G.v[r][c],`v${r},${c}`);
  if(G.showAns){const g=(x,y)=>x<0||y<0||x>=n||y>=n?0:G.reg[x][y],ln=(x1,y1,x2,y2)=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#e8c262" stroke-width="9" stroke-linecap="round" opacity=".55"/>`;
    for(let r=0;r<=n;r++)for(let c=0;c<n;c++)if(g(r-1,c)!=g(r,c))s+=ln(P+c*S,P+r*S,P+(c+1)*S,P+r*S);
    for(let r=0;r<n;r++)for(let c=0;c<=n;c++)if(g(r,c-1)!=g(r,c))s+=ln(P+c*S,P+r*S,P+c*S,P+(r+1)*S);
    for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(!G.show[r][c])s+=`<text x="${P+c*S+S/2}" y="${P+r*S+S/2}" text-anchor="middle" dominant-baseline="central" font-family="Black Han Sans" font-size="20" fill="var(--gold)">${G.clue[r][c]}</text>`}
  for(let r=0;r<=n;r++)for(let c=0;c<=n;c++)s+=`<circle cx="${P+c*S}" cy="${P+r*S}" r="3" fill="currentColor"/>`;
  s+='</svg>';
  root.innerHTML=`<div class="grid2"><div class="card"><div class="row sp"><p class="k">3일차 유배지 매치 · 울타리 치기</p><div class="row" style="gap:6px">${[5,7,10].map(k=>`<button data-n="${k}" class="${k==n?'sel':''}" style="min-height:36px;padding:4px 10px">${k}×${k}</button>`).join('')}</div></div>${s}
  <p class="mut" style="font-size:13px">점 사이를 누르면 선 → × → 지움. 숫자는 그 칸 네 변 가운데 선의 개수. 모든 선이 갈라지거나 겹치지 않는 하나의 고리가 되면 완성.</p><p class="warn">${G.msg||''}</p></div>
  <div class="stackg"><div class="card" id="rb">${raceBox(G.R)}</div><div class="card">${G.res?raceEnd(G.R,G.res)+(G.res.out?` <button id="ans" ${G.showAns?'aria-pressed="true"':''}>${G.showAns?'정답 숨기기':'정답 보기'}</button>${G.showAns?'<p class="mut" style="font-size:13px;margin:8px 0 0">금색 굵은 선이 정답 울타리, 금색 숫자는 가려져 있던 칸이다. 붉은 선은 내가 그은 선.</p>':''}`:''):`<button class="go" id="ck">완성 확인</button> <button id="cl">모두 지우기</button>`}</div></div></div>`;
  root.querySelectorAll('.fe').forEach(g=>g.onclick=()=>{if(G.res)return;const k=g.dataset.e,[r,c]=k.slice(1).split(',').map(Number),A=k[0]=='h'?G.h:G.v;A[r][c]=(A[r][c]+1)%3;G.msg='';
    if(fenceSolved()){G.R.me=Date.now()-G.R.t0;raceCheck(G.R,res=>G.res=res)}fenceDraw()});
  root.querySelectorAll('[data-n]').forEach(b=>b.onclick=()=>fenceNew(+b.dataset.n));
  on('ck',()=>{G.msg=fenceSolved()?'':'아직 아니다 — 숫자가 맞지 않거나 고리가 하나로 닫히지 않았다.';fenceDraw()});
  on('cl',()=>{G.h.forEach(r=>r.fill(0));G.v.forEach(r=>r.fill(0));fenceDraw()});on('ans',()=>{G.showAns=!G.showAns;fenceDraw()});on('re',()=>fenceNew(G.n));
}

/* =================== 대칭 퍼즐 (4일차) =================== */
const rotC=cs=>{const r=cs.map(([x,y])=>[-y,x]),mx=Math.min(...r.map(p=>p[0])),my=Math.min(...r.map(p=>p[1]));return r.map(([x,y])=>[x-mx,y-my])};
const normC=cs=>{const mx=Math.min(...cs.map(p=>p[0])),my=Math.min(...cs.map(p=>p[1]));return cs.map(([x,y])=>[x-mx,y-my])};
const isSym=cells=>{const S=new Set(cells.map(p=>p.join())),xs=cells.map(p=>p[0]),ys=cells.map(p=>p[1]),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);
  const t=f=>cells.every(p=>S.has(f(p).join()));
  return t(([x,y])=>[x0+x1-x,y])||t(([x,y])=>[x,y0+y1-y])||(x1-x0==y1-y0&&(t(([x,y])=>[x0+(y-y0),y0+(x-x0)])||t(([x,y])=>[x0+(y1-y),y0+(x1-x)])))};
const connectedC=cells=>{const S=new Set(cells.map(p=>p.join())),seen=new Set([cells[0].join()]),st=[cells[0]];while(st.length){const [x,y]=st.pop();[[1,0],[-1,0],[0,1],[0,-1]].forEach(([a,b])=>{const k=(x+a)+','+(y+b);if(S.has(k)&&!seen.has(k)){seen.add(k);st.push([x+a,y+b])}})}return seen.size==cells.length};
function symNew(){
  let pieces;
  for(let t=0;t<500;t++){
    const half=new Set(['3,'+rnd(5)]);const goal=8+rnd(4);
    while(half.size<goal){const arr=[...half].map(s=>s.split(',').map(Number)),[x,y]=arr[rnd(arr.length)],[a,b]=[[1,0],[-1,0],[0,1],[0,-1]][rnd(4)],nx=x+a,ny=y+b;if(nx<0||nx>3||ny<0||ny>5)continue;half.add(nx+','+ny)}
    const cells=[];half.forEach(s=>{const [x,y]=s.split(',').map(Number);cells.push([x,y],[7-x,y])});
    if(!connectedC(cells))continue;
    // 세 조각으로 나누기
    const seeds=shuffle(cells.slice()).slice(0,3),own={};seeds.forEach((p,i)=>own[p.join()]=i);
    let front=seeds.map((p,i)=>[p,i]);
    while(front.length){const k=rnd(front.length),[[x,y],i]=front.splice(k,1)[0];[[1,0],[-1,0],[0,1],[0,-1]].forEach(([a,b])=>{const q=(x+a)+','+(y+b);if(cells.some(c=>c.join()==q)&&own[q]==null){own[q]=i;front.push([[x+a,y+b],i])}})}
    pieces=[0,1,2].map(i=>cells.filter(c=>own[c.join()]===i));
    if(pieces.some(p=>p.length<3||!connectedC(p)))continue;
    if(pieces.some(p=>isSym(p)))continue;
    break}
  // 정답: 원래 대칭 도형 안의 자리 (판 가운데로 옮겨 둔다)
  const sol={};pieces.forEach((p,i)=>p.forEach(([x,y])=>sol[(x+1)+','+(y+2)]=i));
  pieces=pieces.map((p,i)=>{let c=normC(p);for(let k=rnd(4);k>0;k--)c=rotC(c);return {id:i,cells:c,at:null}});
  G={game:'sym',B:10,sol,pieces,sel:0,R:race('sym',90,260,600),msg:''};symDraw();symLoop();
}
function symLoop(){if(G.game!='sym'||G.R.done)return;if(raceCheck(G.R,res=>{G.res=res;symDraw()}))return;const b=$('#rb');if(b)b.innerHTML=raceBox(G.R);DR.after(symLoop,500)}
const placed=()=>G.pieces.filter(p=>p.at).flatMap(p=>p.cells.map(([x,y])=>[x+p.at[0],y+p.at[1]]));
function symCheck(){if(G.pieces.some(p=>!p.at))return false;const c=placed();return connectedC(c)&&isSym(c)}
const PCOL=['#e0384f','#e8c262','#2f6fb0'];
function fits(p,at){const occ=new Set(G.pieces.filter(q=>q!==p&&q.at).flatMap(q=>q.cells.map(([x,y])=>(x+q.at[0])+','+(y+q.at[1]))));
  return p.cells.every(([x,y])=>{const a=x+at[0],b=y+at[1];return a>=0&&b>=0&&a<G.B&&b<G.B&&!occ.has(a+','+b)})}
function afterMove(){const nx=G.pieces.find(q=>!q.at);
  if(symCheck()){G.R.me=Date.now()-G.R.t0;raceCheck(G.R,res=>G.res=res);G.msg=''}else G.msg=nx?'':'세 조각을 모두 놓았지만 아직 선대칭이 아니다.';symDraw()}
function symDraw(){
  DR.status('대칭 퍼즐');let occ={};G.pieces.forEach(p=>{if(p.at)p.cells.forEach(([x,y])=>occ[(x+p.at[0])+','+(y+p.at[1])]=p.id)});
  if(G.showAns)occ=G.sol;
  const pieceMini=p=>{const w=Math.max(...p.cells.map(c=>c[0]))+1,h=Math.max(...p.cells.map(c=>c[1]))+1,S=new Set(p.cells.map(c=>c.join()));
    return `<div class="tl" style="--ts:22px;grid-template-columns:repeat(${w},var(--ts))">${[...Array(h)].map((_,y)=>[...Array(w)].map((_,x)=>S.has(x+','+y)?`<span class="t" data-g="${x},${y}" style="background:${PCOL[p.id]}"></span>`:'<span></span>').join('')).join('')}</div>`};
  root.innerHTML=`<div class="grid2"><div class="card"><p class="k">4일차 유배지 매치 · 대칭 퍼즐</p>
  ${G.showAns?'<p class="ok" style="margin:6px 0">정답 배치 — 세로축 대칭. 버튼을 다시 누르면 내 배치로 돌아간다.</p>':''}<div class="symb ${G.showAns?'ans':''}" id="sb" style="grid-template-columns:repeat(${G.B},1fr)">${[...Array(G.B)].map((_,y)=>[...Array(G.B)].map((_,x)=>{const o=occ[x+','+y];return `<div class="sc2 ${o!=null&&G.sel===o?'selp':''}" data-xy="${x},${y}" ${o!=null?`data-op="${o}" style="background:${PCOL[o]}"`:''}></div>`}).join('')).join('')}</div>
  <p class="mut" style="font-size:13px">조각을 <b>끌어서</b> 판에 놓아 보세요. 놓인 조각도 끌어서 옮기고, 판 밖으로 끌면 되돌아간다. 조각을 누르면 고르고, 돌리기 버튼(또는 R 키)으로 돌린다. 세 조각으로 <b>선대칭</b> 도형(가로·세로·대각선 축 어느 것이든)을 만들면 완성.</p><p class="warn">${G.msg}</p></div>
  <div class="stackg"><div class="card"><p class="k">조각 (뒤집기 불가)</p><div class="row" style="align-items:flex-start;gap:14px">${G.pieces.map(p=>`<div class="spc ${G.sel===p.id?'sel':''} ${p.at?'used':''}" data-p="${p.id}" tabindex="0" role="button" aria-label="조각 ${p.id+1}">${pieceMini(p)}<small>${p.at?'판 위':'끌어서 놓기'}</small></div>`).join('')}</div>
  <div class="row" style="margin-top:10px"><button id="rt">고른 조각 돌리기 ↻</button><button id="rs">모두 거두기</button></div></div>
  <div class="card" id="rb">${raceBox(G.R)}</div>${G.res?`<div class="card">${raceEnd(G.R,G.res)}${G.res.out?` <button id="ans">${G.showAns?'정답 숨기기':'정답 보기'}</button>`:''}</div>`:''}</div></div>`;
  bindDrag();
  on('rt',rotateSel);
  on('rs',()=>{G.pieces.forEach(p=>p.at=null);G.msg='';symDraw()});on('re',symNew);on('ans',()=>{G.showAns=!G.showAns;symDraw()});
  root.onkeydown=e=>{if((e.key=='r'||e.key=='R')&&G.game=='sym'){rotateSel();e.preventDefault()}};
}
function rotateSel(){if(G.res)return;const p=G.pieces[G.sel];if(!p)return;const old=p.cells;p.cells=rotC(p.cells);
  if(p.at&&!fits(p,p.at)){p.cells=old;G.msg='판 위에서는 그 자리에서 돌릴 공간이 없다. 판 밖으로 꺼내서 돌려 보세요.';return symDraw()}
  if(p.at)return afterMove();symDraw()}
function bindDrag(){
  const sb=$('#sb');if(!sb)return;
  const start=(e,p,grab)=>{if(G.res)return;e.preventDefault();
    const rect=sb.getBoundingClientRect(),cs=rect.width/G.B,ghost=document.createElement('div');ghost.className='ghost';
    const w=Math.max(...p.cells.map(c=>c[0]))+1,h=Math.max(...p.cells.map(c=>c[1]))+1,S=new Set(p.cells.map(c=>c.join()));
    ghost.style.cssText=`position:fixed;left:0;top:0;z-index:50;pointer-events:none;display:grid;gap:2px;grid-template-columns:repeat(${w},${cs-2}px);opacity:.85`;
    ghost.innerHTML=[...Array(h)].map((_,y)=>[...Array(w)].map((_,x)=>`<span style="width:${cs-2}px;height:${cs-2}px;border-radius:3px;${S.has(x+','+y)?`background:${PCOL[p.id]};box-shadow:0 4px 12px #0006`:''}"></span>`).join('')).join('');
    document.body.appendChild(ghost);
    const sx=e.clientX,sy=e.clientY;let moved=false,target=null;
    const pos=ev=>{ghost.style.transform=`translate(${ev.clientX-(grab[0]+.5)*cs}px,${ev.clientY-(grab[1]+.5)*cs}px)`;
      const r=sb.getBoundingClientRect();const cx=Math.floor((ev.clientX-r.left)/cs),cy=Math.floor((ev.clientY-r.top)/cs);
      const inside=ev.clientX>=r.left&&ev.clientX<=r.right&&ev.clientY>=r.top&&ev.clientY<=r.bottom;
      target=inside?[cx-grab[0],cy-grab[1]]:null;
      const ok=target&&fits(p,target);ghost.style.filter=target&&!ok?'grayscale(1) brightness(.6)':'';
      sb.querySelectorAll('.pv2').forEach(x=>x.classList.remove('pv2','bad2'));
      if(target)p.cells.forEach(([x,y])=>{const c=sb.querySelector(`[data-xy="${x+target[0]},${y+target[1]}"]`);if(c)c.classList.add('pv2',ok?'x':'bad2')})};
    pos(e);
    const mv=ev=>{if(Math.hypot(ev.clientX-sx,ev.clientY-sy)>5)moved=true;pos(ev)};
    const up=ev=>{window.removeEventListener('pointermove',mv);window.removeEventListener('pointerup',up);ghost.remove();
      G.sel=p.id;
      if(!moved){return symDraw()}
      if(target&&fits(p,target)){p.at=target;G.msg=''}
      else if(!target){p.at=null;G.msg=''}
      else G.msg='거기에는 놓을 수 없다.';
      afterMove()};
    window.addEventListener('pointermove',mv);window.addEventListener('pointerup',up);
  };
  root.querySelectorAll('[data-p]').forEach(el=>{el.onpointerdown=e=>{const p=G.pieces[+el.dataset.p];const g=e.target.closest('[data-g]');
      const grab=g?g.dataset.g.split(',').map(Number):p.cells[0];if(p.at){p.at=null}start(e,p,grab)};
    el.onkeydown=e=>{if(e.key=='Enter'||e.key==' '){G.sel=+el.dataset.p;symDraw()}}});
  sb.querySelectorAll('[data-op]').forEach(el=>el.onpointerdown=e=>{if(G.res)return;const p=G.pieces[+el.dataset.op],[x,y]=el.dataset.xy.split(',').map(Number);start(e,p,[x-p.at[0],y-p.at[1]])});
}

/* =================== 신의 시험 =================== */
// 범대각 마방진: M[i][j] = 7·((a·i+b·j) mod 7) + ((c·i+d·j) mod 7) + 1. 위아래·좌우를 이어 붙여도 마방진이라, 1을 어느 칸으로든 옮길 수 있다.
function panMagic(){
  const n=7,g=(x,y)=>{x=Math.abs(x);while(y){[x,y]=[y,x%y]}return x},ok=x=>x%n!=0&&g(((x%n)+n)%n,n)==1,opts=[];
  for(let a=1;a<n;a++)for(let b=1;b<n;b++)for(let c=1;c<n;c++)for(let d=1;d<n;d++)
    if([a,b,a+b,a-b,c,d,c+d,c-d,a*d-b*c].every(ok))opts.push([a,b,c,d]);
  const [a,b,c,d]=opts[rnd(opts.length)],M=[...Array(n)].map((_,i)=>[...Array(n)].map((_,j)=>n*((a*i+b*j)%n)+((c*i+d*j)%n)+1));
  let i0,j0;M.forEach((row,i)=>row.forEach((v,j)=>{if(v==1){i0=i;j0=j}}));
  const r0=rnd(n),c0=rnd(n),S=[...Array(n)].map((_,i)=>[...Array(n)].map((_,j)=>M[(i-r0+i0+n*2)%n][(j-c0+j0+n*2)%n]));
  // 2에서 3으로 가는 걸음 (힌트용)
  let p2,p3;S.forEach((row,i)=>row.forEach((v,j)=>{if(v==2)p2=[i,j];if(v==3)p3=[i,j]}));
  return {S,one:[r0,c0],two:p2,step:[(p3[0]-p2[0]+n)%n,(p3[1]-p2[1]+n)%n]};
}
// 1이 같은 자리에 오는 정답 예시를 이 방식으로 만들 수 있는 만큼 모두 만든다 (매개변수 × 회전·뒤집기 8가지 × 판 밀기)
function godVariants(){
  if(G.variants)return G.variants;
  const n=7,g=(x,y)=>{x=Math.abs(x);while(y){[x,y]=[y,x%y]}return x},ok=x=>x%n!=0&&g(((x%n)+n)%n,n)==1,seen=new Set(),out=[];
  const T=[(i,j)=>[i,j],(i,j)=>[j,n-1-i],(i,j)=>[n-1-i,n-1-j],(i,j)=>[n-1-j,i],(i,j)=>[i,n-1-j],(i,j)=>[n-1-i,j],(i,j)=>[j,i],(i,j)=>[n-1-j,n-1-i]];
  for(let a=1;a<n;a++)for(let b=1;b<n;b++)for(let c=1;c<n;c++)for(let d=1;d<n;d++){
    if(![a,b,a+b,a-b,c,d,c+d,c-d,a*d-b*c].every(ok))continue;
    const M=[...Array(n)].map((_,i)=>[...Array(n)].map((_,j)=>n*((a*i+b*j)%n)+((c*i+d*j)%n)+1));
    T.forEach(t=>{const R=[...Array(n)].map(()=>Array(n));M.forEach((row,i)=>row.forEach((v,j)=>{const [x,y]=t(i,j);R[x][y]=v}));
      let i0,j0;R.forEach((row,i)=>row.forEach((v,j)=>{if(v==1){i0=i;j0=j}}));
      const S=[...Array(n)].map((_,i)=>[...Array(n)].map((_,j)=>R[(i-G.one[0]+i0+n*2)%n][(j-G.one[1]+j0+n*2)%n])),k=S.flat().join(',');
      if(!seen.has(k)){seen.add(k);out.push(S)}})}
  G.variants=out;return out;
}
// 내 판 진단: 빈칸, 범위 밖, 중복, 틀린 줄
function godReport(){
  const st=godState(),n=G.v.map(r=>r.map(x=>x===''?null:+x)),all=n.flat(),cnt={};all.forEach(x=>{if(x!=null)cnt[x]=(cnt[x]||0)+1});
  const empty=all.filter(x=>x==null).length,dup=Object.keys(cnt).filter(k=>cnt[k]>1).map(Number),out=all.filter(x=>x!=null&&(x<1||x>49)),miss=[...Array(49)].map((_,i)=>i+1).filter(k=>!cnt[k]);
  const lines=[];st.rows.forEach((v,i)=>{if(v!=null&&v!=175)lines.push(`${i+1}행 ${v}`)});st.cols.forEach((v,i)=>{if(v!=null&&v!=175)lines.push(`${i+1}열 ${v}`)});
  if(st.d1!=null&&st.d1!=175)lines.push(`↘ 대각선 ${st.d1}`);if(st.d2!=null&&st.d2!=175)lines.push(`↙ 대각선 ${st.d2}`);
  const msgs=[];
  if(st.ok)msgs.push('<b class="ok">조건을 모두 만족하는 마방진이다. 통과!</b>');
  else{if(empty)msgs.push(`빈칸 ${empty}개`);if(out.length)msgs.push(`1~49 밖의 수: ${out.join(', ')}`);if(dup.length)msgs.push(`두 번 이상 쓴 수: ${dup.join(', ')}`);
    if(miss.length&&miss.length<=12)msgs.push(`아직 안 쓴 수: ${miss.join(', ')}`);if(lines.length)msgs.push(`합이 175가 아닌 줄: ${lines.join(' · ')}`);
    if(!lines.length&&!dup.length&&!out.length&&empty)msgs.push('지금까지 다 채운 줄은 모두 175로 맞다.')}
  return msgs;
}
function godNew(){const P=panMagic();G={game:'god',sol:P.S,one:P.one,two:P.two,step:P.step,v:[...Array(7)].map(()=>Array(7).fill('')),t0:Date.now(),limit:3600e3,hints:0,done:null};G.v[P.one[0]][P.one[1]]='1';godDraw();godLoop()}
function godLoop(){if(G.game!='god'||G.done)return;const l=G.limit-(Date.now()-G.t0);const c=$('.clock');if(c)c.textContent=fmt(l);if(l<=0){G.done='fail';DR.record('god',{clear:false});return godDraw()}DR.after(godLoop,1000)}
function godState(){const n=G.v.map(r=>r.map(x=>x===''?null:+x)),sum=a=>a.every(x=>x!=null)?a.reduce((s,x)=>s+x,0):null;
  const rows=n.map(r=>sum(r)),cols=[...Array(7)].map((_,c)=>sum(n.map(r=>r[c]))),d1=sum(n.map((r,i)=>r[i])),d2=sum(n.map((r,i)=>r[6-i]));
  const all=n.flat(),cnt={};all.forEach(x=>{if(x!=null)cnt[x]=(cnt[x]||0)+1});
  const bad=all.map(x=>x!=null&&(x<1||x>49||cnt[x]>1||!Number.isInteger(x)));
  const ok=all.every(x=>x!=null)&&!bad.some(b=>b)&&[...rows,...cols,d1,d2].every(s=>s==175);
  return {rows,cols,d1,d2,bad,ok,filled:all.filter(x=>x!=null).length}}
function godDraw(){
  const s=godState();DR.status(`채운 칸 ${s.filled} / 49`);
  const tag=v=>v==null?'':`<small class="${v==175?'ok':'warn'}">${v}</small>`;
  const dir=(di,dj)=>{const v=di==0?'':di<=3?`아래로 ${di}칸`:`위로 ${7-di}칸`,h=dj==0?'':dj<=3?`오른쪽으로 ${dj}칸`:`왼쪽으로 ${7-dj}칸`;return [v,h].filter(Boolean).join(', ')};
  const H=['가로·세로·두 대각선, 열여섯 줄의 합이 모두 같다. 1부터 49까지 더하면 1225, 일곱 줄로 나누면 한 줄은 175.',
    '이 판은 위아래·좌우 끝이 서로 이어진 판으로 생각하면 풀린다. 연속된 수는 늘 같은 걸음으로 이어지고(판 밖으로 나가면 반대편에서 들어온다), 7의 배수 다음에만 걸음이 바뀐다.',
    `2는 ${G.two[0]+1}행 ${G.two[1]+1}열. 그다음 수들은 ${dir(G.step[0],G.step[1])}씩 이어진다.`];
  root.innerHTML=`<div class="grid2"><div class="card"><div class="row sp"><p class="k">신의 시험 · 7×7</p><b class="clock">${fmt(G.limit-(Date.now()-G.t0))}</b></div>
  ${G.showAns?(()=>{const V=godVariants(),m=S=>S.flat().filter((x,i)=>String(x)===G.v[Math.floor(i/7)][i%7]).length,sorted=G.sorted||(G.sorted=V.slice().sort((a,b)=>m(b)-m(a)));G.ai=Math.min(G.ai||0,sorted.length-1);const A=sorted[G.ai];
    return `<div class="row sp" style="margin:6px 0"><span class="ok"><b>정답 예시 ${G.ai+1} / ${sorted.length}</b> · 내 답과 같은 칸 ${m(A)}개</span><span class="row" style="gap:6px"><button id="ap" ${G.ai?'':'disabled'} aria-label="이전 예시" style="min-height:36px;padding:2px 12px">‹</button><button id="an" ${G.ai<sorted.length-1?'':'disabled'} aria-label="다음 예시" style="min-height:36px;padding:2px 12px">›</button></span></div>
    <p class="mut" style="font-size:13px;margin:0 0 6px">이 1의 자리로 만들 수 있는 정답을 내 답과 가까운 순서로 보여 준다. 초록 칸은 이 예시와 같게 넣은 수. 여기 없는 배치라도 합 조건만 맞으면 정답이다.</p>
    <div class="magic">${A.map((row,r)=>row.map((x,c)=>`<span class="mg ans ${String(x)===G.v[r][c]?'same':''}">${x}</span>`).join('')+'<span class="ms"><small class="ok">175</small></span>').join('')}${'<span class="ms"><small class="ok">175</small></span>'.repeat(7)}<span class="ms"><small class="ok">175</small></span></div>`})():`
  <div class="magic">${G.v.map((row,r)=>row.map((x,c)=>`<input class="mg ${s.bad[r*7+c]?'bad':''}" data-rc="${r},${c}" value="${x}" inputmode="numeric" maxlength="2" ${r==G.one[0]&&c==G.one[1]?'readonly':''} aria-label="${r+1}행 ${c+1}열">`).join('')+`<span class="ms">${tag(s.rows[r])}</span>`).join('')}
  ${s.cols.map(v=>`<span class="ms">${tag(v)}</span>`).join('')}<span class="ms">${tag(s.d1)}${s.d2!=null?' / '+s.d2:''}</span></div>`}
  <p class="mut" style="font-size:13px">오른쪽과 아래는 줄의 합, 오른쪽 아래 끝은 두 대각선의 합. 같은 수가 두 번 들어가면 붉게 표시된다.</p></div>
  <div class="stackg"><div class="card pop">${G.done=='ok'?`<h2>신의 시험 통과 — 메인 매치로 부활한다</h2><p>${fmt(G.doneT)} 만에 완성. 힌트 ${G.hints}개 사용.</p><button class="go" id="re">다시 도전</button>`
    :G.done=='fail'?`<h2>실패 — 데블스 플랜을 완전히 떠난다</h2><div class="rule"><b>내 판 진단</b><ul style="margin:6px 0 0">${godReport().map(x=>`<li>${x}</li>`).join('')}</ul></div><div class="row"><button class="go" id="re">다시 도전</button><button id="ans">${G.showAns?'정답 숨기기':'정답 보기'}</button></div>`
    :`<p class="k">유배지 벽에 새겨진 문장</p><p>"<b>플레이어가 마방진에 놓을 수 있으면, 연속된 칸을 이어 갈 수 있다.</b>"</p>
    <p>1부터 49까지 모든 수를 한 번씩 넣어, 가로·세로·대각선의 합이 모두 같은 마방진을 1시간 안에 완성하라. 실패하면 완전히 탈락한다.</p>
    ${H.slice(0,G.hints).map((h,i)=>`<div class="rule">힌트 ${i+1}. ${h}</div>`).join('')}
    ${G.report?`<div class="rule" role="status"><b>정답 확인</b><ul style="margin:6px 0 0">${G.report.map(x=>`<li>${x}</li>`).join('')}</ul><small class="mut">1의 자리가 맞고 1~49를 한 번씩 써서 열여섯 줄이 모두 175면, 어떤 배치든 정답으로 인정한다.</small></div>`:''}
    <div class="row"><button class="go" id="chk">정답 확인</button>${G.hints<H.length?`<button id="hn">힌트 보기 (${G.hints+1}/${H.length})</button>`:''}<button id="clr">모두 지우기</button><button id="gv">포기</button></div>`}</div></div></div>`;
  root.querySelectorAll('.mg').forEach(inp=>inp.oninput=()=>{const [r,c]=inp.dataset.rc.split(',').map(Number);G.v[r][c]=inp.value.replace(/\D/g,'');G.report=null;
    const st=godState();if(st.ok&&!G.done){G.done='ok';G.doneT=Date.now()-G.t0;DR.record('god',{clear:true,score:G.doneT/1000,lowBetter:1,text:`${fmt(G.doneT)} · 힌트 ${G.hints}`});godDraw();return}
    // 합만 다시 그리기 (입력 포커스 유지)
    const tmp=document.createElement('div');const keep=document.activeElement&&document.activeElement.dataset.rc;godDraw();if(keep){const e=root.querySelector(`[data-rc="${keep}"]`);if(e){e.focus();e.setSelectionRange(e.value.length,e.value.length)}}});
  on('hn',()=>{G.hints++;godDraw()});on('clr',()=>{G.v=G.v.map((r,i)=>r.map((x,j)=>i==G.one[0]&&j==G.one[1]?'1':''));godDraw()});
  on('gv',()=>{G.done='fail';DR.record('god',{clear:false});godDraw()});on('re',godNew);on('ans',()=>{G.showAns=!G.showAns;G.sorted=null;G.ai=0;godDraw()});on('ap',()=>{G.ai--;godDraw()});on('an',()=>{G.ai++;godDraw()});on('chk',()=>{G.report=godReport();godDraw()});
}

/* =================== 소개 화면 =================== */
const INTRO={
 diff:['2일차 유배지 매치','다른 곳 일곱 군데를 찾아라','<li>두 그림이 나란히 나온다. 색, 크기, 위치, 각도가 바뀌거나 사라진 곳이 <b>일곱 군데</b> 있다.</li><li>틀린 곳을 누르면 3초 동안 누를 수 없다.</li><li>네 명 가운데 <b>가장 늦게 끝낸 1명</b>이 유배지에서도 탈락한다.</li>','그림은 매번 새로 그린다. 방송의 그림과 세부 진행은 공개 자료에서 확인하지 못해, 일반적인 틀린 그림 찾기 규칙으로 만들었다.',diffNew],
 fence:['3일차 유배지 매치','점을 이어 하나의 울타리를','<li>점과 점 사이에 선을 그어 <b>하나의 닫힌 고리</b>를 만든다. 갈라지거나 교차하면 안 된다.</li><li>칸의 숫자는 그 칸의 네 변 가운데 선이 지나가는 변의 개수.</li><li>네 명 가운데 <b>가장 늦게 완성한 1명</b>이 탈락.</li>','방송에서는 슬리더링크 규칙으로 약 10×10 판을 썼다. 여기서는 5×5, 7×7, 10×10 가운데 고를 수 있고, 숫자 몇 개는 가려 둔다. 숫자를 만족하는 고리라면 어느 것이든 정답이다.',()=>fenceNew(7)],
 sym:['4일차 유배지 매치','세 조각으로 대칭 도형을','<li>조각 <b>세 개</b>를 옮기고 돌려서(뒤집기 불가) 하나의 <b>선대칭 도형</b>을 만든다.</li><li>세 조각을 모두 써야 하고, 조각끼리 이어져 있어야 한다.</li><li>네 명 가운데 <b>가장 늦게 완성한 1명</b>이 탈락.</li>','방송은 자유로운 다각형 조각이었다. 여기서는 칸 위의 조각으로 바꿨고, 가로·세로·대각선 어느 축의 대칭이든 정답으로 친다.',symNew],
 god:['유배지 · 부활의 길','1은 이미 놓여 있다','<li>유배지의 암호를 풀면 열리는 길. 메인 매치 전에 도전할 수 있고, 주어진 시간은 <b>1시간</b>.</li><li>통과하면 <b>메인 매치로 복귀</b>, 실패하면 <b>완전히 탈락</b>한다.</li><li>7×7 판에 1부터 49까지 넣어 가로·세로·대각선의 합이 모두 같게 만든다. 1은 미리 놓여 있고, 문제마다 1의 자리가 바뀐다.</li>','방송에서 상세 규칙은 공개되지 않았다. 출연자의 말로 1의 위치가 고정된 7×7 마방진으로 추정되는 것을 그대로 만들었다.',godNew]
};
function intro(k){
  const [tp,h,rules,note,go]=INTRO[k];DR.status('준비');
  root.innerHTML=`<div class="card"><p class="k">${tp}</p><h2>${h}</h2><div class="rule"><ul>${rules}</ul></div><p class="mut" style="font-size:14px">${note}</p><button class="go" id="go">${k=='god'?'신의 시험에 도전':'시작'}</button></div>`;
  on('go',go);
}
DR.games.fence={title:'울타리 치기',start(r){root=r;G={};intro('fence')}};
DR.games.sym={title:'대칭 퍼즐',start(r){root=r;G={};intro('sym')}};
DR.games.god={title:'신의 시험',start(r){root=r;G={};intro('god')}};
DR.exileTest={isSym,fenceValid,connectedC,
  fenceAnswer(){const {n,reg}=G,g=(x,y)=>x<0||y<0||x>=n||y>=n?0:reg[x][y];for(let r=0;r<=n;r++)for(let c=0;c<n;c++)G.h[r][c]=g(r-1,c)!=g(r,c)?1:0;for(let r=0;r<n;r++)for(let c=0;c<=n;c++)G.v[r][c]=g(r,c-1)!=g(r,c)?1:0;return fenceSolved()},
  symAnswerExists(){return G.pieces&&G.pieces.length==3&&G.pieces.every(p=>p.cells.length>=3)},
  godVariantsCheck(){const V=godVariants();let bad=0;V.forEach(S=>{G.v=S.map(r=>r.map(String));if(!godState().ok||S[G.one[0]][G.one[1]]!=1)bad++});return {n:V.length,bad}},
  godCheck(){G.v=G.sol.map(row=>row.map(String));return godState().ok&&G.sol[G.one[0]][G.one[1]]==1}};
}
