'use strict';
/* =====================================================================
   RIVER RUN — CORE GAME
   ===================================================================== */

/* ---------- Global leaderboard hook (optional) ----------
   Leave enabled:false to keep scores on this device only.
   To share scores with everyone, make a free Supabase project, create the
   "runs" table (see README.md), then fill in url and key and set enabled:true. */
const LEADERBOARD_REMOTE={enabled:false,url:'',key:'',table:'runs'};

const $=id=>document.getElementById(id);
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const lerp=(a,b,t)=>a+(b-a)*t;
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const angDiff=(a,b)=>{let d=a-b;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;return d;};
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function hashStr(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function fmtTime(s){s=Math.max(0,Math.round(s));const m=Math.floor(s/60),r=s%60;return m+':'+String(r).padStart(2,'0');}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function lowerIdx(arr,y){let lo=0,hi=arr.length;while(lo<hi){const m=(lo+hi)>>1;if(arr[m].y<y)lo=m+1;else hi=m;}return lo;}
function segDist(px,py,x0,y0,x1,y1){const dx=x1-x0,dy=y1-y0,l2=dx*dx+dy*dy;let t=l2?((px-x0)*dx+(py-y0)*dy)/l2:0;t=clamp(t,0,1);const qx=x0+t*dx-px,qy=y0+t*dy-py;return Math.sqrt(qx*qx+qy*qy);}
function isTouch(){return ('ontouchstart' in window)||navigator.maxTouchPoints>0||matchMedia('(pointer:coarse)').matches;}

/* ================= STORAGE ================= */
const store={
  get(k,d){try{const v=localStorage.getItem(k);return v===null?d:JSON.parse(v);}catch(e){return d;}},
  set(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}
};
function todayKey(){const d=new Date();return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();}
/* Facts already seen today are not shown again (after a flip, a restart or a new run the same day). */
const SEEN={key:'riverrun_seen',get(){const s=store.get(this.key,{});return s.day===todayKey()?s:{day:todayKey(),ids:[]};},
  has(id){return this.get().ids.includes(id);},add(id){const s=this.get();if(!s.ids.includes(id)){s.ids.push(id);store.set(this.key,s);}}};

/* ================= LEADERBOARD ================= */
const LB={
  key:'riverrun_runs',
  all(){return store.get(this.key,[]);},
  add(run){const a=this.all();a.push(run);if(a.length>600)a.splice(0,a.length-600);store.set(this.key,a);this.remoteSubmit(run);},
  top(river,mode,by,n){const a=this.all().filter(r=>r.river===river&&r.mode===mode&&(by!=='time'||r.ok));
    a.sort(by==='time'?(x,y)=>x.time-y.time:(x,y)=>y.score-x.score);return a.slice(0,n||5);},
  rank(run,by){const a=this.top(run.river,run.mode,by,9999);return a.findIndex(r=>r.id===run.id)+1;},
  remoteSubmit(run){if(!LEADERBOARD_REMOTE.enabled||!LEADERBOARD_REMOTE.url)return;
    try{fetch(`${LEADERBOARD_REMOTE.url}/rest/v1/${LEADERBOARD_REMOTE.table}`,{method:'POST',headers:{'apikey':LEADERBOARD_REMOTE.key,'Authorization':'Bearer '+LEADERBOARD_REMOTE.key,'Content-Type':'application/json','Prefer':'return=minimal'},
      body:JSON.stringify({name:run.name,river:run.river,craft:run.craft,mode:run.mode,level:run.level,score:run.score,time_s:Math.round(run.time),ok:run.ok,swims:run.swims})}).catch(()=>{});}catch(e){}},
  async remoteTop(river,mode,by){if(!LEADERBOARD_REMOTE.enabled||!LEADERBOARD_REMOTE.url)return null;
    try{const o=by==='time'?'time_s.asc':'score.desc';const q=`${LEADERBOARD_REMOTE.url}/rest/v1/${LEADERBOARD_REMOTE.table}?select=*&river=eq.${encodeURIComponent(river)}&mode=eq.${mode}${by==='time'?'&ok=eq.true':''}&order=${o}&limit=10`;
      const r=await fetch(q,{headers:{'apikey':LEADERBOARD_REMOTE.key,'Authorization':'Bearer '+LEADERBOARD_REMOTE.key}});if(!r.ok)return null;
      return (await r.json()).map(x=>({name:x.name,craft:x.craft,score:x.score,time:x.time_s,level:x.level}));}catch(e){return null;}}
};

/* ================= WORLD BUILD ================= */
function buildWorld(R,levelKey,d3){
  const lv=LEVELS[levelKey];
  const rngG=mulberry32(hashStr(R.id)),rng=mulberry32(hashStr(R.id+':'+levelKey));
  const PXM=1200,W={rapids:[],feats:[],deco:[],anchors:[],len:0};
  const P=[rngG()*6.28,rngG()*6.28,rngG()*6.28,rngG()*6.28];
  let y=0,endMile=R.start;
  W.anchors.push({y:0,m:R.start});
  R.rapids.forEach((rp,i)=>{
    const s=clamp(sev(R,rp.c)*lv.sev,.05,1);
    const gap=i===0?clamp((rp.m-R.start)*PXM,1100,2600):clamp((rp.m-endMile)*PXM,450,2600);
    const y0=y+gap,L=480+s*1000,y1=y0+L,next=R.rapids[i+1];
    let em=Math.min(rp.m+.2,next?next.m-.04:R.end-.1);em=Math.max(em,rp.m+.02);
    W.anchors.push({y:y0,m:rp.m},{y:y1,m:em});
    W.rapids.push({...rp,s,y0,y1,L,clean:true,done:false,announced:false,fan:rp.fan||(rngG()<.5?-1:1)});
    y=y1;endMile=em;
  });
  W.len=y+clamp((R.end-endMile)*PXM,900,2600);
  W.anchors.push({y:W.len,m:R.end});
  W.mileAt=yy=>{const A=W.anchors;if(yy<=0)return A[0].m;for(let i=1;i<A.length;i++){if(yy<=A[i].y){const a=A[i-1],b=A[i];return lerp(a.m,b.m,(yy-a.y)/Math.max(1,b.y-a.y));}}return A[A.length-1].m;};
  W.yAtMile=m=>{const A=W.anchors;if(m<=A[0].m)return 0;for(let i=1;i<A.length;i++){const a=A[i-1],b=A[i];if(m>=a.m&&m<=b.m&&b.m>a.m)return lerp(a.y,b.y,(m-a.m)/(b.m-a.m));}return null;};
  W.ramp=yy=>{let k=0,s=0;for(const r of W.rapids){let kk=0;if(yy<r.y0-350||yy>r.y1+250)continue;if(yy<r.y0)kk=smooth((yy-(r.y0-350))/350);else if(yy>r.y1)kk=1-smooth((yy-r.y1)/250);else kk=1;k=Math.max(k,kk);s=Math.max(s,r.s*kk);}return [k,s];};
  W.cx=yy=>150*Math.sin(yy/2100+P[0])+70*Math.sin(yy/830+P[1])+22*Math.sin(yy/310+P[2]);
  W.dcx=yy=>(W.cx(yy+5)-W.cx(yy-5))/10;
  W.ddcx=yy=>(W.cx(yy+40)-2*W.cx(yy)+W.cx(yy-40))/1600;
  W.hw=yy=>R.width/2*(1+.13*Math.sin(yy/1500+P[3]))*(1-.14*W.ramp(yy)[0]);
  W.rint=yy=>W.ramp(yy)[1];
  let id=0;const add=f=>{f.id=id++;W.feats.push(f);};
  const X=(u,yy)=>W.cx(yy)+u*W.hw(yy);
  // rapids
  for(const r of W.rapids){
    const s=r.s,line=r.line||[(rng()-.5)*.6,(rng()-.5)*.6,(rng()-.5)*.5];
    const lineU=v=>v<.5?lerp(line[0],line[1],smooth(v*2)):lerp(line[1],line[2],smooth((v-.5)*2));
    const yv=v=>r.y0+v*r.L;
    add({t:'tongue',x:X(line[0],r.y0),y:r.y0,w:.18*W.hw(r.y0),len:120+s*140});
    const nw=3+Math.round(s*7);
    for(let i=0;i<nw;i++){const v=.1+.78*i/Math.max(1,nw-1)+(rng()-.5)*.03,yy=yv(v);
      add({t:'wave',x:X(lineU(v)+(rng()-.5)*.08,yy),y:yy,w:(.12+s*.1)*W.hw(yy),h:clamp(.25+s*.75*(.6+.4*Math.sin(v*Math.PI))+(rng()-.5)*.15,.15,1)});}
    const place=clr=>{for(let k=0;k<14;k++){const v=.08+rng()*.86;const u=(rng()*2-1)*.85;if(Math.abs(u-lineU(v))>=clr)return [u,v];}return null;};
    const nh=Math.round(s*5*lv.holes);
    for(let i=0;i<nh;i++){const pv=place(.32);if(!pv)continue;const yy=yv(pv[1]),pw=clamp((.35+s*.7+rng()*.2)*lv.holes,.2,1.8);
      add({t:'hole',x:X(pv[0],yy),y:yy,rx:(.06+s*.06)*W.hw(yy),ry:16+pw*14,pow:pw,pour:rng()<.35});}
    const nr=Math.round((2+s*9)*lv.rocks);
    for(let i=0;i<nr;i++){const pv=place(.24);if(!pv)continue;const yy=yv(pv[1]);add({t:'rock',x:X(pv[0],yy),y:yy,r:12+rng()*20+s*10});}
    const nl=Math.round(s*4);
    for(let i=0;i<nl;i++){const v=.15+rng()*.7,yy=yv(v),side=rng()<.5?-1:1,u=lineU(v)+side*(.25+rng()*.15),x=X(u,yy),Lp=.3*W.hw(yy),dir=-side;
      add({t:'lat',x0:x-dir*Lp*.5,y0:yy-Lp*.35,x1:x+dir*Lp*.5,y1:yy+Lp*.35,y:yy,dir,pow:.4+s*.6});}
    const nb=(R.scale==='gc'&&s>.45?1+Math.floor(rng()*2):0)+(levelKey==='flood'?2:0);
    for(let i=0;i<nb;i++){const v=.45+rng()*.5,yy=yv(v);add({t:'boil',x:X(lineU(v)+(rng()-.5)*.5,yy),y:yy,r:40+rng()*30,pow:.6+s*.5});}
    for(const h of (r.haz||[])){const yy=yv(h.v),x=X(h.u,yy);
      if(h.t==='hole'){const pw=h.p*lv.holes;add({t:'hole',x,y:yy,rx:h.s*(.06+s*.06)*W.hw(yy),ry:18+pw*16,pow:pw,name:h.n,pour:!!h.pour});}
      else if(h.t==='rock')add({t:'rock',x,y:yy,r:h.r,name:h.n});
      else if(h.t==='wave')add({t:'wave',x,y:yy,w:h.w*W.hw(yy),h:h.h,name:h.n});
      else if(h.t==='boil')add({t:'boil',x,y:yy,r:h.r,pow:1,name:h.n});}
  }
  // landmarks in the river
  W.marks=[];for(const mk of (R.marks||[])){const yy=W.yAtMile(mk.m);if(yy===null)continue;W.marks.push({...mk,y:yy});add({t:'rock',x:X(mk.u,yy),y:yy,r:mk.r,name:mk.n,tall:true});}
  // camps, POIs, bridges, towns, crowds
  W.camps=(R.camps||[]).map((c,i)=>({...c,i,y:W.yAtMile(c.m)})).filter(c=>c.y!==null&&c.y>500&&c.y<W.len-300);
  W.pois=(R.pois||[]).map(p=>({...p,y:W.yAtMile(p.m)})).filter(p=>p.y!==null).sort((a,b)=>a.y-b.y);
  W.bridges=(R.bridges||[]).map(b=>({...b,y:W.yAtMile(b.m)})).filter(b=>b.y!==null);
  W.towns=(R.towns||[]).map(t=>({...t,y:W.yAtMile(t.m)})).filter(t=>t.y!==null);
  W.crowds=(R.crowds||[]).map(c=>{const yy=W.yAtMile(c.m);if(yy===null)return null;const mem=[];for(let i=0;i<c.count;i++)mem.push({dy:(rng()-.5)*c.spread,off:6+rng()*70,col:['#e74c3c','#f1c40f','#3498db','#2ecc71','#e67e22','#9b59b6','#ecf0f1','#ff6fb5'][Math.floor(rng()*8)],ph:rng()*6.28});return {...c,y:yy,mem};}).filter(Boolean);
  // flatwater features
  const gaps=[];let prev=0;for(const r of W.rapids){gaps.push([prev,r.y0]);prev=r.y1;}gaps.push([prev,W.len]);
  const nearCamp=yy=>W.camps.some(c=>Math.abs(c.y-yy)<300)||W.bridges.some(b=>Math.abs(b.y-yy)<200);
  for(const [a,b] of gaps){for(let yy=a+500;yy<b-450;yy+=600+rng()*600){if(nearCamp(yy))continue;
    const side=rng()<.5?-1:1;
    if(R.trees&&rng()<.4){const hw=W.hw(yy),Ls=(.25+rng()*.15)*hw,x0=W.cx(yy)+side*hw,x1=W.cx(yy)+side*(hw-Ls);add({t:'str',x0,y0:yy,x1,y1:yy+Ls*.5,y:yy+Ls*.25});}
    else{const n=1+Math.floor(rng()*2);for(let i=0;i<n;i++){const y2=yy+i*60;add({t:'rock',x:X(side*(.55+rng()*.3),y2),y:y2,r:10+rng()*12});}
      add({t:'wave',x:X((rng()-.5)*.6,yy+120),y:yy+120,w:.1*W.hw(yy),h:.15});}
  }}
  for(const f of W.feats){if(f.t!=='rock'||f.tall)continue;const c=W.cx(f.y),h=W.hw(f.y),o=f.x-c;if(Math.abs(o)+f.r>h-75)f.x=c+Math.sign(o)*Math.max(Math.abs(o),h-f.r*.5);}
  W.feats=W.feats.filter(f=>!(f.t==='rock'&&!f.tall&&W.marks.some(m=>Math.abs(m.y-f.y)<140)));
  W.feats.sort((a,b)=>a.y-b.y);
  // 3D chunks
  W.chunks=[];
  if(d3&&d3!=='off'){const thr=d3==='all'?0:.5,raw=[];
    for(const r of W.rapids)if(r.s>=thr)raw.push({y0:r.y0-650,y1:r.y1+350,title:r.n});
    for(const mk of W.marks)raw.push({y0:mk.y-700,y1:mk.y+450,title:mk.n});
    for(const b of W.bridges)raw.push({y0:b.y-700,y1:b.y+400,title:b.n});
    raw.sort((a,b)=>a.y0-b.y0);
    for(const c of raw){const l=W.chunks[W.chunks.length-1];if(l&&c.y0<l.y1+700&&c.y1-l.y0<6500){l.y1=Math.max(l.y1,c.y1);if(!l.title.includes(c.title))l.title+=' → '+c.title;}else W.chunks.push({...c});}
    for(const c of W.chunks){c.y0=Math.max(300,c.y0);c.y1=Math.min(W.len-50,c.y1);}}
  // deco
  for(let yy=-900;yy<W.len+1600;yy+=80){for(const side of[-1,1]){
    W.deco.push({k:'blob',y:yy+rngG()*80,side,off:60+rngG()*420,s:18+rngG()*60,sh:rngG(),a:rngG()*3});
    if(rngG()<.55)W.deco.push({k:R.trees?'tree':'bush',y:yy+rngG()*80,side,off:(R.trees?-14:2)+rngG()*40,s:R.trees?14+rngG()*16:5+rngG()*8,sh:rngG()});
    if(rngG()<.2)W.deco.push({k:'boulder',y:yy+rngG()*80,side,off:-4+rngG()*24,s:6+rngG()*12,sh:rngG()});}}
  W.deco.sort((a,b)=>a.y-b.y);
  W.miles=[];for(let m=Math.ceil(R.start);m<=Math.floor(R.end);m++){const yy=W.yAtMile(m);if(yy!==null)W.miles.push({m,y:yy});}
  return W;
}

/* ================= AUDIO ================= */
const AU={ctx:null,muted:false,
  init(){if(this.ctx)return;try{const C=window.AudioContext||window.webkitAudioContext;this.ctx=new C();const sr=this.ctx.sampleRate,len=sr*2,buf=this.ctx.createBuffer(1,len,sr),d=buf.getChannelData(0);let last=0;for(let i=0;i<len;i++){const w=Math.random()*2-1;last=(last+.02*w)/1.02;d[i]=last*3.5+w*.12;}
    this.noise=buf;const src=this.ctx.createBufferSource();src.buffer=buf;src.loop=true;this.filt=this.ctx.createBiquadFilter();this.filt.type='lowpass';this.filt.frequency.value=500;this.gain=this.ctx.createGain();this.gain.gain.value=0;src.connect(this.filt).connect(this.gain).connect(this.ctx.destination);src.start();}catch(e){this.ctx=null;}},
  resume(){try{this.ctx&&this.ctx.resume();}catch(e){}},
  suspend(){try{this.ctx&&this.ctx.suspend();}catch(e){}},
  roar(v){if(!this.ctx)return;const t=this.ctx.currentTime;this.gain.gain.setTargetAtTime(this.muted?0:.05+.4*v,t,.25);this.filt.frequency.setTargetAtTime(380+1900*v,t,.3);},
  burst(freq,q,vol,dur){if(!this.ctx||this.muted)return;try{const s=this.ctx.createBufferSource();s.buffer=this.noise;const f=this.ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=freq;f.Q.value=q;const g=this.ctx.createGain(),t=this.ctx.currentTime;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.08);g.gain.exponentialRampToValueAtTime(.001,t+dur);s.connect(f).connect(g).connect(this.ctx.destination);s.start(t,Math.random()*1.2,dur+.1);}catch(e){}},
  splash(v){this.burst(700+v*1200,1,Math.min(.7,.15+v*.5),.5);},
  thunk(v){if(!this.ctx||this.muted)return;try{const o=this.ctx.createOscillator(),g=this.ctx.createGain(),t=this.ctx.currentTime;o.type='triangle';o.frequency.setValueAtTime(140,t);o.frequency.exponentialRampToValueAtTime(45,t+.25);g.gain.setValueAtTime(Math.min(.8,.2+v),t);g.gain.exponentialRampToValueAtTime(.001,t+.3);o.connect(g).connect(this.ctx.destination);o.start(t);o.stop(t+.32);}catch(e){}},
  cheer(v){if(!this.ctx||this.muted)return;for(let i=0;i<5;i++)setTimeout(()=>this.burst(900+Math.random()*1400,2.5,.25*v,1.3),i*90);
    try{for(let i=0;i<3;i++){const o=this.ctx.createOscillator(),g=this.ctx.createGain(),t=this.ctx.currentTime+i*.12;o.type='sawtooth';o.frequency.setValueAtTime(500+Math.random()*300,t);o.frequency.exponentialRampToValueAtTime(900+Math.random()*400,t+.5);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.05*v,t+.1);g.gain.exponentialRampToValueAtTime(.001,t+.7);o.connect(g).connect(this.ctx.destination);o.start(t);o.stop(t+.75);}}catch(e){}},
  chime(){if(!this.ctx||this.muted)return;try{const t=this.ctx.currentTime;[660,880].forEach((f,i)=>{const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(.0001,t+i*.12);g.gain.exponentialRampToValueAtTime(.12,t+i*.12+.02);g.gain.exponentialRampToValueAtTime(.001,t+i*.12+.6);o.connect(g).connect(this.ctx.destination);o.start(t+i*.12);o.stop(t+i*.12+.65);});}catch(e){}}
};

/* ================= CANVAS ================= */
const cv=$('game'),ctx=cv.getContext('2d');
let VW=innerWidth,VH=innerHeight,DPR=Math.min(2,window.devicePixelRatio||1);
function calcScale(R){return clamp(Math.min(VW/(R.width*1.13+140),VH/1250),.33,1.1);}
function resize(){VW=innerWidth;VH=innerHeight;DPR=Math.min(2,window.devicePixelRatio||1);cv.width=Math.round(VW*DPR);cv.height=Math.round(VH*DPR);if(G)G.scale=calcScale(G.river);
  try{if(R3){R3.renderer.setSize(VW,VH,false);R3.camera.aspect=VW/VH;R3.camera.fov=VW<VH?74:60;R3.camera.updateProjectionMatrix();}}catch(e){}}
addEventListener('resize',resize);

/* ================= CRAFT DRAWING (2D) ================= */
function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}
function person(c,x,y,col){c.fillStyle=col;c.beginPath();c.arc(x,y,6.5,0,7);c.fill();c.fillStyle='#f1c27d';c.beginPath();c.arc(x,y-1,3.8,0,7);c.fill();c.fillStyle='rgba(0,0,0,.25)';c.beginPath();c.arc(x,y-2.5,3.8,Math.PI,0);c.fill();}
function oars(c,ox,oy,len,ph){const a=Math.sin(ph)*.55;for(const s of[-1,1]){c.save();c.translate(s*ox,oy);c.rotate(s*a);c.strokeStyle='#e2d2ab';c.lineWidth=3;c.beginPath();c.moveTo(-s*8,0);c.lineTo(s*len,0);c.stroke();c.fillStyle='#e2d2ab';c.beginPath();c.ellipse(s*len,0,8,3.5,0,0,7);c.fill();c.restore();}}
function drawCraft(c,key,ph,flipped,nPeople){
  const k=CRAFTS[key],L=k.len,Wd=k.wid;c.save();c.lineJoin='round';const np=nPeople===undefined?9:nPeople;
  if(key==='raft'){
    if(!flipped)oars(c,Wd/2,2,36,ph);
    rr(c,-Wd/2,-L/2,Wd,L,Wd/2.2);c.fillStyle=flipped?'#3b3f44':'#f0b429';c.fill();c.lineWidth=2;c.strokeStyle='rgba(0,0,0,.4)';c.stroke();
    if(!flipped){rr(c,-Wd/2+8,-L/2+8,Wd-16,L-16,12);c.fillStyle='#2f3d48';c.fill();c.fillStyle='#d99a1a';c.fillRect(-Wd/2+5,-L*.2,Wd-10,6);c.fillRect(-Wd/2+5,L*.2,Wd-10,6);c.fillStyle='#9aa4ab';c.fillRect(-Wd/2+3,-2,Wd-6,5);
      person(c,0,8,'#e74c3c');if(np>1)person(c,-9,-L*.3,'#2ecc71');if(np>2)person(c,9,-L*.3,'#3498db');}
  }else if(key==='dory'){
    if(!flipped)oars(c,Wd*.42,4,38,ph);
    c.beginPath();c.moveTo(0,-L/2);c.bezierCurveTo(Wd*.62,-L*.3,Wd*.62,L*.25,Wd*.24,L/2);c.lineTo(-Wd*.24,L/2);c.bezierCurveTo(-Wd*.62,L*.25,-Wd*.62,-L*.3,0,-L/2);c.closePath();
    c.fillStyle=flipped?'#6d7b7c':'#f6f1e6';c.fill();c.lineWidth=3;c.strokeStyle=flipped?'#444':'#c0392b';c.stroke();
    if(!flipped){c.fillStyle='#2e86c1';c.beginPath();c.ellipse(0,-L*.3,Wd*.2,L*.1,0,0,7);c.fill();c.beginPath();c.ellipse(0,L*.32,Wd*.2,L*.08,0,0,7);c.fill();
      c.fillStyle='#8b5a2b';c.fillRect(-Wd*.38,-3,Wd*.76,5);person(c,0,8,'#e67e22');if(np>1)person(c,0,-L*.13,'#16a085');}
  }else if(key==='kayak'){
    c.beginPath();c.moveTo(0,-L/2);c.quadraticCurveTo(Wd*1.05,0,0,L/2);c.quadraticCurveTo(-Wd*1.05,0,0,-L/2);c.closePath();
    c.fillStyle=flipped?'#7d1f15':'#e74c3c';c.fill();c.lineWidth=1.5;c.strokeStyle='rgba(0,0,0,.4)';c.stroke();
    if(!flipped){c.fillStyle='#1d1d1d';c.beginPath();c.ellipse(0,3,6,10,0,0,7);c.fill();
      c.save();c.translate(0,2);c.rotate(Math.sin(ph)*.6);c.strokeStyle='#ddd';c.lineWidth=2.5;c.beginPath();c.moveTo(-24,0);c.lineTo(24,0);c.stroke();c.fillStyle='#f1c40f';c.beginPath();c.ellipse(-24,0,3,7,0,0,7);c.fill();c.beginPath();c.ellipse(24,0,3,7,0,0,7);c.fill();c.restore();
      person(c,0,3,'#f39c12');c.fillStyle='#2980b9';c.beginPath();c.arc(0,1,4,0,7);c.fill();}
  }else{
    c.strokeStyle=flipped?'#555':'#1c1c1c';c.lineWidth=11;c.beginPath();c.arc(0,0,Wd/2-6,0,7);c.stroke();
    c.strokeStyle='rgba(255,255,255,.18)';c.lineWidth=3;c.beginPath();c.arc(0,0,Wd/2-8,3.6,5.2);c.stroke();
    if(!flipped){c.strokeStyle='#2c3e50';c.lineWidth=5;c.beginPath();c.moveTo(-4,0);c.lineTo(-6,-L/2+4);c.moveTo(4,0);c.lineTo(6,-L/2+4);c.stroke();
      c.fillStyle='#ecf0f1';c.beginPath();c.arc(-6,-L/2+3,3.5,0,7);c.arc(6,-L/2+3,3.5,0,7);c.fill();person(c,0,6,'#e84393');}
  }
  c.restore();
}

/* ================= SETTINGS + MENU ================= */
const sel=Object.assign({craft:'raft',river:'gray',level:'med',d3:'big',mode:'day',facts:true,name:'Boatman'},store.get('riverrun_settings',{}));
if(!RIVERS.some(r=>r.id===sel.river))sel.river='gray';
function saveSel(){store.set('riverrun_settings',sel);}
function riverOK(R,mode){return !(R.dayOnly&&mode!=='day');}
function buildMenu(){
  saveSel();
  $('pname').value=sel.name;
  // modes
  const mg=$('modes');mg.innerHTML='';
  for(const [k,m] of Object.entries(MODES)){const b=document.createElement('button');b.className='pill wide'+(sel.mode===k?' sel':'');b.innerHTML=`${m.name}<small>${m.desc}</small>`;b.onclick=()=>{sel.mode=k;if(!riverOK(RIVERS.find(r=>r.id===sel.river),k))sel.river=RIVERS.find(r=>riverOK(r,k)).id;buildMenu();};mg.appendChild(b);}
  // crafts
  const cg=$('crafts');cg.innerHTML='';
  for(const [k,c] of Object.entries(CRAFTS)){
    const d=document.createElement('div');d.className='card'+(sel.craft===k?' sel':'');
    const pc=document.createElement('canvas');pc.width=180;pc.height=200;pc.style.width='90px';pc.style.height='100px';
    const x=pc.getContext('2d');x.scale(2,2);x.translate(45,50);x.fillStyle='rgba(63,127,111,.35)';x.beginPath();x.arc(0,0,44,0,7);x.fill();drawCraft(x,k,.6,false);
    d.appendChild(pc);d.insertAdjacentHTML('beforeend',`<div class="tag">${c.tag}</div><h3>${c.name}</h3><p>${c.desc}</p>`);
    d.onclick=()=>{sel.craft=k;buildMenu();};cg.appendChild(d);}
  // rivers + leaderboards
  const rg=$('rivers');rg.innerHTML='';
  for(const R of RIVERS){
    const hi=R.rapids.reduce((a,r)=>sev(R,r.c)>sev(R,a.c)?r:a),lo=R.rapids.reduce((a,r)=>sev(R,r.c)<sev(R,a.c)?r:a);
    const ok=riverOK(R,sel.mode),tops=LB.top(R.id,sel.mode,'score',3),fast=LB.top(R.id,sel.mode,'time',1)[0];
    const d=document.createElement('div');d.className='card river'+(sel.river===R.id?' sel':'')+(ok?'':' dim');
    const lbRows=tops.length?tops.map((t,i)=>`<div class="lbr"><span>${['🥇','🥈','🥉'][i]} ${esc(t.name)}</span><span>${CRAFTS[t.craft]?CRAFTS[t.craft].name.split(' ').pop():''}</span><b>${t.score}</b></div>`).join(''):'<div class="lbr empty">No runs yet. Be the first!</div>';
    d.innerHTML=`<div class="tag">${R.scale==='gc'?`CLASS ${lo.c}–${hi.c} / 10`:`CLASS ${lo.c}–${hi.c}`}</div><h3>${R.name}</h3><div class="where">${R.river} · ${R.stretch}</div><p>${R.blurb}</p>
      <div class="lb"><div class="lbh">🏆 Top ${MODES[sel.mode].name} scores</div>${lbRows}<div class="lbf">⏱ Fastest: ${fast?`<b>${fmtTime(fast.time)}</b> · ${esc(fast.name)}`:'—'}</div></div>
      ${ok?`<button class="run">▶ Run this river</button>`:`<div class="note2">Day trip only (no camping in this canyon).</div>`}`;
    d.onclick=e=>{if(!ok)return;sel.river=R.id;if(e.target.classList.contains('run')){startFlow();return;}buildMenu();};
    rg.appendChild(d);}
  const R=RIVERS.find(r=>r.id===sel.river);
  $('seasonNote').textContent=`${R.name}: ${R.season}`;
  const lg=$('levels');lg.innerHTML='';
  LEVEL_KEYS.forEach((k,i)=>{const b=document.createElement('button');b.className='pill'+(sel.level===k?' sel':'');
    b.innerHTML=`${LEVELS[k].name}<small>${(R.cfs[i]||0).toLocaleString()} cfs · ${LEVELS[k].note}</small>`;b.onclick=()=>{sel.level=k;buildMenu();};lg.appendChild(b);});
  const dg=$('d3');dg.innerHTML='';
  [['big','Big rapids','Class III+ / GC 5+, landmarks, bridges'],['all','Every rapid','more 3D, more paddling'],['off','Off','2D only']].forEach(([k,n,dd])=>{const b=document.createElement('button');b.className='pill'+(sel.d3===k?' sel':'');b.innerHTML=`${n}<small>${HAS3D()||k==='off'?dd:'needs internet (three.js)'}</small>`;b.onclick=()=>{sel.d3=k;buildMenu();};dg.appendChild(b);});
  $('factsBtn').textContent=sel.facts?'📜 History & facts: ON':'📜 History & facts: OFF';
  $('factsBtn').classList.toggle('sel',sel.facts);
  $('startBtn').textContent=`Launch: ${R.name} (${MODES[sel.mode].name})`;
}
$('pname').addEventListener('input',e=>{sel.name=(e.target.value||'Boatman').slice(0,18);saveSel();});
$('factsBtn').onclick=()=>{sel.facts=!sel.facts;buildMenu();};

/* leaderboard page */
async function showLeaderboards(){
  const w=$('lbWrap');let html=`<h1>Leader<span>boards</span></h1><div class="sub">${LEADERBOARD_REMOTE.enabled?'Global scores (all players).':'Scores on this device. See README.md to make them global.'}</div><div class="row" id="lbModes"></div><div id="lbTables" class="grid"></div><button class="big" id="lbBack">Back</button>`;
  w.innerHTML=html;$('lbBack').onclick=()=>{$('lbScreen').style.display='none';};
  const mrow=$('lbModes');for(const [k,m] of Object.entries(MODES)){const b=document.createElement('button');b.className='pill'+(sel.mode===k?' sel':'');b.textContent=m.name;b.onclick=()=>{sel.mode=k;showLeaderboards();};mrow.appendChild(b);}
  const t=$('lbTables');
  for(const R of RIVERS){if(!riverOK(R,sel.mode))continue;
    let sc=await LB.remoteTop(R.id,sel.mode,'score'),tm=await LB.remoteTop(R.id,sel.mode,'time');
    if(!sc)sc=LB.top(R.id,sel.mode,'score',5);if(!tm)tm=LB.top(R.id,sel.mode,'time',5);
    const row=(r,i,v)=>`<div class="lbr"><span>${i+1}. ${esc(r.name)}</span><span>${CRAFTS[r.craft]?CRAFTS[r.craft].name:''}</span><b>${v}</b></div>`;
    const d=document.createElement('div');d.className='card river';
    d.innerHTML=`<h3>${R.name}</h3><div class="lb"><div class="lbh">🏆 Most points</div>${sc.length?sc.map((r,i)=>row(r,i,r.score)).join(''):'<div class="lbr empty">No runs yet.</div>'}
      <div class="lbh">⏱ Fastest trips</div>${tm.length?tm.map((r,i)=>row(r,i,fmtTime(r.time))).join(''):'<div class="lbr empty">No finished runs yet.</div>'}</div><button class="run">▶ Run this river</button>`;
    d.querySelector('.run').onclick=()=>{sel.river=R.id;$('lbScreen').style.display='none';buildMenu();startFlow();};
    t.appendChild(d);}
  $('lbScreen').style.display='block';
}
$('lbBtn').onclick=showLeaderboards;

/* ================= GAME STATE ================= */
let G=null;
const T={left:false,right:false,push:false,pull:false};
const K={};
const MS={x:0,y:0,in:false,left:false,right:false,sq:false,lastDown:0,lastStroke:0};
function startFlow(){
  const R=RIVERS.find(r=>r.id===sel.river);
  if(!riverOK(R,sel.mode))return;
  saveSel();
  if(sel.mode==='expedition')TRIP.openOutfitter(R,()=>startGame());
  else startGame();
}
function startGame(levelOverride){
  AU.init();AU.resume();
  const R=RIVERS.find(r=>r.id===sel.river),c=CRAFTS[sel.craft];
  const lvKey=levelOverride||sel.level,lv=LEVELS[lvKey];
  const use3d=sel.d3!=='off'&&HAS3D();if(use3d){try{init3D();}catch(e){console.warn(e);}}
  if(G)cleanup3D();
  const W=buildWorld(R,lvKey,use3d&&R3?sel.d3:'off');
  G={W,river:R,craft:c,ck:sel.craft,lvl:lv,lvlKey:lvKey,mode:sel.mode,scale:calcScale(R),
    b:{x:W.cx(250),y:250,vx:0,vy:R.speed*.7,h:0,av:0,bounce:0,oar:0},
    hpMax:Math.round(c.hp*lv.hp),hp:Math.round(c.hp*lv.hp),swims:0,score:0,t:0,state:'run',flipT:0,inv:0,shake:0,
    parts:[],streaks:[],holeIds:new Set(),latIn:new Set(),curHole:null,holeTick:0,maxY:250,clean:0,hits:0,toastT:0,lastHitT:-9,bannerT:0,hudT:0,view:{y0:0,y1:1000},cause:'',
    stallY:250,stallT:0,flush:0,use3d:use3d&&!!R3,mode3d:false,slowT:0,strokeReady:0,strokeBuf:null,lastSide:0,lastStrokeT:-9,rhythm:0,sa:{L:{t:1,back:false},R:{t:1,back:false}},
    poiIdx:0,pageQ:[],factQ:[],factT:0,swim:null,debris:[],debrisT:2,windT:8+Math.random()*10,gust:0,gustDir:0,cheer:0,cheerBig:false,flowMul:1,oarLost:false,lost:[],mobCount:0,rescues:0,
    camera:{camH:0},bsx:VW/2,bsy:VH*.74};
  for(let i=0;i<190;i++)G.streaks.push({x:0,y:-1e9});
  for(const id of ['menu','end','pause','lbScreen','campScreen','pageScreen','outfit'])$(id).style.display='none';
  $('hud').style.display='flex';$('hbtns').style.display='flex';
  $('controls').style.display=isTouch()?'flex':'none';
  hideBanner();
  if(G.use3d)prep3DBoat();
  TRIP.setup(G);
  if(!isTouch()&&!store.get('riverrun_mousetip',false)){toast('Mouse: hold LEFT = row toward pointer · hold RIGHT = pull toward pointer · double-click & hold = square up','#cfe3e0',6);store.set('riverrun_mousetip',true);}
}
/* Rebuild the river at a new water level (used after a flood at camp). */
function rebuildLevel(lvKey){
  const old=G.W,R=G.river;cleanup3D();
  const W=buildWorld(R,lvKey,G.use3d&&R3?sel.d3:'off');
  W.rapids.forEach((r,i)=>{const o=old.rapids[i];if(o){r.done=o.done;r.clean=o.clean;r.announced=o.announced;}});
  W.chunks.forEach(ch=>{if(ch.y1<G.b.y)ch.done=true;});
  G.W=W;G.lvl=LEVELS[lvKey];G.lvlKey=lvKey;G.holeIds=new Set();
  G.poiIdx=0;while(G.poiIdx<W.pois.length&&W.pois[G.poiIdx].y<G.b.y-200)G.poiIdx++;
  TRIP.remapCamps(old,W);
}

/* ================= WATER PHYSICS =================
   - The fast core shifts to the outside of bends; surface water drifts outward (helical flow).
   - Eddies form on the inside of sharp bends, behind rocks and at camp beaches; their water flows upstream.
   - Water piles up on the upstream face of rocks (pillow) and splits around them.
   - Holes recirculate. Boils push water out from a center. Laterals shove sideways. */
function flowAt(x,y){
  const W=G.W,c=W.cx(y),hw=W.hw(y),t=(x-c)/hw,ri=W.rint(y),B=G.river.speed*G.lvl.speed*G.flowMul;
  const k2=W.ddcx(y),off=clamp(-k2*900,-.35,.35),tt=t-off;
  const prof=Math.max(.15,1-.7*tt*tt);
  let vy=B*(1+ri*1.15)*prof,vx=vy*W.dcx(y)-k2*vy*vy*2;
  const ins=Math.sign(k2)||1,e=smooth((t*ins-.76)/.16)*smooth((Math.abs(k2)-1.1e-4)/1.2e-4)*(1-ri);
  if(e>0)vy=lerp(vy,-.3*B,e);
  for(const cp of W.camps){const dy=y-cp.y;if(dy>-170&&dy<150){const tb=t*cp.side;if(tb>.62){const k=smooth((tb-.62)/.2)*(1-Math.abs(dy)/170);vy=lerp(vy,-.25*B,k);vx+=cp.side*25*k;}}}
  const F=W.feats;
  for(let i=lowerIdx(F,y-260);i<F.length&&F[i].y<y+260;i++){const f=F[i];
    if(f.t==='rock'){const dy=y-f.y,dx=x-f.x,r=f.r;
      if(dy>0&&dy<r*3&&Math.abs(dx)<r*1.15){const k=1-dy/(r*3);vy*=1-1.3*k;vx-=dx*.9*k;}
      else if(dy<0&&dy>-r*1.6&&Math.abs(dx)<r*1.2){const k=1+dy/(r*1.6);vx+=Math.sign(dx||1)*75*k;vy*=1-.35*k;}}
    else if(f.t==='hole'){const e2=((x-f.x)/f.rx)**2+((y-f.y)/f.ry)**2;if(e2<1){vy=B*(.25-.75*f.pow);vx+=(f.x-x)*1.2;}}
    else if(f.t==='boil'){const dx=x-f.x,dy=y-f.y,d=Math.hypot(dx,dy);if(d<f.r){const k=1-d/f.r;vx+=dx/f.r*90*f.pow*k+Math.sin(G.t*1.3+f.id)*30*k;vy=vy*(1-.5*k)+dy/f.r*60*f.pow*k;}}
    else if(f.t==='lat'){if(segDist(x,y,f.x0,f.y0,f.x1,f.y1)<18)vx+=f.dir*f.pow*110;}
    else if(f.t==='tongue'){const dy=y-f.y;if(dy>0&&dy<f.len&&Math.abs(x-f.x)<f.w*(1-dy/f.len))vy*=1.15;}
  }
  return {vx,vy,ri};
}
function sideRisk(){const s=Math.abs(Math.sin(G.b.h)),ts=Math.sin(G.craft.tol*Math.PI/180);return smooth((s-ts*.7)/(ts*.6+.25));}
function curRapid(y){for(const r of G.W.rapids)if(y>=r.y0-60&&y<=r.y1+60)return r;return null;}
function inCalm(){return !curRapid(G.b.y)&&!G.mode3d&&!G.swim&&G.state==='run'&&!G.curHole&&G.W.rint(G.b.y)<.05;}
function ffOK(){const b=G.b,W=G.W;if(!inCalm()||G.pageQ.length)return false;
  if(W.rapids.some(r=>!r.done&&r.y0-b.y<1600&&r.y0>b.y-100))return false;
  const o=TRIP.todays();if(o&&o.some(c=>!c.rejected&&c.y-b.y<1900&&c.y>b.y-200))return false;
  const p=W.pois[G.poiIdx];if(p&&sel.facts&&!SEEN.has(p.id)&&p.y-b.y<900)return false;
  if(W.bridges.some(br=>br.y-b.y<900&&br.y>b.y))return false;return b.y<W.len-900;}
function toggleFF(){if(!G||G.state!=='run')return;if(!G.ff&&!ffOK()){toast('Fast-forward works in calm water only','#cfe3e0',1.2);return;}G.ff=!G.ff;$('bFF').classList.toggle('on',G.ff);if(G.ff)toast('⏩ Fast-forward','#cfe3e0',.8);}
function powerMul(){return (G.swim?.85:1)*(G.oarLost?.6:1)*TRIP.powerMul();}

/* ================= MESSAGES ================= */
function toast(txt,col,dur){const el=$('toast');el.textContent=txt;el.style.color=col||'#fff';el.style.opacity=1;el.style.fontSize=txt.length>40?'clamp(15px,3.5vw,22px)':'';if(G)G.toastT=dur||1.3;else setTimeout(()=>el.style.opacity=0,(dur||1.3)*1000);}
function showBanner(r){const el=$('banner');el.innerHTML=`<div class="bc">Scout · ${clsText(G.river,r.c)} · Mile ${r.m}</div><div class="bt">${r.n}</div><div class="bb">${r.beta}</div>`;el.style.display='block';G.bannerT=7;}
function hideBanner(){$('banner').style.display='none';}
$('banner').onclick=hideBanner;
function showFact(p){const el=$('fact');el.innerHTML=`<div class="fk">${KIND_ICON[p.k]||'📍'} Mile ${p.m} · ${p.k==='town'?'Town & access':p.k==='geo'?'Geology':p.k==='nat'?'Nature':p.k==='art'?'Rock art':p.k==='fest'?'Festival':p.k==='warn'?'River note':'History'}</div><div class="ft">${esc(p.n)}</div><div class="fb">${esc(p.txt)}</div>`;el.style.display='block';G.factT=9;AU.chime();}
function hideFact(){$('fact').style.display='none';G&&(G.factT=0);}
$('fact').onclick=hideFact;
function openPage(p){
  const w=$('pageWrap');
  w.innerHTML=`<div class="pk">${KIND_ICON[p.k]||'📍'} ${esc(G.river.name)} · Mile ${p.m}</div><h1>${esc(p.n)}</h1><div class="sub">${esc(p.page.sub)}</div>${p.page.body.map(t=>`<p>${esc(t)}</p>`).join('')}
   <div class="note">Short summary for the game. See local guidebooks and land agencies for more.</div><button class="big" id="pageBack">Back on the river</button><button class="ghost" id="pageOff">Turn off history pages</button>`;
  G.prevState=G.state;G.state='page';$('pageScreen').style.display='block';AU.chime();
  $('pageBack').onclick=closePage;$('pageOff').onclick=()=>{sel.facts=false;saveSel();closePage();};
}
function closePage(){$('pageScreen').style.display='none';if(G&&G.state==='page')G.state='run';}

/* ================= STROKES (3D paddle mode) ================= */
function backMod(){return !!(K.arrowdown||K.s||T.pull||MS.right);}
function queueStroke(kind,back){if(!G||!G.mode3d||!G.craft.pd||G.state!=='run')return;if(G.t>=G.strokeReady)doStroke(kind,back);else if(G.strokeReady-G.t<.16)G.strokeBuf={kind,back};}
function doStroke(kind,backOv){
  const b=G.b,P=G.craft.pd,back=backOv===undefined?backMod():backOv,pm=powerMul();
  let side=kind==='L'?-1:kind==='R'?1:0;
  if(side===0&&!P.bothJ)side=G.lastSide===-1?1:-1;
  let J,yaw=0,cd;
  if(side===0){J=back?-P.bothB:P.bothJ;cd=P.bothCd;}
  else{J=back?-P.Jb:P.J;yaw=-side*P.yaw*(back?-1:1);cd=P.cd;if(side===G.lastSide){J*=P.same;yaw*=P.same;}}
  const gap=G.t-G.lastStrokeT;
  if(gap>cd*.95&&gap<cd*2.3){G.rhythm=Math.min(9,G.rhythm+1);J*=1+.03*Math.min(4,G.rhythm);}else G.rhythm=0;
  J*=pm;
  b.vx+=Math.sin(b.h)*J;b.vy+=Math.cos(b.h)*J;b.av+=yaw;
  G.strokeReady=G.t+cd;G.lastSide=side;G.lastStrokeT=G.t;
  if(side<=0){G.sa.L.t=0;G.sa.L.back=back;}if(side>=0){G.sa.R.t=0;G.sa.R.back=back;}
  const px=b.x+Math.cos(b.h)*(side||1)*G.craft.wid*.7,py=b.y-Math.sin(b.h)*(side||1)*G.craft.wid*.7;splash(px,py,4,.35);
}
/* Mouse "smart stroke": choose the side that turns the boat toward the pointer. */
function smartStroke(back){
  const tgt=mouseTarget(back);if(tgt===null)return;
  const d=angDiff(tgt,G.b.h);let kind;
  if(Math.abs(d)<.22)kind='B';else if(!back)kind=d>0?'L':'R';else kind=d>0?'R':'L';
  queueStroke(kind,back);
}
function mouseTarget(back){
  if(!G)return null;
  if(MS.sq){const a=Math.abs(angDiff(0,G.b.h))<Math.PI/2?0:Math.PI;return a;}
  const dx=MS.x-G.bsx,dy=MS.y-G.bsy;if(Math.hypot(dx,dy)<12)return null;
  let a=Math.atan2(dx,-dy)+(G.mode3d?G.camera.camH:0);if(back)a+=Math.PI;return a;
}

/* ================= FLIPS, HITS, SWIMMERS ================= */
function splash(x,y,n,pow){const base3=G.mode3d?heightAt(x,y,G.t):0;for(let i=0;i<n;i++){const a=Math.random()*6.28,s=40+Math.random()*140*pow;G.parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,z:0,vz:40+Math.random()*130*pow,base:base3,life:0,max:.4+Math.random()*.5,size:2+Math.random()*4*pow});}}
function nearCrowd(){for(const c of G.W.crowds)if(Math.abs(c.y-G.b.y)<550)return c;return null;}
function hit(dmg,msg,x,y,impact){
  dmg*=TRIP.dmgMul();
  G.hp=Math.max(0,G.hp-dmg);G.shake=Math.min(14,4+dmg);G.hits++;
  const r=curRapid(G.b.y);if(r&&dmg>2)r.clean=false;
  splash(x,y,10,clamp(impact/150,.4,1.5));AU.thunk(clamp(impact/250,.1,.6));
  if(G.t-G.lastHitT>.6&&dmg>=2){toast(`${msg} −${Math.round(dmg)}`,'#ff8a7a',.9);G.lastHitT=G.t;}
  if(impact>110)maybeMOB(.2);
  if(G.hp<=0){const m={raft:'Tube popped. The raft is done.',dory:'Hull stove in. The dory is done.',kayak:'Cracked hull. The kayak is done.',tube:'Your tube popped!'}[G.ck];
    if(TRIP.canRepairOnRiver()){G.hp=Math.round(G.hpMax*.35);toast('Emergency repair! Used a repair kit.','#ffd36b',1.6);return;}
    setTimeout(()=>endGame(false,m),700);G.state='flip';G.flipT=99;}
}
function flip(cause){
  if(G.state!=='run'||G.inv>0)return;
  const r=curRapid(G.b.y);
  if(G.craft.roll&&Math.random()<G.craft.roll){toast('COMBAT ROLL! +50','#5fd38d',1.2);G.score+=50;G.inv=1.2;G.b.av*=.3;G.b.h*=.5;AU.splash(.6);return;}
  if(r)r.clean=false;
  G.state='flip';G.flipT=2.2;G.swims++;G.score=Math.max(0,G.score-150);G.cause=cause;G.swim=null;
  toast(G.ck==='tube'?`FLUSHED! ${cause}`:`FLIPPED! ${cause}`,'#ff6b5b',2);
  splash(G.b.x,G.b.y,30,1.4);AU.splash(1);G.shake=12;
  const cr=nearCrowd();if(cr){G.cheer=3;G.cheerBig=true;AU.cheer(1.4);setTimeout(()=>{if(G)toast('The crowd ROARS! Carnage bonus +50','#ffd36b',1.8);},900);G.score+=50;}
  TRIP.onFlip(cause);
}
function respawn(){
  if(G.swims>=TRIP.maxSwims()){endGame(false,TRIP.swimEndText());return;}
  const W=G.W,b=G.b;b.y+=130;
  for(let i=0;i<6;i++){let bad=false;const F=W.feats;for(let j=lowerIdx(F,b.y-120);j<F.length&&F[j].y<b.y+120;j++){const f=F[j];if((f.t==='hole'||f.t==='rock')&&Math.abs(f.y-b.y)<(f.ry||f.r)+50)bad=true;}if(!bad)break;b.y+=80;}
  b.x=W.cx(b.y);b.h=0;b.av=0;const f=flowAt(b.x,b.y);b.vx=f.vx;b.vy=Math.max(60,f.vy);
  G.state='run';G.inv=1.5;G.curHole=null;G.stallY=b.y;G.stallT=0;
  toast('Back in the boat','#fff',1);
}
const SWIM_NAMES=['Sam','Jo','Alex','Riley','Casey','Max','Kit','Lou'];
function maybeMOB(p){
  if(G.swim||G.state!=='run'||G.craft.crew<2||G.inv>0||Math.random()>p)return;
  const name=TRIP.pickSwimmer()||SWIM_NAMES[Math.floor(Math.random()*SWIM_NAMES.length)];
  const b=G.b,s=Math.random()<.5?-1:1;
  G.swim={x:b.x+Math.cos(b.h)*s*(G.craft.wid*.6+12),y:b.y-Math.sin(b.h)*s*(G.craft.wid*.6+12),t:0,name,lost:0};
  G.mobCount++;toast(`MAN OVERBOARD! ${name} is swimming — row to them!`,'#ff8c1a',2.2);AU.splash(.8);
  const r=curRapid(b.y);if(r)r.clean=false;
}
function updSwimmer(dt){
  const s=G.swim;if(!s)return;
  s.t+=dt;const f=flowAt(s.x,s.y);s.x+=f.vx*.92*dt+Math.sin(s.t*2)*8*dt;s.y+=f.vy*.92*dt;
  const W=G.W,c=W.cx(s.y),hw=W.hw(s.y);s.x=clamp(s.x,c-hw+10,c+hw-10);
  const loss=(G.river.id.startsWith('gc')?2.6:1.3)*dt;s.lost+=loss;TRIP.swimmerHurt(s.name,loss);
  const b=G.b,d=Math.hypot(b.x-s.x,b.y-s.y);
  if(d<G.craft.r+22&&G.state==='run'){G.swim=null;G.rescues++;const p=Math.max(40,Math.round(160-s.t*4));G.score+=p;toast(`Pulled ${s.name} back in! +${p}`,'#5fd38d',1.6);AU.chime();return;}
  if(s.t>32||s.y>W.len-120){G.swim=null;G.score=Math.max(0,G.score-150);toast(`${s.name} swam to shore. Lost time and points.`,'#ff8a7a',2);TRIP.swimmerHurt(s.name,12);}
}
function updDebris(dt){
  if(!G.lvl.debris)return;
  G.debrisT-=dt;const W=G.W,b=G.b;
  if(G.debrisT<=0){G.debrisT=2.5+Math.random()*3;const y=b.y+700+Math.random()*500;if(y<W.len)G.debris.push({x:W.cx(y)+(Math.random()*2-1)*W.hw(y)*.8,y,a:Math.random()*3,av:(Math.random()-.5)*.6,len:50+Math.random()*50,id:Math.random()});}
  for(let i=G.debris.length-1;i>=0;i--){const d=G.debris[i],f=flowAt(d.x,d.y);d.x+=f.vx*.95*dt;d.y+=f.vy*.95*dt;d.a+=d.av*dt;
    if(d.y<b.y-900){G.debris.splice(i,1);continue;}
    const x0=d.x-Math.cos(d.a)*d.len/2,y0=d.y-Math.sin(d.a)*d.len/2,x1=d.x+Math.cos(d.a)*d.len/2,y1=d.y+Math.sin(d.a)*d.len/2;
    if(G.state==='run'&&G.inv<=0&&segDist(b.x,b.y,x0,y0,x1,y1)<G.craft.r*.8+6){G.debris.splice(i,1);hit(12*G.craft.rockDmg,'Floating log!',b.x,b.y,120);if(Math.random()<.3)flip('Floating log');}}
}

/* ================= END GAME ================= */
function endGame(ok,reason){
  if(!G||G.state==='done')return;
  if(G.mode3d)exit3D();G.state='done';AU.roar(0);
  const total=G.W.rapids.length;let grade='DNF';
  const extra=TRIP.onEnd(ok);
  if(ok){const p=100-G.swims*25-(1-G.hp/G.hpMax)*30-(1-G.clean/total)*30+extra.gradeAdj;grade=p>=85?'A':p>=70?'B':p>=55?'C':'D';G.score+=Math.round(G.hp/G.hpMax*300)+extra.bonus;}
  const sc=Math.round(G.score);
  const run={id:Date.now()+'-'+Math.random().toString(36).slice(2,7),name:sel.name||'Boatman',river:G.river.id,craft:G.ck,mode:G.mode,level:G.lvlKey,score:sc,time:G.t,ok,swims:G.swims,grade,date:new Date().toISOString().slice(0,10)};
  LB.add(run);
  const rs=LB.rank(run,'score'),rt=ok?LB.rank(run,'time'):0;
  $('hud').style.display='none';$('hbtns').style.display='none';$('controls').style.display='none';hideBanner();hideFact();
  $('endWrap').innerHTML=`<h1>${ok?'Take-out!':'Trip over'}</h1><div class="sub">${ok?`${G.river.name} · ${G.craft.name} · ${MODES[G.mode].name} · ${G.lvl.name} water`:esc(reason)}</div>
   <div class="grade">${grade}</div>
   ${rs&&rs<=3?`<div class="rank">🏆 #${rs} for points on this river (${MODES[G.mode].name})</div>`:''}${rt&&rt<=3?`<div class="rank">⏱ #${rt} fastest trip</div>`:''}
   <div class="stats"><div><b>${sc}</b>Score</div><div><b>${fmtTime(G.t)}</b>River time</div><div><b>${G.clean}/${total}</b>Clean lines</div><div><b>${G.swims}</b>Swims</div><div><b>${Math.round(G.hp/G.hpMax*100)}%</b>Hull</div><div><b>${G.rescues}/${G.mobCount}</b>Rescues</div></div>
   ${extra.html||''}
   <button class="big" id="againBtn">Run it again</button><button class="ghost" id="endMenuBtn">Main menu & leaderboards</button>`;
  $('end').style.display='block';
  $('againBtn').onclick=()=>startFlow();$('endMenuBtn').onclick=toMenu;
  setTimeout(()=>AU.suspend(),400);
}
function toMenu(){if(G)cleanup3D();G=null;for(const id of ['hud','hbtns','controls','pause','end','campScreen','pageScreen','outfit','lbScreen'])$(id).style.display='none';hideBanner();$('fact').style.display='none';buildMenu();$('menu').style.display='block';AU.roar(0);}
function togglePause(){if(!G||['done','camp','page'].includes(G.state))return;
  if(G.state==='pause'){G.state=G.prevState;$('pause').style.display='none';AU.resume();}
  else{G.prevState=G.state;G.state='pause';$('pauseInfo').textContent=`${G.river.name} · Mile ${G.W.mileAt(G.b.y).toFixed(1)}${G.mode!=='day'?` · Day ${TRIP.day()}`:''}`;$('pFacts').textContent=sel.facts?'History & facts: ON':'History & facts: OFF';$('pause').style.display='block';AU.suspend();}}

/* ================= UPDATE ================= */
function update(dt){
  const b=G.b,c=G.craft,W=G.W;
  G.t+=dt;G.inv=Math.max(0,G.inv-dt);G.shake*=Math.pow(.02,dt);b.bounce*=Math.pow(.05,dt);G.cheer=Math.max(0,G.cheer-dt);
  updParts(dt);
  if(G.state==='flip'){G.flipT-=dt;const f=flowAt(b.x,b.y);b.x+=f.vx*dt*.7;b.y+=Math.max(30,f.vy)*dt*.7;b.h+=dt*1.5;if(G.flipT<=0)respawn();return;}
  const paddle=G.mode3d&&!!c.pd,pm=powerMul();
  if(paddle){for(const s of['L','R']){const a=G.sa[s];a.t=Math.min(1,a.t+dt/(c.pd.cd*1.6));}
    if(G.strokeBuf&&G.t>=G.strokeReady){const k2=G.strokeBuf;G.strokeBuf=null;doStroke(k2.kind,k2.back);}
    if((MS.left||MS.right||MS.sq)&&G.t>=G.strokeReady&&G.t-MS.lastStroke>c.pd.cd*1.15){MS.lastStroke=G.t;smartStroke(MS.right&&!MS.left);}}
  let L=!paddle&&(K.arrowleft||K.a||T.left),Rt=!paddle&&(K.arrowright||K.d||T.right);
  let push=paddle?(G.t-G.lastStrokeT<.45&&!backMod()):(K.arrowup||K.w||T.push),pull=!paddle&&(K.arrowdown||K.s||T.pull);
  let turn=(Rt?1:0)-(L?1:0);
  if(!paddle&&(MS.left||MS.right||MS.sq)){const tgt=mouseTarget(MS.right&&!MS.left);if(tgt!==null){const d=angDiff(tgt,b.h);turn=clamp(d*2.4,-1,1);}
    if(G.ff){G.ff=false;$('bFF').classList.remove('on');}
    if(MS.sq){push=false;pull=false;}else if(MS.left&&!MS.right){push=Math.abs(angDiff(tgt===null?b.h:tgt,b.h))<1.2;}else if(MS.right){pull=Math.abs(angDiff(tgt===null?b.h:tgt,b.h))<1.2;}}
  b.av+=turn*c.turn*dt;b.av*=1-(turn?1.2:3.2)*dt;
  const f=flowAt(b.x,b.y);
  b.av+=(Math.random()-.5)*f.ri*(G.ck==='tube'?14:7)*dt/c.mass;
  if(G.ck==='tube')b.av+=(Math.random()-.5)*3*dt;
  // eddy-line torque: different side-current at bow and stern spins the boat
  const dx=Math.sin(b.h),dy=Math.cos(b.h),px=Math.cos(b.h),py=-Math.sin(b.h),hl=c.len*.42;
  const fb=flowAt(b.x+dx*hl,b.y+dy*hl),fs=flowAt(b.x-dx*hl,b.y-dy*hl);
  b.av+=((fb.vx*px+fb.vy*py)-(fs.vx*px+fs.vy*py))/(2*hl)*1.4*dt/c.mass;
  b.av=clamp(b.av,-c.maxTurn*1.3,c.maxTurn*1.3);b.h+=b.av*dt;
  if(b.h>Math.PI)b.h-=2*Math.PI;if(b.h<-Math.PI)b.h+=2*Math.PI;
  // stall rescue
  if(b.y>G.stallY+30){G.stallY=b.y;G.stallT=0;}else{G.stallT+=dt;if(G.stallT>(TRIP.landing()?8:3.5)){G.stallT=0;G.flush=1.3;toast('The river spits you out','#cfe3e0',1);}}
  if(G.flush>0){G.flush-=dt;const B=G.river.speed*G.lvl.speed;f.vy=Math.max(f.vy,B*1.2);f.vx+=(W.cx(b.y)-b.x)*.8;b.y+=40*dt;}
  // hull: water drag along and across the hull (long hulls track straight)
  const kh=G.curHole&&G.flush<=0?1.6:1;
  const rx=b.vx-f.vx,ry=b.vy-f.vy;let al=rx*dx+ry*dy,la=rx*px+ry*py;
  al-=al*Math.min(1,c.kLong*kh*dt);la-=la*Math.min(1,c.kLat*kh*dt);
  b.vx=f.vx+al*dx+la*px;b.vy=f.vy+al*dy+la*py;
  if(push){b.vx+=dx*c.row*pm*dt;b.vy+=dy*c.row*pm*dt;}
  if(pull){b.vx-=dx*c.back*pm*dt;b.vy-=dy*c.back*pm*dt;}
  if(push||pull)b.oar+=dt*7;
  // wind
  if(G.river.wind){G.windT-=dt;if(G.windT<=0&&G.gust<=0&&!curRapid(b.y)){G.gust=5+Math.random()*5;G.gustDir=(Math.random()-.5)*.6;G.windT=20+Math.random()*25;if(!G.windSeen){G.windSeen=true;toast('Upstream wind! Row through it.','#cfe3e0',1.5);}}
    if(G.gust>0){G.gust-=dt;b.vy-=G.river.wind*45*dt;b.vx+=G.gustDir*30*dt;}}
  const py0=b.y;b.x+=b.vx*dt;b.y+=b.vy*dt;
  // banks
  const cx0=W.cx(b.y),hw=W.hw(b.y),lim=hw-c.r*.8,off=b.x-cx0;
  if(Math.abs(off)>lim){const s=Math.sign(off);b.x=cx0+s*lim;const vn=b.vx*s;if(vn>0){b.vx-=1.4*vn*s;b.av+=-s*vn*.004;if(vn>60&&!TRIP.landingZone())hit((vn-50)*.1*c.rockDmg,'Wall!',b.x+s*c.r,b.y,vn);}}
  // features
  let inH=null;const F=W.feats;
  for(let i=lowerIdx(F,b.y-260);i<F.length&&F[i].y<b.y+260;i++){const ft=F[i];
    if(ft.t==='rock'){if(G.flush>0)continue;const ddx=b.x-ft.x,ddy=b.y-ft.y,d=Math.hypot(ddx,ddy),md=ft.r+c.r*.85;
      if(d<md&&d>0){const nx=ddx/d,ny=ddy/d;b.x=ft.x+nx*md;b.y=ft.y+ny*md;const vn=b.vx*nx+b.vy*ny;
        if(vn<0){b.vx-=1.4*vn*nx;b.vy-=1.4*vn*ny;const imp=-vn;b.av+=(nx*dy-ny*dx)*imp*.012;if(imp>35)hit((imp-25)*.18*c.rockDmg,ft.name?ft.name+'!':'Rock!',ft.x+nx*ft.r,ft.y+ny*ft.r,imp);}}}
    else if(ft.t==='hole'){if(((b.x-ft.x)/ft.rx)**2+((b.y-ft.y)/ft.ry)**2<1)inH=ft;}
    else if(ft.t==='wave'){if(py0<ft.y&&b.y>=ft.y&&Math.abs(b.x-ft.x)<ft.w+c.r*.4)onWave(ft,push);}
    else if(ft.t==='boil'){if(Math.hypot(b.x-ft.x,b.y-ft.y)<ft.r){b.av+=Math.sin(G.t*2+ft.id)*1.2*dt/c.mass;if(!G.latIn.has('b'+ft.id)){G.latIn.add('b'+ft.id);if(ft.name)toast(`${ft.name}! It spins you.`,'#cfe3e0',1);}}else G.latIn.delete('b'+ft.id);}
    else if(ft.t==='lat'){const d=segDist(b.x,b.y,ft.x0,ft.y0,ft.x1,ft.y1);
      if(d<14+c.r*.5){b.av+=ft.dir*1.3*ft.pow*dt/c.mass*4;if(!G.latIn.has(ft.id)){G.latIn.add(ft.id);b.bounce=.12;splash(b.x,b.y,6,.6);if(G.inv<=0&&Math.random()<.3*ft.pow*sideRisk())flip('Lateral wave');}}
      else G.latIn.delete(ft.id);}
    else if(ft.t==='str'){if(segDist(b.x,b.y,ft.x0,ft.y0,ft.x1,ft.y1)<c.r*.8+6&&G.inv<=0){hit(20,'Strainer!',b.x,b.y,120);if(G.state==='run')flip('Strainer! Stay away from logs.');}}
  }
  if(inH&&G.state==='run'){
    b.bounce=Math.max(b.bounce,.08);if(Math.random()<dt*12)splash(b.x+(Math.random()-.5)*30,b.y,2,.8);
    if(!G.holeIds.has(inH.id)){G.holeIds.add(inH.id);AU.splash(Math.min(1,inH.pow));
      if(G.inv<=0){let risk=inH.pow*sideRisk();if(b.vy>140)risk*=.7;if(push)risk*=.75;
        if(Math.random()<Math.min(.95,risk))flip(inH.name||'Hole');
        else{if(sideRisk()>.2)maybeMOB(.35);if(inH.pow>.6){const p=Math.round(60*inH.pow);G.score+=p;toast(`${inH.name?inH.name+' — ':''}Punched it! +${p}`,'#ffd36b',1);}}}
      G.holeTick=.8;}
    else{G.holeTick-=dt;if(G.holeTick<=0){G.holeTick=.7;if(G.inv<=0&&Math.random()<Math.min(.8,inH.pow*sideRisk()*.45))flip((inH.name||'Hole')+' — surfed and flipped');}}
  }
  G.curHole=inH;
  updSwimmer(dt);updDebris(dt);
  if(G.state!=='run')return;
  if(b.y>G.maxY){G.score+=(b.y-G.maxY)*.05;G.maxY=b.y;}
  for(const r of W.rapids){
    if(!r.announced&&b.y>r.y0-1400){r.announced=true;showBanner(r);}
    if(!r.done&&b.y>r.y1){r.done=true;const cr=nearCrowd();
      if(r.clean){const p=Math.round(100+r.s*900);G.score+=p;G.clean++;toast(`CLEAN LINE! +${p}`,'#5fd38d',1.4);if(cr){G.cheer=2.5;G.cheerBig=false;AU.cheer(1);}}
      else toast(`${r.n}: survived`,'#cfe3e0',1);}
  }
  // history markers and facts
  const PO=W.pois;
  while(G.poiIdx<PO.length&&b.y>=PO[G.poiIdx].y-320){const p=PO[G.poiIdx++];if(!sel.facts||SEEN.has(p.id))continue;if(p.page)G.pageQ.push(p);else G.factQ.push(p);}
  if(G.factQ.length&&G.factT<=0&&!G.mode3d){const p=G.factQ.shift();SEEN.add(p.id);showFact(p);}
  if(G.pageQ.length&&inCalm()&&G.t>1.2){const p=G.pageQ.shift();SEEN.add(p.id);openPage(p);return;}
  TRIP.update(dt);
  if(G.state==='run'&&b.y>=W.len)endGame(true);
}
function onWave(w,push){
  const b=G.b;b.bounce=Math.max(b.bounce,.06+w.h*.12*clamp(70/G.craft.len,.7,1.3));b.vy*=.95;
  splash(b.x,b.y,Math.round(3+w.h*8),.5+w.h*.6);if(w.h>.4)AU.splash(w.h*.6);
  if(G.inv>0)return;
  const risk=Math.max(0,w.h-.45)*.9*sideRisk()*(push?.85:1)*clamp(76/G.craft.len,.8,1.4);
  if(Math.random()<risk){flip(w.name||'Big wave');return;}
  if(w.h>.55&&sideRisk()>.25)maybeMOB(.25);
  if(w.h>.55&&sideRisk()<.05){const p=Math.round(15*w.h);G.score+=p;if(w.name)toast(`${w.name} — straight! +${p}`,'#ffd36b',1);}
}
function updParts(dt){for(let i=G.parts.length-1;i>=0;i--){const p=G.parts[i];p.life+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.93;p.vy*=.93;p.z+=p.vz*dt;p.vz-=380*dt;if(p.z<0){p.z=0;p.vz=0;}if(p.life>p.max)G.parts.splice(i,1);}}
function updStreaks(dt){const W=G.W,{y0,y1}=G.view;
  for(const s of G.streaks){
    if(s.y<y0-40||s.y>y1+40||Math.abs(s.x-W.cx(s.y))>W.hw(s.y)){s.y=s.y<-1e8?y0+Math.random()*(y1-y0):(s.y<y0?y1+Math.random()*30:y0+Math.random()*(y1-y0));s.x=W.cx(s.y)+(Math.random()*2-1)*W.hw(s.y)*.95;s.l=.5+Math.random()*.8;}
    const f=flowAt(s.x,s.y);s.vx=f.vx;s.vy=f.vy;s.x+=f.vx*dt;s.y+=f.vy*dt;}
}

/* ================= RENDER 2D ================= */
function render(){
  ctx.setTransform(DPR,0,0,DPR,0,0);
  if(!G){ctx.fillStyle='#0b1f26';ctx.fillRect(0,0,VW,VH);return;}
  const W=G.W,b=G.b,R=G.river,pal=R.pal,sc=G.scale,by=VH*.74,t=performance.now()/1000;
  const camY=b.y,camX=lerp(W.cx(b.y),b.x,.55);
  const shx=(Math.random()-.5)*G.shake,shy=(Math.random()-.5)*G.shake;
  const yMin=camY-(VH-by)/sc-60,yMax=camY+by/sc+60;G.view={y0:yMin,y1:yMax};
  ctx.fillStyle=pal.wall;ctx.fillRect(0,0,VW,VH);
  ctx.setTransform(DPR*sc,0,0,-DPR*sc,DPR*(VW/2-camX*sc+shx),DPR*(by+camY*sc+shy));
  const ys=[],Lx=[],Rx=[],HW=[],CX=[];
  for(let y=yMin-40;y<=yMax+40;y+=22){const c=W.cx(y),h=W.hw(y);ys.push(y);CX.push(c);HW.push(h);Lx.push(c-h);Rx.push(c+h);}
  const n=ys.length;
  const rpath=e=>{ctx.beginPath();for(let i=0;i<n;i++)ctx.lineTo(CX[i]-HW[i]-e,ys[i]);for(let i=n-1;i>=0;i--)ctx.lineTo(CX[i]+HW[i]+e,ys[i]);ctx.closePath();};
  if(pal.strata){ctx.strokeStyle=pal.strata;ctx.globalAlpha=.35;for(const o of[90,180,300,430]){ctx.lineWidth=8+o*.03;for(const s of[-1,1]){ctx.beginPath();for(let i=0;i<n;i++)ctx.lineTo(CX[i]+s*(HW[i]+o+14*Math.sin(ys[i]/260+o)),ys[i]);ctx.stroke();}}ctx.globalAlpha=1;}
  const D=W.deco;const di0=lowerIdx(D,yMin-120);
  for(let i=di0;i<D.length&&D[i].y<yMax+120;i++){const d=D[i];if(d.k!=='blob')continue;const x=W.cx(d.y)+d.side*(W.hw(d.y)+d.off);
    ctx.fillStyle=d.sh<.5?pal.wall2:'rgba(255,255,255,.07)';ctx.globalAlpha=d.sh<.5?.55:1;ctx.beginPath();ctx.ellipse(x,d.y,d.s,d.s*.55,d.a,0,7);ctx.fill();}
  ctx.globalAlpha=1;
  ctx.fillStyle=pal.wall2;rpath(48);ctx.fill();
  ctx.fillStyle=pal.sand;rpath(16);ctx.fill();
  // camp beaches
  for(const cp of W.camps){if(cp.y<yMin-200||cp.y>yMax+200)continue;const x=W.cx(cp.y)+cp.side*(W.hw(cp.y)+6);ctx.fillStyle=pal.sand;ctx.beginPath();ctx.ellipse(x,cp.y,46,120,0,0,7);ctx.fill();ctx.fillStyle='rgba(255,255,255,.12)';ctx.beginPath();ctx.ellipse(x+cp.side*12,cp.y,26,90,0,0,7);ctx.fill();}
  for(let i=di0;i<D.length&&D[i].y<yMax+120;i++){const d=D[i];if(d.k==='bush'||d.k==='boulder'){const x=W.cx(d.y)+d.side*(W.hw(d.y)+d.off+10);
    ctx.fillStyle=d.k==='bush'?pal.veg:pal.rock;ctx.beginPath();ctx.arc(x,d.y,d.s,0,7);ctx.fill();if(d.k==='bush'){ctx.fillStyle='rgba(255,255,255,.12)';ctx.beginPath();ctx.arc(x-d.s*.3,d.y+d.s*.3,d.s*.5,0,7);ctx.fill();}}}
  // towns
  for(const tw of W.towns){if(tw.y<yMin-300||tw.y>yMax+300)continue;for(let i=0;i<9;i++){const yy=tw.y+(i-4)*55,x=W.cx(yy)+tw.side*(W.hw(yy)+70+(i%3)*45);
    ctx.fillStyle=['#d9c9a3','#c7b18a','#e8dcc0'][i%3];ctx.fillRect(x-14,yy-10,28,20);ctx.fillStyle=['#8e3b22','#555','#2e5d7a'][i%3];ctx.fillRect(x-16,yy+6,32,7);}}
  // water
  ctx.fillStyle=G.lvlKey==='flood'?'#8a6a45':pal.water;rpath(0);ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.035)';ctx.beginPath();for(let i=0;i<n;i++)ctx.lineTo(CX[i]-HW[i]*.5,ys[i]);for(let i=n-1;i>=0;i--)ctx.lineTo(CX[i]+HW[i]*.5,ys[i]);ctx.fill();
  for(const r of W.rapids){if(r.y1+200<yMin||r.y0-150>yMax)continue;ctx.fillStyle=`rgba(255,255,255,${.06+.1*r.s})`;ctx.beginPath();const a=Math.max(yMin,r.y0-120),z=Math.min(yMax,r.y1+180);
    for(let y=a;y<=z;y+=20)ctx.lineTo(W.cx(y)-W.hw(y),y);for(let y=z;y>=a;y-=20)ctx.lineTo(W.cx(y)+W.hw(y),y);ctx.fill();}
  // eddy lines at camps
  for(const cp of W.camps){if(cp.y<yMin-200||cp.y>yMax+200)continue;const x=W.cx(cp.y)+cp.side*W.hw(cp.y)*.66;ctx.strokeStyle='rgba(255,255,255,.25)';ctx.lineWidth=2;ctx.setLineDash([6,8]);ctx.beginPath();ctx.moveTo(x,cp.y-160);ctx.quadraticCurveTo(x-cp.side*10,cp.y,x+cp.side*20,cp.y+140);ctx.stroke();ctx.setLineDash([]);}
  ctx.strokeStyle='rgba(255,255,255,.28)';ctx.lineWidth=3;ctx.beginPath();for(let i=0;i<n;i++)ctx.lineTo(Lx[i],ys[i]);ctx.stroke();ctx.beginPath();for(let i=0;i<n;i++)ctx.lineTo(Rx[i],ys[i]);ctx.stroke();
  ctx.strokeStyle=G.gust>0?'rgba(255,255,255,.3)':'rgba(255,255,255,.22)';ctx.lineWidth=1.6;ctx.beginPath();
  for(const s of G.streaks){if(s.vx===undefined)continue;ctx.moveTo(s.x,s.y);ctx.lineTo(s.x-s.vx*.09*s.l,s.y-s.vy*.09*s.l);}ctx.stroke();
  // bridge shadows
  for(const br of W.bridges){if(br.y<yMin-200||br.y>yMax+200)continue;ctx.fillStyle='rgba(0,0,0,.18)';const hw=W.hw(br.y);ctx.fillRect(W.cx(br.y)-hw-80+30,br.y-30-14,hw*2+160,br.double?70:28);}
  const F=W.feats;
  for(let i=lowerIdx(F,yMin-260);i<F.length&&F[i].y<yMax+260;i++){const f=F[i];
    if(f.t==='tongue'){ctx.fillStyle='rgba(0,20,30,.2)';ctx.beginPath();ctx.moveTo(f.x-f.w,f.y);ctx.lineTo(f.x+f.w,f.y);ctx.lineTo(f.x,f.y+f.len);ctx.closePath();ctx.fill();
      ctx.strokeStyle='rgba(255,255,255,.45)';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(f.x-f.w,f.y);ctx.lineTo(f.x,f.y+f.len);ctx.lineTo(f.x+f.w,f.y);ctx.stroke();}
    else if(f.t==='wave'){const fl=.85+.15*Math.sin(t*6+f.id);ctx.strokeStyle='rgba(0,30,40,.22)';ctx.lineWidth=6+f.h*8;ctx.beginPath();ctx.moveTo(f.x-f.w,f.y-10);ctx.quadraticCurveTo(f.x,f.y-24-f.h*10,f.x+f.w,f.y-10);ctx.stroke();
      ctx.strokeStyle=`rgba(255,255,255,${(.4+.45*f.h)*fl})`;ctx.lineWidth=4+f.h*10;ctx.beginPath();ctx.moveTo(f.x-f.w,f.y+6);ctx.quadraticCurveTo(f.x,f.y-10-f.h*8,f.x+f.w,f.y+6);ctx.stroke();}
    else if(f.t==='hole'){if(f.pour){ctx.fillStyle='rgba(255,255,255,.14)';ctx.beginPath();ctx.ellipse(f.x,f.y-f.ry*1.7,f.rx*.85,f.ry*.8,0,0,7);ctx.fill();}
      ctx.fillStyle='rgba(0,30,40,.3)';ctx.beginPath();ctx.ellipse(f.x,f.y-f.ry*.6,f.rx*1.05,f.ry*.7,0,0,7);ctx.fill();
      ctx.fillStyle='rgba(236,248,248,.88)';ctx.beginPath();ctx.ellipse(f.x,f.y,f.rx,f.ry,0,0,7);ctx.fill();
      ctx.fillStyle='rgba(200,225,228,.9)';const nb=5+Math.round(f.pow*6);for(let j=0;j<nb;j++){ctx.beginPath();ctx.arc(f.x+Math.sin(t*3+j*1.7+f.id)*f.rx*.75,f.y+Math.cos(t*4.3+j*2.1)*f.ry*.55,3+((j*7)%5),0,7);ctx.fill();}
      ctx.strokeStyle='rgba(0,40,50,.55)';ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(f.x,f.y,f.rx,f.ry,0,Math.PI,2*Math.PI);ctx.stroke();}
    else if(f.t==='rock'){ctx.fillStyle='rgba(0,25,35,.28)';ctx.beginPath();ctx.ellipse(f.x,f.y+f.r*1.5,f.r*.9,f.r*1.6,0,0,7);ctx.fill();
      ctx.strokeStyle='rgba(255,255,255,.3)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(f.x-f.r*2,f.y+f.r*3.2);ctx.lineTo(f.x,f.y+f.r*.4);ctx.lineTo(f.x+f.r*2,f.y+f.r*3.2);ctx.stroke();
      ctx.strokeStyle='rgba(255,255,255,.75)';ctx.lineWidth=5;ctx.beginPath();ctx.arc(f.x,f.y,f.r+5,Math.PI*1.05,Math.PI*1.95);ctx.stroke();
      ctx.fillStyle=f.tall?'#1b1a1b':pal.rock;ctx.beginPath();ctx.arc(f.x,f.y,f.r,0,7);ctx.fill();ctx.fillStyle='rgba(255,255,255,.18)';ctx.beginPath();ctx.arc(f.x-f.r*.25,f.y+f.r*.25,f.r*.55,0,7);ctx.fill();}
    else if(f.t==='boil'){ctx.fillStyle='rgba(255,255,255,.08)';ctx.beginPath();ctx.arc(f.x,f.y,f.r,0,7);ctx.fill();ctx.strokeStyle='rgba(255,255,255,.3)';ctx.lineWidth=2;for(let j=0;j<3;j++){ctx.beginPath();ctx.arc(f.x,f.y,f.r*(.4+.25*j)+Math.sin(t*2+j)*4,0,7);ctx.stroke();}}
    else if(f.t==='lat'){ctx.strokeStyle=`rgba(255,255,255,${.45+.2*Math.sin(t*5+f.id)})`;ctx.lineWidth=7;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(f.x0,f.y0);ctx.lineTo(f.x1,f.y1);ctx.stroke();ctx.lineCap='butt';}
    else if(f.t==='str'){ctx.strokeStyle='rgba(255,255,255,.5)';ctx.lineWidth=16;ctx.beginPath();ctx.moveTo(f.x0,f.y0-6);ctx.lineTo(f.x1,f.y1-6);ctx.stroke();
      ctx.strokeStyle='#5a3d24';ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(f.x0,f.y0);ctx.lineTo(f.x1,f.y1);ctx.stroke();ctx.lineWidth=3;
      for(let j=1;j<5;j++){const x=lerp(f.x0,f.x1,j/5),y=lerp(f.y0,f.y1,j/5);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+(j%2?14:-10),y+(j%2?18:-14));ctx.stroke();}}
  }
  // floating debris
  for(const d of G.debris){if(d.y<yMin||d.y>yMax)continue;ctx.save();ctx.translate(d.x,d.y);ctx.rotate(d.a);ctx.fillStyle='#5a3d24';ctx.fillRect(-d.len/2,-5,d.len,10);ctx.strokeStyle='rgba(255,255,255,.4)';ctx.lineWidth=2;ctx.strokeRect(-d.len/2,-5,d.len,10);ctx.restore();}
  if(R.trees)for(let i=di0;i<D.length&&D[i].y<yMax+120;i++){const d=D[i];if(d.k!=='tree')continue;const x=W.cx(d.y)+d.side*(W.hw(d.y)+d.off);
    ctx.fillStyle=d.sh<.5?pal.veg:'#24552a';ctx.beginPath();ctx.arc(x,d.y,d.s,0,7);ctx.fill();ctx.fillStyle='rgba(255,255,255,.1)';ctx.beginPath();ctx.arc(x-d.s*.3,d.y+d.s*.3,d.s*.5,0,7);ctx.fill();}
  // crowds
  for(const cr of W.crowds){if(cr.y<yMin-400||cr.y>yMax+400)continue;const amp=G.cheer>0?(G.cheerBig?14:9):2;
    for(const m of cr.mem){const yy=cr.y+m.dy,x=W.cx(yy)+cr.side*(W.hw(yy)+m.off)+cr.side*Math.abs(Math.sin(t*(G.cheer>0?9:2)+m.ph))*amp*.4;
      ctx.fillStyle=m.col;ctx.beginPath();ctx.arc(x,yy+Math.abs(Math.sin(t*(G.cheer>0?10:2.5)+m.ph))*amp*.5,5.5,0,7);ctx.fill();ctx.fillStyle='#f1c27d';ctx.beginPath();ctx.arc(x,yy+2,3,0,7);ctx.fill();}}
  ctx.fillStyle='#fff';for(const p of G.parts){ctx.globalAlpha=1-p.life/p.max;ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,7);ctx.fill();}ctx.globalAlpha=1;
  // swimmer
  if(G.swim){const s=G.swim;ctx.strokeStyle='rgba(255,255,255,.6)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(s.x,s.y,14+Math.sin(t*6)*3,0,7);ctx.stroke();ctx.fillStyle='#ff8c1a';ctx.beginPath();ctx.arc(s.x,s.y,8,0,7);ctx.fill();ctx.fillStyle='#f1c27d';ctx.beginPath();ctx.arc(s.x,s.y+3,4,0,7);ctx.fill();}
  for(const m of W.miles){if(m.y<yMin||m.y>yMax)continue;const x=W.cx(m.y)-W.hw(m.y)-22;ctx.fillStyle='#f4f1e8';ctx.fillRect(x-4,m.y-4,8,8);}
  for(const p of W.pois){if(p.y<yMin||p.y>yMax)continue;const x=W.cx(p.y)+p.side*(W.hw(p.y)+30);ctx.fillStyle='#6b4a2c';ctx.fillRect(x-2,p.y-14,4,14);ctx.fillStyle='#f2e3c4';ctx.fillRect(x-10,p.y-2,20,14);}
  TRIP.renderWorld(ctx,yMin,yMax);
  // ===== screen space =====
  ctx.setTransform(DPR,0,0,DPR,0,0);
  const S=(x,y)=>[VW/2+(x-camX)*sc+shx,by-(y-camY)*sc+shy];
  ctx.font='bold 12px system-ui,sans-serif';ctx.textAlign='center';
  const label=(txt,x,y,col,bg)=>{const tw=ctx.measureText(txt).width+12,xx=clamp(x,tw/2+4,VW-tw/2-4);ctx.fillStyle=bg||'rgba(0,0,0,.6)';ctx.fillRect(xx-tw/2,y-9,tw,18);ctx.fillStyle=col;ctx.fillText(txt,xx,y+4);};
  for(const m of W.miles){if(m.y<yMin||m.y>yMax)continue;const [x,y]=S(W.cx(m.y)-W.hw(m.y)-22,m.y);label('Mile '+m.m,x,y-16,'#fff');}
  for(const r of W.rapids){if(r.y0<yMin||r.y0>yMax+200)continue;const [x,y]=S(W.cx(r.y0)+W.hw(r.y0)+20,r.y0);label(r.n,x,y,'#ffb347');}
  for(const p of W.pois){if(p.y<yMin||p.y>yMax)continue;const [x,y]=S(W.cx(p.y)+p.side*(W.hw(p.y)+30),p.y);label(`${KIND_ICON[p.k]||'📍'} ${p.n}`,x,y-20,'#f2e3c4','rgba(60,40,20,.75)');}
  for(const tw of W.towns){if(tw.y<yMin||tw.y>yMax)continue;const [x,y]=S(W.cx(tw.y)+tw.side*(W.hw(tw.y)+120),tw.y);label('🏠 '+tw.n,x,y,'#fff','rgba(30,60,90,.75)');}
  for(const cr of W.crowds){if(!cr.label||cr.y<yMin||cr.y>yMax)continue;const [x,y]=S(W.cx(cr.y)+cr.side*(W.hw(cr.y)+60),cr.y+cr.spread/2+20);label('🎉 '+cr.label,x,y,'#ffe0a0');}
  for(let i=lowerIdx(F,yMin);i<F.length&&F[i].y<yMax;i++){const f=F[i];if(!f.name)continue;const [x,y]=S(f.x,f.y);label(f.name,x,y-(f.ry||f.r||10)*sc-14,'#ffe0a0','rgba(0,0,0,.55)');}
  TRIP.renderLabels(ctx,S,yMin,yMax,label);
  // boat
  const [bx,byy]=S(b.x,b.y);G.bsx=bx;G.bsy=byy;const c=G.craft;
  const ri=W.rint(b.y),gaugeA=.25+.6*Math.min(1,ri*2);
  if(G.state==='run'){const gr=(c.len/2+16)*sc,tl=c.tol*Math.PI/180;ctx.lineWidth=5;ctx.globalAlpha=gaugeA;
    for(const base of[-Math.PI/2,Math.PI/2]){ctx.strokeStyle='#5fd38d';ctx.beginPath();ctx.arc(bx,byy,gr,base-tl*.7,base+tl*.7);ctx.stroke();ctx.strokeStyle='#ffb347';ctx.beginPath();ctx.arc(bx,byy,gr,base+tl*.7,base+tl);ctx.stroke();ctx.beginPath();ctx.arc(bx,byy,gr,base-tl,base-tl*.7);ctx.stroke();}
    ctx.strokeStyle='#ff6b5b';ctx.beginPath();ctx.arc(bx,byy,gr,-Math.PI/2+tl,Math.PI/2-tl);ctx.stroke();ctx.beginPath();ctx.arc(bx,byy,gr,Math.PI/2+tl,Math.PI*1.5-tl);ctx.stroke();
    const ha=-Math.PI/2+b.h;ctx.globalAlpha=Math.min(1,gaugeA+.2);ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(bx+Math.cos(ha)*(gr-8),byy+Math.sin(ha)*(gr-8));ctx.lineTo(bx+Math.cos(ha)*(gr+8),byy+Math.sin(ha)*(gr+8));ctx.stroke();ctx.globalAlpha=1;}
  ctx.save();ctx.translate(bx,byy);ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.ellipse(4*sc,6*sc,c.wid*.55*sc,c.len*.5*sc,b.h,0,7);ctx.fill();
  ctx.rotate(b.h);const bs=sc*(1+b.bounce*Math.sin(t*18));ctx.scale(bs,bs);
  if(G.inv>0&&Math.floor(t*10)%2)ctx.globalAlpha=.55;
  drawCraft(ctx,G.ck,b.oar,G.state==='flip',G.swim?c.crew-1:c.crew);ctx.globalAlpha=1;ctx.restore();
  if(G.state==='flip'){const nsw=c.crew;for(let i=0;i<nsw;i++){const a=t*1.3+i*2.1,x=bx+Math.cos(a)*(c.len*.5+12)*sc,y=byy+Math.sin(a*1.2)*(c.len*.4+10)*sc;ctx.fillStyle='#ff8c1a';ctx.beginPath();ctx.arc(x,y,7*sc+2,0,7);ctx.fill();ctx.fillStyle='#f1c27d';ctx.beginPath();ctx.arc(x,y,4*sc+1.5,0,7);ctx.fill();}}
  // bridges overhead
  for(const br of W.bridges){if(br.y<yMin-200||br.y>yMax+200)continue;const hw=W.hw(br.y);const decks=br.double?[0,40]:[0];
    for(const o of decks){const [x0,y0]=S(W.cx(br.y)-hw-90,br.y+o),[x1]=S(W.cx(br.y)+hw+90,br.y+o);const th=(br.rail?16:20)*sc;
      ctx.fillStyle=br.rail?'#3b3b3b':'#6f7880';ctx.fillRect(x0,y0-th/2,x1-x0,th);ctx.fillStyle=br.rail?'#8b6b4a':'#c9d1d8';
      if(br.rail){for(let x=x0;x<x1;x+=8*sc)ctx.fillRect(x,y0-th/2,3*sc,th);}else{ctx.fillRect(x0,y0-th/2,x1-x0,2.5);ctx.fillRect(x0,y0+th/2-2.5,x1-x0,2.5);}}
    const [lx,ly]=S(W.cx(br.y),br.y);label('🌉 '+br.n,lx,ly-24*sc,'#fff','rgba(30,40,60,.75)');}
  // swimmer arrow when off screen
  if(G.swim){const [sx,sy]=S(G.swim.x,G.swim.y);if(sy<60||sy>VH-60||sx<20||sx>VW-20){const ax=clamp(sx,30,VW-30),ay=clamp(sy,90,VH-90);ctx.fillStyle='#ff8c1a';ctx.beginPath();ctx.arc(ax,ay,12,0,7);ctx.fill();ctx.fillStyle='#000';ctx.fillText('!',ax,ay+4);}
    else label(`🛟 ${G.swim.name}`,sx,sy-22,'#ff8c1a');}
  // mouse aim
  if(MS.in&&(MS.left||MS.right)&&!isTouch()){ctx.strokeStyle=MS.right&&!MS.left?'rgba(255,179,71,.7)':'rgba(95,211,141,.7)';ctx.setLineDash([6,6]);ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(bx,byy);ctx.lineTo(MS.x,MS.y);ctx.stroke();ctx.setLineDash([]);}
}

/* ================= HUD ================= */
function updHud(dt){
  const b=G.b,W=G.W;
  G.toastT-=dt;if(G.toastT<=0)$('toast').style.opacity=0;
  if(G.bannerT>0){G.bannerT-=dt;if(G.bannerT<=0)hideBanner();}
  if(G.factT>0){G.factT-=dt;if(G.factT<=0)hideFact();}
  G.hudT-=dt;if(G.hudT>0)return;G.hudT=.1;
  $('hRiver').textContent=G.river.name+(G.mode!=='day'?` · Day ${TRIP.day()}`:'');
  $('hMile').textContent='Mile '+W.mileAt(b.y).toFixed(1);
  let nx=null;for(const r of W.rapids)if(r.y1>b.y){nx=r;break;}
  const near=nx&&b.y>nx.y0-700,tripTxt=TRIP.hudText();
  if(tripTxt)$('hNext').textContent=tripTxt;
  else if(!nx)$('hNext').textContent='Take-out ahead';
  else if(b.y>=nx.y0)$('hNext').textContent='▶ '+nx.n;
  else $('hNext').textContent=`${nx.n} in ${Math.max(0,nx.m-W.mileAt(b.y)).toFixed(1)} mi`;
  const ha=$('hAngle');
  if((near||G.curHole||G.mode3d)&&G.state==='run'){const s=Math.abs(Math.sin(b.h)),ts=Math.sin(G.craft.tol*Math.PI/180);
    if(s<=ts*.7){ha.textContent=G.ck==='tube'?'FEET DOWNSTREAM ✓':'STRAIGHT ✓';ha.style.color='#5fd38d';}else if(s<ts){ha.textContent='ANGLED';ha.style.color='#ffb347';}else{ha.textContent='SIDEWAYS!';ha.style.color='#ff6b5b';}}
  else ha.textContent=G.gust>0?'WIND ↓':'';
  $('hScore').textContent=Math.round(G.score);
  $('hTime').textContent=fmtTime(G.t);
  const mx=TRIP.maxSwims();$('hSwims').textContent='Swims '+'●'.repeat(Math.min(G.swims,mx))+'○'.repeat(Math.max(0,mx-G.swims));
  const p=G.hp/G.hpMax;const hp=$('hHp');hp.style.width=(p*100)+'%';hp.style.background=p>.6?'#5fd38d':p>.3?'#ffb347':'#ff6b5b';
  $('hCrew').innerHTML=TRIP.crewHud();
  let roar=0;for(const r of W.rapids){let k=0;if(b.y>=r.y0&&b.y<=r.y1)k=1;else if(b.y<r.y0)k=1-clamp((r.y0-b.y)/1100,0,1);else k=1-clamp((b.y-r.y1)/500,0,1);roar=Math.max(roar,k*r.s);}
  AU.roar(roar);
}

/* ================= LOOP ================= */
let last=performance.now();
function frame(ts){
  const dt=Math.min(.05,(ts-last)/1000);last=ts;
  try{
    if(G&&!['pause','done','camp','page'].includes(G.state)){let gdt=dt;if(G.slowT>0){G.slowT-=dt;gdt=dt*.45;}if(G.ff){if(ffOK())gdt=dt*3;else{G.ff=false;$('bFF').classList.remove('on');toast('Fast-forward off: something ahead','#cfe3e0',1);}}const st=3;for(let i=0;i<st&&G&&!['done','camp','page'].includes(G.state);i++)update(gdt/st);if(G&&!['done','camp','page'].includes(G.state)){updStreaks(gdt);updHud(dt);check3D();}}
    if(G&&G.state!=='pause'&&G.state!=='done'){if(G.mode3d)render3D(dt);else render();}else if(!G)render();
    if(G&&G.state==='camp')TRIP.renderCamp(dt);
  }catch(e){console.error(e);}
  requestAnimationFrame(frame);
}

/* ================= INPUT ================= */
addEventListener('keydown',e=>{const k=e.key.toLowerCase();
  if(e.target&&e.target.tagName==='INPUT')return;
  if(G&&['arrowleft','arrowright','arrowup','arrowdown',' '].includes(k))e.preventDefault();
  if((k===' '||k==='p'||k==='escape')&&!e.repeat){if(G&&G.state==='page'){closePage();return;}if(G)togglePause();return;}
  if(G&&G.mode3d&&G.craft.pd&&!e.repeat&&G.state==='run'){if(k==='arrowleft'||k==='a')queueStroke('L');else if(k==='arrowright'||k==='d')queueStroke('R');else if(k==='arrowup'||k==='w')queueStroke('B');}
  if(k==='f'&&!e.repeat)toggleFF();
  K[k]=true;});
addEventListener('keyup',e=>{K[e.key.toLowerCase()]=false;});
addEventListener('blur',()=>{for(const k in K)K[k]=false;MS.left=MS.right=MS.sq=false;if(G&&G.state==='run')togglePause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&G&&G.state==='run')togglePause();});
document.querySelectorAll('.cbtn').forEach(btn=>{const k=btn.dataset.k;
  const on=e=>{e.preventDefault();T[k]=true;if(G&&G.mode3d&&G.craft.pd){if(k==='left')queueStroke('L');else if(k==='right')queueStroke('R');else if(k==='push')queueStroke('B');}btn.classList.add('on');try{btn.setPointerCapture(e.pointerId);}catch(_){}};
  const off=()=>{T[k]=false;btn.classList.remove('on');};
  btn.addEventListener('pointerdown',on);btn.addEventListener('pointerup',off);btn.addEventListener('pointercancel',off);btn.addEventListener('lostpointercapture',off);
  btn.addEventListener('contextmenu',e=>e.preventDefault());});
/* Mouse: hold LEFT to row toward the pointer, hold RIGHT to pull (back-row) toward it,
   double-click and hold to square up to the current, wheel to turn. In 3D paddle mode, clicks are strokes. */
for(const el of [$('game'),$('g3')]){
  el.addEventListener('touchmove',e=>e.preventDefault(),{passive:false});
  el.addEventListener('contextmenu',e=>e.preventDefault());
  el.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse')return;MS.x=e.clientX;MS.y=e.clientY;MS.in=true;});
  el.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse')MS.in=false;});
  el.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'||!G)return;e.preventDefault();MS.x=e.clientX;MS.y=e.clientY;MS.in=true;AU.resume();
    const now=performance.now();
    if(e.button===0){if(now-MS.lastDown<320)MS.sq=true;MS.lastDown=now;MS.left=true;}
    else if(e.button===2)MS.right=true;
    if(G.mode3d&&G.craft.pd&&G.state==='run'){MS.lastStroke=G.t;smartStroke(e.button===2);}
    try{el.setPointerCapture(e.pointerId);}catch(_){}});
  el.addEventListener('pointerup',e=>{if(e.pointerType!=='mouse')return;if(e.button===0){MS.left=false;MS.sq=false;}else if(e.button===2)MS.right=false;});
  el.addEventListener('wheel',e=>{if(!G||G.state!=='run')return;e.preventDefault();const s=Math.sign(e.deltaY);
    if(G.mode3d&&G.craft.pd)queueStroke(s>0?'L':'R');else G.b.av+=s*.5;},{passive:false});
}
$('startBtn').onclick=startFlow;
$('bPause').onclick=togglePause;
$('bFF').onclick=toggleFF;
$('bMute').onclick=()=>{AU.muted=!AU.muted;$('bMute').textContent=AU.muted?'🔇':'🔊';if(AU.muted)AU.roar(0);};
$('resumeBtn').onclick=togglePause;
$('restartBtn').onclick=()=>{$('pause').style.display='none';cleanup3D();startFlow();};
$('menuBtn').onclick=toMenu;
$('pFacts').onclick=()=>{sel.facts=!sel.facts;saveSel();$('pFacts').textContent=sel.facts?'History & facts: ON':'History & facts: OFF';};

function boot(){resize();buildMenu();requestAnimationFrame(frame);}
