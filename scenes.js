'use strict';
/* =====================================================================
   RIVER RUN — PAINTED SCENES
   Animated, painterly scenes for history pages, stops, take-outs and
   dangers. Layers drift at different speeds (parallax) and the camera
   slowly pans and zooms, so each painting feels 3D.
   ===================================================================== */
const SCENE={
  cur:null,cache:{},
  hex(h){const v=parseInt(h.slice(1),16);return [(v>>16)&255,(v>>8)&255,v&255];},
  rgb(c,k,a){return `rgba(${Math.min(255,c[0]*k)|0},${Math.min(255,c[1]*k)|0},${Math.min(255,c[2]*k)|0},${a===undefined?1:a})`;},
  mix(a,b,t){return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];},
  /* ---------- build static layers once ---------- */
  build(spec,w,h){
    const pal=spec.pal||RIVERS[0].pal,rng=mulberry32(hashStr((spec.type||'canyon')+(spec.seed||''))),H=this.hex.bind(this);
    const W2=Math.round(w*1.2),H2=Math.round(h*1.2),mk=()=>{const c=document.createElement('canvas');c.width=W2;c.height=H2;return c;};
    const L={far:mk(),mid:mk(),near:mk(),W2,H2,rng,pal,type:spec.type||'canyon'};
    const wall=H(pal.wall),wall2=H(pal.wall2),strata=H(pal.strata||pal.wall),sand=H(pal.sand),veg=H(pal.veg),rock=H(pal.rock),water=H(spec.water||pal.water);
    const forest=!!spec.forest,river=spec.type!=='meander'&&spec.type!=='petro';
    const cliff=(c,side,top,base,col,col2,var_)=>{
      c.beginPath();const x0=side<0?0:W2,dir=side<0?1:-1,edge=W2*(side<0?base:1-base);c.moveTo(x0,H2);c.lineTo(x0,H2*top);
      let x=x0,y=H2*top;const steps=16;for(let i=1;i<=steps;i++){x=x0+dir*(Math.abs(edge-x0)*i/steps);y=H2*top+(rng()-.3)*H2*.05+i*(H2*(.62-top))/steps*(i>steps*.7?1.6:.25);c.lineTo(x,Math.min(y,H2*.7));}
      c.lineTo(edge,H2*.72);c.lineTo(edge+dir*-20,H2);c.closePath();
      const g=c.createLinearGradient(0,H2*top,0,H2*.75);g.addColorStop(0,this.rgb(col,1.1));g.addColorStop(1,this.rgb(col2,.85));c.fillStyle=g;c.fill();
      c.save();c.clip();
      for(let i=0;i<9;i++){c.fillStyle=this.rgb(i%2?strata:col2,1,.22);c.fillRect(0,H2*(top+.04*i+.02),W2,H2*(.012+rng()*.02));}
      for(let i=0;i<40*var_;i++){const sx=rng()*W2;c.fillStyle=this.rgb([30,25,25],1,.08+rng()*.12);c.fillRect(sx,H2*top,2+rng()*6,H2*(.1+rng()*.4));}
      for(let i=0;i<220;i++){c.strokeStyle=this.rgb(rng()<.5?col:strata,.8+rng()*.5,.18);c.lineWidth=2+rng()*4;const bx=rng()*W2,by=H2*(top+rng()*(.7-top));c.beginPath();c.moveTo(bx,by);c.lineTo(bx+(rng()-.5)*40,by+(rng()-.5)*12);c.stroke();}
      c.restore();
    };
    // FAR: sky-side distant walls
    const f=L.far.getContext('2d');
    if(spec.type==='meander'){
      f.fillStyle=this.rgb(wall,1);f.fillRect(0,0,W2,H2);
      for(let i=0;i<500;i++){f.fillStyle=this.rgb(rng()<.5?wall2:strata,1,.25);f.fillRect(rng()*W2,rng()*H2,8+rng()*30,3+rng()*8);}
      f.strokeStyle=this.rgb(water,1);f.lineWidth=H2*.05;f.lineCap='round';f.beginPath();
      for(let i=0;i<=60;i++){const t=i/60,x=W2*(.1+.8*t),y=H2*(.5+.32*Math.sin(t*Math.PI*4));i?f.lineTo(x,y):f.moveTo(x,y);}f.stroke();
      f.strokeStyle=this.rgb(wall2,.7,.6);f.lineWidth=H2*.09;f.globalCompositeOperation='destination-over';f.stroke();f.globalCompositeOperation='source-over';
    }else{
      f.fillStyle=this.rgb(wall2,1.25);for(let k=0;k<2;k++){f.beginPath();f.moveTo(0,H2*.5);let y=H2*(.28+k*.06);for(let x=0;x<=W2;x+=W2/24){y+= (rng()-.5)*H2*.04;f.lineTo(x,Math.max(H2*.18,Math.min(H2*.48,y)));}f.lineTo(W2,H2*.6);f.lineTo(0,H2*.6);f.closePath();f.fillStyle=this.rgb(k?wall:wall2,1.25-k*.1,.9);f.fill();}
    }
    // MID: side cliffs
    const m=L.mid.getContext('2d');
    if(spec.type!=='meander'){
      if(forest){for(const side of[-1,1]){m.fillStyle=this.rgb(veg,.7);m.beginPath();m.moveTo(side<0?0:W2,H2);for(let i=0;i<=20;i++){const x=side<0?W2*.45*i/20:W2-W2*.45*i/20;m.lineTo(x,H2*(.2+.45*(i/20))+(rng()-.5)*20);}m.lineTo(side<0?W2*.45:W2*.55,H2);m.fill();
        for(let i=0;i<160;i++){const x=side<0?rng()*W2*.42:W2-rng()*W2*.42,y=H2*(.25+rng()*.45);m.fillStyle=this.rgb(veg,.55+rng()*.6,.9);m.beginPath();m.arc(x,y,10+rng()*22,0,7);m.fill();}}}
      else{cliff(m,-1,.12+rng()*.08,.36,wall,wall2,1);cliff(m,1,.14+rng()*.08,.36,wall,wall2,1);}
    }
    // NEAR: river, beach and vegetation
    const n=L.near.getContext('2d');
    if(river){
      const g=n.createLinearGradient(0,H2*.66,0,H2);g.addColorStop(0,this.rgb(water,.85));g.addColorStop(1,this.rgb(water,1.25));n.fillStyle=g;n.fillRect(0,H2*.66,W2,H2*.34);
      n.fillStyle=this.rgb(sand,1);n.beginPath();n.moveTo(0,H2);n.lineTo(0,H2*.86);n.quadraticCurveTo(W2*.3,H2*.8,W2*.55,H2*.9);n.lineTo(W2*.6,H2);n.fill();
      for(let i=0;i<70;i++){n.fillStyle=this.rgb(sand,.75+rng()*.4,.35);n.fillRect(rng()*W2*.55,H2*(.86+rng()*.14),4+rng()*12,2);}
      for(let i=0;i<8;i++){const x=rng()*W2*.5,y=H2*(.84+rng()*.04);this.tree(n,x,y,rng,veg,forest?1.4:rng()<.3?1.6:.7);}
    }
    this.extras(L,spec,{wall,wall2,strata,sand,veg,rock,water});
    return L;
  },
  tree(c,x,y,rng,veg,s){c.strokeStyle='#4a3524';c.lineWidth=3*s;c.beginPath();c.moveTo(x,y);c.lineTo(x+3*s,y-26*s);c.stroke();
    for(let i=0;i<7;i++){c.fillStyle=this.rgb(veg,.7+rng()*.6,.85);c.beginPath();c.arc(x+(rng()-.5)*30*s,y-28*s-(rng())*24*s,(8+rng()*10)*s,0,7);c.fill();}},
  person(c,x,y,s,col){c.fillStyle=col||'#e67e22';c.fillRect(x-3*s,y-14*s,6*s,10*s);c.fillStyle='#f1c27d';c.beginPath();c.arc(x,y-17*s,3.2*s,0,7);c.fill();c.strokeStyle='#2c3e50';c.lineWidth=1.6*s;c.beginPath();c.moveTo(x-2*s,y-4*s);c.lineTo(x-3*s,y+3*s);c.moveTo(x+2*s,y-4*s);c.lineTo(x+3*s,y+3*s);c.stroke();},
  raft(c,x,y,s,col){c.fillStyle=col||'#f0b429';c.beginPath();c.ellipse(x,y,34*s,11*s,0,0,7);c.fill();c.fillStyle='#2f3d48';c.beginPath();c.ellipse(x,y-2*s,24*s,6*s,0,0,7);c.fill();},
  /* static, type-specific elements */
  extras(L,spec,C){
    const rng=L.rng,W2=L.W2,H2=L.H2,m=L.mid.getContext('2d'),n=L.near.getContext('2d'),R=this.rgb.bind(this),t=spec.type;
    if(t==='falls'){m.fillStyle=R(C.wall2,1);m.fillRect(W2*.1,H2*.28,W2*.8,H2*.4);m.fillStyle='rgba(235,245,250,.92)';for(let i=0;i<40;i++){const x=W2*(.12+i*.019);m.fillRect(x,H2*.28,W2*.014,H2*(.36+rng()*.04));}
      m.fillStyle='rgba(60,110,40,.95)';m.fillRect(W2*.1,H2*.24,W2*.8,H2*.045);}
    if(t==='savanna'){const f=L.far.getContext('2d');f.fillStyle='#c8b070';f.fillRect(0,H2*.5,W2,H2*.2);for(let i=0;i<9;i++){const x=rng()*W2,y=H2*(.5+rng()*.12),s=.7+rng()*.8;n.strokeStyle='#4a3524';n.lineWidth=3*s;n.beginPath();n.moveTo(x,y+30*s);n.lineTo(x,y);n.stroke();n.fillStyle='rgba(80,110,40,.95)';n.beginPath();n.ellipse(x,y,34*s,9*s,0,0,7);n.fill();}
      for(let k=0;k<3;k++){const ex=W2*(.55+k*.08),ey=H2*.64;n.fillStyle='#7f7b78';n.beginPath();n.ellipse(ex,ey,26,18,0,0,7);n.fill();n.fillRect(ex-20,ey,8,18);n.fillRect(ex+12,ey,8,18);n.beginPath();n.ellipse(ex-26,ey-4,10,12,0,0,7);n.fill();n.fillRect(ex-36,ey,5,20);}}
    if(t==='glacier'){const f=L.far.getContext('2d');f.fillStyle='rgba(240,248,255,.95)';f.beginPath();f.moveTo(0,H2*.45);for(let x=0;x<=W2;x+=W2/20)f.lineTo(x,H2*(.22+.08*Math.sin(x/W2*9)+rng()*.03));f.lineTo(W2,H2*.5);f.closePath();f.fill();
      f.fillStyle='rgba(150,190,220,.6)';for(let i=0;i<20;i++)f.fillRect(rng()*W2,H2*(.3+rng()*.15),W2*.04,2);m.fillStyle='rgba(235,245,255,.9)';m.beginPath();m.moveTo(W2*.35,H2*.66);m.lineTo(W2*.45,H2*.4);m.lineTo(W2*.65,H2*.42);m.lineTo(W2*.75,H2*.66);m.fill();}
    if(t==='temple'){const tx=W2*.62,ty=H2*.64;n.fillStyle='#e8e0d0';n.fillRect(tx,ty-H2*.12,W2*.1,H2*.12);n.fillStyle='#c0392b';n.beginPath();n.moveTo(tx-W2*.01,ty-H2*.12);n.lineTo(tx+W2*.05,ty-H2*.24);n.lineTo(tx+W2*.11,ty-H2*.12);n.fill();
      n.fillStyle='#e8c83a';n.fillRect(tx+W2*.047,ty-H2*.27,W2*.006,H2*.04);for(let k=0;k<6;k++){n.fillStyle=['#e74c3c','#f1c40f','#2ecc71','#3498db','#ffffff','#e67e22'][k];n.fillRect(tx+W2*(.12+k*.02),ty-H2*.1+(k%2)*6,W2*.016,H2*.02);}
      n.fillStyle='#d8d0c0';for(let k=0;k<5;k++)n.fillRect(tx-W2*.02-k*W2*.01,ty+k*H2*.012,W2*.14+k*W2*.02,H2*.012);}
    if(t==='cavern'){m.fillStyle='rgba(20,12,10,.85)';m.beginPath();m.ellipse(W2*.3,H2*.66,W2*.26,H2*.3,0,Math.PI,0);m.fill();m.fillStyle=R(C.sand,.9);m.beginPath();m.ellipse(W2*.3,H2*.66,W2*.24,H2*.035,0,0,Math.PI*2);m.fill();for(let i=0;i<5;i++)this.person(m,W2*(.18+i*.05),H2*.665,1.1,['#e74c3c','#3498db','#f1c40f','#2ecc71','#e67e22'][i]);}
    if(t==='ruin'||t==='granary'||t==='stonehouse'){const ax=W2*(t==='granary'?.22:.25),ay=H2*(t==='granary'?.3:.5);m.fillStyle='rgba(25,15,10,.55)';m.beginPath();m.ellipse(ax+W2*.08,ay,W2*.14,H2*.08,0,Math.PI,0);m.fill();
      for(let i=0;i<(t==='granary'?4:6);i++){const bx=ax+i*W2*.035,by=ay-(i%2)*H2*.03;m.fillStyle=R(C.sand,.85+rng()*.2);m.fillRect(bx,by-H2*.05,W2*.032,H2*.05);for(let k=0;k<6;k++){m.fillStyle=R(C.wall2,.9,.35);m.fillRect(bx+rng()*W2*.03,by-H2*.05+k*H2*.008,W2*.01,2);}m.fillStyle='#1a120c';m.fillRect(bx+W2*.011,by-H2*.03,W2*.01,H2*.016);}
      if(t==='ruin'){m.strokeStyle=R(C.sand,.7);m.lineWidth=3;m.beginPath();m.ellipse(ax+W2*.12,ay+H2*.02,W2*.03,H2*.01,0,0,7);m.stroke();m.strokeStyle='#5a3d24';m.beginPath();m.moveTo(ax+W2*.2,ay+H2*.02);m.lineTo(ax+W2*.21,ay-H2*.06);m.moveTo(ax+W2*.21,ay+H2*.02);m.lineTo(ax+W2*.22,ay-H2*.06);for(let k=0;k<5;k++){m.moveTo(ax+W2*.2,ay+H2*.01-k*H2*.016);m.lineTo(ax+W2*.215,ay+H2*.01-k*H2*.016);}m.stroke();}
      if(t==='stonehouse'){n.fillStyle='#8a7a68';n.fillRect(W2*.12,H2*.74,W2*.16,H2*.1);for(let k=0;k<60;k++){n.strokeStyle='rgba(60,50,40,.5)';n.strokeRect(W2*.12+rng()*W2*.15,H2*.74+rng()*H2*.09,10,6);}n.fillStyle='#5a3d24';n.beginPath();n.moveTo(W2*.11,H2*.745);n.lineTo(W2*.2,H2*.69);n.lineTo(W2*.29,H2*.745);n.fill();n.fillStyle='#2a1a10';n.fillRect(W2*.18,H2*.78,W2*.025,H2*.06);}}
    if(t==='cabin'||t==='ranch'||t==='lodge'){const cx=W2*.18,cy=H2*.8;n.fillStyle=t==='lodge'?'#9a8a78':'#7a5232';n.fillRect(cx,cy-H2*.08,W2*.14,H2*.08);if(t!=='lodge')for(let k=0;k<6;k++){n.fillStyle='rgba(40,25,15,.5)';n.fillRect(cx,cy-H2*.08+k*H2*.013,W2*.14,2);}
      n.fillStyle='#4a3020';n.beginPath();n.moveTo(cx-10,cy-H2*.078);n.lineTo(cx+W2*.07,cy-H2*.13);n.lineTo(cx+W2*.15,cy-H2*.078);n.fill();n.fillStyle='#ffd27a';n.fillRect(cx+W2*.03,cy-H2*.055,W2*.02,H2*.02);n.fillStyle='#2a1a10';n.fillRect(cx+W2*.08,cy-H2*.05,W2*.02,H2*.05);
      n.fillStyle='#6a6a6a';n.fillRect(cx+W2*.11,cy-H2*.15,W2*.012,H2*.05);
      if(t==='ranch'){n.strokeStyle='#6b4a2c';n.lineWidth=3;for(let k=0;k<12;k++){n.beginPath();n.moveTo(W2*(.34+k*.03),H2*.86);n.lineTo(W2*(.34+k*.03),H2*.82);n.stroke();}n.beginPath();n.moveTo(W2*.34,H2*.83);n.lineTo(W2*.67,H2*.83);n.stroke();n.fillStyle='#7aa040';n.fillRect(W2*.34,H2*.835,W2*.33,H2*.02);
        for(let k=0;k<3;k++){const hx=W2*(.4+k*.08),hy=H2*.83;n.fillStyle='#5a3a22';n.fillRect(hx,hy-14,26,10);n.fillRect(hx+22,hy-20,6,9);n.fillRect(hx+2,hy-4,3,8);n.fillRect(hx+20,hy-4,3,8);}}
      if(t==='lodge'){for(let k=0;k<3;k++){const mx=W2*(.38+k*.05);n.fillStyle='#5a4a3a';n.fillRect(mx,H2*.82,22,10);n.fillRect(mx+18,H2*.805,6,10);n.fillRect(mx+2,H2*.83,3,8);n.fillRect(mx+16,H2*.83,3,8);}}}
    if(t==='petro'){const g=m;g.fillStyle=R(C.wall,1.05);g.fillRect(W2*.05,H2*.12,W2*.9,H2*.7);for(let i=0;i<300;i++){g.fillStyle=R([40,25,20],1,.12);g.fillRect(rng()*W2,H2*.12+rng()*H2*.7,3+rng()*12,2);}
      g.fillStyle='rgba(30,15,10,.55)';g.fillRect(W2*.05,H2*.12,W2*.9,H2*.7);g.strokeStyle='rgba(235,215,190,.85)';g.lineWidth=4;
      for(let i=0;i<14;i++){const x=W2*(.12+(i%7)*.12),y=H2*(.3+Math.floor(i/7)*.25);const k=i%4;g.beginPath();
        if(k===0){g.arc(x,y-30,8,0,7);g.moveTo(x,y-22);g.lineTo(x,y+10);g.moveTo(x-18,y-12);g.lineTo(x+18,y-12);g.moveTo(x,y+10);g.lineTo(x-10,y+30);g.moveTo(x,y+10);g.lineTo(x+10,y+30);}
        else if(k===1){for(let a=0;a<14;a+=.3){const r=a*2.2;g.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r);}}
        else if(k===2){g.moveTo(x-20,y);g.lineTo(x+16,y);g.moveTo(x-14,y);g.lineTo(x-16,y+16);g.moveTo(x+10,y);g.lineTo(x+12,y+16);g.moveTo(x+16,y);g.quadraticCurveTo(x+30,y-26,x+8,y-22);}
        else{g.moveTo(x,y-34);g.lineTo(x,y+28);g.moveTo(x-12,y-34);g.lineTo(x-12,y-14);g.lineTo(x+12,y-14);g.lineTo(x+12,y-34);g.rect(x-14,y-10,28,30);}g.stroke();}}
    if(t==='bridge'||t==='rail'){const by=t==='rail'?H2*.6:H2*.2;m.fillStyle='#5f6870';m.fillRect(0,by,W2,H2*.025);m.strokeStyle='#8a939c';m.lineWidth=6;m.beginPath();m.moveTo(W2*.18,by+H2*.025);m.quadraticCurveTo(W2*.5,by+H2*.28,W2*.82,by+H2*.025);m.stroke();
      m.lineWidth=2;for(let i=0;i<14;i++){const x=W2*(.2+i*.045),yy=by+H2*.025+Math.sin(Math.PI*(i/13))*H2*.13*(t==='rail'?.3:1);m.beginPath();m.moveTo(x,by+H2*.02);m.lineTo(x,yy);m.stroke();}
      if(t==='rail'){m.fillStyle='#2a2a2a';for(let k=0;k<8;k++){m.fillRect(W2*(.05+k*.1),by-H2*.04,W2*.09,H2*.04);m.fillStyle=k?'#7a3a2a':'#c9b23a';}}}
    if(t==='dam'){m.fillStyle='#a9a9a2';m.beginPath();m.moveTo(W2*.2,H2*.25);m.quadraticCurveTo(W2*.5,H2*.32,W2*.8,H2*.25);m.lineTo(W2*.74,H2*.66);m.quadraticCurveTo(W2*.5,H2*.72,W2*.26,H2*.66);m.closePath();m.fill();for(let i=0;i<10;i++){m.fillStyle='rgba(0,0,0,.08)';m.fillRect(W2*(.27+i*.05),H2*.3,4,H2*.36);}}
    if(t==='volcano'){m.fillStyle='#141213';m.beginPath();m.moveTo(W2*.42,H2*.72);m.lineTo(W2*.44,H2*.32);m.lineTo(W2*.5,H2*.27);m.lineTo(W2*.56,H2*.34);m.lineTo(W2*.58,H2*.72);m.fill();for(let i=0;i<6;i++){m.fillStyle='rgba(10,10,10,.7)';const x=W2*(.05+rng()*.3)+(i>2?W2*.6:0);m.beginPath();m.moveTo(x,H2*.1);m.quadraticCurveTo(x+30,H2*.4,x+(rng()-.5)*60,H2*.7);m.lineTo(x+40,H2*.7);m.quadraticCurveTo(x+60,H2*.4,x+30,H2*.1);m.fill();}}
    if(t==='arch'){m.fillStyle=R(C.wall,1.1);m.beginPath();m.moveTo(W2*.25,H2*.66);m.lineTo(W2*.27,H2*.28);m.quadraticCurveTo(W2*.42,H2*.16,W2*.58,H2*.28);m.lineTo(W2*.6,H2*.66);m.lineTo(W2*.52,H2*.66);m.quadraticCurveTo(W2*.52,H2*.32,W2*.425,H2*.3);m.quadraticCurveTo(W2*.33,H2*.32,W2*.33,H2*.66);m.closePath();m.fill();}
    if(t==='hat'){m.fillStyle=R(C.wall2,1);m.beginPath();m.ellipse(W2*.5,H2*.33,W2*.12,H2*.035,0,0,7);m.fill();m.fillRect(W2*.49,H2*.35,W2*.02,H2*.08);m.beginPath();m.moveTo(W2*.42,H2*.6);m.lineTo(W2*.48,H2*.43);m.lineTo(W2*.52,H2*.43);m.lineTo(W2*.58,H2*.6);m.fill();}
    if(t==='trail'){m.strokeStyle='rgba(240,220,190,.8)';m.lineWidth=3;m.beginPath();let x=W2*.12,y=H2*.66;m.moveTo(x,y);for(let i=0;i<9;i++){x=i%2?W2*.12:W2*.3;y-=H2*.05;m.lineTo(x,y);}m.stroke();}
    if(t==='takeout'||t==='town'){const ry=H2*.84;n.fillStyle='#8f8f88';n.beginPath();n.moveTo(W2*.08,H2);n.lineTo(W2*.2,ry-10);n.lineTo(W2*.32,ry-10);n.lineTo(W2*.36,H2);n.fill();
      for(let k=0;k<3;k++){const tx=W2*(.36+k*.14),ty=H2*.8;n.fillStyle=['#c0392b','#2e86c1','#7f8c8d'][k];n.fillRect(tx,ty-26,58,22);n.fillRect(tx+44,ty-36,22,32);n.fillStyle='#1a1a1a';n.beginPath();n.arc(tx+12,ty-2,7,0,7);n.arc(tx+52,ty-2,7,0,7);n.fill();if(t==='takeout'){n.fillStyle='#555';n.fillRect(tx-62,ty-10,58,6);this.raft(n,tx-34,ty-14,.8,['#f0b429','#e67e22','#f0b429'][k]);}}
      if(t==='takeout'){n.fillStyle='#e9e2d0';n.fillRect(W2*.1,H2*.62,W2*.14,H2*.07);n.fillStyle='#1d5e3a';n.font=`bold ${Math.round(H2*.035)}px sans-serif`;n.fillText('TAKE-OUT',W2*.108,H2*.668);n.fillStyle='#5a3d24';n.fillRect(W2*.165,H2*.69,6,H2*.12);}
      else for(let k=0;k<5;k++){n.fillStyle=['#d9c9a3','#c7b18a','#e8dcc0'][k%3];n.fillRect(W2*(.6+k*.07),H2*.7,W2*.05,H2*.05);n.fillStyle=['#8e3b22','#555','#2e5d7a'][k%3];n.fillRect(W2*(.595+k*.07),H2*.69,W2*.06,H2*.014);}}
    if(t==='heli'){n.fillStyle='#9a9a90';n.beginPath();n.ellipse(W2*.25,H2*.84,W2*.08,H2*.02,0,0,7);n.fill();n.fillStyle='#fff';n.font=`bold ${Math.round(H2*.03)}px sans-serif`;n.fillText('H',W2*.24,H2*.85);}
    if(t==='confluence'){n.fillStyle='rgba(140,110,70,.8)';n.beginPath();n.moveTo(W2*.5,H2*.66);n.quadraticCurveTo(W2*.75,H2*.8,W2,H2*.7);n.lineTo(W2,H2);n.lineTo(W2*.5,H2);n.fill();}
    if(t==='turquoise'){for(let i=0;i<5;i++){const y=H2*(.7+i*.055),x0=W2*(.3-i*.05),x1=W2*(.75+i*.04);n.fillStyle=`rgba(60,200,200,${.85})`;n.beginPath();n.ellipse((x0+x1)/2,y,(x1-x0)/2,H2*.024,0,0,7);n.fill();n.strokeStyle='rgba(235,225,200,.9)';n.lineWidth=5;n.beginPath();n.ellipse((x0+x1)/2,y+H2*.02,(x1-x0)/2,H2*.008,0,0,Math.PI);n.stroke();}}
  },
  /* ---------- animated frame ---------- */
  draw(c,w,h,t,spec,L){
    const k=1.04+.03*Math.sin(t*.12),px=Math.sin(t*.09),py=Math.cos(t*.07)*.5;
    const sky=c.createLinearGradient(0,0,0,h*.7);const mood=spec.type==='danger';sky.addColorStop(0,mood?'#2b2f3a':'#6fa6d6');sky.addColorStop(.7,mood?'#4a3a3a':'#bcd9ee');sky.addColorStop(1,mood?'#5a3a2a':'#f2d9b0');c.fillStyle=sky;c.fillRect(0,0,w,h);
    for(let i=0;i<5;i++){const cx=((i*.27+t*.006*(1+i*.3))%1.3-.15)*w,cy=h*(.06+i*.04);c.fillStyle=mood?'rgba(60,60,70,.7)':'rgba(255,255,255,.75)';for(let j=0;j<4;j++){c.beginPath();c.ellipse(cx+j*w*.025,cy+Math.sin(j)*4,w*.04,h*.02,0,0,7);c.fill();}}
    const lay=(img,depth)=>{const s=k*(1+depth*.04),dw=w*1.2*s/1.2,dh=h*1.2*s/1.2,ox=(w-dw)/2+px*depth*w*.03,oy=(h-dh)/2+py*depth*h*.015;c.drawImage(img,ox,oy,dw*1.0,dh*1.0);return {ox,oy,s:dw/(w*1.2)};};
    lay(L.far,.3);const mp=lay(L.mid,.8);
    // river shimmer and flow
    if(L.type!=='meander'&&L.type!=='petro'){c.strokeStyle='rgba(255,255,255,.35)';c.lineWidth=2;for(let i=0;i<26;i++){const y=h*(.68+(i%9)*.035),x=((i*.37+t*.05*(1+i%3*.3))%1.2-.1)*w;c.beginPath();c.moveTo(x,y);c.lineTo(x+w*.04,y+1);c.stroke();}}
    const tp=L.type;
    if(tp==='spring'){const fx=w*.68,top=h*.22;for(let i=0;i<60;i++){const ph=(i*.137+t*.9)%1;c.fillStyle=`rgba(230,245,255,${.7*(1-ph*.5)})`;c.fillRect(fx+Math.sin(i)*w*.012,top+ph*(h*.48),3,10);}
      c.fillStyle='rgba(60,140,60,.85)';for(let i=0;i<30;i++){c.beginPath();c.arc(fx+(Math.sin(i*2.1))*w*.08,top+h*.1+i*h*.013,6+((i*7)%5),0,7);c.fill();}
      for(let i=0;i<14;i++){c.fillStyle='rgba(255,255,255,.3)';c.beginPath();c.arc(fx+Math.sin(t*2+i)*w*.04,h*.7+Math.cos(t*1.5+i)*8,8+i%5*3,0,7);c.fill();}}
    if(tp==='rapid'||tp==='crowd'||tp==='danger'){for(let i=0;i<40;i++){const x=((i*.091+t*.08)%1.1)*w,y=h*(.7+((i*.37)%1)*.25);const s=10+Math.sin(t*4+i)*6;c.fillStyle='rgba(250,252,255,.85)';c.beginPath();c.ellipse(x,y,s*2,s*.8,0,0,7);c.fill();}
      const ry=h*.78+Math.sin(t*3)*h*.03;this.raft(c,w*.45,ry,1.4,'#f0b429');c.save();c.translate(w*.45,ry);c.rotate(Math.sin(t*3)*.12);this.person(c,-14,-6,1.2,'#e74c3c');this.person(c,10,-6,1.2,'#3498db');c.restore();}
    if(tp==='crowd'){for(let i=0;i<60;i++){const x=w*(.03+(i%20)*.012)+(i>39?w*.72:0),j=Math.abs(Math.sin(t*8+i))*6;this.person(c,x+(i%3)*6,h*(.58+Math.floor(i/20)%2*.04)-j,1,['#e74c3c','#f1c40f','#3498db','#2ecc71','#e67e22','#9b59b6'][i%6]);}}
    if(tp==='turquoise'){c.fillStyle='rgba(255,255,255,.35)';for(let i=0;i<20;i++){c.beginPath();c.ellipse(w*(.35+((i*.17+t*.02)%.45)),h*(.72+(i%5)*.05),10,2,0,0,7);c.fill();}for(let i=0;i<3;i++)this.person(c,w*(.45+i*.06),h*(.76+i*.03)+Math.sin(t*2+i)*3,1,'#ff8c1a');}
    if(tp==='heli'){const hx=((t*.05)%1.4-.2)*w,hy=h*.25+Math.sin(t)*10;c.fillStyle='#c0392b';c.beginPath();c.ellipse(hx,hy,34,14,0,0,7);c.fill();c.fillRect(hx-60,hy-4,40,6);c.strokeStyle='#222';c.lineWidth=3;const r=Math.cos(t*40)*50;c.beginPath();c.moveTo(hx-r,hy-18);c.lineTo(hx+r,hy-18);c.stroke();}
    if(tp==='lodge'||tp==='cabin'){for(let i=0;i<8;i++){const ph=(t*.15+i*.12)%1;c.fillStyle=`rgba(220,220,220,${.4*(1-ph)})`;c.beginPath();c.arc(w*.25+Math.sin(ph*6+i)*10,h*(.55-ph*.2),8+ph*14,0,7);c.fill();}}
    if(tp==='falls'){for(let i=0;i<50;i++){const ph=(t*.25+i*.07)%1;c.fillStyle=`rgba(255,255,255,${.5*(1-ph)})`;c.beginPath();c.arc(w*(.15+(i*.137)%0.7),h*(.66-ph*.5),12+ph*40,0,7);c.fill();}}
    lay(L.near,1.3);
    if(tp==='takeout'){for(let i=0;i<4;i++)this.person(c,w*(.24+i*.035),h*.83+Math.abs(Math.sin(t*5+i))*-4,1.3,['#e74c3c','#2ecc71','#3498db','#f1c40f'][i]);}
    if(tp==='danger'){c.fillStyle=`rgba(120,0,0,${.18+.1*Math.sin(t*3)})`;c.fillRect(0,0,w,h);}
    // birds
    for(let i=0;i<3;i++){const bx=((t*.03+i*.33)%1.2-.1)*w,by=h*(.18+i*.05)+Math.sin(t+i)*8,f=Math.sin(t*6+i)*6;c.strokeStyle='#1b1b22';c.lineWidth=2.5;c.beginPath();c.moveTo(bx-12,by-f);c.lineTo(bx,by);c.lineTo(bx+12,by-f);c.stroke();}
    // vignette
    const v=c.createRadialGradient(w/2,h/2,Math.min(w,h)*.3,w/2,h/2,Math.max(w,h)*.75);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,.45)');c.fillStyle=v;c.fillRect(0,0,w,h);
  },
  layers(spec,w,h){const key=(spec.type||'canyon')+'|'+(spec.seed||'')+'|'+w+'x'+h+'|'+(spec.pal&&spec.pal.wall);if(!this.cache[key]){this.cache={};this.cache[key]=this.build(spec,w,h);}return this.cache[key];},
  /* small static picture for fact cards */
  thumb(spec){try{const c=document.createElement('canvas');c.width=240;c.height=135;const x=c.getContext('2d');this.draw(x,240,135,3,spec,this.build(spec,240,135));if(typeof PIX!=='undefined'&&PIX.on())PIX.retroize(c,120);return c.toDataURL('image/jpeg',.85);}catch(e){return '';}},
  /* full-screen scene with a text panel */
  open(o){
    const scr=$('sceneScreen');this.cur={spec:o.spec,t:0};scr.classList.toggle('retro',typeof PIX!=='undefined'&&PIX.on());
    const p=$('scenePanel');p.className=o.big?'big':'';
    p.innerHTML=`<div class="pk">${o.kicker||''}</div><h1>${esc(o.title)}</h1>${o.sub?`<div class="sub">${esc(o.sub)}</div>`:''}<div class="sbody">${o.body||''}</div><div class="cbtns"></div>`;
    const bw=p.querySelector('.cbtns');(o.buttons||[]).forEach(([t,fn],i)=>{const b=document.createElement('button');b.className=i===0?'big':'ghost';b.textContent=t;b.onclick=fn;bw.appendChild(b);});
    scr.style.display='block';
  },
  close(){$('sceneScreen').style.display='none';this.cur=null;},
  render(dt){const s=this.cur;if(!s)return;s.t+=dt;const cv=$('sceneCv');const w=innerWidth,h=innerHeight,d=Math.min(2,devicePixelRatio||1);
    if(cv.width!==Math.round(w*d)){cv.width=Math.round(w*d);cv.height=Math.round(h*d);}const c=cv.getContext('2d');c.setTransform(d,0,0,d,0,0);
    const retro=typeof PIX!=='undefined'&&PIX.on();if(retro&&s.t-(s.last||-1)<1/12)return;s.last=s.t;
    this.draw(c,w,h,s.t,s.spec,this.layers(s.spec,w,h));if(retro)PIX.retroize(cv);}
};
function sceneSpec(type,seed){const R=G?G.river:RIVERS[0];return {type:type||'canyon',seed:seed||'',pal:(G&&G.pal)||R.pal,forest:!!R.trees,water:(G&&G.lvlKey==='flood')?'#8a6a45':undefined};}
