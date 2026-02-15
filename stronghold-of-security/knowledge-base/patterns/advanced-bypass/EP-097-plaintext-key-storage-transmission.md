# EP-097: Plaintext Key Storage / Transmission
**Category:** Key Management  **Severity:** CRITICAL  **Solana-Specific:** No
**Historical Exploits:** DEXX ($30M, Nov 2024), Slope Wallet ($8M, Aug 2022)

**Description:** Private keys stored in plaintext on servers, logged to monitoring services, or transmitted unencrypted. Server breach or log access exposes all user funds at once.

**Vulnerable Pattern:**
```javascript
// DEXX: Plaintext key storage on server
db.users.insert({ wallet: pubkey, private_key: secretKey });  // PLAINTEXT!
// Slope: Key logged to Sentry
Sentry.captureMessage(`Wallet created: ${secretKeyBase58}`);
// DEXX: export_wallet returned plaintext
app.get('/export_wallet', (req, res) => res.json({ private_key: user.secretKey }));
```
**Secure Pattern:**
```javascript
// Encrypt at rest with per-user key derived from password
const encryptedKey = await encrypt(secretKey, deriveKey(userPassword, salt));
db.users.insert({ wallet: pubkey, encrypted_key: encryptedKey, salt });
// NEVER log keys — use structured logging with allowlists
logger.info({ event: 'wallet_created', pubkey });  // No secret data
// Better: non-custodial — never hold user keys
```
**Detection:** Search for `private_key`, `secret_key`, `secretKey` in storage/logging code. Check key export endpoints. Verify encryption at rest for any stored key material. Check monitoring service configs (Sentry, Datadog) for key exposure.
