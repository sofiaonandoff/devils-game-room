{
const rnd=DR.rnd,shuffle=DR.shuffle;
let root;
const $=s=>root.querySelector(s);
const on=(id,f)=>{const e=root.querySelector('#'+id);if(e)e.onclick=f};
const sg=d=>d>0?`<span class="up">+${d}</span>`:d<0?`<span class="dn">${d}</span>`:'±0';
function mkPlayers(n){return [{id:0,name:'나',col:'#8a6a1c',you:1,pieces:1}].concat(shuffle(DR.BOTS.slice()).slice(0,n-1).map((b,i)=>({id:i+1,name:b[0],col:b[1],pieces:1})))}
const nmOf=ps=>id=>ps[id].you?`<b style="color:var(--gold)">${ps[id].name}</b>`:ps[id].name;

/* ===================== 데빌 룰렛 ===================== */
function roulette(){
  root.innerHTML=`<div class="card"><p class="k">2nd Prison Match · Devil Roulette</p><h2>여섯 칸, 한 발</h2>
  <div class="rule"><ul><li>6칸 실린더에 총알 1발. 실린더는 처음 한 번만 돌린다.</li><li>자기 차례에 방아쇠를 <b>1번 또는 2번</b> 당긴다. 2번을 고르면 남은 확률을 다음 사람에게 더 무겁게 넘길 수 있다.</li><li>피스 1개를 내면 한 판에 한 번 <b>패스</b>. 모두 피스 1개로 시작.</li><li>총알을 맞은 1명이 탈락, 나머지는 생존.</li></ul></div>
  <p class="k">인원</p><div class="row" style="margin:8px 0 14px"><button data-n="3">3명</button><button data-n="4">4명</button></div></div>`;
  DR.status('준비');
  root.querySelectorAll('[data-n]').forEach(b=>b.onclick=()=>play(+b.dataset.n));
  function play(n){
    const ps=mkPlayers(n),nm=nmOf(ps),g={ids:shuffle(ps.map(p=>p.id)),turn:0,idx:0,bullet:rnd(6),pass:{},log:[],dead:null};
    const cur=()=>g.ids[g.turn%g.ids.length];
    function act(a){const id=cur(),p=ps[id];
      if(a=='pass'){p.pieces--;g.pass[id]=1;g.log.push(`${p.name}: 피스 1개를 내고 패스`)}
      else for(let k=0;k<a;k++){if(g.idx==g.bullet){g.dead=id;g.log.push(`${p.name}: 탕!`);return}g.idx++;g.log.push(`${p.name}: 찰칵 (${g.idx}/6)`)}
      g.turn++}
    function bot(id){const r=6-g.idx;if(r<=2&&!g.pass[id]&&ps[id].pieces>0)return 'pass';return r>=4&&Math.random()<.3?2:1}
    function cyl(){return `<svg viewBox="0 0 200 200" role="img" aria-label="실린더, ${6-g.idx}칸 남음"><circle cx="100" cy="100" r="94" fill="#2b2b31" stroke="#55555f" stroke-width="4"/><circle cx="100" cy="100" r="80" fill="#3a3a42"/>
      ${[0,1,2,3,4,5].map(k=>{const a=(k*60-90)*Math.PI/180,x=100+52*Math.cos(a),y=100+52*Math.sin(a),used=k<g.idx,c=k==g.idx&&g.dead==null,bang=g.dead!=null&&k==g.bullet;
      return `<circle cx="${x}" cy="${y}" r="21" fill="${bang?'#e0384f':used?'#55555f':'#111'}" stroke="${c?'#e8c262':'#77778a'}" stroke-width="${c?5:2}"/>`}).join('')}<circle cx="100" cy="100" r="13" fill="#77778a"/></svg>`}
    function ui(){const c=cur(),r=6-g.idx,mine=c==0&&g.dead==null;DR.status(g.dead!=null?'게임 종료':`남은 약실 ${r}`);
      root.innerHTML=`<div class="card"><p class="k">데빌 룰렛 · ${n}인</p><h2>${g.dead!=null?(g.dead==0?'탕. 당신이 탈락했다':`${ps[g.dead].name} 탈락. 당신은 살아남았다`):mine?'당신의 차례':`${ps[c].name}의 차례`}</h2>
      <div class="rr pop">${cyl()}<div><p>남은 약실 <b>${r}</b> · 다음 한 발이 실탄일 확률 <b>${Math.round(100/r)}%</b></p>
      <ol class="order">${g.ids.map(i=>`<li class="${i==c&&g.dead==null?'cur':''}">${nm(i)} · 피스 ${ps[i].pieces}${g.pass[i]?' · 패스 사용':''}</li>`).join('')}</ol></div></div>
      <ul class="log">${g.log.slice(-8).map(x=>`<li>${x}</li>`).join('')||'<li class="mut">아직 아무도 당기지 않았다.</li>'}</ul>
      <div class="row" style="margin-top:14px">${g.dead!=null?`<button class="go" id="re">다시 하기</button>`:mine?`<button class="go" id="p1">1번 당긴다</button><button id="p2">2번 당긴다</button><button id="ps" ${g.pass[0]||ps[0].pieces<1?'disabled':''}>패스 (피스 1)</button>`:'<p class="mut">상대가 방아쇠에 손가락을 건다…</p>'}</div></div>`;
      if(g.dead!=null){DR.record('roulette',{clear:g.dead!=0,text:null});return on('re',roulette)}
      if(mine){on('p1',()=>{act(1);ui()});on('p2',()=>{act(2);ui()});on('ps',()=>{act('pass');ui()})}
      else DR.after(()=>{act(bot(c));ui()},1000);
    }
    ui();
  }
}

/* ===================== 악마의 금고 ===================== */
function vault(){
  const d=shuffle([...'0123456789']).slice(0,3).join(''),tries=[],MAX=7;DR.status('남은 시도 7');
  function ui(msg){
    root.innerHTML=`<div class="grid2"><div class="card"><p class="k">Hidden Stage · 악마의 금고</p><h2>세 자리 비밀번호를 맞혀라</h2>
    <div class="rule">서로 다른 숫자 세 개. 자리와 숫자가 모두 맞으면 <b>S</b>, 숫자만 맞으면 <b>B</b>. 기회는 일곱 번.</div>
    <form id="f" class="row"><input type="text" id="g" inputmode="numeric" maxlength="3" autocomplete="off" aria-label="세 자리 숫자" style="font-size:24px;width:140px;letter-spacing:6px"><button class="go">시도</button></form>
    ${msg?`<p class="warn">${msg}</p>`:''}<p class="mut">남은 시도 ${MAX-tries.length}</p></div>
    <div class="card"><p class="k">기록</p><table><tr><th>#</th><th>입력</th><th class="n">S</th><th class="n">B</th></tr>${tries.map((x,i)=>`<tr><td>${i+1}</td><td>${x[0]}</td><td class="n">${x[1]}</td><td class="n">${x[2]}</td></tr>`).join('')}</table></div></div>`;
    $('#g').focus();
    $('#f').onsubmit=e=>{e.preventDefault();const v=$('#g').value;
      if(!/^\d{3}$/.test(v)||new Set(v).size<3)return ui('서로 다른 숫자 3개를 넣어야 한다.');
      let s=0,b=0;[...v].forEach((c,i)=>{if(d[i]==c)s++;else if(d.includes(c))b++});tries.push([v,s,b]);DR.status(`남은 시도 ${MAX-tries.length}`);
      if(s==3)end(1);else if(tries.length>=MAX)end(0);else ui()}
  }
  function end(w){DR.record('vault',{clear:w,score:w?tries.length:null,lowBetter:1,text:w?`${tries.length}번 만에`:null});DR.status(w?'성공':'실패');
    root.innerHTML=`<div class="card pop"><p class="k">히든 스테이지 결과</p><h2>${w?`${tries.length}번 만에 금고가 열렸다`:'경보가 울렸다'}</h2><p>비밀번호는 <b>${d}</b>였다.</p><button class="go" id="re">다시 하기</button></div>`;on('re',vault)}
  ui();
}

DR.games.roulette={title:'데빌 룰렛',start(r){root=r;roulette()}};
DR.games.vault={title:'악마의 금고',start(r){root=r;vault()}};
}
