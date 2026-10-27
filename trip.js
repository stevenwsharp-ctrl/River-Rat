'use strict';
/* =====================================================================
   RIVER RUN — TRIP MODES (Overnight + Expedition)
   ===================================================================== */

/* ---------- SUPPLIES (placeholder list) ----------
   Replace or edit this list. Each item: id, name, price (dollars), desc,
   optional unit and "rec" (recommended amount for crew size n and days d). */
const SUPPLIES=[
  {id:'food',name:'🍲 Food',vital:'food',unit:'person-days',price:12,desc:'One day of meals for one person.',rec:(n,d)=>n*d+n},
  {id:'water',name:'💧 Drinking water',vital:'water',unit:'5-gal jugs',price:6,desc:'About one jug for three people per day. A filter can replace it.',rec:(n,d)=>Math.ceil(n/3)*d},
  {id:'filter',name:'💧 Water filter',vital:'water',price:60,desc:'Makes river water safe. Stops most sickness.',rec:()=>1},
  {id:'firstaid',name:'🩹 First aid kit',vital:'firstaid',price:45,desc:'Heals an injured or sick crew member (+30 health).',rec:()=>2},
  {id:'repair',name:'🛟 Raft repair kit',vital:'raft',price:70,desc:'Fixes hull damage (+45%). Can save the trip.',rec:()=>1},
  {id:'spareoar',name:'🛶 Spare paddles & oars',vital:'paddles',price:90,desc:'Replaces a lost paddle or oar.',rec:()=>1},
  {id:'rope',name:'Rope & straps',price:30,desc:'Tie gear down. Fewer items lost in flips.',rec:()=>1},
  {id:'warm',name:'Warm layers / wetsuit',unit:'per person',price:40,desc:'Stops hypothermia after swims in cold water.',rec:n=>n},
  {id:'sunscreen',name:'Sunscreen & hats',price:15,desc:'Stops sunburn.',rec:()=>1},
  {id:'groover',name:'🚽 Groover (river toilet)',vital:'groover',unit:'cans',price:50,desc:'Required on most river permits. Rangers check. One can holds about 8 person-days.',rec:(n,d)=>Math.max(1,Math.ceil(n*d/8))},
  {id:'fuel',name:'Stove fuel',unit:'days',price:10,desc:'Hot meals keep morale up.',rec:(n,d)=>d}
];
const CREW_NAMES=['Maya','Jules','Ravi','Tess','Owen','Lena','Diego','Nora','Cal','Ivy'];
const ROLES=['Trip Leader','Boatman','Cook','Swamper','Photographer','Geologist','Naturalist','Medic'];
const OVERNIGHT_GEAR=['the cooler','a dry bag of sleeping bags','the camp chairs','the kitchen box','your sunglasses','the tent bag','the water jug','the guidebook'];
const COLD_RIVERS=['gc-upper','gc-lower','gc-bottom','gc-full'];
const isCold=R=>(R.waterF||60)<56||COLD_RIVERS.includes(R.id);
const FLEET_NAMES=['Gear boat','Paddle raft','Cook boat'],FLEET_COLS=['#e67e22','#2e86c1','#8e44ad'];

const TRIP={
  pending:null,
  t(){return G&&G.trip;},
  /* ---------- setup ---------- */
  setup(G){
    const R=G.river,W=G.W,mode=G.mode;
    const tr={mode,day:1,days:1,opts:[],landed:null,morale:70,log:[],quarrels:0,evac:[],swamDay:[],flood:false,camp:null,lostToday:[]};
    G.trip=tr;
    if(mode==='day')return;
    tr.days=mode==='overnight'?clamp(Math.round((R.end-R.start)/40)+1,2,3):Math.max(2,R.days||3);
    const seg=W.len/tr.days,rng=mulberry32(hashStr(R.id+mode+Date.now()));
    for(let d=1;d<tr.days;d++){
      const target=seg*d;
      let opts=W.camps.filter(c=>Math.abs(c.y-target)<seg*.32).sort((a,b)=>Math.abs(a.y-target)-Math.abs(b.y-target)).slice(0,3);
      if(!opts.length)opts=[this.makeCamp(W,target)];
      opts.sort((a,b)=>a.y-b.y);
      opts.forEach(c=>{c.taken=mode==='expedition'&&rng()<.33;c.rejected=false;});
      if(opts.every(c=>c.taken))opts[opts.length-1].taken=false;
      tr.opts.push(opts);
    }
    if(mode==='expedition'){
      const cfg=this.pending||this.defaultCfg(R);this.pending=null;
      tr.crew=cfg.crew.map((n,i)=>({name:n,role:ROLES[i]||'Crew',hp:100,st:[],gone:false}));
      tr.sup=Object.assign({},cfg.sup);tr.sup0=Object.assign({},cfg.sup);tr.gUsed=0;
      tr.repairsUsed=0;
      const nb=Math.max(1,cfg.boats||1),per=Math.ceil(tr.crew.length/nb);
      tr.fleet=[];for(let i=1;i<nb;i++)tr.fleet.push({name:FLEET_NAMES[i-1],craft:i%2?'raft':'dory',col:FLEET_COLS[i-1],crew:tr.crew.slice(i*per,(i+1)*per).map(c=>c.name),ran:{},flip:0,h:0});
      if(this.pendingRestore){this.restore(this.pendingRestore);this.pendingRestore=null;}
    }
  },
  makeCamp(W,yt){
    let y=yt;for(let k=0;k<20;k++){if(!W.rapids.some(r=>y>r.y0-500&&y<r.y1+350))break;y+=300;}
    const m=W.mileAt(y),c={n:`Mile ${m.toFixed(0)} Camp`,m,side:Math.random()<.5?-1:1,y,gen:true};W.camps.push(c);return c;
  },
  remapCamps(old,W){const tr=this.t();if(!tr||!tr.opts)return;
    for(const opts of tr.opts)for(const c of opts){const y=W.yAtMile(c.m);if(y!==null)c.y=y;if(c.gen)W.camps.push(c);else{const nc=W.camps.find(x=>x.n===c.n);if(nc)Object.assign(nc,{taken:c.taken});}}},
  defaultCfg(R){const n=4,d=Math.max(2,R.days||3),sup={};SUPPLIES.forEach(s=>sup[s.id]=s.rec(n,d));return {crew:[sel.name||'Boatman',...CREW_NAMES.slice(0,n-1)],sup,boats:R.id==='gc-full'?2:1};},
  day(){const tr=this.t();return tr?tr.day:1;},
  alive(){const tr=this.t();return tr&&tr.crew?tr.crew.filter(c=>!c.gone):[];},
  /* ---------- effects on the river ---------- */
  powerMul(){const tr=this.t();if(!tr||!tr.crew)return 1;const a=this.alive();if(!a.length)return .5;
    const lead=tr.crew[0],avg=a.reduce((s,c)=>s+c.hp,0)/a.length;return clamp(.55+.45*(lead.gone?.5:lead.hp/100)*.6+.45*avg/100*.4,.55,1);},
  dmgMul(){return 1;},
  canRepairOnRiver(){const tr=this.t();if(!tr||!tr.sup||tr.sup.repair<=0)return false;tr.sup.repair--;tr.repairsUsed++;return true;},
  maxSwims(){const tr=this.t();return tr&&tr.mode==='expedition'?4:3;},
  swimEndText(){const tr=this.t();return tr&&tr.mode==='expedition'?'Too many swims. The crew votes to hike out.':'Three swims. The trip leader calls it.';},
  pickSwimmer(){const tr=this.t();if(!tr||!tr.crew)return null;const a=this.alive().slice(1);if(!a.length)return null;return a[Math.floor(Math.random()*a.length)].name;},
  swimmerHurt(name,loss){const tr=this.t();if(!tr||!tr.crew)return;const c=tr.crew.find(x=>x.name===name&&!x.gone);if(!c)return;c.hp=Math.max(1,c.hp-loss);if(!tr.swamDay.includes(name))tr.swamDay.push(name);},
  onFlip(cause){
    const tr=this.t();if(!tr||tr.mode==='day')return;
    if(tr.mode==='overnight'){if(Math.random()<.5){const left=OVERNIGHT_GEAR.filter(g=>!G.lost.includes(g));if(left.length){const g=left[Math.floor(Math.random()*left.length)];G.lost.push(g);tr.lostToday.push(g);setTimeout(()=>G&&toast(`Lost ${g}!`,'#ff8a7a',1.6),1300);}}return;}
    // expedition
    const s=tr.sup,losable=['food','water','firstaid','fuel','sunscreen','warm','filter'].filter(k=>s[k]>0);
    const tries=s.rope>0?1:2,lost=[];
    for(let i=0;i<tries;i++){if(!losable.length||Math.random()<.35)continue;const k=losable[Math.floor(Math.random()*losable.length)];const amt=k==='food'?Math.min(s[k],2+Math.floor(Math.random()*4)):1;s[k]-=amt;lost.push(`${amt} ${SUPPLIES.find(x=>x.id===k).name.toLowerCase()}`);}
    if(G.craft.pd===undefined||G.ck==='dory'){if(Math.random()<.3){if(s.spareoar>0){s.spareoar--;lost.push('an oar (spare oar in)');}else{G.oarLost=true;lost.push('an oar — no spare! Rowing at 60%');}}}
    for(const c of this.alive()){if(Math.random()<.5){const d=8+Math.floor(Math.random()*13);c.hp=Math.max(1,c.hp-d);if(!tr.swamDay.includes(c.name))tr.swamDay.push(c.name);}}
    tr.morale=Math.max(0,tr.morale-5);
    if(lost.length){tr.lostToday.push(...lost);setTimeout(()=>G&&toast('Lost: '+lost.join(', '),'#ff8a7a',2.2),1300);}
  },
  /* ---------- camp approach + landing ---------- */
  todays(){const tr=this.t();if(!tr||tr.mode==='day'||tr.day>=tr.days)return null;return tr.opts[tr.day-1];},
  landing(){const o=this.todays();if(!o)return false;const y=G.b.y;return o.some(c=>Math.abs(c.y-y)<260);},
  landingZone(){const W=G.W,y=G.b.y;return W.camps.some(c=>Math.abs(c.y-y)<170&&(G.b.x-W.cx(y))*c.side>0);},
  hudText(){const o=this.todays();if(!o)return '';const b=G.b,W=G.W,nx=o.find(c=>!c.rejected&&c.y>b.y-150);if(!nx)return '';
    const mi=Math.max(0,nx.m-W.mileAt(b.y));if(mi>3)return '';return `⛺ Camp: ${nx.n} ${mi<.15?'— LAND NOW':`in ${mi.toFixed(1)} mi`} (river ${nx.side<0?'left':'right'})`;},
  update(dt){
    const tr=this.t();if(tr&&tr.fleet&&G.state==='run')this.updFleet(dt);if(!tr||tr.mode==='day'||G.state!=='run')return;
    const o=this.todays();if(!o)return;
    const b=G.b,W=G.W,c=G.craft;
    for(const cp of o){if(cp.rejected)continue;const dy=b.y-cp.y;if(dy<-240||dy>190)continue;
      const shore=W.hw(b.y)-(b.x-W.cx(b.y))*cp.side;
      if(landNear(cp)){this.land(cp);return;}}
    if(!tr.warned&&o.length&&b.y>o[0].y-1600){tr.warned=true;coach('camp');toast(`⛺ Camp tonight! Pull into an eddy on the ${o[0].side<0?'left':'right'} and touch the beach.`,'#5fd38d',2.6);}
    const lastOpt=o[o.length-1];
    if(b.y>lastOpt.y+320)this.land({n:'A rocky ledge (no real camp)',m:W.mileAt(b.y),side:1,y:b.y,bad:true});
  },
  land(cp){
    const tr=this.t();
    G.b.vx=0;G.b.vy=0;
    if(cp.taken&&!cp.shared){this.quarrel(cp);return;}
    tr.camp=cp;tr.warned=false;G.state='camp';
    if(G.mode3d)exit3D();
    hideBanner();hideFact();AU.roar(.03);
    this.night(cp);
  },
  /* ---------- quarrel over a camp (expedition) ---------- */
  quarrel(cp){
    const tr=this.t();G.state='camp';if(G.mode3d)exit3D();hideBanner();
    tr.quarrels++;this.openCampUI({title:`${cp.n} is taken`,sub:'Another group is already here. Their trip leader walks down to the beach.',
      body:'<p>You need a camp before dark. What do you do?</p>',scene:{cp,other:true},
      buttons:[
        ['Ask to share the beach',()=>{const p=.55+(tr.morale-50)/200;if(Math.random()<p){tr.morale+=3;cp.shared=true;this.msg('They make room. Coffee in the morning is on them.');this.land(cp);}else{tr.morale-=6;cp.rejected=true;this.msg('They say no. You push off to find another camp.');this.relaunch(cp);}}],
        ['Move on downstream',()=>{tr.morale-=4;cp.rejected=true;this.relaunch(cp);}],
        ['Claim it: "Our permit says this camp!"',()=>{if(Math.random()<.4){cp.shared=true;tr.morale+=1;G.score=Math.max(0,G.score-100);this.msg('They grumble and move to the far end of the beach. (Bad karma: −100)');this.land(cp);}
          else{tr.morale-=15;const a=TRIP.alive();const v=a[Math.floor(Math.random()*a.length)];v.hp=Math.max(1,v.hp-5);v.st.push('upset');cp.shared=true;this.msg(`A shouting match. Nobody sleeps well. ${v.name} is upset.`);this.land(cp);}}]
      ]});
  },
  msg(t){const tr=this.t();tr.pendingMsg=(tr.pendingMsg?tr.pendingMsg+' ':'')+t;},
  relaunch(cp){
    $('campScreen').style.display='none';const b=G.b,W=G.W;b.y=Math.max(b.y,cp.y+40);b.x=lerp(W.cx(b.y),b.x,.4);b.h=0;b.av=0;const f=flowAt(b.x,b.y);b.vx=f.vx;b.vy=f.vy;
    G.state='run';G.inv=1;G.stallY=b.y;if(this.t().pendingMsg){toast(this.t().pendingMsg,'#cfe3e0',2.5);this.t().pendingMsg='';}
  },
  /* ---------- the night at camp ---------- */
  night(cp){
    const tr=this.t(),R=G.river,lines=[];bump('nights');
    if(tr.pendingMsg){lines.push(tr.pendingMsg);tr.pendingMsg='';}
    if(cp.bad){lines.push('You missed every camp. You row until dark and sleep on a rocky ledge.');G.score=Math.max(0,G.score-250);tr.morale-=10;}
    let ev=null;
    if(tr.mode==='overnight'){
      if(tr.lostToday.length)lines.push(`Lost today: ${tr.lostToday.join(', ')}. ${tr.lostToday.includes('the cooler')?'Dinner is crackers.':'You make do.'}`);
      ev=this.pickEvent(R.events||['stars','bighorn','ringtail','wind','rain','music']);
    }else{
      const a=this.alive(),s=tr.sup,n=a.length;
      if(s.food>=n){s.food-=n;tr.morale+=2;if(s.fuel>0){s.fuel--;tr.morale+=3;lines.push('Hot dinner on the stove. Everyone is happy.');}else lines.push('Cold dinner: no stove fuel left.');a.forEach(c=>c.hp=Math.min(100,c.hp+6));}
      else{s.food=0;a.forEach(c=>{c.hp-=12;c.st.push('hungry');});tr.morale-=15;lines.push('<b class="bad">Not enough food.</b> Everyone goes to bed hungry (−12 health).');}
      const wneed=Math.ceil(n/3);if(s.water>=wneed)s.water-=wneed;else if(s.filter>0)lines.push('You filter river water to drink.');else{s.water=0;a.forEach(c=>c.hp-=8);lines.push('<b class="bad">No clean water.</b> Everyone is thirsty (−8).');}
      if(s.filter<=0&&Math.random()<.3){const v=a[Math.floor(Math.random()*n)];v.hp-=15;v.st.push('sick');lines.push(`<b class="bad">${v.name} is sick</b> from bad water (−15).`);}
      if(s.sunscreen<=0&&Math.random()<.35){const v=a[Math.floor(Math.random()*n)];v.hp-=8;v.st.push('sunburn');lines.push(`${v.name} has a bad sunburn (−8).`);}
      const cold=isCold(R)?1:.4;
      for(const nm of tr.swamDay){const c=tr.crew.find(x=>x.name===nm&&!x.gone);if(!c)continue;if(s.warm<n&&Math.random()<.6*cold){c.hp-=10;c.st.push('cold');lines.push(`${c.name} swam today and cannot get warm. Hypothermia risk (−10).`);}}
      if(s.groover>0){tr.gUsed=(tr.gUsed||0)+n;if(tr.gUsed>s.groover*8&&!tr.gFull){tr.gFull=1;tr.morale-=8;lines.push('<b class="bad">🚽 The groover is full!</b> You pack out the rest in bags. Nobody is happy (morale −8).');}}
      if(s.groover<=0&&tr.day===2){G.score=Math.max(0,G.score-200);tr.morale-=5;lines.push('<b class="bad">Ranger patrol!</b> You have no groover. That is a fine (−200 points).');}
      if(tr.lostToday.length)lines.push(`Lost on the river today: ${tr.lostToday.join(', ')}.`);
      ev=this.pickEvent(R.events||['ringtail','scorpion','stars','wind','rain','beaver','rockart','bighorn','argue','cold','music']);
    }
    if(ev)lines.push(ev);
    this.checkEvac(lines);
    tr.lostToday=[];tr.swamDay=[];tr.morale=clamp(tr.morale,0,100);
    if(tr.morale<20&&tr.mode==='expedition')lines.push('<b class="bad">Morale is very low.</b> The crew is grumbling.');
    if(tr.crew&&tr.crew[0].gone){this.openCampUI({title:cp.n,sub:'The trip is over',body:lines.map(l=>`<p>${l}</p>`).join(''),scene:{cp},buttons:[['See results',()=>{$('campScreen').style.display='none';endGame(false,'Your trip leader was evacuated.');}]]});return;}
    const fact=this.campFact(cp);
    this.campView(cp,lines,fact);
  },
  campView(cp,lines,fact){
    const tr=this.t(),btns=[];
    btns.push([`Launch at dawn (Day ${tr.day+1})`,()=>this.dawn(cp)]);
    if(tr.mode==='expedition'){
      const s=tr.sup;
      if(s.food>=this.alive().length)btns.push(['Rest a day (+15 health, uses food)',()=>{s.food-=this.alive().length;this.alive().forEach(c=>{c.hp=Math.min(100,c.hp+15);c.st=c.st.filter(x=>x!=='cold');});tr.morale+=6;this.campView(cp,['You rest, swim in an eddy and nap in the shade.'],null);}]);
      const hurt=this.alive().filter(c=>c.hp<75).sort((a,b)=>a.hp-b.hp)[0];
      if(hurt&&s.firstaid>0)btns.push([`First aid for ${hurt.name} (+30)`,()=>{s.firstaid--;hurt.hp=Math.min(100,hurt.hp+30);hurt.st=[];this.campView(cp,[`You patch up ${hurt.name}.`],null);}]);
      if(G.hp<G.hpMax*.8&&s.repair>0)btns.push(['Repair the boat (+45%)',()=>{s.repair--;G.hp=Math.min(G.hpMax,G.hp+G.hpMax*.45);G.oarLost=false;this.campView(cp,['You patch the hull and fix the oar frame.'],null);}]);
      else if(G.oarLost&&s.repair>0)btns.push(['Splint the broken oar',()=>{s.repair--;G.oarLost=false;this.campView(cp,['You splint the oar with straps and duct tape. Good as new (almost).'],null);}]);
    }
    const body=(tr.mode==='expedition'?this.oregonHtml(cp):'')+lines.map(l=>`<p>${l}</p>`).join('')+(fact?`<div class="campfact">${fact}</div>`:'')+this.statusHtml();
    this.openCampUI({title:cp.n,sub:`Night ${tr.day} of ${tr.days-1} · Mile ${cp.m.toFixed(1)} · ${G.river.name}`,body,scene:{cp},buttons:btns});
  },
  /* the six expedition vitals: Groover, First Aid, Paddles, Raft, Food, Water */
  vitals(){const tr=this.t();if(!tr||!tr.sup)return null;const s=tr.sup,s0=tr.sup0||s,n=Math.max(1,this.alive().length),left=Math.max(1,tr.days-tr.day+1);
    const v=(id,icon,name,val,txt)=>({id,icon,name,v:clamp(val,0,1),txt});
    return [v('groover','🚽','Groover',s.groover>0?1-(tr.gUsed||0)/(s.groover*8):0,s.groover>0?`${Math.max(0,Math.round(100-(tr.gUsed||0)/(s.groover*8)*100))}%`:'none!'),
      v('firstaid','🩹','First Aid',s.firstaid/Math.max(1,s0.firstaid||1),`${s.firstaid} kits`),
      v('paddles','🛶','Paddles',(s.spareoar+(G.oarLost?0:1))/((s0.spareoar||0)+1),G.oarLost?'1 lost!':`${s.spareoar} spare`),
      v('raft','🛟','Raft',G.hp/G.hpMax,`${Math.round(G.hp/G.hpMax*100)}%${s.repair?` +${s.repair} kit`:''}`),
      v('food','🍲','Food',s.food/(n*left),`${s.food} p-days`),
      v('water','💧','Water',s.filter>0?Math.max(.75,s.water/(Math.ceil(n/3)*left)):s.water/(Math.ceil(n/3)*left),s.filter>0?'filter ✓':`${s.water} jugs`)];},
  vitalsHtml(){const V=this.vitals();if(!V)return '';return `<div class="vitals">${V.map(x=>`<div class="vt"><span>${x.icon} ${x.name}</span><div class="hpb"><i style="width:${Math.round(x.v*100)}%;background:${x.v>.5?'#5fd38d':x.v>.25?'#ffb347':'#ff6b5b'}"></i></div><small>${x.txt}</small></div>`).join('')}</div>`;},
  oregonHtml(cp){const tr=this.t(),R=G.river,a=this.alive(),avg=a.length?a.reduce((q,c)=>q+c.hp,0)/a.length:0,W=G.W,b=G.b;
    const mi=cp&&cp.m!==undefined?cp.m:W.mileAt(b.y),nx=R.rapids.find(r=>r.m>mi)||null,d=new Date();d.setDate(d.getDate()+tr.day-1);
    const wx=R.waterF<45?'freezing':R.cont==='Africa'||R.cont==='Asia'?'hot':R.id==='franklin'?'rainy':'mild';
    const row=(k,v)=>`<div><span>${k}:</span><b>${v}</b></div>`;
    return `<div class="oregon">${row('Date',d.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}))}${row('Weather',wx)}${row('Water',`${R.waterF||60} °F`)}${row('Health',avg>75?'good':avg>50?'fair':avg>25?'poor':'very poor')}${row('Food',`${tr.sup?tr.sup.food:'—'} person-days`)}${row('Next rapid',nx?`${nx.n} (${Math.max(0,nx.m-mi).toFixed(1)} mi)`:'none')}${row('Miles run',`${(mi-R.start).toFixed(1)} of ${(R.end-R.start).toFixed(0)}`)}</div>`;},
  statusHtml(){const tr=this.t();if(tr.mode!=='expedition')return G.lost.length?`<p class="mute">Gear lost so far: ${G.lost.join(', ')}</p>`:'';
    const s=tr.sup;return `<div class="crewgrid">${tr.crew.map(c=>`<div class="cm ${c.gone?'gone':''}"><b>${esc(c.name)}</b><small>${c.role}</small><div class="hpb"><i style="width:${c.gone?0:c.hp}%;background:${c.hp>60?'#5fd38d':c.hp>30?'#ffb347':'#ff6b5b'}"></i></div><small>${c.gone?(COLD_RIVERS.includes(G.river.id)?'evacuated by helicopter':'hiked out'):c.st.slice(-2).join(', ')||'ok'}</small></div>`).join('')}</div>
      <p class="mute">Morale ${tr.morale}/100 · Food ${s.food} · Water ${s.water} · Fuel ${s.fuel} · First aid ${s.firstaid} · Repair ${s.repair} · Spare oars ${s.spareoar} · Boat ${Math.round(G.hp/G.hpMax*100)}%</p>`+this.vitalsHtml();},
  checkEvac(lines){const tr=this.t();if(!tr.crew)return;for(const c of tr.crew){if(!c.gone&&c.hp<=0){c.gone=true;c.hp=0;tr.evac.push(c.name);lines.push(`<b class="bad">${c.name} must leave the trip</b> — ${COLD_RIVERS.includes(G.river.id)?'evacuated by helicopter':'hiked out to a road'}.`);}}},
  dawn(cp){
    const tr=this.t();$('campScreen').style.display='none';
    tr.day++;
    if(tr.flood){tr.flood=false;const i=LEVEL_KEYS.indexOf(G.lvlKey),nk=LEVEL_KEYS[Math.min(LEVEL_KEYS.length-1,i+1)];if(nk!==G.lvlKey){rebuildLevel(nk);toast(`The river rose in the night: now ${LEVELS[nk].name} water!`,'#ffb347',2.6);}}
    const W=G.W,b=G.b,y=(W.yAtMile(cp.m)??cp.y)+90;b.y=y;b.x=W.cx(y)+cp.side*W.hw(y)*.4;b.h=0;b.av=0;const f=flowAt(b.x,b.y);b.vx=f.vx;b.vy=f.vy;
    G.maxY=Math.max(G.maxY,b.y);G.stallY=b.y;G.stallT=0;G.state='run';G.inv=1.5;G.swim=null;G.debris=[];G.wp=null;
    if(tr.fleet)tr.fleet.forEach(f=>{f.y=undefined;f.x=undefined;f.flip=0;});
    this.save(cp);
    while(G.poiIdx<W.pois.length&&W.pois[G.poiIdx].y<b.y-300)G.poiIdx++;
    AU.resume();
  },
  pickEvent(pool){
    const tr=this.t(),R=G.river;if(Math.random()>.75)return null;
    const k=pool[Math.floor(Math.random()*pool.length)],a=this.alive(),rnd=()=>a[Math.floor(Math.random()*a.length)];
    const exp=tr.mode==='expedition',s=tr.sup;
    switch(k){
      case 'stars':tr.morale+=8;return '✨ A perfect night of stars. Someone sees a shooting star.';
      case 'bighorn':tr.morale+=4;return '🐏 Bighorn sheep watch you from the cliffs at sunset.';
      case 'music':tr.morale+=7;return '🎸 Someone brought a guitar. Campfire songs until late.';
      case 'rockart':tr.morale+=6;return '🖐 You find old rock art up a side canyon. You look, but do not touch.';
      case 'ringtail':if(exp&&s.food>0){const l=Math.min(s.food,2);s.food-=l;return `🦝 A ringtail sneaks into the kitchen in the night and eats ${l} days of food.`;}return '🦝 A ringtail (a small, big-eyed cousin of the raccoon) sneaks into the kitchen. Close the food boxes!';
      case 'wind':tr.morale-=6;return '💨 A windstorm flattens two tents and fills everything with sand.';
      case 'rain':if(Math.random()<.5){tr.flood=true;return '⛈ Thunder upstream. Flash floods from side canyons will raise the river by morning. Move the boats higher!';}tr.morale-=3;return '🌧 A cold rain shower. Everyone hides under the tarp.';
      case 'scorpion':{if(!exp)return null;const v=rnd();v.hp-=12;v.st.push('stung');return `🦂 A scorpion stings ${v.name} (−12). Shake out your shoes!`;}
      case 'beaver':if(!exp)return null;if(s.spareoar>0&&Math.random()<.5){s.spareoar--;return '🦫 A beaver chews the spare oar to a stick in the night.';}return '🦫 A beaver slaps its tail in the eddy all night.';
      case 'argue':{if(!exp)return null;tr.morale-=6;const v=rnd();v.st.push('upset');return `😠 Two people argue about the dishes. ${v.name} is upset.`;}
      case 'hippo_far':tr.morale+=4;return '🦛 Hippos grunt and honk somewhere downstream all night.';
      case 'hippo_camp':if(exp&&Math.random()<.4){const v=rnd();v.hp-=6;v.st.push('scared');tr.morale-=4;return `🦛 A hippo walks through camp in the dark to graze. ${v.name} trips over a tent rope running for the boats (−6).`;}tr.morale+=3;return '🦛 Hippos come out of the river at night to eat grass. You hear them chewing right next to the tents!';
      case 'lion_far':tr.morale+=3;return '🦁 Far away, a lion roars. The sound rolls down the gorge.';
      case 'lion':tr.morale+=5;return '🦁 Lions roar across the river at 3 a.m. Nobody goes to the groover alone.';
      case 'elephant_camp':tr.morale+=8;return '🐘 Elephants walk slowly past the camp at dusk to drink. Everyone holds their breath.';
      case 'hyena':if(exp&&s.food>0){const l=Math.min(s.food,2);s.food-=l;return `🐾 A hyena steals a food bag in the night (−${l} days of food). Hang the food next time!`;}return '🐾 Hyenas whoop in the dark.';
      case 'baboons':if(exp&&s.food>0&&Math.random()<.5){s.food-=1;return '🐒 Baboons raid the kitchen at lunch and run off with the bread (−1 day of food).';}return '🐒 Baboons bark from the cliffs.';
      case 'monkeys_food':if(exp&&s.food>0&&Math.random()<.5){s.food-=1;return '🐒 Monkeys steal the bananas and a bag of rice (−1 day of food).';}tr.morale+=3;return '🐒 Monkeys watch the camp from the trees and chatter.';
      case 'condor':tr.morale+=6;return '🦅 Andean condors circle over camp. Their wings are 10 feet across.';
      case 'asado':tr.morale+=8;return '🔥 A local family invites you to an asado, a Chilean barbecue by the river.';
      case 'howler':tr.morale-=2;return '🐒 Howler monkeys roar at dawn. It sounds like a monster. It is only a monkey.';
      case 'frogs':tr.morale+=5;return '🐸 Tiny red frogs and fireflies everywhere. The jungle never sleeps.';
      case 'leech':{if(!exp)return '🪱 A leech on your ankle! Salt makes it let go.';const v=rnd();v.hp-=4;v.st.push('leech');return `🪱 ${v.name} finds three leeches after a walk in the forest (−4).`;}
      case 'chiya':tr.morale+=7;return '🫖 Kids from a village bring hot chiya (sweet milk tea) to camp. Everyone learns a few words of Nepali.';
      case 'aarti':tr.morale+=8;return '🪔 At dusk, small leaf boats with candles float past from an aarti (a prayer ceremony) upstream.';
      case 'platypus':tr.morale+=7;return '🦆 A platypus swims in the eddy at dawn. Very few people ever see one in the wild!';
      case 'cold':if(!exp)return null;if(s.warm<a.length){a.forEach(c=>{c.hp-=5;});return '🥶 A freezing night with frost on the boats. Not enough warm layers (−5 each).';}return '🥶 A freezing night. Good thing you packed warm layers.';
    }
    return null;
  },
  campFact(cp){const R=G.river,cand=(R.pois||[]).filter(p=>Math.abs(p.m-cp.m)<6&&!p.page);if(!sel.facts||!cand.length)return `Night sky over ${R.river.split(',')[0]}: far from cities, you can see the Milky Way with your own eyes.`;const p=cand[Math.floor(Math.random()*cand.length)];return `<b>${KIND_ICON[p.k]||''} Nearby: ${esc(p.n)}.</b> ${esc(p.txt)}`;},
  /* ---------- end ---------- */
  onEnd(ok){
    const tr=this.t();const out={bonus:0,gradeAdj:0,html:''};if(!tr||tr.mode==='day')return out;
    if(tr.mode==='overnight'){out.bonus=ok?(G.lost.length?100:300)-G.lost.length*50:0;out.gradeAdj=-G.lost.length*3;out.html=G.lost.length?`<p class="mute">Gear lost: ${G.lost.join(', ')}</p>`:'<p class="mute">No gear lost. Nice packing!</p>';return out;}
    const a=this.alive();out.bonus=ok?a.length*150+Math.round(a.reduce((s,c)=>s+c.hp,0)/Math.max(1,a.length)*3)+tr.morale*2:0;out.gradeAdj=-tr.evac.length*12+(tr.morale-50)/10;
    out.html=`<h2>Expedition report</h2>${this.statusHtml()}<p class="mute">Camp fights: ${tr.quarrels} · Evacuated: ${tr.evac.join(', ')||'nobody'}</p>`;return out;
  },
  crewHud(){const tr=this.t();if(!tr||tr.mode==='day')return '';
    if(tr.mode==='overnight')return G.lost.length?`🎒 lost ${G.lost.length}`:'';
    const fl=tr.fleet&&tr.fleet.length?` <span class="chip food">⛵${tr.fleet.length+1}</span>`:'';
    return tr.crew.map(c=>`<span class="chip" title="${esc(c.name)}" style="background:${c.gone?'#555':c.hp>60?'#2e7d4f':c.hp>30?'#a8701e':'#9b2c22'}">${esc(c.name[0])}</span>`).join('')+` <span class="chip food">🍲${tr.sup.food}</span>`+fl;},
  /* ---------- drawing on the river ---------- */
  renderWorld(c,yMin,yMax){
    const tr=this.t();const o=this.todays()||[];const W=G.W,t=performance.now()/1000;
    for(const cp of W.camps){if(cp.y<yMin-200||cp.y>yMax+200)continue;const isOpt=o.includes(cp);const x=W.cx(cp.y)+cp.side*(W.hw(cp.y)+20);
      if(cp.taken&&!cp.shared){for(let i=0;i<3;i++){const ty=cp.y+(i-1)*40;c.fillStyle=['#e74c3c','#8e44ad','#16a085'][i];c.beginPath();c.moveTo(x+cp.side*20-12,ty-10);c.lineTo(x+cp.side*20+12,ty-10);c.lineTo(x+cp.side*20,ty+12);c.closePath();c.fill();}
        c.fillStyle='#555';c.fillRect(x-cp.side*8-10,cp.y-30,20,50);}
      if(isOpt&&!cp.rejected){c.strokeStyle=`rgba(95,211,141,${.5+.4*Math.sin(t*4)})`;c.lineWidth=4;c.beginPath();c.ellipse(x-cp.side*24,cp.y,50,110,0,0,7);c.stroke();
        c.fillStyle='#6b4a2c';c.fillRect(x+cp.side*10-2,cp.y,4,40);c.fillStyle='#5fd38d';c.beginPath();c.moveTo(x+cp.side*10,cp.y+40);c.lineTo(x+cp.side*10+cp.side*22,cp.y+32);c.lineTo(x+cp.side*10,cp.y+24);c.fill();}}
  },
  renderLabels(c,S,yMin,yMax,label){
    const o=this.todays()||[];const W=G.W,tr=this.t();
    if(tr&&tr.fleet&&G.state==='run')for(const f of tr.fleet){if(f.y===undefined||f.y<yMin||f.y>yMax)continue;const [x,y]=S(f.x,f.y);c.save();c.translate(x,y);c.rotate(f.h);c.scale(G.scale,G.scale);drawCraft(c,f.craft,G.t*4,f.flip>0,2,null,f.col);c.restore();label(f.name,x,y+46*G.scale,'#fff','rgba(0,0,0,.5)');}
    for(const cp of W.camps){if(cp.y<yMin||cp.y>yMax)continue;const [x,y]=S(W.cx(cp.y)+cp.side*(W.hw(cp.y)+40),cp.y);const isOpt=o.includes(cp)&&!cp.rejected;
      label(`⛺ ${cp.n}${cp.taken&&!cp.shared?' (taken)':''}`,x,y-36,isOpt?'#5fd38d':cp.taken?'#ff8a7a':'#cfd8d6',isOpt?'rgba(10,50,30,.85)':'rgba(0,0,0,.5)');}
  },
  /* ---------- camp screen + scene ---------- */
  openCampUI({title,sub,body,buttons,scene}){
    const w=$('campPanel');w.innerHTML=`<div class="pk">⛺ Camp</div><h1>${esc(title)}</h1><div class="sub">${esc(sub)}</div>${body}<div class="cbtns"></div>`;
    const bw=w.querySelector('.cbtns');buttons.forEach(([t,fn],i)=>{const b=document.createElement('button');b.className=i===0?'big':'ghost';b.textContent=t;b.onclick=fn;bw.appendChild(b);});
    $('campScreen').style.display='block';$('campScreen').classList.toggle('retro',typeof PIX!=='undefined'&&PIX.on());this.scene=this.makeScene(scene||{});
  },
  makeScene(o){const rng=mulberry32(hashStr((o.cp&&o.cp.n)||'camp')),stars=[],mw=[],wallL=[],wallR=[];
    for(let i=0;i<260;i++)stars.push([rng(),rng()*.62,rng()*1.6+.3,rng()*6]);
    for(let i=0;i<900;i++){const t=rng(),off=(rng()+rng()+rng()-1.5)*.09;mw.push([t,.05+t*.45+off,rng()*.9+.2]);}
    for(let i=0;i<=24;i++){wallL.push([i/24,.28+rng()*.12+(i/24)*.18]);wallR.push([i/24,.3+rng()*.12+(1-i/24)*.15]);}
    return {t:0,stars,mw,wallL,wallR,other:!!o.other,flames:[],bats:[],rain:this.t()&&this.t().flood,crew:this.t()&&this.t().crew?this.alive().length:Math.max(2,G.craft.crew+1)};},
  renderCamp(dt){
    const cvs=$('campCv'),sc=this.scene;if(!cvs||!sc)return;
    const w=innerWidth,h=innerHeight,d=Math.min(2,devicePixelRatio||1);if(cvs.width!==Math.round(w*d)){cvs.width=Math.round(w*d);cvs.height=Math.round(h*d);}
    const c=cvs.getContext('2d');c.setTransform(d,0,0,d,0,0);sc.t+=dt;const t=sc.t,pal=G.river.pal;
    const dusk=clamp(1-t/6,0,1),g=c.createLinearGradient(0,0,0,h*.7);
    g.addColorStop(0,`rgb(${lerp(8,40,dusk)|0},${lerp(10,50,dusk)|0},${lerp(35,110,dusk)|0})`);g.addColorStop(.6,`rgb(${lerp(30,120,dusk)|0},${lerp(25,70,dusk)|0},${lerp(70,110,dusk)|0})`);g.addColorStop(1,`rgb(${lerp(60,220,dusk)|0},${lerp(40,120,dusk)|0},${lerp(60,70,dusk)|0})`);
    c.fillStyle=g;c.fillRect(0,0,w,h);
    const sa=1-dusk*.85;
    for(const m of sc.mw){c.fillStyle=`rgba(220,225,255,${.12*sa*m[2]})`;c.fillRect(m[0]*w,m[1]*h,1.6,1.6);}
    for(const s of sc.stars){const tw=.6+.4*Math.sin(t*2+s[3]);c.fillStyle=`rgba(255,255,255,${tw*sa})`;c.beginPath();c.arc(s[0]*w,s[1]*h,s[2]*.8,0,7);c.fill();}
    if(Math.floor(t)%7===3&&t%1<.6){const p=t%1/.6;c.strokeStyle=`rgba(255,255,255,${(1-p)*sa})`;c.lineWidth=2;c.beginPath();c.moveTo(w*.2+p*w*.3,h*.1+p*h*.12);c.lineTo(w*.2+p*w*.3-40,h*.1+p*h*.12-14);c.stroke();}
    const dark=(hex,k)=>{const v=parseInt(hex.slice(1),16);return `rgb(${((v>>16)&255)*k|0},${((v>>8)&255)*k|0},${(v&255)*k|0})`;};
    c.fillStyle=dark(pal.wall,.25+.35*dusk);c.beginPath();c.moveTo(0,h);for(const [x,y] of sc.wallL)c.lineTo(x*w*.42,y*h+Math.sin(x*30)*6);c.lineTo(w*.42,h);c.fill();
    c.fillStyle=dark(pal.wall2,.22+.3*dusk);c.beginPath();c.moveTo(w,h);for(const [x,y] of sc.wallR)c.lineTo(w*.58+x*w*.42,y*h+Math.cos(x*27)*6);c.lineTo(w*.58,h);c.fill();
    const ry=h*.66;c.fillStyle=dark(pal.water,.35+.3*dusk);c.fillRect(0,ry,w,h*.12);
    for(let i=0;i<14;i++){c.strokeStyle=`rgba(255,${150+i*5},80,${.12+.1*Math.sin(t*3+i)})`;c.lineWidth=2;const yy=ry+8+i*6;c.beginPath();c.moveTo(w*.48+Math.sin(t+i)*20-30,yy);c.lineTo(w*.48+Math.sin(t+i)*20+30,yy);c.stroke();}
    c.fillStyle=dark(pal.sand,.35+.35*dusk);c.beginPath();c.moveTo(0,h);c.lineTo(0,h*.8);c.quadraticCurveTo(w*.5,h*.74,w,h*.8);c.lineTo(w,h);c.fill();
    const tents=sc.other?['#e74c3c','#8e44ad','#16a085','#f39c12','#2980b9']:['#f39c12','#2980b9','#27ae60'];
    tents.forEach((col,i)=>{const x=w*(.12+i*.16)+(i>1?w*.3:0),y=h*.86;c.fillStyle=dark(col,.45+.3*dusk);c.beginPath();c.moveTo(x-34,y);c.lineTo(x+34,y);c.lineTo(x,y-38);c.closePath();c.fill();c.fillStyle='rgba(255,200,120,.25)';c.beginPath();c.moveTo(x-6,y);c.lineTo(x+6,y);c.lineTo(x,y-18);c.fill();});
    c.fillStyle=dark('#f0b429',.4+.3*dusk);c.beginPath();c.ellipse(w*.8,h*.78,70,16,0,0,7);c.fill();
    const fx=w*.5,fy=h*.88,gr=c.createRadialGradient(fx,fy,4,fx,fy,180+Math.sin(t*9)*8);gr.addColorStop(0,'rgba(255,170,60,.55)');gr.addColorStop(1,'rgba(255,120,30,0)');c.fillStyle=gr;c.beginPath();c.arc(fx,fy,200,0,7);c.fill();
    c.strokeStyle='#3b2414';c.lineWidth=7;c.beginPath();c.moveTo(fx-22,fy+6);c.lineTo(fx+22,fy-4);c.moveTo(fx+22,fy+6);c.lineTo(fx-22,fy-4);c.stroke();
    for(let i=0;i<4;i++)sc.flames.push({x:fx+(Math.random()-.5)*24,y:fy,vx:(Math.random()-.5)*20,vy:-40-Math.random()*60,l:0,m:.5+Math.random()*.6,s:6+Math.random()*8});
    for(let i=sc.flames.length-1;i>=0;i--){const f=sc.flames[i];f.l+=dt;f.x+=f.vx*dt;f.y+=f.vy*dt;if(f.l>f.m){sc.flames.splice(i,1);continue;}const k=f.l/f.m;c.fillStyle=`rgba(255,${(220-160*k)|0},${(80-60*k)|0},${1-k})`;c.beginPath();c.arc(f.x,f.y,f.s*(1-k*.6),0,7);c.fill();}
    for(let i=0;i<sc.crew;i++){const a=Math.PI*(.15+.7*i/Math.max(1,sc.crew-1)),x=fx+Math.cos(a)*90*(i%2?1:-1)*.9,y=fy+12-Math.sin(a)*8;c.fillStyle='#120c08';c.beginPath();c.ellipse(x,y-10,11,16,0,0,7);c.fill();c.beginPath();c.arc(x,y-32,8,0,7);c.fill();}
    if(Math.random()<dt*.6)sc.bats.push({x:-20,y:h*(.2+Math.random()*.3),p:Math.random()*6});
    for(let i=sc.bats.length-1;i>=0;i--){const bt=sc.bats[i];bt.x+=160*dt;bt.y+=Math.sin(t*8+bt.p)*2;if(bt.x>w+30){sc.bats.splice(i,1);continue;}c.strokeStyle='#0a0a12';c.lineWidth=2;const f=Math.sin(t*25+bt.p)*5;c.beginPath();c.moveTo(bt.x-7,bt.y-f);c.lineTo(bt.x,bt.y);c.lineTo(bt.x+7,bt.y-f);c.stroke();}
    if(sc.rain){c.strokeStyle='rgba(180,200,230,.35)';c.lineWidth=1;c.beginPath();for(let i=0;i<120;i++){const x=(i*97+t*300)%w,y=(i*53+t*700)%h;c.moveTo(x,y);c.lineTo(x-3,y+12);}c.stroke();if(Math.random()<dt*.2){c.fillStyle='rgba(255,255,255,.25)';c.fillRect(0,0,w,h);}}
    if(typeof PIX!=='undefined'&&PIX.on())PIX.retroize(cvs);
  },
  lunch(){const tr=this.t();
    if(tr&&tr.mode==='expedition'){const a=this.alive(),need=Math.ceil(a.length/2);if(tr.sup.food>=need){tr.sup.food-=need;a.forEach(c=>c.hp=Math.min(100,c.hp+8));tr.morale=Math.min(100,tr.morale+6);return `Lunch in the shade: sandwiches, chips and fruit. Crew +8 health, morale up. (−${need} food)`;}tr.morale-=3;return 'Not enough food for a real lunch. You share some crackers.';}
    G.hp=Math.min(G.hpMax,G.hp+G.hpMax*.1);return 'Lunch in the shade: sandwiches, chips and cookies. You patch the boat a little (+10%). +40';},
  /* ---------- flotilla: the other boats in your trip ---------- */
  updFleet(dt){const tr=this.t(),b=G.b,W=G.W;
    tr.fleet.forEach((f,i)=>{const ty=b.y-230*(i+1);if(f.y===undefined)f.y=ty;
      const fl=flowAt(W.cx(f.y),f.y);let v=fl.vy;if(f.y<ty-40)v=Math.max(v,fl.vy*1.2+60);if(f.y>ty+40)v=Math.min(v,20);f.y+=v*dt;if(f.y>b.y-120)f.y=b.y-120;
      const r=curRapid(f.y);let u=i%2?.22:-.22;if(r&&r.lineU){u=r.lineU(clamp((f.y-r.y0)/r.L,0,1))+(i%2?.06:-.06);}
      const tx=W.cx(f.y)+u*W.hw(f.y);f.x=f.x===undefined?tx:lerp(f.x,tx,Math.min(1,dt*1.5));f.h=lerp(f.h,r?Math.sin(G.t*2+i)*.25:0,Math.min(1,dt*2));if(f.flip>0)f.flip-=dt;
      if(r&&f.y>r.y0&&!f.ran[r.y0|0]){f.ran[r.y0|0]=1;if(Math.random()<Math.pow(r.s,2.2)*.45){f.flip=3;splash(f.x,f.y,20,1.2);AU.splash(1);toast(`The ${f.name} flipped in ${r.n}! Help the swimmer!`,'#ff8c1a',2.4);
        if(!G.swim){G.swim={x:f.x+20,y:f.y+30,t:0,name:f.crew[0]||'Crew',lost:0};G.mobCount++;}
        const s=tr.sup,keys=['food','water','fuel','firstaid'].filter(k=>s[k]>0);if(keys.length){const k=keys[Math.floor(Math.random()*keys.length)],amt=k==='food'?Math.min(s[k],3):1;s[k]-=amt;tr.lostToday.push(`${amt} ${k} from the ${f.name.toLowerCase()}`);}}}});},
  /* ---------- save + continue (expedition) ---------- */
  save(cp){const tr=this.t();if(!tr||tr.mode!=='expedition')return;const W=G.W;
    store.set('riverrun_save',{v:1,river:G.river.id,craft:G.ck,level:G.lvlKey,day:tr.day,days:tr.days,crew:tr.crew,sup:tr.sup,sup0:tr.sup0,gUsed:tr.gUsed||0,gFull:tr.gFull||0,morale:tr.morale,quarrels:tr.quarrels,evac:tr.evac,
      boats:(tr.fleet||[]).length+1,opts:tr.opts.map(o=>o.map(c=>({n:c.n,m:c.m,side:c.side,taken:!!c.taken,rejected:!!c.rejected,shared:!!c.shared,gen:!!c.gen}))),
      g:{score:G.score,swims:G.swims,hp:G.hp,t:G.t,clean:G.clean,stars:G.stars,streak:G.streak,bestStreak:G.bestStreak||0,mob:G.mobCount,res:G.rescues,lost:G.lost,oarLost:G.oarLost,repairsUsed:tr.repairsUsed},
      mile:cp.m,rapids:W.rapids.map(r=>[r.done?1:0,r.clean?1:0,r.stars||0]),stops:W.stops.filter(s=>s.done).map(s=>s.id),date:new Date().toISOString().slice(0,10)});},
  loadSave(){return store.get('riverrun_save',null);},
  clearSave(){const tr=this.t();if(tr&&tr.mode==='expedition')store.set('riverrun_save',null);},
  continueSave(){const sv=this.loadSave();if(!sv)return;Object.assign(sel,{river:sv.river,craft:sv.craft,level:sv.level,mode:'expedition'});this.pending={crew:sv.crew.map(c=>c.name),sup:sv.sup,boats:sv.boats};this.pendingRestore=sv;startGame(sv.level);},
  restore(sv){const tr=this.t(),W=G.W;
    tr.day=sv.day;tr.days=sv.days;tr.crew=sv.crew;tr.sup=sv.sup;tr.sup0=sv.sup0||Object.assign({},sv.sup);tr.gUsed=sv.gUsed||0;tr.gFull=sv.gFull||0;tr.morale=sv.morale;tr.quarrels=sv.quarrels;tr.evac=sv.evac||[];tr.repairsUsed=sv.g.repairsUsed||0;
    tr.opts=sv.opts.map(o=>o.map(c=>{let w=W.camps.find(x=>x.n===c.n&&Math.abs(x.m-c.m)<.2);if(!w){w={n:c.n,m:c.m,side:c.side,y:W.yAtMile(c.m),gen:true};W.camps.push(w);}return Object.assign(w,{taken:c.taken,rejected:c.rejected,shared:c.shared});}));
    const g=sv.g;Object.assign(G,{score:g.score,swims:g.swims,hp:g.hp,t:g.t,clean:g.clean,stars:g.stars,streak:g.streak,bestStreak:g.bestStreak,mobCount:g.mob,rescues:g.res,lost:g.lost||[],oarLost:!!g.oarLost});
    W.rapids.forEach((r,i)=>{const q=sv.rapids[i];if(q){r.done=!!q[0];r.clean=!!q[1];r.stars=q[2];r.announced=r.done;r.entered=r.done;}});
    W.stops.forEach(s=>{if(sv.stops.includes(s.id))s.done=true;});
    const y=W.yAtMile(sv.mile)+90,b=G.b;b.y=y;b.x=W.cx(y);b.h=0;const f=flowAt(b.x,b.y);b.vx=f.vx;b.vy=f.vy;G.maxY=y;G.stallY=y;
    G.poiIdx=0;while(G.poiIdx<W.pois.length&&W.pois[G.poiIdx].y<y-300)G.poiIdx++;W.chunks.forEach(ch=>{if(ch.y1<y)ch.done=true;});
    setTimeout(()=>G&&toast(`Welcome back! Day ${tr.day} of ${tr.days} on ${G.river.name}.`,'#5fd38d',2.5),300);},
  /* ---------- outfitter (expedition setup) ---------- */
  openOutfitter(R,cb){
    const days=Math.max(2,R.days||3);let n=4,boats=R.id==='gc-full'?2:1;const sup={};SUPPLIES.forEach(s=>sup[s.id]=0);let names=[sel.name||'Boatman',...CREW_NAMES.slice(0,7)];
    const budget=()=>400+250*n,cost=()=>SUPPLIES.reduce((a,s)=>a+s.price*sup[s.id],0)+(boats-1)*350;
    const draw=()=>{
      const w=$('outfitWrap'),left=budget()-cost();
      w.innerHTML=`<h1>Out<span>fitter</span></h1><div class="sub">${esc(R.name)} · about ${days} days · ${esc(R.season)}</div>
        <h2>Crew</h2><div class="row" id="ofN"></div><div class="grid crewin" id="ofCrew"></div>
        <h2>Boats in your trip</h2><div class="row" id="ofB"></div><div class="mute">Extra boats cost $350 each. They carry crew and gear, and they can flip too.</div>
        <h2>Supplies</h2><div class="budget ${left<0?'bad':''}">Budget $${budget()} · Spent $${cost()} · <b>Left $${left}</b></div>
        <button class="ghost" id="ofRec">Pack the recommended amounts</button><div id="ofSup"></div>
        <button class="big" id="ofGo" ${left<0?'disabled':''}>${left<0?'Over budget':'Start the expedition'}</button><button class="ghost" id="ofBack">Back</button>`;
      const nr=$('ofN');for(let k=2;k<=6;k++){const b=document.createElement('button');b.className='pill'+(k===n?' sel':'');b.textContent=k+' people';b.onclick=()=>{n=k;draw();};nr.appendChild(b);}
      const br=$('ofB');for(let k=1;k<=4;k++){const b=document.createElement('button');b.className='pill'+(k===boats?' sel':'');b.textContent=k===1?'Only your boat':k+' boats';b.onclick=()=>{boats=k;if(n<k)n=k;draw();};br.appendChild(b);}
      const cr=$('ofCrew');for(let i=0;i<n;i++){const d=document.createElement('div');d.className='card';d.innerHTML=`<small>${ROLES[i]}</small><input value="${esc(names[i])}" maxlength="14" ${i===0?'disabled':''}>`;d.querySelector('input').oninput=e=>{names[i]=e.target.value||CREW_NAMES[i];};cr.appendChild(d);}
      const sw=$('ofSup');SUPPLIES.forEach(s=>{const r=document.createElement('div');r.className='suprow';const rec=s.rec(n,days);
        r.innerHTML=`<div><b>${s.name}</b> <small>$${s.price}${s.unit?' / '+s.unit:''}</small><div class="mute">${s.desc} Recommended: ${rec}</div></div><div class="qty"><button>−</button><span>${sup[s.id]}</span><button>+</button></div>`;
        const [m,p]=r.querySelectorAll('button');m.onclick=()=>{sup[s.id]=Math.max(0,sup[s.id]-1);draw();};p.onclick=()=>{sup[s.id]++;draw();};sw.appendChild(r);});
      $('ofRec').onclick=()=>{SUPPLIES.forEach(s=>sup[s.id]=s.rec(n,days));while(cost()>budget()&&sup.food>n*days)sup.food--;draw();};
      $('ofBack').onclick=()=>{$('outfit').style.display='none';};
      $('ofGo').onclick=()=>{if(cost()>budget())return;this.pending={crew:names.slice(0,n).map((x,i)=>i===0?(sel.name||'Boatman'):x),sup:{...sup},boats};$('outfit').style.display='none';cb();};
    };
    draw();$('outfit').style.display='block';
  }
};
