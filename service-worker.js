// Service Worker для "Приключения Малыша" PWA
// Версия: 2.0
// Дата: 07.01.2026

const CACHE_NAME = 'baby-adventure-v2.0';
const RUNTIME_CACHE = 'baby-adventure-runtime';

// Файлы для кэширования при установке
const STATIC_ASSETS = [
  './',
  './index.html',
  'data:application/manifest+json,{"name":"Приключения Малыша","short_name":"Малыш","description":"Развивающая игра для детей 2-3 лет с 6 развивающими мини-играми","start_url":"./index.html","scope":"./","display":"standalone","orientation":"portrait-primary","background_color":"#FFF5F7","theme_color":"#FF69B4"}'
];

// ==================== СОБЫТИЕ УСТАНОВКИ ====================
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Opened cache:', CACHE_NAME);
        // Кэшируем основные файлы
        return Promise.all(
          STATIC_ASSETS.map(url => {
            return cache.add(url).catch(() => {
              console.log('[Service Worker] Could not cache:', url);
            });
          })
        );
      })
      .then(() => {
        console.log('[Service Worker] Installation complete');
        return self.skipWaiting(); // Сразу активируем новый SW
      })
      .catch(error => {
        console.error('[Service Worker] Installation error:', error);
      })
  );
});

// ==================== СОБЫТИЕ АКТИВАЦИИ ====================
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Удаляем старые версии кэша
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
      .then(() => {
        console.log('[Service Worker] Activation complete');
        return self.clients.claim(); // Берём контроль над всеми клиентами
      })
  );
});

// ==================== ОБРАБОТКА ЗАПРОСОВ ====================
self.addEventListener('fetch', event => {
  // Игнорируем не-GET запросы
  if (event.request.method !== 'GET') {
    return;
  }

  // Стратегия: Cache First, Fall back to Network
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Если найдено в кэше, возвращаем
        if (response) {
          console.log('[Service Worker] Serving from cache:', event.request.url);
          return response;
        }

        // Если не в кэше, пытаемся загрузить с сервера
        return fetch(event.request)
          .then(response => {
            // Проверяем, что ответ валиден
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Клонируем ответ
            const responseToCache = response.clone();

            // Кэшируем новый ресурс (только для GET)
            caches.open(RUNTIME_CACHE)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // Если нет интернета и нет в кэше, возвращаем страницу
            return caches.match('./index.html');
          });
      })
  );
});

// ==================== ОБРАБОТКА СООБЩЕНИЙ ====================
self.addEventListener('message', event => {
  console.log('[Service Worker] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ==================== ПЕРИОДИЧЕСКАЯ СИНХРОНИЗАЦИЯ ====================
// Синхронизация прогресса при возврате в сеть
self.addEventListener('sync', event => {
  if (event.tag === 'sync-progress') {
    event.waitUntil(
      // Здесь можно добавить логику синхронизации прогресса
      Promise.resolve()
    );
  }
});

// ==================== PUSH УВЕДОМЛЕНИЯ ====================
// Обработка push-уведомлений
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'Молодец! Продолжай играть!',
    icon: 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 192 192%27%3E%3Crect fill=%27%23FF69B4%27 width=%27192%27 height=%27192%27/%3E%3Ctext x=%2796%27 y=%27140%27 font-size=%27120%27 text-anchor=%27middle%27%3E🎮%3C/text%3E%3C/svg%3E',
    badge: 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 96 96%27%3E%3Crect fill=%27%23FF69B4%27 width=%2796%27 height=%2796%27/%3E%3Ctext x=%2748%27 y=%2770%27 font-size=%2760%27 text-anchor=%27middle%27%3E🎮%3C/text%3E%3C/svg%3E',
    tag: 'baby-adventure',
    requireInteraction: false
  };

  event.waitUntil(
    self.registration.showNotification('Приключения Малыша', options)
  );
});

// Обработка клика на уведомление
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then(clientList => {
        // Проверяем, открыто ли окно приложения
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === './' && 'focus' in client) {
            return client.focus();
          }
        }
        // Если не открыто, открываем новое окно
        if (clients.openWindow) {
          return clients.openWindow('./');
        }
      })
  );
});

// ==================== ЛОГИРОВАНИЕ ====================
console.log('[Service Worker] Script loaded');
