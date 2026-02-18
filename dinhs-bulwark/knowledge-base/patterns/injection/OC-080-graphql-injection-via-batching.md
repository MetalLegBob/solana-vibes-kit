# OC-080: GraphQL Injection via Batching

**Category:** Injection
**Severity:** MEDIUM
**Auditors:** INJ-01, API-02
**CWE:** CWE-770
**OWASP:** A03:2021 Injection

## Description

GraphQL batching injection exploits the ability to send multiple queries or mutations in a single HTTP request. Attackers can use batching to bypass rate limiting, brute-force authentication, enumerate data, or amplify resource consumption. Some GraphQL servers accept arrays of queries, executing all of them as a single request that is only counted once against rate limits.

There are two main attack vectors: query batching (sending multiple operations in one request) and alias-based batching (using GraphQL aliases to repeat the same field many times in a single query). Alias batching is particularly dangerous because it works even when array batching is disabled.

For example, an attacker can brute-force login credentials by sending 1000 `login` mutations with different passwords in a single request using aliases: `attempt1: login(password: "pass1") { token } attempt2: login(password: "pass2") { token } ...`. This bypasses per-request rate limiting and makes brute-force attacks practical.

## Detection

```
# GraphQL batch endpoint handling
app\.(post|get)\(.*graphql
# Array body parsing for batch queries
Array\.isArray\(req\.body\)
\.map\(.*query
# Missing batch limits
graphql.*batch
# Apollo/Express GraphQL without batch controls
ApolloServer
graphqlHTTP
# Rate limiting only on HTTP requests, not query count
rateLimit.*graphql
```

## Vulnerable Code

```typescript
import { ApolloServer } from '@apollo/server';

// VULNERABLE: No batch limits
const server = new ApolloServer({
  typeDefs,
  resolvers,
  // Default: allows unlimited batched queries
});

// VULNERABLE: Custom handler accepting batch queries
app.post('/graphql', async (req, res) => {
  const queries = Array.isArray(req.body) ? req.body : [req.body];
  // No limit on batch size — attacker sends 10000 queries
  const results = await Promise.all(
    queries.map(q => graphql(schema, q.query, null, context, q.variables))
  );
  res.json(results);
});

// Alias-based brute force in a single query:
// query {
//   a1: login(email: "admin@x.com", password: "pass1") { token }
//   a2: login(email: "admin@x.com", password: "pass2") { token }
//   ...
//   a1000: login(email: "admin@x.com", password: "pass1000") { token }
// }
```

## Secure Code

```typescript
import { ApolloServer } from '@apollo/server';
import depthLimit from 'graphql-depth-limit';
import costAnalysis from 'graphql-cost-analysis';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  // SAFE: Disable batching or set strict limits
  allowBatchedHttpRequests: false,
  validationRules: [
    depthLimit(5),
    costAnalysis({ maximumCost: 1000 })
  ]
});

// SAFE: If batching is needed, limit batch size
app.post('/graphql', async (req, res) => {
  const queries = Array.isArray(req.body) ? req.body : [req.body];

  // Limit batch size
  if (queries.length > 5) {
    return res.status(400).json({ error: 'Batch limit exceeded' });
  }

  // Count aliases in each query to prevent alias-based batching
  for (const q of queries) {
    const aliasCount = countAliases(q.query);
    if (aliasCount > 10) {
      return res.status(400).json({ error: 'Too many aliases' });
    }
  }

  const results = await Promise.all(
    queries.map(q => graphql(schema, q.query, null, context, q.variables))
  );
  res.json(results);
});

// Rate limit per-mutation, not per-request
// Track login attempts by IP regardless of batching
```

## Impact

Brute-force authentication bypass via batched login mutations. Rate limit evasion for enumeration attacks. Resource exhaustion via amplified query execution. Data harvesting at scale in a single request.

## References

- CWE-770: Allocation of Resources Without Limits or Throttling
- OWASP: GraphQL Security Cheat Sheet
- PortSwigger: GraphQL API vulnerabilities — batching attacks
- Apollo Server docs: Batched HTTP Requests configuration
- GraphQL spec: Query batching behavior
