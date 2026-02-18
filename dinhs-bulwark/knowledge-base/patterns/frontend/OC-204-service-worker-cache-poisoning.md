# OC-204: Service Worker Cache Poisoning

**Category:** Frontend & Client
**Severity:** MEDIUM
**Auditors:** FE-01
**CWE:** CWE-349
**OWASP:** A08:2021 - Software and Data Integrity Failures

## Description

Service workers are powerful client-side scripts that intercept network requests and manage cached responses for offline functionality and performance optimization. The Cache API allows service workers to store and serve responses without hitting the network. If an attacker can poison the service worker cache -- typically by exploiting an XSS vulnerability -- they can serve malicious content persistently, even after the original XSS vector is removed.

Research by Squarcina et al. (2021, IEEE WOOT) demonstrated the "sw-cache-attack": a traditional XSS attack can abuse the Cache API to escalate into a person-in-the-middle attack against cached content. The attack is remarkable because it persists beyond the XSS -- once the cache is poisoned, the malicious content is served from the local cache on every subsequent visit until the service worker is explicitly unregistered or the cache is cleared. The researchers found that the large majority of sites using service workers with the Cache API were vulnerable.

In Solana dApp frontends, service workers may cache HTML pages, JavaScript bundles, API responses, and static assets. A poisoned cache could serve a modified version of the dApp that replaces wallet connection logic, modifies transaction construction code, or injects a fake signing interface that captures user approvals while executing different transactions.

## Detection

```
# Service worker registration
grep -rn "serviceWorker\.register\|navigator\.serviceWorker" --include="*.ts" --include="*.tsx" --include="*.js"

# Cache API usage in service workers
grep -rn "caches\.open\|cache\.put\|cache\.addAll\|cache\.match" --include="*.js" --include="*.ts"

# Service worker fetch event handlers
grep -rn "addEventListener.*fetch\|self\.onfetch" --include="*.js" --include="*.ts"

# next-pwa or workbox configuration
grep -rn "next-pwa\|workbox\|GenerateSW\|InjectManifest" --include="*.js" --include="*.ts" --include="*.json"

# Check if responses are validated before caching
grep -rn "cache\.put\|caches\.put" --include="*.js" | grep -v "response\.ok\|response\.status"
```

## Vulnerable Code

```typescript
// Service worker that caches everything without validation
// sw.js
self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open('app-cache-v1').then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/static/js/main.js',
        '/static/js/wallet-adapter.js',  // Wallet connection code cached
        '/api/config',                    // API config cached
      ]);
    }),
  );
});

self.addEventListener('fetch', (event: FetchEvent) => {
  // VULNERABLE: Cache-first strategy with no integrity validation
  event.respondWith(
    caches.match(event.request).then((cached) => {
      // Returns cached version even if it was poisoned via XSS
      return cached || fetch(event.request).then((response) => {
        // VULNERABLE: Caches any response, including error/malicious responses
        const clone = response.clone();
        caches.open('app-cache-v1').then((cache) => cache.put(event.request, clone));
        return response;
      });
    }),
  );
});
```

## Secure Code

```typescript
// Service worker with cache integrity protections
// sw.js
const CACHE_VERSION = 'app-cache-v2';
const CACHED_URLS = ['/', '/index.html', '/static/js/main.js'];

// Use a content hash map for integrity verification
const INTEGRITY_MAP: Record<string, string> = {
  '/static/js/main.js': 'sha384-expectedHashHere',
  '/static/js/wallet-adapter.js': 'sha384-expectedHashHere',
};

self.addEventListener('fetch', (event: FetchEvent) => {
  // SECURE: Network-first for HTML and API routes (always fresh)
  if (event.request.mode === 'navigate' ||
      event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Only cache successful responses
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache only when network fails
          return caches.match(event.request) as Promise<Response>;
        }),
    );
    return;
  }

  // Static assets: cache-first but with version-based cache busting
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        if (response.ok && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    }),
  );
});

// Purge old caches on activation
self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))),
    ),
  );
});
```

## Impact

A poisoned service worker cache serves malicious content persistently -- surviving page refreshes, browser restarts, and even patching of the original XSS vulnerability. In a dApp context, the attacker can serve a modified frontend that intercepts wallet interactions, modifies transaction parameters, or presents a convincing phishing interface. The attack persists until the user manually clears site data or the service worker is updated.

## References

- Squarcina et al.: "The Remote on the Local: Exacerbating Web Attacks Via Service Workers Caches" (IEEE WOOT 2021)
- CWE-349: Acceptance of Extraneous Untrusted Data With Trusted Data
- MDN: Service Worker API -- Security considerations
- Google: "Service Workers: an Introduction" -- Lifecycle and Cache Management
- OWASP: Progressive Web App Security Testing Guide
