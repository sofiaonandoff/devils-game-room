{
const rnd=DR.rnd,shuffle=DR.shuffle;
const N=8,ROUNDS=7,COINS=[1,1,1,2,2,2,3,3,5,10];
let BOARD=['T','C','T','C','S','C','S','C','T'],CLASSIC=false;const SYM={T:'△',C:'○',S:'☆'},NAME={T:'세모',C:'동그라미',S:'별'};
const LINES=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
let root,G;
const $=s=>root.querySelector(s);
const on=(id,f)=>{const e=root.querySelector('#'+id);if(e)e.onclick=f};
const sum=a=>a.reduce((s,x)=>s+x,0);

/* ---------- 빙고 배치: 빙고 줄이 가장 많게, 그다음 채운 칸이 많게 ---------- */
function combos(arr,k){if(k<=0)return [[]];if(k>=arr.length)return [arr.slice()];const out=[];const f=(i,c)=>{if(c.length==k)return out.push(c.slice());for(let j=i;j<arr.length;j++){c.push(arr[j]);f(j+1,c);c.pop()}};f(0,[]);return out}
function place(own){
  const cells={T:[],C:[],S:[]};BOARD.forEach((x,i)=>cells[x].push(i));let best={lines:-1,cells:[]};
  combos(cells.T,Math.min(own.T,cells.T.length)).forEach(a=>combos(cells.C,Math.min(own.C,cells.C.length)).forEach(b=>combos(cells.S,Math.min(own.S,cells.S.length)).forEach(c=>{
    const f=new Set([...a,...b,...c]),l=LINES.filter(L=>L.every(i=>f.has(i))).length;if(l>best.lines)best={lines:l,cells:[...f]}})));
  return {lines:best.lines,filled:best.cells.length,cells:best.cells};
}
// 판마다 새 빙고판: 세 도형의 칸 수(최소 2칸)와 자리를 무작위로
function newBoard(){
  const splits=[[3,4,2],[3,3,3],[4,3,2],[2,4,3],[4,2,3],[3,2,4],[2,3,4],[5,2,2],[2,5,2],[2,2,5]],[t,c,st]=splits[rnd(splits.length)];
  return shuffle([...Array(t).fill('T'),...Array(c).fill('C'),...Array(st).fill('S')]);
}
function newGame(){
  BOARD=CLASSIC?['T','C','T','C','S','C','S','C','T']:newBoard();
  const ps=[{name:'나',you:1}].concat(shuffle(DR.BOTS.slice()).map(b=>({name:b[0],style:Math.random()})));
  ps.forEach((p,i)=>{p.id=i;p.coins=COINS.slice();p.pieces=2;p.own={T:0,C:0,S:0};p.noBid=false;p.hist=[]});
  G={ps,round:0,log:[]};nextRound();
}
function nextRound(){
  if(G.round>=ROUNDS)return finish();
  G.round++;G.phase='pick';G.picks={};G.sel=[];render();
}
function botPick(p){
  const cnt=k=>BOARD.filter(x=>x==k).length,need={T:cnt('T')-p.own.T,C:cnt('C')-p.own.C,S:cnt('S')-p.own.S},w=['T','C','S'].map(s=>Math.max(.4,need[s])+Math.random()*2);
  return ['T','C','S'][w.indexOf(Math.max(...w))];
}
function pick(s){
  G.picks={};G.ps.forEach(p=>G.picks[p.id]=p.you?s:botPick(p));
  G.cnt={T:0,C:0,S:0};Object.values(G.picks).forEach(x=>G.cnt[x]++);
  G.phase='bid';G.sel=[];render();
}
function botBid(p,s){
  const left=ROUNDS-G.round+1;
  if(!p.coins.length&&p.pieces>0){p.pieces--;p.coins.push(1)}
  if(!p.coins.length)return [];
  const total=sum(p.coins),target=Math.max(1,Math.round(total/left*(.5+Math.random()*1.4+(G.cnt[s]>=3?.4:0)+p.style*.5)));
  const cs=p.coins.slice().sort((a,b)=>b-a),used=[];let acc=0;
  cs.forEach(c=>{if(acc+c<=target){used.push(c);acc+=c}});
  if(!used.length)used.push(Math.min(...p.coins));
  return used;
}
function spend(p,used){used.forEach(c=>{const i=p.coins.indexOf(c);if(i>=0)p.coins.splice(i,1)})}
function bid(){
  const bids={};
  G.ps.forEach(p=>{const s=G.picks[p.id],used=p.you?G.sel.slice():botBid(p,s);spend(p,used);bids[p.id]=sum(used);if(!bids[p.id])p.noBid=true});
  const res={};
  ['T','C','S'].forEach(s=>{const who=G.ps.filter(p=>G.picks[p.id]==s&&bids[p.id]>0);if(!who.length){res[s]={price:null,n:G.cnt[s],win:[]};return}
    const top=Math.max(...who.map(p=>bids[p.id])),win=who.filter(p=>bids[p.id]==top),share=Math.floor(G.cnt[s]/win.length);
    win.forEach(p=>p.own[s]+=share);res[s]={price:top,n:G.cnt[s],win:win.map(p=>p.id),share}});
  const hi=Math.max(...['T','C','S'].map(s=>res[s].price||0));
  ['T','C','S'].forEach(s=>res[s].secret=res[s].price===hi&&hi>0);
  G.res=res;G.myBid=bids[0];G.ps[0].hist.push({r:G.round,s:G.picks[0],bid:bids[0]});
  G.log.push({r:G.round,res:JSON.parse(JSON.stringify(res)),cnt:{...G.cnt},my:{s:G.picks[0],bid:bids[0]}});
  G.phase='result';render();
}
function finish(){
  G.ps.forEach(p=>{Object.assign(p,place(p.own));p.left=sum(p.coins)});
  G.rank=G.ps.slice().sort((a,b)=>(a.noBid-b.noBid)||b.lines-a.lines||b.filled-a.filled||b.left-a.left);
  const my=G.rank.indexOf(G.ps[0])+1;DR.record('bingo',{clear:my<N,score:G.ps[0].lines,text:`빙고 ${G.ps[0].lines}줄 · ${my}위`});
  G.phase='end';render();
}
/* ---------- 화면 ---------- */
const boardHTML=(cells,small)=>`<div class="bgb ${small?'sm':''}">${BOARD.map((s,i)=>`<div class="bc ${cells&&cells.includes(i)?'on':''} s${s}">${SYM[s]}</div>`).join('')}</div>`;
function coinsHTML(p){const used=G.sel.slice();
  return p.coins.map((c,i)=>{const k=used.indexOf(c);const on=k>=0;if(on)used.splice(k,1);return {c,i,on}}).map(x=>`<button class="coin ${x.on?'sel':''}" data-ci="${x.i}" aria-pressed="${x.on}">${x.c}</button>`).join('')||'<span class="mut">코인이 없다</span>';}
function hist(){return `<table><tr><th>R</th><th>○ (표·낙찰가)</th><th>△</th><th>☆</th><th>내 입찰</th></tr>${G.log.map(l=>`<tr><td>${l.r}</td>${['C','T','S'].map(s=>`<td>${l.cnt[s]}표 · ${l.res[s].price==null?'-':l.res[s].secret?'<b class="warn">시크릿</b>':l.res[s].price+'원'}</td>`).join('')}<td>${SYM[l.my.s]} ${l.my.bid}원</td></tr>`).join('')}</table>`}
function render(){
  const me=G.ps[0];DR.status(G.phase=='end'?'끝':`${G.round} / ${ROUNDS} 라운드`);
  let main='';
  if(G.phase=='pick')main=`<p class="k">${G.round}라운드 · 도형 고르기</p><h2>어느 도형에 네임 티켓을 넣을까</h2>
    <div class="shp">${['C','T','S'].map(s=>`<button data-s="${s}"><b>${SYM[s]}</b>${NAME[s]}<small>판에 ${BOARD.filter(x=>x==s).length}칸</small></button>`).join('')}</div>
    <p class="mut" style="font-size:14px">모두 넣은 뒤 도형별 인원이 공개된다. 낙찰자는 그 도형을 고른 <b>사람 수만큼</b> 가져간다.</p>`;
  else if(G.phase=='bid'){const s=G.picks[0],tot=sum(G.sel);
    main=`<p class="k">${G.round}라운드 · 비공개 입찰</p><h2>${SYM[s]} ${NAME[s]}에 얼마를 걸까</h2>
    <div class="tags">${['C','T','S'].map(x=>`<span class="tag" style="${x==s?'border-color:var(--gold)':''}">${SYM[x]} ${G.cnt[x]}명</span>`).join('')}</div>
    <p>내 코인 — 눌러서 고르기 (쪼갤 수 없다)</p><div class="coins">${coinsHTML(me)}</div>
    <div class="row" style="margin:10px 0"><button id="pc" ${me.pieces?'':'disabled'}>피스 1개 → 1원 코인 (남은 피스 ${me.pieces})</button></div>
    <p>입찰액 <b style="font-size:24px">${tot}원</b> ${tot<1?'<span class="warn">— 1원 이상 내야 한다. 못 내면 자동 최하위</span>':''}</p>
    <button class="go" id="bd" ${tot>=1||!me.coins.length?'':'disabled'}>${tot>=1?'입찰':'입찰 포기 (최하위)'}</button>
    <p class="mut" style="font-size:13px">입찰에 쓴 코인은 낙찰과 상관없이 사라진다.</p>`}
  else if(G.phase=='result'){const r=G.res;
    main=`<p class="k">${G.round}라운드 결과</p><h2>낙찰가 발표</h2><div class="shp res">${['C','T','S'].map(s=>`<div><b>${SYM[s]}</b>${r[s].n}명 선택<div class="pr">${r[s].price==null?'-':r[s].secret?'시크릿':r[s].price+'원'}</div></div>`).join('')}</div>
    <p>나는 ${SYM[G.picks[0]]}에 <b>${G.myBid}원</b>을 냈다. 누가 낙찰받았는지는 <b>나에게도</b> 알려 주지 않는다.</p>
    <button class="go" id="nx">${G.round<ROUNDS?'다음 라운드':'빙고판 공개'}</button>`}
  else if(G.phase=='end'){const my=G.rank.indexOf(me)+1;
    main=`<p class="k">빙고판 공개</p><h2>${my<=2?`${my}위 · 생활동 행`:my==N?'최하위. 탈락':`${my}위`} — 빙고 ${me.lines}줄</h2>
    <div class="bgall">${G.rank.map((p,i)=>`<div class="${p.you?'me':''}"><b>${i+1}. ${p.name}</b>${boardHTML(p.cells,true)}<small>${p.noBid?'입찰 실패 · ':''}빙고 ${p.lines} · ${p.filled}칸 · 코인 ${p.left}원<br>얻은 것 ○${p.own.C} △${p.own.T} ☆${p.own.S}</small></div>`).join('')}</div>
    <p class="mut" style="font-size:13px">놓을 자리가 없는 도형은 버리고, 나머지는 빙고가 가장 많이 나오게 자동으로 놓았다. 순위: 빙고 줄 수 → 채운 칸 → 남은 코인.</p>
    <div class="row"><button class="go" id="rn">새 빙고판으로 다시</button>${CLASSIC?'<button id="re">방송 빙고판으로 다시</button>':''}</div>`}
  root.innerHTML=`<div class="grid2"><div class="card pop">${main}</div><div class="stackg"><div class="card"><p class="k">이번 판의 빙고판 (모두 같음) · 가로·세로·대각선 8줄</p><p class="mut" style="font-size:13px;margin:2px 0 0">○ ${BOARD.filter(x=>x=='C').length}칸 · △ ${BOARD.filter(x=>x=='T').length}칸 · ☆ ${BOARD.filter(x=>x=='S').length}칸</p>${boardHTML(null)}
  <p style="margin:8px 0 0">내 코인 <b>${sum(me.coins)}원</b> (${me.coins.length}개) · 피스 ${me.pieces}</p></div>
  ${G.log.length?`<div class="card"><p class="k">라운드 기록</p>${hist()}</div>`:''}</div></div>`;
  root.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>pick(b.dataset.s));
  root.querySelectorAll('[data-ci]').forEach(b=>b.onclick=()=>{const c=me.coins[+b.dataset.ci];if(b.classList.contains('sel')){G.sel.splice(G.sel.indexOf(c),1)}else G.sel.push(c);render()});
  on('pc',()=>{me.pieces--;me.coins.push(1);render()});
  on('bd',bid);on('nx',nextRound);on('re',newGame);on('rn',()=>{CLASSIC=false;newGame()});
}
function intro(){
  DR.status('준비');
  root.innerHTML=`<div class="card"><p class="k">4일차 메인 매치</p><h2>무엇을 땄는지 모르는 경매</h2>
  <div class="rule"><ol><li>모두 같은 3×3 빙고판을 갖는다. 칸마다 ○·△·☆가 정해져 있다. <b>빙고판은 판마다 새로 뽑는다</b> — 도형별 칸 수와 자리가 매번 달라진다.</li>
  <li>코인 10개: 1원 3개, 2원 3개, 3원 2개, 5원, 10원 (합 30원). 쪼개 쓸 수 없다. 피스 1개를 1원 코인으로 바꿀 수 있다.</li>
  <li>7라운드. 먼저 도형 하나를 고르고 (인원 공개), 그 도형에 <b>1원 이상</b> 몰래 건다. 못 걸면 자동 최하위. 건 코인은 돌려받지 못한다.</li>
  <li>도형마다 가장 많이 건 사람이 그 도형을 <b>고른 사람 수만큼</b> 가져간다. 동률이면 똑같이 나누고 나머지는 버린다.</li>
  <li>누가 낙찰받았는지는 <b>본인에게도</b> 비밀. 낙찰가만 공개되고, 그중 가장 높은 낙찰가는 <b>시크릿</b>.</li>
  <li>끝나면 얻은 도형을 빙고가 가장 많이 나오게 자동 배치. 순위: 빙고 줄 수 → 채운 칸 → 남은 코인.</li></ol></div>
  <p class="mut" style="font-size:14px">8인전 (나 + 봇 7명), 모두 피스 2개로 시작.</p><div class="row"><button class="go" id="go">새 빙고판으로 시작</button><button id="gc">방송 빙고판으로 시작</button></div></div>`;on('go',()=>{CLASSIC=false;newGame()});on('gc',()=>{CLASSIC=true;newGame()});
}
DR.games.bingo={title:'경매 빙고',start(r){root=r;intro()}};
DR.bingoPlace=place;
}
