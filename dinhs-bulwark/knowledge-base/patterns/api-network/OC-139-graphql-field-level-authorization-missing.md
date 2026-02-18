# OC-139: GraphQL Field-Level Authorization Missing

**Category:** API & Network
**Severity:** HIGH
**Auditors:** API-02
**CWE:** CWE-862
**OWASP:** API1:2023 - Broken Object Level Authorization

## Description

GraphQL field-level authorization failures occur when individual fields within a type lack access control, allowing users to query sensitive fields they should not access. Unlike REST APIs where each endpoint can have its own middleware, GraphQL resolves all requested fields through a single endpoint, making it easy to miss authorization checks on specific fields.

For example, a `User` type might include both public fields (`name`, `avatar`) and private fields (`email`, `socialSecurityNumber`, `bankAccount`). If authorization is only applied at the query level ("user must be authenticated to access the User type") but not at the field level, any authenticated user can query any field on any user object. This becomes especially dangerous when GraphQL schema grows over time and new sensitive fields are added without corresponding authorization logic.

CVE-2023-38503 in Directus (versions 10.3.0 - 10.4.x) demonstrated this class of vulnerability in production: GraphQL subscription permission filters relying on `$CURRENT_USER` were not properly checked, allowing unauthorized users to receive subscription events they should not have had access to, including updates on other users' data. The vulnerability had a CVSS score of 6.5 and was patched in version 10.5.0. CVE-2023-34047 in Spring for GraphQL showed a similar issue where a batch loader function could be exposed to GraphQL context with security context values from a different session.

## Detection

```
# Look for resolvers without auth checks
grep -rn "resolvers\|Resolver\|@Resolver" --include="*.ts" --include="*.js"
# Field resolvers without authorization
grep -rn "parent\|root\|obj.*args.*context" --include="*.ts" --include="*.js" | grep -v "auth\|permission\|role\|guard"
# GraphQL shield or similar field auth library
grep -rn "graphql-shield\|@Authorized\|@UseGuards\|fieldAuth" --include="*.ts" --include="*.js" package.json
# Schema directives for auth
grep -rn "@auth\|@hasRole\|@isOwner\|@private" --include="*.graphql" --include="*.gql"
```

## Vulnerable Code

```typescript
const typeDefs = `
  type User {
    id: ID!
    name: String!
    email: String!
    socialSecurityNumber: String!  # Sensitive!
    bankAccount: String!           # Sensitive!
    role: String!
    internalNotes: String!         # Admin-only
  }

  type Query {
    user(id: ID!): User
    users: [User!]!
  }
`;

// VULNERABLE: Resolver returns all fields without field-level auth
const resolvers = {
  Query: {
    user: async (_, { id }, context) => {
      if (!context.user) throw new AuthenticationError('Not logged in');
      // Any authenticated user can query ANY field on ANY user
      return User.findById(id);
    },
    users: async (_, __, context) => {
      if (!context.user) throw new AuthenticationError('Not logged in');
      return User.find({});
    },
  },
};
```

## Secure Code

```typescript
import { shield, rule, allow, deny } from 'graphql-shield';

const isAuthenticated = rule()((parent, args, context) => {
  return context.user !== null;
});

const isOwner = rule()((parent, args, context) => {
  return parent.id === context.user.id;
});

const isAdmin = rule()((parent, args, context) => {
  return context.user?.role === 'admin';
});

// SECURE: Field-level permissions via graphql-shield
const permissions = shield({
  Query: {
    user: isAuthenticated,
    users: isAuthenticated,
  },
  User: {
    id: allow,
    name: allow,
    email: isOwner,                 // Only the user themselves
    socialSecurityNumber: isOwner,  // Only the user themselves
    bankAccount: isOwner,           // Only the user themselves
    role: isAuthenticated,
    internalNotes: isAdmin,         // Admin only
  },
});

// Apply as middleware
const server = new ApolloServer({
  schema: applyMiddleware(schema, permissions),
});
```

## Impact

Missing field-level authorization allows any authenticated user to read other users' PII (email, SSN, bank details), access admin-only internal notes and metadata, discover system internals through hidden fields, and exfiltrate sensitive data at scale by querying lists of users. In financial or healthcare applications, this constitutes a data breach with regulatory implications under GDPR, HIPAA, or PCI-DSS.

## References

- CVE-2023-38503: Directus GraphQL subscription permission bypass (CVSS 6.5)
- CVE-2023-34047: Spring for GraphQL batch loader security context leak
- CWE-862: Missing Authorization
- OWASP API1:2023 - Broken Object Level Authorization: https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/
- graphql-shield: https://www.graphql-shield.com/
- OWASP GraphQL Cheat Sheet - Authorization: https://cheatsheetseries.owasp.org/cheatsheets/GraphQL_Cheat_Sheet.html
