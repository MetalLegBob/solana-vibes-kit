# OC-052: NoSQL Injection via $where Clause

**Category:** Injection
**Severity:** CRITICAL
**Auditors:** INJ-01
**CWE:** CWE-943
**OWASP:** A03:2021 Injection

## Description

MongoDB's `$where` operator accepts a JavaScript function or string that is evaluated server-side against each document. When user input flows into a `$where` clause, it becomes a code injection vulnerability allowing arbitrary JavaScript execution within the MongoDB process.

This is far more dangerous than operator injection because `$where` provides full JavaScript execution context. An attacker can access internal MongoDB objects, enumerate collections, exfiltrate data from other collections, and in older MongoDB versions (before sandboxing improvements), potentially achieve denial of service or access system resources.

Even Mongoose's use of `$where` is dangerous because it simply passes the value to the underlying MongoDB driver. The fundamental problem is that `$where` evaluates strings as code, making any user input in this context equivalent to `eval()`.

## Detection

```
# Direct $where usage
\$where
\.find\(.*\$where
\.findOne\(.*\$where
# String concatenation with $where
"\$where":\s*["'].*\+
`\$where`.*\$\{
# Mongoose where with user input
\.where\(.*req\.(body|query|params)
```

## Vulnerable Code

```typescript
// VULNERABLE: User input in $where JavaScript expression
app.get('/search', async (req, res) => {
  const { minAge } = req.query;
  const users = await db.collection('users').find({
    $where: `this.age > ${minAge}`
  }).toArray();
  res.json(users);
});

// Attacker sends: minAge=0; sleep(10000)
// Or: minAge=0; return true  — returns all documents
// Or uses $where to enumerate other fields character by character

// Mongoose variant
app.get('/filter', async (req, res) => {
  const { condition } = req.query;
  const results = await User.find({
    $where: condition  // Direct user input as JS code
  });
  res.json(results);
});
```

## Secure Code

```typescript
// SAFE: Use standard query operators instead of $where
app.get('/search', async (req, res) => {
  const minAge = parseInt(req.query.minAge, 10);
  if (isNaN(minAge) || minAge < 0 || minAge > 150) {
    return res.status(400).json({ error: 'Invalid age' });
  }
  const users = await db.collection('users').find({
    age: { $gt: minAge }
  }).toArray();
  res.json(users);
});

// For complex queries, use aggregation pipeline
app.get('/filter', async (req, res) => {
  const results = await User.aggregate([
    { $match: buildSafeFilter(req.query) }
  ]);
  res.json(results);
});
```

## Impact

Arbitrary JavaScript execution within the MongoDB process. Data exfiltration from any collection, denial of service via `sleep()`, and enumeration of the entire database schema. In misconfigured environments, this can lead to broader system compromise.

## References

- CWE-943: Improper Neutralization of Special Elements in Data Query Logic
- MongoDB docs: $where operator security considerations
- OWASP: NoSQL Injection — server-side JavaScript injection
- SensePost: Getting rid of pre- and post-conditions in NoSQL injections (2025)
- PortSwigger Web Security Academy: NoSQL injection labs
