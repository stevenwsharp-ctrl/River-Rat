/* River Run · scenery.js
   Real-world scenery for each river, in 2D and 3D:
   - black schist knobs and jumping bluffs (Black Rocks, Westwater, Grand Canyon inner gorges)
   - cliff jumpers, swimmers and sunbathers at Black Rocks
   - cottonwood groves (gold in fall), tamarisk thickets
   - the railroad along Ruby-Horsethief, with a passing train
   - debris fans at Grand Canyon rapids, big boulders (Cataract, Gauley), hoodoos (Desolation), limestone ledges (San Juan)
   - other river parties at camps
*/
const SCN_LAND={
  ruby:[{k:'tamarisk',m0:0,m1:25,d:.55},{k:'cotton',m0:5.4,m1:6.4,d:1},{k:'cotton',m0:7.5,m1:8.4,d:.8},{k:'cotton',m0:0,m1:25,d:.18},
    {k:'rail',m0:4.6,m1:25,side:1},{k:'schist',m0:15.9,m1:17.3,slow:900}],
  westwater:[{k:'tamarisk',m0:0,m1:17.6,d:.6},{k:'rail',m0:0,m1:2.2,side:1},{k:'schist',m0:8.4,m1:12.6,d:.6},{k:'boulders',m0:8.5,m1:11.3}],
  deso:[{k:'tamarisk',m0:0,m1:84.3,d:.8},{k:'cotton',m0:0,m1:84.3,d:.35},{k:'hoodoo',m0:10,m1:62}],
  sj:[{k:'slow',m0:30.5,m1:41,slow:900},{k:'tamarisk',m0:0,m1:83.5,d:.9},{k:'cotton',m0:0,m1:12,d:.45},{k:'ledges',m0:27,m1:83.5},{k:'ledges',m0:0,m1:14}],
  cataract:[{k:'tamarisk',m0:0,m1:16.2,d:.7},{k:'boulders',m0:12.3,m1:16.2},{k:'boulders',m0:0,m1:12,d:.3}],
  gc:[{k:'tamarisk',m0:0,m1:226.5,d:.75},{k:'fans',m0:0,m1:226.5},{k:'schist',m0:77,m1:117.5,d:.5},{k:'schist',m0:127,m1:140,d:.5},{k:'schist',m0:213,m1:226.5,d:.5}],
  gauley:[{k:'boulders',m0:0,m1:9.6,d:1.4}],
  zambezi:[{k:'schist',m0:0,m1:16.8,d:.45,pink:0},{k:'boulders',m0:0,m1:16.8,d:.8}],
  manapools:[{k:'acacia',m0:0,m1:40,d:.7},{k:'reeds',m0:0,m1:40,d:.6}],
  futa:[{k:'boulders',m0:0,m1:13.8,d:.7},{k:'cascade',m0:0,m1:13.8,d:.5}],
  pacuare:[{k:'cascade',m0:0,m1:18,d:1.3},{k:'boulders',m0:0,m1:18,d:.6}],
  soca:[{k:'boulders',m0:0,m1:6.5,d:.8}],
  sunkosi:[{k:'terraces',m0:0,m1:150},{k:'boulders',m0:0,m1:162,d:.35}],
  ganges:[{k:'boulders',m0:0,m1:15.4,d:.45}],
  franklin:[{k:'cascade',m0:0,m1:74,d:.5},{k:'boulders',m0:0,m1:74,d:.7}],
  kaituna:[{k:'cascade',m0:0,m1:1.6,d:2},{k:'boulders',m0:0,m1:1.6,d:1}],
  onyx:[{k:'ice',m0:0,m1:20,d:1},{k:'boulders',m0:0,m1:20,d:.5}]
};
const SCN_BUNGEE={zambezi:[{m:0.45}]};
/* Black Rocks: tall, old black rock bluffs on both sides. People jump into the deep water. */
const SCN_JUMPS={ganges:[{m:6.8,side:-1,h:52,n:'Cliff jump rock'}],ruby:[{m:16.35,side:-1,h:58,n:'Lookout Knob'},{m:16.6,side:1,h:40,n:'Black Rocks ledge'},{m:16.92,side:-1,h:76,n:'The Big One'},{m:17.15,side:1,h:30,n:'Kids\' rock'}]};
const SCN={
  fall(){const mo=new Date().getMonth();return mo===9||mo===10;},
  build(W,R){
    const rnd=mulberry32(hashStr(R.id+':scenery')),key=R.path||R.id,L=(SCN_LAND[key]||[]),S={knobs:[],trees:[],tam:[],bould:[],fans:[],hood:[],rail:[],ledges:[],jumps:[],swim:[],sun:[],casc:[],terr:[],ice:[],reeds:[],bungee:[],falls:[],cheered:{},train:null,trainT:18+rnd()*20};
    const yr=(m0,m1)=>{const a=W.yAtMile(Math.max(m0,R.start)),b=W.yAtMile(Math.min(m1,R.end));if(m1<R.start||m0>R.end)return null;return [a===null?0:a,b===null?W.len:b];};
    for(const seg of L){const r=yr(seg.m0,seg.m1);if(!r||r[1]-r[0]<50)continue;const [y0,y1]=r,d=seg.d===undefined?1:seg.d;
      if(seg.k==='schist'){for(const side of[-1,1]){for(let y=y0;y<y1;y+=(26+rnd()*30)/d)S.knobs.push({y,side,off:-8+rnd()*24,r:15+rnd()*22,h:16+rnd()*34,pink:seg.pink===0?false:rnd()<.18,id:(rnd()*1e6)|0});
          for(let y=y0;y<y1;y+=(60+rnd()*60)/(d*d))S.knobs.push({y,side,off:45+rnd()*110,r:34+rnd()*46,h:50+rnd()*80,pink:seg.pink===0?false:rnd()<.12,id:(rnd()*1e6)|0});}}
      else if(seg.k==='cotton'){for(let y=y0;y<y1;y+=70)for(const side of[-1,1])if(rnd()<d*.4){const n=1+Math.floor(rnd()*3);for(let i=0;i<n;i++)S.trees.push({y:y+rnd()*60,side,off:28+rnd()*130,r:18+rnd()*20,g:rnd()});}
        for(const c of W.camps)if(c.y>y0&&c.y<y1&&rnd()<Math.min(1,d*2)){const n=3+Math.floor(rnd()*4);for(let i=0;i<n;i++)S.trees.push({y:c.y+(rnd()-.5)*240,side:c.side,off:60+rnd()*110,r:22+rnd()*20,g:rnd()});}}
      else if(seg.k==='acacia'){for(let y=y0;y<y1;y+=90)for(const side of[-1,1])if(rnd()<d*.5)S.trees.push({y:y+rnd()*60,side,off:40+rnd()*160,r:22+rnd()*18,g:rnd(),ac:1});}
      else if(seg.k==='cascade'){for(let y=y0;y<y1;y+=(260+rnd()*420)/d)S.casc.push({y,side:rnd()<.5?-1:1,h:60+rnd()*140,w:4+rnd()*8});}
      else if(seg.k==='terraces')S.terr.push({y0,y1});
      else if(seg.k==='reeds'){for(let y=y0;y<y1;y+=24)for(const side of[-1,1])if(rnd()<d*.5)S.reeds.push({y:y+rnd()*20,side,off:-4+rnd()*14,r:4+rnd()*5});}
      else if(seg.k==='ice'){for(let y=y0;y<y1;y+=40)for(const side of[-1,1])if(rnd()<d*.45)S.ice.push({y:y+rnd()*30,side,off:4+rnd()*160,r:14+rnd()*40,id:(rnd()*1e6)|0});}
      else if(seg.k==='tamarisk'){for(let y=y0;y<y1;y+=20)for(const side of[-1,1])if(rnd()<d*.55)S.tam.push({y:y+rnd()*16,side,off:2+rnd()*30,r:5+rnd()*7,g:rnd()});}
      else if(seg.k==='rail')S.rail.push({y0,y1,side:seg.side||1,off:62});
      else if(seg.k==='hoodoo'){for(let y=y0;y<y1;y+=90+rnd()*160)S.hood.push({y,side:rnd()<.5?-1:1,off:140+rnd()*260,h:40+rnd()*90,r:7+rnd()*9});}
      else if(seg.k==='boulders'){for(let y=y0;y<y1;y+=34+rnd()*40/d)S.bould.push({y,side:rnd()<.5?-1:1,off:-12+rnd()*70,r:16+rnd()*34,id:(rnd()*1e6)|0});}
      else if(seg.k==='ledges')S.ledges.push({y0,y1});
      else if(seg.k==='fans'){for(const rp of W.rapids)if(rp.y0>y0&&rp.y0<y1){const f={y:rp.y0-70,side:rp.fan,len:240+rp.s*260,w:50+rp.s*80,rocks:[]};for(let i=0;i<10+Math.round(rp.s*14);i++)f.rocks.push({u:rnd(),v:rnd(),r:6+rnd()*14});S.fans.push(f);}}}
    for(const j of (SCN_JUMPS[key]||[])){if(j.m<R.start||j.m>R.end)continue;const y=W.yAtMile(j.m);if(y===null)continue;
      const sp={...j,y,ppl:[]};const cols=['#e74c3c','#f1c40f','#3498db','#2ecc71','#ff6fb5','#e67e22'];
      for(let i=0;i<3;i++)sp.ppl.push({col:cols[(i+Math.floor(rnd()*6))%6],st:'wait',t:rnd()*5+i*1.6,dy:(i-1)*12,x:0,y:0,z:j.h,flip:rnd()<.4,spin:0});
      S.jumps.push(sp);S.knobs.push({y,side:j.side,off:26,r:46,h:j.h,big:true,id:(rnd()*1e6)|0});
      for(let i=0;i<2;i++)S.sun.push({y:y+(rnd()-.5)*90,side:j.side,off:12+rnd()*14,col:cols[Math.floor(rnd()*6)],rot:rnd()*6});
      for(let i=0;i<2;i++)S.swim.push({y:y+60+rnd()*120,side:j.side,off:-40-rnd()*40,ph:rnd()*6,col:cols[Math.floor(rnd()*6)]});}
    for(const j of (SCN_BUNGEE[key]||[])){const y=W.yAtMile(j.m);if(y!==null)S.bungee.push({y,t:Math.random()*4});}
    for(const r of W.rapids)if(r.fall)S.falls.push({y:r.y0+r.L*.32,h:r.fall});
    for(const k of['knobs','trees','tam','bould','fans','hood','jumps','swim','sun','casc','ice','reeds'])S[k].sort((a,b)=>a.y-b.y);
    W.scn=S;},
  bx(W,y,side,off){return W.cx(y)+side*(W.hw(y)+off);},
  /* ---------- update: jumpers and the train ---------- */
  update(dt){if(!G||!G.W||!G.W.scn)return;const W=G.W,S=W.scn,b=G.b;
    for(const sp of S.jumps){if(Math.abs(sp.y-b.y)>2600)continue;
      for(const p of sp.ppl){p.t-=dt;const top=SCN.bx(W,sp.y+p.dy,sp.side,-6),land=SCN.bx(W,sp.y+p.dy+18,sp.side,-74),shore=SCN.bx(W,sp.y+p.dy+30,sp.side,-16);
        if(p.st==='wait'){p.x=top;p.y=sp.y+p.dy;p.z=sp.h;p.spin=0;if(p.t<=0){p.st='jump';p.T=.8+sp.h/90;p.t=p.T;}}
        else if(p.st==='jump'){const u=1-p.t/p.T;p.x=lerp(top,land,u);p.y=sp.y+p.dy+18*u;p.z=Math.max(0,sp.h*(1-u*u)+22*Math.sin(Math.PI*u));p.spin=p.flip?u*Math.PI*2:0;
          if(p.t<=0){p.st='swim';p.t=3+Math.random()*2.5;p.z=0;if(Math.abs(p.y-b.y)<1600){splash(p.x,p.y,16,1.1);if(Math.abs(p.y-b.y)<700)AU.splash(.25);}
            if(Math.abs(p.y-b.y)<260&&Math.abs(p.x-b.x)<220&&G.state==='run'){G.score+=15;pop('💦 Splashed! +15','#9fe3ff');}}}
        else if(p.st==='swim'){const u=1-p.t/3.5;p.x=lerp(land,shore,clamp(u,0,1));p.y=sp.y+p.dy+lerp(18,30,clamp(u,0,1));p.z=-2;if(p.t<=0){p.st='climb';p.t=2.2;}}
        else if(p.st==='climb'){const u=1-p.t/2.2;p.x=lerp(shore,top,u);p.y=sp.y+p.dy+lerp(30,0,u);p.z=lerp(0,sp.h,u);if(p.t<=0){p.st='wait';p.t=1.5+Math.random()*4;}}}
      if(!S.cheered[sp.n]&&Math.abs(sp.y-b.y)<320&&G.state==='run'){S.cheered[sp.n]=1;G.score+=25;toast(`🤸 Cliff jumpers at ${sp.n}! +25`,'#9fe3ff',1.6);if(AU.cheer)AU.cheer(.35);}}
    for(const q of S.bungee)q.t+=dt;
    // train on the railroad
    const rs=S.rail.find(r=>b.y>r.y0-800&&b.y<r.y1+400);
    if(S.train){const tr=S.train;tr.y+=tr.v*dt;if(!tr.horn&&Math.abs(tr.y-b.y)<900){tr.horn=1;SCN.horn();toast('🚆 The California Zephyr rolls by','#dfe6ee',1.6);}if(tr.y<tr.end)S.train=null;}
    else if(rs&&G.state==='run'){S.trainT-=dt;if(S.trainT<=0){S.trainT=70+Math.random()*60;S.train={y:Math.min(rs.y1+200,b.y+1900),v:-430,end:Math.max(rs.y0-1400,b.y-3200),side:rs.side,off:rs.off,cars:11,horn:0};}}},
  horn(){try{const A=AU;if(!A.ctx||A.muted)return;const t=A.ctx.currentTime;[311,370,466].forEach(f=>{const o=A.ctx.createOscillator(),g=A.ctx.createGain();o.type='sawtooth';o.frequency.value=f;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.035,t+.08);g.gain.setValueAtTime(.035,t+1.1);g.gain.linearRampToValueAtTime(0,t+1.5);o.connect(g);g.connect(A.ctx.destination);o.start(t);o.stop(t+1.6);});}catch(e){}},
  /* ---------- 2D: on the banks and water edge (drawn under river features) ---------- */
  bank2D(c,W,y0,y1,t,pal){const S=W.scn;if(!S)return;const B=(y,s,o)=>SCN.bx(W,y,s,o);
    // San Juan limestone ledges: stair steps above the banks
    for(const L of S.ledges){const a=Math.max(L.y0,y0-60),z=Math.min(L.y1,y1+60);if(a>=z)continue;
      for(const side of[-1,1])for(const o of[60,95,135,185,250]){c.strokeStyle='rgba(255,245,225,.22)';c.lineWidth=3;c.beginPath();for(let y=a;y<=z;y+=24)c.lineTo(B(y,side,o+9*Math.sin(y/180+o)),y);c.stroke();
        c.strokeStyle='rgba(40,30,20,.25)';c.lineWidth=5;c.beginPath();for(let y=a;y<=z;y+=24)c.lineTo(B(y,side,o+6+9*Math.sin(y/180+o)),y);c.stroke();}}
    // debris fans at Grand Canyon rapids
    for(const f of S.fans){if(f.y+f.len<y0||f.y-f.len>y1)continue;c.fillStyle=mixHex(pal.sand,'#8a7a68',.45);c.beginPath();
      for(let k=0;k<=16;k++){const v=k/16,yy=f.y-f.len/2+v*f.len,bulge=Math.sin(v*Math.PI);c.lineTo(B(yy,f.side,-f.w*bulge*.55),yy);}
      for(let k=16;k>=0;k--){const v=k/16,yy=f.y-f.len/2+v*f.len;c.lineTo(B(yy,f.side,40),yy);}c.fill();
      for(const r of f.rocks){const yy=f.y-f.len/2+r.v*f.len,bulge=Math.sin(r.v*Math.PI);rockShape(B(yy,f.side,-f.w*bulge*.5*r.u+10),yy,r.r,(yy|0)+r.r,pal.rock);}}
    // tamarisk thickets along the sand
    const fall=SCN.fall();
    for(let i=lowerIdx(S.tam,y0-40);i<S.tam.length&&S.tam[i].y<y1+40;i++){const m=S.tam[i],x=B(m.y,m.side,m.off);
      c.fillStyle='rgba(0,0,0,.22)';c.beginPath();c.arc(x+3,m.y-3,m.r,0,7);c.fill();
      c.fillStyle=fall&&m.g<.5?mixHex('#8a7a3a','#b0702c',m.g*2):mixHex('#4e5f34','#6f7d42',m.g);c.beginPath();c.arc(x,m.y,m.r,0,7);c.fill();
      c.fillStyle='rgba(255,255,220,.12)';c.beginPath();c.arc(x-m.r*.3,m.y+m.r*.3,m.r*.5,0,7);c.fill();}
    // terraces on the hills (Nepal)
    for(const L of S.terr){const a=Math.max(L.y0,y0-60),z=Math.min(L.y1,y1+60);if(a>=z)continue;for(const side of[-1,1])for(let o=70;o<330;o+=26){c.strokeStyle=o%52?'rgba(200,190,90,.35)':'rgba(120,150,60,.4)';c.lineWidth=9;c.beginPath();for(let y=a;y<=z;y+=24)c.lineTo(B(y,side,o+14*Math.sin(y/240+o*.05)),y);c.stroke();}}
    // reeds at the water edge
    for(let i=lowerIdx(S.reeds,y0-40);i<S.reeds.length&&S.reeds[i].y<y1+40;i++){const q=S.reeds[i],x=B(q.y,q.side,q.off);c.strokeStyle='#8a9a4a';c.lineWidth=1.5;for(let k=0;k<4;k++){c.beginPath();c.moveTo(x,q.y);c.lineTo(x+(k-1.5)*3+Math.sin(t*2+q.y)*1.5,q.y+q.r*2);c.stroke();}}
    // snow and ice patches (Antarctica)
    for(let i=lowerIdx(S.ice,y0-80);i<S.ice.length&&S.ice[i].y<y1+80;i++){const q=S.ice[i],x=B(q.y,q.side,q.off);c.fillStyle='rgba(240,248,255,.92)';c.beginPath();for(let k=0;k<9;k++){const a=k/9*6.283,rr=q.r*(.7+hash2(q.id,k)*.5);c.lineTo(x+Math.cos(a)*rr,q.y+Math.sin(a)*rr*.7);}c.closePath();c.fill();c.fillStyle='rgba(170,200,230,.5)';c.beginPath();c.ellipse(x+q.r*.2,q.y-q.r*.2,q.r*.5,q.r*.25,0,0,7);c.fill();}
    // waterfalls off the canyon walls
    for(let i=lowerIdx(S.casc,y0-200);i<S.casc.length&&S.casc[i].y<y1+200;i++){const q=S.casc[i],x0=B(q.y,q.side,q.h*.9),x1=B(q.y,q.side,2);const g=c.createLinearGradient(x0,0,x1,0);g.addColorStop(0,'rgba(240,250,255,.2)');g.addColorStop(1,'rgba(240,250,255,.85)');
      c.strokeStyle=g;c.lineWidth=q.w;c.beginPath();c.moveTo(x0,q.y);c.lineTo(x1,q.y);c.stroke();for(let k=0;k<5;k++){const ph=(t*.9+k*.2)%1;c.fillStyle=`rgba(255,255,255,${.5*(1-ph)})`;c.beginPath();c.arc(x1-q.side*ph*18,q.y+Math.sin(k*2)*10,4+ph*10,0,7);c.fill();}}
    // waterfall lips you raft (Tutea Falls)
    for(const f of S.falls){if(f.y<y0-100||f.y>y1+100)continue;const hw=W.hw(f.y),cx=W.cx(f.y);c.fillStyle='rgba(0,20,25,.35)';c.fillRect(cx-hw,f.y-26,hw*2,22);
      c.fillStyle='rgba(245,252,252,.92)';c.fillRect(cx-hw,f.y-6,hw*2,10);for(let k=0;k<14;k++){const ph=(t*.8+k*.13)%1;c.fillStyle=`rgba(255,255,255,${.6*(1-ph)})`;c.beginPath();c.arc(cx-hw+(k+.5)/14*hw*2,f.y+6+ph*30,6+ph*12,0,7);c.fill();}}
    // big boulders
    for(let i=lowerIdx(S.bould,y0-80);i<S.bould.length&&S.bould[i].y<y1+80;i++){const q=S.bould[i];rockShape(B(q.y,q.side,q.off),q.y,q.r,q.id,pal.rock);}
    // railroad: ballast, ties, rails
    for(const r of S.rail){const a=Math.max(r.y0,y0-60),z=Math.min(r.y1,y1+60);if(a>=z)continue;const P=[];for(let y=a;y<=z;y+=18)P.push([B(y,r.side,r.off),y]);
      c.strokeStyle='#8b857a';c.lineWidth=22;c.beginPath();P.forEach(p=>c.lineTo(p[0],p[1]));c.stroke();
      c.strokeStyle='#5b4632';c.lineWidth=3;for(let k=0;k<P.length;k++){c.beginPath();c.moveTo(P[k][0]-9,P[k][1]);c.lineTo(P[k][0]+9,P[k][1]);c.stroke();}
      c.strokeStyle='#d5d8dc';c.lineWidth=1.6;for(const s of[-5,5]){c.beginPath();P.forEach(p=>c.lineTo(p[0]+s,p[1]));c.stroke();}}
    // black schist knobs: polished, with pink granite veins
    for(let i=lowerIdx(S.knobs,y0-120);i<S.knobs.length&&S.knobs[i].y<y1+120;i++){const k=S.knobs[i];SCN.knob2D(c,B(k.y,k.side,k.off),k.y,k.r,k.id,k.pink,k.big,k.off<24?k.side:0);}
    // cottonwood groves
    for(let i=lowerIdx(S.trees,y0-80);i<S.trees.length&&S.trees[i].y<y1+80;i++){const tr=S.trees[i],x=B(tr.y,tr.side,tr.off);if(tr.ac)SCN.acacia2D(c,x,tr.y,tr.r,tr.g,t);else SCN.tree2D(c,x,tr.y,tr.r,tr.g,fall,t);}
    // other river parties at camps
    for(const cp of W.camps){if(cp.y<y0-200||cp.y>y1+200)continue;if(!(cp.taken||(G.mode==='day'&&hash2(cp.y|0,7)<.45)))continue;SCN.party2D(c,W,cp,t);}},
  knob2D(c,x,y,r,id,pink,big,side){const nv=11;c.beginPath();for(let k=0;k<nv;k++){const a=k/nv*6.283,rr=r*(.84+hash2(id,k)*.24);c.lineTo(x+Math.cos(a)*rr*(big?1.1:1),y+Math.sin(a)*rr*.9);}c.closePath();
    c.save();c.fillStyle='rgba(0,0,0,.38)';c.translate(big?10:5,big?-12:-6);c.fill();c.restore();
    const g=c.createRadialGradient(x-r*.35,y+r*.4,r*.08,x,y,r*1.15);g.addColorStop(0,big?'#5a5458':'#4a4549');g.addColorStop(.5,'#252225');g.addColorStop(1,'#0f0d10');c.fillStyle=g;c.fill();
    c.save();c.clip();c.strokeStyle=pink?'rgba(226,160,150,.75)':'rgba(210,170,165,.16)';c.lineWidth=pink?3:1.2;for(let v=0;v<(pink?2:1);v++){const a=hash2(id,v+20)*3.14;c.beginPath();c.moveTo(x-Math.cos(a)*r*1.2,y-Math.sin(a)*r*1.2);c.quadraticCurveTo(x+(hash2(id,v)-.5)*r,y+(hash2(v,id)-.5)*r,x+Math.cos(a)*r*1.2,y+Math.sin(a)*r*1.2);c.stroke();}
      c.fillStyle='rgba(255,255,255,.14)';c.beginPath();c.ellipse(x-r*.3,y+r*.35,r*.35,r*.18,.6,0,7);c.fill();c.restore();
    if(side)c.strokeStyle='rgba(235,245,245,.35)',c.lineWidth=2,c.beginPath(),c.arc(x,y,r*.98,side>0?Math.PI*.6:-.4*Math.PI,side>0?Math.PI*1.4:.4*Math.PI),c.stroke();},
  acacia2D(c,x,y,r,g,t){c.fillStyle='rgba(0,0,0,.26)';c.beginPath();c.ellipse(x+r*.35,y-r*.35,r*1.15,r*.8,0,0,7);c.fill();
    const gr=c.createRadialGradient(x-r*.3,y+r*.3,2,x,y,r*1.2);gr.addColorStop(0,shade(mixHex('#7a9a3a','#a2a24a',g),1.2));gr.addColorStop(1,shade(mixHex('#5a7a2a','#7a7a32',g),.7));c.fillStyle=gr;c.beginPath();c.ellipse(x,y,r*1.15,r*.85,g,0,7);c.fill();},
  tree2D(c,x,y,r,g,fall,t){const hs=(y*13+x)|0,sway=Math.sin(t*1.3+g*9)*1.2;
    c.fillStyle='rgba(0,0,0,.28)';for(let k=0;k<5;k++){c.beginPath();c.arc(x+(hash2(hs,k)-.5)*r*1.2+r*.35,y+(hash2(k,hs)-.5)*r*1.2-r*.4,r*(.5+hash2(hs,k+5)*.3),0,7);c.fill();}
    const base=fall?(g<.65?mixHex('#c79a28','#e0c04a',g/.65):mixHex('#7f8f36','#a0a640',g)):mixHex('#5d7f2f','#86a23e',g);
    for(let k=0;k<5;k++){const px=x+(hash2(hs,k)-.5)*r*1.2+sway,py=y+(hash2(k,hs)-.5)*r*1.2,rr=r*(.5+hash2(hs,k+5)*.3),gr=c.createRadialGradient(px-rr*.35,py+rr*.4,1,px,py,rr);
      gr.addColorStop(0,shade(base,1.25));gr.addColorStop(1,shade(base,.62));c.fillStyle=gr;c.beginPath();c.arc(px,py,rr,0,7);c.fill();}},
  party2D(c,W,cp,t){const s=cp.side,hw=W.hw(cp.y),cx=W.cx(cp.y),n=2+Math.floor(hash2(cp.y|0,3)*3),cols=['#e67e22','#2e86c1','#27ae60','#c0392b','#f1c40f'];
    for(let k=0;k<n;k++){const yy=cp.y-70+k*48,x=cx+s*(hw+38+(k%2)*22);c.fillStyle='rgba(0,0,0,.25)';c.fillRect(x-9+3,yy-9-3,18,18);c.fillStyle=cols[(k+(cp.y|0))%5];c.beginPath();c.moveTo(x-10,yy-9);c.lineTo(x+10,yy-9);c.lineTo(x+10,yy+9);c.lineTo(x-10,yy+9);c.closePath();c.fill();
      c.strokeStyle='rgba(0,0,0,.35)';c.lineWidth=1.5;c.beginPath();c.moveTo(x-10,yy);c.lineTo(x+10,yy);c.stroke();}
    for(let k=0;k<2;k++){const yy=cp.y+60+k*46,x=cx+s*(hw-6);c.save();c.translate(x,yy);c.rotate(.15*s);c.fillStyle=['#f0b429','#d35400'][k];rr(c,-14,-26,28,52,12);c.fill();c.fillStyle='#2f3d48';rr(c,-8,-18,16,36,6);c.fill();c.restore();}
    for(let k=0;k<3;k++){const yy=cp.y+(k-1)*30+Math.sin(t*1.5+k)*2,x=cx+s*(hw+20+k*9);person(c,x,yy,cols[(k+2)%5]);}
    c.fillStyle='rgba(120,120,120,.8)';c.beginPath();c.arc(cx+s*(hw+64),cp.y+10,4,0,7);c.fill();},
  /* ---------- 2D: things above the banks (jumpers, train) ---------- */
  top2D(c,W,y0,y1,t){const S=W.scn;if(!S)return;
    for(const q of S.sun){if(q.y<y0||q.y>y1)continue;const x=SCN.bx(W,q.y,q.side,q.off);c.save();c.translate(x,q.y);c.rotate(q.rot);c.fillStyle=q.col;rr(c,-4,-11,8,22,3);c.fill();c.fillStyle='#f1c27d';c.beginPath();c.arc(0,11,3.5,0,7);c.fill();c.restore();}
    for(const q of S.swim){if(q.y<y0||q.y>y1)continue;const x=SCN.bx(W,q.y,q.side,q.off)+Math.sin(t*.7+q.ph)*14,y=q.y+Math.cos(t*.5+q.ph)*10;c.strokeStyle='rgba(255,255,255,.4)';c.lineWidth=1.5;c.beginPath();c.arc(x,y,8+Math.sin(t*3+q.ph)*1.5,0,7);c.stroke();c.fillStyle='#f1c27d';c.beginPath();c.arc(x,y,3.6,0,7);c.fill();}
    for(const sp of S.jumps){if(sp.y<y0-200||sp.y>y1+200)continue;for(const p of sp.ppl){const z=Math.max(0,p.z),k=1+z/70;
        if(p.st==='swim'){c.strokeStyle='rgba(255,255,255,.45)';c.lineWidth=1.5;c.beginPath();c.arc(p.x,p.y,8,0,7);c.stroke();c.fillStyle='#f1c27d';c.beginPath();c.arc(p.x,p.y,3.6,0,7);c.fill();continue;}
        if(p.st==='jump'){c.fillStyle='rgba(0,0,0,.25)';c.beginPath();c.ellipse(p.x,p.y,6,4,0,0,7);c.fill();}
        c.save();c.translate(p.x+z*.18*(sp.side<0?1:-1),p.y-z*.22);c.scale(k,k);c.rotate(p.spin);person(c,0,0,p.col);c.restore();}}
    for(const q of S.bungee){if(q.y<y0-300||q.y>y1+300)continue;const cyc=q.t%9,z=cyc<1.5?260-cyc/1.5*230:30+30*Math.abs(Math.cos((cyc-1.5)*2.2))*Math.exp(-(cyc-1.5)*.5),x=W.cx(q.y),k=.6+z/200;
      c.strokeStyle='rgba(30,30,30,.7)';c.lineWidth=1.5;c.beginPath();c.moveTo(x,q.y-10);c.lineTo(x,q.y-10+(260-z)*.08);c.stroke();c.save();c.translate(x,q.y-10+(260-z)*.08);c.scale(k,k);c.rotate(Math.PI);person(c,0,0,'#e74c3c');c.restore();}
    const tr=S.train;if(tr&&tr.y>y0-900&&tr.y<y1+900){const P=y=>SCN.bx(W,y,tr.side,tr.off);
      for(let k=0;k<tr.cars;k++){const yy=tr.y+k*74;if(yy<y0-80||yy>y1+80)continue;const x=P(yy),a=Math.atan2(P(yy+10)-P(yy-10),20);
        c.save();c.translate(x,yy);c.rotate(-a);c.fillStyle='rgba(0,0,0,.3)';c.fillRect(-9+4,-34-4,18,68);
        if(k===0){c.fillStyle='#4d5864';rr(c,-9,-34,18,68,6);c.fill();c.fillStyle='#c0392b';c.fillRect(-9,-6,18,5);c.fillStyle='#1f2a36';c.fillRect(-6,-32,12,8);}
        else{const g=c.createLinearGradient(-9,0,9,0);g.addColorStop(0,'#9aa0a8');g.addColorStop(.5,'#eef1f4');g.addColorStop(1,'#9aa0a8');c.fillStyle=g;rr(c,-9,-34,18,68,4);c.fill();c.fillStyle='#2e5d9e';c.fillRect(-9,-2,18,2.5);c.fillStyle='#c0392b';c.fillRect(-9,1,18,2);}
        c.restore();}}},
  labels2D(S2,label,W,y0,y1){const S=W.scn;if(!S)return;for(const sp of S.jumps){if(sp.y<y0||sp.y>y1)continue;const [x,y]=S2(SCN.bx(W,sp.y,sp.side,70),sp.y);label('🤸 '+sp.n,x,y-26,'#bfe9ff','rgba(20,40,60,.7)');}},
  /* ---------- 3D ---------- */
  build3D(ch,grp,TX,TZ,profH,y0,y1,pal){const W=G.W,S=W.scn;if(!S||!window.THREE)return;const fall=SCN.fall(),tc=new THREE.Color(),dm=new THREE.Object3D(),C=h=>new THREE.Color(h);
    const sel2=(arr,pad)=>{const o=[];for(let i=lowerIdx(arr,y0-(pad||0));i<arr.length&&arr[i].y<y1+(pad||0);i++)o.push(arr[i]);return o;};
    const inst=(geo,mat,list,fn)=>{if(!list.length)return null;const m=new THREE.InstancedMesh(geo,mat,list.length);m.frustumCulled=false;list.forEach((e,i)=>{fn(e,i);dm.updateMatrix();m.setMatrixAt(i,dm.matrix);m.setColorAt(i,tc);});m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;grp.add(m);return m;};
    const ground=(off)=>off<4?0:profH(off);
    // schist knobs and jumping bluffs
    const kn=sel2(S.knobs,100);
    inst(new THREE.IcosahedronGeometry(1,2),M3(0xffffff,{roughness:.42,metalness:.05}),kn,(k,i)=>{const x=SCN.bx(W,k.y,k.side,k.off);dm.position.set(TX(x),ground(k.off)-k.h*.1,TZ(k.y));dm.scale.set(k.r*(k.big?1.15:1),k.h*1.1,k.r*(k.big?1.25:1.1));dm.rotation.set(0,hash2(k.id,1)*6,0);
      tc.set(k.pink?'#5a4446':k.big?'#2b282b':'#211f22').multiplyScalar(.8+hash2(k.id,2)*.5);});
    // pink granite veins on big bluffs
    const veins=kn.filter(k=>k.big||k.pink);inst(new THREE.BoxGeometry(1,1,1),M3(0xffffff,{roughness:.6}),veins,(k,i)=>{const x=SCN.bx(W,k.y,k.side,k.off-k.r*.55);dm.position.set(TX(x),ground(k.off)+k.h*.4,TZ(k.y));dm.scale.set(3,k.h*.9,k.r*1.6);dm.rotation.set(.5,hash2(k.id,3)*.6,.3);tc.set('#c88f86');});
    // cottonwoods
    const trs=sel2(S.trees,100);
    inst(new THREE.CylinderGeometry(.7,1,1,6),M3(0xffffff,{roughness:1}),trs,(e)=>{const x=SCN.bx(W,e.y,e.side,e.off),h=e.r*1.3;dm.position.set(TX(x),ground(e.off)+h/2,TZ(e.y));dm.scale.set(e.r*.13,h,e.r*.13);dm.rotation.set(0,0,0);tc.set('#6a5a48');});
    const can=[];trs.forEach(e=>{for(let k=0;k<3;k++)can.push({e,k});});
    inst(new THREE.IcosahedronGeometry(1,1),M3(0xffffff,{roughness:.9,flatShading:true}),can,({e,k})=>{const x=SCN.bx(W,e.y,e.side,e.off)+(hash2(e.y|0,k)-.5)*e.r,h=e.r*1.3;dm.position.set(TX(x),ground(e.off)+h+e.r*.35+k*e.r*.22,TZ(e.y+(hash2(k,e.y|0)-.5)*e.r));dm.scale.set(e.r*.75,e.r*.6,e.r*.75);dm.rotation.set(0,k,0);
      if(e.ac){dm.scale.set(e.r*1.1,e.r*.32,e.r*1.1);}tc.set(e.ac?'#7a9a3a':fall?(e.g<.65?'#d2a93a':'#9aa23e'):'#6e9a3a').multiplyScalar(.8+hash2(k,e.y|0)*.35);});
    // tamarisk
    inst(new THREE.IcosahedronGeometry(1,0),M3(0xffffff,{roughness:1,flatShading:true}),sel2(S.tam,50),(m,i)=>{const x=SCN.bx(W,m.y,m.side,m.off);dm.position.set(TX(x),ground(m.off)+m.r*.5,TZ(m.y));dm.scale.set(m.r*1.1,m.r*1.3,m.r*1.1);dm.rotation.set(0,i,0);tc.set(fall&&m.g<.5?'#a8782f':m.g<.5?'#566838':'#6f7d44');});
    // boulders
    inst(new THREE.IcosahedronGeometry(1,1),M3(0xffffff,{roughness:.85,flatShading:true}),sel2(S.bould,80),(q)=>{const x=SCN.bx(W,q.y,q.side,q.off);dm.position.set(TX(x),ground(q.off)-q.r*.2,TZ(q.y));dm.scale.set(q.r,q.r*.75,q.r*1.1);dm.rotation.set(hash2(q.id,1),hash2(q.id,2)*6,0);tc.set(pal.rock).multiplyScalar(.75+hash2(q.id,3)*.5);});
    // hoodoos on the slopes
    inst(new THREE.CylinderGeometry(.55,1,1,7),M3(0xffffff,{roughness:1,flatShading:true}),sel2(S.hood,300),(q,i)=>{const x=SCN.bx(W,q.y,q.side,q.off);dm.position.set(TX(x),profH(q.off)+q.h/2-4,TZ(q.y));dm.scale.set(q.r,q.h,q.r);dm.rotation.set(0,i,0);tc.set(i%2?pal.wall2:(pal.strata||pal.wall));});
    // railroad
    for(const r of S.rail){const a=Math.max(r.y0,y0),z=Math.min(r.y1,y1);if(z-a<60)continue;const hgt=profH(r.off)+1.5,n=Math.ceil((z-a)/30)+1,P=new Float32Array(n*2*3);const id=[];
      for(let i=0;i<n;i++){const y=a+(z-a)*i/(n-1),x=SCN.bx(W,y,r.side,r.off);P.set([TX(x-13),hgt,TZ(y),TX(x+13),hgt,TZ(y)],i*6);if(i<n-1){const q=i*2;id.push(q,q+2,q+1,q+1,q+2,q+3);}}
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(P,3));g.setIndex(id);g.computeVertexNormals();const bm=new THREE.Mesh(g,M3(0x8b857a,{roughness:1,side:THREE.DoubleSide}));bm.position.y=.2;grp.add(bm);
      const ties=[];for(let y=a;y<z;y+=14)ties.push(y);inst(new THREE.BoxGeometry(1,1,1),M3(0xffffff,{roughness:1}),ties.map(y=>({y})),(e)=>{const x=SCN.bx(W,e.y,r.side,r.off);dm.position.set(TX(x),hgt+1,TZ(e.y));dm.scale.set(20,1.4,3);dm.rotation.set(0,0,0);tc.set('#5b4632');});
      for(const s of[-5,5]){const rl=[];for(let y=a;y<z;y+=30)rl.push(y);inst(new THREE.BoxGeometry(1,1,1),M3(0xffffff,{metalness:.6,roughness:.35}),rl.map(y=>({y})),(e)=>{const x=SCN.bx(W,e.y+15,r.side,r.off)+s,dx=SCN.bx(W,e.y+30,r.side,r.off)-SCN.bx(W,e.y,r.side,r.off);dm.position.set(TX(x),hgt+2.3,TZ(e.y+15));dm.scale.set(1.2,1.2,31);dm.rotation.set(0,Math.atan2(-dx,30),0);tc.set('#c8ccd0');});}
      if(!ch.train){const tg=new THREE.Group();for(let k=0;k<11;k++){const car=new THREE.Mesh(new THREE.BoxGeometry(17,20,66),M3(k===0?0x4d5864:0xd8dde2,{metalness:k?.6:.2,roughness:.35}));const st=new THREE.Mesh(new THREE.BoxGeometry(17.4,2.5,66.4),M3(k===0?0xc0392b:0x2e5d9e));st.position.y=-1;car.add(st);tg.add(car);}tg.visible=false;grp.add(tg);ch.train={g:tg,hgt};}}
    // waterfalls down the walls, ice patches, waterfall lips, bungee jumper
    for(const q of sel2(S.casc,200)){const x=SCN.bx(W,q.y,q.side,8),top=profH(Math.min(400,q.h*1.6));const fallM=new THREE.Mesh(new THREE.PlaneGeometry(q.w*2.2,top),new THREE.MeshBasicMaterial({color:0xeef8ff,transparent:true,opacity:.7,side:THREE.DoubleSide}));fallM.position.set(TX(SCN.bx(W,q.y,q.side,30)),top/2,TZ(q.y));fallM.rotation.y=Math.PI/2;grp.add(fallM);ch.fall=(ch.fall||[]).concat([fallM]);}
    inst(new THREE.IcosahedronGeometry(1,1),M3(0xf2f8ff,{roughness:.35}),sel2(S.ice,80),(q)=>{const x=SCN.bx(W,q.y,q.side,q.off);dm.position.set(TX(x),ground(q.off)+1,TZ(q.y));dm.scale.set(q.r,3+q.r*.15,q.r*.8);dm.rotation.set(0,hash2(q.id,1)*6,0);tc.set('#f2f8ff');});
    inst(new THREE.CylinderGeometry(.3,.5,1,4),M3(0xffffff,{roughness:1}),sel2(S.reeds,40),(q)=>{const x=SCN.bx(W,q.y,q.side,q.off);dm.position.set(TX(x),ground(q.off)+q.r,TZ(q.y));dm.scale.set(q.r*.6,q.r*2.4,q.r*.6);dm.rotation.set(0,0,0);tc.set('#8a9a4a');});
    for(const f of S.falls){if(f.y<y0||f.y>y1)continue;const hw=W.hw(f.y),lip=new THREE.Mesh(new THREE.BoxGeometry(hw*2.1,6,24),M3(0xf4fbfb,{roughness:.6}));lip.position.set(TX(W.cx(f.y)),2,TZ(f.y));grp.add(lip);}
    if(S.bungee.length){const q=S.bungee.find(q=>q.y>y0&&q.y<y1);if(q){const br=W.bridges.find(b=>Math.abs(b.y-q.y)<200),top=br&&br.high?Math.min(((G.zone&&G.zone.wallH)||G.river.wallH)*.75,520):70;const pm=person3(0xe74c3c);pm.rotation.x=Math.PI;grp.add(pm);
      const rope=new THREE.Mesh(new THREE.CylinderGeometry(.6,.6,1,4),M3(0x222222));grp.add(rope);ch.bungee={pm,rope,q,top,x:TX(W.cx(q.y)),z:TZ(q.y)};}}
    // other parties at camps
    for(const cp of W.camps){if(cp.y<y0||cp.y>y1)continue;if(!(cp.taken||(G.mode==='day'&&hash2(cp.y|0,7)<.45)))continue;const s=cp.side,hw=W.hw(cp.y),cx=W.cx(cp.y),n=2+Math.floor(hash2(cp.y|0,3)*3),cols=[0xe67e22,0x2e86c1,0x27ae60,0xc0392b,0xf1c40f];
      for(let k=0;k<n;k++){const tent=new THREE.Mesh(new THREE.ConeGeometry(13,16,4),M3(cols[(k+(cp.y|0))%5],{roughness:.8}));tent.rotation.y=Math.PI/4;tent.position.set(TX(cx+s*(hw+38+(k%2)*22)),profH(38)+8,TZ(cp.y-70+k*48));grp.add(tent);}
      for(let k=0;k<3;k++){const pp=person3(cols[(k+2)%5]);pp.position.set(TX(cx+s*(hw+20+k*9)),profH(20),TZ(cp.y+(k-1)*30));grp.add(pp);}
      for(let k=0;k<2;k++){const bt=new THREE.Mesh(new THREE.TorusGeometry(13,6,6,16),M3([0xf0b429,0xd35400][k],{roughness:.6}));bt.rotation.x=Math.PI/2;bt.scale.set(1,1.8,1);bt.position.set(TX(cx+s*(hw-6)),4,TZ(cp.y+60+k*46));grp.add(bt);}}
    // cliff jumpers
    const jm=[];for(const sp of S.jumps){if(sp.y<y0-200||sp.y>y1+200)continue;for(const p of sp.ppl){const m=person3(new THREE.Color(p.col).getHex());grp.add(m);jm.push({m,p});}
      const lab=textSprite('🤸 '+sp.n,'#9fe3ff','rgba(20,40,60,.85)');lab.position.set(TX(SCN.bx(W,sp.y,sp.side,30)),sp.h+48,TZ(sp.y));grp.add(lab);}
    for(const q of S.sun){if(q.y<y0||q.y>y1)continue;const m=person3(new THREE.Color(q.col).getHex());m.rotation.z=Math.PI/2*(q.side);m.position.set(TX(SCN.bx(W,q.y,q.side,q.off)),ground(q.off)+18,TZ(q.y));grp.add(m);}
    const sw=[];for(const q of S.swim){if(q.y<y0||q.y>y1)continue;const m=new THREE.Mesh(new THREE.SphereGeometry(4.5,8,6),M3(0xf1c27d));grp.add(m);sw.push({m,q});}
    ch.scn={jm,sw};},
  render3D(TX,TZ,t){const ch=R3&&R3.chunk;if(!ch||!G.W.scn)return;const W=G.W,S=W.scn;
    if(ch.scn){for(const {m,p} of ch.scn.jm){m.position.set(TX(p.x),Math.max(-14,p.z)+(p.st==='swim'?-12:0),TZ(p.y));m.rotation.set(p.spin*(p.flip?1:0),0,0);}
      for(const {m,q} of ch.scn.sw){const x=SCN.bx(W,q.y,q.side,q.off)+Math.sin(t*.7+q.ph)*14,y=q.y+Math.cos(t*.5+q.ph)*10;m.position.set(TX(x),heightAt(x,y,t)+2,TZ(y));}}
    if(ch.bungee){const B=ch.bungee,cyc=B.q.t%9,fr=cyc<1.5?cyc/1.5:1-.12*Math.abs(Math.cos((cyc-1.5)*2.2))*Math.exp(-(cyc-1.5)*.5),y=B.top-fr*(B.top-40);B.pm.position.set(B.x,y,B.z);B.rope.position.set(B.x,(B.top+y)/2+10,B.z);B.rope.scale.set(1,Math.max(1,B.top-y),1);}
    if(ch.train){const tr=S.train,g=ch.train.g;if(!tr){g.visible=false;return;}g.visible=true;g.children.forEach((car,k)=>{const yy=tr.y+k*74,x=SCN.bx(W,yy,tr.side,tr.off),dx=SCN.bx(W,yy+10,tr.side,tr.off)-SCN.bx(W,yy-10,tr.side,tr.off);car.position.set(TX(x),ch.train.hgt+13,TZ(yy));car.rotation.set(0,Math.atan2(-dx,20),0);});}}
};
