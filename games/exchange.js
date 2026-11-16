{
const rnd=DR.rnd,shuffle=DR.shuffle;
const R=20,REV={1:5,2:9,3:13,4:17},PIECE_LAST=16,START_CASH=100000;
const CO=[['짭짤금융','#d6a531'],['무작정건설','#c9741f'],['철벽제철','#7f9aa4'],['알쏭엔터','#b0397a'],['활짝보안','#2f8a5b'],['여우테크','#e0384f'],['뒷북전자','#2f6fb0']];
// 거래소 로고 = 알쏭달쏭한 지그재그. 로고 규칙을 받은 종목의 주가가 이 모양을 그대로 따라간다.
const LOGO=[100,93,86,95,104,97,89,82,91,100,109,101,93,85,78,87,96,104,96,88,95];
const won=v=>v.toLocaleString('ko-KR');
const man=v=>(v/10000).toFixed(v>=1000000?0:1)+'만';
const stageAt=r=>r>=REV[4]?4:r>=REV[3]?3:r>=REV[2]?2:r>=REV[1]?1:0;
const pct=(p,a)=>Math.floor(p*(1+a/100));
let root,G;
const $=s=>root.querySelector(s);
const on=(id,f)=>{const e=root.querySelector('#'+id);if(e)e.onclick=f};
const N=k=>CO[k][0];

/* ---------- 규칙 문장 (토큰: [글자, 공개 단계]) ---------- */
const T={
 breadth:(k,o)=>({type:'breadth',tk:[[`${o.n}개 이상의`,4],['주식이',1],['상승할',3],['경우',1],['다음',2],['라운드',2],[`+${o.a}%,`,2],[`${o.n}개 이상의`,4],['주식이',1],['하락할',3],['경우',3],['다음',0],['라운드',2],[`-${o.b}%`,2]],
   f:c=>c.up>=o.n?pct(c.old[k],o.a):c.down>=o.n?pct(c.old[k],-o.b):c.old[k]}),
 follows:(k,o)=>({type:'follows',dep:o.x,tk:[[`${N(o.x)}의`,4],['가격이',0],[o.dir>0?'올랐으면':'내렸으면',2],[`+${o.a}%,`,2],['그렇지',1],['않으면',1],[`-${o.b}%`,3]],
   f:c=>{const ch=c.np[o.x]-c.old[o.x];return (o.dir>0?ch>0:ch<0)?pct(c.old[k],o.a):pct(c.old[k],-o.b)}}),
 pershare:(k,o)=>({type:'pershare',tk:[[`${N(k)}의`,4],['보유',1],['총량이',1],['증가한',3],['만큼',3],['1주당',2],[`-${o.w}원,`,0],['감소한',3],['만큼',3],['1주당',2],[`+${o.w}원`,0]],
   f:c=>c.old[k]-o.w*(c.hold[k]-c.holdPrev[k])}),
 emblem:(k)=>({type:'emblem',tk:[[`${N(k)}의`,1],['주가',2],['변동',2],['그래프는',3],['미스터리',4],['거래소',4],['로고와',4],['일치한다',0]],
   f:c=>Math.round(10000*LOGO[c.r]/100/100)*100}),
 secret:(k,o)=>({type:'secret',tk:[[`${N(o.y)}에`,3],['시크릿이',4],['걸려',4],['있으면',0],[`+${o.a}%,`,1],['그렇지',0],['않으면',1],[`-${o.d}원`,2]],
   f:c=>c.sec(o.y)?pct(c.old[k],o.a):c.old[k]-o.d}),
 outbuy:(k,o)=>{const w=o.side>0?'매수량':'매도량',v=o.side>0?'buy':'sell';return {type:'outbuy',tk:[[`${N(k)}의`,1],[`${w}이`,3],[`${N(o.y)}의`,4],[`${w}보다`,0],['많을',0],['경우',0],[`+${o.u}원,`,2],['그렇지',1],['않으면',1],[`-${o.d}원`,2]],
   f:c=>c[v][k]>c[v][o.y]?c.old[k]+o.u:c.old[k]-o.d}},
 band:(k,o)=>({type:'band',tk:[[`${N(o.y)}의`,2],['보유',3],['총량이',3],[`${o.f}주`,4],['이상',1],[`${o.t}주`,4],['이하이면',1],[`+${o.u}원,`,0],['그렇지',1],['않으면',1],[`-${o.d}원`,3]],
   f:c=>c.hold[o.y]>=o.f&&c.hold[o.y]<=o.t?c.old[k]+o.u:c.old[k]-o.d}),
 volume:(k,o)=>{const w=o.side>0?'매수량이':'매도량이',v=o.side>0?'buy':'sell';return {type:'volume',tk:[[`${N(o.y)}의`,4],[w,2],[`${o.v}주`,3],['이상이면',1],[`+${o.u}원,`,1],['그렇지',0],['않으면',0],[`-${o.d}원`,2]],
   f:c=>c[v][o.y]>=o.v?c.old[k]+o.u:c.old[k]-o.d}},
 net:(k,o)=>({type:'net',tk:[[`${N(o.y)}의`,4],['매수량이',2],['매도량보다',3],['많을',0],['경우',0],[`+${o.u}원,`,1],['그렇지',1],['않으면',1],[`-${o.d}원`,2]],
   f:c=>c.buy[o.y]>c.sell[o.y]?c.old[k]+o.u:c.old[k]-o.d}),
};
const between=(a,b,s=1)=>a+rnd(Math.floor((b-a)/s)+1)*s;
function genRules(mode){
  if(mode=='classic')return [T.breadth(0,{n:4,a:20,b:10}),T.follows(1,{x:2,dir:1,a:10,b:10}),T.pershare(2,{w:200}),T.emblem(3),
    T.secret(4,{y:6,a:13,d:1000}),T.outbuy(5,{y:6,side:1,u:1400,d:700}),T.band(6,{y:6,f:10,t:30,u:1500,d:1000})];
  const em=rnd(7),others=[0,1,2,3,4,5,6].filter(i=>i!=em),types=shuffle(['breadth','follows','secret','outbuy','band','volume','net']).slice(0,6),rules=[];
  rules[em]=T.emblem(em);
  const other=k=>{let y;do y=rnd(7);while(y==k);return y},selfOr=k=>Math.random()<.5?k:other(k);
  others.forEach((k,i)=>{const t=types[i],U=between(400,1500,100),D=between(100,300,50),A=between(5,15),B=between(3,8);
    rules[k]=t=='breadth'?T.breadth(k,{n:between(4,5),a:A,b:B}):t=='follows'?T.follows(k,{x:other(k),dir:Math.random()<.5?1:-1,a:A,b:B})
     :t=='secret'?T.secret(k,{y:rnd(7),a:A,d:D}):t=='outbuy'?T.outbuy(k,{y:other(k),side:Math.random()<.7?1:-1,u:U,d:D})
     :t=='band'?(()=>{const f=between(5,20,5);return T.band(k,{y:selfOr(k),f,t:f+between(10,30,5),u:U,d:D})})()
     :t=='volume'?T.volume(k,{y:selfOr(k),side:Math.random()<.7?1:-1,v:between(5,15,5),u:U,d:D}):T.net(k,{y:selfOr(k),u:U,d:D})});
  return rules;
}

/* ---------- 게임 상태 ---------- */
function newGame(mode){
  const players=[{id:0,name:'나',you:1,cash:START_CASH,h:[0,0,0,0,0,0,0],low:START_CASH}]
    .concat(DR.BOTS.map((b,i)=>{const sk=.25+Math.random()*.75;return {id:i+1,name:b[0],col:b[1],cash:START_CASH,h:[0,0,0,0,0,0,0],low:START_CASH,skill:sk,
      learn:CO.map(()=>Math.max(3,Math.min(19,4+Math.round((1-sk)*12)+rnd(6)-2)))}}));
  shuffle(players.slice(1)).slice(0,2).forEach(b=>{b.secR=between(3,17);b.secK=rnd(7)});
  G={mode,r:1,rules:genRules(mode),price:CO.map(()=>10000),hist:CO.map(()=>[{p:10000,hid:0}]),hold:CO.map(()=>0),holdPrev:CO.map(()=>0),
    buy:CO.map(()=>0),sell:CO.map(()=>0),up:0,down:0,sec:CO.map(()=>new Set()),hid:CO.map(()=>0),ord:CO.map(()=>0),players,
    pieces:3,pv:CO.map(()=>0),mySec:null,secPick:false,memo:CO.map(()=>({})),log:[],lastStage:0,chg:CO.map(()=>0)};
  G.rules.forEach((r,k)=>{if(r.type=='emblem')G.emblem=k});
  G.log.push({r:0,t:`${mode=='classic'?'클래식 규칙(방송과 같은 구조)':'판마다 새 규칙'}으로 개장. 모든 주식 10,000원, 현금 10만 원.`});
  render();
}
const me=()=>G.players[0];
const assetOf=p=>p.cash+p.h.reduce((s,q,k)=>s+q*G.price[k],0);
const anyHid=()=>G.hid.some(x=>x);
function secOn(k,r){return G.sec[k].has(r)||G.sec[k].has(r-1)}

/* ---------- 봇 ---------- */
function predict(){
  const r=G.r,c={r,old:G.price,np:G.price.slice(),hold:G.hold,holdPrev:G.hold,buy:G.buy,sell:G.sell,up:G.up,down:G.down,sec:k=>G.sec[k].has(r-1)};
  const ord=[0,1,2,3,4,5,6].sort((a,b)=>(G.rules[a].type=='follows')-(G.rules[b].type=='follows'));
  ord.forEach(k=>c.np[k]=Math.max(100,Math.floor(G.rules[k].f(c))));
  return c.np;
}
function botOrders(b,pred){
  const o=CO.map(()=>0),exp=CO.map((_,k)=>{
    if(G.r>=b.learn[k])return (pred[k]-G.price[k])/G.price[k];
    return G.chg[k]/Math.max(100,G.price[k])*.6+(Math.random()-.5)*.05});
  exp.forEach((e,k)=>{if(e<-.005&&b.h[k])o[k]=-b.h[k]});
  let cash=b.cash+o.reduce((s,q,k)=>s-q*G.price[k],0);
  const cand=CO.map((_,k)=>k).filter(k=>exp[k]>.01).sort((a,c)=>exp[c]-exp[a]).slice(0,1+(Math.random()<.4));
  const spend=cash*(.35+.55*b.skill);
  cand.forEach(k=>{const q=Math.floor(spend/cand.length/G.price[k]);if(q>0){o[k]+=q;cash-=q*G.price[k]}});
  if(Math.random()<.25){const k=rnd(7),q=1+rnd(3);if(cash>=q*G.price[k]&&o[k]>=0)o[k]+=q}
  return o;
}

/* ---------- 라운드 처리 ---------- */
function execute(p,o,logIt){
  o.forEach((q,k)=>{if(q<0){const s=Math.min(-q,p.h[k]);p.h[k]-=s;p.cash+=s*G.price[k];G.sell[k]+=s}});
  o.forEach((q,k)=>{if(q>0){const cost=q*G.price[k];
    if(cost>p.cash){if(logIt)G.log.push({r:G.r,t:`현금 부족 — ${N(k)} ${q}주 매수 주문이 거절됐다.`,c:'b'});return}
    p.h[k]+=q;p.cash-=cost;G.buy[k]+=q}});
}
function endRound(){
  const r=G.r;
  if(G.mySec!=null){G.sec[G.mySec].add(r);G.log.push({r,t:`나는 ${N(G.mySec)}에 시크릿을 걸었다.`,c:'p'});G.mySecUsed=1;G.mySec=null}
  G.players.slice(1).forEach(b=>{if(b.secR==r){G.sec[b.secK].add(r)}});
  G.holdPrev=G.hold.slice();G.buy=CO.map(()=>0);G.sell=CO.map(()=>0);
  const pred=predict();
  const orders=G.players.map(p=>p.you?G.ord.slice():botOrders(p,pred));
  G.players.forEach((p,i)=>execute(p,orders[i],p.you));
  G.hold=CO.map((_,k)=>G.players.reduce((s,p)=>s+p.h[k],0));
  const old=G.price.slice(),c={r,old,np:old.slice(),hold:G.hold,holdPrev:G.holdPrev,buy:G.buy,sell:G.sell,up:G.up,down:G.down,sec:k=>secOn(k,r)};
  const ordK=[0,1,2,3,4,5,6].sort((a,b)=>(G.rules[a].type=='follows')-(G.rules[b].type=='follows'));
  ordK.forEach(k=>c.np[k]=Math.max(100,Math.floor(G.rules[k].f(c))));
  G.up=c.np.filter((v,k)=>v>old[k]).length;G.down=c.np.filter((v,k)=>v<old[k]).length;
  G.chg=c.np.map((v,k)=>v-old[k]);G.price=c.np;
  G.hid=CO.map((_,k)=>secOn(k,r)?1:0);
  CO.forEach((_,k)=>G.hist[k].push({p:G.price[k],hid:G.hid[k]}));
  G.players.forEach(p=>p.low=Math.min(p.low,assetOf(p)));
  const mine=orders[0].map((q,k)=>q?`${N(k)} ${q>0?'+':''}${q}`:'').filter(Boolean);
  G.log.push({r,t:`${r}라운드 마감${mine.length?` · 내 주문: ${mine.join(', ')}`:' · 나는 관망'}`});
  const hidN=G.hid.map((h,k)=>h?N(k):'').filter(Boolean);
  if(hidN.length)G.log.push({r,t:`누군가의 시크릿 — ${hidN.join(', ')}의 정보가 가려졌다.`,c:'p'});
  G.ord=CO.map(()=>0);G.r++;
  if(G.r>R)return finish();
  const st=stageAt(G.r);
  if(st>G.lastStage){G.lastStage=st;G.log.push({r:G.r,t:`규칙판 ${st}단계 공개${st==4?' — 모든 규칙이 드러났다':''}.`,c:'b'});G.banner=st}
  render();
}

/* ---------- 화면 ---------- */
function logoSvg(cls){const mn=Math.min(...LOGO),mx=Math.max(...LOGO);
  return `<svg class="${cls||'logo'}" viewBox="0 0 120 46" aria-label="미스터리 거래소 로고"><rect x="1" y="1" width="118" height="44" rx="8" fill="none" stroke="currentColor" stroke-opacity=".35"/><polyline fill="none" stroke="#e0384f" stroke-width="3" stroke-linejoin="round" points="${LOGO.map((v,i)=>`${8+i*5.2},${38-(v-mn)/(mx-mn)*30}`).join(' ')}"/></svg>`}
function chart(k){
  const h=G.hist[k],vis=h.filter(x=>!x.hid).map(x=>x.p),mn=Math.min(...vis,10000)*.92,mx=Math.max(...vis,10000)*1.06,y=v=>38-(v-mn)/(mx-mn)*34;
  let seg=[],segs=[];h.forEach((x,i)=>{if(x.hid){if(seg.length)segs.push(seg);seg=[]}else seg.push(`${i/R*100},${y(x.p)}`)});if(seg.length)segs.push(seg);
  return `<svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-label="${N(k)} 주가 추이"><line x1="0" x2="100" y1="${y(10000)}" y2="${y(10000)}" stroke="currentColor" stroke-opacity=".2" stroke-dasharray="2 2" vector-effect="non-scaling-stroke"/>
  ${segs.map(s=>`<polyline fill="none" stroke="${CO[k][1]}" stroke-width="2.5" stroke-linejoin="round" vector-effect="non-scaling-stroke" points="${s.join(' ')}"/>`).join('')}</svg>`;
}
function cashAfter(){let c=me().cash;G.ord.forEach((q,k)=>c-=q*G.price[k]);return c}
function hiddenTouch(){return G.hid.some((h,k)=>h&&(me().h[k]||G.ord[k]))}
function stocks(){
  return `<div class="stks">${CO.map((co,k)=>{const hid=G.hid[k],ch=G.chg[k],q=G.ord[k],h=me().h[k];
    return `<div class="stk ${hid?'hid':''}"><div class="nm"><i class="sw" style="background:${co[1]}"></i>${co[0]}</div>
    <div class="px ${hid?'':ch>0?'u':ch<0?'d':''}">${hid?'???':`${won(G.price[k])}<small> 원 ${ch>0?'▲':ch<0?'▼':'—'}</small>`}</div>
    ${chart(k)}
    <div class="vol"><div>보유 총량<b>${hid?'???':G.hold[k]}</b></div><div>매수<b>${hid?'???':G.buy[k]}</b></div><div>매도<b>${hid?'???':G.sell[k]}</b></div></div>
    <div class="row sp" style="font-size:14px"><span>내 보유 <b>${h}</b>주</span><span class="mut">${hid?'평가 ???':`평가 ${won(h*G.price[k])}`}</span></div>
    <div class="ordr" role="group" aria-label="${co[0]} 주문"><button data-k="${k}" data-d="-10">−10</button><button data-k="${k}" data-d="-1">−1</button>
    <output class="${q>0?'b':q<0?'s':''}">${q>0?'매수 '+q:q<0?'매도 '+(-q):'0'}</output>
    <button data-k="${k}" data-d="1">+1</button><button data-k="${k}" data-d="10">+10</button>
    <button data-k="${k}" data-x="max" ${hid?'disabled':''}>최대</button><button data-k="${k}" data-x="all" ${h?'':'disabled'}>전량매도</button></div></div>`}).join('')}</div>`;
}
function board(){
  const st=stageAt(G.r);let hits=0,total=0;
  const html=G.rules.map((ru,k)=>`<div class="rl"><div class="h"><i class="sw" style="background:${CO[k][1]}"></i>${N(k)}${G.pv[k]?` <span class="badge" style="--c:var(--gold)">미리보기 +${G.pv[k]}</span>`:''}</div>${ru.tk.map(([t,s],i)=>{
    const vis=s<=st+G.pv[k],m=(G.memo[k][i]||'').replace(/\s/g,'');
    if(s>0){total++;if(vis&&m&&m==t.replace(/\s/g,''))hits++}
    if(vis){const cls=s>st?'pv':(s==st&&st>0?'fresh':'');return `<span class="tk ${cls} ${m&&s>0&&m==t.replace(/\s/g,'')?'hit':''}">${t}</span>`}
    const len=[...t].length;
    return `<input class="bl ${s==st+1?'nx':''}" data-m="${k}:${i}" value="${(G.memo[k][i]||'').replace(/"/g,'&quot;')}" placeholder="${[...t].map(ch=>ch==' '?' ':'□').join('')}" style="width:calc(${len*1.15}em + 14px)" aria-label="${N(k)} 규칙의 가려진 낱말 ${len}글자">`}).join('')}</div>`).join('');
  G.hits=hits;
  return {html,hits};
}
function ranking(){
  const hid=anyHid(),r=G.players.slice().sort((a,b)=>assetOf(b)-assetOf(a));
  return `<ol class="rank">${r.map(p=>`<li style="${p.you?'color:var(--gold);font-weight:700':''}"><span>${p.name}${p.you?' (나)':''}</span><b class="n">${hid?'???':man(assetOf(p))}</b></li>`).join('')}</ol>${hid?'<p class="mut" style="font-size:13px">시크릿이 걸린 동안 자산은 가려지고 순위만 보인다.</p>':''}`;
}
function render(){
  const st=stageAt(G.r),b=board(),ca=cashAfter(),touch=hiddenTouch();
  DR.status(`${G.r} / ${R} 라운드`);
  root.innerHTML=`<div class="card"><div class="xtop">${logoSvg()}
    <div><p class="k">${G.mode=='classic'?'클래식 규칙':'판마다 새 규칙'} · ${G.r}라운드 / ${R}</p>
    <div class="stage">${[0,1,2,3,4].map(s=>`<i class="${s<=st?'on':s==st+1?'nx':''}">${s==0?'시작':REV[s]+'R'}${s==4?' 전체':''}</i>`).join('')}</div></div>
    <div class="kpi"><div><span>현금</span><b>${won(me().cash)}</b></div><div><span>총자산</span><b>${touch?'???':won(assetOf(me()))}</b></div><div><span>피스</span><b style="color:var(--gold)">◆ ${G.pieces}</b></div><div><span>추리 적중</span><b>${b.hits}</b></div></div></div></div>
  <div class="xmain"><div class="stackg">
    ${stocks()}
    <div class="card"><div class="row sp"><div><p class="k">주문 요약</p><p style="margin:4px 0">주문 후 현금 <b class="${ca<0?'warn':''}">${touch?'???':won(ca)}</b>${ca<0&&!touch?' — 현금이 부족해 일부 매수가 거절된다':''}</p></div>
    <button class="go" id="end" style="min-width:200px">${G.r==R?'마지막 라운드 마감':`${G.r}라운드 마감`}</button></div>
    <div class="row" style="margin-top:10px"><button id="clr">주문 초기화</button>
      <button id="sec" ${G.mySecUsed?'disabled':''}>${G.mySec!=null?`시크릿 예약됨: ${N(G.mySec)}`:G.mySecUsed?'시크릿 사용 완료':'시크릿 사용 (1회)'}</button>
      <button id="pc" ${G.pieces&&G.r<=PIECE_LAST?'':'disabled'}>피스 쓰기</button></div>
    <div id="pick"></div></div>
  </div><div class="stackg">
    <div class="card"><div class="row sp"><p class="k">주가 변동 규칙판</p><span class="mut" style="font-size:13px">빈칸에 추리를 적어 두세요</span></div>
    <p class="mut" style="font-size:13px;margin:4px 0 10px">빈칸은 글자 수만큼 □로 보인다. <span style="color:var(--blood)">붉은 빈칸</span>은 다음 단계(${st<4?REV[st+1]+'라운드':'-'})에 열린다. 공개됐을 때 내 메모와 같으면 초록으로 적중 표시.</p>
    <div class="board">${b.html}</div></div>
    <div class="card"><p class="k">순위</p>${ranking()}</div>
    <div class="card"><p class="k">거래 기록</p><ul class="log">${G.log.slice().reverse().slice(0,14).map(l=>`<li class="${l.c||''}">${l.r?l.r+'R · ':''}${l.t}</li>`).join('')}</ul></div>
  </div></div>
  ${G.banner?`<div class="banner" role="dialog" aria-modal="true"><div class="card pop"><p class="k">${REV[G.banner]}라운드 시작</p><h2>규칙판 ${G.banner}단계 공개</h2><p>${G.banner==4?'모든 규칙의 가려진 부분이 열렸다. 남은 라운드는 아는 자의 시간이다.':'가려졌던 낱말 일부가 드러났다. 붉게 표시된 낱말이 방금 열린 곳이다.'}</p><button class="go" id="bn">규칙판 보기</button></div></div>`:''}`;
  bind();
}
function bind(){
  root.querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>{const k=+b.dataset.k;G.ord[k]=Math.max(-me().h[k],G.ord[k]+ +b.dataset.d);render()});
  root.querySelectorAll('[data-x]').forEach(b=>b.onclick=()=>{const k=+b.dataset.k;
    if(b.dataset.x=='all')G.ord[k]=-me().h[k];
    else{const others=cashAfter()+G.ord[k]*G.price[k];G.ord[k]=Math.max(G.ord[k]<0?G.ord[k]:0,Math.floor(Math.max(0,others)/G.price[k]))}render()});
  root.querySelectorAll('[data-m]').forEach(inp=>inp.oninput=()=>{const [k,i]=inp.dataset.m.split(':');G.memo[k][i]=inp.value});
  on('end',endRound);on('clr',()=>{G.ord=CO.map(()=>0);render()});
  on('bn',()=>{G.banner=0;render()});
  on('sec',()=>{if(G.mySec!=null){G.mySec=null;return render()}pickUI('sec')});
  on('pc',()=>pickUI('piece'));
}
function pickUI(kind){
  const box=$('#pick'),st=stageAt(G.r);
  if(kind=='sec'){
    box.innerHTML=`<div class="rule"><b>시크릿</b> — 한 종목을 골라 이번 라운드가 끝난 뒤 두 라운드 동안 가격·보유 총량·매매 수량을 모두에게(나에게도) 가린다. 누가 썼는지는 알려지지 않는다.
    <div class="row" style="margin-top:8px">${CO.map((c,k)=>`<button data-s="${k}">${c[0]}</button>`).join('')}<button id="cx">취소</button></div></div>`;
    box.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{G.mySec=+b.dataset.s;render()});
  }else{
    box.innerHTML=`<div class="rule"><b>피스 ◆${G.pieces}</b> — ${PIECE_LAST}라운드까지 쓸 수 있다.
    <p style="margin:6px 0">① 종목 하나의 <b>다음에 공개될 낱말</b>을 미리 본다 (나만).</p>
    <div class="row">${CO.map((c,k)=>`<button data-v="${k}" ${st+G.pv[k]>=4?'disabled':''}>${c[0]}</button>`).join('')}</div>
    <p style="margin:10px 0 6px">② 가상 현금 10,000원으로 바꾼다.</p><div class="row"><button id="cash">현금 10,000원</button><button id="cx">취소</button></div></div>`;
    box.querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>{const k=+b.dataset.v;G.pieces--;G.pv[k]++;G.log.push({r:G.r,t:`피스로 ${N(k)} 규칙의 다음 낱말을 미리 봤다.`,c:'p'});render()});
    on('cash',()=>{G.pieces--;me().cash+=10000;G.log.push({r:G.r,t:'피스 1개를 현금 10,000원으로 바꿨다.',c:'p'});render()});
  }
  on('cx',()=>{box.innerHTML=''});
}
function finish(){
  const r=G.players.slice().sort((a,b)=>assetOf(b)-assetOf(a)||b.low-a.low),my=r.findIndex(p=>p.you)+1,a=assetOf(me());
  G.r=R;const full=G.rules.map(ru=>ru.tk.map(t=>t[0]).join(' '));
  let hits=0,total=0;G.rules.forEach((ru,k)=>ru.tk.forEach(([t,s],i)=>{if(s>0){total++;const m=(G.memo[k][i]||'').replace(/\s/g,'');if(m&&m==t.replace(/\s/g,''))hits++}}));
  const reward=a>=1000000?'◆ 3':a>=600000?'◆ 2':a>=300000?'◆ 1':'없음';
  DR.record('exchange',{clear:my<=4,score:a,text:`${man(a)} 원 (${my}위)`});DR.status('장 마감');
  root.innerHTML=`<div class="grid2"><div class="card pop"><p class="k">장 마감 · 최종 자산</p><h2>${my==1?'1위. 거래소를 읽어 낸 자':my==r.length?'최하위. 탈락이다':my<=4?`${my}위 · 생활동 행`:`${my}위 · 감옥동 행`}</h2>
    <div class="kpi" style="justify-content:flex-start;margin:10px 0"><div style="text-align:left"><span>최종 자산</span><b>${won(a)}원</b></div><div style="text-align:left"><span>수익률</span><b>${((a/START_CASH-1)*100).toFixed(1)}%</b></div><div style="text-align:left"><span>피스 보상</span><b>${reward}</b></div><div style="text-align:left"><span>빈칸 추리 적중</span><b>${hits} / ${total}</b></div></div>
    <p class="mut" style="font-size:13px">피스 보상: 30만 원 이상 ◆1, 60만 원 이상 ◆2, 100만 원 이상 ◆3. 1~4위 생활동, 최하위 탈락. 동률이면 게임 중 자산이 가장 낮았던 사람이 아래.</p>
    <table><tr><th>순위</th><th>플레이어</th><th class="n">자산</th></tr>${r.map((p,i)=>`<tr class="${i==r.length-1?'lose':p.you?'me':''}"><td>${i+1}</td><td>${p.name}${p.you?' (나)':''}</td><td class="n">${won(assetOf(p))}</td></tr>`).join('')}</table>
    <div class="row" style="margin-top:14px"><button class="go" id="re">새 판 (새 규칙)</button><button id="rc">클래식 규칙으로</button></div></div>
    <div class="card"><p class="k">전체 규칙 공개</p><div class="board">${full.map((s,k)=>`<div class="rl"><div class="h"><i class="sw" style="background:${CO[k][1]}"></i>${N(k)}</div>${s}</div>`).join('')}</div>
    <p class="k" style="margin-top:14px">거래소 로고</p>${logoSvg()}<p class="mut" style="font-size:13px">${N(G.emblem)}의 차트가 이 로고와 같은 모양으로 움직였다.</p></div></div>`;
  on('re',()=>newGame('random'));on('rc',()=>newGame('classic'));
}
function intro(){
  DR.status('개장 전');
  root.innerHTML=`<div class="grid2"><div class="card"><p class="k">2nd Main Match · Mystery Stock Market</p><h2>가려진 문장을 읽는 자가 돈을 번다</h2>
  <div class="rule"><ul>
  <li>일곱 회사의 주식이 모두 <b>10,000원</b>에서 시작한다. 현금 <b>10만 원</b>, 봇 7명과 함께 <b>${R}라운드</b>. 100원 아래로는 떨어지지 않는다.</li>
  <li>주가는 회사마다 정해진 <b>규칙 문장</b>대로 움직인다. 처음엔 문장의 일부만 보이고, <b>${REV[1]}·${REV[2]}·${REV[3]}라운드</b>에 조금씩, <b>${REV[4]}라운드</b>에 전부 열린다.</li>
  <li>규칙은 다른 종목의 등락, 보유 총량, 매수·매도량, 시크릿과 얽혀 있다. 내 주문도 주가를 움직인다.</li>
  <li><b>시크릿</b>(1회): 한 종목의 정보를 두 라운드 동안 모두에게 가린다.</li>
  <li><b>피스</b> 3개: 한 종목의 다음 낱말 미리보기, 또는 현금 10,000원.</li>
  <li>마지막 라운드가 끝난 뒤 총자산 순위. 빈칸에 적은 추리가 맞으면 적중으로 기록된다.</li></ul></div>
  <div class="row"><button class="go" id="rnd">새 규칙으로 시작 (추천)</button><button id="cls">클래식 규칙</button></div>
  <p class="mut" style="font-size:13px;margin-top:8px">클래식은 방송의 일곱 규칙과 같은 구조라, 방송을 봤다면 이미 답을 안다. 새 규칙은 판마다 종목·조건·숫자를 다시 뽑는다.</p></div>
  <div class="card"><p class="k">규칙판 예시</p><div class="board"><div class="rl"><div class="h"><i class="sw" style="background:#2f6fb0"></i>뒷북전자</div>
  <input class="bl" placeholder="□□□□의" style="width:calc(5em + 14px)" tabindex="-1" aria-hidden="true"><span class="tk">보유 총량이</span><input class="bl nx" placeholder="□□주" style="width:calc(3.4em + 14px)" tabindex="-1" aria-hidden="true"><span class="tk">이상</span>
  <input class="bl" placeholder="□□주" style="width:calc(3.4em + 14px)" tabindex="-1" aria-hidden="true"><span class="tk">이하이면 +1500원, 그렇지 않으면</span><input class="bl" placeholder="□□□□□" style="width:calc(5.7em + 14px)" tabindex="-1" aria-hidden="true"></div></div>
  <p class="mut" style="font-size:14px;margin-top:10px">글자 수, 이미 보이는 낱말, 차트의 움직임, 매수·매도 숫자를 엮어 빈칸을 채워 보세요. 그리고 거래소 로고를 잘 봐 두세요.</p>${logoSvg()}</div></div>`;
  on('rnd',()=>newGame('random'));on('cls',()=>newGame('classic'));
}
DR.games.exchange={title:'미스터리 거래소',start(r){root=r;intro()}};
}
