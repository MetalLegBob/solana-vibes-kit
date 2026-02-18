# OC-074: Client-Side Template Injection

**Category:** Injection
**Severity:** MEDIUM
**Auditors:** INJ-06, WEB-01
**CWE:** CWE-79
**OWASP:** A03:2021 Injection

## Description

Client-side template injection (CSTI) occurs when user input is rendered within a client-side template engine (AngularJS, Vue.js, or other frameworks using double-curly-brace syntax `{{ }}`) without proper escaping. Unlike server-side template injection, CSTI executes in the victim's browser, making it a specialized form of cross-site scripting (XSS).

AngularJS applications are particularly vulnerable because AngularJS evaluates expressions inside `{{ }}` in the DOM. An attacker who can inject `{{constructor.constructor('alert(1)')()}}` into a page that uses AngularJS will achieve JavaScript execution. Vue.js's `v-html` directive renders raw HTML and is a common CSTI vector.

Modern frameworks like React and Vue 3 are more resistant because they escape interpolated content by default, but developers can still introduce CSTI through `dangerouslySetInnerHTML` (React), `v-html` (Vue), or `[innerHTML]` binding (Angular). Server-side rendering (SSR) can also introduce CSTI if user input flows into template expressions before client-side hydration.

## Detection

```
# AngularJS expression injection
ng-app
ng-bind-html
\{\{.*constructor
\{\{.*\$eval
# Vue.js dangerous rendering
v-html
# React dangerous rendering
dangerouslySetInnerHTML
# Angular innerHTML binding
\[innerHTML\]
# User input in template context
\{\{.*req\.
\{\{.*params\.
\{\{.*query\.
```

## Vulnerable Code

```typescript
// VULNERABLE: Server renders user input into AngularJS template
app.get('/profile', (req, res) => {
  const { bio } = req.query;
  // AngularJS evaluates {{ }} in the rendered HTML
  res.send(`
    <div ng-app>
      <h1>User Profile</h1>
      <p>${bio}</p>
    </div>
  `);
  // Attacker: ?bio={{constructor.constructor('alert(document.cookie)')()}}
});

// VULNERABLE: Vue.js v-html with user input
// In Vue component:
// <div v-html="userBio"></div>
// If userBio contains <img src=x onerror=alert(1)>
```

## Secure Code

```typescript
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const purify = DOMPurify(window);

// SAFE: Sanitize user input before rendering
app.get('/profile', (req, res) => {
  const { bio } = req.query;
  const safeBio = purify.sanitize(bio);
  res.render('profile', { bio: safeBio });
});

// SAFE: Vue.js — use text interpolation, not v-html
// <div>{{ userBio }}</div>  <!-- Auto-escaped -->

// SAFE: React — use JSX text, not dangerouslySetInnerHTML
// <p>{userBio}</p>  /* Auto-escaped */

// If v-html is needed, sanitize first
// <div v-html="sanitizedBio"></div>
// computed: { sanitizedBio() { return DOMPurify.sanitize(this.userBio) } }
```

## Impact

Cross-site scripting (XSS) in the victim's browser. Cookie theft, session hijacking, keylogging, phishing, and actions performed as the victim user. Less severe than SSTI because execution is client-side.

## References

- CWE-79: Improper Neutralization of Input During Web Page Generation
- PortSwigger: Client-side template injection
- AngularJS sandbox escapes: multiple CVEs in AngularJS expression sandbox
- OWASP: Cross-site Scripting (XSS)
- Vue.js security: v-html warning in official documentation
