const CACHE_NAME = "mb-site-v2026-08-17";
const OFFLINE_URL = "/offline.html";

const CORE_ASSETS = [
  "/",
  "/index.html",

  "/Orte/kirche.html",
  "/Orte/rathaus.html",
  "/Orte/alte_teppichfabrik.html",
  "/Orte/wasserschloss.html",
  "/Orte/seliger.html",
  "/Orte/kletterwald.html",
  "/Orte/feuerwehr.html",
  "/Orte/heimatmuseum.html",
  "/Orte/naturbad.html",

  "/impressum.html",
  "/datenschutz.html",
  "/barrierefreiheit.html",

  "/style.css",
  "/script.js",
  "/service-worker.js",
  "/manifest.json",

  "/robots.txt",
  "/sitemap.xml",
  "/404.html",

  "/offline.html",
  "/data/content.de.json",

  "/images/icon-192.png",
  "/images/icon-512.png",
  "/images/kirche.jpg",
  "/images/rathaus.jpg",
  "/images/alte_teppichfabrik.jpg",
  "/images/wasserschloss.jpg",
  "/images/seliger.jpg",
  "/images/kletterwald.jpg",
  "/images/feuerwehr.jpg",
  "/images/heimatmuseum.jpg",
  "/images/naturbad.jpg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).catch(() => undefined)
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys
        .filter((key) => key !== CACHE_NAME)
        .map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const isHtmlNavigation = request.mode === "navigate";

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone)).catch(() => undefined);
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (isHtmlNavigation) {
          const offline = await caches.match(OFFLINE_URL);
          if (offline) return offline;
        }
        return new Response("Offline", { status: 503, statusText: "Offline" });
      })
  );
});
