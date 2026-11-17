// Service worker: guarda só a "casca" do app (página, ícones, biblioteca) para abrir rápido, funcionar
// como app instalado e abrir mesmo sem internet. Áudio, transcrições e a lista (Supabase) NUNCA ficam
// aqui: vão sempre direto pra rede, com o login do usuário.
const CACHE = "gravacoes-v2";
const CASCA = ["./", "index.html", "manifest.json", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"];

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

function guardar(req, res) {
  if (res.ok) {
    const copia = res.clone();
    caches.open(CACHE).then((c) => c.put(req, copia));
  }
  return res;
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const mesmaOrigem = url.origin === self.location.origin;
  const cdn = url.hostname === "cdn.jsdelivr.net";
  if (!mesmaOrigem && !cdn) return; // Supabase (lista, áudio, transcrição) e o resto: direto na rede

  if (cdn) {
    // Biblioteca do Supabase: cache primeiro (a versão está fixada na URL).
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => guardar(req, res))));
    return;
  }

  // Arquivos do app: rede primeiro (pega atualizações), cache como reserva offline.
  // Não guarda URLs com query (ex.: ?code= do login com GitHub).
  // cache: "no-cache" faz o navegador revalidar com o servidor, em vez de reaproveitar por alguns
  // minutos a cópia que o GitHub Pages permite guardar (senão o app "não atualiza").
  e.respondWith(
    fetch(req, { cache: "no-cache" })
      .then((res) => (url.search ? res : guardar(req, res)))
      .catch(() => caches.match(req).then((hit) => hit || caches.match("index.html")))
  );
});
