'use strict';
/* =====================================================================
   RIVER RAT — DAILY RIVER, PASSPORT, SHARING AND PORTAL ADS
   Daily River: one river, boat and water level for everyone each day,
   with a spoiler-free result grid to share (like Wordle).
   Passport: a stamp for each river you finish.
   ADS: does nothing unless the game runs on a portal with an ad SDK
   (CrazyGames or Poki). Then it reports gameplay start/stop and offers
   player-chosen rewarded ads.
   ===================================================================== */
const GAME_URL='https://stevenwsharp-ctrl.github.io/River-Rat/';
const DAILY={
  EPOCH:Date.UTC(2026,9,1),
  num(){const d=new Date();return Math.floor((Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())-this.EPOCH)/864e5)+1;},
  cfg(n){n=n||this.num();const rng=mulberry32(hashStr('daily-river-'+n));const i=Math.floor(rng()*RUN_LIST.length),R=RUNS.build(i),crafts=['raft','raft','kayak','dory','tube'],levels=['low','med','med','high'];
    let craft=crafts[Math.floor(rng()*crafts.length)];if(craft==='tube'&&R.rapids.some(r=>sev(R,r.c)>=.75))craft='raft';const level=levels[Math.floor(rng()*levels.length)];
    R.id='daily-'+n;R.lvlKey=level;R.quick=true;R.isDaily=true;R.name=RUN_LIST[i].n+' · '+R.baseName;
    return {n,run:i,river:R.id,craft,level,R};},
  rec(){return store.get('riverrat_daily',{});},
  today(){const r=this.rec();return r.n===this.num()?r:null;},
  streak(){const r=this.rec();if(!r.n)return 0;return r.n>=this.num()-1?(r.streak||1):0;},
  start(){const c=this.cfg();this.backup={river:sel.river,craft:sel.craft,level:sel.level,mode:sel.mode};Object.assign(sel,{river:c.river,craft:c.craft,mode:'day'});RUNS.cur=c.R;$('home').style.display='none';startGame();if(G){G.daily=c.n;G.cd=2.6;G.cdShown=4;toast(`📅 Daily River #${c.n}`,'#ffe25a',1.2);}},
  restore(){if(this.backup){Object.assign(sel,this.backup);this.backup=null;if(/^daily-/.test(sel.river))sel.river='gray';saveSel();}},
  grid(){return G.W.rapids.map(r=>r.portaged?'🟦':!r.done?'⬛':r.flipped?'🟥':r.stars>=3?'🟩':r.stars===2?'🟨':'🟧').join('');},
  finish(ok){const n=G.daily,first=!this.today(),c=this.cfg(n),grid=this.grid(),sc=Math.round(G.score);
    const res={n,score:sc,ok,grid,swims:G.swims,time:G.t,river:c.R.name,craft:CRAFTS[c.craft].name,level:LEVELS[c.level].name};
    if(first){const old=this.rec();res.streak=old.n===n-1?(old.streak||1)+1:1;store.set('riverrat_daily',res);}
    return {res:first?res:Object.assign({},res,{practice:true}),first};},
  text(r){return `River Rat Daily #${r.n} 🛶\n${r.river} · ${r.craft} · ${r.level} water\n${r.grid}\n${r.ok?'Made the take-out':'Did not finish'} · ${r.score.toLocaleString()} pts · ${r.swims} swim${r.swims===1?'':'s'} · ⏱ ${fmtTime(r.time)}${r.streak>1?`\n🔥 ${r.streak}-day streak`:''}\n${GAME_URL}`;},
  endHtml(ok){const {res,first}=this.finish(ok);this.last=res;
    return `<div class="dailybox"><div class="lbh">📅 Daily River #${res.n}${first?'':' (practice run: your first run today counts)'}</div><div class="dgrid">${res.grid}</div>
      <div class="mute">🟩 3 stars · 🟨 2 stars · 🟧 survived · 🟥 flipped · 🟦 portaged</div>${first&&res.streak>1?`<div class="rank">🔥 ${res.streak}-day streak!</div>`:''}
      <button class="big" id="shareBtn">📤 Share your result</button></div>`;},
  bindShare(){const b=$('shareBtn');if(b)b.onclick=()=>SHARE.text(this.text(this.last),b);}
};
const SHARE={
  async text(t,btn){try{if(navigator.share){await navigator.share({text:t});return;}}catch(e){if(e&&e.name==='AbortError')return;}
    try{await navigator.clipboard.writeText(t);if(btn){const o=btn.textContent;btn.textContent='✅ Copied! Paste it anywhere';setTimeout(()=>btn.textContent=o,2200);}}catch(e){prompt('Copy your result:',t);}},
  runText(ok){const R=G.river;return `🛶 River Rat: ${R.name}\n${CRAFTS[G.ck].name} · ${G.lvl.name} water · ${MODES[G.mode].name}\n${ok?'Made the take-out':'Trip over'} · ${Math.round(G.score).toLocaleString()} pts · ${'★'.repeat(Math.min(5,Math.round(G.stars/Math.max(1,G.W.rapids.length))))}\n${GAME_URL}`;}
};
const PASSPORT={
  get(){return store.get('riverrat_passport',{});},
  stamp(R,score){const p=this.get(),isNew=!p[R.id];p[R.id]={best:Math.max(score,(p[R.id]||{}).best||0),date:new Date().toISOString().slice(0,10)};store.set('riverrat_passport',p);return isNew;},
  count(){return Object.keys(this.get()).filter(id=>RIVERS.some(R=>R.id===id)).length;}
};
/* ---------- portal ad SDKs (inactive on your own site) ---------- */
const ADS={sdk:null,ready:false,
  init(){const h=location.hostname+' '+document.referrer;let src=null;
    if(/crazygames/.test(h))src='https://sdk.crazygames.com/crazygames-sdk-v3.js';else if(/poki/.test(h))src='https://game-cdn.poki.com/scripts/v2/poki-sdk.js';if(!src)return;
    const s=document.createElement('script');s.src=src;s.onload=async()=>{try{if(window.CrazyGames&&CrazyGames.SDK){await CrazyGames.SDK.init();this.sdk='cg';this.ready=true;}else if(window.PokiSDK){await PokiSDK.init();this.sdk='poki';this.ready=true;PokiSDK.gameLoadingFinished();}}catch(e){}};document.head.appendChild(s);},
  start(){try{if(this.sdk==='cg')CrazyGames.SDK.game.gameplayStart();else if(this.sdk==='poki')PokiSDK.gameplayStart();}catch(e){}},
  stop(){try{if(this.sdk==='cg')CrazyGames.SDK.game.gameplayStop();else if(this.sdk==='poki')PokiSDK.gameplayStop();}catch(e){}},
  /* rewarded ad, only when the player taps a button. done(true) if they watched it. */
  rewarded(done){const mute=()=>{AU.suspend&&AU.suspend();},un=()=>{AU.resume&&AU.resume();};
    try{if(this.sdk==='cg'){mute();CrazyGames.SDK.ad.requestAd('rewarded',{adFinished:()=>{un();done(true);},adError:()=>{un();done(false);}});return;}
      if(this.sdk==='poki'){mute();PokiSDK.rewardedBreak().then(ok=>{un();done(!!ok);});return;}}catch(e){}done(false);},
  has(){return this.ready;}
};
try{ADS.init();}catch(e){}
