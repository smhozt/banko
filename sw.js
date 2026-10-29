// Banko servis çalışanı: arayüz dosyalarını önbelleğe alır (hızlı açılış, çevrimdışıyken kabuk görünür).
// Veri çağrıları (Apps Script) hiç önbelleğe alınmaz. Sayfanın kendisi önce ağdan istenir, böylece güncelleme hemen gelir;
// internet yoksa önbellekteki sürüm açılır. Sürüm adı derleme sırasında içerikten üretilir.
const CACHE = "banko-shell-9879f3228a";
const SHELL = ["./", "./index.html", "./config.js", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
const put = (req, r) => { if (r && r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return r; };
self.addEventListener("fetch", e => {
  const req = e.request, u = new URL(req.url);
  if (req.method !== "GET" || u.origin !== location.origin) return;
  const page = req.mode === "navigate" || u.pathname.endsWith("/") || u.pathname.endsWith("/index.html") || u.pathname.endsWith("/config.js");
  if (page) {
    e.respondWith(fetch(req, { cache: "no-store" }).then(r => put(req, r)).catch(() => caches.match(req, { ignoreSearch: true }).then(h => h || caches.match("./index.html"))));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => {
    const net = fetch(req).then(r => put(req, r)).catch(() => hit);
    return hit || net;
  }));
});
