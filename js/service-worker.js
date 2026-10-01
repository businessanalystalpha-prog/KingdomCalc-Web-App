const CACHE_NAME = 'tithes-app-v2';
const ASSETS_TO_CACHE = [
  './',
  './intro.html',
  './index.html',
  './components.css',
  './intro.css',
  './layout.css',
  './screens.css',
  './variables.css',
  './app.js',
  './calc.js',
  './dashboard_charts.js',
  './dashboard.js',
  './history.js',
  './intro.js',
  './modal.js',
  './reminder.js',
  './logo.svg',
  './manifest.json'
];

// Install Event - Caching App Shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[Service Worker] Caching all app shell assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event - Cleaning old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - Network with Cache Fallback Strategy
self.addEventListener('fetch', event => {
  // Huwag i-cache ang POST requests (gaya ng Google Sheets API calls)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // I-update ang cache kapag may bagong makuha mula sa network
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => {
        // Kapag offline, kukunin mula sa cache
        return caches.match(event.request);
      })
  );
});

// ==========================================
// NOTIFICATION CLICK & PUSH HANDLERS FOR MOBILE
// ==========================================

// Pag-click sa Notification Card sa Mobile Phone
self.addEventListener('notificationclick', event => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // Kung nakabukas na ang tab ng app, i-focus ito
      for (const client of clientList) {
        if (client.url.includes('index.html') && 'focus' in client) {
          return client.focus();
        }
      }
      // Kung sarado ang tab, buksan ang app
      if (clients.openWindow) {
        return clients.openWindow('./index.html');
      }
    })
  );
});

// Handling Web Push Notifications (kung ikakabit sa hinaharap)
self.addEventListener('push', event => {
  let data = { title: 'Giving Reminder', body: 'It is time for your scheduled giving!' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: 'logo.svg',
    badge: 'logo.svg',
    vibrate: [200, 100, 200],
    tag: 'giving-reminder',
    data: { url: './index.html' }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});