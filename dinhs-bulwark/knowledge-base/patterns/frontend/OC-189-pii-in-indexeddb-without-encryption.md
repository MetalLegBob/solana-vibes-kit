# OC-189: PII Stored in IndexedDB Without Encryption

**Category:** Frontend & Client
**Severity:** MEDIUM
**Auditors:** FE-01
**CWE:** CWE-312
**OWASP:** A04:2021 - Insecure Design

## Description

IndexedDB is a powerful client-side database that supports structured storage, indexing, and transactions. Web applications use it for offline caching, storing large datasets, and managing complex client-side state. However, IndexedDB stores data unencrypted on disk and is fully accessible to any JavaScript running on the same origin.

Academic research by Kimak et al. (2014) documented that "data stored on the client file system is unencrypted" in IndexedDB, exposing it to both JavaScript-based theft and local forensic extraction. A critical Safari bug discovered by FingerprintJS in January 2022 caused IndexedDB to violate same-origin policy, leaking database names and stored data across origins -- exposing Google account identifiers and browsing history to any website.

In dApp frontends, IndexedDB is commonly used to cache transaction histories, token metadata, NFT collections, and user preferences. If PII such as email addresses, KYC documents, or IP-based geolocation data ends up in IndexedDB, it sits unencrypted on disk and is accessible to XSS attacks, malicious extensions, and local malware.

## Detection

```
# IndexedDB usage patterns
grep -rn "indexedDB\.open\|IDBDatabase\|createObjectStore" --include="*.ts" --include="*.tsx" --include="*.js"

# Dexie.js (popular IndexedDB wrapper)
grep -rn "new Dexie\|dexie" -i --include="*.ts" --include="*.tsx"

# idb library
grep -rn "openDB\|idb" --include="*.ts" --include="*.tsx"

# Check what data is being stored
grep -rn "\.put(\|\.add(\|\.transaction(" --include="*.ts" --include="*.tsx"
grep -rn "email\|phone\|address\|ssn\|passport\|kyc" -i --include="*.ts" --include="*.tsx"
```

## Vulnerable Code

```typescript
import Dexie, { Table } from 'dexie';

interface UserRecord {
  walletAddress: string;
  email: string;
  kycStatus: string;
  ipAddress: string;
  transactionHistory: TransactionRecord[];
}

class AppDatabase extends Dexie {
  users!: Table<UserRecord>;

  constructor() {
    super('myDApp');
    this.version(1).stores({
      // VULNERABLE: PII stored in plaintext IndexedDB
      users: 'walletAddress, email, kycStatus',
    });
  }
}

const db = new AppDatabase();

async function cacheUserData(profile: UserRecord) {
  // VULNERABLE: PII stored unencrypted, accessible to XSS and local extraction
  await db.users.put(profile);
}
```

## Secure Code

```typescript
import Dexie, { Table } from 'dexie';

// Encrypt sensitive fields before storing in IndexedDB
async function encryptField(data: string, key: CryptoKey): Promise<ArrayBuffer> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(data);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded,
  );
  // Prepend IV to ciphertext
  const result = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
  result.set(iv);
  result.set(new Uint8Array(ciphertext), iv.length);
  return result.buffer;
}

interface CachedUser {
  walletAddress: string;     // Public info, OK to store
  encryptedEmail: ArrayBuffer;
  theme: string;             // Non-sensitive UI preference
}

class AppDatabase extends Dexie {
  users!: Table<CachedUser>;

  constructor() {
    super('myDApp');
    this.version(1).stores({
      users: 'walletAddress', // Only index non-sensitive fields
    });
  }
}

// Prefer: store PII server-side, only cache non-sensitive data locally
```

## Impact

Unencrypted PII in IndexedDB can be exfiltrated through XSS attacks, stolen by malicious browser extensions, or extracted from disk by local malware. Browser bugs (such as the Safari same-origin bypass) can leak IndexedDB data across origins. Regulatory frameworks (GDPR, CCPA) may consider unencrypted client-side PII storage a compliance violation.

## References

- CWE-312: Cleartext Storage of Sensitive Information
- FingerprintJS: Safari 15 IndexedDB Same-Origin Policy Bypass (January 2022)
- Kimak et al.: "Some Potential Issues with the Security of HTML5 IndexedDB" (IET 2014)
- OWASP WSTG-CLNT-12: Testing Browser Storage
- Kim et al.: "Decrypting IndexedDB in Private Mode of Gecko-based Browsers" (DFRWS 2024)
