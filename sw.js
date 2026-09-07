// Service Worker — Sreerag Portfolio
// Cache-first for static assets (images, audio, THREE.js)
// Network-first for HTML (so updates are picked up quickly)

var CACHE_VERSION = 'portfolio-v1';
var STATIC_CACHE = CACHE_VERSION + '-static';
var IMAGE_CACHE  = CACHE_VERSION + '-images';

// Core files to pre-cache on install
var PRECACHE_URLS = [
  './',
  './index.html'
];

// ---- INSTALL: cache the HTML shell ----
self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(STATIC_CACHE).then(function(cache){
      return cache.addAll(PRECACHE_URLS);
    }).then(function(){
      return self.skipWaiting();
    })
  );
});

// ---- ACTIVATE: clean old caches ----
self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.filter(function(k){
          return k !== STATIC_CACHE && k !== IMAGE_CACHE;
        }).map(function(k){
          return caches.delete(k);
        })
      );
    }).then(function(){
      return self.clients.claim();
    })
  );
});

// ---- FETCH: strategy per resource type ----
self.addEventListener('fetch', function(event){
  var url = new URL(event.request.url);

  // Only handle same-origin + CDN requests
  var isSameOrigin = url.origin === self.location.origin;
  var isCDN = url.hostname === 'cdnjs.cloudflare.com' ||
              url.hostname === 'cdn.jsdelivr.net' ||
              url.hostname === 'fonts.googleapis.com' ||
              url.hostname === 'fonts.gstatic.com';

  if(!isSameOrigin && !isCDN) return;

  // Images & audio -> Cache-first (these rarely change)
  if(url.pathname.match(/\\.(webp|png|jpg|jpeg|gif|svg|mp3|ogg|wav)$/i) || isCDN){
    event.respondWith(
      caches.open(IMAGE_CACHE).then(function(cache){
        return cache.match(event.request).then(function(cached){
          if(cached) return cached;
          return fetch(event.request).then(function(response){
            if(response.ok){
              cache.put(event.request, response.clone());
            }
            return response;
          });
        });
      })
    );
    return;
  }

  // HTML -> Network-first (so site updates are picked up)
  if(event.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/' || url.pathname.endsWith('/-.')){
    event.respondWith(
      fetch(event.request).then(function(response){
        var clone = response.clone();
        caches.open(STATIC_CACHE).then(function(cache){
          cache.put(event.request, clone);
        });
        return response;
      }).catch(function(){
        return caches.match(event.request).then(function(cached){
          return cached || caches.match('./index.html');
        });
      })
    );
    return;
  }

  // Everything else -> Cache-first
  event.respondWith(
    caches.match(event.request).then(function(cached){
      if(cached) return cached;
      return fetch(event.request).then(function(response){
        if(response.ok){
          var clone = response.clone();
          caches.open(STATIC_CACHE).then(function(cache){
            cache.put(event.request, clone);
          });
        }
        return response;
      });
    })
  );
});
