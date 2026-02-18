# OC-154: Pagination Allowing Full Database Dump

**Category:** API & Network
**Severity:** MEDIUM
**Auditors:** API-01
**CWE:** CWE-200
**OWASP:** API4:2023 - Unrestricted Resource Consumption

## Description

Pagination vulnerabilities occur when an API allows clients to specify arbitrarily large page sizes, unlimited offsets, or provides no pagination at all, enabling attackers to dump entire database tables in a single request or a small number of requests. An attacker sets `?limit=999999` or `?pageSize=100000` and receives the entire dataset, bypassing any intended access restrictions and causing severe performance degradation.

This vulnerability has two dimensions: data exposure and denial-of-service. On the data exposure side, even if individual records are authorized, the ability to retrieve all records at once enables mass data harvesting that would be impractical one-at-a-time. On the DoS side, requesting millions of records forces the database to perform full table scans, consume excessive memory for result sets, and transfer large payloads over the network.

Akto's security testing platform specifically tests for "Possible DOS attack by Pagination misconfiguration" as a standard API security check. The OWASP API Security Top 10 covers this under API4:2023 (Unrestricted Resource Consumption), recommending that APIs "limit the amount of data that can be retrieved by a query by imposing limits on the pagination size, or page counts." The Escape GraphQL security scanner also checks for missing pagination as a standard vulnerability.

## Detection

```
# Pagination parameters from user input
grep -rn "req\.query\.limit\|req\.query\.pageSize\|req\.query\.per_page\|req\.query\.size" --include="*.ts" --include="*.js"
# Direct use of user-supplied limit in query
grep -rn "\.limit(.*req\.\|LIMIT.*req\.\|\.take(.*req\." --include="*.ts" --include="*.js"
# Missing pagination entirely
grep -rn "\.find(\s*{}\s*)\|\.find(\s*)\|SELECT \* FROM" --include="*.ts" --include="*.js" | grep -v "limit\|LIMIT\|take\|paginate"
# No maximum limit enforcement
grep -rn "limit\|pageSize\|per_page" --include="*.ts" --include="*.js" | grep -v "Math\.min\|MAX_\|max.*limit"
```

## Vulnerable Code

```typescript
import express from 'express';

// VULNERABLE: No maximum page size, user controls limit
app.get('/api/users', authenticate, async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 100;
  const offset = parseInt(req.query.offset as string) || 0;

  // Attacker sets ?limit=999999 -- dumps entire users table
  const users = await User.find({}).skip(offset).limit(limit);
  res.json(users);
});

// VULNERABLE: No pagination at all
app.get('/api/transactions', authenticate, async (req, res) => {
  // Returns ALL transactions -- could be millions of records
  const transactions = await Transaction.find({ userId: req.user.id });
  res.json(transactions);
});

// VULNERABLE: GraphQL without pagination limits
const resolvers = {
  Query: {
    users: (_, args) => {
      // args.first could be 999999
      return User.find({}).limit(args.first);
    },
  },
};
```

## Secure Code

```typescript
import express from 'express';

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;

app.get('/api/users', authenticate, async (req, res) => {
  // SECURE: Enforce maximum page size
  const limit = Math.min(
    parseInt(req.query.limit as string) || DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE,
  );
  const page = Math.max(parseInt(req.query.page as string) || 1, 1);
  const offset = (page - 1) * limit;

  const [users, total] = await Promise.all([
    User.find({}).skip(offset).limit(limit).select('id name avatar'),
    User.countDocuments({}),
  ]);

  res.json({
    data: users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: offset + limit < total,
    },
  });
});

// SECURE: Cursor-based pagination for large datasets
app.get('/api/transactions', authenticate, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
  const cursor = req.query.cursor as string;

  const query: any = { userId: req.user.id };
  if (cursor) {
    query._id = { $lt: cursor }; // Cursor-based: no offset scanning
  }

  const transactions = await Transaction.find(query)
    .sort({ _id: -1 })
    .limit(limit + 1); // Fetch one extra to check for next page

  const hasNext = transactions.length > limit;
  if (hasNext) transactions.pop();

  res.json({
    data: transactions,
    pagination: {
      limit,
      nextCursor: hasNext ? transactions[transactions.length - 1]._id : null,
    },
  });
});
```

## Impact

Pagination vulnerabilities allow attackers to dump entire database tables, exfiltrating all user data, transactions, or records, cause denial-of-service by forcing the database to process and transfer massive result sets, enumerate and harvest sensitive data at scale, consume excessive network bandwidth and server memory, and bypass intended access patterns where users should only see limited results. For regulated data (PII, financial records), this constitutes a data breach.

## References

- CWE-200: Exposure of Sensitive Information to an Unauthorized Actor
- OWASP API4:2023 - Unrestricted Resource Consumption: https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/
- Akto: Possible DOS attack by Pagination misconfiguration: https://www.akto.io/test/possible-dos-attack-by-pagination-misconfiguration
- GraphQL pagination best practices: https://graphql.org/learn/pagination/
