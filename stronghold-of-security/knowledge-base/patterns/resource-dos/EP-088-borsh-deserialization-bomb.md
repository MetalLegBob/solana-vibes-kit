# EP-088: Borsh Deserialization Bomb
**Category:** DoS  **Severity:** HIGH  **Solana-Specific:** Yes
**Historical Exploits:** Programs DoS'd by oversized serialized vectors

**Description:** Borsh deserializes unbounded Vec/String/HashMap from untrusted data, causing OOM.

**Vulnerable Pattern:**
```rust
#[derive(BorshDeserialize)]
pub struct Data { pub items: Vec<Item>, pub name: String } // Unbounded!
```
**Secure Pattern:**
```rust
pub struct Data { pub items: [Item; 10], pub name: [u8; 32] } // Fixed
require!(data.len() <= MAX_SIZE);
```
**Detection:** Find `BorshDeserialize` with Vec/String/HashMap. Verify size checks.
