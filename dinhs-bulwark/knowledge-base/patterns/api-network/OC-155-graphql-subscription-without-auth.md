# OC-155: GraphQL Subscription Without Auth

**Category:** API & Network
**Severity:** HIGH
**Auditors:** API-02
**CWE:** CWE-306
**OWASP:** API2:2023 - Broken Authentication

## Description

GraphQL subscriptions enable real-time data streams over WebSocket connections. When subscriptions lack authentication and authorization checks, attackers can subscribe to real-time events for any data in the system -- user activity, financial transactions, admin operations, or internal system events -- without any credentials.

CVE-2023-38503 in Directus (versions 10.3.0 through 10.4.x, CVSS 6.5) is the canonical example of this vulnerability. The permission filters (e.g., `user_created IS $CURRENT_USER`) were not properly checked when using GraphQL subscriptions, allowing unauthorized users to receive mutation events on any collection. Out of the box, the `directus_users` collection was affected, allowing attackers to monitor all user activity changes including `last_access` and `last_page` fields. CVE-2023-34047 in Spring for GraphQL demonstrated a similar issue where security context values from different sessions could leak through batch loader functions in subscription resolvers.

GraphQL subscriptions are particularly dangerous because they establish persistent WebSocket connections that continuously stream data. Unlike a one-time query that returns a snapshot, a subscription delivers every matching event in real-time for as long as the connection remains open. If an attacker subscribes to `orderUpdated` without authorization, they receive every order update across all users indefinitely.

## Detection

```
# GraphQL subscription definitions
grep -rn "type Subscription\|Subscription:" --include="*.graphql" --include="*.gql" --include="*.ts" --include="*.js"
# Subscription resolvers without auth
grep -rn "subscribe:\|\.subscribe\|asyncIterator\|pubsub" --include="*.ts" --include="*.js"
# WebSocket server for GraphQL subscriptions
grep -rn "graphql-ws\|subscriptions-transport-ws\|useServer\|SubscriptionServer" --include="*.ts" --include="*.js"
# Missing auth in subscription context
grep -rn "onConnect\|onSubscribe\|context.*connection" --include="*.ts" --include="*.js" | grep -v "auth\|token\|verify"
```

## Vulnerable Code

```typescript
import { ApolloServer } from '@apollo/server';
import { createServer } from 'http';
import { useServer } from 'graphql-ws/lib/use/ws';
import { WebSocketServer } from 'ws';
import { PubSub } from 'graphql-subscriptions';

const pubsub = new PubSub();

const typeDefs = `
  type Subscription {
    orderUpdated(orderId: ID): Order!
    userActivity: UserEvent!
    transactionCreated: Transaction!
  }
`;

const resolvers = {
  Subscription: {
    // VULNERABLE: No auth check -- anyone can subscribe to any order
    orderUpdated: {
      subscribe: (_, { orderId }) =>
        pubsub.asyncIterator(`ORDER_UPDATED_${orderId}`),
    },
    // VULNERABLE: No auth -- exposes all user activity
    userActivity: {
      subscribe: () => pubsub.asyncIterator('USER_ACTIVITY'),
    },
    // VULNERABLE: No auth -- exposes all financial transactions
    transactionCreated: {
      subscribe: () => pubsub.asyncIterator('TRANSACTION_CREATED'),
    },
  },
};

// VULNERABLE: WebSocket server with no auth on connection
const wsServer = new WebSocketServer({ server: httpServer, path: '/graphql' });
useServer({ schema }, wsServer); // No onConnect or onSubscribe auth
```

## Secure Code

```typescript
import { ApolloServer } from '@apollo/server';
import { useServer } from 'graphql-ws/lib/use/ws';
import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';

const wsServer = new WebSocketServer({ server: httpServer, path: '/graphql' });

// SECURE: Authenticate WebSocket connection
useServer(
  {
    schema,
    onConnect: async (ctx) => {
      // Verify authentication on WebSocket connection
      const token = ctx.connectionParams?.authToken as string;
      if (!token) {
        throw new Error('Authentication required');
      }
      try {
        const user = jwt.verify(token, process.env.JWT_SECRET, {
          algorithms: ['HS256'],
        });
        return { user };
      } catch {
        throw new Error('Invalid authentication token');
      }
    },
    onSubscribe: async (ctx, msg) => {
      const user = (ctx.extra as any).user;
      if (!user) throw new Error('Not authenticated');

      // SECURE: Per-subscription authorization
      const operationName = msg.payload.operationName;
      const variables = msg.payload.variables || {};

      // Check authorization for specific subscriptions
      if (msg.payload.query?.includes('orderUpdated')) {
        const order = await Order.findById(variables.orderId);
        if (!order || order.userId !== user.id) {
          throw new Error('Not authorized to subscribe to this order');
        }
      }

      if (msg.payload.query?.includes('transactionCreated')) {
        // Only allow subscribing to own transactions
        // Enforce this via a filtered async iterator
      }
    },
  },
  wsServer,
);

const resolvers = {
  Subscription: {
    orderUpdated: {
      subscribe: withFilter(
        () => pubsub.asyncIterator('ORDER_UPDATED'),
        // SECURE: Filter events to only authorized user's orders
        (payload, variables, context) => {
          return payload.orderUpdated.userId === context.user.id &&
                 payload.orderUpdated.id === variables.orderId;
        },
      ),
    },
    transactionCreated: {
      subscribe: withFilter(
        () => pubsub.asyncIterator('TRANSACTION_CREATED'),
        (payload, variables, context) => {
          return payload.transactionCreated.userId === context.user.id;
        },
      ),
    },
  },
};
```

## Impact

Unauthenticated GraphQL subscriptions allow attackers to monitor all real-time data streams without credentials, observe financial transactions, order updates, and user activity across all users, perform real-time surveillance of admin operations and system events, gather intelligence for targeted attacks by monitoring system behavior, and maintain persistent data exfiltration channels that stream data indefinitely. The real-time nature makes this worse than a one-time data breach because it provides continuous access to all new data as it is created.

## References

- CVE-2023-38503: Directus GraphQL subscription permission bypass (CVSS 6.5)
- CVE-2023-34047: Spring for GraphQL batch loader security context leak
- CWE-306: Missing Authentication for Critical Function
- OWASP API2:2023 - Broken Authentication: https://owasp.org/API-Security/editions/2023/en/0xa2-broken-authentication/
- graphql-ws authentication: https://the-guild.dev/graphql/ws/recipes#server-usage-with-ws-and-custom-auth-handling
- OWASP GraphQL Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/GraphQL_Cheat_Sheet.html
