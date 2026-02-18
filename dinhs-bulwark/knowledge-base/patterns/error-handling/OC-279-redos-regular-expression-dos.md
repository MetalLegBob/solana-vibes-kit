# OC-279: ReDoS (Regular Expression DoS)

**Category:** Error Handling & Resilience
**Severity:** MEDIUM
**Auditors:** ERR-03
**CWE:** CWE-1333 (Inefficient Regular Expression Complexity)
**OWASP:** A10:2025 -- Mishandling of Exceptional Conditions

## Description

Regular Expression Denial of Service (ReDoS) occurs when a crafted input string causes a vulnerable regular expression to enter catastrophic backtracking, consuming exponential CPU time. Because Node.js is single-threaded, a single ReDoS-triggering request can freeze the entire server, blocking all other requests until the regex evaluation completes (which may take minutes or hours).

ReDoS vulnerabilities are alarmingly common in the JavaScript ecosystem. CVE-2024-21538 in the cross-spawn library (a dependency with 200+ million weekly downloads) had a ReDoS vulnerability due to improper input sanitization. CVE-2023-50249 in the Sentry JavaScript SDK had a ReDoS in its tracing module. CVE-2026-25547 in brace-expansion (used by minimatch, a core npm utility) showed how exponential growth in expansion attempts could crash Node.js processes. Stack Overflow went dark for 34 minutes due to a regex in 2016, and Cloudflare suffered a 27-minute outage in 2019 from a single regex rule.

The dangerous patterns are well-documented: nested quantifiers like `(a+)+`, alternation within repetition like `(a|aa)+`, and overlapping character classes like `([a-b]*[a-c]*)+`. The V8 engine introduced an opt-in non-backtracking regex engine in 2021, but it is not the default and does not support all regex features.

## Detection

```
grep -rn "new RegExp\|/.*[\+\*].*[\+\*]/" --include="*.ts" --include="*.js"
grep -rn "\.match\|\.test\|\.replace\|\.search\|\.split" --include="*.ts" --include="*.js" | grep "RegExp\|/.*/"
grep -rn "(\.\*)\+\|(\.+)\+\|(\[.*\])\+\.\*\1" --include="*.ts" --include="*.js"
grep -rn "new RegExp(.*\(req\.\|params\.\|query\.\|body\.\)" --include="*.ts" --include="*.js"
```

Look for: regexes with nested quantifiers `(.*)+`, `(a+)+`, `(a|a)+`, user input passed to `new RegExp()`, regexes without input length limits, regexes applied to untrusted data.

## Vulnerable Code

```typescript
import { Request, Response } from "express";

// VULNERABLE: Regex with nested quantifiers applied to user input
function validateEmail(email: string): boolean {
  // This regex has catastrophic backtracking on inputs like:
  // "aaaaaaaaaaaaaaaaaaaaaaaaaaa!"
  const emailRegex = /^([a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6})*$/;
  return emailRegex.test(email);
}

// VULNERABLE: User-controlled regex
app.get("/api/search", (req: Request, res: Response) => {
  const pattern = req.query.q as string;
  // Attacker controls the regex pattern directly
  const regex = new RegExp(pattern, "i");
  const results = data.filter((item) => regex.test(item.name));
  res.json(results);
});

// VULNERABLE: Complex regex on unbounded input
function extractUrls(text: string): string[] {
  // Overlapping groups cause exponential backtracking
  const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}(\.[a-zA-Z0-9()]{1,6})*\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
  return text.match(urlRegex) || [];
}
```

## Secure Code

```typescript
import { Request, Response } from "express";
import safeRegex from "safe-regex2";

// SECURE: Use a simple, non-backtracking email check
function validateEmail(email: string): boolean {
  // Limit input length first
  if (email.length > 254) return false;
  // Simple regex without nested quantifiers
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// SECURE: Never pass user input directly to RegExp
app.get("/api/search", (req: Request, res: Response) => {
  const query = req.query.q as string;
  if (!query || query.length > 100) {
    return res.status(400).json({ error: "Invalid search query" });
  }
  // Escape all regex special characters
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(escaped, "i");
  const results = data.filter((item) => regex.test(item.name));
  res.json(results);
});

// SECURE: Validate regex safety before use
function extractUrls(text: string): string[] {
  // Limit input length to prevent DoS
  const truncated = text.slice(0, 10_000);
  // Use a simpler pattern or a dedicated URL parser
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;

  // Optionally validate regex safety at startup
  if (!safeRegex(urlRegex)) {
    throw new Error("Unsafe regex detected");
  }

  return truncated.match(urlRegex) || [];
}

// SECURE: Use safe-regex2 in CI/CD or startup validation
function validateAllRegexes(patterns: RegExp[]) {
  for (const pattern of patterns) {
    if (!safeRegex(pattern)) {
      throw new Error(`Unsafe regex detected: ${pattern.source}`);
    }
  }
}
```

## Impact

A single ReDoS-triggering request can freeze a Node.js server for seconds to hours, causing a complete denial of service for all users. Because Node.js is single-threaded, there is no concurrency to fall back on -- every other request queues behind the stuck regex evaluation. In cloud environments, this can also trigger auto-scaling costs without resolving the underlying issue.

## References

- CWE-1333: Inefficient Regular Expression Complexity -- https://cwe.mitre.org/data/definitions/1333.html
- CVE-2024-21538: cross-spawn ReDoS vulnerability (200M+ weekly downloads)
- CVE-2023-50249: Sentry JavaScript SDK ReDoS
- CVE-2026-25547: brace-expansion ReDoS (exponential numeric ranges)
- Stack Overflow 34-minute outage caused by regex (2016)
- Cloudflare 27-minute outage caused by a WAF regex (2019)
- safe-regex2: Detect catastrophic regex patterns -- https://www.npmjs.com/package/safe-regex2
- Snyk Learn: ReDoS Tutorial -- https://learn.snyk.io/lesson/redos/
