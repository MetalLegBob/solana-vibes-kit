# OC-083: DOM-based XSS

**Category:** Web Application Security
**Severity:** MEDIUM
**Auditors:** WEB-01
**CWE:** CWE-79
**OWASP:** A03:2021 - Injection

## Description

DOM-based XSS occurs entirely within the browser when client-side JavaScript reads data from an attacker-controllable source (URL fragment, `document.referrer`, `window.name`, `postMessage`) and passes it to a dangerous sink (`innerHTML`, `eval()`, `document.write()`, `location.href`) without sanitization. Unlike reflected or stored XSS, the malicious payload never reaches the server, making it invisible to server-side WAFs and logging.

Modern Single Page Applications (SPAs) are especially vulnerable because they perform extensive client-side rendering and URL parsing. Common attack vectors include hash-based routing where the fragment is directly injected into the DOM, search parameters parsed client-side and rendered as HTML, and third-party widget callbacks that write to `document.write` or `innerHTML`.

The emergence of client-side template injection in frameworks like AngularJS (via `{{constructor.constructor('alert(1)')()}}`) represents a specialized form of DOM XSS that exploits template expression evaluation.

## Detection

```
# Dangerous DOM sinks with potential tainted sources
grep -rn "document\.write\|\.innerHTML\s*=" --include="*.ts" --include="*.js"
grep -rn "eval\s*(\|setTimeout\s*(\|setInterval\s*(\|new\s*Function\s*(" --include="*.ts" --include="*.js"
grep -rn "location\.hash\|location\.search\|document\.referrer\|window\.name" --include="*.ts" --include="*.js"

# jQuery sinks
grep -rn "\\$(\|\.html(\|\.append(\|\.prepend(" --include="*.ts" --include="*.js"

# URL fragment used in rendering
grep -rn "window\.location\.hash" --include="*.ts" --include="*.js" --include="*.tsx"
```

## Vulnerable Code

```typescript
// Client-side search page that parses URL parameters
function initSearch() {
  const params = new URLSearchParams(window.location.search);
  const query = params.get('q') || '';

  // VULNERABLE: URL parameter injected directly into DOM
  const resultsDiv = document.getElementById('search-results');
  resultsDiv!.innerHTML = `<h2>Results for: ${query}</h2>`;
}

// Hash-based tab navigation
function loadTab() {
  const tabName = window.location.hash.substring(1);
  // VULNERABLE: Hash fragment used as HTML content
  document.getElementById('tab-title')!.innerHTML = tabName;
}

// Dynamic script loading from URL parameter
function loadWidget() {
  const params = new URLSearchParams(window.location.search);
  const widgetUrl = params.get('widget');
  // VULNERABLE: Arbitrary script loading
  if (widgetUrl) {
    eval(`import("${widgetUrl}")`);
  }
}
```

## Secure Code

```typescript
// Secure search page using textContent instead of innerHTML
function initSearch() {
  const params = new URLSearchParams(window.location.search);
  const query = params.get('q') || '';

  const heading = document.createElement('h2');
  // SECURE: textContent auto-escapes HTML entities
  heading.textContent = `Results for: ${query}`;
  document.getElementById('search-results')!.appendChild(heading);
}

// Secure hash-based navigation with allowlist
function loadTab() {
  const allowedTabs = ['overview', 'settings', 'history'];
  const tabName = window.location.hash.substring(1);

  if (allowedTabs.includes(tabName)) {
    document.getElementById('tab-title')!.textContent = tabName;
  }
}

// Widget loading from allowlisted URLs only
const ALLOWED_WIDGETS = new Set([
  'https://cdn.example.com/widget-a.js',
  'https://cdn.example.com/widget-b.js',
]);

function loadWidget() {
  const params = new URLSearchParams(window.location.search);
  const widgetUrl = params.get('widget');
  if (widgetUrl && ALLOWED_WIDGETS.has(widgetUrl)) {
    import(widgetUrl);
  }
}
```

## Impact

DOM-based XSS enables session hijacking, keylogging, phishing overlay injection, and cryptocurrency address replacement in wallet interfaces. Because the payload is in the URL fragment, it can bypass server-side logging, making forensic analysis difficult.

## References

- CWE-79: Improper Neutralization of Input During Web Page Generation
- OWASP DOM-based XSS: https://owasp.org/www-community/attacks/DOM_Based_XSS
- PortSwigger Research: DOM-based XSS in modern web applications
- "Why React Didn't Kill XSS" -- The Hacker News (2025)
