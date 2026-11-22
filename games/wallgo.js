{
const rnd=DR.rnd,shuffle=DR.shuffle;
const S=7,DR4=[[-1,0],[0,1],[1,0],[0,-1]],DN=['위','오른쪽','아래','왼쪽'];
const COLS=['#e0384f','#2f8a5b','#2f6fb0'];
let root,G;
const $=s=>root.querySelector(s);
const on=(id,f)=>{const e=root.querySelector('#'+id);if(e)e.onclick=f};

/* ---------- 판 ---------- */
function board(){return {H:[...Array(S-1)].map(()=>Array(S).fill(0)),V:[...Array(S)].map(()=>Array(S-1).fill(0)),pcs:[]}}
const wallAt=(B,r,c,d)=>d==0?(r==0?2:B.H[r-1][c]):d==2?(r==S-1?2:B.H[r][c]):d==3?(c==0?2:B.V[r][c-1]):(c==S-1?2:B.V[r][c]); // 2=테두리
function setWall(B,r,c,d,v){if(d==0)B.H[r-1][c]=v;else if(d==2)B.H[r][c]=v;else if(d==3)B.V[r][c-1]=v;else B.V[r][c]=v}
const occ=(B,r,c)=>B.pcs.some(p=>p.r==r&&p.c==c);
// 말 하나의 갈 수 있는 곳: [{r,c,brk:[r,c,d]|null}]
function moves(B,p,canBreak){
  const out=[],seen=new Set(),add=(r,c,brk)=>{const k=r+','+c+(brk?'b':'');if(!seen.has(k)){seen.add(k);out.push({r,c,brk})}};
  const stepOK=(r,c,d,brk)=>{const w=wallAt(B,r,c,d);if(w==2)return null;const nr=r+DR4[d][0],nc=c+DR4[d][1];if(occ(B,nr,nc))return null;
    if(w){if(!canBreak||brk)return null;return {r:nr,c:nc,brk:[r,c,d]}}return {r:nr,c:nc,brk}};
  for(let d=0;d<4;d++){const a=stepOK(p.r,p.c,d,null);if(!a)continue;add(a.r,a.c,a.brk);
    if(p.kind=='S'){const b=stepOK(a.r,a.c,d,a.brk);if(b)add(b.r,b.c,b.brk)}
    else[(d+1)%4,(d+3)%4].forEach(e=>{const b=stepOK(a.r,a.c,e,a.brk);if(b)add(b.r,b.c,b.brk)})}
  // 벽을 부수지 않고도 갈 수 있으면 부수는 길은 뺀다
  return out.filter(m=>!m.brk||!out.some(n=>!n.brk&&n.r==m.r&&n.c==m.c));
}
function regions(B){const id=[...Array(S)].map(()=>Array(S).fill(-1)),sizes=[];let k=0;
  for(let r=0;r<S;r++)for(let c=0;c<S;c++){if(id[r][c]>=0)continue;let n=0;const st=[[r,c]];id[r][c]=k;
    while(st.length){const [a,b]=st.pop();n++;for(let d=0;d<4;d++){if(wallAt(B,a,b,d))continue;const x=a+DR4[d][0],y=b+DR4[d][1];if(id[x][y]<0){id[x][y]=k;st.push([x,y])}}}sizes.push(n);k++}
  return {id,sizes}}
function scoreOf(B,owners){const R=regions(B),own={};B.pcs.forEach(p=>{(own[R.id[p.r][p.c]]=own[R.id[p.r][p.c]]||new Set()).add(p.o)});
  const separated=Object.values(own).every(s=>s.size<=1);
  const res={};owners.forEach(o=>{const regs=[...new Set(B.pcs.filter(p=>p.o==o).map(p=>R.id[p.r][p.c]))];res[o]={area:regs.reduce((s,x)=>s+R.sizes[x],0),big:Math.max(0,...regs.map(x=>R.sizes[x]))}});
  return {separated,res,R};
}
// 봇 평가: 벽을 따라 가장 가까운 쪽이 차지하는 칸 수
function territory(B,owners){const dist={};owners.forEach(o=>{const D=[...Array(S)].map(()=>Array(S).fill(99)),q=[];B.pcs.filter(p=>p.o==o).forEach(p=>{D[p.r][p.c]=0;q.push([p.r,p.c])});
  for(let i=0;i<q.length;i++){const [a,b]=q[i];for(let d=0;d<4;d++){if(wallAt(B,a,b,d))continue;const x=a+DR4[d][0],y=b+DR4[d][1];if(D[x][y]>D[a][b]+1){D[x][y]=D[a][b]+1;q.push([x,y])}}}dist[o]=D});
  const t={};owners.forEach(o=>t[o]=0);
  for(let r=0;r<S;r++)for(let c=0;c<S;c++){let best=99,who=null,tie=false;owners.forEach(o=>{const d=dist[o][r][c];if(d<best){best=d;who=o;tie=false}else if(d==best)tie=true});if(who!=null&&!tie&&best<99)t[who]++}
  return t}
function clone(B){return {H:B.H.map(r=>r.slice()),V:B.V.map(r=>r.slice()),pcs:B.pcs.map(p=>({...p}))}}
function botTurn(B,o,owners,canBreak){
  let best=null,bs=-1e9;
  B.pcs.forEach((p,pi)=>{if(p.o!==o)return;moves(B,p,false).forEach(m=>{
    const B2=clone(B);B2.pcs[pi].r=m.r;B2.pcs[pi].c=m.c;
    for(let d=0;d<4;d++){if(wallAt(B2,m.r,m.c,d))continue;const B3=clone(B2);setWall(B3,m.r,m.c,d,1);
      const sc=scoreOf(B3,owners);let v;
      if(sc.separated){const mine=sc.res[o].area,oth=Math.max(...owners.filter(x=>x!==o).map(x=>sc.res[x].area));v=(mine-oth)*3+mine}
      else{const t=territory(B3,owners);v=t[o]-Math.max(...owners.filter(x=>x!==o).map(x=>t[x]))*.8}
      v+=Math.random()*.9;if(v>bs){bs=v;best={pi,m,d}}}})});
  return best;
}

/* ---------- 진행 ---------- */
function newGame(){
  const bots=shuffle(DR.BOTS.slice()).slice(0,2);
  G={names:['나',bots[0][0],bots[1][0]],round:1,log:[],r1:null};
  setupRound([0,1,2].sort(()=>Math.random()-.5),false);
}
function setupRound(order,second){
  G.B=board();G.order=order;G.owners=order.slice();G.second=second;G.broke={};G.sel=null;G.move=null;G.done=false;
  if(second){// 원형 말 2개는 정해진 자리
    const [a,b]=order;[[1,1],[5,5]].forEach(([r,c])=>G.B.pcs.push({o:a,kind:'C',r,c}));[[1,5],[5,1]].forEach(([r,c])=>G.B.pcs.push({o:b,kind:'C',r,c}));
    G.placeSeq=[[a,'S'],[b,'S'],[b,'S'],[a,'S']];
  }else G.placeSeq=order.concat(order.slice().reverse()).map(o=>[o,null]);
  G.pi=0;G.phase='place';G.turn=0;
  if(!order.includes(0))return autoRound();
  step();
}
const kindsLeft=o=>{const has=G.B.pcs.filter(p=>p.o==o).map(p=>p.kind);return G.second?['S']:['S','C'].filter(k=>!has.includes(k))};
function step(){
  if(G.phase=='place'){
    if(G.pi>=G.placeSeq.length){G.phase='play';G.turn=0;return step()}
    const [o]=G.placeSeq[G.pi];
    if(o!==0){render();DR.after(()=>{botPlace(o);G.pi++;step()},700);return}
    G.placeKind=kindsLeft(0)[0];return render();
  }
  if(G.phase=='play'){
    const o=G.order[G.turn%G.order.length];
    if(!G.B.pcs.some(p=>p.o==o&&moves(G.B,p,false).length)){G.log.unshift(`${G.names[o]}: 움직일 말이 없어 넘어간다`);G.turn++;return step()}
    if(o!==0){render();DR.after(()=>{const t=botTurn(G.B,o,G.owners);if(!t){G.turn++;return step()}const p=G.B.pcs[t.pi];
      G.log.unshift(`${G.names[o]}: ${p.kind=='S'?'사각':'원형'} 말 → ${'ABCDEFG'[t.m.c]}${t.m.r+1}, ${DN[t.d]}에 벽`);
      p.r=t.m.r;p.c=t.m.c;setWall(G.B,p.r,p.c,t.d,1);after()},900);return}
    return render();
  }
}
function botPlace(o){
  const k=kindsLeft(o);const kind=G.second?'S':k[rnd(k.length)];let best=null,bs=-1e9;
  for(let r=0;r<S;r++)for(let c=0;c<S;c++){if(occ(G.B,r,c))continue;const B=clone(G.B);B.pcs.push({o,kind,r,c});const t=territory(B,G.owners);const v=t[o]+Math.random()*2-(r==0||c==0||r==S-1||c==S-1?1:0);if(v>bs){bs=v;best=[r,c]}}
  G.B.pcs.push({o,kind,r:best[0],c:best[1]});G.log.unshift(`${G.names[o]}: ${kind=='S'?'사각':'원형'} 말을 ${'ABCDEFG'[best[1]]}${best[0]+1}에`);
}
function after(){
  const sc=scoreOf(G.B,G.owners);
  if(sc.separated)return endRound(sc);
  G.turn++;G.sel=null;G.move=null;step();
}
function endRound(sc){
  G.done=true;G.sc=sc;
  const rank=G.owners.slice().sort((a,b)=>sc.res[b].area-sc.res[a].area||sc.res[b].big-sc.res[a].big);
  G.rank=rank;
  if(!G.second){G.r1={rank,res:sc.res};G.phase='r1end'}else{G.phase='end';G.final=rank;
    const youIn=G.owners.includes(0);const alive=youIn?rank[0]==0:true;
    DR.record('wallgo',{clear:G.r1.rank[0]==0||alive,score:G.r1.res[0].area,text:G.r1.rank[0]==0?`1라운드 1위 (${G.r1.res[0].area}칸)`:alive?`2라운드 승리 (${sc.res[0].area}칸)`:null})}
  render();
}
function autoRound(){// 내가 빠진 2라운드: 봇끼리 빠르게
  const B=G.B;G.placeSeq.forEach(([o])=>botPlace(o));G.phase='play';let guard=0;
  for(;;){const o=G.order[G.turn%2];const t=botTurn(B,o,G.owners);if(t){const p=B.pcs[t.pi];p.r=t.m.r;p.c=t.m.c;setWall(B,p.r,p.c,t.d,1)}
    const sc=scoreOf(B,G.owners);if(sc.separated||++guard>200)return endRound(sc);G.turn++}
}
/* ---------- 화면 ---------- */
function cellHTML(r,c){
  const B=G.B,p=B.pcs.find(q=>q.r==r&&q.c==c),sty=[0,1,2,3].map(d=>{const w=wallAt(B,r,c,d);return w==1?'var(--wall)':w==2?'transparent':'var(--line)'});
  const legal=G.move===null&&G.sel!=null?G.legal.find(m=>m.r==r&&m.c==c):null;
  const reg=G.done?G.sc.R.id[r][c]:null,regOwner=G.done?(B.pcs.find(q=>G.sc.R.id[q.r][q.c]==reg)||{}).o:null;
  const placeable=G.phase=='place'&&G.placeSeq[G.pi]&&G.placeSeq[G.pi][0]===0&&!p;
  const selectable=G.phase=='play'&&G.order[G.turn%G.order.length]===0&&p&&p.o===0&&G.move==null;
  const tag=placeable||legal||selectable?'button':'div';
  return `<${tag} class="wc ${legal?(legal.brk?'lg br':'lg'):''} ${G.sel!=null&&G.B.pcs[G.sel]===p?'sl':''}" data-rc="${r},${c}" style="border-top-color:${sty[0]};border-right-color:${sty[1]};border-bottom-color:${sty[2]};border-left-color:${sty[3]};${regOwner!=null?`background:color-mix(in srgb,${COLS[regOwner]} 22%,transparent)`:''}" ${tag=='button'?`aria-label="${'ABCDEFG'[c]}${r+1}"`:''}>
  ${p?`<i class="wp ${p.kind}" style="background:${COLS[p.o]}"></i>`:''}</${tag}>`;
}
function render(){
  DR.status(G.second?'2라운드 · 1:1':'1라운드 · 3인전');
  const o=G.phase=='play'?G.order[G.turn%G.order.length]:G.phase=='place'&&G.placeSeq[G.pi]?G.placeSeq[G.pi][0]:null;
  const myTurn=o===0;let panel='';
  if(G.phase=='place')panel=myTurn?`<p class="k">말 놓기</p><h3 style="font-size:22px">${G.second?'사각 말을':'놓을 말을 고르고'} 빈칸을 누르세요</h3>${G.second?'':`<div class="row">${kindsLeft(0).map(k=>`<button class="${G.placeKind==k?'sel':''}" data-k="${k}">${k=='S'?'사각 말 (곧게 1~2칸)':'원형 말 (1칸 + 꺾어서 1칸)'}</button>`).join('')}</div>`}`:`<p class="mut">${G.names[o]}가 말을 놓는 중…</p>`;
  else if(G.phase=='play'){
    if(!myTurn)panel=`<p class="mut">${G.names[o]}의 차례…</p>`;
    else if(G.move==null)panel=`<p class="k">내 차례 · 90초 안에 이동 → 벽</p><h3 style="font-size:22px">${G.sel==null?'움직일 내 말을 누르세요':'갈 칸을 누르세요'}</h3>
      ${!G.second&&!G.broke[0]?`<label class="tg"><input type="checkbox" id="bk" ${G.breakOn?'checked':''}> 벽 부수기 (1라운드에 한 번, 길의 벽 하나를 부수고 지나간다)</label>`:''}
      ${G.sel!=null?'<button id="cs">다른 말 고르기</button>':''}`;
    else{const p=G.B.pcs[G.sel];panel=`<p class="k">벽 세우기 (반드시)</p><h3 style="font-size:22px">방금 움직인 말의 어느 면에?</h3><div class="row">${[0,1,2,3].map(d=>`<button data-w="${d}" ${wallAt(G.B,p.r,p.c,d)?'disabled':''}>${DN[d]}</button>`).join('')}</div>`}
  }else{
    const sc=G.sc,rank=G.rank;
    panel=`<p class="k">${G.second?'2라운드':'1라운드'} 끝 · 말이 든 영역의 칸 수</p><table>${rank.map((x,i)=>`<tr class="${x==0?'me':''} ${G.second&&i==1?'lose':''}"><td>${i+1}</td><td>${G.names[x]}</td><td class="n">${sc.res[x].area}칸</td><td class="mut">가장 큰 영역 ${sc.res[x].big}</td></tr>`).join('')}</table>`;
    if(G.phase=='r1end'){const w=rank[0],rest=rank.slice(1);
      panel+=`<p style="margin-top:10px"><b>${G.names[w]}</b> 생존 확정. ${rest.map(x=>G.names[x]).join(' vs ')} 의 2라운드 (사각 2 + 원형 2, 원형은 정해진 자리, 벽 부수기 없음).</p><button class="go" id="r2">${rest.includes(0)?'2라운드 시작':'2라운드 결과 보기'}</button>`}
    else panel+=`<h3 style="font-size:24px;margin:10px 0">${G.r1.rank[0]==0?'1라운드에서 이미 생존했다':G.rank[0]==0?'2라운드 승리 · 생존, 피스 +1':'2라운드 패배 · 탈락'}</h3><button class="go" id="re">다시 하기</button>`;
  }
  root.innerHTML=`<div class="grid2"><div class="card"><div class="row sp"><p class="k">7×7 판</p><div class="row" style="gap:12px;font-size:14px">${G.owners.map(x=>`<span><i class="wp S" style="background:${COLS[x]};display:inline-block;width:12px;height:12px;vertical-align:-1px"></i> ${G.names[x]}</span>`).join('')}</div></div>
  <div class="wboard">${[...Array(S)].map((_,r)=>[...Array(S)].map((_,c)=>cellHTML(r,c)).join('')).join('')}</div></div>
  <div class="stackg"><div class="card pop">${panel}</div><div class="card"><p class="k">기록</p><ul class="log">${G.log.slice(0,10).map(t=>`<li>${t}</li>`).join('')}</ul></div></div></div>`;
  root.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{G.placeKind=b.dataset.k;render()});
  root.querySelectorAll('[data-rc]').forEach(b=>{if(b.tagName!='BUTTON')return;b.onclick=()=>{const [r,c]=b.dataset.rc.split(',').map(Number);
    if(G.phase=='place'){const kind=G.second?'S':G.placeKind;G.B.pcs.push({o:0,kind,r,c});G.log.unshift(`나: ${kind=='S'?'사각':'원형'} 말을 ${'ABCDEFG'[c]}${r+1}에`);G.pi++;return step()}
    const pi=G.B.pcs.findIndex(p=>p.r==r&&p.c==c);
    if(pi>=0&&G.B.pcs[pi].o===0){G.sel=pi;G.legal=moves(G.B,G.B.pcs[pi],!G.second&&!G.broke[0]&&G.breakOn);return render()}
    const m=G.legal.find(x=>x.r==r&&x.c==c);if(!m)return;const p=G.B.pcs[G.sel];
    if(m.brk){setWall(G.B,m.brk[0],m.brk[1],m.brk[2],0);G.broke[0]=1;G.log.unshift('나: 벽을 부수고 지나갔다')}
    G.log.unshift(`나: ${p.kind=='S'?'사각':'원형'} 말 → ${'ABCDEFG'[c]}${r+1}`);p.r=r;p.c=c;G.move=m;render()}});
  root.querySelectorAll('[data-w]').forEach(b=>b.onclick=()=>{const p=G.B.pcs[G.sel],d=+b.dataset.w;setWall(G.B,p.r,p.c,d,1);G.log.unshift(`나: ${DN[d]}에 벽`);after()});
  const bk=$('#bk');if(bk)bk.onchange=()=>{G.breakOn=bk.checked;if(G.sel!=null)G.legal=moves(G.B,G.B.pcs[G.sel],G.breakOn);render()};
  on('cs',()=>{G.sel=null;render()});on('re',newGame);
  on('r2',()=>{const rest=G.r1.rank.slice(1);G.round=2;setupRound(rest,true)});
  // 벽을 세울 면이 없으면 건너뛴다
  if(G.phase=='play'&&G.move!=null){const p=G.B.pcs[G.sel];if([0,1,2,3].every(d=>wallAt(G.B,p.r,p.c,d)))after()}
}
function intro(){
  DR.status('준비');
  root.innerHTML=`<div class="card"><p class="k">4일차 감옥 매치</p><h2>말을 움직이고, 벽을 세워 땅을 가른다</h2>
  <div class="rule"><ol><li>7×7 판. 각자 <b>사각 말</b>(상하좌우 한 방향으로 1~2칸)과 <b>원형 말</b>(한 칸 가서, 왼쪽이나 오른쪽으로 꺾어 1칸 더 갈 수 있음)을 하나씩.</li>
  <li>선부터 말을 하나씩 놓고, 두 번째 말은 역순으로 놓는다.</li>
  <li>차례마다 내 말 하나를 움직이고, <b>방금 움직인 말</b>의 한 면에 <b>반드시</b> 벽을 세운다. 다른 말이 있는 칸과 벽은 지나갈 수 없다.</li>
  <li>1라운드에 한해, 각자 한 번 길의 벽 하나를 <b>부수고</b> 지나갈 수 있다.</li>
  <li>모든 플레이어의 말이 벽으로 완전히 갈리면 즉시 끝. 내 말이 든 영역의 칸 수가 점수, 동률이면 더 넓은 영역끼리 비교.</li>
  <li><b>1라운드 3인전</b>의 1위는 생존. 나머지 둘이 <b>2라운드 1:1</b> (사각 말 2개 + 정해진 자리의 원형 말 2개, 벽 부수기 없음). 진 사람 탈락.</li></ol></div>
  <p class="mut" style="font-size:14px">방송에서 2라운드 원형 말의 시작 자리는 공개되지 않아, 여기서는 대각선 대칭 자리로 정했다.</p><button class="go" id="go">시작</button></div>`;on('go',newGame);
}
DR.games.wallgo={title:'벽바둑Ⅱ',start(r){root=r;intro()}};
}
