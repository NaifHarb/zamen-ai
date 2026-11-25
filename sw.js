const CACHE = 'zamen-v16';
const SHELL = [
  './index.html', './styles.css?v=16', './app.js?v=16', './manifest.webmanifest', './icon.svg',
  './icon-180.png', './icon-192.png', './icon-512.png',
  './fonts/plex-ar-regular.woff2', './fonts/plex-ar-semibold.woff2', './fonts/naskh-ar.woff2'
];
const DATA = ['news', 'sheets-news', 'images', 'licensed-articles', 'rss-classifications'].map(name => './data/' + name + '.json');
const scopedURL = path => new URL(path, self.registration.scope).href;
const shellURLs = new Set(SHELL.map(scopedURL));
const dataURLs = new Set(DATA.map(scopedURL));

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(SHELL.map(path => new Request(scopedURL(path), {cache: 'reload'})));
    // Populate an offline first visit when the origin can supply the datasets.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    await Promise.allSettled(DATA.map(path => cache.add(new Request(scopedURL(path), {
      cache: 'no-cache', signal: controller.signal
    }))));
    clearTimeout(timeout);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    const cache = await caches.open(CACHE);
    for (const name of names.filter(name => name.startsWith('zamen-') && name !== CACHE)) {
      const old = await caches.open(name);
      for (const url of dataURLs) {
        const response = await old.match(url);
        if (response && !(await cache.match(url))) await cache.put(url, response);
      }
      await caches.delete(name);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const {request} = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || !url.href.startsWith(self.registration.scope)) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request, {cache: 'no-cache'});
        if (response.ok) return response;
        return (await caches.match(scopedURL('./index.html'))) || response;
      } catch {
        return (await caches.match(scopedURL('./index.html'))) || Response.error();
      }
    })());
  } else if (dataURLs.has(url.href)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const response = await fetch(request);
        if (response.ok) {
          try { await cache.put(request, response.clone()); } catch {}
          return response;
        }
        return (await cache.match(request)) || response;
      } catch {
        return (await cache.match(request)) || Response.error();
      }
    })());
  } else if (shellURLs.has(url.href)) {
    event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(request)) || fetch(request)));
  }
});
