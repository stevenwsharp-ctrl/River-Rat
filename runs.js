'use strict';
/* =====================================================================
   RIVER RAT — RUNS (the core game)
   Short runs of 2 to 7 real rapids, about 1 to 2 minutes each, in order
   from easy to hard. Finish a run to unlock the next one. Earn up to
   3 stars:  ★ finish  ★★ finish with no swims and the hull at 50% or more
             ★★★ finish with every rapid clean and no swims
   ===================================================================== */
const RUN_LIST=[
  {base:'gray',a:75.2,b:83.9,n:'First Splash',tip:'Drag or tap where you want to go. Hit the waves straight.'},
  {base:'ruby',a:15.4,b:17.6,n:'Black Rocks',tip:'Wave to the cliff jumpers. Stay off the black rocks.'},
  {base:'soca',a:0,b:6.5,n:'Emerald Run',tip:'Cold water! Rescue swimmers fast.'},
  {base:'pacuare',a:5.5,b:8.0,n:'Huacas Canyon',tip:'Go around the big boulder in Upper Huacas.'},
  {base:'ganges',a:7.0,b:12.2,n:'Roller Coaster',tip:'Golf Course has a big hole at the bottom. Go right.'},
  {base:'sunkosi',a:59,b:63,n:'The Anxieties',tip:'Three rapids close together. Keep moving.'},
  {base:'westwater',a:4.3,b:6.4,n:'Into the Black Rock',tip:'Funnel Falls: run the smooth tongue on the right.'},
  {base:'westwater',a:6.4,b:8.7,n:'Skull & the Room of Doom',tip:'Big hole in Skull. Stay right of the Room of Doom.'},
  {base:'gc-upper',a:20.3,b:25.6,n:'The Roaring Twenties',tip:'Six rapids in a row. Use boost on the big holes.'},
  {base:'kaituna',a:0,b:1.6,n:'Tutea Falls',tip:'A 7 m waterfall. Paddle hard and land straight!'},
  {base:'gc-upper',a:75.5,b:79.5,n:'Hance & Sockdolager',tip:'Hance is a rock garden. Read the water early.'},
  {base:'futa',a:0,b:4.9,n:'Terminator',tip:'Miss the Typewriter hole at the bottom of Terminator.'},
  {base:'cataract',a:12.6,b:16.2,n:'The Big Drops',tip:'Big Drop 3 has a huge hole on the bottom right.'},
  {base:'zambezi',a:1.0,b:3.8,n:'Stairway to Heaven',tip:'Warm water, big waves. Hit the top of Stairway straight.'},
  {base:'gauley',a:3.4,b:8.9,n:'Gauley Fest',tip:'The crowd is watching. Stay left at Pillow Rock.'},
  {base:'gc-lower',a:97.0,b:99.8,n:'Crystal',tip:'Crystal hole is enormous. Start right and stay right.'},
  {base:'gc-lower',a:178.6,b:180.6,n:'Lava Falls',tip:'The biggest rapid in the canyon. Right side, straight, and pray.'}
];
const RUNS={cur:null,
  rec(){return store.get('riverrat_runs',{});},
  stars(i){const r=this.rec()['run-'+(i+1)];return r?r.stars:0;},
  best(i){const r=this.rec()['run-'+(i+1)];return r?r.best:0;},
  unlocked(i){return i===0||this.stars(i-1)>0;},
  next(){for(let i=0;i<RUN_LIST.length;i++)if(!this.stars(i))return i;return RUN_LIST.length-1;},
  total(){return RUN_LIST.reduce((s,_,i)=>s+this.stars(i),0);},
  build(i){const S=RUN_LIST[i],B=RIVERS.find(r=>r.id===S.base),inW=m=>m>=S.a&&m<=S.b;
    const R=Object.assign({},B,{id:'run-'+(i+1),runIdx:i,quick:true,baseName:B.name,name:`Run ${i+1}: ${S.n}`,stretch:`${B.name} · mile ${S.a}–${S.b}`,start:S.a,end:S.b,dayOnly:true,expOnly:false,
      rapids:B.rapids.filter(r=>inW(r.m)),pois:(B.pois||[]).filter(p=>inW(p.m)&&!p.page).map(p=>Object.assign({},p,{stop:undefined})),camps:[],takeout:null,
      bridges:(B.bridges||[]).filter(x=>inW(x.m)),towns:(B.towns||[]).filter(x=>inW(x.m)),crowds:(B.crowds||[]).filter(x=>inW(x.m)),marks:(B.marks||[]).filter(x=>inW(x.m))});
    return R;},
  start(i){if(!this.unlocked(i))return;AU.init();const R=this.build(i);this.cur=R;sel.river=R.id;sel.mode='day';startGame();if(!G)return;
    G.cd=2.6;G.cdShown=4;$('fact').style.display='none';const S=RUN_LIST[i];setTimeout(()=>{if(G&&G.river===R)toast(`${R.name}`,'#ffe25a',1.2);},50);
    if(sel.tips)setTimeout(()=>{if(G&&G.river===R&&G.state==='run'){const el=$('coach');el.innerHTML='💡 '+esc(S.tip);el.style.display='block';clearTimeout(el._t);el._t=setTimeout(()=>el.style.display='none',3500);}},2800);},
  restoreRiver(){if(/^run-/.test(sel.river))sel.river=RUN_LIST[+sel.river.slice(4)-1].base;},
  /* countdown before the start: called from update() */
  countdown(dt){G.cd-=dt;const n=Math.ceil(G.cd/.75);if(n!==G.cdShown){G.cdShown=n;if(n>0){toast(n>3?'':String(n),'#ffffff',.6);AU.burst&&AU.burst(700,4,.12,.12);}else{toast('GO!','#5fd38d',.8);AU.chime();}}
    if(G.cd<=0){G.cd=0;}},
  finishLineY(){return G.W.len-460;},
  check(){if(!G||!G.river.quick||G.state!=='run')return;if(G.b.y>this.finishLineY()){G.score+=200;AU.cheer?AU.cheer(.8):AU.chime();endGame(true);}},
  draw2D(c,t){if(!G||!G.river.quick)return;const W=G.W,y=this.finishLineY(),hw=W.hw(y),cx=W.cx(y),n=16,w=hw*2/n;
    for(let i=0;i<n;i++)for(let j=0;j<2;j++){c.fillStyle=(i+j)%2?'#111':'#f4f4f4';c.fillRect(cx-hw+i*w,y+j*w*.6,w,w*.6);}
    for(const s of[-1,1]){const px=cx+s*(hw+14);c.fillStyle='#6b4a2c';c.fillRect(px-3,y-6,6,60);c.fillStyle=s<0?'#e74c3c':'#5fd38d';c.beginPath();c.moveTo(px,y+54);c.lineTo(px+s*-26+(s>0?0:0),y+46);c.lineTo(px,y+38);c.fill();}},
  label2D(S,label){if(!G||!G.river.quick)return;const y=this.finishLineY();if(y<G.view.y0||y>G.view.y1)return;const [x,yy]=S(G.W.cx(y),y);label('🏁 FINISH',x,yy-30,'#ffffff','rgba(20,90,50,.9)');},
  /* results at the end of a run */
  result(ok){const R=G.river,i=R.runIdx,total=G.W.rapids.length,clean=G.clean>=total&&total>0;let st=0;
    if(ok){st=1;if(G.swims===0&&G.hp>=G.hpMax*.5)st=2;if(st===2&&clean)st=3;}
    const rec=this.rec(),k=R.id,old=rec[k]||{stars:0,best:0},sc=Math.round(G.score),nb=sc>old.best;rec[k]={stars:Math.max(old.stars,st),best:Math.max(old.best,sc)};store.set('riverrat_runs',rec);
    return {st,sc,nb,first:old.stars===0&&st>0,i};},
  endHtml(ok,reason,earned){const r=this.result(ok),R=G.river,nx=r.i+1<RUN_LIST.length?r.i+1:-1,total=G.W.rapids.length;
    const star=k=>`<span class="rstar ${k<=r.st?'on':''}">★</span>`;
    return `<div class="runend"><div class="pk">${esc(R.baseName)}</div><h1>${esc(R.name)}</h1>
      <div class="rstars">${star(1)}${star(2)}${star(3)}</div>
      <div class="sub">${ok?(r.st===3?'Perfect run!':r.st===2?'Clean and dry. Can you run every rapid clean?':'You made it! Now try it with no swims.'):esc(reason)}</div>
      <div class="stats"><div><b>${r.sc.toLocaleString()}</b>${r.nb?'New best!':'Score'}</div><div><b>${G.clean}/${total}</b>Clean rapids</div><div><b>${G.swims}</b>Swims</div><div><b>${fmtTime(G.t)}</b>Time</div></div>
      ${r.first&&nx>0?`<div class="rank">🔓 Unlocked: Run ${nx+1}, ${esc(RUN_LIST[nx].n)}</div>`:''}<div class="rank">💰 +${earned} River Bucks</div>
      <div class="runbtns">${nx>0&&this.unlocked(nx)?`<button class="big" id="runNext">▶ Next: ${esc(RUN_LIST[nx].n)}</button>`:''}<button class="${nx>0&&this.unlocked(nx)?'ghost':'big'}" id="runRetry">↻ Try again</button>
      <button class="ghost" id="runShare">📤 Share</button><button class="ghost" id="runAll">🗺 All runs</button><button class="ghost" id="runHome">🏠 Home</button></div></div>`;},
  bindEnd(){const i=G.river.runIdx;const on=(id,f)=>{const b=$(id);if(b)b.onclick=f;};
    on('runNext',()=>{$('end').style.display='none';this.start(i+1);});on('runRetry',()=>{$('end').style.display='none';this.start(i);});
    on('runAll',()=>{toMenu();this.showList();});on('runHome',()=>toMenu());
    on('runShare',()=>{const R=G.river;SHARE.text(`🛶 River Rat · ${R.name}\n${'★'.repeat(this.stars(i))}${'☆'.repeat(3-this.stars(i))} · ${Math.round(G.score).toLocaleString()} pts\n${R.baseName}\n${GAME_URL}`,$('runShare'));});},
  /* the list of all runs */
  showList(){const el=$('runsWrap');const tot=this.total();
    el.innerHTML=`<h1>Runs</h1><div class="sub">${tot} of ${RUN_LIST.length*3} stars · finish a run to unlock the next</div><div class="rungrid">${RUN_LIST.map((S,i)=>{const B=RIVERS.find(r=>r.id===S.base),R=this.build(i),lock=!this.unlocked(i),st=this.stars(i);
      const hi=R.rapids.reduce((a,r)=>sev(R,r.c)>sev(R,a.c)?r:a,R.rapids[0]);
      return `<button class="runtile ${lock?'lock':''} ${i===this.next()?'nexttile':''}" data-i="${i}" ${lock?'disabled':''}><span class="rn">${i+1}</span><b>${esc(S.n)}</b><small>${esc(B.name)}</small><small class="cls">${R.rapids.length} rapids · ${hi?clsText(R,hi.c):''}</small><span class="rs">${lock?'🔒':'★'.repeat(st)+'☆'.repeat(3-st)}</span>${this.best(i)?`<small>Best ${this.best(i).toLocaleString()}</small>`:''}</button>`;}).join('')}</div>
      <button class="ghost" id="runsBack">← Home</button>`;
    el.querySelectorAll('.runtile').forEach(b=>b.onclick=()=>{$('runsScreen').style.display='none';this.start(+b.dataset.i);});
    $('runsBack').onclick=()=>{$('runsScreen').style.display='none';showHome();};
    for(const id of ['home','menu'])$(id).style.display='none';$('runsScreen').style.display='block';}
};
