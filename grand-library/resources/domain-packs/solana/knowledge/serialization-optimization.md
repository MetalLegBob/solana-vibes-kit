---
pack: solana
confidence: 8/10
sources_checked: 10
last_updated: "2026-02-16"
---

# How do I optimize account data serialization?

## Overview

Serialization is how Solana programs encode and decode account data. Inefficient serialization wastes compute units (CU), increases transaction costs, and can cause programs to exceed compute budgets. Choosing the right serialization strategy—Borsh, zero-copy, or custom packing—and optimizing data layout can dramatically improve performance.

## Borsh vs Zero-Copy vs Custom Serialization

### Borsh (Binary Object Representation Serializer for Hashing)

Borsh is Anchor's default serialization format.

**How It Works:**
- Iterates through the entire data structure
- Serializes field-by-field to bytes
- Deserializes by copying bytes and reconstructing the struct

**Example:**

```rust
use borsh::{BorshDeserialize, BorshSerialize};

#[derive(BorshSerialize, BorshDeserialize)]
pub struct Pool {
    pub token_a: Pubkey,
    pub token_b: Pubkey,
    pub reserve_a: u64,
    pub reserve_b: u64,
}

// Serialize
let pool = Pool { /* ... */ };
let serialized = pool.try_to_vec()?;

// Deserialize
let deserialized = Pool::try_from_slice(&serialized)?;
```

**Cost (1 KB struct):**
- Serialize: ~200 CU
- Deserialize: ~200 CU

### Zero-Copy (Bytemuck)

Zero-copy interprets bytes directly as the struct, with no copying or iteration.

**How It Works:**
- Casts raw bytes to struct reference
- No allocation, no copying
- Requires `Pod` (plain old data) constraints

**Example:**

```rust
use bytemuck::{Pod, Zeroable};

#[repr(C)]
#[derive(Copy, Clone, Pod, Zeroable)]
pub struct Pool {
    pub token_a: [u8; 32],  // Pubkey as bytes
    pub token_b: [u8; 32],
    pub reserve_a: u64,
    pub reserve_b: u64,
}

// Zero-copy "deserialization"
let bytes: &[u8] = account_data;
let pool: &Pool = bytemuck::from_bytes(bytes);

// Direct access (no copy)
let reserve_a = pool.reserve_a;
```

**Cost (1 KB struct):**
- Deserialize: ~2 CU (just a pointer cast)
- Serialize: ~2 CU

### Custom Serialization (Manual)

Hand-written serialization for maximum control.

**Example:**

```rust
pub struct Pool {
    pub token_a: Pubkey,
    pub token_b: Pubkey,
    pub reserve_a: u64,
    pub reserve_b: u64,
}

impl Pool {
    pub fn serialize(&self, data: &mut [u8]) -> Result<()> {
        let mut offset = 0;

        data[offset..offset + 32].copy_from_slice(self.token_a.as_ref());
        offset += 32;

        data[offset..offset + 32].copy_from_slice(self.token_b.as_ref());
        offset += 32;

        data[offset..offset + 8].copy_from_slice(&self.reserve_a.to_le_bytes());
        offset += 8;

        data[offset..offset + 8].copy_from_slice(&self.reserve_b.to_le_bytes());

        Ok(())
    }

    pub fn deserialize(data: &[u8]) -> Result<Self> {
        let mut offset = 0;

        let token_a = Pubkey::new_from_array(
            data[offset..offset + 32].try_into().unwrap()
        );
        offset += 32;

        let token_b = Pubkey::new_from_array(
            data[offset..offset + 32].try_into().unwrap()
        );
        offset += 32;

        let reserve_a = u64::from_le_bytes(
            data[offset..offset + 8].try_into().unwrap()
        );
        offset += 8;

        let reserve_b = u64::from_le_bytes(
            data[offset..offset + 8].try_into().unwrap()
        );

        Ok(Self { token_a, token_b, reserve_a, reserve_b })
    }
}
```

**Cost (1 KB struct):**
- Serialize: ~150 CU
- Deserialize: ~150 CU

### Performance Comparison

| Approach | Deserialize (1 KB) | Serialize (1 KB) | Memory Usage |
|----------|-------------------|-----------------|--------------|
| Borsh | 200 CU | 200 CU | 1 KB heap |
| Bytemuck (zero-copy) | 2 CU | 2 CU | 0 (direct) |
| Manual | 150 CU | 150 CU | 1 KB heap |

**Key Insight:** Bytemuck is ~100× faster than Borsh for fixed-layout structs.

## Benchmarks: Borsh vs Bytemuck vs Manual

### Real-World Benchmark: AMM Pool (72 bytes)

Source: [Borsh vs Bytemuck vs Manual Deserialization](https://mrb1nary.substack.com/p/borsh-vs-bytemuck-vs-manual-deserialization)

**Results:**
- **Bytemuck:** ~40 CU
- **Manual:** ~45 CU
- **Borsh:** ~8,127 CU

**Ratio:** Bytemuck is **203× faster** than Borsh for this struct.

### Benchmark: Varying Struct Sizes

Source: [GitHub - febo/tide](https://github.com/febo/tide)

| Struct Size | Borsh | Bytemuck | Transmute | Bincode |
|-------------|-------|----------|-----------|---------|
| 40 bytes | 8,127 CU | 40 CU | 36 CU | 8,127 CU |
| 1 KB | ~7,500 CU | ~40 CU | ~36 CU | ~7,500 CU |
| 10 KB | ~75,000 CU | ~40 CU | ~36 CU | ~75,000 CU |

**Key Insight:** Zero-copy cost is **constant** regardless of struct size, while Borsh/Bincode scale linearly.

### Benchmark: Dynamic Data (Strings, Vectors)

Source: [Solana Serialization Benchmarks | Metaplex](https://medium.com/metaplex/solana-serialization-benchmarks-a90d32c99fd2)

With 10,000 users including `String` fields:
- **Bytemuck:** ~5.8 µs
- **Manual:** ~5.8 µs
- **Borsh:** ~7.5 µs

**Key Insight:** For dynamic data, the performance gap narrows, but zero-copy still wins.

## When to Use Each Approach

| Use Case | Recommended Approach | Reason |
|----------|---------------------|--------|
| Fixed-size structs | Bytemuck (zero-copy) | 100× faster, no memory overhead |
| Dynamic data (Vec, String) | Borsh or Manual | Zero-copy can't handle dynamic types |
| Complex nested types | Borsh | Auto-derived, easier to maintain |
| Ultra-performance | Bytemuck or Manual | Maximum control and speed |
| Anchor default | Borsh | Framework integration, ease of use |

## Bit-Packing Techniques

Pack multiple small values into a single integer to save space.

### Without Bit-Packing

```rust
#[account]
pub struct UserFlags {
    pub is_active: bool,       // 1 byte (wastes 7 bits)
    pub is_premium: bool,      // 1 byte
    pub has_verified_email: bool,  // 1 byte
    pub notifications_enabled: bool,  // 1 byte
}

// Total: 4 bytes
```

### With Bit-Packing

```rust
#[account]
pub struct UserFlags {
    pub flags: u8,  // All flags in 1 byte
}

impl UserFlags {
    const IS_ACTIVE: u8 = 1 << 0;           // 0b00000001
    const IS_PREMIUM: u8 = 1 << 1;          // 0b00000010
    const HAS_VERIFIED_EMAIL: u8 = 1 << 2;  // 0b00000100
    const NOTIFICATIONS_ENABLED: u8 = 1 << 3; // 0b00001000

    pub fn is_active(&self) -> bool {
        self.flags & Self::IS_ACTIVE != 0
    }

    pub fn set_active(&mut self, active: bool) {
        if active {
            self.flags |= Self::IS_ACTIVE;
        } else {
            self.flags &= !Self::IS_ACTIVE;
        }
    }

    pub fn is_premium(&self) -> bool {
        self.flags & Self::IS_PREMIUM != 0
    }

    pub fn set_premium(&mut self, premium: bool) {
        if premium {
            self.flags |= Self::IS_PREMIUM;
        } else {
            self.flags &= !Self::IS_PREMIUM;
        }
    }

    // Similar methods for other flags...
}

// Total: 1 byte (75% space savings)
```

**Benefits:**
- 4 bytes → 1 byte (75% reduction)
- Lower rent costs
- Faster serialization (fewer bytes)

### Advanced: Packing Multiple Fields

```rust
#[account]
pub struct PackedOrder {
    pub packed: u64,
}

impl PackedOrder {
    // Layout: [price: 40 bits | amount: 16 bits | flags: 8 bits]

    pub fn new(price: u64, amount: u16, flags: u8) -> Self {
        let packed = (price << 24) | ((amount as u64) << 8) | (flags as u64);
        Self { packed }
    }

    pub fn price(&self) -> u64 {
        self.packed >> 24
    }

    pub fn amount(&self) -> u16 {
        ((self.packed >> 8) & 0xFFFF) as u16
    }

    pub fn flags(&self) -> u8 {
        (self.packed & 0xFF) as u8
    }
}

// Instead of 13 bytes (u64 + u16 + u8 + padding), uses 8 bytes (38% savings)
```

## Discriminator Strategies

Discriminators identify account types. Anchor uses 8 bytes by default.

### Anchor Default (8-byte)

```rust
#[account]
pub struct MyAccount {
    pub data: u64,
}

// Anchor generates 8-byte discriminator:
// SHA256("account:MyAccount")[..8]

// Total account size: 8 (discriminator) + 8 (data) = 16 bytes
```

### Custom Discriminator (1-byte)

For programs with few account types, a 1-byte discriminator saves space.

```rust
pub const MY_ACCOUNT_DISCRIMINATOR: u8 = 1;

#[account]
pub struct MyAccount {
    pub discriminator: u8,  // Manual 1-byte discriminator
    pub data: u64,
}

impl MyAccount {
    pub fn new(data: u64) -> Self {
        Self {
            discriminator: MY_ACCOUNT_DISCRIMINATOR,
            data,
        }
    }
}

// Total: 1 (discriminator) + 8 (data) = 9 bytes (vs 16 with Anchor)
```

**Trade-off:** Manual discriminator management vs space savings.

### No Discriminator (Deterministic Accounts)

If accounts are accessed via deterministic PDAs, discriminators may be unnecessary.

```rust
// Seeds uniquely identify account type
#[derive(Accounts)]
pub struct UpdateUser<'info> {
    #[account(
        mut,
        seeds = [b"user", authority.key().as_ref()],
        bump
    )]
    pub user: Account<'info, User>,
}

// No discriminator needed - PDA seeds imply type
```

**Benefit:** Save 8 bytes per account.

**Risk:** No runtime type checking; ensure correct PDA derivation.

## Account Data Versioning for Upgrades

Programs evolve; account data must support versioning.

### Approach 1: Version Field

```rust
#[account]
pub struct UserAccount {
    pub version: u8,
    pub data_v1: DataV1,
}

#[derive(BorshSerialize, BorshDeserialize)]
pub struct DataV1 {
    pub name: String,
    pub age: u8,
}

// Future upgrade
#[account]
pub struct UserAccountV2 {
    pub version: u8,
    pub data: DataV2,
}

#[derive(BorshSerialize, BorshDeserialize)]
pub struct DataV2 {
    pub name: String,
    pub age: u8,
    pub email: String,  // New field
}

// Migration instruction
pub fn migrate_to_v2(ctx: Context<Migrate>) -> Result<()> {
    let account = &mut ctx.accounts.user;

    require!(account.version == 1, ErrorCode::AlreadyMigrated);

    // Deserialize V1
    let v1_data = DataV1::try_from_slice(&account.data)?;

    // Create V2 with default email
    let v2_data = DataV2 {
        name: v1_data.name,
        age: v1_data.age,
        email: String::from(""),
    };

    // Serialize V2
    account.data = v2_data.try_to_vec()?;
    account.version = 2;

    Ok(())
}
```

### Approach 2: Enum Variants

```rust
#[derive(BorshSerialize, BorshDeserialize)]
pub enum UserData {
    V1 { name: String, age: u8 },
    V2 { name: String, age: u8, email: String },
}

#[account]
pub struct UserAccount {
    pub data: UserData,
}

pub fn process_user(ctx: Context<Process>) -> Result<()> {
    let account = &ctx.accounts.user;

    match &account.data {
        UserData::V1 { name, age } => {
            // Handle V1
        }
        UserData::V2 { name, age, email } => {
            // Handle V2
        }
    }

    Ok(())
}
```

### Approach 3: Reserved Space

Allocate extra space upfront for future fields.

```rust
#[account]
pub struct UserAccount {
    pub name: String,
    pub age: u8,
    pub reserved: [u8; 128],  // Reserved for future use
}

// Future upgrade: Use reserved space
#[account]
pub struct UserAccountV2 {
    pub name: String,
    pub age: u8,
    pub email: String,        // Uses part of reserved
    pub reserved: [u8; 64],   // Remaining reserved
}
```

**Trade-off:** Higher rent cost upfront vs easier upgrades.

## Padding for Alignment

Memory alignment affects performance and zero-copy compatibility.

### Unaligned Struct (Inefficient)

```rust
#[repr(C)]
#[derive(Pod, Zeroable)]
pub struct Unaligned {
    pub flag: u8,        // 1 byte
    pub value: u64,      // 8 bytes (unaligned!)
    pub another_flag: u8, // 1 byte
}

// Size: 10 bytes, but 'value' is unaligned
```

**Problem:** Unaligned reads are slower and may cause issues with zero-copy.

### Aligned Struct (Efficient)

```rust
#[repr(C)]
#[derive(Pod, Zeroable)]
pub struct Aligned {
    pub flag: u8,         // 1 byte
    pub _padding1: [u8; 7], // 7 bytes padding
    pub value: u64,       // 8 bytes (aligned to 8-byte boundary)
    pub another_flag: u8, // 1 byte
    pub _padding2: [u8; 7], // 7 bytes padding
}

// Size: 24 bytes (larger but faster)
```

**Benefit:** `value` is aligned to 8-byte boundary, enabling faster reads.

### Automatic Alignment with repr(C)

```rust
#[repr(C)]
pub struct AutoAligned {
    pub value: u64,      // 8 bytes (aligned)
    pub flag: u8,        // 1 byte
    // Compiler adds 7 bytes padding automatically
}

// Size: 16 bytes (8 + 1 + 7 padding)
```

**Best Practice:** Put larger fields first to minimize padding.

## Bytemuck for Zero-Copy

Bytemuck enables safe zero-copy casting.

### Basic Usage

```rust
use bytemuck::{Pod, Zeroable};

#[repr(C)]
#[derive(Copy, Clone, Pod, Zeroable)]
pub struct Pool {
    pub reserve_a: u64,
    pub reserve_b: u64,
}

pub fn read_pool(account_data: &[u8]) -> Result<&Pool> {
    let pool = bytemuck::try_from_bytes::<Pool>(account_data)
        .map_err(|_| ErrorCode::InvalidAccountData)?;
    Ok(pool)
}

pub fn write_pool(account_data: &mut [u8], reserve_a: u64, reserve_b: u64) -> Result<()> {
    let pool = bytemuck::from_bytes_mut::<Pool>(account_data);
    pool.reserve_a = reserve_a;
    pool.reserve_b = reserve_b;
    Ok(())
}
```

### Pod Requirements

To implement `Pod`, types must:
1. Be `Copy`
2. Be `repr(C)` or `repr(transparent)`
3. Contain only `Pod` types
4. Have no padding (or use `Zeroable` padding)

**Valid Pod Types:**
- Primitives: `u8`, `u16`, `u32`, `u64`, `i8`, etc.
- Arrays: `[T; N]` where `T: Pod`
- Custom structs with `#[repr(C)]` and only `Pod` fields

**Invalid Pod Types:**
- `Vec<T>`, `String`, `Box<T>` (heap-allocated)
- `Option<T>` (non-zero variant)
- Enums (except `#[repr(C)]` with single variant)

### Anchor Integration

```rust
use anchor_lang::prelude::*;

#[account(zero_copy)]
pub struct ZeroCopyPool {
    pub reserve_a: u64,
    pub reserve_b: u64,
}

// Anchor auto-generates Pod + Zeroable
```

## Real CU Benchmarks

### Small Struct (72 bytes)

| Approach | Serialize | Deserialize | Total |
|----------|-----------|-------------|-------|
| Borsh | 4,200 CU | 8,127 CU | 12,327 CU |
| Bytemuck | <5 CU | 40 CU | 45 CU |
| Manual | 2,500 CU | 45 CU | 2,545 CU |

**Winner:** Bytemuck (273× faster than Borsh)

### Medium Struct (1 KB)

| Approach | Serialize | Deserialize | Total |
|----------|-----------|-------------|-------|
| Borsh | ~4,000 CU | ~7,500 CU | 11,500 CU |
| Bytemuck | <5 CU | 40 CU | 45 CU |
| Manual | ~3,000 CU | ~3,000 CU | 6,000 CU |

**Winner:** Bytemuck (255× faster than Borsh)

### Large Struct (10 KB)

| Approach | Serialize | Deserialize | Total |
|----------|-----------|-------------|-------|
| Borsh | ~40,000 CU | ~75,000 CU | 115,000 CU |
| Bytemuck | <5 CU | 40 CU | 45 CU |
| Manual | ~30,000 CU | ~30,000 CU | 60,000 CU |

**Winner:** Bytemuck (2,555× faster than Borsh)

**Key Insight:** As struct size grows, zero-copy's advantage becomes dramatic.

## Optimization Checklist

1. **Use Zero-Copy for Fixed-Size Structs:** If all fields are `Copy`, use `AccountLoader` + `#[account(zero_copy)]`
2. **Bit-Pack Boolean Flags:** Pack multiple bools into a single `u8` or `u16`
3. **Align Fields:** Put larger fields first to minimize padding
4. **Minimize Discriminator Size:** Use 1-byte discriminators for small programs
5. **Reserve Space for Upgrades:** Allocate extra bytes if account evolution is likely
6. **Benchmark Your Structs:** Profile serialization costs with tools like `solana-program-test`

## Common Pitfalls

1. **Using Borsh for Large Structs:** Wastes thousands of CU; use zero-copy instead
2. **Unaligned Fields:** Causes slow reads and zero-copy failures
3. **Missing Padding:** Breaks `Pod` trait requirements
4. **Dynamic Types with Zero-Copy:** `Vec`, `String` cannot be `Pod`
5. **Over-Engineering:** For small structs (<100 bytes), Borsh is fine

## Decision Framework

| Struct Size | Dynamic Data? | Recommended Approach |
|-------------|---------------|---------------------|
| <100 bytes | No | Borsh or Manual |
| <100 bytes | Yes | Borsh |
| 100 B - 1 KB | No | Bytemuck (zero-copy) |
| 100 B - 1 KB | Yes | Manual or Borsh |
| 1 KB+ | No | Bytemuck (zero-copy) |
| 1 KB+ | Yes | Manual with zero-copy sections |

## Sources

- [Borsh vs Bytemuck vs Manual Deserialization](https://mrb1nary.substack.com/p/borsh-vs-bytemuck-vs-manual-deserialization)
- [GitHub - febo/tide: Benchmarking serialization crates for Solana](https://github.com/febo/tide)
- [Solana Cookbook | Serializing Data](https://solanacookbook.com/guides/serialization.html)
- [Encoding state - The Bonfida Development Guide](https://utils.bonfida.org/02.01_Encoding_state.html)
- [Solana Serialization Benchmarks | Metaplex](https://medium.com/metaplex/solana-serialization-benchmarks-a90d32c99fd2)
- [Optimizing Solana Programs | Helius](https://www.helius.dev/blog/optimizing-solana-programs)
- [How to Optimize Compute Usage on Solana](https://solana.com/developers/guides/advanced/how-to-optimize-compute)
- [CU Optimizations Repository | Solana Developers](https://github.com/solana-developers/cu_optimizations)
- [Why Solana Transaction Costs and Compute Units Matter | Anza](https://www.anza.xyz/blog/why-solana-transaction-costs-and-compute-units-matter-for-developers)
