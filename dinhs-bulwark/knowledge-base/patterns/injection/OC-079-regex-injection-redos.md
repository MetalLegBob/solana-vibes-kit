# OC-079: Regex Injection (ReDoS)

**Category:** Injection
**Severity:** MEDIUM
**Auditors:** INJ-02, ERR-03
**CWE:** CWE-1333
**OWASP:** A03:2021 Injection

## Description

Regular Expression Denial of Service (ReDoS) occurs when a user-controlled input triggers catastrophic backtracking in a regular expression, causing the regex engine to consume excessive CPU time. JavaScript's regex engine uses backtracking (NFA-based), making it vulnerable to patterns with nested quantifiers, overlapping alternations, or ambiguous repetitions.

ReDoS can also occur when user input is used to construct a regex pattern directly (regex injection). An attacker can inject regex metacharacters to create a malicious pattern, or provide a crafted input string that triggers exponential backtracking in a vulnerable pattern.

The pattern `(a+)+$` is the classic example: matching against `"aaaaaaaaaaaaaaaaab"` causes 2^n backtracking steps. Real-world examples include email validation regexes, URL parsers, and user input sanitization patterns. Multiple npm packages have been found vulnerable to ReDoS including `ua-parser-js`, `marked`, `trim`, and `semver`.

## Detection

```
# User input in RegExp constructor
new RegExp\(.*req\.(body|query|params)
RegExp\(.*req\.
# Vulnerable regex patterns (nested quantifiers)
\(.*\+\).*\+
\(.*\*\).*\*
\(.*\+\).*\*
# Common vulnerable patterns
\(\.\*\)\+
\[^\\s\]\+\)\+
\(\w\+\)\+
# String methods with regex from user input
\.match\(new RegExp
\.replace\(new RegExp
\.search\(new RegExp
```

## Vulnerable Code

```typescript
// VULNERABLE: User input in RegExp constructor
app.get('/search', (req, res) => {
  const { pattern } = req.query;
  // Attacker: ?pattern=(a+)+$ with input "aaaaaaaaaaaab"
  const regex = new RegExp(pattern, 'i');
  const results = items.filter(item => regex.test(item.name));
  res.json(results);
});

// VULNERABLE: Regex with nested quantifiers on user input
function validateEmail(email: string): boolean {
  // Catastrophic backtracking on long inputs
  const regex = /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/;
  return regex.test(email);
}

// VULNERABLE: Pattern-based search without escaping
app.get('/filter', (req, res) => {
  const { q } = req.query;
  const regex = new RegExp(q); // Unescaped — q could be "(.*a){20}"
  const matches = data.filter(d => regex.test(d.title));
  res.json(matches);
});
```

## Secure Code

```typescript
import { RE2 } from 're2';

// SAFE: Escape user input before using in regex
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

app.get('/search', (req, res) => {
  const { pattern } = req.query;
  // SAFE: Escape regex metacharacters
  const safePattern = escapeRegex(pattern);
  const regex = new RegExp(safePattern, 'i');
  const results = items.filter(item => regex.test(item.name));
  res.json(results);
});

// SAFE: Use RE2 for user-controlled patterns (linear time guarantee)
app.get('/advanced-search', (req, res) => {
  const { pattern } = req.query;
  try {
    const regex = new RE2(pattern, 'i'); // RE2 prevents backtracking
    const results = items.filter(item => regex.test(item.name));
    res.json(results);
  } catch {
    res.status(400).json({ error: 'Invalid pattern' });
  }
});

// SAFE: Use simple string methods instead of regex for basic search
app.get('/filter', (req, res) => {
  const { q } = req.query;
  const lower = q.toLowerCase();
  const matches = data.filter(d => d.title.toLowerCase().includes(lower));
  res.json(matches);
});
```

## Impact

Denial of service via CPU exhaustion. A single malicious request can block the Node.js event loop for seconds or minutes, causing the entire application to become unresponsive. In single-threaded Node.js, this affects all concurrent requests.

## References

- CWE-1333: Inefficient Regular Expression Complexity
- OWASP: Regular expression Denial of Service (ReDoS)
- Snyk: ReDoS vulnerabilities in npm packages
- npm advisories: ua-parser-js, marked, semver ReDoS CVEs
- Google RE2 library: linear-time regex matching
