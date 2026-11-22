{
const rnd=DR.rnd,shuffle=DR.shuffle;
const N=8,KEEP=Math.max(1,Math.floor(N*9/16));
const TILES={3:['###','##N','###','.#.'],4:['##.','ON.','##O','##.'],6:['.#O','.#N','O#.','O#.'],7:['.O.','.#N','O#O','O..'],9:['.O','#N','OO','.O','.O'],11:['OO..','.ON.','..OO','...O'],13:['OON','OOO','OOO']};
const NUMS=[3,4,6,7,9,11,13];
const CHOICES={5:[['점수','승점 5점 획득'],['정보','선택 6, 7, 8 미리보기']],6:[['공격','배치 성공 시 타일 번호의 승점 2배, 실패 시 −4'],['방어','내 타일에서 최대 2칸 잘라 내기 (이어진 칸만, 숫자 칸·가운데 구멍·두 동강 불가)']],
  7:[['상생','2인 팀. 서로의 타일이 맞닿은 변 하나마다 추가 승점, 둘이 나눔'],['견제',`타일 배치에 성공한 사람이 ${KEEP}명 이하면 +5 (방송 16명 중 9명 기준을 ${N}명에 맞춤)`]],8:[['가로수','가로수 1그루 배치 — 그 위에는 구멍 뚫린 칸만'],['맨홀','+1·−1 맨홀 배치 — 덮은 타일이 그만큼 더하거나 뺌']]};
let root,G;
const $=s=>root.querySelector(s);
const on=(id,f)=>{const e=root.querySelector('#'+id);if(e)e.onclick=f};

/* ---------- 타일 ---------- */
const parse=rows=>{const out=[];rows.forEach((row,r)=>[...row].forEach((ch,c)=>{if(ch!='.')out.push({r,c,t:ch})}));return out};
const norm=cs=>{const mr=Math.min(...cs.map(x=>x.r)),mc=Math.min(...cs.map(x=>x.c));return cs.map(x=>({...x,r:x.r-mr,c:x.c-mc}))};
const rot=cs=>norm(cs.map(x=>({...x,r:x.c,c:-x.r})));
const rots=n=>{const a=[norm(parse(TILES[n]))];for(let i=0;i<3;i++)a.push(rot(a[i]));return a};
function cutOK(cells,cut){
  if(cut.length>2)return false;if(cut.some(k=>cells[k].t=='N'))return false;
  if(cut.length==2){const [a,b]=cut.map(k=>cells[k]);if(Math.abs(a.r-b.r)+Math.abs(a.c-b.c)!=1)return false}
  const rest=cells.filter((_,i)=>!cut.includes(i)),key=new Set(rest.map(x=>x.r+','+x.c));
  // 이어져 있는가
  const seen=new Set([rest[0].r+','+rest[0].c]),st=[rest[0]];
  while(st.length){const x=st.pop();[[1,0],[-1,0],[0,1],[0,-1]].forEach(([a,b])=>{const k=(x.r+a)+','+(x.c+b);if(key.has(k)&&!seen.has(k)){seen.add(k);st.push({r:x.r+a,c:x.c+b})}})}
  if(seen.size!=rest.length)return false;
  // 가운데에 막힌 빈칸이 생기지 않는가
  const R=Math.max(...cells.map(x=>x.r))+3,C=Math.max(...cells.map(x=>x.c))+3,out=new Set(['-1,-1']),q=[[-1,-1]];
  while(q.length){const [r,c]=q.pop();[[1,0],[-1,0],[0,1],[0,-1]].forEach(([a,b])=>{const nr=r+a,nc=c+b,k=nr+','+nc;if(nr<-1||nc<-1||nr>R||nc>C||out.has(k)||key.has(k))return;out.add(k);q.push([nr,nc])})}
  for(let r=0;r<R;r++)for(let c=0;c<C;c++){const k=r+','+c;if(!key.has(k)&&!out.has(k))return false}
  return true;
}
/* ---------- 공원 판 ---------- */
function park(){
  const size=7*N+2,R=11,C=11,cells=new Set(),k=(r,c)=>r+','+c;cells.add(k(5,5));
  while(cells.size<size){const cand=[];cells.forEach(s=>{const [r,c]=s.split(',').map(Number);[[1,0],[-1,0],[0,1],[0,-1]].forEach(([a,b])=>{const nr=r+a,nc=c+b;if(nr<0||nc<0||nr>=R||nc>=C||cells.has(k(nr,nc)))return;
    const nb=[[1,0],[-1,0],[0,1],[0,-1]].filter(([x,y])=>cells.has(k(nr+x,nc+y))).length;cand.push([nr,nc,nb*nb+Math.random()*2.2])})});
    cand.sort((a,b)=>b[2]-a[2]);const pick=cand[rnd(Math.min(3,cand.length))];cells.add(k(pick[0],pick[1]))}
  const g=[...Array(R)].map((_,r)=>[...Array(C)].map((_,c)=>cells.has(k(r,c))));
  // 빈 줄·칸 잘라 내기
  let r0=0,r1=R-1,c0=0,c1=C-1;while(!g[r0].some(x=>x))r0++;while(!g[r1].some(x=>x))r1--;while(!g.some(row=>row[c0]))c0++;while(!g.some(row=>row[c1]))c1--;
  return g.slice(r0,r1+1).map(row=>row.slice(c0,c1+1));
}
/* ---------- 놓기 ---------- */
function fits(cells,r0,c0){const B=G.board;return cells.every(x=>{const r=r0+x.r,c=c0+x.c;if(!B[r]||!B[r][c]||G.occ[r][c]!=null)return false;if(G.tree[r][c]&&x.t!='O')return false;return true})}
function allPlacements(n,canCut){
  const out=[],cutSets=[[]];
  if(canCut){const base=rots(n)[0];base.forEach((_,i)=>cutSets.push([i]));base.forEach((a,i)=>base.forEach((b,j)=>{if(j>i&&Math.abs(a.r-b.r)+Math.abs(a.c-b.c)==1)cutSets.push([i,j])}))}
  cutSets.forEach(cut=>{const base=norm(parse(TILES[n])),okCut=!cut.length||cutOK(base,cut);if(!okCut)return;
    let cs=norm(base.filter((_,i)=>!cut.includes(i)));for(let q=0;q<4;q++){
      for(let r=0;r<G.board.length;r++)for(let c=0;c<G.board[0].length;c++)if(fits(cs,r,c))out.push({cells:cs,r,c,cut:cut.length,rot:q});cs=rot(cs)}});
  return out;
}
const scoreCells=(pl)=>pl.cells.reduce((s,x)=>s+(G.man[pl.r+x.r][pl.c+x.c]||0),0);
function commit(p,pl){
  if(!pl){p.placed=false;G.log.unshift({t:`${p.name}: ${p.tile}번 타일 — 놓을 자리가 없다. 실패.`,c:'b'});return}
  p.placed=true;p.cells=pl.cells.map(x=>[pl.r+x.r,pl.c+x.c]);p.cells.forEach(([r,c])=>G.occ[r][c]=p.id);p.manBonus=scoreCells(pl);
  G.log.unshift({t:`${p.name}: ${p.tile}번 타일 배치${pl.cut?` (${pl.cut}칸 자름)`:''}${p.manBonus?` · 맨홀 ${p.manBonus>0?'+':''}${p.manBonus}`:''}`});
}
function botPlace(p){
  const all=allPlacements(p.tile,p.c6=='방어');if(!all.length)return null;
  let best=null,bs=-1e9;all.forEach(pl=>{let v=scoreCells(pl)*3-pl.cut*.5;
    pl.cells.forEach(x=>{const r=pl.r+x.r,c=pl.c+x.c;[[1,0],[-1,0],[0,1],[0,-1]].forEach(([a,b])=>{const nr=r+a,nc=c+b;const inside=G.board[nr]&&G.board[nr][nc];if(!inside||G.occ[nr][nc]!=null)v+=.6;if(p.partner!=null&&inside&&G.occ[nr][nc]===p.partner)v+=2})});
    v+=Math.random();if(v>bs){bs=v;best=pl}});return best;
}

/* ---------- 진행 ---------- */
function newGame(){
  const ps=[{name:'나',you:1}].concat(shuffle(DR.BOTS.slice()).map(b=>({name:b[0],risk:Math.random()})));
  shuffle(ps).forEach((p,i)=>{p.prio=i});ps.forEach((p,i)=>{p.id=i;p.score=0;p.tile=null;p.partner=null});
  G={ps,board:park(),log:[],phase:'c5'};
  const R=G.board.length,C=G.board[0].length;G.occ=[...Array(R)].map(()=>Array(C).fill(null));G.tree=[...Array(R)].map(()=>Array(C).fill(0));G.man=[...Array(R)].map(()=>Array(C).fill(0));
  render();
}
const me=()=>G.ps.find(p=>p.you);
const P=i=>G.ps[i];
const byPrio=a=>a.slice().sort((x,y)=>x.prio-y.prio);
function choose(k,mine){
  G.ps.forEach(p=>{let v;if(p.you)v=mine;else if(k==5)v=Math.random()<.7?'점수':'정보';else if(k==6)v=Math.random()<(p.tile<=6?.7:.3)+(p.risk-.5)*.3?'공격':'방어';
    else if(k==7)v=Math.random()<.55?'견제':'상생';else v=Math.random()<.5?'가로수':'맨홀';p['c'+k]=v});
  if(k==5)G.ps.forEach(p=>{if(p.c5=='점수')p.score+=5});
  if(k==7){const pair=byPrio(G.ps.filter(p=>p.c7=='상생'));for(let i=0;i+1<pair.length;i+=2){pair[i].partner=pair[i+1].id;pair[i+1].partner=pair[i].id}}
  G.last={k,picks:G.ps.map(p=>p['c'+k])};
  G.phase=k==5?'pick':k==6?'c7':k==7?'c8':'objects';
  if(G.phase=='pick'){G.pickOrder=G.ps.slice().sort((a,b)=>a.score-b.score||a.prio-b.prio).map(p=>p.id);G.pi=0}
  if(G.phase=='objects')setupObjects();
  render();if(G.phase=='pick')pickStep();
}
function pickStep(){
  if(G.pi>=G.pickOrder.length){G.phase='c6';return render()}
  const p=P(G.pickOrder[G.pi]);if(p.you)return render();
  render();DR.after(()=>{const w=NUMS.map(n=>n<=4?1:n<=7?2.2:n<=9?1.8+p.risk:n==11?1+p.risk*1.5:.5+p.risk*2);let x=Math.random()*w.reduce((a,b)=>a+b),i=0;while((x-=w[i])>0)i++;
    p.tile=NUMS[i];G.log.unshift({t:`${p.name}: ${p.tile}번 타일`});G.pi++;pickStep()},450);
}
const placeOrder=()=>G.ps.slice().sort((a,b)=>a.tile-b.tile||a.prio-b.prio);
function setupObjects(){
  G.obj=[];placeOrder().forEach(p=>{if(p.c8=='맨홀')G.obj.push({p:p.id,kind:'+1'},{p:p.id,kind:'-1'})});placeOrder().forEach(p=>{if(p.c8=='가로수')G.obj.push({p:p.id,kind:'tree'})});
  G.oi=0;objStep();
}
function freeObj(kind){const out=[];G.board.forEach((row,r)=>row.forEach((v,c)=>{if(v&&!G.tree[r][c]&&!G.man[r][c])out.push([r,c])}));return out}
function putObj(o,r,c){if(o.kind=='tree')G.tree[r][c]=1;else G.man[r][c]=o.kind=='+1'?1:-1;G.log.unshift({t:`${P(o.p).name}: ${o.kind=='tree'?'가로수':o.kind+' 맨홀'}`});G.oi++;objStep()}
function objStep(){
  if(G.oi>=G.obj.length){G.phase='place';G.order=placeOrder().map(p=>p.id);G.qi=0;return placeStep()}
  const o=G.obj[G.oi];if(P(o.p).you)return render();
  render();DR.after(()=>{const f=freeObj(o.kind);const [r,c]=f[rnd(f.length)];putObj(o,r,c)},450);
}
function placeStep(){
  if(G.qi>=G.order.length)return finish();
  const p=P(G.order[G.qi]);
  if(p.you){G.rot=0;G.cut=[];G.anchor=null;G.any=allPlacements(p.tile,p.c6=='방어').length>0;
    if(!G.any){commit(p,null);G.qi++;return DR.after(placeStep,900)}return render()}
  render();DR.after(()=>{commit(p,botPlace(p));G.qi++;placeStep()},650);
}
function finish(){
  const placed=G.ps.filter(p=>p.placed).length;
  G.ps.forEach(p=>{let s=0,parts=[];if(p.placed){const v=p.c6=='공격'?p.tile*2:p.tile;s+=v;parts.push(`타일 ${v}`);if(p.manBonus){s+=p.manBonus;parts.push(`맨홀 ${p.manBonus>0?'+':''}${p.manBonus}`)}}
    else if(p.c6=='공격'){s-=4;parts.push('공격 실패 −4')}
    if(p.c7=='견제'&&placed<=KEEP){s+=5;parts.push('견제 +5')}
    p.gain=s;p.parts=parts});
  // 상생: 맞닿은 변 수를 반씩
  const done=new Set();G.ps.forEach(p=>{if(p.partner==null||done.has(p.id))return;const q=P(p.partner);done.add(p.id);done.add(q.id);
    if(!p.placed||!q.placed)return;let e=0;const qs=new Set(q.cells.map(x=>x.join()));p.cells.forEach(([r,c])=>[[1,0],[-1,0],[0,1],[0,-1]].forEach(([a,b])=>{if(qs.has((r+a)+','+(c+b)))e++}));
    if(!e)return;const half=Math.floor(e/2),odd=e%2,lo=(p.score+p.gain<q.score+q.gain||(p.score+p.gain==q.score+q.gain&&p.prio<q.prio))?p:q;
    [p,q].forEach(x=>{const g=half+(x===lo?odd:0);x.gain+=g;x.parts.push(`상생 +${g}`)})});
  G.ps.forEach(p=>p.score+=p.gain);
  G.rank=G.ps.slice().sort((a,b)=>b.score-a.score);G.phase='end';
  const my=G.rank.indexOf(me())+1;DR.record('grass',{clear:me().placed,score:me().score,text:`${me().score}점 · ${my}위`});render();
}

/* ---------- 화면 ---------- */
function tileHTML(n,cells,small){const R=Math.max(...cells.map(x=>x.r))+1,C=Math.max(...cells.map(x=>x.c))+1,key={};cells.forEach((x,i)=>key[x.r+','+x.c]={...x,i});
  return `<div class="tl ${small?'sm':''}" style="grid-template-columns:repeat(${C},var(--ts))">${[...Array(R)].map((_,r)=>[...Array(C)].map((_,c)=>{const x=key[r+','+c];return x?`<span class="t ${x.t}">${x.t=='N'?n:''}</span>`:'<span></span>'}).join('')).join('')}</div>`}
function curCells(p){let base=norm(parse(TILES[p.tile]));if(G.cut.length)base=norm(base.filter((_,i)=>!G.cut.includes(i)));let cs=base;for(let i=0;i<G.rot;i++)cs=rot(cs);return cs}
function boardHTML(preview){
  const B=G.board,pv={};let ok=null;
  if(preview){const {cells,r0,c0}=preview;ok=fits(cells,r0,c0);cells.forEach(x=>pv[(r0+x.r)+','+(c0+x.c)]=x.t)}
  const cols=['#2f8a5b','#3fa06c','#277a50','#4caf7a','#1f6b45','#5bbf88','#2a9060','#3d8f62'];
  return `<div class="park" style="grid-template-columns:repeat(${B[0].length},var(--cs))">${B.map((row,r)=>row.map((v,c)=>{if(!v)return '<span class="pc0"></span>';
    const o=G.occ[r][c],t=pv[r+','+c],clickable=G.phase=='place'&&P(G.order[G.qi]).you||G.phase=='objects'&&G.obj[G.oi]&&P(G.obj[G.oi].p).you;
    const tag=clickable?'button':'span';
    return `<${tag} class="pc ${t?(ok?'pv':'pvx'):''} ${o!=null?'own':''}" data-rc="${r},${c}" style="${o!=null?`background:${P(o).you?'var(--gold)':cols[o%8]}`:''}">${G.tree[r][c]?'<i class="tree"></i>':''}${G.man[r][c]?`<i class="man">${G.man[r][c]>0?'+1':'−1'}</i>`:''}</${tag}>`}).join('')).join('')}</div>`;
}
function choiceHTML(k){const [a,b]=CHOICES[k];return `<p class="k">선택 ${k}</p><div class="ab">${[a,b].map((x,i)=>`<button data-ch="${x[0]}">${x[0]}<small>${x[1]}</small></button>`).join('')}</div>`}
function render(){
  const m=me();DR.status(G.phase=='end'?'끝':{c5:'선택 5',pick:'타일 고르기',c6:'선택 6',c7:'선택 7',c8:'선택 8',objects:'맨홀·가로수',place:'타일 놓기'}[G.phase]);
  let panel='';
  const lastPicks=G.last?`<div class="tags">${G.ps.map(p=>`<span class="tag">${p.name} · ${p['c'+G.last.k]}</span>`).join('')}</div>`:'';
  if(['c5','c6','c7','c8'].includes(G.phase)){const k=+G.phase[1];panel=`${G.last?`<p class="mut" style="font-size:13px">선택 ${G.last.k} 공개</p>${lastPicks}`:''}${choiceHTML(k)}${k==6?`<p class="mut">내 타일: <b>${m.tile}번</b></p>`:''}`}
  else if(G.phase=='pick'){const cur=P(G.pickOrder[G.pi]);panel=`${lastPicks}<p class="k">타일 고르기 · 승점 낮은 사람부터, 모두가 보는 앞에서</p>
    <p>순서: ${G.pickOrder.map(id=>`${P(id).name}${P(id).tile?` (${P(id).tile})`:''}`).join(' → ')}</p>
    ${cur.you?`<h3 style="font-size:22px">내 타일을 고르세요 (바꿀 수 없다)</h3><div class="tiles">${NUMS.map(n=>`<button data-t="${n}">${tileHTML(n,norm(parse(TILES[n])),true)}<b>${n}번</b><small>${parse(TILES[n]).length}칸</small></button>`).join('')}</div>`:`<p class="mut">${cur.name}가 고르는 중…</p>`}`}
  else if(G.phase=='objects'){const o=G.obj[G.oi];panel=`${lastPicks}<p class="k">맨홀 → 가로수 배치</p>${o&&P(o.p).you?`<h3 style="font-size:22px">${o.kind=='tree'?'가로수':o.kind+' 맨홀'}을 놓을 칸을 누르세요</h3><p class="mut">맨홀 위에는 가로수를 놓을 수 없다.</p>`:'<p class="mut">다른 사람이 놓는 중…</p>'}`}
  else if(G.phase=='place'){const cur=P(G.order[G.qi]);
    panel=`<p class="k">타일 놓기 · 번호가 작은 타일부터</p><p style="font-size:14px">${G.order.map((id,i)=>`<span style="${i==G.qi?'font-weight:700;color:var(--blood)':i<G.qi?'opacity:.5':''}">${P(id).name}(${P(id).tile})</span>`).join(' → ')}</p>`;
    if(cur.you){const cells=curCells(cur);
      panel+=`<h3 style="font-size:22px">${cur.tile}번 타일 — 판을 눌러 놓을 자리를 고르세요</h3>
      <div class="row" style="align-items:flex-start">${tileHTML(cur.tile,cells)}<div class="stackg" style="gap:8px"><button id="rt">돌리기 ↻</button>${cur.c6=='방어'?`<div><p class="mut" style="font-size:13px;margin:0 0 4px">방어: 자를 칸 누르기 (${G.cut.length}/2)</p>${cutPicker(cur)}</div>`:''}</div></div>
      ${G.anchor?`<p>${fits(cells,G.anchor[0],G.anchor[1])?'<span class="ok">놓을 수 있다</span>':'<span class="warn">여기는 안 된다</span>'}</p><button class="go" id="pl" ${fits(cells,G.anchor[0],G.anchor[1])?'':'disabled'}>여기에 놓기</button>`:''}
      <p class="mut" style="font-size:13px">돌릴 수 있고 뒤집을 수 없다. 가로수 칸에는 구멍(○) 칸만. 누른 칸이 타일의 왼쪽 위 모서리가 된다.</p>`}
    else panel+=`<p class="mut">${cur.name}가 놓는 중…</p>`}
  else if(G.phase=='end'){panel=`<p class="k">공원 완성 · 결과</p><table><tr><th>순위</th><th>플레이어</th><th>선택 6·7·8</th><th>이번 판</th><th class="n">합계</th></tr>${G.rank.map((p,i)=>`<tr class="${p.you?'me':''}"><td>${i+1}</td><td>${p.name}</td><td>${p.c6}·${p.c7}·${p.c8}</td><td style="font-size:13px">${p.parts.join(', ')||(p.placed?'':'실패')}</td><td class="n">${p.score}</td></tr>`).join('')}</table>
    <p class="mut" style="font-size:13px">배치 성공 ${G.ps.filter(p=>p.placed).length}명 (견제 기준 ${KEEP}명 이하)</p><button class="go" id="re">다시 하기</button>`}
  const prev=G.phase=='place'&&P(G.order[G.qi]).you&&G.anchor?{cells:curCells(m),r0:G.anchor[0],c0:G.anchor[1]}:null;
  const info=m.c5=='정보'&&['pick','c6','c7'].includes(G.phase)?`<div class="card"><p class="k">정보 · 미리 본 선택 카드</p>${[6,7,8].map(k=>`<p style="font-size:14px;margin:4px 0"><b>${k}</b>: ${CHOICES[k][0][0]} / ${CHOICES[k][1][0]}</p>`).join('')}</div>`:'';
  root.innerHTML=`<div class="grid2"><div class="card"><div class="row sp"><p class="k">공원 ${G.board.flat().filter(x=>x).length}칸 · ${N}명</p><span class="mut">내 승점 ${m.score}${m.tile?` · ${m.tile}번 타일`:''}</span></div>${boardHTML(prev)}</div>
  <div class="stackg"><div class="card pop">${panel}</div>${info}<div class="card"><p class="k">기록</p><ul class="log">${G.log.slice(0,8).map(l=>`<li class="${l.c||''}">${l.t}</li>`).join('')||'<li class="mut">아직 없다</li>'}</ul></div></div></div>`;
  root.querySelectorAll('[data-ch]').forEach(b=>b.onclick=()=>choose(+G.phase[1],b.dataset.ch));
  root.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{m.tile=+b.dataset.t;G.log.unshift({t:`나: ${m.tile}번 타일`});G.pi++;pickStep()});
  root.querySelectorAll('[data-rc]').forEach(b=>{if(b.tagName!='BUTTON')return;b.onclick=()=>{const [r,c]=b.dataset.rc.split(',').map(Number);
    if(G.phase=='objects'){const o=G.obj[G.oi];if(G.tree[r][c]||G.man[r][c])return;putObj(o,r,c);return}
    G.anchor=[r,c];render()}});
  root.querySelectorAll('[data-cut]').forEach(b=>b.onclick=()=>{const i=+b.dataset.cut,base=norm(parse(TILES[m.tile]));const next=G.cut.includes(i)?G.cut.filter(x=>x!=i):G.cut.concat(i);if(!next.length||cutOK(base,next)){G.cut=next;G.rot=0;render()}});
  on('rt',()=>{G.rot=(G.rot+1)%4;render()});
  on('pl',()=>{const cells=curCells(m);if(!fits(cells,G.anchor[0],G.anchor[1]))return;commit(m,{cells,r:G.anchor[0],c:G.anchor[1],cut:G.cut.length});G.qi++;placeStep()});
  on('re',newGame);
}
function cutPicker(p){const base=norm(parse(TILES[p.tile])),R=Math.max(...base.map(x=>x.r))+1,C=Math.max(...base.map(x=>x.c))+1,key={};base.forEach((x,i)=>key[x.r+','+x.c]={...x,i});
  return `<div class="tl" style="grid-template-columns:repeat(${C},var(--ts))">${[...Array(R)].map((_,r)=>[...Array(C)].map((_,c)=>{const x=key[r+','+c];if(!x)return '<span></span>';
    return x.t=='N'?`<span class="t N">${p.tile}</span>`:`<button class="t ${x.t} ${G.cut.includes(x.i)?'cut':''}" data-cut="${x.i}" aria-label="칸 자르기"></button>`}).join('')).join('')}</div>`}
function intro(){
  DR.status('준비');
  root.innerHTML=`<div class="card"><p class="k">1일차 메인 매치 〈양자택일〉 · 미니게임 3 · 선택 5~8</p><h2>공원에 잔디를 깔아라</h2>
  <div class="rule"><ol><li>잔디 타일은 일곱 종류(3·4·6·7·9·11·13번). <b>번호가 곧 승점</b>이다. 칸에는 구멍(○) 뚫린 칸도 있다.</li>
  <li>승점이 낮은 사람부터 모두가 보는 앞에서 타일을 고른다. 같은 타일을 골라도 되고, 바꿀 수 없다.</li>
  <li><b>번호가 작은 타일부터</b> 공원에 놓는다. 돌릴 수 있고 뒤집을 수 없으며, 판 밖으로 나가거나 겹칠 수 없다. 놓으면 번호만큼 승점, 자리가 없으면 0점.</li>
  <li>그 사이에 둘 중 하나를 고르는 <b>선택 5~8</b>: 점수/정보, 공격/방어, 상생/견제, 가로수/맨홀. (맨홀 → 가로수 → 타일 순서로 놓는다)</li></ol></div>
  <p class="mut" style="font-size:14px">방송은 16명이 114칸 공원에 깔았다. 여기서는 8명(나 + 봇 7명)이 같은 비율(7×인원+2 = ${7*N+2}칸)의 공원에 깐다. 선택 카드는 방송 그대로.</p>
  <button class="go" id="go">시작</button></div>`;on('go',newGame);
}
DR.games.grass={title:'잔디 깔기',start(r){root=r;intro()}};
}
