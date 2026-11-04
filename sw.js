// Banko servis çalışanı: arayüz dosyalarını önbelleğe alır (hızlı açılış, çevrimdışıyken kabuk görünür).
// Veri çağrıları (sunucu) hiç önbelleğe alınmaz. Sayfanın kendisi önce ağdan istenir, böylece güncelleme hemen gelir;
// internet yoksa önbellekteki sürüm açılır. Sürüm adı derleme sırasında içerikten üretilir.
const CACHE = "banko-shell-820b58c345";
const SHELL = ["./", "./index.html", "./config.js", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];
const IMG = "banko-img-1", IMG_HOSTS = ["media.api-sports.io", "flagcdn.com", "footballcharts-backend.onrender.com", "sports.bzzoiro.com"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== IMG).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
const put = (req, r) => { if (r && r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return r; };
self.addEventListener("fetch", e => {
  const req = e.request, u = new URL(req.url);
  if (req.method === "GET" && (IMG_HOSTS.includes(u.hostname) || (u.pathname === "/img" && u.searchParams.has("u")))) {
    // logolar ve bayraklar: bir kez indirilir, sonra telefondan gelir (çevrimdışıyken de görünür)
    e.respondWith(caches.open(IMG).then(c => c.match(req.url).then(hit => hit || fetch(req.url, { mode: "cors", credentials: "omit" }).then(r => { if (r.ok) c.put(req.url, r.clone()); return r; }).catch(() => fetch(req)))));
    return;
  }
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
// bildirimler: Cloudflare sunucusu gönderir (gol, sonuç, sabah kuponu)
self.addEventListener("push", e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { title: "Banko", body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.title || "Banko", { body: d.body || "", tag: d.tag || undefined, renotify: !!d.tag, icon: "icon-192.png", badge: "badge-96.png", data: { url: d.url || "./" }, vibrate: d.urgent ? [90, 50, 90, 50, 160] : [60] }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || "./", self.registration.scope), v = url.searchParams.get("v");
  e.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(ws => {
    const w = ws.find(c => c.url.startsWith(self.registration.scope));
    if (w) { if (v) w.postMessage({ go: v }); return w.focus(); }
    return clients.openWindow(url.href);
  }));
});
