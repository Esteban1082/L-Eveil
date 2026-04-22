// ============================================================
// L'ÉVEIL — Service Worker v1
// Placer ce fichier à la racine du projet (même niveau que index.html)
// ============================================================

const CACHE = 'leveil-v1';
const ASSETS = ['/'];

// ── INSTALL : mise en cache des assets essentiels ──
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS))
  );
  self.skipWaiting();
});

// ── ACTIVATE : nettoyer les anciens caches ──
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── FETCH : réseau d'abord, cache en fallback ──
self.addEventListener('fetch', e => {
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match('/'))
    );
    return;
  }
  e.respondWith(
    fetch(e.request).then(res => {
      // Mettre en cache les ressources statiques
      if (res && res.status === 200 && e.request.method === 'GET') {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return res;
    }).catch(() => caches.match(e.request))
  );
});

// ── PUSH : recevoir une notification push ──
self.addEventListener('push', e => {
  let data = { title: "L'Éveil ✦", body: 'Nouvelle notification', url: '/' };
  try { if (e.data) data = { ...data, ...e.data.json() }; } catch (_) {}

  e.waitUntil(
    self.registration.showNotification(data.title, {
      body:    data.body,
      icon:    '/icon-192.png',
      badge:   '/icon-96.png',
      image:   data.image || undefined,
      data:    { url: data.url },
      vibrate: [100, 50, 100],
      tag:     data.tag || 'leveil-notif',
      renotify: true,
      actions: data.actions || []
    })
  );
});

// ── NOTIFICATION CLICK : ouvrir l'app ──
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if ('focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// ── SYNC : synchro en arrière-plan (optionnel) ──
self.addEventListener('sync', e => {
  if (e.tag === 'sync-notifications') {
    // Réservé pour synchronisation future
  }
});
