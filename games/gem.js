{
const rnd=DR.rnd,shuffle=DR.shuffle;
const DECK=[['D',5],['D',6],['G',4],['G',5],['S',2],['S',3],['S',4],['B',1],['B',1],['B',2],['B',2],['X',-6],['X',-4]];
const TN={D:'다이아',G:'금',S:'은',B:'동',X:'폭탄'},ROUNDS=3;
let root,G;
const $=s=>root.querySelector(s);
const on=(id,f)=>{const e=root.querySelector('#'+id);if(e)e.onclick=f};
const cname=c=>c.t=='X'?`폭탄 ${c.v}`:`${TN[c.t]} ${c.v}`;
const cardHTML=(c,cls='')=>c?`<div class="gm ${c.t} ${cls}"><small>${TN[c.t]}</small><b>${c.v}</b></div>`:`<div class="gm bk ${cls}"><b>?</b></div>`;

function newGame(){
  const bots=shuffle(DR.BOTS.concat([['유령','#6b5b8a']]));
  const ps=shuffle([{name:'나',you:1}].concat(bots.map(b=>({name:b[0],w:Math.random()}))));
  ps.forEach((p,i)=>{p.id=i;p.score=0;p.pieces=2;p.peeked=false});
  // 마니또 고리: ring[i]가 ring[i+1]의 마니또 (ring[i]의 점수가 ring[i+1]의 최종 승점에 곱해진다)
  const ring=shuffle(ps.map(p=>p.id));ring.forEach((id,i)=>{ps[id].mOf=ring[(i+1)%ring.length]});
  ps.forEach(p=>{ps[p.mOf].myM=p.id});
  G={ps,round:0,start:null,log:[],ring};
  auction();
}
const me=()=>G.ps.find(p=>p.you);
const P=i=>G.ps[i];
function auction(){
  DR.status('선 플레이어 경매');
  root.innerHTML=`<div class="card"><p class="k">1라운드 선 플레이어 · 피스 경매</p><h2>몇 개를 걸까</h2>
  <p>당신은 <b style="color:var(--gold)">${P(me().mOf).name}</b>의 마니또다. 당신의 승점이 ${P(me().mOf).name}의 최종 승점에 곱해진다. 당신의 마니또가 누구인지는 모른다.</p>
  <p>가장 많이 건 사람이 선이 되고 건 피스를 낸다. 진 사람의 피스는 돌려준다. (지금 피스 ${me().pieces}개)</p>
  <div class="row">${[0,1,2].map(n=>`<button data-b="${n}" ${n>me().pieces?'disabled':''}>${n}개</button>`).join('')}</div></div>`;
  root.querySelectorAll('[data-b]').forEach(b=>b.onclick=()=>{
    let bids={};G.ps.forEach(p=>bids[p.id]=p.you?+b.dataset.b:rnd(Math.min(2,p.pieces)+1));
    let top=Math.max(...Object.values(bids)),tied=G.ps.filter(p=>bids[p.id]==top);
    const w=tied[rnd(tied.length)];w.pieces-=top;G.start=w.id;
    G.log.push({t:`경매: ${tied.length>1?`${tied.map(p=>p.name).join('·')} ${top}개 동률, 추첨으로 `:''}${w.name} 선 (${top}개)`});
    nextRound()});
}
function nextRound(){
  if(G.round>=ROUNDS)return finish();
  G.round++;const deck=shuffle(DECK.map(([t,v],i)=>({t,v,id:i})));
  const n=G.ps.length;G.order=[...Array(n).keys()].map(k=>(G.start+k)%n);
  G.hand={};G.order.forEach((id,k)=>G.hand[id]=deck[k]);G.buy=deck.slice(n,n+3);G.trash=deck[n+3];
  G.turns=G.order.concat(G.order.slice().reverse());G.ti=0;G.bombBonus={};G.roundLog=[];
  // 기억: 각자 자리→카드
  G.ps.forEach(p=>{p.know={['p'+p.id]:G.hand[p.id]};p.fresh=true});
  if(G.round==1)G.ps.forEach(p=>{});
  play();
}
const locCard=l=>l[0]=='p'?G.hand[+l.slice(1)]:l[0]=='b'?G.buy[+l.slice(1)]:G.trash;
function setLoc(l,c){if(l[0]=='p')G.hand[+l.slice(1)]=c;else if(l[0]=='b')G.buy[+l.slice(1)]=c;else G.trash=c}
const locName=l=>l[0]=='p'?P(+l.slice(1)).name:l[0]=='b'?`구매자 ${+l.slice(1)+1}`:'휴지통';
function swap(id,target){
  const a='p'+id,ca=locCard(a),cb=locCard(target);
  if(ca.t=='X'&&target[0]!='p')return false;
  if(target==a)return false;
  if(cb.t=='X'&&target[0]=='p'){const v=+target.slice(1);G.bombBonus[v]=(G.bombBonus[v]||0)+3}
  setLoc(a,cb);setLoc(target,ca);
  // 공개된 교환: 모두의 기억에서 두 자리를 맞바꾼다
  G.ps.forEach(p=>{const k=p.know,x=k[a],y=k[target];delete k[a];delete k[target];if(y)k[a]=y;if(x)k[target]=x});
  P(id).know[a]=cb;// 바꾼 사람은 받은 카드를 본다
  if(target[0]=='p')P(+target.slice(1)).fresh=false;
  P(id).fresh=true;
  G.roundLog.unshift(`${P(id).name} ↔ ${locName(target)}`);
  G.ti++;return true;
}
// 봇: 구매자 칸에 있을 법한 종류를 세고, 받을 카드의 기대 승점이 가장 큰 교환을 고른다
function botMove(p){
  const mine=G.hand[p.id],known=l=>p.know[l];
  const buyT=[0,1,2].map(i=>known('b'+i)),unknownBuy=buyT.filter(x=>!x).length;
  const val=(c,buyCards)=>{if(!c)return 1.2;if(c.t=='X')return c.v-2;const k=buyCards.filter(x=>x&&x.t==c.t).length,guess=k+unknownBuy*(c.t=='B'?.35:.2);return c.v*Math.max(guess,.15)};
  const opts=[];
  G.ps.forEach(q=>{if(q.id!==p.id)opts.push('p'+q.id)});
  if(mine.t!='X'){opts.push('b0','b1','b2','t')}
  let best=null,bs=-1e9;
  opts.forEach(l=>{const c=known(l);let buy=buyT.slice();if(l[0]=='b')buy[+l[1]]=mine;
    let s=val(c,buy)+Math.random()*1.5*(1-p.w*.5);if(c&&c.t=='X')s-=6;if(s>bs){bs=s;best=l}});
  return best;
}
function play(){
  if(G.ti>=G.turns.length)return roundEnd();
  const id=G.turns[G.ti],p=P(id);
  if(p.you){p.know['p'+id]=G.hand[id];p.fresh=true;return render()}
  render();
  DR.after(()=>{if(G.turns[G.ti]!==id)return;swap(id,botMove(p));play()},700);
}
function roundEnd(){
  const cnt={};G.buy.forEach(c=>{if(c.t!='X')cnt[c.t]=(cnt[c.t]||0)+1});
  G.rs={};G.ps.forEach(p=>{const c=G.hand[p.id];let s=0;if(c.t=='X')s=c.v;else if(cnt[c.t]){s=c.v*cnt[c.t];if(c.t=='D')p.pieces++}
    s+=G.bombBonus[p.id]||0;p.score+=s;G.rs[p.id]=s});
  const h6=G.ps.find(p=>G.hand[p.id].v==-6&&G.hand[p.id].t=='X'),h4=G.ps.find(p=>G.hand[p.id].v==-4&&G.hand[p.id].t=='X');
  G.prevStart=G.start;G.start=h6?h6.id:h4?h4.id:G.start;
  G.phase='roundEnd';render();
}
function finish(){
  G.ps.forEach(p=>p.final=p.score*P(p.myM).score);
  G.rank=G.ps.slice().sort((a,b)=>b.final-a.final);G.phase='end';
  const my=G.rank.indexOf(me())+1;DR.record('gem',{clear:my<G.ps.length,score:me().final,text:`최종 ${me().final}점 · ${my}위`});render();
}
/* ---------- 화면 ---------- */
function render(){
  const m=me(),cur=G.phase=='roundEnd'||G.phase=='end'?null:G.turns[G.ti],myTurn=cur===m.id,reveal=G.phase=='roundEnd'||G.phase=='end';
  DR.status(G.phase=='end'?'끝':`${G.round} / ${ROUNDS} 라운드 · 교환 ${Math.min(G.ti+1,G.turns.length)} / ${G.turns.length}`);
  const myCard=reveal||m.fresh?G.hand[m.id]:null;
  const seat=p=>{const l='p'+p.id,isMe=p.you,can=myTurn&&!isMe;
    const face=reveal?cardHTML(G.hand[p.id]):isMe?cardHTML(myCard,'mine'):cardHTML(null);
    return `<${can?'button':'div'} class="gseat ${cur===p.id?'cur':''} ${isMe?'me':''}" ${can?`data-t="${l}"`:''}>${face}<span>${G.order.indexOf(p.id)+1}. ${p.name}</span><small>${reveal?`${G.rs&&G.rs[p.id]!=null?(G.rs[p.id]>0?'+':'')+G.rs[p.id]:''}`:''} 누적 ${G.phase=='end'||reveal?p.score:'?'}</small></${can?'button':'div'}>`};
  const bombLock=myTurn&&G.hand[m.id].t=='X';
  const slot=(l,label)=>{const c=locCard(l),kn=m.know[l],can=myTurn&&!bombLock;return `<${can?'button':'div'} class="gslot" ${can?`data-t="${l}"`:''}>${reveal?cardHTML(c):cardHTML(kn||null)}<span>${label}</span></${can?'button':'div'}>`};
  let side='';
  if(G.phase=='end'){side=`<p class="k">최종 · 내 승점 × 내 마니또의 승점</p><table><tr><th>순위</th><th>플레이어</th><th class="n">승점</th><th>마니또</th><th class="n">최종</th></tr>${G.rank.map((p,i)=>`<tr class="${i==G.rank.length-1?'lose':p.you?'me':''}"><td>${i+1}</td><td>${p.name}</td><td class="n">${p.score}</td><td>${P(p.myM).name} (${P(p.myM).score})</td><td class="n">${p.final}</td></tr>`).join('')}</table>
    <p class="mut" style="font-size:13px">마니또 고리: ${G.ring.map(i=>P(i).name).join(' → ')} → (처음으로). 화살표 앞 사람이 뒤 사람의 마니또.</p><button class="go" id="re">다시 하기</button>`}
  else if(G.phase=='roundEnd')side=`<p class="k">${G.round}라운드 끝 · 모든 카드 공개</p><h3 style="font-size:24px">다음 선: ${P(G.start).name}</h3><p class="mut" style="font-size:14px">구매자 칸에 있는 보석과 같은 종류를 들었으면 숫자 × 그 종류의 장수. 다이아로 점수를 얻으면 피스 +1. 폭탄을 넘겨받게 한 사람은 +3.</p><button class="go" id="nx">${G.round<ROUNDS?'다음 라운드':'마니또 공개와 최종 승점'}</button>`;
  else side=myTurn?`<p class="k">내 차례 — 반드시 교환</p><h3 style="font-size:24px">내 카드: ${cname(G.hand[m.id])}</h3><p>${bombLock?'<b class="warn">폭탄은 다른 플레이어의 카드와만 바꿀 수 있다.</b>':'다른 플레이어의 카드, 구매자 칸, 휴지통 가운데 하나를 눌러 바꾼다.'}</p>`
    :`<p class="k">${P(cur).name}의 차례</p><p class="mut">교환이 진행 중이다. 내 카드는 ${m.fresh?'알고 있다':'<b>누군가 바꿔 가서 지금은 모른다</b> (내 차례에 볼 수 있다)'}.</p>`;
  root.innerHTML=`<div class="grid2"><div class="card"><div class="row sp"><p class="k">${G.round}라운드 · ${G.ti<G.order.length?'정순 교환':'역순 교환'}</p><span class="mut">피스 ◆${m.pieces}</span></div>
  <div class="gmarket"><div class="gbuy">${[0,1,2].map(i=>slot('b'+i,`구매자 ${i+1}`)).join('')}${slot('t','휴지통')}</div>
  <div class="gseats">${G.order.map(id=>seat(P(id))).join('')}</div></div>
  ${!reveal&&!m.peeked&&m.pieces?`<div class="row" style="margin-top:10px"><span class="mut" style="font-size:14px">게임 중 한 번, 피스 1개로 구매자·휴지통 카드 한 장 보기:</span>${['b0','b1','b2','t'].map(l=>`<button data-pk="${l}" style="min-height:36px;padding:4px 10px">${locName(l)}</button>`).join('')}</div>`:''}</div>
  <div class="stackg"><div class="card pop">${side}</div><div class="card"><p class="k">나는 <span style="color:var(--gold)">${P(m.mOf).name}</span>의 마니또</p><p class="k" style="margin-top:10px">공개된 교환</p><ul class="log">${(G.roundLog||[]).slice(0,10).map(t=>`<li>${t}</li>`).join('')||'<li class="mut">아직 없다</li>'}</ul></div></div></div>`;
  root.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{if(swap(m.id,b.dataset.t))play()});
  root.querySelectorAll('[data-pk]').forEach(b=>b.onclick=()=>{m.pieces--;m.peeked=true;m.know[b.dataset.pk]=locCard(b.dataset.pk);render()});
  on('nx',nextRound);on('re',newGame);
}
function intro(){
  DR.status('준비');
  root.innerHTML=`<div class="card"><p class="k">3일차 메인 매치</p><h2>뒤집힌 보석, 숨은 마니또</h2>
  <div class="rule"><ol><li>카드 13장: 다이아 5·6, 금 4·5, 은 2·3·4, 동 1·1·2·2, 폭탄 −6·−4. 라운드마다 한 장씩 나눠 받고, 남은 3장은 <b>구매자 칸</b>, 1장은 <b>휴지통</b>.</li>
  <li>처음에 자기 카드를 한 번 보고, 그 뒤로는 <b>자기 차례에만</b> 볼 수 있다.</li>
  <li>교환은 정순 한 바퀴, 역순 한 바퀴. 차례마다 다른 플레이어의 카드·구매자 칸·휴지통 가운데 하나와 <b>반드시</b> 바꾼다. 폭탄을 들었으면 다른 플레이어하고만 바꿀 수 있다.</li>
  <li>내 폭탄을 다른 사람이 자기 차례에 가져가면 나는 +3.</li>
  <li>라운드 끝: 구매자 칸에 있는 보석과 같은 종류를 들었으면 숫자 × 그 종류의 장수. 다이아로 점수를 얻으면 피스 +1. 폭탄은 적힌 만큼 감점. 다음 선은 −6 폭탄(없으면 −4)을 든 사람.</li>
  <li>3라운드. 모두에게 <b>마니또</b>가 있다: 최종 승점 = 내 승점 × 내 마니또의 승점. 나는 내가 누구의 마니또인지만 안다.</li>
  <li>게임 중 한 번, 피스 1개로 구매자 칸이나 휴지통 카드 한 장을 몰래 볼 수 있다.</li></ol></div>
  <p class="mut" style="font-size:14px">방송과 같은 9인전 (나 + 봇 8명). 모두 피스 2개로 시작.</p><button class="go" id="go">시작</button></div>`;on('go',newGame);
}
DR.games.gem={title:'보석 암시장',start(r){root=r;intro()}};
}
