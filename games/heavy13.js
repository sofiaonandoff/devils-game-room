{
let app;const setSt=t=>DR.status(t);
const rnd=DR.rnd,shuffle=DR.shuffle;
const CN={R:'빨강',G:'초록',B:'파랑',W:'무지개'};
const BOTS=[['공작','#9b2335'],['여우','#c9741f'],['교수','#3f8f8a'],['도박사','#7b5cc4'],['그림자','#5d6b75'],['늑대','#2f6fb0'],['마녀','#b0397a']];
const ROUNDS=14,SET=7;
let G=null,timer=null;
const sum=a=>a.reduce((s,x)=>s+x,0);
const P=id=>G.ps[id];
const nm=id=>P(id).you?`<b style="color:var(--gold)">${P(id).name}</b>`:P(id).name;
const fresh=p=>{p.cards=[0,1,2,3,4,5,6];p.chips={R:2,G:2,B:2,W:1}};
const later=(f,ms)=>{clearTimeout(timer);timer=DR.after(f,ms)};

/* ---------- 규칙 ---------- */
const RULES=`<ol>
<li>모두 <b>0~6 바위 카드 7장</b>, <b>빨강·초록·파랑 칩 2개씩</b>, <b>무지개 칩 1개</b>를 받는다.</li>
<li>라운드마다 카드 1장과 칩 1개를 몰래 낸다. 칩 색은 받침대, 카드 숫자는 바위 무게다.</li>
<li>칩을 먼저, 카드를 그다음에 공개한다.</li>
<li>놓는 순서: <b>무지개 칩</b> → <b>높은 카드</b> → 같으면 <b>선 플레이어부터 시계 방향</b>.</li>
<li>내 차례에 <b>놓기</b> 또는 <b>패스</b>. 패스한 바위는 맨 뒤에, 패스한 순서의 <b>역순</b>으로 놓인다. 순서가 마지막인 사람은 묻지 않고 놓는다.</li>
<li>무지개 칩은 놓을 때 받침대 색을 고른다.</li>
<li>내 바위로 받침대 합이 <b>13 이상</b>이 되면, 원래 있던 바위를 모두 떠안고 <b>그 개수만큼 벌점</b>. 내 바위 1개는 받침대에 남는다. 무게 0도 1개로 센다.</li>
<li>마지막으로 벌점을 받은 사람이 다음 라운드 선 플레이어. 벌점이 없으면 그대로.</li>
<li>7라운드 뒤 카드와 칩을 새로 받아 <b>14라운드</b>까지. 받침대는 그대로 이어진다.</li>
<li>벌점이 가장 많으면 최하위. 같으면 <b>더 최근에 벌점을 받은 사람</b>이 아래.</li></ol>`;

/* ---------- 시작 ---------- */
let cfg={n:7,open:true,name:''};
function setup(){
  clearTimeout(timer);G=null;setSt('준비');
  app.innerHTML=`<div class="card"><p class="k">1st Prison Match · Heavy 13</p><h2>받침대의 합이 13을 넘지 않게</h2>
  <div class="rule">${RULES}</div>
  <div class="grid2" style="margin-top:14px"><div>
    <p class="k">인원 (나 포함)</p><div class="opts" style="margin:6px 0 14px">${[3,4,5,6,7].map(n=>`<button data-n="${n}" class="${cfg.n==n?'sel':''}">${n}명</button>`).join('')}</div>
    <p class="k">플레이어 이름</p><input type="text" id="nm" maxlength="6" value="${cfg.name}" placeholder="나" aria-label="플레이어 이름">
  </div><div>
    <p class="k">난이도</p>
    <label class="tg"><input type="checkbox" id="op" ${cfg.open?'':'checked'}> 기억 모드: 남이 남긴 카드·칩을 표시하지 않음 (방송처럼 외워야 한다)</label>
    <p class="mut" style="font-size:14px">방송은 7명이 했고, 하위 2명이 탈락했다. 이 게임에서는 7명이면 하위 2명, 그보다 적으면 최하위 1명이 탈락이다.</p>
  </div></div>
  <button class="go" id="go" style="margin-top:10px">자리 고르러 가기</button></div>`;
  app.querySelectorAll('[data-n]').forEach(b=>b.onclick=()=>{cfg.n=+b.dataset.n;cfg.name=app.querySelector('#nm').value;cfg.open=!app.querySelector('#op').checked;setup()});
  app.querySelector('#go').onclick=()=>{cfg.name=app.querySelector('#nm').value.trim();cfg.open=!app.querySelector('#op').checked;init()};
}
function init(){
  const bots=shuffle(BOTS.slice()).slice(0,cfg.n-1);
  G={n:cfg.n,open:cfg.open,round:1,sc:0,stands:{R:[],G:[],B:[]},log:[],phase:'seat',
     ps:[{id:0,name:cfg.name||'나',col:'#8a6a1c',you:1}].concat(bots.map((b,i)=>({id:i+1,name:b[0],col:b[1]})))};
  G.ps.forEach(p=>{fresh(p);p.pen=0;p.stamp=0;p.seat=-1;p.hist=[]});
  G.start=rnd(cfg.n);
  draw();
}

/* ---------- 봇 ---------- */
function botSubmit(p){
  const n=G.n,opts=[];
  p.cards.forEach(card=>{
    const q=(6-card)/7,addEach=q*((card+7)/2)/3,before=(n-1)*addEach,others=(n-1)*q/3;
    ['R','G','B'].forEach(c=>{if(!p.chips[c])return;const st=G.stands[c],s=sum(st),k=st.length;
      const x=s+before+card,pb=1/(1+Math.exp(-(x-12.5)/1.6));
      opts.push({card,chip:c,cost:pb*(k+others+.5)+(p.chips[c]==1?.25:0)+Math.random()*.7})});
    if(p.chips.W){const best=Math.min(...['R','G','B'].map(c=>{const st=G.stands[c];return sum(st)+card>=13?st.length:0}));
      opts.push({card,chip:'W',cost:best+1.4+Math.random()*.7})}
  });
  opts.sort((a,b)=>a.cost-b.cost);return {card:opts[0].card,chip:opts[0].chip};
}
function botColor(p,card){
  const safe=['R','G','B'].filter(c=>sum(G.stands[c])+card<13);
  if(safe.length)return Math.random()<.6?safe.sort((a,b)=>sum(G.stands[b])-sum(G.stands[a]))[0]:safe.sort((a,b)=>sum(G.stands[a])-sum(G.stands[b]))[0];
  return ['R','G','B'].sort((a,b)=>G.stands[a].length-G.stands[b].length)[0];
}
const wouldBurst=(c,card)=>sum(G.stands[c])+card>=13;

/* ---------- 라운드 진행 ---------- */
function submit(card,chip){
  G.ps.forEach(p=>{p.sub=p.you?{card,chip}:botSubmit(p)});
  G.ps.forEach(p=>{p.cards.splice(p.cards.indexOf(p.sub.card),1);p.chips[p.sub.chip]--;p.hist.push(p.sub)});
  G.phase='chips';G.log=[];G.placed=null;draw();
}
function revealCards(){
  const rel=p=>(p.seat-P(G.start).seat+G.n)%G.n;
  G.order=G.ps.slice().sort((a,b)=>((b.sub.chip=='W')-(a.sub.chip=='W'))||b.sub.card-a.sub.card||rel(a)-rel(b)).map(p=>p.id);
  G.qi=0;G.passed=[];G.lastPen=null;G.phase='cards';draw();
}
function step(){ // 다음 바위
  G.phase='place';G.ask=null;
  let id,ask;
  if(G.qi<G.order.length){id=G.order[G.qi];ask=G.qi<G.order.length-1}
  else if(G.passed.length){id=G.passed[G.passed.length-1];ask=false}
  else return roundEnd();
  G.cur=id;const p=P(id),fromPass=G.qi>=G.order.length;
  if(p.you){
    if(ask)G.ask={mode:'decide'};
    else if(p.sub.chip=='W')G.ask={mode:'color',fromPass};
    else{draw();return later(()=>doPlace(id,p.sub.chip,fromPass),900)}
    return draw();
  }
  draw();
  later(()=>{
    const color=p.sub.chip=='W'?botColor(p,p.sub.card):p.sub.chip;
    if(ask&&wouldBurst(color,p.sub.card)&&Math.random()<.85)return doPass(id);
    doPlace(id,color,fromPass);
  },1000);
}
function doPass(id){G.passed.push(id);G.qi++;G.log.push({t:`${P(id).name} 패스`,c:'p'});step()}
function doPlace(id,c,fromPass){
  const p=P(id),card=p.sub.card,st=G.stands[c];
  if(fromPass)G.passed.pop();else G.qi++;
  if(sum(st)+card>=13){
    const k=st.length;p.pen+=k;p.stamp=++G.sc;G.lastPen=id;G.stands[c]=[card];
    G.log.push({t:`${p.name} · 바위 ${card} → ${CN[c]} · 합 ${sum(st)+card}! 바위 ${k}개를 떠안아 벌점 +${k}`,c:'b'});
    G.burst=c;
  }else{st.push(card);G.log.push({t:`${p.name} · 바위 ${card} → ${CN[c]} · 합 ${sum(st)}`});G.burst=null}
  G.placed={c,i:G.stands[c].length-1};
  step();
}
function roundEnd(){
  G.phase='end';G.cur=null;
  if(G.lastPen!=null)G.start=G.lastPen;
  draw();
}
function recordH(){const r=G.ps.slice().sort((a,b)=>a.pen-b.pen||a.stamp-b.stamp),out=G.n==7?2:1,my=r.findIndex(p=>p.you)+1;DR.record('heavy13',{clear:my<=G.n-out,score:P(0).pen,lowBetter:1,text:`벌점 ${P(0).pen} (${G.n}인 ${my}위)`})}
function nextRound(){
  G.round++;G.burst=null;G.placed=null;
  if(G.round>ROUNDS){G.phase='over';recordH();return draw()}
  if(G.round==SET+1)G.ps.forEach(fresh);
  G.phase='submit';draw();
}

/* ---------- 화면 ---------- */
let pick={card:null,chip:null};
function ring(){
  const n=G.n,seatOf={};G.ps.forEach(p=>{if(p.seat>=0)seatOf[p.seat]=p});
  const showSub=['chips','cards','place','end'].includes(G.phase);
  return `<div class="ring">${Array.from({length:n},(_,s)=>{
    const a=(-90+s*360/n)*Math.PI/180,x=50+41*Math.cos(a),y=50+41*Math.sin(a),p=seatOf[s];
    if(!p)return `<div class="seat" style="left:${x}%;top:${y}%">${G.phase=='seat'&&P(0).seat<0?`<button class="empty" data-seat="${s}" aria-label="${s+1}번 자리">${s+1}번</button>`:`<div class="mut">${s+1}번<br>빈자리</div>`}</div>`;
    const sub=p.sub&&showSub?`<span class="sub"><i class="dot ${p.sub.chip}"></i>${G.phase!='chips'?`<span class="cv">${p.sub.card}</span>`:'<span class="cv">?</span>'}</span>`:(G.phase=='submit'?`<span class="sub"><i class="dot H"></i></span>`:'');
    return `<div class="seat ${p.you?'me':''} ${G.cur==p.id?'cur':''}" style="left:${x}%;top:${y}%"><div class="av" style="background:${p.col}">${p.name[0]}${G.start==p.id?'<span class="star">선</span>':''}</div><div class="nm">${p.name}</div><div class="pen">벌점 ${p.pen}</div>${sub}</div>`}).join('')}
  <div class="mid"><div><span class="mut">${G.phase=='seat'?'자리 고르기':G.phase=='over'?'게임 종료':`라운드`}</span><b>${G.phase=='seat'?`${n}명`:G.phase=='over'?'끝':`${Math.min(G.round,ROUNDS)} / ${ROUNDS}`}</b><span class="mut">선 ${P(G.start).name}</span></div></div></div>`;
}
function stands(){
  return `<div class="stands">${['R','G','B'].map(c=>{const st=G.stands[c],s=sum(st);
    return `<div class="stand ${c} ${G.burst==c?'burst':''}"><h3>${CN[c]} 받침대</h3><div class="sum">${s}<small> / 13</small></div>
    <div class="gauge ${s>=9?'hot':''}"><i style="width:${Math.min(100,s/13*100)}%"></i></div>
    <div class="mut" style="font-size:13px">바위 ${st.length}개 · 터지면 벌점 ${st.length}</div>
    <div class="pile">${st.map((v,i)=>`<span class="rock ${G.placed&&G.placed.c==c&&G.placed.i==i?'new':''}">${v}</span>`).join('')}</div></div>`}).join('')}</div>`;
}
function hands(){
  return `<table><tr><th>플레이어</th><th>남은 카드</th><th>남은 칩</th><th class="n">벌점</th></tr>${G.ps.slice().sort((a,b)=>a.seat-b.seat).map(p=>`<tr class="${p.you?'me':''}"><td>${nm(p.id)}</td>
  <td>${p.you||G.open?p.cards.join(' ')||'-':'?'}</td><td>${p.you||G.open?['R','G','B','W'].map(c=>p.chips[c]?`<i class="dot ${c}" title="${CN[c]}"></i>${p.chips[c]>1?'×'+p.chips[c]:''}`:'').join(' ')||'-':'?'}</td><td class="n">${p.pen}</td></tr>`).join('')}</table>`;
}
function orderList(){
  if(!G.order)return '';
  const doneIdx=G.qi;
  return `<ul class="ord">${G.order.map((id,i)=>{const p=P(id),passed=G.passed.includes(id);
    return `<li class="${i<doneIdx&&!passed?'done':''} ${G.cur==id?'now':''}">${i+1}. ${p.name} <i class="dot ${p.sub.chip}" style="width:12px;height:12px;vertical-align:-1px"></i> ${p.sub.card}${passed?' · 패스':''}</li>`}).join('')}</ul>`;
}
function logBox(){return G.log.length?`<ul class="log">${G.log.map(l=>`<li class="${l.c||''}">${l.t}</li>`).join('')}</ul>`:''}
function panel(){
  const me=P(0);
  if(G.phase=='seat'){
    return `<p class="k">자리 고르기</p><h2>원탁 어디에 설까</h2><p>1라운드 선 플레이어는 <b>${nm(G.start)}</b>. 같은 숫자를 냈을 때는 선 플레이어부터 <b>시계 방향</b> 순으로 놓는다. 한 번 고른 자리는 바꿀 수 없다.</p><p class="mut">원탁의 빈자리를 누르세요.</p>`;
  }
  if(G.phase=='submit'){
    const c=pick.card,ch=pick.chip;
    return `<p class="k">라운드 ${G.round} · 비공개 제출${G.round==SET+1?' · 새 세트 지급':''}</p><h2>카드 1장과 칩 1개를 고르세요</h2>
    <div class="hand">${me.cards.map(v=>`<button class="cb ${c===v?'sel':''}" data-c="${v}" aria-label="바위 ${v}">${v}</button>`).join('')}</div>
    <div class="hand">${['R','G','B','W'].map(x=>`<button class="chipb ${x} ${ch==x?'sel':''}" data-ch="${x}" ${me.chips[x]?'':'disabled'} aria-label="${CN[x]} 칩 ${me.chips[x]}개"><em>${me.chips[x]}</em></button>`).join('')}</div>
    ${c!==null&&ch?preview(c,ch):'<p class="mut">무지개 칩은 가장 먼저 놓이고, 놓을 때 색을 고른다.</p>'}
    <button class="go" id="sub" ${c!==null&&ch?'':'disabled'}>제출</button>`;
  }
  if(G.phase=='chips')return `<p class="k">칩 공개</p><h2>모두의 칩이 열렸다</h2><p>${G.ps.map(p=>`${p.name} <i class="dot ${p.sub.chip}" style="width:14px;height:14px;vertical-align:-2px"></i>`).join(' · ')}</p><button class="go" id="rc">카드 공개</button>`;
  if(G.phase=='cards')return `<p class="k">카드 공개 · 놓는 순서 확정</p><h2>이 순서로 바위를 올린다</h2>${orderList()}<button class="go" id="pl">바위 올리기 시작</button>`;
  if(G.phase=='place'){
    const p=P(G.cur);
    if(G.ask&&p.you){
      const card=p.sub.card;
      if(G.ask.mode=='decide'){
        if(p.sub.chip=='W')return `<p class="k">내 차례 · 무지개 칩</p><h2>바위 ${card}, 어디에 놓을까</h2>${orderList()}${colorBtns(card)}<button id="ps" style="margin-top:10px">패스 (맨 뒤로)</button>${logBox()}`;
        const s=sum(G.stands[p.sub.chip])+card,b=s>=13;
        return `<p class="k">내 차례</p><h2>바위 ${card} → ${CN[p.sub.chip]}</h2>${orderList()}
        <p>지금 놓으면 합 <b>${s}</b> · ${b?`<span class="warn">벌점 ${G.stands[p.sub.chip].length}</span>`:'<span class="ok">안전</span>'}</p>
        <p class="mut" style="font-size:14px">패스하면 남은 바위가 다 놓인 뒤, 패스한 순서의 역순으로 놓인다. 그 사이 누가 이 받침대를 터뜨리면 살 수도 있다.</p>
        <div class="row"><button class="go" id="pt">놓기</button><button id="ps">패스</button></div>${logBox()}`;
      }
      return `<p class="k">${G.ask.fromPass?'패스한 바위':'마지막 순서'} · 무지개 칩</p><h2>바위 ${card}, 받침대를 고르세요</h2>${orderList()}${colorBtns(card)}${logBox()}`;
    }
    return `<p class="k">바위를 올리는 중</p><h2>${p.name}${p.you?' (나)':''}의 차례</h2>${orderList()}${logBox()}`;
  }
  if(G.phase=='end'){
    const got=G.log.filter(l=>l.c=='b').length;
    return `<p class="k">라운드 ${G.round} 종료</p><h2>${got?`다음 선 플레이어: ${P(G.start).name}`:'벌점 없음 · 선 플레이어 유지'}</h2>${logBox()}
    <button class="go" id="nx" style="margin-top:12px">${G.round==ROUNDS?'최종 결과':G.round==SET?'8라운드로 · 새 세트 지급':'다음 라운드'}</button>`;
  }
  if(G.phase=='over'){
    const r=G.ps.slice().sort((a,b)=>a.pen-b.pen||a.stamp-b.stamp),out=G.n==7?2:1;
    const myR=r.findIndex(p=>p.you)+1,dead=myR>G.n-out;
    return `<p class="k">감옥 매치 종료</p><h2>${myR==1?'1위. 피스 4개를 가져간다':dead?'탈락. 짐이 너무 무거웠다':`${myR}위로 생존`}</h2>
    <table><tr><th>순위</th><th>플레이어</th><th class="n">벌점</th><th>결과</th></tr>${r.map((p,i)=>`<tr class="${i>=G.n-out?'lose':p.you?'me':''}"><td>${i+1}</td><td>${nm(p.id)}</td><td class="n">${p.pen}</td><td>${i==0?'◆ +4':i>=G.n-out?'탈락':'생존'}</td></tr>`).join('')}</table>
    <p class="mut" style="font-size:13px">벌점이 같으면 더 최근에 벌점을 받은 사람이 아래 순위다.</p>
    <div class="row" style="margin-top:12px"><button class="go" id="re">다시 하기</button><button id="hm">설정으로</button></div>`;
  }
  return '';
}
function preview(card,chip){
  if(chip=='W')return `<p class="mut">무지개 ${card}: 이번 라운드 가장 먼저 놓이고, 놓을 때 받침대를 고른다.</p>`;
  const s=sum(G.stands[chip]);
  return `<p>지금 ${CN[chip]} 받침대는 <b>${s}</b>. 바위 ${card}를 그대로 얹으면 <b>${s+card}</b>${s+card>=13?' <span class="warn">(터짐)</span>':''}. 나보다 먼저 놓는 사람이 있다면 더 무거워진다.</p>`;
}
function colorBtns(card){
  return `<div class="row">${['R','G','B'].map(c=>{const st=G.stands[c],s=sum(st)+card,b=s>=13;
    return `<button class="colbtn ${c}" data-col="${c}">${CN[c]}<small>합 ${s} · ${b?`<span class="warn">벌점 ${st.length}</span>`:'<span class="ok">안전</span>'}</small></button>`}).join('')}</div>`;
}
function draw(){
  setSt(G.phase=='seat'?'자리 고르기':G.phase=='over'?'게임 종료':`라운드 ${Math.min(G.round,ROUNDS)} / ${ROUNDS}`);
  app.innerHTML=`<div class="grid2"><div class="card">${ring()}</div><div class="card">${panel()}</div></div>
  <div class="card"><div class="row sp"><p class="k">짐꾼 받침대</p><span class="mut" style="font-size:13px">합이 13 이상이 되는 순간 터진다</span></div><div style="margin-top:10px">${stands()}</div></div>
  <div class="card"><p class="k">플레이어 현황 (자리 순)${G.open?'':' · 기억 모드'}</p>${hands()}</div>
  <details class="card"><summary style="cursor:pointer;font-weight:700;min-height:28px">규칙 다시 보기</summary><div class="rule">${RULES}</div></details>`;
  bind();
}
function bind(){
  const q=s=>app.querySelector(s),qa=s=>app.querySelectorAll(s);
  qa('[data-seat]').forEach(b=>b.onclick=()=>{
    P(0).seat=+b.dataset.seat;const free=shuffle([...Array(G.n).keys()].filter(s=>s!=P(0).seat));
    G.ps.slice(1).forEach((p,i)=>p.seat=free[i]);G.phase='submit';pick={card:null,chip:null};draw()});
  qa('[data-c]').forEach(b=>b.onclick=()=>{pick.card=+b.dataset.c;draw()});
  qa('[data-ch]').forEach(b=>b.onclick=()=>{pick.chip=b.dataset.ch;draw()});
  const on=(id,f)=>{const e=q('#'+id);if(e)e.onclick=f};
  on('sub',()=>{const {card,chip}=pick;pick={card:null,chip:null};submit(card,chip)});
  on('rc',revealCards);on('pl',step);on('nx',nextRound);
  on('pt',()=>doPlace(0,P(0).sub.chip,false));on('ps',()=>doPass(0));
  qa('[data-col]').forEach(b=>b.onclick=()=>doPlace(0,b.dataset.col,!!(G.ask&&G.ask.fromPass)));
  on('re',init);on('hm',setup);
}
DR.games.heavy13={title:'무거운 13',start(r){app=r;setup()}};
}
