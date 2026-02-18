# OC-137: GraphQL Query Depth Unlimited

**Category:** API & Network
**Severity:** HIGH
**Auditors:** API-02
**CWE:** CWE-400
**OWASP:** API4:2023 - Unrestricted Resource Consumption

## Description

GraphQL allows clients to construct arbitrarily nested queries. When circular relationships exist in the schema (e.g., User has Posts, Post has Author who is a User), an attacker can craft a deeply nested recursive query that causes exponential database calls, consuming all server memory and CPU. A single malicious query can bring down an entire backend infrastructure.

Unlike REST APIs where each endpoint returns a fixed data structure, GraphQL gives clients complete control over query depth and breadth. If a schema has a `User -> posts -> [Post] -> author -> User` relationship, a 10-level deep query could theoretically trigger millions of resolver calls. This is a well-known denial-of-service vector documented by every major GraphQL security guide.

GraphQL does not impose any default depth or complexity limits -- that responsibility belongs entirely to the server implementation. Libraries like `graphql-depth-limit` and `graphql-query-complexity` exist specifically to address this gap, but many production GraphQL APIs ship without them. The Invicti vulnerability scanner specifically tests for this as "GraphQL Circular-Query via Introspection Allowed: Potential DoS Vulnerability."

## Detection

```
# Check for depth limiting libraries in dependencies
grep -rn "graphql-depth-limit\|depthLimit\|depth-limit\|maxDepth" --include="*.ts" --include="*.js" package.json
# Check if validation rules include depth limiting
grep -rn "validationRules" --include="*.ts" --include="*.js"
# Check for query complexity analysis
grep -rn "graphql-query-complexity\|graphql-validation-complexity\|costAnalysis\|complexityLimit" --include="*.ts" --include="*.js" package.json
# Find circular type relationships in schema
grep -rn "type.*{" --include="*.graphql" --include="*.gql"
```

## Vulnerable Code

```typescript
import { ApolloServer } from '@apollo/server';

const typeDefs = `
  type Query {
    users: [User!]!
  }
  type User {
    id: ID!
    name: String!
    posts: [Post!]!     # User -> Post
  }
  type Post {
    id: ID!
    title: String!
    author: User!        # Post -> User (circular)
    comments: [Comment!]!
  }
  type Comment {
    id: ID!
    body: String!
    author: User!        # Comment -> User (circular)
  }
`;

// VULNERABLE: No depth limit or complexity analysis
const server = new ApolloServer({
  typeDefs,
  resolvers,
  // Attacker can send: { users { posts { author { posts { author { ... } } } } } }
});
```

## Secure Code

```typescript
import { ApolloServer } from '@apollo/server';
import depthLimit from 'graphql-depth-limit';
import { createComplexityLimitRule } from 'graphql-validation-complexity';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: process.env.NODE_ENV !== 'production',
  validationRules: [
    // Reject queries deeper than 5 levels
    depthLimit(5),
    // Reject queries exceeding a cost budget
    createComplexityLimitRule(1000, {
      scalarCost: 1,
      objectCost: 2,
      listFactor: 10,
    }),
  ],
});

// Additionally: Use DataLoader to prevent N+1 queries
// even for legitimate deep queries within the limit
import DataLoader from 'dataloader';

const resolvers = {
  Post: {
    author: (post, args, { loaders }) => loaders.user.load(post.authorId),
  },
};
```

## Impact

An attacker can cause complete denial-of-service by sending a single deeply nested query, exhaust database connection pools through exponentially multiplied resolver calls, consume all available server memory leading to process crashes, and affect all users sharing the same GraphQL server. Unlike traditional DDoS attacks, this requires only a single request from a single client.

## References

- CWE-400: Uncontrolled Resource Consumption
- OWASP GraphQL Cheat Sheet - Query Limiting (Depth & Amount): https://cheatsheetseries.owasp.org/cheatsheets/GraphQL_Cheat_Sheet.html
- OWASP API4:2023 - Unrestricted Resource Consumption
- graphql-depth-limit: https://www.npmjs.com/package/graphql-depth-limit
- graphql-query-complexity: https://www.npmjs.com/package/graphql-query-complexity
- Invicti: GraphQL Circular-Query DoS: https://www.invicti.com/web-application-vulnerabilities/graphql-circular-query-via-introspection-allowed-potential-dos-vulnerability
