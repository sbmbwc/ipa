const CACHE='sh-metro-v5';
const ASSETS=['./','index.html','style.css','map-ui.css','app.mjs','router.mjs','label-layout.mjs','data.json','manifest.webmanifest','icon.svg','icon-192.png','icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('sh-metro-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==self.location.origin)return;e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request)))});
self.addEventListener('message',e=>{if(e.data==='cache-status')e.waitUntil(caches.open(CACHE).then(async c=>{const results=await Promise.all(ASSETS.map(a=>c.match(a)));if(results.every(Boolean))e.ports[0]?.postMessage('ready')}))});
