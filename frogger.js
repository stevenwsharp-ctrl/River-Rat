'use strict';
/* =====================================================================
   RIVER RAT — RAT CROSSING (Frogger mode)
   Hop your boat downstream, one lane at a time. Logs, animals and other
   boats float across the river. Do not touch them. Park in the 5 eddies
   at the take-out to clear the level.
   ===================================================================== */
const FROG_THEMES=[
  {n:'Gray Canyon · Green River',pal:{water:'#5f7f63',wall:'#b88a55',wall2:'#93693e',sand:'#e3cc9c',rock:'#8a7058'},kinds:['log','ducks','beaver','raft','tree','deer']},
  {n:'Grand Canyon',pal:{water:'#3f7f6f',wall:'#b4552f',wall2:'#86391f',sand:'#ddbb84',rock:'#7b5a4a'},kinds:['raft','dory','bighorn','log','kayak','ducks']},
  {n:'Zambezi',pal:{water:'#486a5c',wall:'#3b3531',wall2:'#27221f',sand:'#c9b18a',rock:'#2f2a28'},kinds:['croc','hippo','log','raft','croc','tree']},
  {n:'Pacuare jungle',pal:{water:'#5f8a6c',wall:'#2f6a2a',wall2:'#1f4a1f',sand:'#9c8c6c',rock:'#58544e'},kinds:['tree','kayak','sloth','log','raft','croc']},
  {n:'Ganges · Rishikesh',pal:{water:'#56ada6',wall:'#5c7a3c',wall2:'#3b5a2a',sand:'#ebe3cb',rock:'#9b968a'},kinds:['boat','raft','marigold','log','kayak','raft']},
  {n:'Franklin · Tasmania',pal:{water:'#4a2e1e',wall:'#4a5a3a',wall2:'#2f4a2a',sand:'#bba989',rock:'#8a8478'},kinds:['log','platypus','tree','raft','log','ducks']},
  {n:'Ice river (just for fun)',pal:{water:'#7aa1b2',wall:'#6b5c4c',wall2:'#4b4139',sand:'#e8eef2',rock:'#3a3431'},kinds:['ice','penguins','ice','seal','ice','penguins']}
];
/* w: length in cells. diver: goes under water sometimes (safe while under). bonus: points, not a danger. */
const FROG_KINDS={log:{w:2.6},tree:{w:3.2},ducks:{w:1.8},beaver:{w:1},deer:{w:1},bighorn:{w:1},raft:{w:1.7},dory:{w:1.8},kayak:{w:1.5},
  croc:{w:2.2},hippo:{w:1.7,diver:true},sloth:{w:1,slow:.6},boat:{w:2.8},marigold:{w:.7,bonus:10},platypus:{w:.9,diver:true},ice:{w:2.2},penguins:{w:1.6},seal:{w:1.5,diver:true}};
const FROG={on:false,COLS:9,ROWS:13,SLOTS:[0,2,4,6,8],
  hi(){return store.get('riverrat_frog_hi',[]);},
  /* ---------- open / close ---------- */
  open(){if(this.on)return;this.on=true;AU.init();AU.resume();$('menu').style.display='none';const s=$('frog');s.style.display='block';this.cv=$('frogCv');this.ctx=this.cv.getContext('2d');
    this.state='intro';this.resize();this.bindInput();this.showIntro();this.last=performance.now();const tick=ts=>{if(!this.on)return;const dt=Math.min(.05,(ts-this.last)/1000);this.last=ts;try{this.update(dt);this.draw();}catch(e){console.error(e);}requestAnimationFrame(tick);};requestAnimationFrame(tick);},
  close(){this.on=false;$('frog').style.display='none';$('frogPanel').style.display='none';AU.roar(0);buildMenu();$('menu').style.display='block';},
  showIntro(){const hs=this.hi();this.panel(`<div class="pk">🐸 Frogger mode</div><h1>Rat Crossing</h1>
    <p>Hop your ${CRAFTS[sel.craft].name.toLowerCase()} <b>downstream</b> (up the screen), one lane at a time. Logs, animals and other boats float across the river. <b>Do not touch them.</b></p>
    <p>White arrows = fast current: it pushes you sideways. Rest on the sandbar. Park in an empty eddy at the take-out. Fill all 5 eddies to clear the level.</p>
    <div class="frogscore"><b>Scoring</b><span>+10 each new lane</span><span>+50 park in an eddy, + time bonus (10 per second left)</span><span>×1.5, ×2, ×2.5, ×3 combo for parks in a row with no crash</span><span>+200 bring a lost swimmer to the take-out</span><span>+200 park in the eddy with the golden trout</span><span>+50 dry bags · +10 flower garlands · +5 close calls</span><span>+1000 × level for clearing all 5 eddies</span><span>Extra boat every 10,000 points</span></div>
    <p class="mute">Keys: arrows or WASD. Phone: swipe, tap or use the arrow pad.</p>
    ${hs.length?`<div class="lb"><div class="lbh">🏆 Best Rat Crossing scores</div>${hs.slice(0,5).map((r,i)=>`<div class="lbr"><span>${['🥇','🥈','🥉','4.','5.'][i]} ${esc(r.name)}</span><span>Level ${r.level}</span><b>${r.score}</b></div>`).join('')}</div>`:''}`,
    [['▶ Start',()=>this.start()],['Back to menu',()=>this.close()]]);},
  panel(html,btns){const p=$('frogPanel');p.innerHTML=html+'<div class="cbtns"></div>';const bw=p.querySelector('.cbtns');btns.forEach(([t,fn],i)=>{const b=document.createElement('button');b.className=i===0?'big':'ghost';b.textContent=t;b.onclick=fn;bw.appendChild(b);});p.style.display='block';},
  /* ---------- game state ---------- */
  start(){$('frogPanel').style.display='none';const c=CRAFTS[sel.craft];
    this.g={score:0,lives:3,level:1,nextLife:10000,combo:0,filled:[false,false,false,false,false],trout:-1,troutT:6,t:0,msgs:[],parts:[],crashT:0,parks:0,swimsSaved:0,
      rad:{raft:.36,kayak:.24,dory:.36,tube:.3}[sel.craft]||.32,hopT:{raft:.17,kayak:.11,dory:.16,tube:.2}[sel.craft]||.15};
    this.buildLevel();this.spawnPlayer();this.state='play';AU.chime();},
  buildLevel(){const g=this.g,th=FROG_THEMES[(g.level-1)%FROG_THEMES.length],rng=mulberry32(hashStr('frog'+g.level+Date.now()));g.th=th;g.lanes=[];
    const sp=1+.12*(g.level-1);let k=0;const drift=new Set();while(drift.size<Math.min(4,1+Math.floor(g.level/2)))drift.add([1,2,3,4,5,7,8,9,10,11][Math.floor(rng()*10)]);
    for(let r=1;r<=11;r++){if(r===6){g.lanes[r]={safe:true};continue;}const kind=th.kinds[k++%th.kinds.length],K=FROG_KINDS[kind],dir=r%2?1:-1;
      const speed=(.8+rng()*1.3)*sp*(K.slow||1),n=K.w>2.5?2:K.w>1.6?3:4,loop=this.COLS+K.w+2+rng()*2,objs=[];
      for(let i=0;i<n;i++)objs.push({kind,w:K.w*(kind==='ice'?.7+rng()*.6:1),x:i*loop/n+rng()*.5,ph:rng()*6,sub:0,subT:2+rng()*3,near:false,id:rng()});
      g.lanes[r]={kind,dir,speed,loop,objs,drift:drift.has(r)?dir*-(.5+rng()*.5)*sp:0};}
    g.extras=[];g.time=Math.max(30,46-g.level*1.5);g.timeMax=g.time;
    this.msg(`Level ${g.level}: ${th.n}`,'#ffe25a',2.4);},
  spawnPlayer(){const g=this.g;g.p={x:4.5,r:0,tr:0,tx:4.5,hop:0,best:0,carry:false};g.time=g.timeMax;g.dead=0;
    if(Math.random()<.6)g.extras.push({type:'swimmer',lane:[2,4,8,10][Math.floor(Math.random()*4)],x:Math.random()*this.COLS});
    if(Math.random()<.7)g.extras.push({type:'bag',lane:[1,3,5,7,9,11][Math.floor(Math.random()*6)],x:Math.random()*this.COLS});},
  msg(t,col,dur){this.g.msgs.push({t,col:col||'#fff',life:dur||1.2,max:dur||1.2});},
  pop(t,x,y,col){this.g.parts.push({txt:t,x,y,col:col||'#fff',life:1,vy:-30});},
  add(p){const g=this.g;p=Math.round(p);g.score+=p;if(g.score>=g.nextLife){g.lives++;g.nextLife+=10000;this.msg('⛵ Extra boat!','#5fd38d',1.6);AU.chime();}return p;},
  /* ---------- input ---------- */
  bindInput(){if(this.bound)return;this.bound=true;
    addEventListener('keydown',e=>{if(!this.on)return;const k=e.key.toLowerCase();const m={arrowup:'u',w:'u',arrowdown:'d',s:'d',arrowleft:'l',a:'l',arrowright:'r',d:'r'}[k];
      if(m){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat||true)this.hop(m);}else if((k==='p'||k==='escape')&&!e.repeat){e.stopImmediatePropagation();this.togglePause();}
      else if((k===' '||k==='enter')&&$('frogPanel').style.display==='block'){e.preventDefault();e.stopImmediatePropagation();const b=$('frogPanel').querySelector('.cbtns button');if(b)b.click();}},true);
    const cv=$('frogCv');let sx=0,sy=0,st=0;
    cv.addEventListener('pointerdown',e=>{sx=e.clientX;sy=e.clientY;st=performance.now();});
    cv.addEventListener('pointerup',e=>{if(this.state!=='play')return;const dx=e.clientX-sx,dy=e.clientY-sy;
      if(Math.hypot(dx,dy)>22){if(Math.abs(dx)>Math.abs(dy))this.hop(dx>0?'r':'l');else this.hop(dy<0?'u':'d');return;}
      const g=this.g,[px,py]=this.cellXY(g.p.x,g.p.r),rx=e.clientX-px,ry=e.clientY-py;if(Math.abs(rx)>Math.abs(ry))this.hop(rx>0?'r':'l');else this.hop(ry<0?'u':'d');});
    document.querySelectorAll('#frogPad button').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();this.hop(b.dataset.h);});});
    $('frogPause').onclick=()=>this.togglePause();},
  togglePause(){if(this.state==='play'){this.state='pause';this.panel('<h1>Paused</h1>',[['▶ Resume',()=>{$('frogPanel').style.display='none';this.state='play';}],['Quit to menu',()=>this.close()]]);}else if(this.state==='pause'){$('frogPanel').style.display='none';this.state='play';}},
  hop(d){const g=this.g;if(this.state!=='play'||!g||g.dead>0)return;const p=g.p;if(p.hop>0){p.buf=d;return;}
    let nr=p.r,nx=p.x;if(d==='u')nr++;else if(d==='d')nr--;else if(d==='l')nx--;else nx++;
    if(nr<0||nr>this.ROWS-1)return;nx=clamp(nx,.5,this.COLS-.5);p.fr=p.r;p.fx=p.x;p.tr=nr;p.tx=nx;p.hop=g.hopT;AU.burst&&AU.burst(900,3,.05,.08);},
  /* ---------- update ---------- */
  update(dt){if(this.state!=='play')return;const g=this.g,p=g.p,C=this.COLS;g.t+=dt;
    for(const m of g.msgs)m.life-=dt;g.msgs=g.msgs.filter(m=>m.life>0);for(const q of g.parts){q.life-=dt;q.y+=q.vy*dt;}g.parts=g.parts.filter(q=>q.life>0);
    // lanes move
    for(let r=1;r<=11;r++){const L=g.lanes[r];if(L.safe)continue;for(const o of L.objs){o.x=(o.x+L.dir*L.speed*dt+L.loop*10)%L.loop;o.ph+=dt;
      if(FROG_KINDS[o.kind].diver){o.subT-=dt;if(o.subT<=0){o.sub=o.sub?0:1;o.subT=o.sub?1.6+Math.random()*1.4:2.5+Math.random()*2.5;}}}}
    for(const e of g.extras){const L=g.lanes[e.lane];if(L&&!L.safe)e.x=(e.x+L.dir*L.speed*.8*dt+C*20)%C;}
    // golden trout in an empty eddy
    g.troutT-=dt;if(g.troutT<=0){if(g.trout>=0){g.trout=-1;g.troutT=5+Math.random()*5;}else{const e=g.filled.map((f,i)=>f?-1:i).filter(i=>i>=0);if(e.length){g.trout=e[Math.floor(Math.random()*e.length)];g.troutT=4;}}}
    if(g.dead>0){g.dead-=dt;if(g.dead<=0){if(g.lives<=0)this.gameOver();else this.spawnPlayer();}return;}
    g.time-=dt;if(g.time<=0){this.crash('Out of time! The sun went down.');return;}
    // hop animation
    if(p.hop>0){p.hop-=dt;const u=1-Math.max(0,p.hop)/g.hopT;p.x=lerp(p.fx,p.tx,u);p.r=lerp(p.fr,p.tr,u);
      if(p.hop<=0){p.x=p.tx;p.r=p.tr;this.landed();if(p.buf&&this.state==='play'&&g.dead<=0){const b=p.buf;p.buf=null;this.hop(b);}}}
    else{const L=g.lanes[Math.round(p.r)];if(L&&L.drift){p.x+=L.drift*dt;if(p.x<.15||p.x>C-.15){this.crash('The current pushed you into the canyon wall!');return;}}}
    // collisions
    const rr=Math.round(p.r);if(p.hop<=0||Math.abs(p.r-rr)<.25){const L=g.lanes[rr];
      if(L&&!L.safe){for(const o of L.objs){const K=FROG_KINDS[o.kind];if(o.sub)continue;const ox=this.objX(o,L),dx=Math.abs(p.x-(ox+o.w/2))-o.w/2;
          if(K.bonus){if(dx<g.rad&&!o.got){o.got=1;const v=this.add(K.bonus);this.pop('+'+v,p.x,p.r,'#ffb347');AU.chime();setTimeout(()=>{o.got=0;},4000);}continue;}
          if(dx<g.rad*.9){this.crash(this.hitText(o.kind));return;}
          if(dx<g.rad+.22&&!o.near){o.near=true;const v=this.add(5);this.pop('close! +'+v,p.x,p.r,'#9fe3ff');}else if(dx>g.rad+.6)o.near=false;}}
      for(let i=g.extras.length-1;i>=0;i--){const e=g.extras[i];if(e.lane!==rr)continue;if(Math.abs(e.x-p.x)<g.rad+.35){g.extras.splice(i,1);
          if(e.type==='bag'){const v=this.add(50);this.pop('🎒 +'+v,p.x,p.r,'#ffb347');AU.chime();}else{p.carry=true;this.msg('🛟 Swimmer aboard! Bring them to the take-out.','#ffb347',1.8);AU.chime();}}}}},
  objX(o,L){return o.x-(o.w+1);},
  hitText(k){return {log:'You hit a log!',tree:'Tangled in a floating tree!',ducks:'You ran over the ducks! (They are fine. You are not.)',beaver:'A beaver slapped your boat!',deer:'A swimming deer kicked your boat!',bighorn:'A bighorn sheep head-butted your boat!',
    raft:'You crashed into another raft!',dory:'You crashed into a dory! The boatman is not happy.',kayak:'You ran over a kayaker!',croc:'A crocodile! Back to the start.',hippo:'A hippo flipped your boat!',sloth:'You hit a swimming sloth. (Yes, sloths swim.)',
    boat:'You hit a wooden boat!',platypus:'A platypus? You flipped dodging it.',ice:'You hit an ice floe!',penguins:'Penguin pile-up!',seal:'A seal surfaced under you!'}[k]||'Crash!';},
  landed(){const g=this.g,p=g.p,r=Math.round(p.r);
    if(r>p.best){const n=r-p.best;p.best=r;this.add(10*n);}
    if(r===this.ROWS-1){const si=this.SLOTS.findIndex(s=>Math.abs(p.x-(s+.5))<.55);
      if(si<0){this.crash('You hit the rocks at the take-out. Aim for an eddy!');return;}
      if(g.filled[si]){this.crash('That eddy is full. Pick an empty one!');return;}
      g.filled[si]=true;g.combo++;const mul=Math.min(3,1+.5*(g.combo-1));let pts=(50+Math.round(g.time)*10)*mul;let note=`Parked! +${Math.round(pts)}${mul>1?` (×${mul})`:''}`;
      if(p.carry){pts+=200;g.swimsSaved++;note+=' · swimmer saved +200';}if(g.trout===si){pts+=200;g.trout=-1;note+=' · golden trout +200';}
      this.add(pts);g.parks++;this.msg(note,'#5fd38d',2);AU.cheer?AU.cheer(.5):AU.chime();
      if(g.filled.every(Boolean)){const b=this.add(1000*g.level);this.msg(`LEVEL CLEAR! +${b}`,'#ffe25a',2.6);g.level++;g.filled=[false,false,false,false,false];g.trout=-1;this.buildLevel();}
      this.spawnPlayer();}},
  crash(why){const g=this.g;if(g.dead>0)return;g.lives--;g.combo=0;g.dead=1.4;g.crashT=1.4;g.crashWhy=why;this.msg(why,'#ff8a7a',1.6);AU.thunk(.6);AU.splash(.6);
    const [px,py]=this.cellXY(g.p.x,g.p.r);for(let i=0;i<22;i++)g.parts.push({x:g.p.x,y:g.p.r,dx:(Math.random()-.5)*3,dy:(Math.random()-.5)*3,life:.8,splash:1});},
  gameOver(){const g=this.g;this.state='over';const run={name:sel.name||'Boatman',score:g.score,level:g.level,date:new Date().toISOString().slice(0,10)};
    const hs=this.hi();hs.push(run);hs.sort((a,b)=>b.score-a.score);store.set('riverrat_frog_hi',hs.slice(0,20));const rank=hs.indexOf(run)+1;
    const bucks=Math.floor(g.score/400);if(bucks)addBucks(bucks);try{LB.add({id:Date.now()+'-f',name:run.name,river:'frogger',craft:sel.craft,mode:'frogger',level:'med',score:g.score,time:g.t,ok:true,swims:0,grade:'-',date:run.date});}catch(e){}
    this.panel(`<div class="pk">🐸 Rat Crossing</div><h1>Game over</h1><div class="grade">${g.score}</div>${rank&&rank<=5?`<div class="rank">🏆 #${rank} best score!</div>`:''}
      <div class="stats"><div><b>${g.level}</b>Level</div><div><b>${g.parks}</b>Eddies</div><div><b>${g.swimsSaved}</b>Swimmers saved</div><div><b>${fmtTime(g.t)}</b>Time</div></div><div class="rank">💰 +${bucks} River Bucks</div>`,
      [['▶ Play again',()=>this.start()],['Back to menu',()=>this.close()]]);},
  /* ---------- drawing ---------- */
  resize(){const d=Math.min(2,devicePixelRatio||1),W=innerWidth,H=innerHeight;this.cv.width=Math.round(W*d);this.cv.height=Math.round(H*d);this.W=W;this.H=H;this.d=d;
    const touch=matchMedia('(pointer:coarse)').matches,top=64,bot=touch?150:24;this.cell=Math.floor(Math.min((W-8)/this.COLS,(H-top-bot)/this.ROWS));this.bx=Math.round((W-this.cell*this.COLS)/2);this.by=Math.round(top+Math.max(0,(H-top-bot-this.cell*this.ROWS)/2));
    $('frogPad').style.display=touch?'grid':'none';},
  cellXY(x,r){return [this.bx+x*this.cell,this.by+(this.ROWS-1-r+.5)*this.cell];},
  draw(){if(innerWidth!==this.W||innerHeight!==this.H)this.resize();const c=this.ctx,W=this.W,H=this.H,cs=this.cell,bx=this.bx,by=this.by,BW=cs*this.COLS,BH=cs*this.ROWS,g=this.g,t=performance.now()/1000;
    c.setTransform(this.d,0,0,this.d,0,0);const th=g?g.th:FROG_THEMES[0],P=th.pal;
    // canyon walls
    c.fillStyle=P.wall2;c.fillRect(0,0,W,H);c.fillStyle=P.wall;for(let i=0;i<40;i++){const y=(i*53)%H,x=(i*97)%Math.max(1,bx);c.globalAlpha=.4;c.fillRect(x,y,30+(i%5)*12,8);c.fillRect(W-x-40,(y+30)%H,30+(i%4)*14,8);}c.globalAlpha=1;
    // water
    c.fillStyle=P.water;c.fillRect(bx,by,BW,BH);
    if(typeof TEX2!=='undefined'&&TEX2.ripple){try{const off=(t*40)%2048;TEX2.ripple.setTransform(new DOMMatrix().translate(0,-off).scale(.6,1.6));c.save();c.beginPath();c.rect(bx,by,BW,BH);c.clip();c.globalAlpha=.6;c.fillStyle=TEX2.ripple;c.fillRect(bx,by,BW,BH);c.restore();}catch(e){}}
    c.strokeStyle='rgba(255,255,255,.18)';c.lineWidth=1.5;for(let i=0;i<30;i++){const x=bx+((i*37.7)%BW),y=by+BH-((t*60+i*71)%BH);c.beginPath();c.moveTo(x,y);c.lineTo(x,y-14);c.stroke();}
    const rowY=r=>by+(this.ROWS-1-r)*cs;
    // put-in beach (row 0), sandbar (row 6), take-out (row 12)
    c.fillStyle=P.sand;c.fillRect(bx,rowY(0),BW,cs);c.fillRect(bx,rowY(6),BW,cs);c.fillStyle='rgba(0,0,0,.08)';for(let i=0;i<40;i++){c.fillRect(bx+(i*29)%BW,rowY(0)+(i*7)%cs,3,2);c.fillRect(bx+(i*31)%BW,rowY(6)+(i*11)%cs,3,2);}
    c.font=`600 ${Math.max(10,cs*.24)}px system-ui,sans-serif`;c.textAlign='center';c.fillStyle='rgba(60,40,20,.55)';c.fillText('PUT-IN',bx+BW/2,rowY(0)+cs*.62);c.fillText('SANDBAR · SAFE',bx+BW/2,rowY(6)+cs*.62);
    c.fillStyle=P.sand;c.fillRect(bx,rowY(12),BW,cs);
    for(let i=0;i<this.COLS;i++){const x=bx+i*cs;if(this.SLOTS.includes(i)){const si=this.SLOTS.indexOf(i);c.fillStyle=P.water;c.beginPath();c.ellipse(x+cs/2,rowY(12)+cs*.58,cs*.46,cs*.4,0,0,7);c.fill();
        c.strokeStyle='rgba(255,255,255,.35)';c.lineWidth=2;c.setLineDash([4,4]);c.stroke();c.setLineDash([]);
        if(g&&g.filled[si]){c.save();c.translate(x+cs/2,rowY(12)+cs*.55);c.scale(cs/100,cs/100);drawCraft(c,sel.craft,0,false,1);c.restore();}
        else if(g&&g.trout===si){const j=Math.sin(t*8)*cs*.08;c.fillStyle='#ffd84a';c.beginPath();c.ellipse(x+cs/2,rowY(12)+cs*.5+j,cs*.12,cs*.26,.3,0,7);c.fill();c.fillStyle='#fff';c.font=`${cs*.22}px system-ui`;c.fillText('✨',x+cs*.8,rowY(12)+cs*.3);}}
      else{for(let k=0;k<3;k++){const rx=x+cs*(.25+k*.25),ry=rowY(12)+cs*(.35+(k%2)*.3);const gr=c.createRadialGradient(rx-4,ry-4,2,rx,ry,cs*.24);gr.addColorStop(0,shade(P.rock,1.4));gr.addColorStop(1,shade(P.rock,.6));c.fillStyle=gr;c.beginPath();c.arc(rx,ry,cs*.22,0,7);c.fill();}}}
    c.fillStyle='rgba(20,60,30,.85)';c.font=`700 ${Math.max(10,cs*.2)}px system-ui,sans-serif`;c.fillText('🏁 TAKE-OUT',bx+BW/2,rowY(12)+cs*.2);
    if(!g){return;}
    // lanes
    for(let r=1;r<=11;r++){const L=g.lanes[r];if(L.safe)continue;const y=rowY(r);c.fillStyle=r%2?'rgba(0,0,0,.05)':'rgba(255,255,255,.03)';c.fillRect(bx,y,BW,cs);
      if(L.drift){c.strokeStyle='rgba(255,255,255,.55)';c.lineWidth=2;for(let i=0;i<6;i++){const x=bx+(((i/6)*BW+t*L.drift*cs)%BW+BW)%BW,d=Math.sign(L.drift);c.beginPath();c.moveTo(x-d*6,y+cs*.3);c.lineTo(x+d*4,y+cs*.5);c.lineTo(x-d*6,y+cs*.7);c.stroke();}}
      c.save();c.beginPath();c.rect(bx,y-cs*.3,BW,cs*1.6);c.clip();for(const o of L.objs){const ox=bx+this.objX(o,L)*cs;this.drawObj(c,o,ox,y,cs,L.dir,t);}c.restore();}
    for(const e of g.extras){const [x,y]=this.cellXY(e.x,e.lane);if(e.type==='bag'){c.fillStyle='#ff7a1a';c.fillRect(x-cs*.14,y-cs*.18,cs*.28,cs*.36);c.fillStyle='#222';c.fillRect(x-cs*.14,y-cs*.2,cs*.28,cs*.07);}
      else{c.strokeStyle='rgba(255,255,255,.6)';c.lineWidth=2;c.beginPath();c.arc(x,y,cs*.28+Math.sin(t*5)*2,0,7);c.stroke();c.fillStyle='#ff8c1a';c.beginPath();c.arc(x,y,cs*.16,0,7);c.fill();c.fillStyle='#f1c27d';c.beginPath();c.arc(x,y-cs*.06,cs*.09,0,7);c.fill();
        c.strokeStyle='#f1c27d';c.lineWidth=3;c.beginPath();c.moveTo(x+cs*.1,y-cs*.05);c.lineTo(x+cs*.22,y-cs*.28+Math.sin(t*9)*3);c.stroke();}}
    // player
    const p=g.p;if(g.dead<=0){const [x,y]=this.cellXY(p.x,p.r),u=p.hop>0?1-p.hop/g.hopT:0,s=cs/90*(1+Math.sin(u*Math.PI)*.25);c.fillStyle='rgba(0,0,0,.25)';c.beginPath();c.ellipse(x+3,y+4,cs*.32,cs*.4,0,0,7);c.fill();
      c.save();c.translate(x,y-Math.sin(u*Math.PI)*cs*.12);c.scale(s,s);drawCraft(c,sel.craft,p.hop>0?t*6:0,false,p.carry?2:1);c.restore();
      if(p.carry){c.font=`${cs*.3}px system-ui`;c.fillText('🛟',x+cs*.36,y-cs*.3);}}
    else{const [x,y]=this.cellXY(p.x,p.r);c.save();c.translate(x,y);c.scale(cs/90,cs/90);c.rotate(g.dead*4);drawCraft(c,sel.craft,0,true,1);c.restore();}
    for(const q of g.parts){if(q.splash){const [x,y]=this.cellXY(q.x+q.dx*(1-q.life),q.y+q.dy*(1-q.life));c.fillStyle=`rgba(255,255,255,${q.life})`;c.beginPath();c.arc(x,y,3,0,7);c.fill();continue;}
      const [x,y]=this.cellXY(q.x,q.y);c.globalAlpha=Math.min(1,q.life*1.5);c.font=`700 ${Math.max(12,cs*.26)}px system-ui,sans-serif`;c.textAlign='center';c.lineWidth=3;c.strokeStyle='rgba(0,0,0,.7)';c.strokeText(q.txt,x,y-cs*.4+(1-q.life)*-30);c.fillStyle=q.col;c.fillText(q.txt,x,y-cs*.4+(1-q.life)*-30);c.globalAlpha=1;}
    // HUD
    c.fillStyle='rgba(8,16,24,.85)';c.fillRect(0,0,W,by-6);c.textAlign='left';c.fillStyle='#fff';c.font=`700 ${Math.min(22,W/22)}px system-ui,sans-serif`;c.fillText(`${g.score}`,12,28);
    c.font=`600 ${Math.min(13,W/34)}px system-ui,sans-serif`;c.fillStyle='#9fbcbc';const hs=this.hi()[0];c.fillText(`Best ${Math.max(g.score,hs?hs.score:0)} · Level ${g.level} · ${g.th.n}`,12,48);
    c.textAlign='right';c.font=`${Math.min(20,W/24)}px system-ui`;c.fillText('⛵'.repeat(Math.max(0,Math.min(6,g.lives))),W-56,28);if(g.combo>1){c.fillStyle='#ffb347';c.font=`700 13px system-ui`;c.fillText(`combo ×${Math.min(3,1+.5*(g.combo-1))}`,W-56,48);}
    const tf=clamp(g.time/g.timeMax,0,1);c.fillStyle='#222';c.fillRect(bx,by-10,BW,6);c.fillStyle=tf>.4?'#5fd38d':tf>.2?'#ffb347':'#ff6b5b';c.fillRect(bx,by-10,BW*tf,6);
    if(g.msgs.length){const m=g.msgs[g.msgs.length-1];c.globalAlpha=Math.min(1,m.life*2);c.textAlign='center';c.font=`800 ${Math.min(22,W/20)}px system-ui,sans-serif`;c.lineWidth=4;c.strokeStyle='rgba(0,0,0,.75)';const my=by+BH*.46;c.strokeText(m.t,W/2,my);c.fillStyle=m.col;c.fillText(m.t,W/2,my);c.globalAlpha=1;}},
  drawObj(c,o,x,y,cs,dir,t){const w=o.w*cs,cy=y+cs/2,k=o.kind,wob=Math.sin(o.ph*2)*1.5;
    const wake=()=>{c.strokeStyle='rgba(255,255,255,.4)';c.lineWidth=1.5;const tx=dir>0?x:x+w;c.beginPath();c.moveTo(tx-dir*10,cy-cs*.3);c.lineTo(tx+dir*4,cy);c.lineTo(tx-dir*10,cy+cs*.3);c.stroke();};
    const shadow=()=>{c.fillStyle='rgba(0,0,0,.2)';c.beginPath();c.ellipse(x+w/2+3,cy+4,w/2,cs*.32,0,0,7);c.fill();};
    if(k==='log'||k==='tree'){shadow();const g2=c.createLinearGradient(0,cy-cs*.25,0,cy+cs*.25);g2.addColorStop(0,'#8a5a32');g2.addColorStop(.5,'#6b4426');g2.addColorStop(1,'#4a2e18');c.fillStyle=g2;rr(c,x,cy-cs*.24,w,cs*.48,cs*.22);c.fill();
      c.strokeStyle='rgba(30,15,5,.5)';c.lineWidth=1.5;for(let i=1;i<6;i++){c.beginPath();c.moveTo(x+w*i/6,cy-cs*.2);c.lineTo(x+w*i/6+6,cy+cs*.2);c.stroke();}c.fillStyle='#c8a070';c.beginPath();c.ellipse(x+cs*.12,cy,cs*.1,cs*.22,0,0,7);c.fill();
      if(k==='tree'){c.fillStyle='rgba(60,110,40,.95)';for(let i=0;i<7;i++){c.beginPath();c.arc(x+w*(.62+(i%3)*.13),cy+(i-3)*cs*.12,cs*.2,0,7);c.fill();}c.strokeStyle='#4a2e18';c.lineWidth=2;for(let i=0;i<4;i++){c.beginPath();c.moveTo(x+w*.5,cy);c.lineTo(x+w*(.6+i*.08),cy+(i%2?1:-1)*cs*.42);c.stroke();}}
      wake();return;}
    if(k==='ice'){c.fillStyle='rgba(0,30,50,.2)';c.beginPath();c.ellipse(x+w/2+3,cy+4,w/2,cs*.36,0,0,7);c.fill();c.fillStyle='#f2f8ff';c.beginPath();for(let i=0;i<10;i++){const a=i/10*6.283,r=.5+.12*Math.sin(o.id*40+i*2.1);c.lineTo(x+w/2+Math.cos(a)*w*.5*r*2*.9,cy+Math.sin(a)*cs*.38*r*2*.9);}c.closePath();c.fill();c.fillStyle='rgba(160,200,230,.6)';c.beginPath();c.ellipse(x+w*.6,cy+cs*.1,w*.2,cs*.1,0,0,7);c.fill();return;}
    if(k==='raft'||k==='dory'||k==='kayak'||k==='boat'){shadow();if(k==='boat'){c.fillStyle='#7a4a24';rr(c,x,cy-cs*.24,w,cs*.48,cs*.24);c.fill();c.fillStyle='#a8743c';rr(c,x+4,cy-cs*.16,w-8,cs*.32,cs*.16);c.fill();for(let i=0;i<4;i++){c.fillStyle=['#e74c3c','#f1c40f','#e67e22','#ecf0f1'][i];c.beginPath();c.arc(x+w*(.2+i*.2),cy,cs*.1,0,7);c.fill();}wake();return;}
      c.save();c.translate(x+w/2,cy);c.rotate(dir>0?Math.PI/2:-Math.PI/2);const s=cs/(k==='kayak'?80:95);c.scale(s,s);drawCraft(c,k,t*5+o.ph,false,k==='kayak'?1:3,null,k==='raft'?['#e67e22','#2e86c1','#8e44ad','#c0392b'][Math.floor(o.id*4)]:null);c.restore();wake();return;}
    if(k==='hippo'||k==='seal'||k==='platypus'){if(o.sub){c.fillStyle='rgba(255,255,255,.4)';for(let i=0;i<4;i++){c.beginPath();c.arc(x+w*(.3+i*.15),cy+Math.sin(t*3+i)*4,2.5,0,7);c.fill();}return;}
      shadow();const col=k==='hippo'?'#6b5a5c':k==='seal'?'#5a6068':'#5a3e2a';c.fillStyle=col;c.beginPath();c.ellipse(x+w/2,cy,w/2,cs*.33,0,0,7);c.fill();const hx=dir>0?x+w*.88:x+w*.12;c.beginPath();c.ellipse(hx,cy,cs*.2,cs*.24,0,0,7);c.fill();
      c.fillStyle='#111';c.beginPath();c.arc(hx,cy-cs*.1,2.5,0,7);c.arc(hx,cy+cs*.1,2.5,0,7);c.fill();if(k==='hippo'){c.fillStyle='#d8a0a0';c.beginPath();c.arc(hx+dir*cs*.14,cy-cs*.06,2.5,0,7);c.arc(hx+dir*cs*.14,cy+cs*.06,2.5,0,7);c.fill();}
      if(k==='platypus'){c.fillStyle='#2a2a2a';c.beginPath();c.ellipse(hx+dir*cs*.18,cy,cs*.1,cs*.1,0,0,7);c.fill();}wake();return;}
    if(k==='croc'){shadow();c.fillStyle='#4e5a36';c.beginPath();const hx=dir>0?x+w:x,tx=dir>0?x:x+w;c.moveTo(hx,cy);c.quadraticCurveTo(x+w/2,cy-cs*.34,tx,cy);c.quadraticCurveTo(x+w/2,cy+cs*.34,hx,cy);c.fill();
      c.fillStyle='#2e3622';for(let i=1;i<8;i++)c.fillRect(x+w*i/8-1.5,cy-1.5,3,3);for(const s of[-1,1])for(const f of[.3,.65]){c.fillStyle='#4e5a36';c.beginPath();c.ellipse(x+w*f,cy+s*cs*.24,cs*.08,cs*.05,0,0,7);c.fill();}
      c.fillStyle='#d8c860';c.beginPath();c.arc(hx-dir*cs*.24,cy-cs*.08,2.2,0,7);c.arc(hx-dir*cs*.24,cy+cs*.08,2.2,0,7);c.fill();wake();return;}
    if(k==='ducks'||k==='penguins'){for(let i=0;i<4;i++){const s=i?.6:1,dx=dir>0?x+w-(i?.3+i*.35:0)*cs:x+(i?.3+i*.35:0)*cs;c.fillStyle=k==='ducks'?(i?'#c8a868':'#6b5a4a'):'#1b1b22';c.beginPath();c.ellipse(dx,cy+wob*(i%2?1:-1),cs*.18*s,cs*.12*s,0,0,7);c.fill();
        c.fillStyle=k==='ducks'?(i?'#a88848':'#2e7d4f'):'#f4f4f4';c.beginPath();c.arc(dx+dir*cs*.12*s,cy,cs*.07*s,0,7);c.fill();c.fillStyle='#e0a030';c.fillRect(dx+dir*cs*.18*s-2,cy-1,4,2);}wake();return;}
    if(k==='marigold'){if(o.got)return;c.strokeStyle='#ff9a1a';c.lineWidth=cs*.08;c.beginPath();c.arc(x+w/2,cy,cs*.2,0,7);c.stroke();c.fillStyle='#ffcf3a';for(let i=0;i<8;i++){const a=i/8*6.283+o.ph*.5;c.beginPath();c.arc(x+w/2+Math.cos(a)*cs*.2,cy+Math.sin(a)*cs*.2,cs*.05,0,7);c.fill();}c.fillStyle='#fff6';c.beginPath();c.arc(x+w/2,cy,3,0,7);c.fill();return;}
    // swimming land animals and beavers
    shadow();const col={beaver:'#5a3a22',deer:'#8a5a32',bighorn:'#9a7a52',sloth:'#7a6a52'}[k]||'#666';c.fillStyle=col;c.beginPath();c.ellipse(x+w/2,cy,w*.45,cs*.22,0,0,7);c.fill();const hx=dir>0?x+w*.9:x+w*.1;c.beginPath();c.arc(hx,cy,cs*.14,0,7);c.fill();
    if(k==='deer'){c.strokeStyle='#d8c8a8';c.lineWidth=2;for(const s of[-1,1]){c.beginPath();c.moveTo(hx,cy+s*cs*.06);c.lineTo(hx-dir*cs*.12,cy+s*cs*.3);c.lineTo(hx-dir*cs*.04,cy+s*cs*.34);c.stroke();}}
    if(k==='bighorn'){c.strokeStyle='#e0d2b0';c.lineWidth=3;for(const s of[-1,1]){c.beginPath();c.arc(hx-dir*cs*.05,cy+s*cs*.12,cs*.09,0,5);c.stroke();}}
    if(k==='beaver'){c.fillStyle='#3a2414';c.beginPath();c.ellipse(dir>0?x+w*.05:x+w*.95,cy,cs*.16,cs*.1,0,0,7);c.fill();}
    if(k==='sloth'){c.fillStyle='#d8c8a8';c.beginPath();c.arc(hx,cy,cs*.08,0,7);c.fill();}
    wake();}
};
