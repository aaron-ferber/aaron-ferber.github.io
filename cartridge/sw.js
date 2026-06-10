const CACHE_NAME = "cartridge-player-v3";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./payloads.js",
  "./examples.js",
  "./cartridges/2048.html",
  "./cartridges/snake.html",
  "./cartridges/runner.html",
  "./cartridges/minesweeper.html",
  "./cartridges/tetris.html",
  "./cartridges/swipe_deck.html",
  "./cartridges/rentle.html",
  "./cartridges/price_is_wrong.html",
  "./cartridges/payroll_tab.html",
  "./cartridges/chargemaster_roulette.html",
  "./cartridges/menus_of_new_york.html",
  "./cartridges/hydrant_index.html",
  "./cartridges/who_said_it.html",
  "./cartridges/group_table.html",
  "./lib/jsQR.js",
  "./manifest.webmanifest",
  "./icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      });
    }),
  );
});
