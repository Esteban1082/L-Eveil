// ============================================================
// L'ÉVEIL — Service Worker v1.1
// ============================================================

const CACHE = 'leveil-v1';
const ASSETS = ['/'];

// ── INSTALL ──
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS))
  );
  self.skipWaiting();
});

// ── ACTIVATE ──
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── FETCH : ignorer chrome-extension et non-http ──
self.addEventListener('fetch', e => {
  const url = e.request.url;
  // Ignorer les schémas non supportés
  if (!url.startsWith('http://') && !url.startsWith('https://')) return;
  // Ignorer les requêtes Supabase (API, Auth, Storage, Realtime)
  if (url.includes('supabase.co')) return;
  // Ignorer les méthodes non-GET
  if (e.request.method !== 'GET') return;

  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match('/'))
    );
    return;
  }

  e.respondWith(
    fetch(e.request).then(res => {
      if (res && res.status === 200) {
        const clone = res.clone();
        caches.open(CACHE).then(c => {
          try { c.put(e.request, clone); } catch(_) {}
        });
      }
      return res;
    }).catch(() => caches.match(e.request))
  );
});

// ── PUSH ──
self.addEventListener('push', e => {
  let data = { title: "L'Éveil ✦", body: 'Nouvelle notification', url: '/' };
  try { if (e.data) data = { ...data, ...e.data.json() }; } catch (_) {}
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body:     data.body,
      icon:     '/icon-192.png',
      badge:    '/icon-96.png',
      data:     { url: data.url },
      vibrate:  [100, 50, 100],
      tag:      data.tag || 'leveil-notif',
      renotify: true,
    })
  );
});

// ── NOTIFICATION CLICK ──
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if ('focus' in client) { client.navigate(url); return client.focus(); }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
