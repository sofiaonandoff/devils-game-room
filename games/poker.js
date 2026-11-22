{
const rnd=DR.rnd,shuffle=DR.shuffle;
const SUITS=['♠','♥','♦','♣'],RANKS=['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const CAT=['하이카드','원페어','투페어','트리플','스트레이트','플러시','풀하우스','포카드','스트레이트 플러시'];
const ROUNDS=5,MEMO=20,PICK=60,POS='ABCDEFGHIJKLMNOP';
let root,G;
const $=s=>root.querySelector(s);
const on=(id,f)=>{const e=root.querySelector('#'+id);if(e)e.onclick=f};

/* ---------- 족보 ---------- */
// 카드 = {r:0..12, s:0..3}. 반환: [등급, 비교용 숫자들...]
function evalHand(cs){
  const rs=cs.map(c=>c.r).sort((a,b)=>b-a),cnt={};rs.forEach(r=>cnt[r]=(cnt[r]||0)+1);
  const flush=cs.every(c=>c.s===cs[0].s);
  const uniq=[...new Set(rs)];let straight=-1;
  if(uniq.length==5){if(uniq[0]-uniq[4]==4)straight=uniq[0];else if(uniq.join()=='12,3,2,1,0')straight=3}
  const groups=Object.entries(cnt).map(([r,n])=>[n,+r]).sort((a,b)=>b[0]-a[0]||b[1]-a[1]),ord=groups.map(g=>g[1]);
  if(straight>=0&&flush)return [8,straight];
  if(groups[0][0]==4)return [7,...ord];
  if(groups[0][0]==3&&groups[1][0]==2)return [6,...ord];
  if(flush)return [5,...rs];
  if(straight>=0)return [4,straight];
  if(groups[0][0]==3)return [3,...ord];
  if(groups[0][0]==2&&groups[1][0]==2)return [2,...ord];
  if(groups[0][0]==2)return [1,...ord];
  return [0,...rs];
}
const cmp=(a,b)=>{for(let i=0;i<Math.max(a.length,b.length);i++){const d=(a[i]??-1)-(b[i]??-1);if(d)return d}return 0};
const nameOf=e=>{const top=RANKS[e[1]];return e[0]==0?`${top} 하이카드`:e[0]==4||e[0]==8?`${RANKS[e[1]]} ${CAT[e[0]]}`:`${top} ${CAT[e[0]]}`};
const best=(board,comm)=>{let b=null;for(let i=0;i<16;i++)for(let j=i+1;j<16;j++){const e=evalHand([board[i],board[j],...comm]);if(!b||cmp(e,b.e)>0)b={i,j,e}}return b};

/* ---------- 진행 ---------- */
function newGame(){
  const opp=shuffle(DR.BOTS.slice()).slice(0,ROUNDS).map(b=>({name:b[0],col:b[1],mem:.45+Math.random()*.45}));
  G={round:0,opp,wins:0,loss:0,draw:0,hist:[]};nextRound();
}
function nextRound(){
  if(G.round>=ROUNDS)return finish();
  G.round++;const deck=shuffle(SUITS.flatMap((_,s)=>RANKS.map((_,r)=>({r,s}))));
  Object.assign(G,{board:deck.slice(0,16),comm:deck.slice(16,19),pick:[],phase:'memo',t0:Date.now()});
  memo();
}
const card=(c,cls='')=>`<div class="pk ${c.s==1||c.s==2?'red':''} ${cls}"><b>${RANKS[c.r]}</b><span>${SUITS[c.s]}</span></div>`;
function head(){const o=G.opp[G.round-1];return `<div class="row sp"><div><p class="k">${G.round} / ${ROUNDS} 세트 · 상대 ${o.name}</p></div><div class="mut">전적 ${G.wins}승 ${G.loss}패 ${G.draw}무</div></div>`}
function memo(){
  DR.status(`${G.round}세트 · 외우기`);
  root.innerHTML=`<div class="card">${head()}<h2>20초 동안 외워라</h2>
  <div class="pkb">${G.board.map((c,i)=>`<div class="slot"><small>${POS[i]}</small>${card(c)}</div>`).join('')}</div>
  <div class="row sp" style="margin-top:12px"><span class="clock" id="mc">20</span><button id="done">다 외웠다</button></div></div>`;
  const tick=()=>{if(G.phase!='memo')return;const l=MEMO-(Date.now()-G.t0)/1000;const e=$('#mc');if(e)e.textContent=Math.max(0,Math.ceil(l));if(l<=0)return pickPhase();DR.after(tick,200)};
  on('done',pickPhase);tick();
}
function pickPhase(){
  G.phase='pick';G.t0=Date.now();
  const o=G.opp[G.round-1];// 상대는 각 카드를 mem 확률로 기억한다: 기억한 카드 중에서 가장 좋은 두 장, 모르면 무작위 자리
  const known=G.board.map(()=>Math.random()<o.mem);
  let b=null;for(let i=0;i<16;i++)for(let j=i+1;j<16;j++){if(!known[i]||!known[j])continue;const e=evalHand([G.board[i],G.board[j],...G.comm]);if(!b||cmp(e,b.e)>0)b={i,j,e}}
  G.oppPick=b?[b.i,b.j]:shuffle([...Array(16).keys()]).slice(0,2);
  drawPick();tickPick();
}
function tickPick(){if(G.phase!='pick')return;const l=PICK-(Date.now()-G.t0)/1000;const e=$('#pc');if(e)e.textContent=Math.max(0,Math.ceil(l));
  if(l<=0){while(G.pick.length<2){const r=rnd(16);if(!G.pick.includes(r))G.pick.push(r)}return reveal()}DR.after(tickPick,250)}
function drawPick(){
  DR.status(`${G.round}세트 · 고르기`);
  const pv=G.pick.length==2?evalHand([...G.pick.map(i=>G.board[i]),...G.comm]):null;
  root.innerHTML=`<div class="grid2"><div class="card">${head()}<h2>두 장의 자리를 고르세요</h2>
  <div class="pkb">${G.board.map((c,i)=>`<button class="slot back ${G.pick.includes(i)?'sel':''}" data-i="${i}" aria-label="${POS[i]} 자리"><small>${POS[i]}</small><div class="pk bk"></div></button>`).join('')}</div></div>
  <div class="card"><p class="k">공유 카드</p><div class="row" style="gap:8px;margin:8px 0 16px">${G.comm.map(c=>card(c)).join('')}</div>
  <p>고른 자리: <b>${G.pick.map(i=>POS[i]).join(', ')||'-'}</b></p><p class="mut" style="font-size:14px">뒤집힌 카드는 다시 볼 수 없다. 외운 대로 고르면, 공개 뒤에 진짜 족보가 나온다.</p>
  <div class="row"><button class="go" id="ok" ${G.pick.length==2?'':'disabled'}>확정</button><span>남은 시간 <b id="pc" class="clock">60</b>초</span></div></div></div>`;
  root.querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>{const i=+b.dataset.i;const k=G.pick.indexOf(i);if(k>=0)G.pick.splice(k,1);else{G.pick.push(i);if(G.pick.length>2)G.pick.shift()}drawPick()});
  on('ok',reveal);
}
function reveal(){
  G.phase='reveal';const o=G.opp[G.round-1];
  const me=evalHand([...G.pick.map(i=>G.board[i]),...G.comm]),op=evalHand([...G.oppPick.map(i=>G.board[i]),...G.comm]),d=cmp(me,op),nut=best(G.board,G.comm);
  if(d>0)G.wins++;else if(d<0)G.loss++;else G.draw++;
  G.hist.push({o:o.name,me:nameOf(me),op:nameOf(op),d});
  DR.status(`${G.round}세트 · 결과`);
  root.innerHTML=`<div class="grid2"><div class="card pop">${head()}<h2>${d>0?'승리':d<0?'패배':'무승부'} · ${nameOf(me)} vs ${nameOf(op)}</h2>
  <div class="pkb">${G.board.map((c,i)=>`<div class="slot"><small>${POS[i]}${G.pick.includes(i)?' 나':''}${G.oppPick.includes(i)?' '+o.name:''}</small>${card(c,(G.pick.includes(i)?'me':'')+' '+(G.oppPick.includes(i)?'op':''))}</div>`).join('')}</div></div>
  <div class="card"><p class="k">공유 카드</p><div class="row" style="gap:8px;margin:8px 0 14px">${G.comm.map(c=>card(c)).join('')}</div>
  <table><tr><th></th><th>자리</th><th>족보</th></tr><tr class="me"><td>나</td><td>${G.pick.map(i=>POS[i]).join(', ')}</td><td>${nameOf(me)}</td></tr>
  <tr><td>${o.name}</td><td>${G.oppPick.map(i=>POS[i]).join(', ')}</td><td>${nameOf(op)}</td></tr>
  <tr><td>넛</td><td>${POS[nut.i]}, ${POS[nut.j]}</td><td>${nameOf(nut.e)}</td></tr></table>
  <button class="go" id="nx" style="margin-top:14px">${G.round<ROUNDS?'다음 세트':'결과 보기'}</button></div></div>`;
  on('nx',nextRound);
}
function finish(){
  const clear=G.wins>G.loss;DR.record('poker',{clear,score:G.wins,text:`${G.wins}승 ${G.loss}패 ${G.draw}무`});DR.status('끝');
  root.innerHTML=`<div class="card pop"><p class="k">기억 포커 종료</p><h2>${G.wins}승 ${G.loss}패 ${G.draw}무 — ${clear?'살아남았다':'버티지 못했다'}</h2>
  <table><tr><th>세트</th><th>상대</th><th>내 족보</th><th>상대 족보</th><th>결과</th></tr>${G.hist.map((h,i)=>`<tr><td>${i+1}</td><td>${h.o}</td><td>${h.me}</td><td>${h.op}</td><td>${h.d>0?'승':h.d<0?'패':'무'}</td></tr>`).join('')}</table>
  <button class="go" id="re" style="margin-top:14px">다시 하기</button></div>`;on('re',newGame);
}
function intro(){
  DR.status('준비');
  root.innerHTML=`<div class="card"><p class="k">1일차 메인 매치 〈양자택일〉 · 미니게임 4</p><h2>외운 카드로 포커를 친다</h2>
  <div class="rule"><ol><li>52장 가운데 무작위 <b>16장</b>이 4×4 판(A~P)에 <b>20초</b> 동안 공개됐다가 뒤집힌다.</li>
  <li>그 뒤 <b>공유 카드 3장</b>이 나온다.</li><li>외운 기억으로 뒤집힌 16장 가운데 <b>2장의 자리</b>를 60초 안에 고른다. 상대와 같은 자리를 골라도 된다.</li>
  <li>고른 2장 + 공유 카드 3장의 족보가 높은 쪽이 이긴다. 같은 등급이면 높은 숫자, 그다음 나머지 카드. 무늬는 비교하지 않는다.</li>
  <li>족보: 스트레이트 플러시 › 포카드 › 풀하우스 › 플러시 › 스트레이트 › 트리플 › 투페어 › 원페어 › 하이카드. A-2-3-4-5는 가장 낮은 5 스트레이트.</li></ol></div>
  <p class="mut" style="font-size:14px">방송은 순위 하위가 위로 도전하는 일대일 연승전이었다. 여기서는 봇 다섯 명과 한 세트씩 다섯 번 겨루고, 이긴 세트가 진 세트보다 많으면 살아남는다.</p>
  <button class="go" id="go">시작</button></div>`;on('go',newGame);
}
DR.games.poker={title:'기억 포커',start(r){root=r;intro()}};
DR.pokerEval=evalHand;
}
