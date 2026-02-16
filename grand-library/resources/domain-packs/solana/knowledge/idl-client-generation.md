---
pack: solana
confidence: 8/10
sources_checked: 9
last_updated: "2026-02-16"
---

# How do I generate TypeScript clients from my Solana program?

## Overview

Interface Definition Language (IDL) files describe a Solana program's public interface—its accounts, instructions, types, and errors. TypeScript clients generated from IDLs provide type-safe, developer-friendly APIs for interacting with on-chain programs, eliminating manual serialization and account management.

## Anchor IDL Auto-Generation

Anchor automatically generates IDL files during the build process.

### Building with Anchor

```bash
# Build program and generate IDL
anchor build

# IDL output locations
# JSON: target/idl/<program_name>.json
# TypeScript: target/types/<program_name>.ts
```

### Anchor IDL Structure

```json
{
  "version": "0.1.0",
  "name": "my_program",
  "instructions": [
    {
      "name": "initialize",
      "accounts": [
        {"name": "state", "isMut": true, "isSigner": false},
        {"name": "authority", "isMut": false, "isSigner": true},
        {"name": "systemProgram", "isMut": false, "isSigner": false}
      ],
      "args": [
        {"name": "data", "type": "u64"}
      ]
    }
  ],
  "accounts": [
    {
      "name": "State",
      "type": {
        "kind": "struct",
        "fields": [
          {"name": "authority", "type": "publicKey"},
          {"name": "data", "type": "u64"}
        ]
      }
    }
  ],
  "errors": [
    {"code": 6000, "name": "Unauthorized", "msg": "You are not authorized"}
  ]
}
```

### Using Anchor TypeScript Client

```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { MyProgram } from "../target/types/my_program";

// Load the program
const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);

const program = anchor.workspace.MyProgram as Program<MyProgram>;

// Type-safe instruction calls
await program.methods
    .initialize(new anchor.BN(42))
    .accounts({
        state: statePda,
        authority: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();

// Type-safe account fetching
const stateAccount = await program.account.state.fetch(statePda);
console.log("Authority:", stateAccount.authority.toBase58());
console.log("Data:", stateAccount.data.toString());

// Subscribe to account changes
const subscriptionId = program.account.state.subscribe(
    statePda,
    (account, context) => {
        console.log("State updated:", account.data.toString());
    }
);
```

**Key Benefits:**
- Automatic PDA derivation from seeds defined in constraints
- Type-safe method builders
- Account fetching with proper TypeScript types
- Event subscription support
- Error code mapping

## Codama/Kinobi Framework

Codama (formerly Kinobi) is a next-generation IDL and client generation framework developed by Metaplex, offering more flexibility than Anchor's built-in client.

### Why Codama?

- **Language Agnostic:** Generate clients in TypeScript, Rust, and more
- **Customizable:** Modify the IDL tree with visitors before code generation
- **Modern Architecture:** Uses a node-based IR (Intermediate Representation)
- **Anchor Compatible:** Can consume Anchor IDLs
- **Framework Integration:** Works with Solana Kit, Umi, and other frameworks

### Installation

```bash
npm install --save-dev @codama/cli
npm install @codama/renderers-js @codama/visitors-js
```

### Basic Configuration

Create `codama.config.ts` or `codama.config.js`:

```typescript
import { createFromRoot } from '@codama/cli';
import { renderVisitor } from '@codama/renderers-js';

export default createFromRoot({
    // Path to your Anchor IDL
    idlPath: './target/idl/my_program.json',

    // Output directory
    outputPath: './src/generated',

    // Render TypeScript client
    visitors: [
        renderVisitor('./src/generated', {
            // Configuration options
            useAnchorTypes: true,
            prettierOptions: { semi: true, singleQuote: true },
        }),
    ],
});
```

### Generate Client

```bash
# Using the CLI
npx codama

# Or via package.json script
{
  "scripts": {
    "generate": "codama"
  }
}
```

### Using Codama with Solana Kit

Codama integrates with modern Solana frameworks like Solana Kit (replacement for `@solana/web3.js` v1).

```typescript
import { createSolanaRpc, createSolanaRpcSubscriptions } from '@solana/web3.js';
import { createMyProgramClient } from './generated';

// Setup RPC
const rpc = createSolanaRpc('https://api.mainnet-beta.solana.com');
const rpcSubscriptions = createSolanaRpcSubscriptions('wss://api.mainnet-beta.solana.com');

// Create program client
const client = createMyProgramClient(rpc, rpcSubscriptions);

// Call instructions
await client.initialize({
    state: statePda,
    authority: authorityAddress,
    systemProgram: systemProgramAddress,
    data: 42n, // BigInt support
}).sendAndConfirm();

// Fetch accounts
const account = await client.getState(statePda);
console.log('Data:', account.data);
```

**Advantages over Anchor Client:**
- Tree-shakeable (smaller bundle sizes)
- No Anchor runtime dependency
- Works in browsers without polyfills
- Future-proof with web3.js v2

### Advanced: Modifying the IDL with Visitors

Codama's visitor pattern allows you to transform the IDL before rendering.

```typescript
import { createFromRoot } from '@codama/cli';
import { renderVisitor } from '@codama/renderers-js';
import { updateInstructionsVisitor } from '@codama/visitors-js';

export default createFromRoot({
    idlPath: './target/idl/my_program.json',
    outputPath: './src/generated',
    visitors: [
        // Modify instructions before rendering
        updateInstructionsVisitor({
            initialize: {
                // Rename account for better semantics
                accounts: {
                    state: { rename: 'stateAccount' },
                },
                // Set default values
                args: {
                    data: { defaultValue: 0n },
                },
            },
        }),

        renderVisitor('./src/generated'),
    ],
});
```

**Common Visitors:**
- `updateInstructionsVisitor`: Modify instructions
- `updateAccountsVisitor`: Transform account types
- `deleteNodesVisitor`: Remove unwanted nodes
- `setStructDefaultValuesVisitor`: Add default values

## Publishing IDLs On-Chain

IDLs can be stored on-chain for dynamic client discovery and verification.

### Anchor IDL Upload

```bash
# Upload IDL to program account
anchor idl init -f target/idl/my_program.json <PROGRAM_ID>

# Update existing IDL
anchor idl upgrade -f target/idl/my_program.json <PROGRAM_ID>

# Fetch IDL from on-chain
anchor idl fetch <PROGRAM_ID> -o my_program.json
```

### IDL Account Structure

Anchor creates a PDA with seeds `["anchor:idl", program_id]` containing:

```rust
pub struct IdlAccount {
    // Authority that can update the IDL
    pub authority: Pubkey,
    // Compressed IDL data
    pub data: Vec<u8>,
}
```

### Fetching On-Chain IDL Programmatically

```typescript
import { Program } from "@coral-xyz/anchor";

// Fetch IDL from on-chain
const programId = new PublicKey("YourProgramId");
const idl = await Program.fetchIdl(programId, provider);

if (idl) {
    // Create program instance with fetched IDL
    const program = new Program(idl, programId, provider);

    // Use as normal
    await program.methods.initialize(42).rpc();
}
```

**Use Cases:**
- Version verification (ensure client matches deployed program)
- Dynamic client generation for explorers and tooling
- Trustless IDL distribution

## IDL Versioning Strategies

### Semantic Versioning in IDL

```json
{
  "version": "1.2.0",
  "name": "my_program",
  "metadata": {
    "spec": "0.1.0",
    "releaseDate": "2026-02-15"
  }
}
```

### Client-Side Version Checking

```typescript
async function ensureCompatibleVersion(
    program: Program<MyProgram>,
    requiredVersion: string
) {
    const onChainIdl = await Program.fetchIdl(program.programId, provider);

    if (!onChainIdl) {
        throw new Error("IDL not found on-chain");
    }

    const onChainVersion = onChainIdl.version;

    // Check semantic version compatibility
    if (!isCompatible(onChainVersion, requiredVersion)) {
        throw new Error(
            `Version mismatch: client expects ${requiredVersion}, ` +
            `but on-chain is ${onChainVersion}`
        );
    }
}
```

### Handling Breaking Changes

**Strategy 1: Multiple Client Versions**

```typescript
// v1/client.ts
export const MyProgramV1 = Program<MyProgramV1Type>;

// v2/client.ts
export const MyProgramV2 = Program<MyProgramV2Type>;

// Use based on detected version
const program = version === "1.0.0" ? MyProgramV1 : MyProgramV2;
```

**Strategy 2: Adapter Pattern**

```typescript
interface UnifiedClient {
    initialize(data: number): Promise<string>;
}

class V1Adapter implements UnifiedClient {
    async initialize(data: number): Promise<string> {
        return await programV1.methods.initialize(data).rpc();
    }
}

class V2Adapter implements UnifiedClient {
    async initialize(data: number): Promise<string> {
        // V2 has different signature
        return await programV2.methods.init({ value: data }).rpc();
    }
}
```

## Type-Safe Client Patterns

### Strict Account Types

```typescript
import { PublicKey } from "@solana/web3.js";
import { Program } from "@coral-xyz/anchor";

// Define strict account types
type StateAccount = {
    authority: PublicKey;
    data: number;
    bump: number;
};

// Type guard for runtime validation
function isStateAccount(account: any): account is StateAccount {
    return (
        account.authority instanceof PublicKey &&
        typeof account.data === "number" &&
        typeof account.bump === "number"
    );
}

// Type-safe fetcher
async function fetchStateAccount(
    program: Program,
    address: PublicKey
): Promise<StateAccount> {
    const account = await program.account.state.fetch(address);

    if (!isStateAccount(account)) {
        throw new Error("Invalid state account data");
    }

    return account;
}
```

### Transaction Builder Pattern

```typescript
class MyProgramClient {
    constructor(private program: Program<MyProgram>) {}

    async initialize(params: {
        state: PublicKey;
        authority: PublicKey;
        data: number;
    }): Promise<TransactionBuilder> {
        return new TransactionBuilder(this.program)
            .add(
                await this.program.methods
                    .initialize(params.data)
                    .accounts({
                        state: params.state,
                        authority: params.authority,
                        systemProgram: SystemProgram.programId,
                    })
                    .instruction()
            );
    }
}

class TransactionBuilder {
    private instructions: TransactionInstruction[] = [];

    constructor(private program: Program) {}

    add(ix: TransactionInstruction): this {
        this.instructions.push(ix);
        return this;
    }

    async send(): Promise<string> {
        const tx = new Transaction().add(...this.instructions);
        return await this.program.provider.sendAndConfirm(tx);
    }

    build(): Transaction {
        return new Transaction().add(...this.instructions);
    }
}
```

## Metaplex Umi Patterns

Metaplex's Umi framework offers an alternative client generation approach.

### Umi Client Generation

```typescript
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { createMyProgramClient } from './generated/umi';

const umi = createUmi('https://api.mainnet-beta.solana.com');

const client = createMyProgramClient(umi);

await client.initialize({
    state: statePda,
    authority: umi.identity.publicKey,
    data: 42,
}).sendAndConfirm(umi);
```

**Umi Benefits:**
- Unified interface across Metaplex programs
- Built-in signer and identity management
- Consistent error handling
- Plugin architecture for extensions

## Custom Client Generators

For specialized needs, you can build custom generators.

### Basic Generator Structure

```typescript
import { Idl } from "@coral-xyz/anchor";
import * as fs from "fs";

interface ClientGeneratorOptions {
    idlPath: string;
    outputPath: string;
    templatePath?: string;
}

function generateClient(options: ClientGeneratorOptions): void {
    // Load IDL
    const idl: Idl = JSON.parse(fs.readFileSync(options.idlPath, "utf-8"));

    // Generate instruction methods
    const methods = idl.instructions.map((ix) => {
        return `
async ${ix.name}(${generateParams(ix.args)}): Promise<string> {
    return await this.program.methods
        .${ix.name}(${ix.args.map(a => a.name).join(", ")})
        .accounts({
            ${generateAccounts(ix.accounts)}
        })
        .rpc();
}`;
    }).join("\n\n");

    // Generate account fetchers
    const fetchers = idl.accounts?.map((acc) => {
        return `
async fetch${acc.name}(address: PublicKey): Promise<${acc.name}> {
    return await this.program.account.${camelCase(acc.name)}.fetch(address);
}`;
    }).join("\n\n");

    // Combine into client class
    const clientCode = `
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { ${idl.name} } from "../target/types/${idl.name}";

export class ${pascalCase(idl.name)}Client {
    constructor(private program: Program<${idl.name}>) {}

    ${methods}

    ${fetchers}
}
`;

    // Write to file
    fs.writeFileSync(options.outputPath, clientCode);
}
```

## Performance Considerations

- **Bundle Size:** Codama clients are tree-shakeable; Anchor clients include full runtime
- **Initialization Cost:** Lazy-load program instances for faster startup
- **Account Caching:** Cache fetched accounts to reduce RPC calls
- **Batch Operations:** Use transaction builders to batch multiple instructions

## Common Pitfalls

1. **IDL Sync:** Always regenerate clients after program changes
2. **Version Mismatches:** Verify on-chain IDL matches client IDL
3. **Missing Accounts:** Anchor auto-resolves PDAs, but manual accounts must be provided
4. **Type Mismatches:** BigNumbers (BN) vs native numbers—use correct types
5. **Account Size:** Generated account types don't include space calculations

## Sources

- [How to Create Anchor Program Clients using Codama | Quicknode](https://www.quicknode.com/guides/solana-development/anchor/codama-client)
- [How to Create Custom Program Clients in Solana Kit with Codama | Quicknode](https://www.quicknode.com/guides/solana-development/tooling/web3-2/program-clients)
- [Codama IDL GitHub Repository](https://github.com/codama-idl/codama)
- [Generating Clients | Solana](https://solana.com/docs/programs/codama/clients)
- [IDLs (Interface Definition Language) | Solana](https://solana.com/developers/guides/advanced/idls)
- [What is an IDL? | Quicknode](https://www.quicknode.com/guides/solana-development/anchor/what-is-an-idl)
- [Anchor Client Generator GitHub](https://github.com/kklas/anchor-client-gen)
