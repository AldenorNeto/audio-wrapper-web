// Service worker: guarda só a "casca" do app (página, ícones, biblioteca) para abrir rápido e
// permitir instalar no celular. Áudio, transcrições e a lista (Supabase) NUNCA ficam aqui:
// vão sempre direto pra rede, com o login do usuário.
const CACHE = "gravacoes-v1";
const CASCA = ["./", "index.html", "manifest.json", "icons/icon-192.png", "icons/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CASCA)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const mesmaOrigem = url.origin === self.location.origin;
  if (!mesmaOrigem && url.hostname !== "cdn.jsdelivr.net") return; // Supabase e o resto: rede direta
  // Rede primeiro (pega a versão nova), cache só se estiver sem internet.
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) { const copia = res.clone(); caches.open(CACHE).then((c) => c.put(req, copia)); }
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match("index.html")))
  );
});
