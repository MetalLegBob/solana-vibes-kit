# OC-138: GraphQL Batching Attack

**Category:** API & Network
**Severity:** HIGH
**Auditors:** API-02
**CWE:** CWE-799, CWE-307
**OWASP:** API4:2023 - Unrestricted Resource Consumption

## Description

GraphQL supports two forms of batching that attackers exploit: query batching (sending an array of operations in a single HTTP request) and alias-based batching (repeating the same operation with different aliases within a single query). Both techniques allow attackers to bypass rate limiting, brute-force authentication, enumerate data, and cause resource exhaustion while appearing as a single HTTP request.

With query batching, a client sends `[{ query: "..." }, { query: "..." }, ...]` as a JSON array, and the server executes all operations. With alias-based batching, a client sends a single query like `{ a1: login(user: "admin", pass: "123") a2: login(user: "admin", pass: "456") ... }` with hundreds of aliases. Most rate limiters count HTTP requests, not individual GraphQL operations, so both techniques bypass per-request rate limits entirely.

The GraphQL security community considers batching attacks a top-tier threat. AFINE's 2025 pentesting guide specifically demonstrated how alias-based batching enables brute-force attacks against login mutations, and the technique has been used in bug bounty reports against major platforms including Shopify and GitHub. The OWASP GraphQL Cheat Sheet recommends either disabling batching entirely or imposing strict per-operation limits.

## Detection

```
# Check if batching is disabled or limited
grep -rn "allowBatchedHttpRequests\|batch\|batching" --include="*.ts" --include="*.js"
# Apollo Server v4 batching config
grep -rn "ApolloServer" --include="*.ts" --include="*.js"
# Check for alias count limiting
grep -rn "alias\|maxAliases\|aliasLimit" --include="*.ts" --include="*.js"
# Check for operation count limiting
grep -rn "maxOperations\|operationLimit\|batchLimit" --include="*.ts" --include="*.js"
# Rate limiting that only counts HTTP requests (misses batched ops)
grep -rn "rateLimit.*req\." --include="*.ts" --include="*.js"
```

## Vulnerable Code

```typescript
import { ApolloServer } from '@apollo/server';

// VULNERABLE: Batching enabled, no operation limits
const server = new ApolloServer({
  typeDefs,
  resolvers,
  allowBatchedHttpRequests: true, // Explicitly enabled
});

// VULNERABLE: Rate limiting counts HTTP requests, not operations
import rateLimit from 'express-rate-limit';
app.use('/graphql', rateLimit({
  windowMs: 60000,
  max: 100, // 100 HTTP requests per minute
  // But each request can contain 1000 batched operations
}));

// Attacker sends a single request with 1000 login attempts:
// [
//   { "query": "mutation { login(user:\"admin\", pass:\"aaa\") { token } }" },
//   { "query": "mutation { login(user:\"admin\", pass:\"aab\") { token } }" },
//   ... 998 more
// ]
```

## Secure Code

```typescript
import { ApolloServer } from '@apollo/server';

// SECURE: Disable batching or set strict limits
const server = new ApolloServer({
  typeDefs,
  resolvers,
  allowBatchedHttpRequests: false, // Disable query batching entirely
});

// If batching is needed, limit it:
import { ApolloServerPluginUsageReporting } from '@apollo/server/plugin/usageReporting';

// Custom plugin to limit operations per request
const batchLimitPlugin = {
  async requestDidStart() {
    return {
      async didResolveOperation(requestContext) {
        // Count aliases in the operation
        const aliasCount = countAliases(requestContext.document);
        if (aliasCount > 10) {
          throw new GraphQLError('Too many aliases in a single query', {
            extensions: { code: 'QUERY_TOO_COMPLEX' },
          });
        }
      },
    };
  },
};

// Custom middleware to limit batch array size
function limitBatchSize(maxBatch: number) {
  return (req, res, next) => {
    if (Array.isArray(req.body) && req.body.length > maxBatch) {
      return res.status(400).json({
        error: `Batch size ${req.body.length} exceeds maximum of ${maxBatch}`,
      });
    }
    next();
  };
}

app.use('/graphql', limitBatchSize(5));
```

## Impact

Attackers can brute-force authentication credentials by sending thousands of login attempts in a single HTTP request, bypass rate limiting that counts requests instead of operations, enumerate users or sensitive data through mass alias queries, cause denial-of-service by sending thousands of expensive operations in one batch, and amplify any per-query vulnerability by the batch factor.

## References

- CWE-799: Improper Control of Interaction Frequency
- CWE-307: Improper Restriction of Excessive Authentication Attempts
- OWASP GraphQL Cheat Sheet - Batching Attacks: https://cheatsheetseries.owasp.org/cheatsheets/GraphQL_Cheat_Sheet.html
- AFINE: GraphQL Security from a Pentester's Perspective: https://afine.com/graphql-security-from-a-pentesters-perspective/
- PortSwigger: GraphQL API Vulnerabilities - Batching: https://portswigger.net/web-security/graphql
