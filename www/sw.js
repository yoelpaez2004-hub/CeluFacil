// Service worker para la versión web (en el APK no se usa). Cache-first para los archivos propios; la red para el resto.
const CACHE = "celufacil-v9";
const ARCHIVOS = ["./", "./index.html", "./style.css", "./app.js", "./data.js", "./icons.js", "./manifest.json", "./precios-ml.json",
  "./icon-192.png", "./icon-512.png", "./fonts/nunito-latin-400-normal.woff2", "./fonts/nunito-latin-600-normal.woff2", "./fonts/nunito-latin-700-normal.woff2"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin || e.request.method !== "GET") return; // GitHub, Mercado Libre, etc.: siempre red
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
