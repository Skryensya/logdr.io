const CACHE_NAME = 'logdrio-pwa-v1';
const STATIC_CACHE_NAME = 'logdrio-static-v1';
const DYNAMIC_CACHE_NAME = 'logdrio-dynamic-v1';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/favicon.ico'
];

// API routes to cache with network-first strategy
const API_ROUTES = ['/api/'];

self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE_NAME).then(cache => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS).catch(error => {
          console.warn('Service Worker: Failed to cache some static assets:', error);
          // Continue with installation even if some assets fail
          return Promise.resolve();
        });
      }),
      // Cache offline page separately to avoid network requests
      caches.open(STATIC_CACHE_NAME).then(cache => {
        return fetch('/offline.html').then(response => {
          return cache.put('/offline.html', response);
        }).catch(() => {
          // Create a simple offline page if it doesn't exist
          const offlineResponse = new Response(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Sin conexión - Logdrio</title>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                         text-align: center; padding: 50px; background: #f5f5f5; }
                  .container { max-width: 400px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                  h1 { color: #333; margin-bottom: 20px; }
                  p { color: #666; line-height: 1.5; }
                </style>
              </head>
              <body>
                <div class="container">
                  <h1>Sin conexión a Internet</h1>
                  <p>No hay conexión disponible. Por favor verifica tu conexión e intenta de nuevo.</p>
                  <p>Algunas funciones pueden estar disponibles desde el cache.</p>
                </div>
              </body>
            </html>
          `, {
            headers: { 'Content-Type': 'text/html' }
          });
          return cache.put('/offline.html', offlineResponse);
        });
      })
    ]).then(() => {
      // Skip waiting to activate immediately
      self.skipWaiting();
    })
  );
});

self.addEventListener('activate', event => {
  console.log('Service Worker: Activated');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE_NAME && 
                cacheName !== DYNAMIC_CACHE_NAME &&
                cacheName !== CACHE_NAME) {
              console.log('Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all pages
      self.clients.claim()
    ])
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and chrome-extension requests
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return;
  }

  // Handle API routes with network-first strategy
  if (API_ROUTES.some(route => url.pathname.startsWith(route))) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Handle static assets with cache-first strategy
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirstStrategy(request));
    return;
  }

  // Handle navigation requests with network-first, fallback to offline page
  if (request.mode === 'navigate') {
    event.respondWith(navigationStrategy(request));
    return;
  }

  // Default: try network first, then cache
  event.respondWith(networkFirstStrategy(request));
});

// Cache-first strategy for static assets
async function cacheFirstStrategy(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Cache-first strategy failed:', error);
    return new Response('Asset not available offline', { status: 503 });
  }
}

// Network-first strategy for dynamic content and APIs
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Network failed, trying cache:', request.url);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If it's an API request, return a meaningful offline response
    if (request.url.includes('/api/')) {
      return new Response(
        JSON.stringify({ 
          error: 'Sin conexión', 
          message: 'Esta solicitud requiere conexión a internet',
          offline: true 
        }), 
        { 
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    throw error;
  }
}

// Navigation strategy for page requests
async function navigationStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Navigation request failed, checking cache');
    
    // Try to serve from cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fallback to offline page
    const offlinePage = await caches.match('/offline.html');
    if (offlinePage) {
      return offlinePage;
    }
    
    // Last resort: basic offline message
    return new Response('Página no disponible sin conexión', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}

// Helper function to identify static assets
function isStaticAsset(url) {
  return url.pathname.startsWith('/_next/static/') ||
         url.pathname.startsWith('/static/') ||
         url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/);
}

// Background sync for offline actions (optional enhancement)
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // This could be used to sync offline transactions or other data
  console.log('Service Worker: Background sync triggered');
}