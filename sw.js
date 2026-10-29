/* River Rat service worker: always tries the network first, so updates show at once.
   When offline, it uses the last saved copy. Change VERSION to clear old copies. */
const VERSION='rr-1.9.0';
const CORE=['./','index.html','manifest.webmanifest','icon-192.png','icon-512.png','rivers.js?v=1.9.0','river-geo.js?v=1.9.0','world-rivers.js?v=1.9.0','game.js?v=1.9.0','trip.js?v=1.9.0','scenes.js?v=1.9.0','pixel.js?v=1.9.0','wild.js?v=1.9.0','map.js?v=1.9.0','frogger.js?v=1.9.0','market.js?v=1.9.0','runs.js?v=1.9.0','three-d.js?v=1.9.0','scenery.js?v=1.9.0','map-hd.js?v=1.9.0'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(VERSION).then(c=>c.addAll(CORE.map(u=>new Request(u,{cache:'reload'})))).catch(()=>{}));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);
  const same=u.origin===location.origin,cdn=/cdnjs\.cloudflare\.com|fonts\.(googleapis|gstatic)\.com/.test(u.host);if(!same&&!cdn)return;
  e.respondWith(fetch(r).then(res=>{if(res&&res.ok){const cp=res.clone();caches.open(VERSION).then(c=>c.put(r,cp));}return res;}).catch(()=>caches.match(r,{ignoreSearch:true}).then(m=>m||caches.match('index.html'))));});
