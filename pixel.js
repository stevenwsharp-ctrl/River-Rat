'use strict';
/* =====================================================================
   RIVER RAT — RETRO PIXEL ART
   Turns any canvas into chunky pixel art with a fixed color palette and
   ordered dithering, like old computer games. Also draws the River Rat
   (the mascot), the title screen and the end-of-trip pictures.
   ===================================================================== */
const PIX={
  PAL:['#000000','#1b1b29','#3a3a50','#6a6a80','#a2a2b2','#d8d8e2','#ffffff','#14305e','#2862b4','#55a0e6','#a6d6f8','#0e4a36','#1d7a48','#3cae4a','#92d24c',
       '#3a2414','#6c381c','#a0522c','#cc7a3c','#e2a464','#f2d494','#6a1c1c','#b8322a','#ec6438','#e6c432','#f8f07a','#249e98','#5ee2d2','#5a386e','#9a6ab8','#f1c0b0','#8a7a66'],
  rgb:null,cache:null,small:null,
  init(){if(this.rgb)return;this.rgb=this.PAL.map(h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)]);this.cache=new Int16Array(32768).fill(-1);},
  near(r,g,b){const key=((r>>3)<<10)|((g>>3)<<5)|(b>>3);let i=this.cache[key];if(i>=0)return i;let best=0,bd=1e9;
    for(let k=0;k<this.rgb.length;k++){const p=this.rgb[k],dr=r-p[0],dg=g-p[1],db=b-p[2],d=dr*dr*.3+dg*dg*.59+db*db*.11;if(d<bd){bd=d;best=k;}}this.cache[key]=best;return best;},
  BAYER:[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5],
  dither(ctx,w,h){this.init();const im=ctx.getImageData(0,0,w,h),d=im.data,P=this.rgb,B=this.BAYER;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){const o=(y*w+x)*4,th=(B[(y&3)*4+(x&3)]/16-.47)*34;
      const r=clamp(d[o]+th,0,255)|0,g=clamp(d[o+1]+th,0,255)|0,b=clamp(d[o+2]+th,0,255)|0,p=P[this.near(r,g,b)];d[o]=p[0];d[o+1]=p[1];d[o+2]=p[2];d[o+3]=255;}
    ctx.putImageData(im,0,0);},
  /* pixelate a canvas in place: shrink, dither, scale back up with hard edges */
  retroize(cv,lowW){if(!cv.width)return;const lw=lowW||clamp(Math.round(cv.width/(devicePixelRatio>1.5?6:4)),120,300),lh=Math.max(1,Math.round(cv.height*lw/cv.width));
    if(!this.small)this.small=document.createElement('canvas');const s=this.small;if(s.width!==lw||s.height!==lh){s.width=lw;s.height=lh;}
    const sc=s.getContext('2d',{willReadFrequently:true});sc.imageSmoothingEnabled=true;sc.drawImage(cv,0,0,lw,lh);this.dither(sc,lw,lh);
    const c=cv.getContext('2d');c.save();c.setTransform(1,0,0,1,0,0);c.imageSmoothingEnabled=false;c.drawImage(s,0,0,cv.width,cv.height);c.restore();},
  on(){return !(typeof sel!=='undefined'&&sel.retro===false);},
  /* ---------- the River Rat ---------- */
  rat(c,x,y,s,t,pose){c.save();c.translate(x,y);c.scale(s,s);const bob=Math.sin(t*3)*1.5;
    // tail
    c.strokeStyle='#e8a0a0';c.lineWidth=3;c.beginPath();c.moveTo(-14,8+bob);c.quadraticCurveTo(-34,4,-30,-10+Math.sin(t*4)*4);c.stroke();
    // body + life jacket
    c.fillStyle='#8a8a96';c.beginPath();c.ellipse(0,0+bob,14,16,0,0,7);c.fill();c.fillStyle='#d8342a';c.fillRect(-11,-6+bob,22,16);c.fillStyle='#f8f07a';c.fillRect(-11,1+bob,22,3);
    // head
    c.fillStyle='#9a9aa6';c.beginPath();c.ellipse(4,-20+bob,11,10,0,0,7);c.fill();c.beginPath();c.moveTo(10,-24+bob);c.lineTo(24,-18+bob);c.lineTo(10,-13+bob);c.fill();
    c.fillStyle='#f1a0b0';c.beginPath();c.arc(24,-18+bob,2.6,0,7);c.fill();c.beginPath();c.arc(-4,-30+bob,6,0,7);c.fill();c.fillStyle='#9a9aa6';c.beginPath();c.arc(-4,-30+bob,3.5,0,7);c.fill();
    c.fillStyle='#000';c.beginPath();c.arc(10,-22+bob,2,0,7);c.fill();c.fillStyle='#fff';c.fillRect(10,-23+bob,1,1);
    c.strokeStyle='#222';c.lineWidth=.8;c.beginPath();c.moveTo(20,-18+bob);c.lineTo(30,-21+bob);c.moveTo(20,-17+bob);c.lineTo(30,-15+bob);c.stroke();
    // helmet
    c.fillStyle='#e6c432';c.beginPath();c.ellipse(2,-27+bob,11,6,0,Math.PI,0);c.fill();c.fillRect(-9,-28+bob,22,3);
    // paddle
    const pa=pose==='cheer'?-1.2+Math.sin(t*6)*.2:Math.sin(t*2.4)*.6;c.save();c.translate(6,-4+bob);c.rotate(pa);c.strokeStyle='#6c381c';c.lineWidth=3;c.beginPath();c.moveTo(0,-26);c.lineTo(0,22);c.stroke();
    c.fillStyle='#2862b4';c.fillRect(-5,18,10,14);c.restore();
    c.restore();},
  raft(c,x,y,s,col,flip){c.save();c.translate(x,y);c.scale(s,s);c.fillStyle=col||'#e6c432';c.beginPath();c.ellipse(0,0,46,12,0,0,7);c.fill();c.fillStyle='#3a3a50';c.beginPath();c.ellipse(0,-3,34,6,0,0,7);c.fill();
    c.fillStyle='rgba(0,0,0,.25)';c.fillRect(-40,4,80,3);c.restore();},
  /* simple pixel scene: sky, cliffs, river */
  land(c,w,h,t,o){o=o||{};const pal=o.pal||{wall:'#b4552f',wall2:'#86391f',sand:'#ddbb84',water:'#3f7f6f',veg:'#78883a'};
    const g=c.createLinearGradient(0,0,0,h*.6);g.addColorStop(0,o.night?'#0d1030':'#4a8fd8');g.addColorStop(1,o.night?'#3a2a5a':'#bfe0f6');c.fillStyle=g;c.fillRect(0,0,w,h);
    if(!o.night)for(let i=0;i<3;i++){const cx=((i*.37+t*.01)%1.2-.1)*w,cy=h*(.1+i*.06);c.fillStyle='#ffffff';for(let j=0;j<4;j++){c.beginPath();c.ellipse(cx+j*w*.04,cy+(j%2)*3,w*.05,h*.03,0,0,7);c.fill();}}
    else{c.fillStyle='#fff';for(let i=0;i<40;i++)c.fillRect((i*97%w),(i*53%(h*.5)),1.5,1.5);}
    c.fillStyle=pal.wall;c.beginPath();c.moveTo(0,h*.72);for(let x=0;x<=w*.42;x+=w/30)c.lineTo(x,h*(.18+.4*x/w)+Math.sin(x*.07)*8);c.lineTo(w*.45,h*.72);c.fill();
    c.fillStyle=pal.wall2;c.beginPath();c.moveTo(w,h*.72);for(let x=w;x>=w*.58;x-=w/30)c.lineTo(x,h*(.2+.4*(w-x)/w)+Math.cos(x*.06)*8);c.lineTo(w*.55,h*.72);c.fill();
    c.fillStyle=pal.water;c.fillRect(0,h*.62,w,h*.38);c.fillStyle='rgba(255,255,255,.7)';for(let i=0;i<16;i++){const x=((i*.13+t*.08)%1.1-.05)*w,y=h*(.66+(i%5)*.06);c.fillRect(x,y,w*.06,2);}
    c.fillStyle=pal.sand;c.beginPath();c.moveTo(0,h);c.lineTo(0,h*.86);c.quadraticCurveTo(w*.2,h*.82,w*.36,h*.92);c.lineTo(w*.4,h);c.fill();},
  /* the menu title picture */
  title(cv,t){const d=Math.min(2,devicePixelRatio||1),w=cv.clientWidth||600,h=cv.clientHeight||200;if(cv.width!==Math.round(w*d)){cv.width=Math.round(w*d);cv.height=Math.round(h*d);}
    const c=cv.getContext('2d');c.setTransform(d,0,0,d,0,0);this.land(c,w,h,t,{});
    const rx=w*.62+Math.sin(t*.7)*w*.05,ry=h*.74+Math.sin(t*2)*3;this.raft(c,rx,ry,Math.min(1.3,h/170));this.rat(c,rx-6,ry-10,Math.min(1,h/210),t);
    c.font=`bold ${Math.round(h*.24)}px "Press Start 2P", "VT323", monospace`;c.textAlign='left';c.fillStyle='#14305e';c.fillText('RIVER RAT',w*.045+3,h*.33+3);c.fillStyle='#f8f07a';c.fillText('RIVER RAT',w*.045,h*.33);
    c.font=`${Math.round(h*.09)}px "Press Start 2P", "VT323", monospace`;c.fillStyle='#ffffff';c.fillText('Read the water. Don\'t swim.',w*.05,h*.47);
    if(this.on())this.retroize(cv,clamp(Math.round(w/3),140,300));},
  /* pictures for the end screen */
  endArt(cv,kind,t,R){const d=Math.min(2,devicePixelRatio||1),w=cv.clientWidth||520,h=cv.clientHeight||220;if(cv.width!==Math.round(w*d)){cv.width=Math.round(w*d);cv.height=Math.round(h*d);}
    const c=cv.getContext('2d');c.setTransform(d,0,0,d,0,0);const pal=R&&R.pal;this.land(c,w,h,t,{pal,night:kind==='hypo'||kind==='evac'});const sc=Math.min(1.2,h/180);
    if(kind==='win'){c.fillStyle='#8f8f88';c.beginPath();c.moveTo(w*.05,h);c.lineTo(w*.18,h*.8);c.lineTo(w*.32,h*.8);c.lineTo(w*.36,h);c.fill();c.fillStyle='#b8322a';c.fillRect(w*.7,h*.66,w*.14,h*.1);c.fillRect(w*.81,h*.6,w*.06,h*.16);c.fillStyle='#000';c.beginPath();c.arc(w*.73,h*.77,5,0,7);c.arc(w*.83,h*.77,5,0,7);c.fill();
      this.raft(c,w*.26,h*.82,sc);this.rat(c,w*.26,h*.72,sc*.9,t,'cheer');for(let i=0;i<12;i++){c.fillStyle=['#f8f07a','#ec6438','#5ee2d2','#9a6ab8'][i%4];c.fillRect((i*71+t*60)%w,(i*37+t*90)%(h*.6),4,4);}}
    else if(kind==='hull'){c.fillStyle='#3a3a50';c.beginPath();c.ellipse(w*.5,h*.72,w*.09,h*.12,0,0,7);c.fill();c.fillStyle='#e6c432';c.beginPath();c.moveTo(w*.38,h*.7);c.quadraticCurveTo(w*.5,h*.5,w*.62,h*.7);c.quadraticCurveTo(w*.5,h*.62,w*.38,h*.7);c.fill();this.rat(c,w*.5,h*.5,sc*.8,t);}
    else if(kind==='flip'||kind==='swims'){c.save();c.translate(w*.45,h*.76);c.rotate(Math.PI);this.raft(c,0,0,sc);c.restore();this.rat(c,w*.45,h*.66,sc*.8,t);for(let i=0;i<3;i++){c.fillStyle='#d8342a';c.beginPath();c.arc(w*(.6+i*.08),h*(.78+Math.sin(t*2+i)*.02),6,0,7);c.fill();}}
    else if(kind==='missed'){c.fillStyle='#e2d2b0';c.fillRect(w*.08,h*.5,w*.2,h*.12);c.fillStyle='#1d7a48';c.font=`bold ${Math.round(h*.06)}px monospace`;c.fillText('TAKE-OUT',w*.09,h*.58);c.fillStyle='#6c381c';c.fillRect(w*.17,h*.62,4,h*.2);this.raft(c,w*.75,h*.7,sc*.7);this.rat(c,w*.75,h*.62,sc*.6,t);
      c.fillStyle='#fff';c.font=`bold ${Math.round(h*.08)}px monospace`;c.fillText('?!',w*.8,h*.42);}
    else if(kind==='hypo'){this.rat(c,w*.5,h*.66,sc,t);c.fillStyle='rgba(166,214,248,.85)';c.fillRect(w*.42,h*.62,w*.16,h*.14);c.fillStyle='#fff';for(let i=0;i<30;i++)c.fillRect((i*53+t*20)%w,(i*29+t*40)%h,2,2);}
    else if(kind==='evac'){const hx=w*(.3+.4*((t*.05)%1));c.fillStyle='#b8322a';c.beginPath();c.ellipse(hx,h*.25,30,12,0,0,7);c.fill();c.fillRect(hx-55,h*.25-3,30,5);c.strokeStyle='#000';c.lineWidth=3;const r=Math.cos(t*30)*40;c.beginPath();c.moveTo(hx-r,h*.25-16);c.lineTo(hx+r,h*.25-16);c.stroke();this.raft(c,w*.4,h*.8,sc);this.rat(c,w*.4,h*.7,sc*.8,t);}
    else{this.raft(c,w*.4,h*.8,sc);this.rat(c,w*.4,h*.7,sc*.8,t);}
    if(this.on())this.retroize(cv,clamp(Math.round(w/3),140,300));},
  endKind(ok,reason){if(ok)return 'win';const r=(reason||'').toLowerCase();if(/hull|popped|cracked|stove/.test(r))return 'hull';if(/swim/.test(r))return 'swims';if(/miss/.test(r))return 'missed';if(/evac|leader/.test(r))return 'evac';if(/cold|hypo/.test(r))return 'hypo';return 'flip';},
  endCaption(kind,reason){return {win:'You made it to the take-out!',hull:'Here lies your boat. It was a good boat.',swims:'Too many swims. The crew walks out.',missed:'You floated right past the take-out.',evac:'The helicopter comes for your trip leader.',hypo:'Too cold. Time to get warm.',flip:'Trip over.'}[kind]||'Trip over.';}
};
