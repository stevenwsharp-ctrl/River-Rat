'use strict';
/* =====================================================================
   RIVER RAT — WILD ANIMALS AND RIVER DANGERS
   Crocodiles, hippos, elephants, monkeys, toucans, sloths, platypus,
   fish eagles, skuas and cows. Hippo charges, crocodiles near swimmers,
   cold-water swims (hypothermia), quick rescues, people who fall in,
   portages around deadly rapids, and waterfalls you raft.
   ===================================================================== */
const WILD={
  kinds:{croc:1,hippo:1,elephant:1,fisheagle:1,monkey:1,toucan:1,sloth:1,platypus:1,skua:1,cow:1},
  birds:{fisheagle:1,toucan:1,skua:1},
  /* ---------- spawn ---------- */
  spawn(k,f,cx,hw,side){
    if(this.birds[k]){f.x=cx-side*(hw+260);f.vx=side*(k==='fisheagle'?55:k==='skua'?70:90);f.vy=(Math.random()-.5)*40;f.alt=k==='fisheagle'?160:k==='skua'?110:70;}
    else if(k==='hippo'){if(G.W.rint(f.y)>.08)return null;f.x=cx+(Math.random()-.5)*hw*1.1;f.n=1+Math.floor(Math.random()*3);f.st='sub';f.tm=1+Math.random()*2;f.minD=1e9;}
    else if(k==='croc'){f.x=cx+side*(hw-6);f.st='bask';f.len=50+Math.random()*40;f.a=side>0?Math.PI*.5:-Math.PI*.5;}
    else if(k==='elephant'){f.off=30+Math.random()*50;f.n=1+Math.floor(Math.random()*3);f.x=cx+side*(hw+f.off);}
    else if(k==='monkey'){f.off=8+Math.random()*60;f.n=1+Math.floor(Math.random()*4);f.x=cx+side*(hw+f.off);f.jump=0;}
    else if(k==='sloth'){f.off=20+Math.random()*30;f.x=cx+side*(hw+f.off);}
    else if(k==='cow'){f.off=10+Math.random()*30;f.n=1+Math.floor(Math.random()*2);f.x=cx+side*(hw+f.off);}
    else if(k==='platypus'){f.x=cx+side*(hw-26);f.dive=0;}
    return f;},
  /* ---------- per-animal update. Return false to remove. ---------- */
  upd(f,dt,d){const b=G.b,W=G.W,k=f.k;
    if(this.birds[k]){f.x+=f.vx*dt;f.y+=f.vy*dt+Math.sin(f.t*(k==='fisheagle'?.5:1.2))*12*dt;
      if(k==='fisheagle'&&!f.called&&d<500){f.called=1;this.call('eagle');}return true;}
    if(k==='hippo')return this.updHippo(f,dt,d);
    if(k==='croc')return this.updCroc(f,dt,d);
    if(k==='elephant'){if(!f.tr&&d<320){f.tr=1;this.call('trumpet');}return true;}
    if(k==='monkey'){f.jump=Math.max(0,f.jump-dt);if(d<260&&Math.random()<dt*1.5)f.jump=.5;return true;}
    if(k==='platypus'){const fl=flowAt(f.x,f.y);f.y+=fl.vy*.3*dt;if(d<170&&!f.dive){f.dive=.01;splash(f.x,f.y,4,.3);}if(f.dive){f.dive+=dt;if(f.dive>2.5)return false;}return true;}
    return true;},
  call(kind){try{const A=AU;if(!A.ctx||A.muted)return;const t=A.ctx.currentTime,o=A.ctx.createOscillator(),g=A.ctx.createGain();
      if(kind==='trumpet'){o.type='sawtooth';o.frequency.setValueAtTime(420,t);o.frequency.linearRampToValueAtTime(620,t+.25);o.frequency.linearRampToValueAtTime(380,t+.9);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.05,t+.06);g.gain.linearRampToValueAtTime(0,t+1);}
      else if(kind==='eagle'){o.type='triangle';o.frequency.setValueAtTime(1500,t);for(let i=0;i<4;i++){o.frequency.setValueAtTime(1500-i*80,t+i*.16);o.frequency.linearRampToValueAtTime(1100,t+i*.16+.12);}g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.035,t+.03);g.gain.linearRampToValueAtTime(0,t+.7);}
      else{o.type='square';o.frequency.setValueAtTime(90,t);o.frequency.linearRampToValueAtTime(60,t+.5);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.06,t+.05);g.gain.linearRampToValueAtTime(0,t+.6);}
      o.connect(g);g.connect(A.ctx.destination);o.start(t);o.stop(t+1.1);}catch(e){}},
  updHippo(f,dt,d){const b=G.b;f.tm-=dt;f.minD=Math.min(f.minD,d);
    if(f.st==='sub'&&f.tm<=0){f.st='up';f.tm=2.5+Math.random()*2.5;splash(f.x,f.y,5,.3);if(d<900)this.call('grunt');}
    else if(f.st==='up'&&f.tm<=0){f.st='sub';f.tm=3+Math.random()*3;}
    if(!G.hippoWarned&&d<700){G.hippoWarned=1;toast('🦛 Hippos ahead! Keep away from them. Hug the shallow bank.','#ffd36b',2.6);coach('hippo');}
    if(f.st!=='charge'&&!f.charged&&d<(f.st==='up'?115:75)&&G.state==='run'&&G.inv<=0){f.st='charge';f.charged=1;f.tm=.9;f.cx=b.x;f.cy=b.y;this.call('grunt');G.shake=6;}
    if(f.st==='charge'){const dx=b.x-f.x,dy=b.y-f.y,l=Math.hypot(dx,dy)||1;f.x+=dx/l*190*dt;f.y+=dy/l*190*dt;
      if(l<G.craft.r+18){f.st='sub';f.tm=6;hit(12,'Hippo charge!',f.x,f.y,160);G.b.vx+=dx/l*-120;G.b.av+=(Math.random()-.5)*3;maybeMOB(.25);G.hippoHits=(G.hippoHits||0)+1;toast('🦛 A hippo slams the boat!','#ff8a7a',1.8);}
      else if(f.tm<=0){f.st='sub';f.tm=5;}}
    if(!f.passed&&f.y<b.y-160){f.passed=1;if(!f.charged&&f.minD>170&&f.minD<520){G.score+=30;pop('🦛 Safe pass +30','#bfe9c8');}}
    return true;},
  updCroc(f,dt,d){const b=G.b,W=G.W,s=G.swim;
    if(f.st==='bask'){if(d<250){f.st='slide';f.tm=1;}return true;}
    if(f.st==='slide'){f.tm-=dt;const cx=W.cx(f.y),hw=W.hw(f.y),side=Math.sign(f.x-cx)||1;f.x-=side*60*dt;if(f.tm<=0){f.st='swim';f.tm=7;splash(f.x,f.y,8,.5);AU.splash(.15);}return true;}
    if(f.st==='swim'){f.tm-=dt;const fl=flowAt(f.x,f.y);f.y+=fl.vy*.8*dt;f.x+=fl.vx*.8*dt;
      if(s&&Math.hypot(s.x-f.x,s.y-f.y)<700){const dx=s.x-f.x,dy=s.y-f.y,l=Math.hypot(dx,dy)||1;f.x+=dx/l*75*dt;f.y+=dy/l*75*dt;f.a=Math.atan2(dx,dy);f.tm=Math.max(f.tm,1);
        if(!s.crocWarn){s.crocWarn=1;toast(`🐊 A crocodile is going for ${s.name}! Get them in the boat NOW!`,'#ff6b5b',2.2);}
        if(l<26){G.swim=null;G.score=Math.max(0,G.score-150);G.crocBites=(G.crocBites||0)+1;TRIP.swimmerHurt(s.name,25);splash(f.x,f.y,14,1);AU.splash(.8);G.shake=8;
          toast(`🐊 CROC! Everyone hauls ${s.name} back aboard. Bitten (−25 health, −150).`,'#ff6b5b',2.6);f.st='sub';f.tm=1;}}
      if(f.tm<=0)f.st='sub';return true;}
    if(f.st==='sub'){f.tm=(f.tm||1)-dt;return f.tm>-1.2;}
    return true;},
  /* ---------- 2D drawing ---------- */
  draw2D(c,f,t){const W=G.W,k=f.k;
    if(this.birds[k]){const s=k==='fisheagle'?1.6:k==='skua'?1.2:1,fl=Math.sin(t*(k==='fisheagle'?3:7)+f.ph)*(k==='fisheagle'?4:6);
      c.fillStyle='rgba(0,0,0,.16)';c.beginPath();c.ellipse(f.x+f.alt*.3,f.y-f.alt*.4,12*s,3*s,0,0,7);c.fill();
      c.strokeStyle=k==='toucan'?'#111':k==='skua'?'#5b4b3e':'#4a2e1e';c.lineWidth=3*s;c.beginPath();c.moveTo(f.x-16*s,f.y+fl);c.lineTo(f.x,f.y);c.lineTo(f.x+16*s,f.y+fl);c.stroke();
      if(k==='fisheagle'){c.fillStyle='#f4f4f0';c.beginPath();c.arc(f.x,f.y+3,3.4,0,7);c.fill();}
      if(k==='toucan'){c.fillStyle='#ff8a1a';c.beginPath();c.ellipse(f.x,f.y+6,2.4,5,0,0,7);c.fill();c.fillStyle='#ffe066';c.beginPath();c.arc(f.x,f.y+1.5,2.4,0,7);c.fill();}
      return;}
    if(k==='hippo'){for(let j=0;j<(f.n||1);j++){const x=f.x+j*26-(f.n-1)*13,y=f.y+(j%2)*18;
        c.strokeStyle='rgba(255,255,255,.35)';c.lineWidth=1.5;c.beginPath();c.arc(x,y,16+Math.sin(t*2+j)*3,0,7);c.stroke();
        if(f.st==='sub'){c.fillStyle='rgba(255,255,255,.35)';for(let q=0;q<3;q++){c.beginPath();c.arc(x+Math.sin(t*3+q*2)*6,y+Math.cos(t*2+q)*6,2,0,7);c.fill();}continue;}
        const big=f.st==='charge'?1.4:1;c.save();c.translate(x,y);c.scale(big,big);
        c.fillStyle='#6b5a5c';c.beginPath();c.ellipse(0,0,13,17,0,0,7);c.fill();c.fillStyle='#7d6a6c';c.beginPath();c.ellipse(0,-10,10,8,0,0,7);c.fill();
        c.fillStyle='#d8a0a0';c.beginPath();c.arc(-4,-14,2,0,7);c.arc(4,-14,2,0,7);c.fill();c.fillStyle='#1b1515';c.beginPath();c.arc(-6,4,2,0,7);c.arc(6,4,2,0,7);c.fill();
        c.fillStyle='#5b4a4c';c.beginPath();c.arc(-9,10,3.5,0,7);c.arc(9,10,3.5,0,7);c.fill();c.restore();
        if(f.st==='charge'){c.strokeStyle='rgba(255,255,255,.8)';c.lineWidth=3;c.beginPath();c.arc(x,y,24,0,7);c.stroke();}}return;}
    if(k==='croc'){if(f.st==='sub')return;const sw=f.st==='swim';c.save();c.translate(f.x,f.y);c.rotate(-(f.a||0));const L=f.len||70;
      if(sw){c.strokeStyle='rgba(255,255,255,.5)';c.lineWidth=2;c.beginPath();c.moveTo(-14,-L*.2);c.lineTo(0,L*.3);c.lineTo(14,-L*.2);c.stroke();}
      c.fillStyle=sw?'rgba(62,74,46,.85)':'#4e5a36';c.beginPath();c.moveTo(0,L*.5);c.quadraticCurveTo(9,L*.2,8,0);c.quadraticCurveTo(7,-L*.3,0,-L*.5);c.quadraticCurveTo(-7,-L*.3,-8,0);c.quadraticCurveTo(-9,L*.2,0,L*.5);c.fill();
      if(!sw){c.fillStyle='#4e5a36';for(const s2 of[-1,1])for(const yy of[L*.18,-L*.12]){c.beginPath();c.ellipse(s2*10,yy,5,3,s2*.6,0,7);c.fill();}}
      c.fillStyle='#2e3622';for(let q=-3;q<4;q++){c.fillRect(-1.5,q*L*.07-1,3,2);}c.fillStyle='#d8c860';c.beginPath();c.arc(-3,L*.38,1.6,0,7);c.arc(3,L*.38,1.6,0,7);c.fill();c.restore();return;}
    const side=Math.sign(f.x-W.cx(f.y))||1,x=W.cx(f.y)+side*(W.hw(f.y)+(f.off||0));
    if(k==='elephant'){for(let j=0;j<(f.n||1);j++){const ex=x+side*j*30,ey=f.y+j*40;c.fillStyle='rgba(0,0,0,.25)';c.beginPath();c.ellipse(ex+5,ey-6,18,24,0,0,7);c.fill();
        c.fillStyle='#7f7b78';c.beginPath();c.ellipse(ex,ey,17,23,0,0,7);c.fill();c.fillStyle='#8f8b88';c.beginPath();c.ellipse(ex-side*0,ey+22,11,9,0,0,7);c.fill();
        c.fillStyle='#75716e';c.beginPath();c.ellipse(ex-13,ey+18,8,11,.4,0,7);c.ellipse(ex+13,ey+18,8,11,-.4,0,7);c.fill();
        c.strokeStyle='#7f7b78';c.lineWidth=5;c.beginPath();c.moveTo(ex,ey+28);c.quadraticCurveTo(ex-side*10+Math.sin(t*1.5+j)*6,ey+40,ex-side*6,ey+48);c.stroke();}return;}
    if(k==='monkey'){for(let j=0;j<(f.n||1);j++){const mx=x+side*j*12,my=f.y+j*14,jp=f.jump>0?Math.sin(f.jump/.5*Math.PI)*10:0;c.fillStyle='rgba(0,0,0,.22)';c.beginPath();c.arc(mx+2,my-2,6,0,7);c.fill();
        c.fillStyle=G.river.cont==='Asia'?'#b8b0a0':'#4a3424';c.beginPath();c.arc(mx,my+jp*.3,6+jp*.15,0,7);c.fill();c.fillStyle=G.river.cont==='Asia'?'#1e1a18':'#c8a888';c.beginPath();c.arc(mx,my+5+jp*.3,3,0,7);c.fill();
        c.strokeStyle=G.river.cont==='Asia'?'#9a9282':'#3a2818';c.lineWidth=2;c.beginPath();c.moveTo(mx,my-5);c.quadraticCurveTo(mx+side*10,my-12,mx+side*6,my-20);c.stroke();}return;}
    if(k==='sloth'){c.fillStyle='#7a6a52';c.beginPath();c.ellipse(x,f.y,8,11,0,0,7);c.fill();c.fillStyle='#d8c8a8';c.beginPath();c.arc(x,f.y+8,4,0,7);c.fill();c.fillStyle='#2a2018';c.fillRect(x-3,f.y+8,2,1.5);c.fillRect(x+1,f.y+8,2,1.5);
      c.strokeStyle='#5a4a38';c.lineWidth=3;c.beginPath();c.moveTo(x-6,f.y+4);c.lineTo(x-12,f.y+14);c.moveTo(x+6,f.y+4);c.lineTo(x+12,f.y+14);c.stroke();return;}
    if(k==='cow'){for(let j=0;j<(f.n||1);j++){const cx2=x+side*j*22,cy=f.y+j*30;c.fillStyle='rgba(0,0,0,.25)';c.beginPath();c.ellipse(cx2+3,cy-4,9,15,0,0,7);c.fill();c.fillStyle='#f1eee6';c.beginPath();c.ellipse(cx2,cy,9,15,0,0,7);c.fill();
        c.fillStyle='#e6e0d2';c.beginPath();c.arc(cx2,cy+16,5.5,0,7);c.fill();c.strokeStyle='#c8b890';c.lineWidth=2;c.beginPath();c.moveTo(cx2-5,cy+19);c.lineTo(cx2-8,cy+23);c.moveTo(cx2+5,cy+19);c.lineTo(cx2+8,cy+23);c.stroke();}return;}
    if(k==='platypus'){if(f.dive>.3)return;c.fillStyle='#5a3e2a';c.beginPath();c.ellipse(f.x,f.y,6,11,0,0,7);c.fill();c.fillStyle='#2a2a2a';c.beginPath();c.ellipse(f.x,f.y+12,4,4,0,0,7);c.fill();
      c.strokeStyle='rgba(255,255,255,.35)';c.lineWidth=1.5;c.beginPath();c.moveTo(f.x-8,f.y-14);c.lineTo(f.x,f.y-4);c.lineTo(f.x+8,f.y-14);c.stroke();return;}
  },
  /* ---------- 3D models ---------- */
  mesh3D(k){const g=new THREE.Group(),M=(c,o)=>M3(c,o);
    if(this.birds[k]){const s=k==='fisheagle'?1.7:1.1,body=new THREE.Mesh(new THREE.ConeGeometry(2.5*s,12*s,6),M(k==='toucan'?0x151515:k==='skua'?0x5b4b3e:0x4a2e1e));body.rotation.x=Math.PI/2;g.add(body);const wings=[];
      for(const sd of[-1,1]){const w=new THREE.Mesh(new THREE.BoxGeometry(16*s,.8,6*s),M(k==='skua'?0x6b5a4c:0x2a1e16));w.position.x=sd*8*s;g.add(w);wings.push(w);}
      if(k==='fisheagle'){const h=new THREE.Mesh(new THREE.SphereGeometry(2.6*s,8,6),M(0xf4f4f0));h.position.z=-6*s;g.add(h);}
      if(k==='toucan'){const bk=new THREE.Mesh(new THREE.ConeGeometry(1.6,8,6),M(0xff8a1a));bk.rotation.x=-Math.PI/2;bk.position.z=-9;g.add(bk);}
      g.userData.wings=wings;return g;}
    if(k==='hippo'){const m=M(0x6b5a5c);for(let j=0;j<3;j++){const h=new THREE.Group();const head=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),m);head.scale.set(11,7,15);h.add(head);
        const sn=new THREE.Mesh(new THREE.SphereGeometry(1,10,6),M(0x7d6a6c));sn.scale.set(9,6,7);sn.position.set(0,1,-12);h.add(sn);for(const s of[-1,1]){const e=new THREE.Mesh(new THREE.SphereGeometry(2,6,5),M(0x4a3a3c));e.position.set(s*7,6,4);h.add(e);const ey=new THREE.Mesh(new THREE.SphereGeometry(1.4,6,5),M(0x111111));ey.position.set(s*5,6,-3);h.add(ey);}
        h.position.set(j*26-26,0,(j%2)*-18);h.visible=j===0;g.add(h);}g.userData.heads=g.children;return g;}
    if(k==='croc'){const m=M(0x4e5a36,{roughness:.8});const b=new THREE.Mesh(new THREE.SphereGeometry(1,12,6),m);b.scale.set(8,4,30);g.add(b);const sn=new THREE.Mesh(new THREE.BoxGeometry(8,4,18),m);sn.position.set(0,0,-34);g.add(sn);const tl=new THREE.Mesh(new THREE.ConeGeometry(4,34,6),m);tl.rotation.x=-Math.PI/2;tl.position.z=44;g.add(tl);
      for(const s of[-1,1])for(const z of[-14,14]){const l=new THREE.Mesh(new THREE.BoxGeometry(4,3,8),m);l.position.set(s*9,-2,z);g.add(l);}return g;}
    if(k==='elephant'){const m=M(0x7f7b78,{roughness:.9});for(let j=0;j<3;j++){const e=new THREE.Group();const b=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),m);b.scale.set(18,18,26);b.position.y=34;e.add(b);
        const h=new THREE.Mesh(new THREE.SphereGeometry(10,10,8),m);h.position.set(0,42,-26);e.add(h);const tr=new THREE.Mesh(new THREE.CylinderGeometry(2.5,4,26,8),m);tr.position.set(0,26,-34);tr.rotation.x=.2;e.add(tr);
        for(const s of[-1,1]){const ear=new THREE.Mesh(new THREE.BoxGeometry(2,16,14),m);ear.position.set(s*11,44,-20);e.add(ear);}for(const s of[-1,1])for(const z of[-12,12]){const l=new THREE.Mesh(new THREE.CylinderGeometry(4.5,4.5,22,8),m);l.position.set(s*9,11,z);e.add(l);}
        e.position.set(j*34,0,j*40);e.visible=j===0;g.add(e);}return g;}
    if(k==='monkey'||k==='sloth'){const m=M(k==='sloth'?0x7a6a52:0x5a4434);const b=new THREE.Mesh(new THREE.SphereGeometry(5,8,6),m);b.position.y=8;g.add(b);const h=new THREE.Mesh(new THREE.SphereGeometry(3.5,8,6),m);h.position.y=15;g.add(h);
      const tl=new THREE.Mesh(new THREE.CylinderGeometry(.8,.8,14,5),m);tl.position.set(0,10,6);tl.rotation.x=.9;g.add(tl);return g;}
    if(k==='cow'){const m=M(0xf1eee6);const b=new THREE.Mesh(new THREE.BoxGeometry(12,12,26),m);b.position.y=16;g.add(b);const h=new THREE.Mesh(new THREE.BoxGeometry(8,8,10),m);h.position.set(0,22,-16);g.add(h);
      for(const s of[-1,1])for(const z of[-9,9]){const l=new THREE.Mesh(new THREE.BoxGeometry(3,10,3),m);l.position.set(s*4,5,z);g.add(l);}return g;}
    if(k==='platypus'){const b=new THREE.Mesh(new THREE.SphereGeometry(1,8,6),M(0x5a3e2a));b.scale.set(4,2.5,9);g.add(b);const bl=new THREE.Mesh(new THREE.BoxGeometry(5,1.4,5),M(0x2a2a2a));bl.position.z=-10;g.add(bl);return g;}
    return g;},
  pose3D(m,f,TX,TZ,t){const W=G.W,k=f.k;let x=f.x,y=f.y,h=heightAt(x,y,t);
    if(this.birds[k]){h+=f.alt;m.rotation.set(0,Math.atan2(f.vx,-(f.vy||0)),0);const fl=Math.sin(t*(k==='fisheagle'?3:7)+f.ph)*.5;if(m.userData.wings){m.userData.wings[0].rotation.z=fl;m.userData.wings[1].rotation.z=-fl;}}
    else if(k==='hippo'){const up=f.st!=='sub';m.children.forEach((c2,j)=>c2.visible=j<(f.n||1));h+=up?(f.st==='charge'?2:-1):-9;m.rotation.set(0,f.st==='charge'?Math.atan2(G.b.x-f.x,-(G.b.y-f.y)):0,0);}
    else if(k==='croc'){m.visible=f.st!=='sub';h=f.st==='bask'?(R3.chunk&&R3.chunk.profH?R3.chunk.profH(2):1)+3:h-2;m.rotation.set(0,-(f.a||0)+Math.PI,0);}
    else if(k==='platypus'){m.visible=!(f.dive>.3);h+=1;}
    else{const side=Math.sign(f.x-W.cx(f.y))||1;x=W.cx(f.y)+side*(W.hw(f.y)+(f.off||0));h=R3.chunk&&R3.chunk.profH?R3.chunk.profH(f.off||0):10;
      if(k==='elephant'||k==='cow'){m.children.forEach((c2,j)=>{if(k==='elephant')c2.visible=j<(f.n||1);});m.rotation.y=side>0?Math.PI/2:-Math.PI/2;}
      if(k==='monkey')h+=(f.jump>0?Math.sin(f.jump/.5*Math.PI)*10:0)+(G.river.trees?20:0);
      if(k==='sloth')h+=40;}
    m.position.set(TX(x),h,TZ(y));},
  /* ---------- river dangers, every frame ---------- */
  update(dt){if(!G||G.state!=='run')return;const b=G.b,W=G.W,R=G.river;
    // waterfalls you raft (Tutea Falls)
    for(const r of W.rapids){if(!r.fall||r.fell)continue;const yf=r.y0+r.L*.32;if(b.y>yf){r.fell=1;this.drop(r);}}
    if(G.airT>0)G.airT=Math.max(0,G.airT-dt);
    // portage choice before deadly rapids
    for(const r of W.rapids){if(!r.portage||r.pq||r.done)continue;if(b.y>r.y0-330&&b.y<r.y0){r.pq=1;this.askPortage(r);return;}}
    // people fall in on flat water now and then
    G.fallT=(G.fallT===undefined?60+Math.random()*120:G.fallT)-dt;
    if(G.fallT<=0){G.fallT=150+Math.random()*180;if(inCalm()&&!G.swim&&G.craft.crew>=2){const why=['reached for a hat','stood up to take a photo','slipped on a wet tube','leaned out to grab a water bottle'][Math.floor(Math.random()*4)];
      maybeMOB(1,true);if(G.swim){G.swim.why=why;toast(`💦 ${G.swim.name} ${why} and fell in!`,'#9fe3ff',2.2);}}}
    // fixed hippo pods
    if(W.hippoSpots)for(const h of W.hippoSpots){if(h.spawned||h.y-b.y>1100||h.y<b.y)continue;h.spawned=1;const f={k:'hippo',y:h.y,t:0,side:1,ph:Math.random()*6,x:h.x,n:3,st:'up',tm:3,minD:1e9};G.fauna.push(f);}
  },
  drop(r){const b=G.b,ok=sideRisk()<.35;G.airT=1.1;G.shake=14;splash(b.x,b.y+40,30,1.6);AU.splash(1);
    if(ok){const p=250;G.score+=p;toast(`🌊 ${r.n.toUpperCase()}! A ${r.fall} m drop! +${p}`,'#9fe3ff',2.2);if(typeof award==='function')award('falls');}
    else{hit(14,'Hard landing',b.x,b.y,150);maybeMOB(.85);toast(`${r.n}: you landed sideways!`,'#ff8a7a',1.8);}},
  askPortage(r){G.state='scene';stopBoat();
    SCENE.open({spec:sceneSpec('danger',r.n),kicker:`⚠ ${clsText(G.river,r.c)} · Mile ${r.m}`,title:r.n,sub:'Run it, or carry the boats around?',
      body:`<p>${esc(r.beta)}</p><p class="mute">Most trips carry the boats around (a portage). It is slow, hard work, but safe.</p>`,
      buttons:[['🚶 Portage: carry the boats around',()=>{SCENE.close();this.portage(r);}],['🔥 Run it anyway',()=>{SCENE.close();G.state='run';G.inv=.5;toast(`You go for ${r.n}. Hold on!`,'#ffb347',1.6);}]]});},
  portage(r){const b=G.b,W=G.W;G.state='run';r.done=true;r.portaged=true;r.stars=0;G.clean++;G.portages=(G.portages||0)+1;G.t+=45;
    b.y=r.y1+160;b.x=W.cx(b.y);b.h=0;b.av=0;const f=flowAt(b.x,b.y);b.vx=f.vx;b.vy=f.vy;G.inv=1.2;G.stallY=b.y;
    const tr=G.trip;if(tr&&tr.crew){TRIP.alive().forEach(c=>c.hp=Math.max(1,c.hp-3));tr.morale=Math.max(0,tr.morale-2);}
    toast(`🚶 You carried the boats around ${r.n}. Safe! (+45 s)`,'#cfe3e0',2.4);AU.resume();},
  /* ---------- cold water and rescues ---------- */
  coldRate(){const R=G.river,wf=R.waterF||60;let k=clamp((70-wf)*.25,.4,10);const tr=G.trip;if(tr&&tr.sup&&tr.sup.warm>=TRIP.alive().length)k*=.5;return k;},
  swimTick(s,dt){s.cold=Math.min(100,(s.cold||0)+this.coldRate()*dt);
    if(s.cold>=60&&!s.shiver){s.shiver=1;toast(`🥶 ${s.name} is shivering hard. Hurry!`,'#9fe3ff',1.8);}
    if(s.cold>=100&&!s.hypo){s.hypo=1;this.hypothermia(s);return false;}return true;},
  hypothermia(s){G.swim=null;G.hypo=(G.hypo||0)+1;G.score=Math.max(0,G.score-250);TRIP.swimmerHurt(s.name,30);const tr=G.trip;if(tr&&tr.crew){const c=tr.crew.find(x=>x.name===s.name);if(c&&!c.st.includes('hypothermia'))c.st.push('hypothermia');}
    toast(`🥶 HYPOTHERMIA! ${(G.trip&&G.trip.fleet&&G.trip.fleet.length)?'The other boat':'A safety kayaker'} pulls ${s.name} out. ${s.name} is very cold (−30 health, −250).`,'#9fe3ff',3);AU.thunk(.5);},
  rescued(s){if(s.t<5){const p=100;G.score+=p;toast(`⚡ QUICK RESCUE! ${s.name} was in for only ${s.t.toFixed(1)} s. +${p}`,'#5fd38d',2);if(typeof award==='function')award('quick');return true;}return false;}
};
