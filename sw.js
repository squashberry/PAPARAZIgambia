const CACHE="paparazzi-v5";
const CORE=[
  "./",
  "./index.html",
  "./story.html",
  "./join.html",
  "./studio.html",
  "./submit.html",
  "./404.html",
  "./offline.html",
  "./styles.css",
  "./app.js",
  "./config.js",
  "./favicon.svg",
  "./manifest.webmanifest"
];

self.addEventListener("install",event=>{
  event.waitUntil(
    caches.open(CACHE)
      .then(cache=>cache.addAll(CORE))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener("activate",event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(
        keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))
      ))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET")return;

  const requestUrl=new URL(event.request.url);

  // Always prefer the network for page navigations so an older cached
  // HTML document cannot trap the site behind a stale splash.
  if(requestUrl.origin===self.location.origin && event.request.mode==="navigate"){
    event.respondWith(
      fetch(event.request)
        .then(response=>{
          if(response.ok){
            const copy=response.clone();
            caches.open(CACHE).then(cache=>cache.put(event.request,copy));
          }
          return response;
        })
        .catch(()=>caches.match(event.request).then(cached=>cached||caches.match("./offline.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached=>{
      if(cached)return cached;
      return fetch(event.request).then(response=>{
        if(response.ok&&requestUrl.origin===self.location.origin){
          const copy=response.clone();
          caches.open(CACHE).then(cache=>cache.put(event.request,copy));
        }
        return response;
      }).catch(()=>caches.match("./offline.html"));
    })
  );
});
