// Сервисный воркер: статика открывается без сети, данные из таблицы всегда берутся свежими.
// При изменении файлов сайта поднимите номер версии, чтобы клиенты получили обновление.
var VERSION = 'v17-ui';
var CACHE = 'cheese-' + VERSION;
var FILES = ['./', 'index.html', 'styles.css?v=3', 'tiles.css?v=5', 'welcome.css?v=2', 'config.js?v=8', 'demo-data.js?v=13', 'app.js?v=10', 'checkout.js?v=5', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE && k.indexOf('cheese-') === 0; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return; // API и чужие домены не трогаем
  // сначала сеть (чтобы правки доходили сразу), при отсутствии сети — кэш
  e.respondWith(fetch(req).then(function (res) {
    if (res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
    return res;
  }).catch(function () {
    return caches.match(req).then(function (m) { return m || caches.match('index.html'); });
  }));
});
