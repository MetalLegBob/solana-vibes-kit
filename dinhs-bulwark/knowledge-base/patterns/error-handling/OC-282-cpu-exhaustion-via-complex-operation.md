# OC-282: CPU Exhaustion via Complex Operation

**Category:** Error Handling & Resilience
**Severity:** MEDIUM
**Auditors:** ERR-03
**CWE:** CWE-407 (Inefficient Algorithmic Complexity)
**OWASP:** A10:2025 -- Mishandling of Exceptional Conditions

## Description

CPU exhaustion via complex operation occurs when an attacker can trigger computationally expensive operations on the server by providing carefully crafted input. In single-threaded Node.js, any CPU-bound operation blocks the event loop, freezing all request handling. Unlike ReDoS (OC-279) which specifically targets regex backtracking, this pattern covers all forms of algorithmic complexity abuse: deeply nested JSON parsing, expensive sorting or searching on large datasets, recursive operations on user-controlled data, and CPU-heavy cryptographic operations triggered per-request.

Common attack vectors include: sending deeply nested JSON objects (each nesting level multiplies parsing cost), requesting sorted/filtered results on enormous datasets without pagination, triggering expensive cryptographic operations (bcrypt with extreme rounds), or exploiting recursive algorithms with user-controlled depth. Node.js applications that perform image processing, PDF generation, or data transformation on user-supplied input are particularly vulnerable.

The key insight is that Node.js has no built-in mechanism to preempt long-running synchronous code. A single request that triggers a 10-second CPU-bound operation makes the server unresponsive for 10 seconds for all users. This asymmetry -- one cheap request causes disproportionate server-side cost -- is the definition of an algorithmic complexity attack.

## Detection

```
grep -rn "JSON\.parse\|JSON\.stringify" --include="*.ts" --include="*.js" | grep -v "limit\|maxDepth"
grep -rn "\.sort(\|\.reduce(\|\.map(" --include="*.ts" --include="*.js" -B 5 | grep "req\.\|params\.\|query\."
grep -rn "bcrypt\.\|pbkdf2\|scrypt" --include="*.ts" --include="*.js" | grep -v "worker\|thread"
grep -rn "recursive\|recursion\|recurse" --include="*.ts" --include="*.js"
grep -rn "while.*true\|for.*length" --include="*.ts" --include="*.js" | grep -v "break\|limit\|max"
```

Look for: unbounded loops or recursion on user-controlled input, sorting or filtering large datasets without limits, CPU-heavy operations (crypto, image processing) on the main thread, `JSON.parse()` on unbounded input without depth limits.

## Vulnerable Code

```typescript
import { Request, Response } from "express";

// VULNERABLE: Sort and filter on entire dataset per request
app.get("/api/products", async (req, res) => {
  const { sortBy, filterBy, filterValue } = req.query;
  // Loads ALL products into memory, then sorts and filters
  const products = await db.query("SELECT * FROM products"); // Could be millions

  let result = products;
  if (filterBy && filterValue) {
    result = result.filter((p) => p[filterBy as string] === filterValue);
  }
  if (sortBy) {
    result.sort((a, b) => a[sortBy as string] - b[sortBy as string]);
  }
  res.json(result); // Serializing millions of objects blocks event loop
});

// VULNERABLE: Recursive operation on user-controlled data structure
app.post("/api/transform", (req, res) => {
  // Deeply nested JSON: { a: { a: { a: { ... } } } } with 10000 levels
  // causes stack overflow or extreme CPU during recursive traversal
  const result = deepTransform(req.body);
  res.json(result);
});

function deepTransform(obj: any): any {
  if (typeof obj !== "object" || obj === null) return obj;
  const result: any = {};
  for (const key of Object.keys(obj)) {
    result[key.toUpperCase()] = deepTransform(obj[key]); // No depth limit
  }
  return result;
}
```

## Secure Code

```typescript
import { Request, Response } from "express";

// SECURE: Database-side pagination, sorting, and filtering
app.get("/api/products", async (req, res) => {
  const { sortBy, filterBy, filterValue } = req.query;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
  const offset = (page - 1) * limit;

  // Whitelist allowed sort/filter fields
  const allowedSortFields = ["name", "price", "created_at"];
  const allowedFilterFields = ["category", "brand"];

  const sortField = allowedSortFields.includes(sortBy as string) ? sortBy : "created_at";
  const filterField = allowedFilterFields.includes(filterBy as string) ? filterBy : null;

  let query = "SELECT * FROM products";
  const params: any[] = [];

  if (filterField && filterValue) {
    query += ` WHERE ${filterField} = $${params.length + 1}`;
    params.push(filterValue);
  }

  query += ` ORDER BY ${sortField} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  const products = await db.query(query, params);
  res.json({ data: products, page, limit });
});

// SECURE: Depth-limited recursive operation
app.post("/api/transform", (req, res) => {
  try {
    const result = deepTransform(req.body, 0, 10); // Max depth of 10
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: "Input too deeply nested" });
  }
});

function deepTransform(obj: any, depth: number, maxDepth: number): any {
  if (depth > maxDepth) {
    throw new Error("Maximum nesting depth exceeded");
  }
  if (typeof obj !== "object" || obj === null) return obj;
  const result: any = {};
  const keys = Object.keys(obj).slice(0, 100); // Limit number of keys
  for (const key of keys) {
    result[key.toUpperCase()] = deepTransform(obj[key], depth + 1, maxDepth);
  }
  return result;
}
```

## Impact

An attacker can freeze the Node.js event loop by triggering expensive computations, causing a denial of service for all users. Since Node.js is single-threaded, even a single CPU-bound request lasting 5-10 seconds makes the server completely unresponsive. This is cheap for the attacker (one HTTP request) but devastating for the service.

## References

- CWE-407: Inefficient Algorithmic Complexity -- https://cwe.mitre.org/data/definitions/407.html
- OWASP A10:2025 -- Mishandling of Exceptional Conditions
- CWE-776: Improper Restriction of Recursive Entity References in DTDs ('XML Entity Expansion')
- Node.js documentation: Don't Block the Event Loop -- https://nodejs.org/en/learn/asynchronous-work/dont-block-the-event-loop
- Snyk: Algorithmic Complexity Attacks in Node.js
