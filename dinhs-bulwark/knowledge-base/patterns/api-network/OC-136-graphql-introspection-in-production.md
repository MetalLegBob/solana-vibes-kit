# OC-136: GraphQL Introspection in Production

**Category:** API & Network
**Severity:** MEDIUM
**Auditors:** API-02
**CWE:** CWE-200
**OWASP:** API8:2023 - Security Misconfiguration

## Description

GraphQL introspection is a built-in schema discovery feature that allows clients to query the API's type system, enumerating all types, fields, arguments, mutations, and subscriptions. While invaluable during development, leaving introspection enabled in production gives attackers a complete blueprint of the API surface, including internal fields, hidden mutations, and deprecated endpoints that may bypass newer security controls.

GraphQL introspection is enabled by default in most server implementations, including Apollo Server, Express GraphQL, and GraphQL Yoga. Attackers routinely scan for introspection as the first step of a GraphQL attack, using tools like InQL, GraphQL Voyager, and graphql-cop. The 2024 GraphQL Security Conf presentation on "Top 10 GraphQL Security Checks" highlighted introspection exposure as the number one issue, and CVE-2021-41248 in GraphiQL demonstrated that introspection responses themselves can be vectors for XSS attacks if the IDE processes them unsafely.

The OWASP GraphQL Cheat Sheet explicitly recommends disabling introspection in production. Even when a schema is "public," introspection reveals implementation details like deprecated fields, internal types (e.g., `AdminMutation`), and argument validation constraints that inform targeted attacks.

## Detection

```
# Check if introspection is explicitly disabled
grep -rn "introspection" --include="*.ts" --include="*.js"
# Apollo Server default (introspection enabled unless NODE_ENV=production)
grep -rn "ApolloServer\|new.*ApolloServer" --include="*.ts" --include="*.js"
# GraphQL Yoga / express-graphql introspection settings
grep -rn "graphqlHTTP\|createYoga\|GraphQLServer" --include="*.ts" --include="*.js"
# Check for NODE_ENV-based toggling
grep -rn "introspection.*NODE_ENV\|introspection.*production" --include="*.ts" --include="*.js"
```

## Vulnerable Code

```typescript
import { ApolloServer } from '@apollo/server';

// VULNERABLE: Introspection enabled by default
const server = new ApolloServer({
  typeDefs,
  resolvers,
  // No introspection setting -- defaults to enabled
});

// VULNERABLE: Explicitly enabling introspection in all environments
const server2 = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: true, // Always enabled, even in production
});
```

## Secure Code

```typescript
import { ApolloServer } from '@apollo/server';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  // SECURE: Disable introspection in production
  introspection: process.env.NODE_ENV !== 'production',
});

// Alternative: Use a validation rule to block introspection queries
import { NoSchemaIntrospectionCustomRule } from 'graphql';

const server2 = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: false,
  validationRules: [NoSchemaIntrospectionCustomRule],
});
```

## Impact

With introspection enabled, attackers can discover all queries, mutations, and subscriptions available in the API, identify hidden or internal admin operations not exposed in the UI, find deprecated fields that may lack newer security checks, map the complete data model including types and relationships, and craft targeted injection or authorization bypass attacks using exact field names and argument types.

## References

- CVE-2021-41248: GraphiQL introspection response XSS vulnerability
- OWASP GraphQL Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/GraphQL_Cheat_Sheet.html
- CWE-200: Exposure of Sensitive Information to an Unauthorized Actor
- Apollo Server introspection configuration: https://www.apollographql.com/docs/apollo-server/api/apollo-server/#introspection
- PortSwigger: GraphQL API Vulnerabilities: https://portswigger.net/web-security/graphql
