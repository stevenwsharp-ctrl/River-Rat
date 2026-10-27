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
function shade(hex,k,a){const v=parseInt(hex.slice(1),16);return `rgba(${Math.min(255,((v>>16)&255)*k)|0},${Math.min(255,((v>>8)&255)*k)|0},${Math.min(255,(v&255)*k)|0},${a===undefined?1:a})`;}
function mixHex(a,b,t){const x=parseInt(a.slice(1),16),y=parseInt(b.slice(1),16);const m=(s)=>Math.round(((x>>s)&255)*(1-t)+((y>>s)&255)*t);return '#'+((1<<24)+(m(16)<<16)+(m(8)<<8)+m(0)).toString(16).slice(1);}
function hash2(a,b){let h=Math.imul(a|0,374761393)^Math.imul(b|0,668265263);h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296;}
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
  /* scenic stretches (like Black Rocks) get more length on screen so you have time to see them */
  const slowSeg=(typeof SCN_LAND!=='undefined'?(SCN_LAND[R.path||R.id]||[]):[]).filter(q=>q.slow);
  const gapAnchors=(mA,mB,yA,base)=>{let yy=yA;const cuts=[mA,mB];for(const q of slowSeg)for(const m of[q.m0,q.m1])if(m>mA&&m<mB)cuts.push(m);cuts.sort((a,b)=>a-b);
    const per=base/Math.max(1e-6,mB-mA);for(let k=1;k<cuts.length;k++){const a=cuts[k-1],b=cuts[k],mid=(a+b)/2,q=slowSeg.find(z=>mid>z.m0&&mid<z.m1);yy+=(b-a)*per+(q?(b-a)*q.slow:0);if(k<cuts.length-1)W.anchors.push({y:yy,m:b});}return yy-yA;};
  R.rapids.forEach((rp,i)=>{
    const s=clamp(sev(R,rp.c)*lv.sev,.05,1);
    const gap0=i===0?clamp((rp.m-R.start)*PXM,1100,2600):clamp((rp.m-endMile)*PXM,450,2600);
    const gap=gapAnchors(i===0?R.start:endMile,rp.m,y,gap0);
    const y0=y+gap,L=480+s*1000,y1=y0+L,next=R.rapids[i+1];
    let em=Math.min(rp.m+.2,next?next.m-.04:R.end-.1);em=Math.max(em,rp.m+.02);
    W.anchors.push({y:y0,m:rp.m},{y:y1,m:em});
    W.rapids.push({...rp,s,y0,y1,L,clean:true,done:false,announced:false,fan:rp.fan||(rngG()<.5?-1:1)});
    y=y1;endMile=em;
  });
  W.len=y+gapAnchors(endMile,R.end,y,clamp((R.end-endMile)*PXM,900,2600));
  W.anchors.push({y:W.len,m:R.end});
  W.mileAt=yy=>{const A=W.anchors;if(yy<=0)return A[0].m;for(let i=1;i<A.length;i++){if(yy<=A[i].y){const a=A[i-1],b=A[i];return lerp(a.m,b.m,(yy-a.y)/Math.max(1,b.y-a.y));}}return A[A.length-1].m;};
  W.yAtMile=m=>{const A=W.anchors;if(m<=A[0].m)return 0;for(let i=1;i<A.length;i++){const a=A[i-1],b=A[i];if(m>=a.m&&m<=b.m&&b.m>a.m)return lerp(a.y,b.y,(m-a.m)/(b.m-a.m));}return null;};
  W.ramp=yy=>{let k=0,s=0;for(const r of W.rapids){let kk=0;if(yy<r.y0-350||yy>r.y1+250)continue;if(yy<r.y0)kk=smooth((yy-(r.y0-350))/350);else if(yy>r.y1)kk=1-smooth((yy-r.y1)/250);else kk=1;k=Math.max(k,kk);s=Math.max(s,r.s*kk);}return [k,s];};
  const RP=R.path&&typeof RIVER_PATHS!=='undefined'?RIVER_PATHS[R.path]:null;
  if(RP){/* real bends: follow the real river course (offset from its smoothed line), with a limit on how steep a bend can be */
    const offAt=m=>{const f=clamp((m-RP.m0)/RP.step,0,RP.off.length-1.001),i=Math.floor(f);return lerp(RP.off[i],RP.off[i+1],f-i);};
    const DY=60,Y0=-2400,n=Math.ceil((W.len+5000-Y0)/DY),SC=.8;let tg=new Float32Array(n);
    for(let i=0;i<n;i++)tg[i]=offAt(W.mileAt(Y0+i*DY))*SC;
    const lim=.4*DY,fw=Float32Array.from(tg),bw=Float32Array.from(tg);for(let i=1;i<n;i++)fw[i]=fw[i-1]+clamp(tg[i]-fw[i-1],-lim,lim);for(let i=n-2;i>=0;i--)bw[i]=bw[i+1]+clamp(tg[i]-bw[i+1],-lim,lim);
    for(let i=0;i<n;i++)tg[i]=(fw[i]+bw[i])/2;
    for(let pass=0;pass<4;pass++){const t2=Float32Array.from(tg);for(let i=0;i<n;i++){let s=0,c=0;for(let j=-4;j<=4;j++){const k=i+j;if(k>=0&&k<n){s+=t2[k];c++;}}tg[i]=s/c;}}
    const base=tg[Math.round(-Y0/DY)];for(let i=0;i<n;i++)tg[i]-=base;
    W.path=true;const cr=(a,b,c,d,t)=>.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);
    W.cx=yy=>{const f=clamp((yy-Y0)/DY,1,n-3.001),i=Math.floor(f);return cr(tg[i-1],tg[i],tg[i+1],tg[i+2],f-i)+45*Math.sin(yy/830+P[1])+18*Math.sin(yy/310+P[2]);};}
  else W.cx=yy=>150*Math.sin(yy/2100+P[0])+70*Math.sin(yy/830+P[1])+22*Math.sin(yy/310+P[2]);
  W.dcx=yy=>(W.cx(yy+5)-W.cx(yy-5))/10;
  W.ddcx=yy=>(W.cx(yy+40)-2*W.cx(yy)+W.cx(yy-40))/1600;
  const zones=R.zones&&R.zones.length?R.zones:null;
  W.zoneAtMile=m=>{if(!zones)return null;let z=zones[0];for(const q of zones)if(m>=q.m)z=q;return z;};
  const wTab=[];for(let yy=0;yy<=W.len+2400;yy+=200){const m=W.mileAt(yy);let w=R.width;if(zones){const z=W.zoneAtMile(m),i=zones.indexOf(z),nx=zones[i+1];w=z.width;if(nx&&nx.m-m<1.5)w=lerp(z.width,nx.width,1-(nx.m-m)/1.5);}wTab.push(w);}
  W.wAt=yy=>{const f=clamp(yy/200,0,wTab.length-1.001),i=Math.floor(f);return lerp(wTab[i],wTab[i+1],f-i);};
  W.hw=yy=>W.wAt(yy)/2*(1+.13*Math.sin(yy/1500+P[3]))*(1-.14*W.ramp(yy)[0]);
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
    r.lineU=lineU;const nr=Math.round((4+s*13)*lv.rocks);
    for(let i=0;i<nr;i++){const rr2=12+rng()*20+s*10,pv=place((rr2+70)/W.hw(r.y0+r.L/2));if(!pv)continue;const yy=yv(pv[1]);add({t:'rock',x:X(pv[0],yy),y:yy,r:rr2});}
    const nl=Math.round(s*4);
    for(let i=0;i<nl;i++){const v=.15+rng()*.7,yy=yv(v),side=rng()<.5?-1:1,u=lineU(v)+side*(.25+rng()*.15),x=X(u,yy),Lp=.3*W.hw(yy),dir=-side;
      add({t:'lat',x0:x-dir*Lp*.5,y0:yy-Lp*.35,x1:x+dir*Lp*.5,y1:yy+Lp*.35,y:yy,dir,pow:.4+s*.6});}
    const nb=(R.scale==='gc'&&s>.45?1+Math.floor(rng()*2):0)+(levelKey==='flood'?2:0);
    for(let i=0;i<nb;i++){const v=.45+rng()*.5,yy=yv(v);add({t:'boil',x:X(lineU(v)+(rng()-.5)*.5,yy),y:yy,r:40+rng()*30,pow:.6+s*.5});}
    for(const h of (r.haz||[])){const yy=yv(h.v),x=X(h.u,yy);
      if(h.t==='hole'){const pw=h.p*lv.holes;add({t:'hole',x,y:yy,rx:h.s*(.06+s*.06)*W.hw(yy),ry:18+pw*16,pow:pw,name:h.n,pour:!!h.pour});}
      else if(h.t==='rock')add({t:'rock',x,y:yy,r:h.r,name:h.n});
      else if(h.t==='wave')add({t:'wave',x,y:yy,w:h.w*W.hw(yy),h:h.h,name:h.n});
      else if(h.t==='boil')add({t:'boil',x,y:yy,r:h.r,pow:1,name:h.n});
      else if(h.t==='hippo'){(W.hippoSpots=W.hippoSpots||[]).push({x,y:yy});}}
  }
  // landmarks in the river
  W.marks=[];for(const mk of (R.marks||[])){const yy=W.yAtMile(mk.m);if(yy===null)continue;W.marks.push({...mk,y:yy});add({t:'rock',x:X(mk.u,yy),y:yy,r:mk.r,name:mk.n,tall:true});}
  // camps, POIs, bridges, towns, crowds
  W.camps=(R.camps||[]).map((c,i)=>({...c,i,y:W.yAtMile(c.m)})).filter(c=>c.y!==null&&c.y>500&&c.y<W.len-300);
  W.pois=(R.pois||[]).map(p=>({...p,y:W.yAtMile(p.m)})).filter(p=>p.y!==null).sort((a,b)=>a.y-b.y);
  W.stops=W.pois.filter(p=>p.stop&&p.y>300);
  W.takeout=R.takeout?{...R.takeout,y:W.yAtMile(R.takeout.m)}:null;if(W.takeout&&W.takeout.y===null)W.takeout=null;
  W.bridges=(R.bridges||[]).map(b=>({...b,y:W.yAtMile(b.m)})).filter(b=>b.y!==null);
  W.towns=(R.towns||[]).map(t=>({...t,y:W.yAtMile(t.m)})).filter(t=>t.y!==null);
  W.crowds=(R.crowds||[]).map(c=>{const yy=W.yAtMile(c.m);if(yy===null)return null;const mem=[];for(let i=0;i<c.count;i++)mem.push({dy:(rng()-.5)*c.spread,off:6+rng()*70,col:['#e74c3c','#f1c40f','#3498db','#2ecc71','#e67e22','#9b59b6','#ecf0f1','#ff6fb5'][Math.floor(rng()*8)],ph:rng()*6.28});return {...c,y:yy,mem};}).filter(Boolean);
  // flatwater features
  const gaps=[];let prev=0;for(const r of W.rapids){gaps.push([prev,r.y0]);prev=r.y1;}gaps.push([prev,W.len]);
  const nearCamp=yy=>W.camps.some(c=>Math.abs(c.y-yy)<300)||W.stops.some(c=>Math.abs(c.y-yy)<300)||(W.takeout&&W.takeout.y-yy<1600&&W.takeout.y-yy>-500)||W.bridges.some(b=>Math.abs(b.y-yy)<200);
  for(const [a,b] of gaps){for(let yy=a+450;yy<b-420;yy+=380+rng()*420){if(nearCamp(yy))continue;
    const side=rng()<.5?-1:1;
    if(R.trees&&rng()<.4){const hw=W.hw(yy),Ls=(.25+rng()*.15)*hw,x0=W.cx(yy)+side*hw,x1=W.cx(yy)+side*(hw-Ls);add({t:'str',x0,y0:yy,x1,y1:yy+Ls*.5,y:yy+Ls*.25});}
    else{const n=1+Math.floor(rng()*2);for(let i=0;i<n;i++){const y2=yy+i*60;add({t:'rock',x:X(side*(.55+rng()*.3),y2),y:y2,r:10+rng()*12});}
      add({t:'wave',x:X((rng()-.5)*.6,yy+120),y:yy+120,w:.1*W.hw(yy),h:.15});if(rng()<.2){const y2=yy+230;add({t:'rock',x:X((rng()<.5?-1:1)*(.3+rng()*.25),y2),y:y2,r:8+rng()*10});}}
  }}
  for(const f of W.feats){if(f.t!=='rock'||f.tall)continue;const c=W.cx(f.y),h=W.hw(f.y),o=f.x-c;if(Math.abs(o)+f.r>h-75){f.x=c+Math.sign(o)*Math.max(Math.abs(o),h-f.r*.5);f.shore=true;}}
  W.feats=W.feats.filter(f=>!(f.t==='rock'&&!f.tall&&W.marks.some(m=>Math.abs(m.y-f.y)<140)));
  W.feats.sort((a,b)=>a.y-b.y);
  W.items=[];{let iid=0;const it=(x,y,k)=>W.items.push({id:iid++,x,y,k,got:false});
    for(const r of W.rapids){if(!r.lineU)continue;const n=3+Math.round(r.s*4);for(let i=0;i<n;i++){const v=.12+.76*i/Math.max(1,n-1),yy=r.y0+v*r.L;it(X(r.lineU(v),yy),yy,'bag');}
      const hz=W.feats.find(f=>f.t==='hole'&&f.y>r.y0&&f.y<r.y1&&f.pow>.6);if(hz){const sd=hz.x<X(r.lineU(.5),hz.y)?1:-1;it(hz.x+sd*(hz.rx+30),hz.y+10,'gold');}
      else if(rng()<.5){const v=.3+rng()*.4,yy=r.y0+v*r.L;it(X(clamp(r.lineU(v)+(rng()<.5?-.45:.45),-.85,.85),yy),yy,'gold');}}
    for(const [a,b2] of gaps){for(let yy=a+700;yy<b2-500;yy+=1100+rng()*900){if(nearCamp(yy))continue;const u0=(rng()-.5)*1.1;for(let j=0;j<4;j++){const y2=yy+j*70;it(X(clamp(u0+Math.sin(j*.9)*.18,-.8,.8),y2),y2,'bag');}}}
    W.items.sort((a,b)=>a.y-b.y);}
  W.bars=[];for(let yy=700;yy<W.len;yy+=260){const k2=W.ddcx(yy);if(Math.abs(k2)>1.5e-4&&W.rint(yy)<.05&&!W.bars.some(b=>Math.abs(b.y-yy)<800)&&!nearCamp(yy))W.bars.push({y:yy,side:Math.sign(k2),len:240+rng()*180,w:.18+rng()*.1});}
  if(typeof SCN!=='undefined')try{SCN.build(W,R);}catch(e){console.warn('scenery',e);}
  // 3D chunks
  W.chunks=[];
  if(d3&&d3!=='off'){const thr=d3==='all'?0:.5,raw=[];
    for(const r of W.rapids)if(r.s>=thr)raw.push({y0:r.y0-650,y1:r.y1+350,title:r.n});
    for(const mk of W.marks)raw.push({y0:mk.y-700,y1:mk.y+450,title:mk.n});
    for(const b of W.bridges)raw.push({y0:b.y-700,y1:b.y+400,title:b.n});
    for(const s of W.stops)raw.push({y0:s.y-650,y1:s.y+300,title:s.n});
    if(W.scn&&W.scn.jumps.length){const J=W.scn.jumps;raw.push({y0:J[0].y-800,y1:J[J.length-1].y+450,title:'Cliff jumpers'});}
    if(W.takeout)raw.push({y0:W.takeout.y-900,y1:W.takeout.y+330,title:'Take-out: '+W.takeout.n});
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
function oars(c,ox,oy,len,an){for(const s of[-1,1]){const o=typeof an==='object'&&an?(s<0?an.L:an.R):an;const p=oarPose(o);if(typeof an==='object'&&an&&s>0&&G&&G.oarLost)continue;
  c.save();c.translate(s*ox,oy);c.rotate(s*p.a);c.strokeStyle='#e2d2ab';c.lineWidth=3;c.beginPath();c.moveTo(-s*8,0);c.lineTo(s*len,0);c.stroke();
  c.fillStyle=p.wet?'#efe4c8':'rgba(226,210,171,.7)';c.beginPath();c.ellipse(s*len,0,8,p.wet?3.8:1.4,0,0,7);c.fill();
  if(p.wet){c.strokeStyle='rgba(255,255,255,.65)';c.lineWidth=1.5;c.beginPath();c.arc(s*len,0,11,0,7);c.stroke();}c.restore();}}
function drawCraft(c,key,ph,flipped,nPeople,kp,col){
  const k=CRAFTS[key],L=k.len,Wd=k.wid;c.save();c.lineJoin='round';const np=nPeople===undefined?9:nPeople;
  if(key==='raft'){
    if(!flipped)oars(c,Wd/2,2,36,ph);
    rr(c,-Wd/2,-L/2,Wd,L,Wd/2.2);c.fillStyle=flipped?'#3b3f44':(col||'#f0b429');c.fill();c.lineWidth=2;c.strokeStyle='rgba(0,0,0,.4)';c.stroke();
    if(!flipped){rr(c,-Wd/2+8,-L/2+8,Wd-16,L-16,12);c.fillStyle='#2f3d48';c.fill();c.fillStyle='#d99a1a';c.fillRect(-Wd/2+5,-L*.2,Wd-10,6);c.fillRect(-Wd/2+5,L*.2,Wd-10,6);c.fillStyle='#9aa4ab';c.fillRect(-Wd/2+3,-2,Wd-6,5);
      person(c,0,8,'#e74c3c');if(np>1)person(c,-9,-L*.3,'#2ecc71');if(np>2)person(c,9,-L*.3,'#3498db');}
  }else if(key==='dory'){
    if(!flipped)oars(c,Wd*.42,4,38,ph);
    c.beginPath();c.moveTo(0,-L/2);c.bezierCurveTo(Wd*.62,-L*.3,Wd*.62,L*.25,Wd*.24,L/2);c.lineTo(-Wd*.24,L/2);c.bezierCurveTo(-Wd*.62,L*.25,-Wd*.62,-L*.3,0,-L/2);c.closePath();
    c.fillStyle=flipped?'#6d7b7c':'#f6f1e6';c.fill();c.lineWidth=3;c.strokeStyle=flipped?'#444':(col||'#c0392b');c.stroke();
    if(!flipped){c.fillStyle='#2e86c1';c.beginPath();c.ellipse(0,-L*.3,Wd*.2,L*.1,0,0,7);c.fill();c.beginPath();c.ellipse(0,L*.32,Wd*.2,L*.08,0,0,7);c.fill();
      c.fillStyle='#8b5a2b';c.fillRect(-Wd*.38,-3,Wd*.76,5);person(c,0,8,'#e67e22');if(np>1)person(c,0,-L*.13,'#16a085');}
  }else if(key==='kayak'){
    c.beginPath();c.moveTo(0,-L/2);c.quadraticCurveTo(Wd*1.05,0,0,L/2);c.quadraticCurveTo(-Wd*1.05,0,0,-L/2);c.closePath();
    c.fillStyle=flipped?'#7d1f15':'#e74c3c';c.fill();c.lineWidth=1.5;c.strokeStyle='rgba(0,0,0,.4)';c.stroke();
    if(!flipped){c.fillStyle='#1d1d1d';c.beginPath();c.ellipse(0,3,6,10,0,0,7);c.fill();
      const kpz=kayakPose(kp||{o:typeof ph==='number'?1:0,turn:0,ph:typeof ph==='number'?ph%2:0},performance.now()/1000);c.save();c.translate(0,2);c.rotate(kpz.th);c.strokeStyle='#ddd';c.lineWidth=2.5;c.beginPath();c.moveTo(-24,0);c.lineTo(24,0);c.stroke();c.fillStyle='#f1c40f';c.beginPath();c.ellipse(-24,0,3,7,0,0,7);c.fill();c.beginPath();c.ellipse(24,0,3,7,0,0,7);c.fill();c.restore();
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
const sel=Object.assign({craft:'raft',river:'gray',level:'med',d3:'big',mode:'day',facts:true,tips:true,ctrl:'arcade',name:'Boatman',retro:true,cont:''},store.get('riverrun_settings',{}));
if(!RIVERS.some(r=>r.id===sel.river))sel.river='gray';
function saveSel(){store.set('riverrun_settings',sel);}
function riverOK(R,mode){if(R.expOnly&&mode!=='expedition')return false;return !(R.dayOnly&&mode!=='day');}
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
  // world map + continent filter
  if(typeof MAP!=='undefined'&&$('worldMap'))MAP.mount($('worldMap'));
  const cf=$('contChips');if(cf){cf.innerHTML='';[['','All']].concat(CONTINENTS.map(c=>[c,c])).forEach(([k,n])=>{const cnt=k?RIVERS.filter(r=>r.cont===k).length:RIVERS.length;if(!cnt)return;const b=document.createElement('button');b.className='pill'+((sel.cont||'')===k?' sel':'');b.innerHTML=`${n}<small>${cnt} river${cnt>1?'s':''}</small>`;b.onclick=()=>{sel.cont=k;if(typeof MAP!=='undefined'&&MAP.cv){if(k&&CONT_BOX[k])MAP.zoomBox(CONT_BOX[k]);else MAP.zoomWorld();}buildMenu();};cf.appendChild(b);});}
  // rivers + leaderboards
  const rg=$('rivers');rg.innerHTML='';
  for(const R of RIVERS){if(sel.cont&&R.cont!==sel.cont&&R.id!==sel.river)continue;
    const hi=R.rapids.reduce((a,r)=>sev(R,r.c)>sev(R,a.c)?r:a),lo=R.rapids.reduce((a,r)=>sev(R,r.c)<sev(R,a.c)?r:a);
    const ok=riverOK(R,sel.mode),tops=LB.top(R.id,sel.mode,'score',3),fast=LB.top(R.id,sel.mode,'time',1)[0];
    const d=document.createElement('div');d.className='card river'+(sel.river===R.id?' sel':'')+(ok?'':' dim');
    const lbRows=tops.length?tops.map((t,i)=>`<div class="lbr"><span>${['🥇','🥈','🥉'][i]} ${esc(t.name)}</span><span>${CRAFTS[t.craft]?CRAFTS[t.craft].name.split(' ').pop():''}</span><b>${t.score}</b></div>`).join(''):'<div class="lbr empty">No runs yet. Be the first!</div>';
    d.innerHTML=`<div class="tag">${R.scale==='gc'?`CLASS ${lo.c}–${hi.c} / 10`:`CLASS ${lo.c}–${hi.c}`}</div><h3>${R.name}</h3><div class="where">${R.cont&&R.cont!=='North America'||R.country&&R.country!=='USA'?'🌍 '+esc(R.country||R.cont)+' · ':''}${R.river} · ${R.stretch}${R.waterF?` · 🌡 ${R.waterF}°F water`:''}</div><p>${R.blurb}</p>
      <div class="lb"><div class="lbh">🏆 Top ${MODES[sel.mode].name} scores</div>${lbRows}<div class="lbf">⏱ Fastest: ${fast?`<b>${fmtTime(fast.time)}</b> · ${esc(fast.name)}`:'—'}</div></div>
      ${ok?`<button class="run">▶ Run this river</button>`:`<div class="note2">${R.expOnly?'Expedition only: pick Expedition above.':'Day trip only (no camping in this canyon).'}</div>`}`;
    d.onclick=e=>{if(!ok)return;sel.river=R.id;if(e.target.classList.contains('run')){startFlow();return;}buildMenu();};
    rg.appendChild(d);}
  const R=RIVERS.find(r=>r.id===sel.river);
  $('seasonNote').textContent=`${R.name}: ${R.season}`;
  const lg=$('levels');lg.innerHTML='';
  LEVEL_KEYS.forEach((k,i)=>{const b=document.createElement('button');b.className='pill'+(sel.level===k?' sel':'');
    b.innerHTML=`${LEVELS[k].name}<small>${(R.cfs[i]||0).toLocaleString()} cfs · ${LEVELS[k].note}</small>`;b.onclick=()=>{sel.level=k;buildMenu();};lg.appendChild(b);});
  const cg2=$('ctrls');cg2.innerHTML='';[['arcade','Arcade (easy)','Drag, tap or arrows to move. The boat stays straight by itself. ⚡ boost.'],['pro','Pro (real oars)','Each oar pushes or pulls. You aim the boat. 3D needs real strokes.']].forEach(([k,n,dd])=>{const b=document.createElement('button');b.className='pill wide'+(sel.ctrl===k?' sel':'');b.innerHTML=`${n}<small>${dd}</small>`;b.onclick=()=>{sel.ctrl=k;buildMenu();};cg2.appendChild(b);});
  $('missionBox').innerHTML=`<div class="lbh">🎯 Today's goals · 💰 ${store.get('riverrun_bucks',0)} River Bucks</div>${missionsHtml(true)}`;
  const dg=$('d3');dg.innerHTML='';
  [['big','Big rapids','Class III+ / GC 5+, landmarks, bridges'],['all','Every rapid','more 3D, more paddling'],['off','Off','2D only']].forEach(([k,n,dd])=>{const b=document.createElement('button');b.className='pill'+(sel.d3===k?' sel':'');b.innerHTML=`${n}<small>${HAS3D()||k==='off'?dd:'needs internet (three.js)'}</small>`;b.onclick=()=>{sel.d3=k;buildMenu();};dg.appendChild(b);});
  if($('retroBtn')){$('retroBtn').textContent=sel.retro!==false?'🕹 Retro art: ON':'🕹 Retro art: OFF';$('retroBtn').classList.toggle('sel',sel.retro!==false);}
  $('factsBtn').textContent=sel.facts?'📜 History & facts: ON':'📜 History & facts: OFF';
  $('tipsBtn').textContent=sel.tips?'💡 Tips: ON':'💡 Tips: OFF';$('tipsBtn').classList.toggle('sel',sel.tips);
  const sv=TRIP.loadSave(),cb=$('contBtn');if(sv){const RR=RIVERS.find(r=>r.id===sv.river);cb.style.display='inline-block';cb.textContent=`▶ Continue expedition: ${RR?RR.name:sv.river} · Day ${sv.day}/${sv.days}`;}else cb.style.display='none';
  const nb=store.get('riverrun_badges',[]).length;$('badgesBtn').textContent=`🏅 Badges ${nb}/${BADGES.length}`;
  $('factsBtn').classList.toggle('sel',sel.facts);
  $('startBtn').textContent=`Launch: ${R.name} (${MODES[sel.mode].name})`;
}
$('pname').addEventListener('input',e=>{sel.name=(e.target.value||'Boatman').slice(0,18);saveSel();});
$('factsBtn').onclick=()=>{sel.facts=!sel.facts;buildMenu();};
if($('retroBtn'))$('retroBtn').onclick=()=>{sel.retro=!sel.retro;if(typeof MAP!=='undefined')MAP.dirty=true;buildMenu();};
$('tipsBtn').onclick=()=>{sel.tips=!sel.tips;if(sel.tips)store.set('riverrun_coach',[]);buildMenu();};
$('contBtn').onclick=()=>TRIP.continueSave();
$('badgesBtn').onclick=()=>showBadges();
$('shopBtn').onclick=()=>showShop();

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
  if(sel.mode==='expedition'&&TRIP.loadSave()&&!confirm('Start a new expedition? Your saved expedition will be lost.'))return;
  if(!riverOK(R,sel.mode))return;
  saveSel();
  if(sel.mode==='expedition')TRIP.openOutfitter(R,()=>startGame());
  else startGame();
}
function startGame(levelOverride){
  AU.init();AU.resume();
  const R=RIVERS.find(r=>r.id===sel.river),c=CRAFTS[sel.craft];
  const lvKey=levelOverride||sel.level,lv=LEVELS[lvKey];
  const uu=(store.get('riverrun_upg',{})[sel.craft])||{},upg={hand:1+.12*(uu.hand||0),pow:1+.1*(uu.pow||0),hull:1+.2*(uu.hull||0)};
  const use3d=sel.d3!=='off'&&HAS3D();if(use3d){try{init3D();}catch(e){console.warn(e);}}
  if(G)cleanup3D();
  const W=buildWorld(R,lvKey,use3d&&R3?sel.d3:'off');
  G={W,river:R,craft:c,ck:sel.craft,lvl:lv,lvlKey:lvKey,mode:sel.mode,scale:calcScale(R),
    b:{x:W.cx(250),y:250,vx:0,vy:R.speed*.7,h:0,av:0,bounce:0,oar:0},
    hpMax:Math.round(c.hp*lv.hp*upg.hull),hp:Math.round(c.hp*lv.hp*upg.hull),upg,boost:40,boostT:0,nm:new Set(),bucks:0,zoom:1,swims:0,score:0,t:0,state:'run',flipT:0,inv:0,shake:0,
    parts:[],streaks:[],holeIds:new Set(),latIn:new Set(),curHole:null,holeTick:0,maxY:250,clean:0,hits:0,toastT:0,lastHitT:-9,bannerT:0,hudT:0,view:{y0:0,y1:1000},cause:'',
    stallY:250,stallT:0,flush:0,use3d:use3d&&!!R3,mode3d:false,slowT:0,strokeReady:0,strokeBuf:null,lastSide:0,lastStrokeT:-9,rhythm:0,sa:{L:{t:1,back:false},R:{t:1,back:false}},
    poiIdx:0,pageQ:[],factQ:[],factT:0,swim:null,debris:[],debrisT:2,windT:8+Math.random()*10,gust:0,gustDir:0,cheer:0,cheerBig:false,flowMul:1,oarLost:false,lost:[],mobCount:0,rescues:0,
    camera:{camH:0},bsx:VW/2,bsy:VH*.74,
    wp:null,wpBack:false,oa:{L:{o:0,ph:.5},R:{o:0,ph:.5}},kp:{o:0,turn:0,ph:0},streak:0,stars:0,fauna:[],faunaT:1,rec:[],recT:0,lunchDay:-1,pal:R.pal,cam:null,
    ghost:sel.mode==='day'?store.get('riverrun_ghost_'+R.id+'_'+sel.craft,null):null,progT:0};
  for(let i=0;i<240;i++)G.streaks.push({x:0,y:-1e9});
  SCENE.close();for(const id of ['menu','end','pause','lbScreen','campScreen','outfit'])$(id).style.display='none';
  $('hud').style.display='flex';$('hbtns').style.display='flex';$('boostBox').style.display='block';
  $('controls').style.display=isTouch()?'flex':'none';
  hideBanner();
  if(G.use3d)prep3DBoat();
  TRIP.setup(G);
  setCtrlLabels();
  $('toWarn').style.display='none';G.W.stops.forEach(s=>s.done=false);
  setTimeout(()=>{if(G&&G.t<6)coach('click');},1500);
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
  for(const LS of [W.camps,W.stops,W.takeout?[W.takeout]:[]])for(const cp of LS){const dy=y-cp.y,big=cp===W.takeout;if(dy>(big?-420:-170)&&dy<(big?260:150)){const tb=t*cp.side;if(tb>.62){const k=smooth((tb-.62)/.2)*(1-Math.abs(dy)/(big?430:170));vy=lerp(vy,-.25*B,k);vx+=cp.side*25*k;}}}
  const F=W.feats;
  for(let i=lowerIdx(F,y-260);i<F.length&&F[i].y<y+260;i++){const f=F[i];
    if(f.t==='rock'){const dy=y-f.y,dx=x-f.x,r=f.r;
      if(dy>0&&dy<r*3&&Math.abs(dx)<r*1.15){const k=1-dy/(r*3);vy*=1-1.3*k;vx-=dx*.9*k;}
      else if(dy<0&&dy>-r*1.6&&Math.abs(dx)<r*1.2){const k=1+dy/(r*1.6);vx+=Math.sign(dx||1)*75*k;vy*=1-.35*k;}}
    else if(f.t==='hole'){const e2=((x-f.x)/f.rx)**2+((y-f.y)/f.ry)**2;if(e2<1){const g=Math.max(0,1-(f.age||0)/3.2);vy=B*(.25-.75*f.pow*g)+(1-g)*B*.6;vx+=(f.x-x)*1.2*g;}}
    else if(f.t==='boil'){const dx=x-f.x,dy=y-f.y,d=Math.hypot(dx,dy);if(d<f.r){const k=1-d/f.r;vx+=dx/f.r*90*f.pow*k+Math.sin(G.t*1.3+f.id)*30*k;vy=vy*(1-.5*k)+dy/f.r*60*f.pow*k;}}
    else if(f.t==='lat'){if(segDist(x,y,f.x0,f.y0,f.x1,f.y1)<18)vx+=f.dir*f.pow*110;}
    else if(f.t==='tongue'){const dy=y-f.y;if(dy>0&&dy<f.len&&Math.abs(x-f.x)<f.w*(1-dy/f.len))vy*=1.15;}
  }
  return {vx,vy,ri};
}
function relH(){return angDiff(G.b.h,Math.atan(G.W.dcx(G.b.y)));}
function sideRisk(){const s=Math.abs(Math.sin(relH())),ts=Math.sin(G.craft.tol*Math.PI/180);return smooth((s-ts*.7)/(ts*.6+.25));}
function curRapid(y){for(const r of G.W.rapids)if(y>=r.y0-60&&y<=r.y1+60)return r;return null;}
function inCalm(){return !curRapid(G.b.y)&&!G.mode3d&&!G.swim&&G.state==='run'&&!G.curHole&&G.W.rint(G.b.y)<.05;}
function ffOK(){const b=G.b,W=G.W;if(!inCalm()||G.pageQ.length)return false;
  if(W.rapids.some(r=>!r.done&&r.y0-b.y<1600&&r.y0>b.y-100))return false;
  const o=TRIP.todays();if(o&&o.some(c=>!c.rejected&&c.y-b.y<1900&&c.y>b.y-200))return false;
  const p=W.pois[G.poiIdx];if(p&&sel.facts&&!SEEN.has(p.id)&&p.y-b.y<900)return false;
  if(W.bridges.some(br=>br.y-b.y<900&&br.y>b.y))return false;return b.y<W.len-900;}
function toggleFF(){if(!G||G.state!=='run')return;if(!G.ff&&!ffOK()){toast('Fast-forward works in calm water only','#cfe3e0',1.2);return;}G.ff=!G.ff;$('bFF').classList.toggle('on',G.ff);if(G.ff)toast('⏩ Fast-forward','#cfe3e0',.8);}
function powerMul(){return (G.swim?.85:1)*TRIP.powerMul();}

/* ================= MESSAGES ================= */
function toast(txt,col,dur){const el=$('toast');el.textContent=txt;el.style.color=col||'#fff';el.style.opacity=1;el.style.fontSize=txt.length>40?'clamp(15px,3.5vw,22px)':'';if(G)G.toastT=dur||1.3;else setTimeout(()=>el.style.opacity=0,(dur||1.3)*1000);}
function showBanner(r){const el=$('banner');el.innerHTML=`<div class="bc">Scout · ${clsText(G.river,r.c)} · Mile ${r.m}</div><div class="bt">${r.n}</div><div class="bb">${r.beta}</div>`;el.style.display='block';G.bannerT=7;}
function hideBanner(){$('banner').style.display='none';}
$('banner').onclick=hideBanner;
function showFact(p){const el=$('fact');el.innerHTML=`<div class="fk">${KIND_ICON[p.k]||'📍'} Mile ${p.m} · ${p.k==='town'?'Town & access':p.k==='geo'?'Geology':p.k==='nat'?'Nature':p.k==='art'?'Rock art':p.k==='fest'?'Festival':p.k==='warn'?'River note':'History'}</div><div class="ft">${esc(p.n)}</div><img class="fimg" src="${SCENE.thumb(sceneSpec(p.scene||'canyon',p.id))}" alt=""><div class="fb">${esc(p.txt)}</div>`;el.style.display='block';G.factT=10;AU.chime();}
function hideFact(){$('fact').style.display='none';G&&(G.factT=0);}
$('fact').onclick=hideFact;
function openPage(p){
  G.prevState=G.state;G.state='page';AU.chime();bump('pages');
  SCENE.open({spec:sceneSpec(p.scene||'canyon',p.id),big:true,kicker:`${KIND_ICON[p.k]||'📍'} ${esc(G.river.name)} · Mile ${p.m}`,title:p.n,sub:p.page.sub,
    body:p.page.body.map(t=>`<p>${esc(t)}</p>`).join('')+'<div class="note">Painted scene. Short summary for the game. See local guidebooks and land agencies for more.</div>',
    buttons:[['Back on the river',closePage],['Turn off history pages',()=>{sel.facts=false;saveSel();closePage();}]]});
}
function closePage(){SCENE.close();if(G&&G.state==='page')G.state='run';}

/* ================= STROKES (3D paddle mode) ================= */
function backMod(){return !!(K.arrowdown||K.s||T.pull);}
function queueStroke(kind,back){if(!G||!G.mode3d||!G.craft.pd||G.state!=='run'||sel.ctrl!=='pro')return;if(G.t>=G.strokeReady)doStroke(kind,back);else if(G.strokeReady-G.t<.16)G.strokeBuf={kind,back};}
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
  if(sel.ctrl!=='pro'){if(G.t-(G.lastDmgT||-9)<.9)dmg*=.2;G.lastDmgT=G.t;}
  G.hp=Math.max(0,G.hp-dmg);G.shake=Math.min(14,4+dmg);G.hits++;if(dmg>2)vib(25);
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
  if(G.craft.roll&&Math.random()<G.craft.roll){award('roll');toast('COMBAT ROLL! +50','#5fd38d',1.2);G.score+=50;G.inv=1.2;G.b.av*=.3;G.b.h*=.5;AU.splash(.6);return;}
  if(r){r.clean=false;r.flipped=true;}G.streak=0;
  vib(150);G.state='flip';G.flipT=2.2;G.swims++;G.score=Math.max(0,G.score-150);G.cause=cause;G.swim=null;
  toast(G.ck==='tube'?`FLUSHED! ${cause}`:`FLIPPED! ${cause}`,'#ff6b5b',2);
  splash(G.b.x,G.b.y,30,1.4);AU.splash(1);G.shake=12;
  coach('flip');
  const cr=nearCrowd();if(cr){award('carnage');G.cheer=3;G.cheerBig=true;AU.cheer(1.4);setTimeout(()=>{if(G)toast('The crowd ROARS! Carnage bonus +50','#ffd36b',1.8);},900);G.score+=50;}
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
function maybeMOB(p,force){
  if(G.swim||G.state!=='run'||G.craft.crew<2||(!force&&(G.inv>0||Math.random()>p)))return;
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
  if(typeof WILD!=='undefined'&&!WILD.swimTick(s,dt))return;
  const b=G.b,d=Math.hypot(b.x-s.x,b.y-s.y);
  if(d<G.craft.r+22&&G.state==='run'){G.swim=null;G.rescues++;bump('rescues');missionBump('rescue');const p=Math.max(40,Math.round(160-s.t*4));G.score+=p;if(!(typeof WILD!=='undefined'&&WILD.rescued(s)))toast(`Pulled ${s.name} back in! +${p}`,'#5fd38d',1.6);AU.chime();return;}
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
  if(ok)endBadges();if(ok&&G.mode==='day')saveGhost();TRIP.clearSave(ok);
  const earned=G.bucks+Math.floor(G.score/(ok?500:1000));addBucks(earned);
  const sc=Math.round(G.score);
  const run={stars:G.stars,id:Date.now()+'-'+Math.random().toString(36).slice(2,7),name:sel.name||'Boatman',river:G.river.id,craft:G.ck,mode:G.mode,level:G.lvlKey,score:sc,time:G.t,ok,swims:G.swims,grade,date:new Date().toISOString().slice(0,10)};
  LB.add(run);
  const rs=LB.rank(run,'score'),rt=ok?LB.rank(run,'time'):0;
  $('hud').style.display='none';$('hbtns').style.display='none';$('boostBox').style.display='none';$('controls').style.display='none';$('toWarn').style.display='none';$('coach').style.display='none';hideBanner();hideFact();
  const ek=PIX.endKind(ok,reason);
  $('endWrap').innerHTML=`<canvas id="endArt" class="endart"></canvas><div class="retrocap">${esc(PIX.endCaption(ek,reason))}</div><h1>${ok?'Take-out!':'Trip over'}</h1><div class="sub">${ok?`${G.river.name} · ${G.craft.name} · ${MODES[G.mode].name} · ${G.lvl.name} water`:esc(reason)}</div>
   <div class="grade">${grade}</div>
   ${rs&&rs<=3?`<div class="rank">🏆 #${rs} for points on this river (${MODES[G.mode].name})</div>`:''}${rt&&rt<=3?`<div class="rank">⏱ #${rt} fastest trip</div>`:''}
   <div class="stats"><div><b>${sc}</b>Score</div><div><b>${fmtTime(G.t)}</b>River time</div><div><b>${G.clean}/${total}</b>Clean lines</div><div><b>${G.swims}</b>Swims</div><div><b>${Math.round(G.hp/G.hpMax*100)}%</b>Hull</div><div><b>${G.rescues}/${G.mobCount}</b>Rescues</div><div><b>${'★'.repeat(Math.min(5,Math.round(G.stars/Math.max(1,total*3)*5)))||'—'}</b>${G.stars}/${total*3} stars</div><div><b>${G.bestStreak||0}</b>Best streak</div></div>
   <div class="rank">💰 +${earned} River Bucks (total ${store.get('riverrun_bucks',0)})</div>${missionsHtml()}
   ${extra.html||''}
   <button class="big" id="againBtn">Run it again</button><button class="ghost" id="endMenuBtn">Main menu & leaderboards</button>`;
  $('end').style.display='block';
  {const cv=$('endArt'),t0=performance.now();const f=()=>{if($('end').style.display==='none'||!cv.isConnected)return;PIX.endArt(cv,ek,(performance.now()-t0)/1000,G&&G.river);setTimeout(()=>requestAnimationFrame(f),80);};f();}
  $('againBtn').onclick=()=>startFlow();$('endMenuBtn').onclick=toMenu;
  setTimeout(()=>AU.suspend(),400);
}
function toMenu(){if(G)cleanup3D();G=null;SCENE.close();for(const id of ['hud','hbtns','boostBox','controls','pause','end','campScreen','outfit','lbScreen','toWarn','coach'])$(id).style.display='none';hideBanner();$('fact').style.display='none';buildMenu();$('menu').style.display='block';AU.roar(0);}
function togglePause(){if(!G||['done','camp','page','scene'].includes(G.state))return;
  if(G.state==='pause'){G.state=G.prevState;$('pause').style.display='none';AU.resume();}
  else{G.prevState=G.state;G.state='pause';$('pauseInfo').textContent=`${G.river.name} · Mile ${G.W.mileAt(G.b.y).toFixed(1)}${G.mode!=='day'?` · Day ${TRIP.day()}`:''}`;$('pFacts').textContent=sel.facts?'History & facts: ON':'History & facts: OFF';$('pCtrl').textContent='Controls: '+(sel.ctrl==='pro'?'Pro (real oars)':'Arcade (easy)');$('pause').style.display='block';AU.suspend();}}

/* ================= UPDATE ================= */
function update(dt){
  const b=G.b,c=G.craft,W=G.W;
  G.t+=dt;G.inv=Math.max(0,G.inv-dt);G.shake*=Math.pow(.02,dt);b.bounce*=Math.pow(.05,dt);G.cheer=Math.max(0,G.cheer-dt);
  updParts(dt);
  if(G.state==='flip'){G.flipT-=dt;const f=flowAt(b.x,b.y);b.x+=f.vx*dt*.7;b.y+=Math.max(30,f.vy)*dt*.7;b.h+=dt*1.5;if(G.flipT<=0)respawn();return;}
  const arcade=sel.ctrl!=='pro',paddle=G.mode3d&&!!c.pd&&!arcade,pm=powerMul();
  G.boostT=Math.max(0,G.boostT-dt);
  if(paddle){for(const s of['L','R']){const a=G.sa[s];a.t=Math.min(1,a.t+dt/(c.pd.cd*1.6));}
    if(G.strokeBuf&&G.t>=G.strokeReady){const k2=G.strokeBuf;G.strokeBuf=null;doStroke(k2.kind,k2.back);}}
  const kL=K.arrowleft||K.a||T.left,kR=K.arrowright||K.d||T.right,kU=K.arrowup||K.w||T.push,kD=K.arrowdown||K.s||T.pull,manual=kL||kR||kU||kD;
  if(manual&&G.wp)G.wp=null;
  let turn=0,base=0,aS=0,aT=0;
  if(arcade){aS=(kR?1:0)-(kL?1:0);aT=(kU?1:0)-(kD?1:0);
    if(!manual&&G.wp){const dx=G.wp.x-b.x,dy=G.wp.y-b.y;aS=clamp(dx/70,-1,1);aT=G.wpBack?-1:(dy<-30?-1:(dy<240&&Math.abs(dx)>40?-.5:.2));if(Math.hypot(dx,dy)<c.r+20||(dy<-60&&!MS.down))G.wp=null;}}
  else if(!paddle){turn=(kR?1:0)-(kL?1:0);base=(kU?1:0)-(kD?1:0);
    if(MS.sq){turn=clamp(angDiff(nearStraight(),b.h)*2.5,-1,1);base=0;}
    else if(G.wp&&!manual){const ap=autopilot();if(ap){turn=ap.turn;base=ap.base;}}}
  else if(G.wp||MS.sq){const ap=MS.sq?{tgtH:nearStraight(),back:false,base:.5}:autopilot();
    if(ap&&ap.tgtH!==null&&G.t>=G.strokeReady&&G.t-MS.lastStroke>c.pd.cd*1.1&&Math.abs(ap.base)>.05){MS.lastStroke=G.t;const d=angDiff(ap.tgtH,b.h);let kind=Math.abs(d)<.25?'B':(ap.back?(d>0?'R':'L'):(d>0?'L':'R'));if(MS.sq&&Math.abs(d)<.12)kind=null;if(kind)queueStroke(kind,ap.back&&!MS.sq);}}
  if(manual&&G.ff){G.ff=false;$('bFF').classList.remove('on');}
  const push=arcade?(aT>0||G.boostT>0):paddle?(G.t-G.lastStrokeT<.45&&!backMod()):base>.1;
  /* Oar boats: each oar pushes (forward) or pulls (back-row). Pulling is stronger: the rower uses legs and back.
     One oar pushing while the other pulls spins the boat in place. */
  const oarBoat=!paddle&&(G.ck==='raft'||G.ck==='dory');let thrust=0;
  if(!paddle&&!arcade){if(oarBoat){const oL=clamp(base+turn,-1,1),oR=G.oarLost?0:clamp(base-turn,-1,1);const fL=oL>0?oL*c.row:oL*c.back,fR=oR>0?oR*c.row:oR*c.back;thrust=(fL+fR)/2;b.av+=(fL-fR)/c.row*c.turn*.55*dt;G.oa.L.o=oL;G.oa.R.o=oR;}
    else{thrust=base>0?base*c.row:base*c.back;b.av+=turn*c.turn*dt;G.kp.o=base;G.kp.turn=turn;}}
  b.av*=1-((Math.abs(turn)>.05||Math.abs(base)>.1)?1.2:3.2)*dt;
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
  if(arcade){/* ARCADE: you choose where to go; the boat keeps itself straight. The current still pushes and spins you. */
    const A=c.arc,U=G.upg;let latV=aS*A.lat*U.hand;const fwdV=(aT>0?aT*A.fwd:aT<0?aT*A.back:A.cruise)*U.pow*pm+(G.boostT>0?150:0);
    /* smart steering: slide away from rocks just ahead (like kart-racer steering assist) */
    {const F2=W.feats;for(let i=lowerIdx(F2,b.y-20);i<F2.length&&F2[i].y<b.y+90+Math.max(0,b.vy)*.7;i++){const r2=F2[i];if(r2.t!=='rock'||r2.shore)continue;const ddx=b.x-r2.x,cl=r2.r+c.r+28;if(Math.abs(ddx)<cl){const k2=(1-Math.abs(ddx)/cl)*(1-(r2.y-b.y)/(100+Math.max(0,b.vy)*.8));latV+=(ddx>=0?1:-1)*240*Math.max(0,k2)*U.hand;}}}
    const L=landTarget();if(L&&Math.abs(b.y-L.y)<300){const o=b.x-W.cx(b.y),shore=W.hw(b.y)-o*L.side;if(o*L.side>0&&shore<170&&(aS*L.side>.2||G.wp)){latV+=L.side*110;b.vy-=(b.vy-f.vy*.3)*Math.min(1,1.2*dt);}}
    const k=(G.curHole&&G.flush<=0?.8:A.resp)*(1+(U.hand-1)*1.5);
    b.vx+=(f.vx+latV-b.vx)*Math.min(1,k*dt);b.vy+=(f.vy+fwdV-b.vy)*Math.min(1,k*.75*dt);
    const tol=c.tol*Math.PI/180,want=Math.atan(W.dcx(b.y))+clamp(Math.atan2(latV,Math.max(90,fwdV+f.vy*.6))*.7,-tol*.55,tol*.55);
    b.av+=(angDiff(want,b.h)*A.assist*U.hand-b.av*A.damp)*dt;
    const o=Math.abs(aT)>.05?aT:A.cruise>0?.3:0;G.oa.L.o=clamp(o+aS*.7,-1,1);G.oa.R.o=G.oarLost?0:clamp(o-aS*.7,-1,1);G.kp.o=o;G.kp.turn=aS;}
  else{
  const kh=G.curHole&&G.flush<=0?1.6:1;
  const rx=b.vx-f.vx,ry=b.vy-f.vy;let al=rx*dx+ry*dy,la=rx*px+ry*py;
  al-=al*Math.min(1,c.kLong*kh*dt);la-=la*Math.min(1,c.kLat*kh*dt);
  b.vx=f.vx+al*dx+la*px;b.vy=f.vy+al*dy+la*py;
  if(thrust){b.vx+=dx*thrust*pm*G.upg.pow*dt;b.vy+=dy*thrust*pm*G.upg.pow*dt;}
  if(G.boostT>0){b.vx+=dx*220*dt;b.vy+=dy*220*dt;}}
  updOarAnim(dt);
  // wind
  if(sel.ctrl!=='pro'&&G.state==='run'&&G.hp>0&&G.hp<G.hpMax*.6&&!curRapid(b.y)){G.hp=Math.min(G.hpMax*.6,G.hp+dt*.8);}
  if(G.river.wind){G.windT-=dt;if(G.windT<=0&&G.gust<=0&&!curRapid(b.y)){G.gust=5+Math.random()*5;G.gustDir=(Math.random()-.5)*.6;G.windT=20+Math.random()*25;if(!G.windSeen){G.windSeen=true;toast('Upstream wind! Row through it.','#cfe3e0',1.5);}}
    if(G.gust>0){G.gust-=dt;b.vy-=G.river.wind*45*dt;b.vx+=G.gustDir*30*dt;}}
  const py0=b.y;b.x+=b.vx*dt;b.y+=b.vy*dt;
  // banks
  const cx0=W.cx(b.y),hw=W.hw(b.y),lim=hw-c.r*.8,off=b.x-cx0;
  if(Math.abs(off)>lim){const s=Math.sign(off);b.x=cx0+s*lim;const vn=b.vx*s;if(vn>0){b.vx-=1.4*vn*s;b.av+=-s*vn*.004;if(vn>(sel.ctrl!=='pro'?115:60)&&!TRIP.landingZone()&&!landTarget())hit((vn-50)*.1*c.rockDmg,'Wall!',b.x+s*c.r,b.y,vn);}}
  // features
  let inH=null;const F=W.feats;
  for(let i=lowerIdx(F,b.y-260);i<F.length&&F[i].y<b.y+260;i++){const ft=F[i];
    if(ft.t==='rock'){if(G.flush>0)continue;const ddx=b.x-ft.x,ddy=b.y-ft.y,d=Math.hypot(ddx,ddy),md=ft.r+c.r*.85;
      if(d<md&&d>0){const nx=ddx/d,ny=ddy/d;b.x=ft.x+nx*md;b.y=ft.y+ny*md;const vn=b.vx*nx+b.vy*ny;
        if(vn<0){b.vx-=1.4*vn*nx;b.vy-=1.4*vn*ny;const imp=-vn;b.av+=(nx*dy-ny*dx)*imp*.012;if(imp>45)hit(Math.min((imp-35)*.16*c.rockDmg*(ft.shore?.45:1),sel.ctrl!=='pro'?G.hpMax*.16:999),ft.name?ft.name+'!':'Rock!',ft.x+nx*ft.r,ft.y+ny*ft.r,imp);}G.nm.add(ft.id);}
      else if(d<md+26&&ft.r>14&&!G.nm.has(ft.id)&&G.state==='run'&&b.y>ft.y){G.nm.add(ft.id);nearMiss();}}
    else if(ft.t==='hole'){const e=((b.x-ft.x)/ft.rx)**2+((b.y-ft.y)/ft.ry)**2;if(e<1){inH=ft;G.nm.add(ft.id);}else if(e<1.9&&ft.pow>.5&&b.y>ft.y&&!G.nm.has(ft.id)&&G.state==='run'){G.nm.add(ft.id);nearMiss();}}
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
      if(G.inv<=0){let risk=inH.pow*sideRisk();if(b.vy>140)risk*=.7;if(push)risk*=.75;if(G.boostT>0)risk*=.4;
        if(Math.random()<Math.min(.95,risk))flip(inH.name||'Hole');
        else{if(sideRisk()>.2)maybeMOB(.35);if(inH.pow>.6){const p=Math.round(60*inH.pow);G.score+=p;toast(`${inH.name?inH.name+' — ':''}Punched it! +${p}`,'#ffd36b',1);}}}
      G.holeTick=.8;}
    else{G.holeTick-=dt;if(G.holeTick<=0){G.holeTick=.7;if(G.inv<=0&&Math.random()<Math.min(.8,inH.pow*sideRisk()*.45))flip((inH.name||'Hole')+' — surfed and flipped');}}
  }
  if(inH)inH.age=(inH.age||0)+dt;if(G.curHole&&G.curHole!==inH)G.curHole.age=0;
  G.curHole=inH;
  updSwimmer(dt);updDebris(dt);updItems();
  if(G.state!=='run')return;
  if(b.y>G.maxY){G.score+=(b.y-G.maxY)*.05;G.maxY=b.y;}
  for(const r of W.rapids){
    if(!r.announced&&b.y>r.y0-1400){r.announced=true;showBanner(r);}
    if(!r.entered&&b.y>r.y0){r.entered=true;r.entryRisk=sideRisk();if(!G.coachRapid){G.coachRapid=1;coach('ring');}}
    if(!r.done&&b.y>r.y1)rapidDone(r);
  }
  // history markers and facts
  const PO=W.pois;
  while(G.poiIdx<PO.length&&b.y>=PO[G.poiIdx].y-320){const p=PO[G.poiIdx++];if(!sel.facts||SEEN.has(p.id))continue;if(p.page)G.pageQ.push(p);else G.factQ.push(p);}
  if(G.factQ.length&&G.factT<=0&&!G.mode3d){const p=G.factQ.shift();SEEN.add(p.id);showFact(p);}
  if(G.pageQ.length&&inCalm()&&G.t>1.2){const p=G.pageQ.shift();SEEN.add(p.id);openPage(p);return;}
  TRIP.update(dt);
  updLandings();updFauna(dt);if(typeof SCN!=='undefined')SCN.update(dt);if(typeof WILD!=='undefined')WILD.update(dt);updRecord(dt);
  if(G.state==='run'&&b.y>=W.len){if(W.takeout)missedTakeout();else endGame(true);}
}
function onWave(w,push){
  const b=G.b;b.bounce=Math.max(b.bounce,.06+w.h*.12*clamp(70/G.craft.len,.7,1.3));b.vy*=.95;
  splash(b.x,b.y,Math.round(3+w.h*8),.5+w.h*.6);if(w.h>.4)AU.splash(w.h*.6);
  if(G.inv>0)return;
  const risk=Math.max(0,w.h-.45)*.9*sideRisk()*(push?.85:1)*clamp(76/G.craft.len,.8,1.4)*(G.boostT>0?.5:1);
  if(Math.random()<risk){flip(w.name||'Big wave');return;}
  if(w.h>.55&&sideRisk()>.25)maybeMOB(.25);
  if(w.h>.55&&sideRisk()<.05){const p=Math.round(15*w.h);G.score+=p;addBoost(5);if(w.name)toast(`${w.name} — straight! +${p}`,'#ffd36b',1);else if(w.h>.75)pop(`WAVE! +${p}`,'#bfefff');}
}
function updParts(dt){for(let i=G.parts.length-1;i>=0;i--){const p=G.parts[i];p.life+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.93;p.vy*=.93;p.z+=p.vz*dt;p.vz-=380*dt;if(p.z<0){p.z=0;p.vz=0;}if(p.life>p.max)G.parts.splice(i,1);}}
function updStreaks(dt){const W=G.W,{y0,y1}=G.view;
  for(const s of G.streaks){
    if(s.y<y0-40||s.y>y1+40||Math.abs(s.x-W.cx(s.y))>W.hw(s.y)){s.y=s.y<-1e8?y0+Math.random()*(y1-y0):(s.y<y0?y1+Math.random()*30:y0+Math.random()*(y1-y0));s.x=W.cx(s.y)+(Math.random()*2-1)*W.hw(s.y)*.95;s.l=.5+Math.random()*.8;}
    const f=flowAt(s.x,s.y);s.vx=f.vx;s.vy=f.vy;s.x+=f.vx*dt;s.y+=f.vy*dt;}
}


/* ================= CLICK-TO-GO AUTOPILOT =================
   Tap or click the river: the boat rows there. It picks push or pull
   (pulling is stronger for oars), ferries across the current, and keeps
   the boat close to straight inside rapids. */
function nearStraight(){return Math.abs(angDiff(0,G.b.h))<Math.PI/2?0:Math.PI;}
function screenToWorld(sx,sy){if(!G)return null;if(G.mode3d&&R3)return pick3D(sx,sy);const c=G.cam;if(!c)return null;return {x:c.camX+(sx-VW/2-c.shx)/c.sc,y:c.camY+(c.by+c.shy-sy)/c.sc};}
function autopilot(){
  const b=G.b,c=G.craft,wp=G.wp;if(!wp)return null;
  const dx=wp.x-b.x,dy=wp.y-b.y,dist=Math.hypot(dx,dy);
  if(dist<c.r+22||dy<-900){G.wp=null;return null;}
  const f=flowAt(b.x,b.y);let rx,ry;
  if(dy>180){/* far downstream: let the current carry you, ferry sideways at about 45° */
    const tY=dy/Math.max(40,f.vy),vxr=clamp(dx/Math.max(.7,tY),-230,230);rx=vxr-f.vx;ry=-Math.abs(rx)*.45;if(Math.abs(rx)<18){rx=0;ry=0;}}
  else{/* close or upstream: go straight to the spot (eddy in, land, catch a swimmer) */
    const T=clamp(dist/140,.7,5);let vx=dx/T,vy=dy/T;const vm=Math.hypot(vx,vy);if(vm>230){vx*=230/vm;vy*=230/vm;}rx=vx-f.vx;ry=vy-f.vy;}
  const rm=Math.hypot(rx,ry);
  if(rm<25)return {turn:clamp(angDiff(nearStraight(),b.h)*2,-1,1),base:0,tgtH:null,back:false};
  const th=Math.atan2(rx,ry);let tgtH,back;
  const dF=Math.abs(angDiff(th,b.h)),dB=Math.abs(angDiff(th+Math.PI,b.h)),bias=c.back>c.row?.35:-.25;
  if(G.wpBack||dB<dF+bias){tgtH=th+Math.PI;back=true;}else{tgtH=th;back=false;}
  if(f.ri>.08){const lim=(c.tol*Math.PI/180)*.75,b0=Math.abs(angDiff(tgtH,0))<Math.PI/2?0:Math.PI;tgtH=b0+clamp(angDiff(tgtH,b0),-lim,lim);}
  const err=angDiff(tgtH,b.h),turn=clamp(err*2.6,-1,1);
  const mag=clamp(rm/160,.25,1)*(Math.abs(err)<1.1?1:Math.abs(err)<1.8?.4:0);
  return {turn,base:back?-mag:mag,tgtH,back};
}
/* Oar pose: push = blade goes bow→stern in the water, pull = stern→bow. Recovery is out of the water, feathered. */
function oarPose(o){
  if(typeof o!=='object'||!o)return {a:Math.sin(o||0)*.5,wet:Math.sin(o||0)>0};
  if(Math.abs(o.o)<.08)return {a:0,wet:false,idle:true};
  const dir=o.o>0?1:-1;if(o.ph<.55)return {a:dir*lerp(-.62,.62,o.ph/.55),wet:true};
  return {a:dir*lerp(.62,-.62,(o.ph-.55)/.45),wet:false};
}
function updOarAnim(dt){for(const s of['L','R']){const o=G.oa[s];if(Math.abs(o.o)>.08)o.ph=(o.ph+dt*(1.05+.5*Math.abs(o.o)))%1;else o.ph=.55;}
  const k=G.kp;if(Math.abs(k.o)>.08||Math.abs(k.turn)>.08)k.ph=(k.ph+dt*1.7)%2;}
/* Kayak paddle angle: strokes alternate sides. Forward = blade bow→stern. Turning = forward sweep on one side, back stroke on the other. */
function kayakPose(k,t){if(!k||(Math.abs(k.o)<.08&&Math.abs(k.turn)<.08))return {th:Math.sin(t*1.5)*.08,side:0};
  const side=k.ph<1?-1:1,f=k.ph%1;let dir=Math.abs(k.o)>.1?Math.sign(k.o):(side<0?Math.sign(k.turn):-Math.sign(k.turn));if(!dir)dir=1;
  const th=side<0?dir*lerp(.7,-.7,f):dir*lerp(-.7,.7,f);return {th,side};}

/* ================= STARS + STREAKS ================= */
function streakMul(){return 1+Math.min(4,Math.max(0,G.streak-1))*.5;}
function rapidDone(r){
  r.done=true;const cr=nearCrowd();
  const st=r.flipped?0:!r.clean?1:(r.entryRisk!==undefined&&r.entryRisk<.12?3:2);r.stars=st;G.stars+=st;
  const stars='★'.repeat(st)+'☆'.repeat(3-st);
  if(r.clean){G.streak++;G.bestStreak=Math.max(G.bestStreak||0,G.streak);const mul=streakMul(),p=Math.round((100+r.s*900)*mul);G.score+=p;G.clean++;addBoost(20+st*5);missionBump('clean');if(st===3)missionBump('stars3');
    toast(`${stars} CLEAN LINE${mul>1?' ×'+mul.toFixed(1):''}! +${p}`,'#5fd38d',1.6);if(cr){G.cheer=2.5;G.cheerBig=false;AU.cheer(1);}
    if(/Lava Falls/.test(r.n))award('lava');if(/^Crystal/.test(r.n))award('crystal');if(st===3&&r.s>=.78)award('three');if(G.streak>=5)award('streak5');}
  else{G.streak=0;toast(`${stars} ${r.n}: ${st?'survived':'swam'}`,'#cfe3e0',1.3);}
  if(!G.coachPull&&G.W.rapids.filter(x=>x.done).length>=2){G.coachPull=1;coach('pull');}
}

/* ================= LANDINGS: STOPS + TAKE-OUT ================= */
function landNear(p,big){const b=G.b,W=G.W,c=G.craft,dy=b.y-p.y,ar=sel.ctrl!=='pro';if(dy<(big?-420:ar?-300:-240)||dy>(big?280:ar?230:190))return false;const o=b.x-W.cx(b.y),shore=W.hw(b.y)-o*p.side;return o*p.side>0&&shore<c.r+(big?75:ar?70:48)&&Math.hypot(b.vx,b.vy)<(big?175:ar?190:150);}
function landTarget(){const b=G.b,W=G.W,o=TRIP.todays();if(o){const c=o.find(x=>!x.rejected&&Math.abs(x.y-b.y)<320);if(c)return c;}const s=W.stops.find(x=>!x.done&&Math.abs(x.y-b.y)<320);if(s)return s;if(W.takeout&&!o&&Math.abs(W.takeout.y-b.y)<450)return W.takeout;return null;}
function updLandings(){
  if(G.state!=='run')return;const b=G.b,W=G.W;
  for(const s of W.stops){if(s.done)continue;if(b.y>s.y+260){s.done=true;continue;}if(s.y-b.y<1500&&!s.hinted){s.hinted=true;coach('stop');}if(landNear(s)){s.done=true;openStop(s);return;}}
  const to=W.takeout;if(!to||TRIP.todays())return;
  const mi=to.m-W.mileAt(b.y);
  if(mi<1.05&&!to.w1){to.w1=true;toast(`🏁 Take-out in 1 mile: ${to.n}, river ${to.side<0?'LEFT':'RIGHT'}. Do not miss it!`,'#ffd36b',3);AU.chime();coach('takeout');}
  if(mi<.35&&!to.w2){to.w2=true;const el=$('toWarn');el.textContent=`⚠ TAKE-OUT — PULL ${to.side<0?'LEFT':'RIGHT'} NOW`;el.style.display='block';}
  if(landNear(to,true)){landTakeout();return;}
  if(b.y>to.y+520)missedTakeout();
}
function landHint(){const b=G.b,W=G.W,to=W.takeout;
  if(to&&!TRIP.todays()){const mi=to.m-W.mileAt(b.y);if(mi<2&&mi>-.1)return `🏁 TAKE-OUT: ${to.n} ${mi<.15?'— LAND NOW':`in ${mi.toFixed(1)} mi`} (river ${to.side<0?'LEFT':'RIGHT'})`;}
  const s=W.stops.find(s=>!s.done&&s.y>b.y-150&&s.y-b.y<1800);if(s){const i=STOP_INFO[s.stop]||['📍','Stop'];return `${i[0]} Optional ${i[1].toLowerCase()}: ${s.n} (river ${s.side<0?'left':'right'})`;}
  return '';}
function stopBoat(){const b=G.b;b.vx=0;b.vy=0;b.av=0;G.wp=null;MS.down=false;if(G.mode3d)exit3D();hideBanner();hideFact();$('toWarn').style.display='none';}
function landTakeout(){
  const to=G.W.takeout;G.state='scene';stopBoat();G.score+=300;award('takeout');AU.cheer(.7);
  SCENE.open({spec:sceneSpec('takeout',to.n),kicker:'🏁 Take-out',title:to.n,sub:`${G.river.name} · Mile ${to.m}`,
    body:`<p>You made it! ${esc(to.how||'')}</p><p class="mute">Clean landing bonus: +300</p>`,
    buttons:[['Finish the trip',()=>{SCENE.close();G.state='run';endGame(true);}]]});
}
function missedTakeout(){
  const to=G.W.takeout;G.state='scene';stopBoat();AU.thunk(.8);G.shake=10;
  SCENE.open({spec:sceneSpec('danger','miss'),kicker:'⚠ Missed the take-out',title:`You floated past ${to.n}`,sub:G.river.name,
    body:`<p><b class="bad">${esc(to.miss||'There is no other safe exit.')}</b></p><p>On a real trip, missing the take-out can mean days of extra travel, no shuttle, no food plan and dangerous water. Watch for the take-out signs and start pulling to shore early.</p>`,
    buttons:[['See results',()=>{SCENE.close();G.state='run';endGame(false,'Missed the take-out. '+(to.miss||''));}]]});
}
function relaunchFrom(p){const b=G.b,W=G.W,to=W.takeout,nearTO=to&&to.y-p.y<1800&&to.y>p.y;b.y=Math.max(b.y,p.y+50);b.x=lerp(W.cx(b.y),b.x,nearTO&&to.side===p.side?.9:.4);b.h=0;b.av=0;const f=flowAt(b.x,b.y);b.vx=f.vx;b.vy=f.vy;G.state='run';G.inv=1;G.stallY=b.y;AU.resume();}
function openStop(s){
  G.state='scene';stopBoat();SEEN.add(s.id);bump('explore');missionBump('stops');
  const info=STOP_INFO[s.stop]||['📍','Stop'],done={};
  const show=msg=>{
    const body=(msg?`<div class="campfact">${msg}</div>`:'')+(s.page?s.page.body.map(t=>`<p>${esc(t)}</p>`).join(''):`<p>${esc(s.txt||'')}</p>`);
    const btns=[];
    if(!done.x)btns.push([s.stop==='swim'?'🏊 Swim':s.stop==='hike'?'🥾 Hike up':'📷 Look around and take photos',()=>{done.x=true;G.score+=60;show(s.stop==='swim'?'You float in the cool, clear water. Everyone feels new. +60':s.stop==='hike'?'You hike up and look around. Worth every step. +60':'Great photos and a good rest. +60');}]);
    if(!done.l&&G.lunchDay!==TRIP.day())btns.push(['🥪 Eat lunch here',()=>{done.l=true;G.lunchDay=TRIP.day();G.score+=40;bump('lunch');show(TRIP.lunch());}]);
    btns.push(['⛵ Back on the river',()=>{SCENE.close();relaunchFrom(s);}]);
    SCENE.open({spec:sceneSpec(s.scene||'canyon',s.id),kicker:`${info[0]} ${info[1]} · Mile ${s.m}`,title:s.n,sub:s.page?s.page.sub:G.river.name,body,buttons:btns,keep:true});
  };show();
}

/* ================= WILDLIFE ================= */
const FAUNA_SETS={gc:{raven:.26,condor:.12,heron:.14,bighorn:.18,fish:.18,ducks:.12},desert:{raven:.22,heron:.18,bighorn:.12,beaver:.16,fish:.14,ducks:.18},forest:{raven:.2,heron:.22,deer:.2,ducks:.18,fish:.2}};
function spawnFauna(){const R=G.river,set=R.fauna?R.fauna:R.trees?FAUNA_SETS.forest:R.scale==='gc'?FAUNA_SETS.gc:FAUNA_SETS.desert,b=G.b,W=G.W;
  let r=Math.random(),k='raven';for(const [kk,p] of Object.entries(set)){if(r<p){k=kk;break;}r-=p;}
  if(k==='condor'&&W.mileAt(b.y)>140)k='raven';
  const y=b.y+350+Math.random()*900;if(y>W.len)return;const side=Math.random()<.5?-1:1,cx=W.cx(y),hw=W.hw(y),f={k,y,t:0,side,ph:Math.random()*6};
  if(typeof WILD!=='undefined'&&WILD.kinds[k]){if(WILD.spawn(k,f,cx,hw,side))G.fauna.push(f);return;}
  if(k==='raven'||k==='condor'){f.x=cx-side*(hw+260);f.vx=side*(k==='condor'?40:95);f.vy=(Math.random()-.5)*40;f.alt=k==='condor'?220:90;}
  else if(k==='heron'||k==='deer'||k==='bighorn'){f.x=cx+side*(hw+(k==='heron'?-8:k==='deer'?30:45+Math.random()*40));f.state='stand';f.off=k==='heron'?-8:45;}
  else if(k==='fish'){f.x=cx+(Math.random()-.5)*hw*1.4;f.life=1.4;}
  else{f.x=cx+side*(hw-30);f.n=k==='ducks'?4+Math.floor(Math.random()*3):1;}
  G.fauna.push(f);}
function updFauna(dt){
  G.faunaT-=dt;if(G.faunaT<=0){G.faunaT=G.river.hippoZone?.8:1.1;if(G.fauna.length<9&&G.W.rint(G.b.y)<.4)spawnFauna();}
  const b=G.b;for(let i=G.fauna.length-1;i>=0;i--){const f=G.fauna[i];f.t+=dt;const d=Math.hypot(f.x-b.x,f.y-b.y);
    if(typeof WILD!=='undefined'&&WILD.kinds[f.k]){if(!WILD.upd(f,dt,d)||f.y<b.y-900||f.t>90){G.fauna.splice(i,1);}continue;}
    if(f.k==='raven'||f.k==='condor'){f.x+=f.vx*dt;f.y+=f.vy*dt+Math.sin(f.t*(f.k==='condor'?.4:1))*12*dt;}
    else if(f.k==='heron'){if(f.state==='stand'&&d<200){f.state='fly';f.vx=f.side*80;f.vy=70;AU.burst(1800,4,.05,.2);}if(f.state==='fly'){f.x+=f.vx*dt;f.y+=f.vy*dt;}}
    else if(f.k==='bighorn'||f.k==='deer'){if(d<230&&f.state==='stand')f.state='run';if(f.state==='run'){f.x+=f.side*35*dt;f.y+=30*dt;f.off+=35*dt;}}
    else if(f.k==='fish'){f.life-=dt;if(f.life<=0){G.fauna.splice(i,1);continue;}}
    else{const fl=flowAt(f.x,f.y);f.y+=fl.vy*.6*dt;if(d<200){f.x+=f.side*40*dt;f.flee=true;if(f.k==='beaver'&&!f.slap){f.slap=1;splash(f.x,f.y,6,.4);AU.burst(500,2,.15,.25);f.dive=.01;}}if(f.dive){f.dive+=dt;if(f.dive>2.5){G.fauna.splice(i,1);continue;}}}
    if(f.y<b.y-900||f.t>60||Math.abs(f.x-G.W.cx(f.y))>G.W.hw(f.y)+900)G.fauna.splice(i,1);}
}
function drawFauna(c,t){for(const f of G.fauna){
  if(typeof WILD!=='undefined'&&WILD.kinds[f.k]){WILD.draw2D(c,f,t);continue;}
  if(f.k==='raven'||f.k==='condor'){const s=f.k==='condor'?2.2:1,fl=Math.sin(t*(f.k==='condor'?2:9)+f.ph)*(f.k==='condor'?3:7);c.fillStyle='rgba(0,0,0,.16)';c.beginPath();c.ellipse(f.x+f.alt*.3,f.y-f.alt*.4,12*s,3*s,0,0,7);c.fill();
    c.strokeStyle='#15151a';c.lineWidth=3*s;c.beginPath();c.moveTo(f.x-16*s,f.y+fl);c.lineTo(f.x,f.y);c.lineTo(f.x+16*s,f.y+fl);c.stroke();
    if(f.k==='condor'){c.strokeStyle='#ededed';c.lineWidth=2.4;c.beginPath();c.moveTo(f.x-13*s,f.y+fl*.9-2);c.lineTo(f.x-5*s,f.y-2);c.moveTo(f.x+13*s,f.y+fl*.9-2);c.lineTo(f.x+5*s,f.y-2);c.stroke();}}
  else if(f.k==='heron'){if(f.state==='fly'){const fl=Math.sin(t*6)*8;c.strokeStyle='#8a96a3';c.lineWidth=4;c.beginPath();c.moveTo(f.x-24,f.y+fl);c.lineTo(f.x,f.y);c.lineTo(f.x+24,f.y+fl);c.stroke();}
    else{c.fillStyle='#8a96a3';c.beginPath();c.ellipse(f.x,f.y,6,12,0,0,7);c.fill();c.strokeStyle='#8a96a3';c.lineWidth=3;c.beginPath();c.moveTo(f.x,f.y+10);c.lineTo(f.x-f.side*4,f.y+22);c.stroke();c.strokeStyle='#e0b030';c.lineWidth=2;c.beginPath();c.moveTo(f.x-f.side*4,f.y+22);c.lineTo(f.x-f.side*13,f.y+24);c.stroke();
      c.strokeStyle='rgba(255,255,255,.3)';c.beginPath();c.arc(f.x,f.y,10+Math.sin(t*2)*2,0,7);c.stroke();}}
  else if(f.k==='bighorn'||f.k==='deer'){const x=G.W.cx(f.y)+f.side*(G.W.hw(f.y)+f.off);c.fillStyle=f.k==='deer'?'#8a5a32':'#9a7a52';c.beginPath();c.ellipse(x,f.y,8,14,0,0,7);c.fill();c.beginPath();c.arc(x,f.y+15,5,0,7);c.fill();
    if(f.k==='bighorn'){c.strokeStyle='#e0d2b0';c.lineWidth=3;c.beginPath();c.arc(x-5,f.y+17,4,0,5);c.stroke();c.beginPath();c.arc(x+5,f.y+17,4,Math.PI,Math.PI*2.6);c.stroke();}}
  else if(f.k==='fish'){const k=1-f.life/1.4;if(k<.45){c.fillStyle='#d6e2e8';c.beginPath();c.ellipse(f.x,f.y+k*40,4,10,0,0,7);c.fill();c.fillStyle='#e8a0a0';c.fillRect(f.x-1,f.y+k*40-4,2,8);}c.strokeStyle=`rgba(255,255,255,${.7*(1-k)})`;c.lineWidth=2;c.beginPath();c.arc(f.x,f.y,6+k*30,0,7);c.stroke();}
  else{const n=f.n||1;for(let j=0;j<n;j++){if(f.dive&&f.dive>.3)continue;const x=f.x+(f.flee?j*4:0),y=f.y+j*16;c.fillStyle=f.k==='beaver'?'#5a3a22':'#6b5a4a';c.beginPath();c.ellipse(x,y,f.k==='beaver'?7:4,f.k==='beaver'?12:7,0,0,7);c.fill();
    if(f.k==='ducks'){c.fillStyle='#b5442a';c.beginPath();c.arc(x,y+6,3,0,7);c.fill();}c.strokeStyle='rgba(255,255,255,.35)';c.lineWidth=1.5;c.beginPath();c.moveTo(x-8,y-14);c.lineTo(x,y-4);c.lineTo(x+8,y-14);c.stroke();}}}}

/* ================= 2D EXTRAS: bars, stops, take-out, waypoint ================= */
function render2DExtras(c,yMin,yMax,t){
  const W=G.W,pal=G.pal||G.river.pal;
  for(const g of W.bars){if(g.y+g.len<yMin||g.y-g.len>yMax)continue;const hw=W.hw(g.y),x=W.cx(g.y)+g.side*(hw-hw*g.w*.6);c.fillStyle=shade(mixHex(pal.sand,'#8a8a80',.35),1,.9);c.beginPath();c.ellipse(x,g.y,hw*g.w*.6,g.len*.5,0,0,7);c.fill();
    c.fillStyle='rgba(255,255,255,.15)';for(let i=0;i<14;i++){c.beginPath();c.arc(x+(hash2(g.y,i)-.5)*hw*g.w,g.y+(hash2(i,g.y)-.5)*g.len*.8,2+hash2(i,7)*3,0,7);c.fill();}
    c.strokeStyle='rgba(255,255,255,.25)';c.lineWidth=2;c.beginPath();c.ellipse(x,g.y,hw*g.w*.6+6,g.len*.5+6,0,0,7);c.stroke();}
  for(const s of W.stops){if(s.y<yMin-200||s.y>yMax+200)continue;const x=W.cx(s.y)+s.side*(W.hw(s.y)+8);c.fillStyle=pal.sand;c.beginPath();c.ellipse(x,s.y,42,100,0,0,7);c.fill();
    if(!s.done){c.strokeStyle=`rgba(242,201,138,${.5+.4*Math.sin(t*4)})`;c.lineWidth=4;c.setLineDash([10,8]);c.beginPath();c.ellipse(x-s.side*22,s.y,46,96,0,0,7);c.stroke();c.setLineDash([]);}
    c.fillStyle='#6b4a2c';c.fillRect(x+s.side*12-2,s.y,4,36);c.fillStyle='#f2c98a';c.beginPath();c.moveTo(x+s.side*12,s.y+36);c.lineTo(x+s.side*34,s.y+28);c.lineTo(x+s.side*12,s.y+20);c.fill();}
  const to=W.takeout;
  if(to&&to.y>yMin-600&&to.y<yMax+600){const s=to.side,hw=W.hw(to.y),bx=W.cx(to.y)+s*hw;
    c.fillStyle='rgba(255,40,40,.07)';c.beginPath();for(let y=to.y+300;y<Math.min(yMax,to.y+1400);y+=30)c.lineTo(W.cx(y)-W.hw(y),y);for(let y=Math.min(yMax,to.y+1400);y>=to.y+300;y-=30)c.lineTo(W.cx(y)+W.hw(y),y);c.fill();
    c.strokeStyle='rgba(255,80,80,.7)';c.lineWidth=4;c.setLineDash([16,12]);c.beginPath();c.moveTo(W.cx(to.y+520)-W.hw(to.y+520),to.y+520);c.lineTo(W.cx(to.y+520)+W.hw(to.y+520),to.y+520);c.stroke();c.setLineDash([]);
    c.fillStyle='#9a9a92';c.beginPath();c.moveTo(bx-s*70,to.y-50);c.lineTo(bx+s*80,to.y-70);c.lineTo(bx+s*80,to.y+70);c.lineTo(bx-s*70,to.y+50);c.closePath();c.fill();c.strokeStyle='rgba(0,0,0,.25)';c.lineWidth=2;for(let i=-3;i<=3;i++){c.beginPath();c.moveTo(bx-s*60,to.y+i*14);c.lineTo(bx+s*75,to.y+i*18);c.stroke();}
    c.strokeStyle=`rgba(255,215,107,${.55+.4*Math.sin(t*5)})`;c.lineWidth=5;c.beginPath();c.ellipse(bx-s*40,to.y,70,130,0,0,7);c.stroke();
    for(let k=0;k<4;k++){const ty=to.y-150+k*90,tx=bx+s*(150+(k%2)*30);c.fillStyle=['#c0392b','#2e86c1','#7f8c8d','#27ae60'][k];c.fillRect(tx-14,ty-24,28,48);c.fillStyle='rgba(0,0,0,.35)';c.fillRect(tx-12,ty+6,24,12);c.fillStyle='#555';c.fillRect(tx-10,ty-70,20,44);}
    for(let k=0;k<6;k++){const px=bx+s*(60+k*12),py=to.y-40+k*16+Math.abs(Math.sin(t*5+k))*4;c.fillStyle=['#e74c3c','#2ecc71','#3498db','#f1c40f','#9b59b6','#e67e22'][k];c.beginPath();c.arc(px,py,6,0,7);c.fill();c.fillStyle='#f1c27d';c.beginPath();c.arc(px,py+2,3,0,7);c.fill();}
    c.fillStyle='#5a3d24';c.fillRect(bx+s*30-3,to.y+60,6,60);c.fillStyle='#1d5e3a';c.fillRect(bx+s*30-46,to.y+100,92,40);c.strokeStyle='#fff';c.lineWidth=3;c.strokeRect(bx+s*30-46,to.y+100,92,40);}
  if(G.wp){const p=G.wp,k=.5+.5*Math.sin(t*6);c.strokeStyle=G.wpBack?'rgba(255,179,71,.9)':'rgba(95,211,141,.95)';c.lineWidth=4;c.beginPath();c.arc(p.x,p.y,18+k*6,0,7);c.stroke();c.lineWidth=2;c.beginPath();c.arc(p.x,p.y,5,0,7);c.stroke();
    c.setLineDash([8,10]);c.globalAlpha=.6;c.beginPath();c.moveTo(G.b.x,G.b.y);c.lineTo(p.x,p.y);c.stroke();c.setLineDash([]);c.globalAlpha=1;}
  drawFauna(c,t);
}
function render2DLabels(S,label,yMin,yMax){
  const W=G.W;
  for(const s of W.stops){if(s.y<yMin||s.y>yMax)continue;const i=STOP_INFO[s.stop]||['📍','Stop'];const [x,y]=S(W.cx(s.y)+s.side*(W.hw(s.y)+50),s.y);label(`${i[0]} ${s.done?'':'Optional '}${i[1].toLowerCase()}: ${s.n}`,x,y-48,'#f2c98a','rgba(60,40,20,.85)');}
  const to=W.takeout;if(to&&to.y>yMin&&to.y<yMax+300){const [x,y]=S(W.cx(to.y)+to.side*(W.hw(to.y)+30),to.y);ctxBig(`🏁 TAKE-OUT: ${to.n}`,x,y-120*G.scale,'#fff','#1d5e3a');
    const [x2,y2]=S(W.cx(to.y+520),to.y+520);label('⚠ NO SAFE EXIT BELOW',x2,y2,'#fff','rgba(160,20,20,.85)');}
}
function ctxBig(txt,x,y,col,bg){ctx.save();ctx.font='900 16px system-ui,sans-serif';const tw=ctx.measureText(txt).width+20,xx=clamp(x,tw/2+4,VW-tw/2-4);ctx.fillStyle=bg;ctx.fillRect(xx-tw/2,y-14,tw,28);ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.strokeRect(xx-tw/2,y-14,tw,28);ctx.fillStyle=col;ctx.textAlign='center';ctx.fillText(txt,xx,y+6);ctx.restore();}

/* ================= GHOST OF YOUR BEST RUN ================= */
function ghostKey(){return 'riverrun_ghost_'+G.river.id+'_'+G.ck;}
function updRecord(dt){if(G.mode!=='day')return;G.recT-=dt;if(G.recT<=0){G.recT=.25;G.rec.push(Math.round(G.b.x),Math.round(G.b.y),+G.b.h.toFixed(2));}}
function ghostAt(t){const g=G.ghost;if(!g||!g.p)return null;const dt=g.dt||.25,i=Math.floor(t/dt);if(i*3+5>=g.p.length)return null;const f=t/dt-i;return {x:lerp(g.p[i*3],g.p[i*3+3],f),y:lerp(g.p[i*3+1],g.p[i*3+4],f),h:g.p[i*3+2]};}
function saveGhost(){if(G.lvlKey!==(G.ghost&&G.ghost.lvl||G.lvlKey)&&G.ghost)return;const old=G.ghost;if(old&&old.time<=G.t)return;let p=G.rec,dt=.25;while(p.length>4500){const q=[];for(let i=0;i<p.length;i+=6)q.push(p[i],p[i+1],p[i+2]);p=q;dt*=2;}store.set(ghostKey(),{time:G.t,dt,p,lvl:G.lvlKey});if(old)award('ghost');}
function ghostTxt(){const g=ghostAt(G.t);if(!g)return 'finished';const d=(G.b.y-g.y)/1200;return (d>=0?'+':'')+d.toFixed(2)+' mi';}

/* ================= PROGRESS BAR ================= */
function drawProgress(){G.progT-=.1;if(G.progT>0)return;G.progT=.25;const cv=$('progCv');if(!cv||!cv.getContext)return;const w=cv.clientWidth||300,h=14,d=Math.min(2,DPR);if(cv.width!==Math.round(w*d)){cv.width=Math.round(w*d);cv.height=Math.round(h*d);}
  const c=cv.getContext('2d');c.setTransform(d,0,0,d,0,0);c.clearRect(0,0,w,h);const W=G.W,L=W.len,X=y=>clamp(y/L,0,1)*(w-8)+4;
  c.fillStyle='rgba(255,255,255,.2)';c.fillRect(4,6,w-8,3);
  for(const r of W.rapids){c.fillStyle=r.done?(r.clean?'#5fd38d':'#ff8a7a'):r.s>.7?'#ff6b5b':r.s>.45?'#ffb347':'#cfe3e0';c.fillRect(X(r.y0),3,Math.max(2,X(r.y1)-X(r.y0)),9);}
  const o=TRIP.todays();if(o)for(const cp of o){c.fillStyle='#5fd38d';c.beginPath();c.arc(X(cp.y),7.5,3,0,7);c.fill();}
  for(const s of W.stops){c.fillStyle=s.done?'#777':'#f2c98a';c.fillRect(X(s.y)-1,0,2,5);}
  if(W.takeout){c.fillStyle='#fff';c.fillRect(X(W.takeout.y)-1,0,3,14);}
  const g=ghostAt(G.t);if(g){c.fillStyle='rgba(200,200,255,.85)';c.beginPath();c.arc(X(g.y),7.5,3.5,0,7);c.fill();}
  c.fillStyle='#ffb347';c.beginPath();c.arc(X(G.b.y),7.5,5,0,7);c.fill();c.strokeStyle='#000';c.lineWidth=1;c.stroke();}

/* ================= COACH TIPS (first runs) ================= */
const COACH={hippo:'Hippos rest in deep water. Stay near the shallow bank and give them lots of room. If one charges, row away fast!',cold:'Cold water! A swimmer gets hypothermia fast. Rescue them quickly. Warm layers help on expeditions.',click:'Drag or tap where you want to go. The boat moves there and keeps itself straight. Up = faster, down = slower. ⚡ = boost.',
  ring:'Keep the ring around your boat GREEN: hit waves and holes straight, bow or stern first.',
  pull:'Tip: pulling (back-rowing) is stronger than pushing. Right-click a spot to back-row there, or hold PULL to slow down and ferry.',
  stop:'Optional stop ahead! Land on the beach to hike, swim or eat lunch.',ff:'Calm water: tap ⏩ (or F) to fast-forward.',
  flip:'Flipped! Next time square up and push hard through holes.',camp:'Camp tonight! Pull into the eddy next to the beach and touch the shore.',
  takeout:'The take-out is ahead. Steer to the ramp and touch it. Do not miss it!'};
function coach(id){const seen=store.get('riverrun_coach',[]);if(seen.includes(id)||!COACH[id]||!sel.tips)return;seen.push(id);store.set('riverrun_coach',seen);const el=$('coach');el.innerHTML=`💡 ${COACH[id]}`;el.style.display='block';clearTimeout(el._t);el._t=setTimeout(()=>el.style.display='none',7000);}
function coachDone(){const el=$('coach');if(el.style.display==='block'&&/Tap or click/.test(el.textContent))el.style.display='none';}

/* ================= BADGES ================= */
const BADGES=[['first','First Descent','Finish any river.'],['falls','Waterfall Rat','Raft a waterfall and land it straight.'],['quick','Quick Hands','Rescue a swimmer in under 5 seconds.'],['world','World River Rat','Finish rivers on 4 continents.'],['croc','Croc Dodger','Finish a crocodile river with no bites.'],['takeout','Right on Time','Land at a take-out.'],['clean','Clean Sweep','Finish a river with every rapid clean.'],
  ['streak5','On Fire','Run 5 rapids clean in a row.'],['three','Triple Star','Get 3 stars on a big rapid (Class 8+ or V).'],['crystal','Crystal Clear','Run Crystal clean.'],['lava','Lava Lord','Run Lava Falls clean.'],
  ['life','Lifeguard','Rescue 3 swimmers.'],['roll','Combat Roll','Roll your kayak back up.'],['carnage','Crowd Pleaser','Flip in front of a crowd.'],
  ['history','History Buff','Read 10 history pages.'],['lunch','Long Lunch','Eat lunch at 3 stops.'],['explore','Explorer','Land at 10 side stops.'],['camp','Happy Camper','Spend 5 nights at camp.'],
  ['flood','Flood Rider','Finish a river at Flood water.'],['dory','Dory Master','Finish a Grand Canyon section in a dory with no swims.'],['tube','Tube Legend','Finish a Class IV+ river in an inner tube.'],
  ['ghost','Ghost Buster','Beat your own ghost.'],['full','The Whole Canyon','Finish the full Grand Canyon expedition.']];
function award(id){const have=store.get('riverrun_badges',[]);if(have.includes(id))return;have.push(id);store.set('riverrun_badges',have);const b=BADGES.find(x=>x[0]===id);if(!b)return;
  const el=$('badgeToast');el.innerHTML=`🏅 <b>New badge:</b> ${b[1]}<br><small>${b[2]}</small>`;el.style.display='block';clearTimeout(el._t);el._t=setTimeout(()=>el.style.display='none',4200);AU.chime();}
function bump(k){const c=store.get('riverrun_counts',{});c[k]=(c[k]||0)+1;store.set('riverrun_counts',c);
  if(k==='pages'&&c[k]>=10)award('history');if(k==='lunch'&&c[k]>=3)award('lunch');if(k==='explore'&&c[k]>=10)award('explore');if(k==='rescues'&&c[k]>=3)award('life');if(k==='nights'&&c[k]>=5)award('camp');}
function endBadges(){award('first');const R=G.river;if(G.clean===G.W.rapids.length&&G.W.rapids.length>0)award('clean');if(G.lvlKey==='flood')award('flood');
  if(R.scale==='gc'&&G.ck==='dory'&&G.swims===0)award('dory');if(G.ck==='tube'&&R.rapids.some(r=>sev(R,r.c)>=.65))award('tube');if(R.id==='gc-full')award('full');
  const cs=store.get('riverrun_conts',[]);if(R.cont&&!cs.includes(R.cont)){cs.push(R.cont);store.set('riverrun_conts',cs);}if(cs.length>=4)award('world');if(R.fauna&&R.fauna.croc&&!G.crocBites)award('croc');}
function showBadges(){const have=store.get('riverrun_badges',[]),cnt=store.get('riverrun_counts',{});
  $('lbWrap').innerHTML=`<h1>Bad<span>ges</span></h1><div class="sub">${have.length} of ${BADGES.length} earned · ${cnt.explore||0} stops · ${cnt.pages||0} pages read · ${cnt.nights||0} nights at camp</div>
   <div class="grid">${BADGES.map(b=>`<div class="card ${have.includes(b[0])?'sel':'dim'}"><h3>${have.includes(b[0])?'🏅':'🔒'} ${b[1]}</h3><p>${b[2]}</p></div>`).join('')}</div><button class="big" id="lbBack">Back</button>`;
  $('lbBack').onclick=()=>{$('lbScreen').style.display='none';};$('lbScreen').style.display='block';}


/* ================= GAME FEEL: boost, close calls, collectibles, pop-ups ================= */
function vib(ms){try{navigator.vibrate&&navigator.vibrate(ms);}catch(e){}}
function pop(txt,col){try{const el=document.createElement('div');el.className='pop';el.textContent=txt;el.style.color=col||'#fff';el.style.left=((G?G.bsx:VW/2)+(Math.random()-.5)*50)+'px';el.style.top=((G?G.bsy:VH/2)-50)+'px';$('pops').appendChild(el);setTimeout(()=>{try{el.remove();}catch(e){}},1150);}catch(e){}}
function addBoost(n){if(G)G.boost=Math.min(100,G.boost+n);}
function useBoost(){if(!G||G.state!=='run')return;if(G.boost<34||G.boostT>0){pop('Boost not ready','#bbb');return;}G.boost-=34;G.boostT=1.8;vib(20);AU.burst(260,.8,.5,.7);pop('⚡ BOOST!','#ffe066');missionBump('boost');}
function nearMiss(){const p=Math.round(25*streakMul());G.score+=p;addBoost(12);pop(`CLOSE CALL +${p}`,'#7fe0ff');missionBump('nearmiss');}
function dayProgress(){const tr=G.trip,W=G.W;if(tr&&tr.days>1&&tr.mode!=='day'){const seg=W.len/tr.days;return clamp((G.b.y-seg*(tr.day-1))/seg,0,1);}return clamp(G.b.y/W.len,0,1);}
function updItems(){const W=G.W,b=G.b,c=G.craft;if(G.state!=='run'||!W.items)return;
  for(let i=lowerIdx(W.items,b.y-70);i<W.items.length&&W.items[i].y<b.y+70;i++){const it=W.items[i];if(it.got)continue;
    if(Math.hypot(it.x-b.x,it.y-b.y)<c.r+20){it.got=true;const g=it.k==='gold';G.bucks+=g?5:1;G.score+=g?100:20;addBoost(g?15:6);pop(g?'⭐ +100':'🎒 +20',g?'#ffd84a':'#ffb070');missionBump(g?'gold':'bags');AU.burst(g?2400:1600,6,.12,.15);}}}
function drawItems2D(c,yMin,yMax,t){const W=G.W;if(!W.items)return;
  for(let i=lowerIdx(W.items,yMin);i<W.items.length&&W.items[i].y<yMax;i++){const it=W.items[i];if(it.got)continue;const bob=Math.sin(t*3+it.id)*3;
    if(it.k==='gold'){c.save();c.translate(it.x,it.y+bob);c.rotate(t*1.5);c.fillStyle='rgba(255,220,80,.25)';c.beginPath();c.arc(0,0,18,0,7);c.fill();c.fillStyle='#ffd84a';c.beginPath();for(let k=0;k<10;k++){const r=k%2?5:12,a=k*Math.PI/5;c.lineTo(Math.cos(a)*r,Math.sin(a)*r);}c.closePath();c.fill();c.strokeStyle='#a87a00';c.lineWidth=1.5;c.stroke();c.restore();}
    else{c.save();c.translate(it.x,it.y+bob);c.rotate(Math.sin(t+it.id)*.3);c.fillStyle='rgba(0,0,0,.2)';c.fillRect(-7,-11,16,22);c.fillStyle='#ff7a1a';rr(c,-8,-10,16,20,5);c.fill();c.fillStyle='#2c3e50';c.fillRect(-8,2,16,3);c.strokeStyle='rgba(255,255,255,.6)';c.lineWidth=1.5;c.beginPath();c.arc(0,0,15+Math.sin(t*4+it.id)*2,0,7);c.stroke();c.restore();}}}

/* ================= RIVER BUCKS, DAILY GOALS, BOAT SHOP ================= */
function addBucks(n){store.set('riverrun_bucks',store.get('riverrun_bucks',0)+n);}
const MISSION_POOL=[['bags','Collect {n} dry bags',[15,25,40]],['nearmiss','Get {n} close calls',[5,10,15]],['clean','Run {n} rapids clean',[5,10,20]],['stars3','Get 3 stars on {n} rapids',[3,6,10]],
  ['stops','Land at {n} side stops',[1,2,3]],['rescue','Rescue {n} swimmers',[1,2,3]],['boost','Use boost {n} times',[3,6,10]],['gold','Grab {n} gold stars',[2,4,8]]];
function missions(){let m=store.get('riverrun_missions',null);
  if(!m||m.day!==todayKey()){const rng=mulberry32(hashStr(todayKey())),pool=MISSION_POOL.slice(),list=[];
    for(let i=0;i<3;i++){const p=pool.splice(Math.floor(rng()*pool.length),1)[0],lv=Math.floor(rng()*3);list.push({id:p[0],txt:p[1].replace('{n}',p[2][lv]),goal:p[2][lv],prog:0,done:false,reward:[100,200,350][lv]});}
    m={day:todayKey(),list};store.set('riverrun_missions',m);}return m;}
function missionBump(id,n){const m=missions();let ch=false;for(const q of m.list){if(q.id===id&&!q.done){q.prog=Math.min(q.goal,q.prog+(n||1));ch=true;if(q.prog>=q.goal){q.done=true;addBucks(q.reward);toast(`🎯 Goal done: ${q.txt}! +${q.reward} Bucks`,'#5fd38d',2.2);AU.chime();}}}if(ch)store.set('riverrun_missions',m);}
function missionsHtml(){return `<div class="goals">${missions().list.map(q=>`<div class="goal ${q.done?'done':''}"><span>${q.done?'✅':'🎯'} ${q.txt}</span><small>${q.prog}/${q.goal} · 💰${q.reward}</small><div class="hpb"><i style="width:${q.prog/q.goal*100}%;background:${q.done?'#5fd38d':'#ffb347'}"></i></div></div>`).join('')}</div>`;}
const UPG=[['hand','🎯 Handling','Moves across the current faster and stays straighter.'],['pow','💪 Power','Faster strokes and stronger punches.'],['hull','🛡 Hull','More hull strength.']],UPG_COST=[250,600,1200];
function showShop(){const u=store.get('riverrun_upg',{}),bucks=store.get('riverrun_bucks',0);
  $('lbWrap').innerHTML=`<h1>Boat <span>shop</span></h1><div class="sub">💰 ${bucks} River Bucks. Earn Bucks from dry bags, gold stars, daily goals and good runs.</div>
   <div class="grid">${Object.entries(CRAFTS).map(([k,c])=>`<div class="card"><h3>${c.name}</h3>${UPG.map(([id,n,d])=>{const lv=(u[k]&&u[k][id])||0,cost=UPG_COST[lv];return `<div class="suprow"><div><b>${n}</b> ${'●'.repeat(lv)}${'○'.repeat(3-lv)}<div class="mute">${d}</div></div>${lv<3?`<button class="ghost buy" data-c="${k}" data-u="${id}" ${bucks<cost?'disabled':''}>💰${cost}</button>`:'<b>MAX</b>'}</div>`;}).join('')}</div>`).join('')}</div>
   <button class="big" id="lbBack">Back</button>`;
  $('lbWrap').querySelectorAll('.buy').forEach(b=>b.onclick=()=>{const k=b.dataset.c,id=b.dataset.u,u2=store.get('riverrun_upg',{});u2[k]=u2[k]||{};const lv=u2[k][id]||0,cost=UPG_COST[lv];if(store.get('riverrun_bucks',0)<cost)return;addBucks(-cost);u2[k][id]=lv+1;store.set('riverrun_upg',u2);AU.chime();showShop();});
  $('lbBack').onclick=()=>{$('lbScreen').style.display='none';buildMenu();};$('lbScreen').style.display='block';}
function setCtrlLabels(){const ar=sel.ctrl!=='pro';const def=ar?[['left','⟵','MOVE'],['right','⟶','MOVE'],['push','▲','FAST'],['pull','▼','SLOW']]:[['left','⟲','TURN'],['right','⟳','TURN'],['push','▲','PUSH'],['pull','▼','PULL']];
  if(!ar&&G&&G.mode3d&&G.craft.pd){setBtnLabels(true);return;}
  def.forEach(([k,ic,lb])=>{const b=document.querySelector(`.cbtn[data-k="${k}"]`);if(b)b.innerHTML=`${ic}<small>${lb}</small>`;});}

/* ================= RENDER 2D ================= */
/* tileable textures for the aerial view: rock, sand grain, water ripples, foam */
const TEX2={};
function noiseField(N,oct,seed){const f=new Float32Array(N*N);let amp=1,tot=0;
  for(let o=0;o<oct;o++){const g=4<<o,gv=new Float32Array(g*g);for(let i=0;i<g*g;i++)gv[i]=hash2(i+seed*977,o*131+seed);
    for(let y=0;y<N;y++)for(let x=0;x<N;x++){const fx=x/N*g,fy=y/N*g,x0=Math.floor(fx),y0=Math.floor(fy),tx=fx-x0,ty=fy-y0,sx=tx*tx*(3-2*tx),sy=ty*ty*(3-2*ty),
      a=gv[(y0%g)*g+x0%g],b2=gv[(y0%g)*g+(x0+1)%g],c=gv[((y0+1)%g)*g+x0%g],d=gv[((y0+1)%g)*g+(x0+1)%g];f[y*N+x]+=amp*((a*(1-sx)+b2*sx)*(1-sy)+(c*(1-sx)+d*sx)*sy);}
    tot+=amp;amp*=.55;}
  for(let i=0;i<N*N;i++)f[i]/=tot;return f;}
function texCanvas(N,fn){const c=document.createElement('canvas');c.width=c.height=N;const x=c.getContext('2d'),id=x.createImageData(N,N);for(let i=0;i<N*N;i++){const v=fn(i);id.data[i*4]=v[0];id.data[i*4+1]=v[1];id.data[i*4+2]=v[2];id.data[i*4+3]=v[3];}x.putImageData(id,0,0);return c;}
function initTex2(){if(TEX2.ok)return;try{const N=256;
  const rk=noiseField(N,6,1),cr=noiseField(N,4,7);
  TEX2.rock=ctx.createPattern(texCanvas(N,i=>{const v=rk[i],c2=Math.abs(cr[i]-.5)<.018?.55:1,g=Math.round(255*Math.min(1,(.5+v*.75)*c2));return[g,g,g,255];}),'repeat');
  const sd=noiseField(N,5,3);
  TEX2.sand=ctx.createPattern(texCanvas(N,i=>{const v=sd[i]*.6+hash2(i,5)*.4,g=Math.round(255*(.78+v*.26));return[g,g,g,255];}),'repeat');
  const rp=noiseField(N,5,11),rp2=noiseField(N,3,13);
  TEX2.ripple=ctx.createPattern(texCanvas(N,i=>{const x=i%N,y=(i/N)|0,v=Math.sin((rp[i]*9+y/N*6.283*3+x/N*6.283)*3.1);const a=Math.max(0,v-.55)/.45;return[235,248,250,Math.round(a*a*120*(.4+rp2[i]))];}),'repeat');
  TEX2.dark=ctx.createPattern(texCanvas(N,i=>{const v=rp2[i];return[0,20,28,Math.round(Math.max(0,v-.45)*2*90)];}),'repeat');
  const fm=noiseField(N,5,17),fm2=noiseField(N,6,19);
  TEX2.foam=ctx.createPattern(texCanvas(N,i=>{const v=fm[i]*.65+fm2[i]*.35,a=clamp((v-.42)/.2,0,1);return[240,248,248,Math.round(a*235)];}),'repeat');
  TEX2.ok=true;}catch(e){TEX2.ok=true;TEX2.fail=true;}}
function patFill(p,x0,y0,x1,y1,sx,sy,ox,oy,alpha,op){if(!p)return;try{p.setTransform(new DOMMatrix().translate(ox||0,oy||0).scale(sx,sy));}catch(e){}ctx.save();ctx.globalAlpha=alpha;if(op)ctx.globalCompositeOperation=op;ctx.fillStyle=p;ctx.fillRect(x0,y0,x1-x0,y1-y0);ctx.restore();}
function rockShape(x,y,r,id,col){const nv=9;ctx.beginPath();for(let k=0;k<nv;k++){const a=k/nv*6.283+hash2(id,k)*.4,rr=r*(.82+hash2(k,id)*.3);ctx.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr*.92);}ctx.closePath();
  ctx.fillStyle='rgba(10,20,22,.55)';ctx.save();ctx.translate(0,-3);ctx.fill();ctx.restore();
  const g=ctx.createRadialGradient(x-r*.35,y+r*.4,r*.1,x,y,r*1.15);g.addColorStop(0,shade(col,1.45));g.addColorStop(.55,col);g.addColorStop(1,shade(col,.55));ctx.fillStyle=g;ctx.fill();
  ctx.strokeStyle='rgba(0,0,0,.25)';ctx.lineWidth=1.5;ctx.stroke();}
function render(){
  ctx.setTransform(DPR,0,0,DPR,0,0);
  if(!G){ctx.fillStyle='#0b1f26';ctx.fillRect(0,0,VW,VH);return;}
  const W=G.W,b=G.b,R=G.river,pal=G.pal||R.pal,t=performance.now()/1000;G.zoom=lerp(G.zoom||1,1-.13*Math.min(1,W.rint(b.y)*1.6),.04);const sc=G.scale*G.zoom,by=VH*.74;
  const camY=b.y,camX=lerp(W.cx(b.y),b.x,.55);
  const shx=(Math.random()-.5)*G.shake,shy=(Math.random()-.5)*G.shake;
  const yMin=camY-(VH-by)/sc-60,yMax=camY+by/sc+60;G.view={y0:yMin,y1:yMax};G.cam={camX,camY,by,sc,shx,shy};
  ctx.fillStyle=pal.wall;ctx.fillRect(0,0,VW,VH);
  ctx.setTransform(DPR*sc,0,0,-DPR*sc,DPR*(VW/2-camX*sc+shx),DPR*(by+camY*sc+shy));
  initTex2();const vx0=camX-VW/sc,vx1=camX+VW/sc;
  if(TEX2.rock){patFill(TEX2.rock,vx0,yMin-60,vx1,yMax+60,1.6,1.6,0,0,.85,'multiply');patFill(TEX2.rock,vx0,yMin-60,vx1,yMax+60,.55,.55,37,91,.35,'multiply');}
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
  ctx.fillStyle='rgba(0,0,0,.28)';rpath(30);ctx.fill();
  ctx.fillStyle=pal.sand;rpath(16);ctx.fill();
  if(TEX2.sand){ctx.save();rpath(16);ctx.clip();patFill(TEX2.sand,vx0,yMin-60,vx1,yMax+60,.7,.7,0,0,.9,'multiply');ctx.restore();}
  // camp beaches
  for(const cp of W.camps){if(cp.y<yMin-200||cp.y>yMax+200)continue;const x=W.cx(cp.y)+cp.side*(W.hw(cp.y)+6);ctx.fillStyle=pal.sand;ctx.beginPath();ctx.ellipse(x,cp.y,46,120,0,0,7);ctx.fill();ctx.fillStyle='rgba(255,255,255,.12)';ctx.beginPath();ctx.ellipse(x+cp.side*12,cp.y,26,90,0,0,7);ctx.fill();}
  for(let i=di0;i<D.length&&D[i].y<yMax+120;i++){const d=D[i];if(d.k==='bush'||d.k==='boulder'){const x=W.cx(d.y)+d.side*(W.hw(d.y)+d.off+10);
    if(d.k==='bush'){const hs=(d.y*7)|0;ctx.fillStyle='rgba(0,0,0,.25)';for(let k=0;k<4;k++){ctx.beginPath();ctx.arc(x+(hash2(hs,k)-.5)*d.s*1.4+3,d.y+(hash2(k,hs)-.5)*d.s*1.4-4,d.s*(.55+hash2(hs,k+9)*.35),0,7);ctx.fill();}
      for(let k=0;k<4;k++){const px=x+(hash2(hs,k)-.5)*d.s*1.4,py=d.y+(hash2(k,hs)-.5)*d.s*1.4,rr=d.s*(.55+hash2(hs,k+9)*.35),g=ctx.createRadialGradient(px-rr*.3,py+rr*.35,1,px,py,rr);g.addColorStop(0,shade(pal.veg,1.3));g.addColorStop(1,shade(pal.veg,.6));ctx.fillStyle=g;ctx.beginPath();ctx.arc(px,py,rr,0,7);ctx.fill();}}
    else rockShape(x,d.y,d.s,(d.y|0),pal.rock);}}
  // towns
  for(const tw of W.towns){if(tw.y<yMin-300||tw.y>yMax+300)continue;for(let i=0;i<9;i++){const yy=tw.y+(i-4)*55,x=W.cx(yy)+tw.side*(W.hw(yy)+70+(i%3)*45);
    ctx.fillStyle=['#d9c9a3','#c7b18a','#e8dcc0'][i%3];ctx.fillRect(x-14,yy-10,28,20);ctx.fillStyle=['#8e3b22','#555','#2e5d7a'][i%3];ctx.fillRect(x-16,yy+6,32,7);}}
  // water
  const wc=G.lvlKey==='flood'?'#8a6a45':pal.water;
  ctx.fillStyle=shade(pal.sand,.72);rpath(5);ctx.fill();
  ctx.fillStyle=shade(mixHex(wc,pal.sand,.42),1.08);rpath(0);ctx.fill();
  ctx.fillStyle=shade(mixHex(wc,pal.sand,.15),1.12);rpath(-22);ctx.fill();
  ctx.fillStyle=shade(wc,1.05);rpath(-55);ctx.fill();
  ctx.fillStyle=shade(wc,.82);ctx.beginPath();for(let i=0;i<n;i++){const o=clamp(-W.ddcx(ys[i])*900,-.35,.35)*HW[i];ctx.lineTo(CX[i]+o-HW[i]*.36,ys[i]);}for(let i=n-1;i>=0;i--){const o=clamp(-W.ddcx(ys[i])*900,-.35,.35)*HW[i];ctx.lineTo(CX[i]+o+HW[i]*.36,ys[i]);}ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.035)';ctx.beginPath();for(let i=0;i<n;i++)ctx.lineTo(CX[i]-HW[i]*.5,ys[i]);for(let i=n-1;i>=0;i--)ctx.lineTo(CX[i]+HW[i]*.5,ys[i]);ctx.fill();
  {/* textured moving water, canyon-wall shadow on the water, patchy whitewater */
   const flowOff=(t*R.speed*G.lvl.speed*.9)%2048;ctx.save();rpath(0);ctx.clip();
   if(TEX2.dark){patFill(TEX2.dark,vx0,yMin-60,vx1,yMax+60,2.2,4.5,0,flowOff*.8,.9);patFill(TEX2.ripple,vx0,yMin-60,vx1,yMax+60,.9,2.6,0,flowOff,.75);patFill(TEX2.ripple,vx0,yMin-60,vx1,yMax+60,.5,1.3,71,flowOff*1.15,.45);}
   const wh=(G.zone&&G.zone.wallH)||R.wallH||400,shw=clamp(wh*.09,14,85);
   for(const [k,al] of [[1,.10],[.66,.08],[.33,.07]]){ctx.fillStyle=`rgba(0,12,24,${al})`;ctx.beginPath();for(let i=0;i<n;i++)ctx.lineTo(Lx[i]-4,ys[i]);for(let i=n-1;i>=0;i--)ctx.lineTo(Lx[i]+shw*k*(1+.45*Math.sin(ys[i]/700)),ys[i]);ctx.fill();}
   for(const r of W.rapids){if(r.y1+200<yMin||r.y0-150>yMax)continue;const a=Math.max(yMin-40,r.y0-120),z=Math.min(yMax+40,r.y1+180);
     ctx.save();ctx.beginPath();for(let y=a;y<=z;y+=20)ctx.lineTo(W.cx(y)-W.hw(y)*.88,y);for(let y=z;y>=a;y-=20)ctx.lineTo(W.cx(y)+W.hw(y)*.88,y);ctx.clip();
     const st=16,ys0=Math.max(a,yMin-40),ys1=Math.min(z,yMax+40);
     for(let y=ys0;y<ys1;y+=st){const e=smooth(Math.min(1,(y-r.y0+120)/260))*smooth(Math.min(1,(r.y1+180-y)/320));if(e<.02)continue;const al=e*(.12+.42*r.s);
       if(TEX2.foam){patFill(TEX2.foam,vx0,y,vx1,y+st+.5,.55,1.1,0,flowOff*1.3,al);patFill(TEX2.foam,vx0,y,vx1,y+st+.5,.3,.6,53,flowOff*1.6,al*.6);}else{ctx.fillStyle=`rgba(255,255,255,${al*.4})`;ctx.fillRect(vx0,y,vx1-vx0,st);}}
     ctx.restore();}
   ctx.restore();}
  // aerated foam curls in rapids and sun glints in calm water
  for(const r of W.rapids){if(r.y1+150<yMin||r.y0-100>yMax)continue;if(!r.curls){r.curls=[];const n2=Math.round(20+r.s*70);for(let i=0;i<n2;i++)r.curls.push([hash2(r.y0|0,i)*2-1,hash2(i,r.y0|0),.5+hash2(i,9)]);}
    for(const q of r.curls){const yy=r.y0-60+q[1]*(r.L+160);if(yy<yMin||yy>yMax)continue;const hw=W.hw(yy),x=W.cx(yy)+q[0]*hw*.9,fl=.25+.25*Math.sin(t*5+q[2]*9);ctx.strokeStyle=`rgba(255,255,255,${fl*(.4+r.s*.6)})`;ctx.lineWidth=2+q[2]*2;ctx.beginPath();ctx.arc(x,yy,6+q[2]*10,.4,2.6);ctx.stroke();}}
  for(let gy=Math.floor(yMin/70)*70;gy<yMax;gy+=70){if(W.rint(gy)>.1)continue;const hw=W.hw(gy),cx=W.cx(gy);for(let k=0;k<4;k++){const h1=hash2(gy,k),a=Math.pow(Math.max(0,Math.sin(t*1.6+h1*40)),10);if(a<.05)continue;ctx.fillStyle=`rgba(255,255,240,${a*.8})`;ctx.beginPath();ctx.ellipse(cx+(h1-.5)*1.6*hw,gy+hash2(k,gy)*70,5,1.6,0,0,7);ctx.fill();}}
  // eddy lines at camps
  for(const cp of W.camps){if(cp.y<yMin-200||cp.y>yMax+200)continue;const x=W.cx(cp.y)+cp.side*W.hw(cp.y)*.66;ctx.strokeStyle='rgba(255,255,255,.25)';ctx.lineWidth=2;ctx.setLineDash([6,8]);ctx.beginPath();ctx.moveTo(x,cp.y-160);ctx.quadraticCurveTo(x-cp.side*10,cp.y,x+cp.side*20,cp.y+140);ctx.stroke();ctx.setLineDash([]);}
  ctx.strokeStyle='rgba(255,255,255,.28)';ctx.lineWidth=3;ctx.beginPath();for(let i=0;i<n;i++)ctx.lineTo(Lx[i],ys[i]);ctx.stroke();ctx.beginPath();for(let i=0;i<n;i++)ctx.lineTo(Rx[i],ys[i]);ctx.stroke();
  ctx.strokeStyle=G.gust>0?'rgba(255,255,255,.3)':'rgba(255,255,255,.22)';ctx.lineWidth=1.6;ctx.beginPath();
  for(const s of G.streaks){if(s.vx===undefined)continue;ctx.moveTo(s.x,s.y);ctx.lineTo(s.x-s.vx*.09*s.l,s.y-s.vy*.09*s.l);}ctx.stroke();
  if(W.scn)SCN.bank2D(ctx,W,yMin,yMax,t,pal);
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
    else if(f.t==='rock'){ctx.fillStyle='rgba(0,25,35,.13)';ctx.beginPath();ctx.ellipse(f.x,f.y+f.r*1.5,f.r*.9,f.r*1.6,0,0,7);ctx.fill();
      ctx.strokeStyle='rgba(255,255,255,.16)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(f.x-f.r*2,f.y+f.r*3.2);ctx.lineTo(f.x,f.y+f.r*.4);ctx.lineTo(f.x+f.r*2,f.y+f.r*3.2);ctx.stroke();
      ctx.strokeStyle='rgba(240,248,248,.6)';ctx.lineWidth=4;ctx.beginPath();ctx.arc(f.x,f.y,f.r+4,Math.PI*1.1,Math.PI*1.9);ctx.stroke();ctx.strokeStyle='rgba(240,248,248,.25)';ctx.lineWidth=6;ctx.beginPath();ctx.arc(f.x,f.y,f.r+9,Math.PI*1.2,Math.PI*1.8);ctx.stroke();
      rockShape(f.x,f.y,f.r,f.id||0,f.tall?'#1b1a1b':pal.rock);}
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
  if(W.scn)SCN.top2D(ctx,W,yMin,yMax,t);
  ctx.fillStyle='#fff';for(const p of G.parts){ctx.globalAlpha=1-p.life/p.max;ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,7);ctx.fill();}ctx.globalAlpha=1;
  // swimmer
  if(G.swim){const s=G.swim;ctx.strokeStyle='rgba(255,255,255,.6)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(s.x,s.y,14+Math.sin(t*6)*3,0,7);ctx.stroke();ctx.fillStyle='#ff8c1a';ctx.beginPath();ctx.arc(s.x,s.y,8,0,7);ctx.fill();ctx.fillStyle='#f1c27d';ctx.beginPath();ctx.arc(s.x,s.y+3,4,0,7);ctx.fill();}
  for(const m of W.miles){if(m.y<yMin||m.y>yMax)continue;const x=W.cx(m.y)-W.hw(m.y)-22;ctx.fillStyle='#f4f1e8';ctx.fillRect(x-4,m.y-4,8,8);}
  for(const p of W.pois){if(p.y<yMin||p.y>yMax)continue;const x=W.cx(p.y)+p.side*(W.hw(p.y)+30);ctx.fillStyle='#6b4a2c';ctx.fillRect(x-2,p.y-14,4,14);ctx.fillStyle='#f2e3c4';ctx.fillRect(x-10,p.y-2,20,14);}
  render2DExtras(ctx,yMin,yMax,t);
  drawItems2D(ctx,yMin,yMax,t);
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
  render2DLabels(S,label,yMin,yMax);
  if(W.scn)SCN.labels2D(S,label,W,yMin,yMax);
  const gh=ghostAt(G.t);if(gh&&gh.y>yMin&&gh.y<yMax){const [gx,gy]=S(gh.x,gh.y);ctx.save();ctx.globalAlpha=.35;ctx.translate(gx,gy);ctx.rotate(gh.h);ctx.scale(sc,sc);drawCraft(ctx,G.ck,0,false,G.craft.crew);ctx.restore();label('👻 best run',gx,gy-30,'#d8d8ff','rgba(30,30,60,.6)');}
  // boat
  const [bx,byy]=S(b.x,b.y);G.bsx=bx;G.bsy=byy;const c=G.craft;
  const ri=W.rint(b.y),gaugeA=.25+.6*Math.min(1,ri*2);
  if(G.state==='run'){const gr=(c.len/2+16)*sc,tl=c.tol*Math.PI/180;ctx.lineWidth=5;ctx.globalAlpha=gaugeA;
    for(const base of[-Math.PI/2,Math.PI/2]){ctx.strokeStyle='#5fd38d';ctx.beginPath();ctx.arc(bx,byy,gr,base-tl*.7,base+tl*.7);ctx.stroke();ctx.strokeStyle='#ffb347';ctx.beginPath();ctx.arc(bx,byy,gr,base+tl*.7,base+tl);ctx.stroke();ctx.beginPath();ctx.arc(bx,byy,gr,base-tl,base-tl*.7);ctx.stroke();}
    ctx.strokeStyle='#ff6b5b';ctx.beginPath();ctx.arc(bx,byy,gr,-Math.PI/2+tl,Math.PI/2-tl);ctx.stroke();ctx.beginPath();ctx.arc(bx,byy,gr,Math.PI/2+tl,Math.PI*1.5-tl);ctx.stroke();
    const ha=-Math.PI/2+b.h;ctx.globalAlpha=Math.min(1,gaugeA+.2);ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(bx+Math.cos(ha)*(gr-8),byy+Math.sin(ha)*(gr-8));ctx.lineTo(bx+Math.cos(ha)*(gr+8),byy+Math.sin(ha)*(gr+8));ctx.stroke();ctx.globalAlpha=1;}
  ctx.save();ctx.translate(bx,byy);ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.ellipse(4*sc,6*sc,c.wid*.55*sc,c.len*.5*sc,b.h,0,7);ctx.fill();
  ctx.rotate(b.h);const air=G.airT>0?Math.sin((1-G.airT/1.1)*Math.PI)*.55:0;const bs=sc*(1+b.bounce*Math.sin(t*18)+air);ctx.scale(bs,bs);
  if(G.inv>0&&Math.floor(t*10)%2)ctx.globalAlpha=.55;
  drawCraft(ctx,G.ck,G.oa,G.state==='flip',G.swim?c.crew-1:c.crew,G.kp);ctx.globalAlpha=1;ctx.restore();
  if(G.state==='flip'){const nsw=c.crew;for(let i=0;i<nsw;i++){const a=t*1.3+i*2.1,x=bx+Math.cos(a)*(c.len*.5+12)*sc,y=byy+Math.sin(a*1.2)*(c.len*.4+10)*sc;ctx.fillStyle='#ff8c1a';ctx.beginPath();ctx.arc(x,y,7*sc+2,0,7);ctx.fill();ctx.fillStyle='#f1c27d';ctx.beginPath();ctx.arc(x,y,4*sc+1.5,0,7);ctx.fill();}}
  // bridges overhead
  for(const br of W.bridges){if(br.y<yMin-200||br.y>yMax+200)continue;const hw=W.hw(br.y);const decks=br.double?[0,40]:[0];
    for(const o of decks){const [x0,y0]=S(W.cx(br.y)-hw-90,br.y+o),[x1]=S(W.cx(br.y)+hw+90,br.y+o);const th=(br.rail?16:20)*sc;
      ctx.fillStyle=br.rail?'#3b3b3b':'#6f7880';ctx.fillRect(x0,y0-th/2,x1-x0,th);ctx.fillStyle=br.rail?'#8b6b4a':'#c9d1d8';
      if(br.rail){for(let x=x0;x<x1;x+=8*sc)ctx.fillRect(x,y0-th/2,3*sc,th);}else{ctx.fillRect(x0,y0-th/2,x1-x0,2.5);ctx.fillRect(x0,y0+th/2-2.5,x1-x0,2.5);}}
    const [lx,ly]=S(W.cx(br.y),br.y);label('🌉 '+br.n,lx,ly-24*sc,'#fff','rgba(30,40,60,.75)');}
  // time of day light (morning → golden hour), boost speed lines
  {const dp=dayProgress();if(dp<.3){ctx.fillStyle=`rgba(120,160,255,${.07*(1-dp/.3)})`;ctx.fillRect(0,0,VW,VH);}else if(dp>.55){ctx.fillStyle=`rgba(255,150,60,${.16*Math.min(1,(dp-.55)/.45)})`;ctx.fillRect(0,0,VW,VH);}}
  if(G.boostT>0){ctx.strokeStyle='rgba(255,255,255,.5)';ctx.lineWidth=2;for(let i=0;i<14;i++){const x=hash2(i,Math.floor(t*20))*VW,y=(t*900+i*97)%VH;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+60);ctx.stroke();}}
  // swimmer arrow when off screen
  if(G.swim){const [sx,sy]=S(G.swim.x,G.swim.y);if(sy<60||sy>VH-60||sx<20||sx>VW-20){const ax=clamp(sx,30,VW-30),ay=clamp(sy,90,VH-90);ctx.fillStyle='#ff8c1a';ctx.beginPath();ctx.arc(ax,ay,12,0,7);ctx.fill();ctx.fillStyle='#000';ctx.fillText('!',ax,ay+4);}
    else label(`🛟 ${G.swim.name}${G.swim.cold>8?' 🥶'+Math.round(G.swim.cold)+'%':''}`,sx,sy-22,G.swim.cold>60?'#9fe3ff':'#ff8c1a');}

}

/* ================= HUD ================= */
function updHud(dt){
  const b=G.b,W=G.W;
  G.toastT-=dt;if(G.toastT<=0)$('toast').style.opacity=0;
  if(G.bannerT>0){G.bannerT-=dt;if(G.bannerT<=0)hideBanner();}
  if(G.factT>0){G.factT-=dt;if(G.factT<=0)hideFact();}
  G.hudT-=dt;if(G.hudT>0)return;G.hudT=.1;
  {const z=W.zoneAtMile(W.mileAt(b.y));if(z&&z!==G.zone){if(G.zone)toast(`Entering ${z.name}`,'#cfe3e0',1.6);G.zone=z;G.pal=z.pal;}}
  if(G.t>25&&G.state==='run'&&ffOK())coach('ff');
  $('hRiver').textContent=G.river.name+(G.mode!=='day'?` · Day ${TRIP.day()}`:'');
  $('hMile').textContent='Mile '+W.mileAt(b.y).toFixed(1);
  let nx=null;for(const r of W.rapids)if(r.y1>b.y){nx=r;break;}
  const near=nx&&b.y>nx.y0-700,tripTxt=landHint()||TRIP.hudText();
  if(tripTxt)$('hNext').textContent=tripTxt;
  else if(!nx)$('hNext').textContent='Take-out ahead';
  else if(b.y>=nx.y0)$('hNext').textContent='▶ '+nx.n;
  else $('hNext').textContent=`${nx.n} in ${Math.max(0,nx.m-W.mileAt(b.y)).toFixed(1)} mi`;
  const ha=$('hAngle');
  if((near||G.curHole||G.mode3d)&&G.state==='run'){const s=Math.abs(Math.sin(relH())),ts=Math.sin(G.craft.tol*Math.PI/180);
    if(s<=ts*.7){ha.textContent=G.ck==='tube'?'FEET DOWNSTREAM ✓':'STRAIGHT ✓';ha.style.color='#5fd38d';}else if(s<ts){ha.textContent='ANGLED';ha.style.color='#ffb347';}else{ha.textContent='SIDEWAYS!';ha.style.color='#ff6b5b';}}
  else ha.textContent=G.gust>0?'WIND ↓':'';
  $('hScore').textContent=Math.round(G.score);
  $('hTime').textContent=fmtTime(G.t);
  const mx=TRIP.maxSwims();$('hSwims').textContent='Swims '+'●'.repeat(Math.min(G.swims,mx))+'○'.repeat(Math.max(0,mx-G.swims));
  const p=G.hp/G.hpMax;const hp=$('hHp');hp.style.width=(p*100)+'%';hp.style.background=p>.6?'#5fd38d':p>.3?'#ffb347':'#ff6b5b';
  {const vb=$('vitals');if(vb){const V=G.mode==='expedition'?TRIP.vitals():null;vb.style.display=V?'flex':'none';if(V)vb.innerHTML=V.map(x=>`<div class="v" title="${x.name}: ${x.txt}"><span>${x.icon}</span><i><b style="width:${Math.round(x.v*100)}%;background:${x.v>.5?'#5fd38d':x.v>.25?'#ffb347':'#ff6b5b'}"></b></i></div>`).join('');}}
  $('hCrew').innerHTML=TRIP.crewHud()+(G.streak>1?` <span class="chip streak">🔥×${streakMul().toFixed(1)}</span>`:'')+(G.ghost?` <span class="chip ghost">👻 ${ghostTxt()}</span>`:'');
  drawProgress();
  {const bb=$('boostFill');if(bb){bb.style.width=G.boost+'%';$('boostBox').classList.toggle('ready',G.boost>=34);}}
  let roar=0;for(const r of W.rapids){let k=0;if(b.y>=r.y0&&b.y<=r.y1)k=1;else if(b.y<r.y0)k=1-clamp((r.y0-b.y)/1100,0,1);else k=1-clamp((b.y-r.y1)/500,0,1);roar=Math.max(roar,k*r.s);}
  AU.roar(roar);
}

/* ================= LOOP ================= */
let last=performance.now();
function frame(ts){
  const dt=Math.min(.05,(ts-last)/1000);last=ts;
  try{
    if(G&&!['pause','done','camp','page','scene'].includes(G.state)){let gdt=dt;if(G.slowT>0){G.slowT-=dt;gdt=dt*.45;}if(G.ff){if(ffOK())gdt=dt*3;else{G.ff=false;$('bFF').classList.remove('on');toast('Fast-forward off: something ahead','#cfe3e0',1);}}const st=3;for(let i=0;i<st&&G&&!['done','camp','page','scene'].includes(G.state);i++)update(gdt/st);if(G&&!['done','camp','page','scene'].includes(G.state)){updStreaks(gdt);updHud(dt);check3D();}}
    if(G&&G.state!=='pause'&&G.state!=='done'){if(G.mode3d)render3D(dt);else render();}else if(!G)render();
    if(G&&G.state==='camp')TRIP.renderCamp(dt);
    if(G&&(G.state==='scene'||G.state==='page'))SCENE.render(dt);
  }catch(e){console.error(e);}
  requestAnimationFrame(frame);
}

/* ================= INPUT ================= */
addEventListener('keydown',e=>{const k=e.key.toLowerCase();
  if(e.target&&e.target.tagName==='INPUT')return;
  if(G&&['arrowleft','arrowright','arrowup','arrowdown',' '].includes(k))e.preventDefault();
  if((k===' '||k==='enter')&&!e.repeat){for(const id of['scenePanel','campPanel']){const scr=$(id).parentNode;if(scr&&scr.style.display==='block'){const bt=$(id).querySelector('.cbtns button');if(bt){bt.click();return;}}}}
  if((k===' '||k==='p'||k==='escape')&&!e.repeat){if(G&&G.state==='page'){closePage();return;}if(G)togglePause();return;}
  if(G&&G.mode3d&&G.craft.pd&&!e.repeat&&G.state==='run'){if(k==='arrowleft'||k==='a')queueStroke('L');else if(k==='arrowright'||k==='d')queueStroke('R');else if(k==='arrowup'||k==='w')queueStroke('B');}
  if(k==='f'&&!e.repeat)toggleFF();
  if((k==='e'||k==='shift'||k==='b')&&!e.repeat&&G)useBoost();
  K[k]=true;});
addEventListener('keyup',e=>{K[e.key.toLowerCase()]=false;});
addEventListener('blur',()=>{for(const k in K)K[k]=false;MS.left=MS.right=MS.sq=false;if(G&&G.state==='run')togglePause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&G&&G.state==='run')togglePause();});
document.querySelectorAll('.cbtn').forEach(btn=>{const k=btn.dataset.k;
  const on=e=>{e.preventDefault();if(k==='boost'){useBoost();btn.classList.add('on');return;}T[k]=true;if(G&&G.mode3d&&G.craft.pd){if(k==='left')queueStroke('L');else if(k==='right')queueStroke('R');else if(k==='push')queueStroke('B');}btn.classList.add('on');try{btn.setPointerCapture(e.pointerId);}catch(_){}};
  const off=()=>{T[k]=false;btn.classList.remove('on');};
  btn.addEventListener('pointerdown',on);btn.addEventListener('pointerup',off);btn.addEventListener('pointercancel',off);btn.addEventListener('lostpointercapture',off);
  btn.addEventListener('contextmenu',e=>e.preventDefault());});
/* Mouse: hold LEFT to row toward the pointer, hold RIGHT to pull (back-row) toward it,
   double-click and hold to square up to the current, wheel to turn. In 3D paddle mode, clicks are strokes. */
for(const el of [$('game'),$('g3')]){
  el.addEventListener('touchmove',e=>e.preventDefault(),{passive:false});
  el.addEventListener('contextmenu',e=>e.preventDefault());
  el.addEventListener('pointermove',e=>{MS.x=e.clientX;MS.y=e.clientY;if(e.pointerType==='mouse')MS.in=true;if(G&&MS.down&&G.state==='run'&&!MS.sq){const w=screenToWorld(e.clientX,e.clientY);if(w)G.wp=w;}});
  el.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse')MS.in=false;});
  el.addEventListener('pointerdown',e=>{if(!G||G.state!=='run')return;e.preventDefault();MS.x=e.clientX;MS.y=e.clientY;AU.resume();
    const now=performance.now();G.wpBack=e.button===2;
    if(e.button===0&&now-MS.lastDown<320){MS.sq=true;G.wp=null;}else{const w=screenToWorld(e.clientX,e.clientY);if(w){G.wp=w;coachDone();}}
    MS.lastDown=now;MS.down=true;if(G.ff){G.ff=false;$('bFF').classList.remove('on');}
    try{el.setPointerCapture(e.pointerId);}catch(_){}});
  el.addEventListener('pointerup',()=>{MS.down=false;MS.sq=false;});
  el.addEventListener('pointercancel',()=>{MS.down=false;MS.sq=false;});
  el.addEventListener('wheel',e=>{if(!G||G.state!=='run')return;e.preventDefault();const s=Math.sign(e.deltaY);
    if(G.mode3d&&G.craft.pd)queueStroke(s>0?'L':'R');else G.b.av+=s*.5;},{passive:false});
}
$('startBtn').onclick=startFlow;
$('bPause').onclick=togglePause;
$('bFF').onclick=toggleFF;
$('bBoost').onclick=e=>{e.stopPropagation();useBoost();};
$('bMute').onclick=()=>{AU.muted=!AU.muted;$('bMute').textContent=AU.muted?'🔇':'🔊';if(AU.muted)AU.roar(0);};
$('resumeBtn').onclick=togglePause;
$('restartBtn').onclick=()=>{$('pause').style.display='none';cleanup3D();startFlow();};
$('menuBtn').onclick=toMenu;
$('pCtrl').onclick=()=>{sel.ctrl=sel.ctrl==='pro'?'arcade':'pro';saveSel();$('pCtrl').textContent='Controls: '+(sel.ctrl==='pro'?'Pro (real oars)':'Arcade (easy)');setCtrlLabels();};
$('pFacts').onclick=()=>{sel.facts=!sel.facts;saveSel();$('pFacts').textContent=sel.facts?'History & facts: ON':'History & facts: OFF';};

function boot(){resize();buildMenu();requestAnimationFrame(frame);}
