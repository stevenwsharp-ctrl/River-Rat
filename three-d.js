'use strict';
/* =====================================================================
   RIVER RUN — 3D MODE (three.js r128)
   Same physics as 2D. This file only draws the river in 3D near big
   rapids, landmarks and bridges, and handles paddle animation.
   ===================================================================== */
function HAS3D(){return typeof THREE!=='undefined';}
let R3=null;
function hash3(a,b,c){let h=Math.imul(a|0,374761393)^Math.imul(b|0,668265263)^Math.imul((c|0)+7,2147483647);h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296;}
function vnoise(x,y,z){return Math.sin(x*1.7+y*2.3)*.5+Math.sin(y*3.1+z*1.3+x*.7)*.3+Math.sin(z*2.7+x*1.9)*.2;}
function chopAmp(y){return 1.5+G.W.rint(y)*11+(G.lvlKey==='flood'?3:0);}
function chop(x,y,t){return Math.sin(x*.045+t*2.1+y*.021)*Math.sin(y*.05-t*3.3)+.5*Math.sin(x*.11-t*1.7+y*.09);}
function staticWater(x,y){
  let h=0,foam=0;const F=G.W.feats;
  for(let i=lowerIdx(F,y-200);i<F.length&&F[i].y<y+200;i++){const f=F[i];
    if(f.t==='wave'){const a=Math.abs(x-f.x)/f.w;if(a<1.4){const k=1-smooth(a/1.4),d=y-f.y,amp=f.h*24*k;h+=amp*Math.exp(-((d/24)**2))-amp*.5*Math.exp(-(((d+42)/24)**2));foam+=f.h*1.1*k*Math.exp(-(((d-4)/14)**2));}}
    else if(f.t==='hole'){const dx=(x-f.x)/(f.rx*1.15),e=dx*dx+((y-f.y)/f.ry)**2,ac=Math.max(0,1-dx*dx);h-=f.pow*26*ac*Math.exp(-(((y-(f.y-f.ry*.9))/16)**2));
      if(f.pour)h+=f.pow*16*ac*Math.exp(-(((y-(f.y-f.ry*1.9))/20)**2));
      if(e<1.6){const k=1-e/1.6;h+=f.pow*10*k;foam+=1.3*k+.3;}}
    else if(f.t==='rock'){const d=Math.hypot(x-f.x,y-f.y);if(d<f.r*3){if(y<f.y){h+=f.r*.3*Math.exp(-(((d-f.r)/(f.r*.5))**2));foam+=.9*Math.exp(-(((d-f.r)/9)**2));}else foam+=.35*Math.exp(-(((d-f.r)/12)**2));}}
    else if(f.t==='boil'){const d=Math.hypot(x-f.x,y-f.y);if(d<f.r*1.2){const k=1-d/(f.r*1.2);h+=7*f.pow*k*k;foam+=.35*Math.exp(-(((d-f.r*.9)/8)**2));}}
    else if(f.t==='lat'){const d=segDist(x,y,f.x0,f.y0,f.x1,f.y1);if(d<40){h+=f.pow*13*Math.exp(-((d/12)**2));foam+=.8*f.pow*Math.exp(-((d/10)**2));}}
    else if(f.t==='str'){const d=segDist(x,y,f.x0,f.y0,f.x1,f.y1);if(d<30)foam+=.6*Math.exp(-((d/12)**2));}
  }
  return [h,Math.min(1,foam)];
}
function heightAt(x,y,t){return staticWater(x,y)[0]+chopAmp(y)*chop(x,y,t)*.6;}
function M3(c,o){return new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:.8,metalness:0},o||{}));}
function makeSprite(){const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');const g=x.createRadialGradient(32,32,2,32,32,30);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.45,'rgba(255,255,255,.65)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,64,64);return new THREE.CanvasTexture(c);}
function textSprite(txt,col,bg){const c=document.createElement('canvas');c.width=320;c.height=64;const x=c.getContext('2d');x.fillStyle=bg||'rgba(30,20,10,.85)';x.fillRect(0,0,320,64);x.strokeStyle=col||'#ffb347';x.lineWidth=4;x.strokeRect(2,2,316,60);x.fillStyle='#fff';x.font='bold 24px sans-serif';x.textAlign='center';x.fillText(txt.length>22?txt.slice(0,21)+'…':txt,160,42);
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c)}));sp.scale.set(120,24,1);return sp;}
function init3D(){
  if(R3||!HAS3D())return;
  const cv3=$('g3');
  const renderer=new THREE.WebGLRenderer({canvas:cv3,antialias:!isTouch(),powerPreference:'high-performance'});
  try{renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;}catch(e){}
  renderer.setPixelRatio(Math.min(DPR,isTouch()?1.25:1.75));renderer.setSize(VW,VH,false);
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(VW<VH?74:60,VW/VH,2,5000);
  scene.add(new THREE.HemisphereLight(0xcfe2ff,0x4a3626,.62));
  const sun=new THREE.DirectionalLight(0xfff6e6,1.05);sun.position.set(-300,800,250);scene.add(sun);
  const sprite=makeSprite(),MAXP=900;
  const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.BufferAttribute(new Float32Array(MAXP*3),3));pg.setDrawRange(0,0);
  const pts=new THREE.Points(pg,new THREE.PointsMaterial({size:10,color:0xeef3f1,map:sprite,transparent:true,depthWrite:false,opacity:.8}));pts.frustumCulled=false;scene.add(pts);
  // swimmer and floating logs (reused every chunk)
  const swim=new THREE.Group();const sb=new THREE.Mesh(new THREE.SphereGeometry(8,10,8),M3(0xff8c1a));swim.add(sb);const sh=new THREE.Mesh(new THREE.SphereGeometry(4.6,10,8),M3(0xf1c27d));sh.position.y=6;swim.add(sh);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(15,1.2,6,24),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.6}));ring.rotation.x=Math.PI/2;swim.add(ring);swim.visible=false;scene.add(swim);
  const logs=[];for(let i=0;i<8;i++){const l=new THREE.Mesh(new THREE.CylinderGeometry(5,6,1,8),M3(0x5a3d24));l.visible=false;scene.add(l);logs.push(l);}
  // sky reflection for the water (no black water)
  try{const ec=document.createElement('canvas');ec.width=256;ec.height=128;const ex=ec.getContext('2d');const eg=ex.createLinearGradient(0,0,0,128);eg.addColorStop(0,'#3f78b8');eg.addColorStop(.42,'#9fc2de');eg.addColorStop(.5,'#7d7f78');eg.addColorStop(.56,'#4a3a2e');eg.addColorStop(1,'#2a2019');ex.fillStyle=eg;ex.fillRect(0,0,256,128);
    const et=new THREE.CanvasTexture(ec);et.mapping=THREE.EquirectangularReflectionMapping;const pm=new THREE.PMREMGenerator(renderer);scene.environment=pm.fromEquirectangular(et).texture;}catch(e){}
  scene.add(new THREE.AmbientLight(0xffffff,.06));
  // flowing streak texture: shows the current on the water
  const fc=document.createElement('canvas');fc.width=128;fc.height=256;const fx=fc.getContext('2d');fx.fillStyle='#000';fx.fillRect(0,0,128,256);
  for(let i=0;i<70;i++){const x=Math.random()*128,y=Math.random()*256,l=10+Math.random()*40;const g=fx.createLinearGradient(0,y,0,y+l);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.5,`rgba(255,255,255,${.35+Math.random()*.5})`);g.addColorStop(1,'rgba(255,255,255,0)');fx.fillStyle=g;fx.fillRect(x,y,1.5+Math.random()*2,l);}
  for(let i=0;i<30;i++){fx.strokeStyle=`rgba(255,255,255,${.15+Math.random()*.25})`;fx.lineWidth=1.5;fx.beginPath();const x=Math.random()*128,y=Math.random()*256;fx.arc(x,y,4+Math.random()*8,0,2.5);fx.stroke();}
  let nrmTex=null;try{const NS=128,hc=new Float32Array(NS*NS),T2=Math.PI*2/NS;
    for(let y=0;y<NS;y++)for(let x=0;x<NS;x++){let h=0;for(const [a,b,ph,amp] of [[3,5,.3,1],[7,2,1.1,.6],[5,11,2.2,.45],[13,7,.7,.3],[17,19,1.9,.2],[2,9,2.9,.5]])h+=amp*Math.sin(a*x*T2+b*y*T2*.5+ph)*Math.cos(b*x*T2*.5-a*y*T2+ph*1.7);hc[y*NS+x]=h;}
    const nc=document.createElement('canvas');nc.width=nc.height=NS;const nx2=nc.getContext('2d'),id=nx2.createImageData(NS,NS);
    for(let y=0;y<NS;y++)for(let x=0;x<NS;x++){const hx=hc[y*NS+(x+1)%NS]-hc[y*NS+(x+NS-1)%NS],hy=hc[((y+1)%NS)*NS+x]-hc[((y+NS-1)%NS)*NS+x],l=Math.hypot(hx,hy,1.2),o=(y*NS+x)*4;
      id.data[o]=128+127*(-hx/l);id.data[o+1]=128+127*(-hy/l);id.data[o+2]=128+127*(1.2/l);id.data[o+3]=255;}
    nx2.putImageData(id,0,0);nrmTex=new THREE.CanvasTexture(nc);nrmTex.wrapS=nrmTex.wrapT=THREE.RepeatWrapping;}catch(e){}
  const flowTex=new THREE.CanvasTexture(fc);flowTex.wrapS=flowTex.wrapT=THREE.RepeatWrapping;
  const wpRing=new THREE.Mesh(new THREE.TorusGeometry(22,2.5,6,32),new THREE.MeshBasicMaterial({color:0x5fd38d,transparent:true,opacity:.85}));wpRing.rotation.x=Math.PI/2;wpRing.visible=false;scene.add(wpRing);
  R3={renderer,scene,camera,sun,sprite,pts,pg,MAXP,swim,logs,flowTex,nrmTex,wpRing,fauna:{},fleet:[],chunk:null,boat:null,boatKey:null,camPos:new THREE.Vector3(),camLook:new THREE.Vector3(),camInit:false,v1:new THREE.Vector3(),v2:new THREE.Vector3(),v3:new THREE.Vector3(),v4:new THREE.Vector3()};
}
function disposeGrp(g){if(!g)return;if(g.parent)g.parent.remove(g);g.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{if(m.map&&R3&&m.map!==R3.sprite)m.map.dispose();m.dispose();});}});}
function cleanup3D(){if(!R3||!G)return;if(G.mode3d)exit3D();for(const ch of G.W.chunks)if(ch.grp){disposeGrp(ch.grp);ch.grp=null;}}

/* ---- boats ---- */
function person3(color){const g=new THREE.Group();const t=new THREE.Mesh(new THREE.CylinderGeometry(5,6,15,8),M3(color));t.position.y=7.5;g.add(t);
  const h=new THREE.Mesh(new THREE.SphereGeometry(4.5,10,8),M3(0xf1c27d));h.position.y=18;g.add(h);
  const hm=new THREE.Mesh(new THREE.SphereGeometry(5,10,6,0,Math.PI*2,0,Math.PI/2),M3(0x2980b9));hm.position.y=18.6;g.add(hm);return g;}
function oarPair(g,ox,oy,oz,len){const piv=[];for(const s of[-1,1]){const cont=new THREE.Group();cont.position.set(s*ox,oy,oz);cont.rotation.y=s>0?0:Math.PI;
  const p=new THREE.Group();const sh=new THREE.Mesh(new THREE.CylinderGeometry(1.3,1.3,len,6),M3(0xd9c7a1));sh.rotation.z=Math.PI/2;sh.position.x=len/2-10;p.add(sh);
  const bl=new THREE.Mesh(new THREE.BoxGeometry(20,1.6,8),M3(0xe8dcc0));bl.position.x=len-10;p.add(bl);cont.add(p);g.add(cont);piv.push(p);}return piv;}
function makeBoat3D(key){
  const c=CRAFTS[key],L=c.len,Wd=c.wid,g=new THREE.Group(),hull=new THREE.Group(),P={hull,people:[]};g.add(hull);
  if(key==='raft'){
    const pts=[],rx=Wd/2-7,rz=L/2-7;for(let i=0;i<48;i++){const a=i/48*Math.PI*2,ca=Math.cos(a),sa=Math.sin(a);pts.push(new THREE.Vector3(Math.sign(ca)*Math.pow(Math.abs(ca),.45)*rx,0,Math.sign(sa)*Math.pow(Math.abs(sa),.45)*rz));}
    const tube=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts,true),64,7.5,10,true),M3(0xf0b429,{roughness:.55}));tube.position.y=7;hull.add(tube);
    const fl=new THREE.Mesh(new THREE.BoxGeometry(Wd-14,3,L-14),M3(0x2f3d48));fl.position.y=2;hull.add(fl);
    for(const z of[-L*.2,L*.2]){const th=new THREE.Mesh(new THREE.CylinderGeometry(5,5,Wd-14,10),M3(0xd99a1a));th.rotation.z=Math.PI/2;th.position.set(0,7,z);hull.add(th);}
    const fr=new THREE.Mesh(new THREE.BoxGeometry(Wd-4,2.5,4),M3(0x9aa4ab,{metalness:.5,roughness:.4}));fr.position.set(0,15,2);hull.add(fr);
    const p1=person3(0xe74c3c);p1.position.set(0,6,8);hull.add(p1);const p2=person3(0x2ecc71);p2.position.set(-9,6,-L*.3);hull.add(p2);const p3=person3(0x3498db);p3.position.set(9,6,-L*.3);hull.add(p3);P.people=[p1,p2,p3];
    P.oars=oarPair(hull,Wd/2,15,2,72);
  }else if(key==='dory'){
    const sh=new THREE.Shape();sh.moveTo(0,L/2);sh.bezierCurveTo(Wd*.62,L*.3,Wd*.62,-L*.25,Wd*.24,-L/2);sh.lineTo(-Wd*.24,-L/2);sh.bezierCurveTo(-Wd*.62,-L*.25,-Wd*.62,L*.3,0,L/2);
    const hm=new THREE.Mesh(new THREE.ExtrudeGeometry(sh,{depth:13,bevelEnabled:true,bevelSize:1.5,bevelThickness:1.5,bevelSegments:2,curveSegments:16}),M3(0xf6f1e6,{roughness:.5}));hm.rotation.x=-Math.PI/2;hm.position.y=-1;hull.add(hm);
    const rm=new THREE.Mesh(new THREE.ExtrudeGeometry(sh,{depth:2.5,bevelEnabled:false,curveSegments:16}),M3(0xc0392b));rm.rotation.x=-Math.PI/2;rm.scale.set(1.05,1.03,1);rm.position.y=9;hull.add(rm);
    for(const z of[-L*.3,L*.32]){const h=new THREE.Mesh(new THREE.BoxGeometry(Wd*.45,4,L*.16),M3(0x2e86c1));h.position.set(0,14,z);hull.add(h);}
    const p1=person3(0xe67e22);p1.position.set(0,10,6);hull.add(p1);const p2=person3(0x16a085);p2.position.set(0,10,-L*.12);hull.add(p2);P.people=[p1,p2];
    P.oars=oarPair(hull,Wd*.45,17,4,74);
  }else if(key==='kayak'){
    const hm=new THREE.Mesh(new THREE.SphereGeometry(1,24,12),M3(0xe74c3c,{roughness:.4}));hm.scale.set(Wd/2+1,7,L/2);hm.position.y=3;hull.add(hm);
    const ck=new THREE.Mesh(new THREE.TorusGeometry(6,1.5,6,16),M3(0x1d1d1d));ck.rotation.x=Math.PI/2;ck.scale.set(1,1.5,1);ck.position.set(0,8.5,3);hull.add(ck);
    const pr=person3(0xf39c12);pr.position.set(0,5,3);hull.add(pr);
    const pad=new THREE.Group();pad.position.set(0,20,1);const sf=new THREE.Mesh(new THREE.CylinderGeometry(1.1,1.1,62,6),M3(0xdddddd));sf.rotation.z=Math.PI/2;pad.add(sf);
    for(const s of[-1,1]){const bl=new THREE.Mesh(new THREE.BoxGeometry(12,1.2,7),M3(0xf1c40f));bl.position.x=s*31;pad.add(bl);}
    hull.add(pad);P.pad=pad;
  }else{
    const tr=new THREE.Mesh(new THREE.TorusGeometry(Wd/2-7,7.5,10,28),M3(0x1c1c1c,{roughness:.6}));tr.rotation.x=Math.PI/2;tr.position.y=4;hull.add(tr);
    const pr=person3(0xe84393);pr.position.set(0,0,6);pr.rotation.x=-.5;hull.add(pr);
    for(const s of[-1,1]){const lg=new THREE.Mesh(new THREE.CylinderGeometry(2.6,2.6,24,6),M3(0x2c3e50));lg.rotation.x=Math.PI/2;lg.position.set(s*5,4,-12);hull.add(lg);}
  }
  const sw=new THREE.Group();for(let i=0;i<3;i++){const s=new THREE.Group();s.add(new THREE.Mesh(new THREE.SphereGeometry(7,10,8),M3(0xff8c1a)));const h=new THREE.Mesh(new THREE.SphereGeometry(4.5,10,8),M3(0xf1c27d));h.position.y=6;s.add(h);sw.add(s);}
  sw.visible=false;g.add(sw);P.sw=sw;g.userData=P;return g;
}
function prep3DBoat(){if(!R3)return;if(R3.boatKey!==G.ck){if(R3.boat)disposeGrp(R3.boat);R3.boat=makeBoat3D(G.ck);R3.boatKey=G.ck;R3.scene.add(R3.boat);}}

/* ---- chunk: one stretch of river in 3D ---- */
function buildChunk(ch){
  const W=G.W,R=G.river,zone=W.zoneAtMile&&W.zoneAtMile(W.mileAt(ch.y0)),pal=(zone||R).pal,grp=new THREE.Group(),rng=mulberry32(hashStr(R.id)+Math.round(ch.y0));
  ch.ox=W.cx(ch.y0);ch.oy=ch.y0;
  const y0=ch.y0-900,y1=ch.y1+700,TX=x=>x-ch.ox,TZ=y=>-(y-ch.oy),C=h=>new THREE.Color(h),tc=new THREE.Color();
  // water
  const rows=clamp(Math.ceil((y1-y0)/22),40,320),cols=48,N=rows*cols;
  const pos=new Float32Array(N*3),cl=new Float32Array(N*3),H0=new Float32Array(N),CA=new Float32Array(N),WX=new Float32Array(N),WY=new Float32Array(N);
  const wcol=G.lvlKey==='flood'?'#6e5236':pal.water,cW=C(wcol).offsetHSL(0,.04,.03),cD=C(wcol).offsetHSL(0,.03,-.09),cS=C(wcol).lerp(C(pal.sand),.3),cF=C(0xe6eeea),cA=C(wcol).lerp(C(0xdfe8e4),.45);
  const UV=new Float32Array(N*2),FC=new Float32Array(N*3);
  for(let r=0;r<rows;r++){const y=y0+(y1-y0)*r/(rows-1),c0=W.cx(y),hw=W.hw(y),ca=chopAmp(y),ri=W.rint(y);
    for(let c=0;c<cols;c++){const u=-1.12+2.24*c/(cols-1),x=c0+u*hw,sw=staticWater(x,y),au=Math.abs(u),i=r*cols+c;
      const nz=.5+.5*vnoise(x*.021,y*.013,x*.004-y*.006),nz2=.5+.5*vnoise(x*.06+3,y*.045,1.7),fo=clamp(sw[1]*(.45+.75*nz)+ri*.22*Math.max(0,nz2-.35)+.32*smooth((au-.9)/.12)*nz2,0,.92);
      WX[i]=x;WY[i]=y;H0[i]=sw[0];CA[i]=ca*(1-.7*smooth((au-.85)/.2));
      pos[i*3]=TX(x);pos[i*3+1]=sw[0];pos[i*3+2]=TZ(y);
      tc.copy(cD).lerp(cW,Math.min(1,au*.7+ri*.25)*(.7+.3*nz)).lerp(cS,smooth((au-.82)/.25)*.6).lerp(cA,Math.min(1,ri*.5*nz2)).lerp(cF,fo);cl[i*3]=tc.r;cl[i*3+1]=tc.g;cl[i*3+2]=tc.b;
      UV[i*2]=c/(cols-1)*3;UV[i*2+1]=(y-y0)/260;const fi=clamp(.1+ri*.3+fo*.2,0,.5);FC[i*3]=FC[i*3+1]=FC[i*3+2]=fi;}}
  const idx=new Uint16Array((rows-1)*(cols-1)*6);let k=0;
  for(let r=0;r<rows-1;r++)for(let c=0;c<cols-1;c++){const a=r*cols+c,b=a+1,d=a+cols,e=d+1;idx[k++]=a;idx[k++]=b;idx[k++]=d;idx[k++]=b;idx[k++]=e;idx[k++]=d;}
  const wg=new THREE.BufferGeometry();wg.setAttribute('position',new THREE.BufferAttribute(pos,3));wg.setAttribute('color',new THREE.BufferAttribute(cl,3));wg.setIndex(new THREE.BufferAttribute(idx,1));wg.computeVertexNormals();
  const NUV=new Float32Array(N*2);for(let i=0;i<N;i++){NUV[i*2]=WX[i]/150;NUV[i*2+1]=WY[i]/150;}wg.setAttribute('uv',new THREE.BufferAttribute(NUV,2));
  const wm=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.22,metalness:0,envMapIntensity:.42});if(R3.nrmTex){wm.normalMap=R3.nrmTex;wm.normalScale=new THREE.Vector2(.55,.55);}
  grp.add(new THREE.Mesh(wg,wm));ch.wmat=wm;
  const og=new THREE.BufferGeometry();og.setAttribute('position',wg.attributes.position);og.setAttribute('uv',new THREE.BufferAttribute(UV,2));og.setAttribute('color',new THREE.BufferAttribute(FC,3));og.setIndex(wg.index);
  const ov=new THREE.Mesh(og,new THREE.MeshBasicMaterial({map:R3.flowTex,vertexColors:true,transparent:true,opacity:.42,depthWrite:false,blending:THREE.AdditiveBlending}));ov.position.y=.8;grp.add(ov);
  ch.water={geo:wg,H0,CA,WX,WY,N,rows,cols,y0,dy:(y1-y0)/(rows-1)};
  // canyon walls
  const H=(zone||R).wallH||R.wallH,forest=!!R.trees,OFF=[-16,4,18,34,54,74,100,135,185,255,350,470,620],HF=[-10,2,5,7,12,28,.16,.3,.44,.58,.72,.86,1];
  const strata=[pal.wall2,pal.wall,pal.strata||pal.wall,pal.wall,pal.wall2,pal.strata||pal.wall2,pal.wall,pal.wall,pal.strata||pal.wall,pal.wall,pal.wall2];
  const profH=off=>{for(let i=1;i<OFF.length;i++)if(off<=OFF[i]){const a=i-1<6?HF[i-1]:HF[i-1]*H,b=i<6?HF[i]:HF[i]*H;return lerp(a,b,(off-OFF[i-1])/(OFF[i]-OFF[i-1]));}return H;};
  ch.profH=profH;
  const rapidsIn=W.rapids.filter(r=>r.y0>y0-300&&r.y0<y1+300);
  const notchK=(y,side)=>{let kk=0;for(const r of rapidsIn)if(r.fan===side)kk=Math.max(kk,1-smooth(Math.abs(y-(r.y0-60))/170));return kk;};
  const wallMat=new THREE.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:1,side:THREE.DoubleSide});
  for(const side of[-1,1]){
    const rw=Math.ceil((y1-y0)/30)+1,cw=OFF.length,P=new Float32Array(rw*cw*3),CL=new Float32Array(rw*cw*3);
    for(let r=0;r<rw;r++){const y=y0+(y1-y0)*r/(rw-1),c0=W.cx(y),hw=W.hw(y),kk=notchK(y,side),ri=Math.round(y/30);
      for(let c=0;c<cw;c++){const i=r*cw+c,n1=hash3(ri,c,side),n2=hash3(ri,c+11,side);
        const off=OFF[c]+(c>=5?(n1-.5)*26:0);
        let h=c<6?HF[c]:HF[c]*H*(1-.78*kk)+(n2-.5)*H*.07;
        if(c>=6&&!forest){const st=H*.08;h=Math.round(h/st)*st*.55+h*.45;}
        P[i*3]=TX(c0+side*(hw+off));P[i*3+1]=h;P[i*3+2]=TZ(y);
        if(c<=2)tc.set(pal.sand);else if(c<=5)tc.set(pal.sand).lerp(C(pal.rock),.55);
        else if(forest)tc.set(n1<.5?pal.veg:pal.wall2).lerp(C(pal.wall),n2*.4);
        else{const band=Math.floor(h/H*10+n2*1.3)%strata.length;tc.set(strata[Math.max(0,band)]);}
        tc.multiplyScalar(.85+n1*.3);CL[i*3]=tc.r;CL[i*3+1]=tc.g;CL[i*3+2]=tc.b;}}
    const id=[];for(let r=0;r<rw-1;r++)for(let c=0;c<cw-1;c++){const a=r*cw+c,b=a+1,d=a+cw,e=d+1;id.push(a,d,b,b,d,e);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(P,3));g.setAttribute('color',new THREE.BufferAttribute(CL,3));g.setIndex(id);g.computeVertexNormals();
    grp.add(new THREE.Mesh(g,wallMat));
  }
  // boulders, debris fans, bushes, trees
  const bl=[],veg=[],trees=[];
  for(let y=y0;y<y1;y+=16)for(const side of[-1,1]){const c0=W.cx(y),hw=W.hw(y);
    if(rng()<.55){const off=58+rng()*45;bl.push([c0+side*(hw+off),y,profH(off),5+rng()*15,pal.rock]);}
    if(rng()<(forest?.15:.35)){const off=8+rng()*36;veg.push([c0+side*(hw+off),y,profH(off)+2,5+rng()*8,pal.veg]);}
    if(forest&&rng()<.6){const off=60+rng()*420;trees.push([c0+side*(hw+off),y,profH(off)*(1-.78*notchK(y,side)),14+rng()*12,rng()]);}}
  for(const r of rapidsIn){for(let i=0;i<70;i++){const y=r.y0-60+(rng()-.5)*320,off=rng()*rng()*170-6,c0=W.cx(y),hw=W.hw(y);
    bl.push([c0+r.fan*(hw+off),y,Math.max(0,off*.1),(4+rng()*20)*(1-off/260),rng()<.5?pal.rock:pal.wall2]);}}
  const dummy=new THREE.Object3D();
  const inst=(geo,mat,list,fn)=>{if(!list.length)return null;const m=new THREE.InstancedMesh(geo,mat,list.length);m.frustumCulled=false;list.forEach((e,i)=>{fn(e,i);dummy.updateMatrix();m.setMatrixAt(i,dummy.matrix);m.setColorAt(i,tc);});m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;grp.add(m);return m;};
  inst(new THREE.IcosahedronGeometry(1,0),M3(0xffffff,{flatShading:true,roughness:1}),bl,(e,i)=>{dummy.position.set(TX(e[0]),e[2],TZ(e[1]));dummy.scale.set(e[3],e[3]*(.55+hash3(i,1,2)*.4),e[3]*(.8+hash3(i,3,4)*.4));dummy.rotation.set(hash3(i,5,6)*3,hash3(i,7,8)*3,0);tc.set(e[4]).multiplyScalar(.75+hash3(i,9,1)*.45);});
  inst(new THREE.IcosahedronGeometry(1,1),M3(0xffffff,{flatShading:true,roughness:1}),veg,(e,i)=>{dummy.position.set(TX(e[0]),e[2],TZ(e[1]));dummy.scale.set(e[3],e[3]*.7,e[3]);dummy.rotation.set(0,0,0);tc.set(e[4]).multiplyScalar(.7+hash3(i,2,9)*.5);});
  inst(new THREE.ConeGeometry(1,1,6),M3(0xffffff,{flatShading:true,roughness:1}),trees,(e,i)=>{const h=e[3]*4;dummy.position.set(TX(e[0]),e[2]+h/2,TZ(e[1]));dummy.scale.set(e[3],h,e[3]);dummy.rotation.set(0,0,0);tc.set(e[4]<.5?'#1f4d22':'#2f6b2f').multiplyScalar(.8+e[4]*.4);});
  // river rocks, landmarks, strainers
  const F=W.feats,rockMat=M3(0xffffff,{vertexColors:true,flatShading:true,roughness:.9});
  for(let i=lowerIdx(F,y0);i<F.length&&F[i].y<y1;i++){const f=F[i];
    if(f.t==='rock'){const g=new THREE.IcosahedronGeometry(1,2),pa=g.attributes.position,n=pa.count,cc=new Float32Array(n*3),sd=f.id*1.37,tall=f.tall?3.6:.7+hash3(f.id,1,1)*.35,base=-f.r*.25,rc=C(f.tall?'#1b1a1b':pal.rock);
      for(let j=0;j<n;j++){let x=pa.getX(j),y=pa.getY(j),z=pa.getZ(j);const nn=1+.24*vnoise(x*1.6+sd,y*1.6,z*1.6+sd*.3);x*=f.r*nn;y*=f.r*tall*nn;z*=f.r*nn;pa.setXYZ(j,x,y,z);
        const wy=y+base;tc.copy(rc).multiplyScalar(wy<5?.5:.8+.35*(.5+.5*Math.sin(x*.3+y*.5+sd)));cc[j*3]=tc.r;cc[j*3+1]=tc.g;cc[j*3+2]=tc.b;}
      g.setAttribute('color',new THREE.BufferAttribute(cc,3));g.computeVertexNormals();
      const m=new THREE.Mesh(g,rockMat);m.position.set(TX(f.x),base,TZ(f.y));m.rotation.y=hash3(f.id,2,2)*6;grp.add(m);
      if(f.name){const sp=textSprite(f.name,'#ffe0a0','rgba(0,0,0,.65)');sp.position.set(TX(f.x),f.r*tall+30,TZ(f.y));grp.add(sp);}}
    else if(f.t==='str'){const dx=f.x1-f.x0,dy=f.y1-f.y0,len=Math.hypot(dx,dy),lg=new THREE.Mesh(new THREE.CylinderGeometry(5,8,len*1.15,8),M3(0x5a3d24));
      lg.position.set(TX((f.x0+f.x1)/2),5,TZ((f.y0+f.y1)/2));lg.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(dx,0,-dy).normalize());grp.add(lg);
      for(let j=1;j<6;j++){const br=new THREE.Mesh(new THREE.CylinderGeometry(1.2,2,26,5),M3(0x6b4a2c));br.position.set(TX(lerp(f.x0,f.x1,j/6)),8,TZ(lerp(f.y0,f.y1,j/6)));br.rotation.set(hash3(f.id,j,1)*2-1,hash3(f.id,j,2)*3,hash3(f.id,j,3)*2-1);grp.add(br);}}
  }
  // rapid signs
  for(const r of rapidsIn){const sp=textSprite(r.n);const y=r.y0-260,side=-r.fan,off=30;sp.position.set(TX(W.cx(y)+side*(W.hw(y)+off)),profH(off)+34,TZ(y));grp.add(sp);
    const post=new THREE.Mesh(new THREE.CylinderGeometry(1.5,1.5,30,5),M3(0x6b4a2c));post.position.set(sp.position.x,profH(off)+12,sp.position.z);grp.add(post);}
  // history markers
  for(const p of W.pois){if(p.y<y0||p.y>y1)continue;const off=30,sp=textSprite(`${KIND_ICON[p.k]||''} ${p.n}`,'#f2e3c4','rgba(60,40,20,.85)');sp.position.set(TX(W.cx(p.y)+p.side*(W.hw(p.y)+off)),profH(off)+30,TZ(p.y));grp.add(sp);}
  // bridges
  for(const b of W.bridges){if(b.y<y0||b.y>y1)continue;const hw=W.hw(b.y),span=hw*2+260,hgt=b.high?Math.min(H*.75,520):70;
    for(const o of (b.double?[0,40]:[0])){const deck=new THREE.Mesh(new THREE.BoxGeometry(span,8,b.rail?14:22),M3(b.rail?0x3b3b3b:0x7d8790,{metalness:.4,roughness:.5}));deck.position.set(TX(W.cx(b.y)),hgt,TZ(b.y+o));grp.add(deck);
      if(b.high){const arch=new THREE.Mesh(new THREE.TorusGeometry(span*.38,4,6,40,Math.PI),M3(0x8a939c,{metalness:.5}));arch.position.set(TX(W.cx(b.y)),hgt-span*.38,TZ(b.y+o));grp.add(arch);
        for(let j=-4;j<=4;j++){const x=j*span*.38/4.5,ah=Math.sqrt(Math.max(0,(span*.38)**2-x*x)),cab=new THREE.Mesh(new THREE.CylinderGeometry(.8,.8,Math.max(1,span*.38-ah+6),4),M3(0x9aa3ab));cab.position.set(TX(W.cx(b.y))+x,hgt-(span*.38-ah)/2,TZ(b.y+o));grp.add(cab);}}
      else for(const s of[-1,1]){const pier=new THREE.Mesh(new THREE.BoxGeometry(14,hgt+20,14),M3(0x6b6b6b));pier.position.set(TX(W.cx(b.y)+s*(hw+30)),hgt/2-10,TZ(b.y+o));grp.add(pier);}}
    const sp=textSprite('🌉 '+b.n,'#cfe3e0','rgba(30,40,60,.85)');sp.position.set(TX(W.cx(b.y)),hgt+30,TZ(b.y));grp.add(sp);}
  // camps
  for(const cp of W.camps){if(cp.y<y0||cp.y>y1)continue;const x=W.cx(cp.y)+cp.side*(W.hw(cp.y)+30);
    const cols=cp.taken&&!cp.shared?[0xe74c3c,0x8e44ad,0x16a085]:[0x5fd38d];cols.forEach((cc,i)=>{const tn=new THREE.Mesh(new THREE.ConeGeometry(12,18,4),M3(cc));tn.position.set(TX(x+cp.side*i*14),profH(30)+9,TZ(cp.y+(i-1)*34));grp.add(tn);});
    const sp=textSprite('⛺ '+cp.n,'#5fd38d','rgba(10,50,30,.85)');sp.position.set(TX(x),profH(30)+44,TZ(cp.y));grp.add(sp);}
  // crowds (animated)
  const crowd=[];for(const cr of W.crowds){if(cr.y<y0||cr.y>y1)continue;for(const m of cr.mem){const yy=cr.y+m.dy,off=m.off,x=W.cx(yy)+cr.side*(W.hw(yy)+off);crowd.push({x:TX(x),y:profH(off)+(cr.onRock?0:0),z:TZ(yy),col:m.col,ph:m.ph});}}
  if(crowd.length){const m=new THREE.InstancedMesh(new THREE.CylinderGeometry(4,5,16,6),M3(0xffffff),crowd.length),hm=new THREE.InstancedMesh(new THREE.SphereGeometry(4,8,6),M3(0xf1c27d),crowd.length);
    m.frustumCulled=false;hm.frustumCulled=false;crowd.forEach((p,i)=>{tc.set(p.col);m.setColorAt(i,tc);});if(m.instanceColor)m.instanceColor.needsUpdate=true;grp.add(m);grp.add(hm);ch.crowd={m,hm,list:crowd};}
  // churning foam on holes, big waves and boils
  const fx=[],fy=[],fph=[],fa=[];
  for(let i=lowerIdx(F,y0);i<F.length&&F[i].y<y1;i++){const f=F[i];
    if(f.t==='hole'){const n=Math.round(18+f.rx*.5);for(let j=0;j<n;j++){const a=rng()*6.28,rr=Math.sqrt(rng());fx.push(f.x+Math.cos(a)*rr*f.rx);fy.push(f.y+Math.sin(a)*rr*f.ry);fph.push(rng()*6.28);fa.push(6+f.pow*10);}}
    else if(f.t==='wave'&&f.h>.45){const n=Math.round(f.w/7);for(let j=0;j<n;j++){fx.push(f.x+(rng()*2-1)*f.w*.85);fy.push(f.y+(rng()-.5)*8);fph.push(rng()*6.28);fa.push(4+f.h*8);}}
    else if(f.t==='boil'){for(let j=0;j<16;j++){const a=j/16*6.28;fx.push(f.x+Math.cos(a)*f.r*.9);fy.push(f.y+Math.sin(a)*f.r*.9);fph.push(a);fa.push(3);}}}
  const fn=Math.min(fx.length,1200);
  if(fn){const fg=new THREE.BufferGeometry();fg.setAttribute('position',new THREE.BufferAttribute(new Float32Array(fn*3),3));const fp=new THREE.Points(fg,new THREE.PointsMaterial({size:12,color:0xe8efec,map:R3.sprite,transparent:true,depthWrite:false,opacity:.75}));fp.frustumCulled=false;grp.add(fp);
    ch.foam={geo:fg,n:fn,x:fx,y:fy,ph:fph,a:fa,base:fx.slice(0,fn).map((_,j)=>staticWater(fx[j],fy[j])[0])};}
  for(const g of W.bars){if(g.y<y0||g.y>y1)continue;const hw=W.hw(g.y),x=W.cx(g.y)+g.side*(hw-hw*g.w*.6),bar=new THREE.Mesh(new THREE.CircleGeometry(1,20),M3(new THREE.Color(pal.sand).lerp(new THREE.Color('#8a8a80'),.35),{roughness:1}));bar.rotation.x=-Math.PI/2;bar.scale.set(hw*g.w*.6,g.len*.5,1);bar.position.set(TX(x),2.5,TZ(g.y));grp.add(bar);}
  build3DExtras(ch,grp,TX,TZ,profH,y0,y1,pal);
  if(typeof SCN!=='undefined')try{SCN.build3D(ch,grp,TX,TZ,profH,y0,y1,pal);}catch(e){console.warn('scenery 3D',e);}
  ch.sky=G.lvlKey==='flood'?'#9aa7b0':R.sky;
  return grp;
}

function pick3D(sx,sy){const ch=R3&&R3.chunk;if(!ch)return null;const ray=new THREE.Raycaster();ray.setFromCamera({x:(sx/VW)*2-1,y:-(sy/VH)*2+1},R3.camera);const pt=new THREE.Vector3();if(!ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),-2),pt))return null;return {x:pt.x+ch.ox,y:-pt.z+ch.oy};}
function build3DExtras(ch,grp,TX,TZ,profH,y0,y1,pal){
  const W=G.W,C=h=>new THREE.Color(h);
  const to=W.takeout;
  if(to&&to.y>y0&&to.y<y1){const s=to.side,hw=W.hw(to.y),bx=W.cx(to.y)+s*hw;
    const ramp=new THREE.Mesh(new THREE.BoxGeometry(150,4,130),M3(0x9a9a92,{roughness:.9}));ramp.position.set(TX(bx+s*10),3,TZ(to.y));ramp.rotation.z=s*.12;grp.add(ramp);
    for(let k=0;k<4;k++){const tx=bx+s*(150+(k%2)*40),ty=to.y-150+k*90,truck=new THREE.Group();const body=new THREE.Mesh(new THREE.BoxGeometry(30,20,48),M3([0xc0392b,0x2e86c1,0x7f8c8d,0x27ae60][k]));body.position.y=16;truck.add(body);
      const cab=new THREE.Mesh(new THREE.BoxGeometry(28,16,16),M3(0x222a30));cab.position.set(0,30,-12);truck.add(cab);for(const wx of[-14,14])for(const wz of[-16,16]){const wh=new THREE.Mesh(new THREE.CylinderGeometry(6,6,4,10),M3(0x111111));wh.rotation.z=Math.PI/2;wh.position.set(wx,6,wz);truck.add(wh);}
      const tr=new THREE.Mesh(new THREE.BoxGeometry(26,4,50),M3(0x555555));tr.position.set(0,8,54);truck.add(tr);const rf=new THREE.Mesh(new THREE.TorusGeometry(14,5,8,16),M3(0xf0b429));rf.rotation.x=Math.PI/2;rf.scale.set(1,1.6,1);rf.position.set(0,14,54);truck.add(rf);
      truck.position.set(TX(tx),profH(150),TZ(ty));grp.add(truck);}
    for(let k=0;k<6;k++){const pp=person3([0xe74c3c,0x2ecc71,0x3498db,0xf1c40f,0x9b59b6,0xe67e22][k]);pp.position.set(TX(bx+s*(60+k*12)),profH(60),TZ(to.y-40+k*16));grp.add(pp);}
    const sp=textSprite('🏁 TAKE-OUT: '+to.n,'#ffffff','rgba(29,94,58,.95)');sp.scale.set(170,32,1);sp.position.set(TX(bx+s*20),profH(20)+70,TZ(to.y));grp.add(sp);
    const yd=to.y+520;for(let k=-6;k<=6;k++){const bu=new THREE.Mesh(new THREE.SphereGeometry(5,8,6),M3(0xd62828));bu.position.set(TX(W.cx(yd)+k/6*W.hw(yd)),3,TZ(yd));grp.add(bu);}
    const dsp=textSprite('⚠ NO SAFE EXIT BELOW','#ffffff','rgba(160,20,20,.9)');dsp.position.set(TX(W.cx(yd)),60,TZ(yd));grp.add(dsp);}
  for(const st of W.stops){if(st.y<y0||st.y>y1)continue;const s=st.side,x=W.cx(st.y)+s*(W.hw(st.y)+40),h=profH(40),T=st.scene;
    const info=STOP_INFO[st.stop]||['📍','Stop'],sp=textSprite(`${info[0]} ${st.n}`,'#f2c98a','rgba(60,40,20,.9)');sp.position.set(TX(x),h+60,TZ(st.y));grp.add(sp);
    if(T==='cavern'){const cav=new THREE.Mesh(new THREE.SphereGeometry(110,24,12,0,Math.PI*2,0,Math.PI/2),M3(0x1a100c,{side:THREE.BackSide,roughness:1}));cav.scale.set(1,.9,.6);cav.position.set(TX(x+s*90),h,TZ(st.y));grp.add(cav);}
    else if(T==='spring'){const fall=new THREE.Mesh(new THREE.PlaneGeometry(14,160),new THREE.MeshBasicMaterial({color:0xeef8ff,transparent:true,opacity:.75,side:THREE.DoubleSide}));fall.position.set(TX(x+s*70),h+80,TZ(st.y));fall.rotation.y=Math.PI/2;grp.add(fall);ch.fall=(ch.fall||[]).concat([fall]);
      for(let k=0;k<26;k++){const m=new THREE.Mesh(new THREE.SphereGeometry(6+Math.random()*8,6,5),M3(0x3c8c3c,{flatShading:true}));m.position.set(TX(x+s*(60+Math.random()*20)),h+Math.random()*150,TZ(st.y+(Math.random()-.5)*60));grp.add(m);}}
    else if(T==='turquoise'){const pool=new THREE.Mesh(new THREE.CircleGeometry(60,24),M3(0x3cc8c8,{roughness:.15,metalness:.1}));pool.rotation.x=-Math.PI/2;pool.scale.set(1,2,1);pool.position.set(TX(W.cx(st.y)+s*(W.hw(st.y)-30)),2.2,TZ(st.y));grp.add(pool);}
    else if(['ruin','granary','stonehouse','cabin','lodge','ranch'].includes(T)){const hi=T==='granary'?profH(180):h;const n=T==='granary'?4:3;for(let k=0;k<n;k++){const bx2=x+s*(T==='granary'?160:50+k*8),bz=st.y-40+k*36;const box=new THREE.Mesh(new THREE.BoxGeometry(26,20+k*4,24),M3(T==='cabin'?0x7a5232:T==='lodge'?0x9a8a78:0xb59a76,{flatShading:true,roughness:1}));box.position.set(TX(bx2),hi+11,TZ(bz));grp.add(box);
      const door=new THREE.Mesh(new THREE.BoxGeometry(2,8,7),M3(0x140c08));door.position.set(TX(bx2-s*13.5),hi+10,TZ(bz));grp.add(door);if(T==='cabin'||T==='lodge'){const roof=new THREE.Mesh(new THREE.ConeGeometry(22,12,4),M3(0x4a3020));roof.rotation.y=Math.PI/4;roof.position.set(TX(bx2),hi+28,TZ(bz));grp.add(roof);}}}}
}
function fauna3D(k){const g=new THREE.Group(),dark=M3(0x15151a);
  if(k==='raven'||k==='condor'){const s=k==='condor'?2.2:1;const body=new THREE.Mesh(new THREE.ConeGeometry(2.5*s,12*s,6),dark);body.rotation.x=Math.PI/2;g.add(body);for(const sd of[-1,1]){const w=new THREE.Mesh(new THREE.BoxGeometry(16*s,.8,6*s),k==='condor'?M3(0x1b1b1b):dark);w.position.x=sd*8*s;g.add(w);if(k==='condor'){const p=new THREE.Mesh(new THREE.BoxGeometry(8*s,.9,2*s),M3(0xeeeeee));p.position.set(sd*8*s,-.2,1.5*s);g.add(p);}}g.userData.wings=[g.children[1],g.children[k==='condor'?3:2]];}
  else if(k==='heron'){const gm=M3(0x8a96a3);const b=new THREE.Mesh(new THREE.SphereGeometry(6,8,6),gm);b.scale.set(1,1,1.8);b.position.y=26;g.add(b);const n=new THREE.Mesh(new THREE.CylinderGeometry(1.2,1.2,14,5),gm);n.position.set(0,36,-6);n.rotation.x=.4;g.add(n);const bk=new THREE.Mesh(new THREE.ConeGeometry(1.2,8,5),M3(0xe0b030));bk.position.set(0,42,-14);bk.rotation.x=-Math.PI/2;g.add(bk);for(const sd of[-1,1]){const l=new THREE.Mesh(new THREE.CylinderGeometry(.6,.6,20,4),M3(0x333333));l.position.set(sd*2,10,0);g.add(l);}}
  else if(k==='bighorn'||k==='deer'){const bm=M3(k==='deer'?0x8a5a32:0x9a7a52);const b=new THREE.Mesh(new THREE.BoxGeometry(9,9,20),bm);b.position.y=14;g.add(b);const h=new THREE.Mesh(new THREE.BoxGeometry(6,6,8),bm);h.position.set(0,21,-12);g.add(h);for(const sx of[-3,3])for(const sz of[-7,7]){const l=new THREE.Mesh(new THREE.CylinderGeometry(1,1,10,4),bm);l.position.set(sx,5,sz);g.add(l);}
    if(k==='bighorn')for(const sd of[-1,1]){const hn=new THREE.Mesh(new THREE.TorusGeometry(3.5,1.2,5,10,Math.PI*1.4),M3(0xe0d2b0));hn.position.set(sd*3.5,24,-11);hn.rotation.y=Math.PI/2;g.add(hn);}}
  else if(k==='fish'){const f=new THREE.Mesh(new THREE.SphereGeometry(3,8,6),M3(0xd6e2e8,{metalness:.5,roughness:.3}));f.scale.set(1,1,3);g.add(f);}
  else{const m=new THREE.Mesh(new THREE.SphereGeometry(k==='beaver'?7:4,8,6),M3(k==='beaver'?0x5a3a22:0x6b5a4a));m.scale.set(1,.6,1.7);g.add(m);if(k==='ducks'){const hd=new THREE.Mesh(new THREE.SphereGeometry(2.4,6,5),M3(0xb5442a));hd.position.set(0,3,-5);g.add(hd);}}
  return g;}
function updFauna3D(TX,TZ,t){const used={};for(const f of G.fauna){const k=f.k,n=f.n||1;for(let j=0;j<n;j++){if(f.dive&&f.dive>.3)continue;used[k]=(used[k]||0)+1;const pool=R3.fauna[k]=R3.fauna[k]||[];if(pool.length<used[k]){const m=fauna3D(k);R3.scene.add(m);pool.push(m);}const m=pool[used[k]-1];m.visible=true;
    let x=f.x,y=f.y+j*16,h=heightAt(x,y,t);
    if(k==='raven'||k==='condor'){h+=f.alt;m.rotation.set(0,Math.atan2(f.vx,-(f.vy||0)),0);const fl=Math.sin(t*(k==='condor'?2:9)+f.ph)*.5;if(m.userData.wings){m.userData.wings[0].rotation.z=fl;m.userData.wings[1].rotation.z=-fl;}}
    else if(k==='heron'){if(f.state==='fly'){h+=60;m.rotation.y=f.side>0?-Math.PI/2:Math.PI/2;}else{h=heightAt(x,y,t)-6;m.rotation.y=f.side>0?Math.PI/2:-Math.PI/2;}}
    else if(k==='bighorn'||k==='deer'){x=G.W.cx(f.y)+f.side*(G.W.hw(f.y)+f.off);h=R3.chunk.profH?R3.chunk.profH(f.off):20;m.rotation.y=f.state==='run'?(f.side>0?-Math.PI/2:Math.PI/2):Math.PI;}
    else if(k==='fish'){const q=1-f.life/1.4;h+=q<.45?Math.sin(q/.45*Math.PI)*22:-20;m.rotation.x=(q-.22)*4;}
    else h+=1;
    m.position.set(TX(x),h,TZ(y));}}
  for(const k in R3.fauna)R3.fauna[k].forEach((m,i)=>{if(i>=(used[k]||0))m.visible=false;});}
function updFleet3D(TX,TZ,t){const tr=G.trip,fl=tr&&tr.fleet||[];
  fl.forEach((f,i)=>{if(!R3.fleet[i]){const m=makeBoat3D(f.craft);m.traverse(o=>{if(o.material&&o.material.color&&o.material.color.getHex()===0xf0b429)o.material.color.set(f.col);});R3.scene.add(m);R3.fleet[i]=m;}
    const m=R3.fleet[i];if(f.y===undefined||G.state!=='run'){m.visible=false;return;}m.visible=true;m.position.set(TX(f.x),heightAt(f.x,f.y,t)+1,TZ(f.y));m.rotation.set(0,-f.h,f.flip>0?Math.PI:Math.sin(t*2+i)*.06,'YXZ');});
  for(let i=fl.length;i<R3.fleet.length;i++)R3.fleet[i].visible=false;}

function updItems3D(TX,TZ,t){const W=G.W,b=G.b;R3.items=R3.items||[];let n=0;
  if(W.items)for(let i=lowerIdx(W.items,b.y-300);i<W.items.length&&W.items[i].y<b.y+2400&&n<40;i++){const it=W.items[i];if(it.got)continue;
    let m=R3.items[n];if(!m||m.userData.k!==it.k){if(m)R3.scene.remove(m);m=it.k==='gold'?new THREE.Mesh(new THREE.OctahedronGeometry(9),M3(0xffd84a,{emissive:0x806000,metalness:.6,roughness:.3})):new THREE.Mesh(new THREE.BoxGeometry(12,9,16),M3(0xff7a1a));m.userData.k=it.k;R3.scene.add(m);R3.items[n]=m;}
    m.visible=true;m.position.set(TX(it.x),heightAt(it.x,it.y,t)+(it.k==='gold'?16:5)+Math.sin(t*3+it.id)*3,TZ(it.y));m.rotation.y=t*(it.k==='gold'?2:.6)+it.id;n++;}
  for(let i=n;i<R3.items.length;i++)R3.items[i].visible=false;}

/* ---- enter / exit / update ---- */
function setBtnLabels(on){const P=G&&sel.ctrl==='pro'&&G.craft.pd;if(!(on&&P)){if(typeof setCtrlLabels==='function'&&!on){setCtrlLabels();return;}}const def=[['left','⟲','TURN'],['right','⟳','TURN'],['push','▲','PUSH'],['pull','▼','PULL']];
  def.forEach(([k,ic,lb],i)=>{const b=document.querySelector(`.cbtn[data-k="${k}"]`);if(!b)return;b.innerHTML=on&&P?`${['⟵','⟶','⇈','⇊'][i]}<small>${P.btn[i]}</small>`:`${ic}<small>${lb}</small>`;});}
function flash(){const f=$('flash');f.style.transition='none';f.style.opacity=.85;requestAnimationFrame(()=>{f.style.transition='opacity .6s';f.style.opacity=0;});}
function enter3D(ch){
  R3.chunk=ch;R3.scene.add(ch.grp);R3.camInit=false;
  R3.scene.background=new THREE.Color(ch.sky);R3.scene.fog=new THREE.Fog(new THREE.Color(ch.sky).lerp(new THREE.Color(0x9a8f80),.25),1100,4200);
  G.mode3d=true;G.slowT=.9;$('g3').style.display='block';$('tag3d').style.display='block';flash();AU.splash(.9);
  const P=sel.ctrl==='pro'?G.craft.pd:null,el=$('p3d');
  el.innerHTML=`<b>3D · ${P?P.name:'ROW!'}</b><span>${esc(ch.title)}<br>${P?(isTouch()?P.help:P.keys):'Same controls as 2D. Drag or tap to move. ⚡ boost through holes!'}</span>`;el.style.display='block';clearTimeout(el._t);el._t=setTimeout(()=>el.style.display='none',4200);
  setBtnLabels(true);$('stroke').style.display=P?'block':'none';G.rhythm=0;G.strokeReady=0;hideFact();
}
function exit3D(){
  if(!R3||!G)return;const ch=R3.chunk;G.mode3d=false;if(ch){ch.done=true;disposeGrp(ch.grp);ch.grp=null;}R3.chunk=null;
  R3.swim.visible=false;R3.logs.forEach(l=>l.visible=false);R3.wpRing.visible=false;for(const k in R3.fauna)R3.fauna[k].forEach(m=>m.visible=false);R3.fleet.forEach(m=>m.visible=false);(R3.items||[]).forEach(m=>m.visible=false);
  $('g3').style.display='none';$('tag3d').style.display='none';$('p3d').style.display='none';$('stroke').style.display='none';setBtnLabels(false);
  if(G.state!=='done'&&G.state!=='camp')flash();
}
function check3D(){
  if(!G.use3d||!R3||G.state!=='run')return;const b=G.b;
  if(G.mode3d){if(b.y>=R3.chunk.y1||b.y<R3.chunk.y0-1200)exit3D();return;}
  for(const ch of G.W.chunks){if(ch.done)continue;
    if(b.y>ch.y1){ch.done=true;if(ch.grp){disposeGrp(ch.grp);ch.grp=null;}continue;}
    if(!ch.grp&&b.y>ch.y0-1500){try{ch.grp=buildChunk(ch);}catch(e){console.warn('3D build failed',e);ch.done=true;G.use3d=false;}}
    if(ch.grp&&b.y>=ch.y0)enter3D(ch);
    break;}
}
function render3D(dt){
  const b=G.b,t=G.t,ch=R3.chunk,W=G.W,c=G.craft,P=R3.boat.userData;if(!ch)return;
  const TX=x=>x-ch.ox,TZ=y=>-(y-ch.oy);
  const w=ch.water,pa=w.geo.attributes.position.array,na=w.geo.attributes.normal.array,cols=w.cols,rows=w.rows;
  const r0=clamp(Math.floor((b.y-450-w.y0)/w.dy),1,rows-2),r1=clamp(Math.ceil((b.y+2700-w.y0)/w.dy),1,rows-2);
  for(let r=r0-1;r<=r1+1;r++)for(let c2=0;c2<cols;c2++){const i=r*cols+c2;pa[i*3+1]=w.H0[i]+w.CA[i]*.6*chop(w.WX[i],w.WY[i],t);}
  for(let r=r0;r<=r1;r++)for(let c2=0;c2<cols;c2++){const i=r*cols+c2,il=c2>0?i-1:i,ir=c2<cols-1?i+1:i,iu=i+cols,id=i-cols;
    const ax=pa[ir*3]-pa[il*3],ay=pa[ir*3+1]-pa[il*3+1],az=pa[ir*3+2]-pa[il*3+2],bx=pa[iu*3]-pa[id*3],by=pa[iu*3+1]-pa[id*3+1],bz=pa[iu*3+2]-pa[id*3+2];
    let nx=ay*bz-az*by,ny=az*bx-ax*bz,nz=ax*by-ay*bx;if(ny<0){nx=-nx;ny=-ny;nz=-nz;}const l=Math.hypot(nx,ny,nz)||1;na[i*3]=nx/l;na[i*3+1]=ny/l;na[i*3+2]=nz/l;}
  w.geo.attributes.position.needsUpdate=true;w.geo.attributes.normal.needsUpdate=true;
  if(ch.foam){const f=ch.foam,fa=f.geo.attributes.position.array;
    for(let j=0;j<f.n;j++){const x=f.x[j]+Math.sin(t*3+f.ph[j])*6,y=f.y[j]+Math.cos(t*2.3+f.ph[j])*5;fa[j*3]=TX(x);fa[j*3+1]=f.base[j]+3+f.a[j]*Math.abs(Math.sin(t*4.5+f.ph[j]));fa[j*3+2]=TZ(y);}
    f.geo.attributes.position.needsUpdate=true;}
  if(ch.crowd){const d=new THREE.Object3D(),amp=G.cheer>0?(G.cheerBig?10:7):1.5,sp=G.cheer>0?10:2.5;
    ch.crowd.list.forEach((p,i)=>{const j=Math.abs(Math.sin(t*sp+p.ph))*amp;d.position.set(p.x,p.y+8+j,p.z);d.scale.set(1,1,1);d.updateMatrix();ch.crowd.m.setMatrixAt(i,d.matrix);d.position.y=p.y+20+j;d.updateMatrix();ch.crowd.hm.setMatrixAt(i,d.matrix);});
    ch.crowd.m.instanceMatrix.needsUpdate=true;ch.crowd.hm.instanceMatrix.needsUpdate=true;}
  R3.flowTex.offset.y-=dt*G.river.speed*G.lvl.speed*(1+W.rint(b.y)*.9)/260;if(R3.nrmTex){R3.nrmTex.offset.y-=dt*G.river.speed*G.lvl.speed/150*.6;R3.nrmTex.offset.x=Math.sin(t*.2)*.03;}
  if(ch.fall)for(const f of ch.fall)f.material.opacity=.6+.15*Math.sin(t*9);
  updFauna3D(TX,TZ,t);updFleet3D(TX,TZ,t);if(typeof SCN!=='undefined')SCN.render3D(TX,TZ,t);
  if(G.wp){R3.wpRing.visible=true;R3.wpRing.position.set(TX(G.wp.x),heightAt(G.wp.x,G.wp.y,t)+3,TZ(G.wp.y));R3.wpRing.scale.setScalar(1+.15*Math.sin(t*6));R3.wpRing.material.color.set(G.wpBack?0xffb347:0x5fd38d);}else R3.wpRing.visible=false;
  const sp=R3.pg.attributes.position.array;let n=0;
  for(const p of G.parts){if(n>=R3.MAXP)break;sp[n*3]=TX(p.x);sp[n*3+1]=(p.base||0)+4+p.z;sp[n*3+2]=TZ(p.y);n++;}
  R3.pg.setDrawRange(0,n);R3.pg.attributes.position.needsUpdate=true;
  if(G.swim){R3.swim.visible=true;R3.swim.position.set(TX(G.swim.x),heightAt(G.swim.x,G.swim.y,t)+2,TZ(G.swim.y));R3.swim.children[2].scale.setScalar(1+.15*Math.sin(t*6));}else R3.swim.visible=false;
  R3.logs.forEach((l,i)=>{const d=G.debris[i];if(!d){l.visible=false;return;}l.visible=true;l.scale.set(1,d.len,1);l.position.set(TX(d.x),heightAt(d.x,d.y,t)+3,TZ(d.y));l.rotation.set(0,0,0);l.rotateY(-d.a);l.rotateZ(Math.PI/2);});
  // boat on the water
  const sh=Math.sin(b.h),chh=Math.cos(b.h),hl2=c.len*.45,hw2=c.wid*.5;
  const hb=heightAt(b.x+sh*hl2,b.y+chh*hl2,t),hs=heightAt(b.x-sh*hl2,b.y-chh*hl2,t),hr=heightAt(b.x+chh*hw2,b.y-sh*hw2,t),hlf=heightAt(b.x-chh*hw2,b.y+sh*hw2,t);
  const bm=R3.boat,flipped=G.state==='flip';
  const pitch=clamp(Math.atan2(hb-hs,c.len*.9),-.5,.5),roll=clamp(Math.atan2(hr-hlf,c.wid),-.45,.45)+clamp(-b.av*.08,-.15,.15);
  bm.position.set(TX(b.x),(hb+hs+hr+hlf)/4+(flipped?-4:1)+b.bounce*14,TZ(b.y));
  bm.rotation.set(pitch,-b.h,flipped?Math.PI:roll,'YXZ');
  P.people.forEach((p,i)=>p.visible=!(G.swim&&i===P.people.length-1));
  P.sw.visible=flipped;if(flipped){P.sw.rotation.set(0,0,-Math.PI);P.sw.children.forEach((s,i)=>{const a=t*1.3+i*2.1;s.position.set(Math.cos(a)*(c.len*.5+14),-6+Math.sin(t*3+i)*2,Math.sin(a*1.2)*(c.len*.45+12));s.visible=i<c.crew;});}
  const anim=a=>{const p=a.t;if(p>=1)return[0,0];const ph=a.back?1-p:p;return p<.55?[lerp(.65,-.65,ph/.55),-.14]:[lerp(-.65,.65,(p-.55)/.45),.18];};
  if(P.oars){if(c.pd&&G.mode3d&&sel.ctrl==='pro'){[G.sa.L,G.sa.R].forEach((a,i)=>{const [sy,sz]=anim(a),s=i===0?-1:1;P.oars[i].rotation.y=s*sy;P.oars[i].rotation.z=sz;});}
    else{[G.oa.L,G.oa.R].forEach((oa,i)=>{const pz=oarPose(oa),s=i===0?-1:1,o=P.oars[i];o.rotation.y=s*-pz.a;o.rotation.z=pz.wet?-.16:(pz.idle?.05:.22);if(o.children[1])o.children[1].rotation.x=pz.wet?0:1.3;});}
    if(G.oarLost)P.oars[1].visible=false;else P.oars[1].visible=true;}
  if(P.pad&&sel.ctrl!=='pro'){const kz=kayakPose(G.kp,t);P.pad.rotation.set(0,kz.th*.9,kz.side*-.45);}
  else if(P.pad){const aL=G.sa.L,aR=G.sa.R;let z=0,y=0;if(aL.t<1){z=.55*Math.sin(aL.t*Math.PI);y=lerp(-.6,.6,aL.t)*(aL.back?-1:1);}else if(aR.t<1){z=-.55*Math.sin(aR.t*Math.PI);y=lerp(.6,-.6,aR.t)*(aR.back?-1:1);}else z=Math.sin(t*1.5)*.08;P.pad.rotation.set(0,y,z);}
  // chase camera, looking downstream
  const fwd=R3.v1.set(W.dcx(b.y),0,-1).normalize(),hd=R3.v2.set(sh,0,-chh);fwd.lerp(hd,.15).normalize();
  const des=R3.v3.copy(bm.position).addScaledVector(fwd,-235);des.y=bm.position.y+140;
  const look=R3.v4.copy(bm.position).addScaledVector(fwd,230);look.y=bm.position.y+4;
  const kk=1-Math.exp(-dt*3.5);
  if(!R3.camInit){R3.camPos.copy(des);R3.camLook.copy(look);R3.camInit=true;}else{R3.camPos.lerp(des,kk);R3.camLook.lerp(look,kk);}
  R3.camera.position.copy(R3.camPos);R3.camera.position.x+=(Math.random()-.5)*G.shake*.8;R3.camera.position.y+=(Math.random()-.5)*G.shake*.8;
  R3.camera.lookAt(R3.camLook);
  const cdx=R3.camLook.x-R3.camPos.x,cdz=R3.camLook.z-R3.camPos.z;G.camera.camH=Math.atan2(cdx,-cdz);
  const pr=bm.position.clone().project(R3.camera);G.bsx=(pr.x*.5+.5)*VW;G.bsy=(-pr.y*.5+.5)*VH;
  R3.sun.position.set(R3.camPos.x-300,800,R3.camPos.z+250);
  R3.renderer.render(R3.scene,R3.camera);
  updItems3D(TX,TZ,t);
  if(c.pd&&sel.ctrl==='pro'){const left=Math.max(0,G.strokeReady-G.t),tot=G.lastSide===0?(c.pd.bothCd||c.pd.cd):c.pd.cd;$('strokeFill').style.width=(100*(1-left/tot))+'%';$('strokeFill').style.background=left>0?'#ffb347':'#5fd38d';
    $('strokeTxt').textContent=(left>0?'RECOVER':'STROKE READY')+(G.rhythm>1?` · RHYTHM ×${G.rhythm}`:'')+(backMod()?' · BACK':'');}
}
