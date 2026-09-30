/* GERAK: network-first navigation, cache-only-on-success assets. Never cache API writes or auth. */
const VERSION='gerak-v2';
const CORE=['/','/offline.html','/icon.svg','/icons/icon-192.png','/icons/icon-512.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(VERSION).then(cache=>cache.addAll(CORE)));self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('gerak-')&&k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;
 if(request.mode==='navigate'){
  event.respondWith(fetch(request).then(response=>{if(response.ok){const clone=response.clone();event.waitUntil(caches.open(VERSION).then(cache=>cache.put(request,clone)));}return response;}).catch(async()=>await caches.match(request)||await caches.match('/')||await caches.match('/offline.html')));return;
 }
 if(url.pathname.startsWith('/_next/static/')||url.pathname.startsWith('/vendor/')||CORE.includes(url.pathname))event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{if(response.ok){const clone=response.clone();event.waitUntil(caches.open(VERSION).then(cache=>cache.put(request,clone)));}return response;})));
});
self.addEventListener('message',event=>{
 if(event.data?.type!=='CACHE_APP_ASSETS'||!Array.isArray(event.data.urls))return;
 const urls=event.data.urls.slice(0,100).filter(value=>{try{const url=new URL(value,self.location.origin);return url.origin===self.location.origin&&(url.pathname.startsWith('/_next/static/')||url.pathname.startsWith('/vendor/'));}catch{return false;}});
 event.waitUntil(caches.open(VERSION).then(cache=>Promise.allSettled(urls.map(url=>cache.add(url)))));
});
