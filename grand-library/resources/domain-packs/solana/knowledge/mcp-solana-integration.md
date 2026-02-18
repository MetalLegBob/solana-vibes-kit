---
pack: solana
topic: "MCP Solana Integration"
decision: "How do I use Model Context Protocol to give AI tools access to Solana blockchain data?"
confidence: 8/10
sources_checked: 28
last_updated: "2026-02-18"
---

# MCP Solana Integration

> **Decision:** How do I use Model Context Protocol to give AI tools access to Solana blockchain data?

## Context

The Model Context Protocol (MCP) is an open protocol created by Anthropic that standardizes how AI assistants connect to external tools, data sources, and services. Often described as "USB-C for AI," MCP provides a universal interface so that any compatible LLM host (Claude Desktop, Cursor, Windsurf, VS Code, etc.) can communicate with any MCP server that exposes tools, resources, or prompts. Since its open-source release in November 2024, MCP has been adopted by OpenAI, Google DeepMind, Microsoft, and Meta AI, making it the de facto standard for giving AI models structured access to the outside world.

For Solana developers, MCP is transformative. Instead of copy-pasting RPC responses into a chat window or writing one-off scripts, developers can give their AI assistant direct, structured access to the Solana blockchain. An MCP server for Solana wraps RPC methods (getBalance, getAccountInfo, getTransaction, etc.) as "tools" that the AI can invoke on demand. This means a developer can ask Claude "What is the SOL balance of address X?" and the AI will call the MCP tool, get the real answer, and respond with actual on-chain data rather than a hallucinated guess.

The Solana MCP ecosystem has expanded rapidly since early 2025. The Solana Foundation itself maintains both an educational demo server (`solana-dev-mcp`) and an official production server (`solana-mcp-official` at `mcp.solana.com`). Third-party implementations range from OpenSVM's comprehensive 73+ method Rust server to Chainstack's multi-chain MCP suite, and from SendAI's agent-powered MCP server (with 60+ blockchain actions) to GOAT SDK's universal agentic finance toolkit that exposes 200+ on-chain operations via MCP. The ecosystem also includes specialized servers from Helius, deBridge, Jupiter, and many protocol-specific implementations. Choosing the right approach depends on whether you need read-only data queries, full agent capabilities, multi-chain support, or custom integrations.

## Options

### Option A: Solana Foundation Official MCP (mcp.solana.com)

**What:** The official Solana Developer MCP server, a remote hosted MCP service maintained by the Solana Foundation. Available at `mcp.solana.com`, it provides AI-powered developer assistance with deep knowledge of Solana documentation, Anchor framework, program examples, and StackExchange Q&A.

**Architecture:**
- **Remote hosted:** Streamable HTTP transport at `https://mcp.solana.com/mcp` -- no local install required
- **Knowledge sources:** Solana StackExchange, Solana Program Examples, Anchor Framework documentation, Solana official documentation
- **Expert tools:** `Ask_Solana_Anchor_Framework_Expert`, `Ask_Solana_Developer_Expert`, and related knowledge-query tools
- **IDE support:** Pre-configured for Claude Code, Cursor, and Windsurf

**Pros:**
- Zero infrastructure required -- hosted and maintained by the Solana Foundation
- Always up-to-date with latest Solana documentation and best practices
- Deep contextual knowledge of Anchor syntax, program patterns, and developer resources
- Works across all major AI IDEs with minimal configuration
- Best source for "how do I build X on Solana?" questions

**Cons:**
- Primarily a documentation/knowledge server, not a direct RPC data server
- Does not provide live on-chain data queries (no getBalance, getTransaction tools)
- Requires internet connectivity for every query
- Cannot be customized or extended
- Dependent on Solana Foundation uptime

**Best for:**
- Solana developers learning the ecosystem
- Teams that need accurate, up-to-date Solana and Anchor development guidance
- AI-assisted Solana program development in Cursor or Windsurf
- Complement to an RPC-based MCP server for a complete setup

**Code Example -- Claude Code setup:**

```bash
# One-line setup for Claude Code
claude mcp add --transport http solana-mcp-server https://mcp.solana.com/mcp
```

**Code Example -- Cursor setup:**

```json
{
  "mcpServers": {
    "solanaMcp": {
      "command": "npx",
      "args": ["mcp-remote", "https://mcp.solana.com/mcp"]
    }
  }
}
```

**Code Example -- Windsurf setup:**

```json
{
  "mcpServers": {
    "solanaMcp": {
      "command": "npx",
      "args": ["mcp-remote", "https://mcp.solana.com/mcp"]
    }
  }
}
```

---

### Option B: Solana Foundation Dev MCP (solana-dev-mcp)

**What:** The Solana Foundation's open-source educational MCP demo, designed as a reference implementation and starting point for building your own Solana MCP server. Provides basic RPC methods and development prompts.

**Architecture:**
- **Local server:** Runs via `ts-node` or compiled Node.js with stdio transport
- **Tools:** `getBalance`, `getAccountInfo`, `getTransaction` -- basic Solana RPC methods
- **Prompts:** Built-in development prompts for Solana best practices
- **Language:** TypeScript, single-file implementation (`index.ts`)

**Pros:**
- Official Solana Foundation reference implementation
- Simple, readable codebase -- ideal for learning MCP
- Easy to fork and extend with custom tools
- Minimal dependencies (just MCP SDK + Solana web3.js)
- Great starting point for building custom servers

**Cons:**
- Only 3 basic RPC tools -- not production-complete
- No token account queries, no WebSocket subscriptions
- Demo quality -- not hardened for production use
- No multi-network support
- No caching, rate limiting, or error recovery

**Best for:**
- Learning how MCP works with Solana
- Teams building custom MCP servers who want a clean starting point
- Workshops and hackathons
- Quick prototyping

**Code Example -- Installation and config generation:**

```bash
git clone https://github.com/solana-foundation/solana-dev-mcp.git
cd solana-dev-mcp
pnpm install

# Generate Claude Desktop config
pnpm generate-config

# Test with MCP Inspector
npx @modelcontextprotocol/inspector ts-node index.ts
```

**Claude Desktop config (generated):**

```json
{
  "mcpServers": {
    "solana-dev": {
      "command": "ts-node",
      "args": ["/absolute/path/to/solana-dev-mcp/index.ts"]
    }
  }
}
```

---

### Option C: OpenSVM Solana MCP Server

**What:** A comprehensive, production-grade MCP server written in Rust that exposes 73+ Solana RPC methods. Supports multiple SVM networks simultaneously, WebSocket subscriptions, and flexible deployment options (stdio, HTTP, Docker, Kubernetes).

**Architecture:**
- **Language:** Rust (62.9%), with HTML dashboard and shell scripts
- **Transport modes:** Stdio (for Claude Desktop) and Web Service (HTTP API on port 3000)
- **RPC coverage:** 73+ methods across accounts, blocks, transactions, tokens, system, and validator categories
- **Multi-network:** Query multiple SVM-compatible networks in parallel
- **Deployment:** Local binary, Docker, Kubernetes with HPA autoscaling, serverless (AWS Lambda, Vercel, GCP)
- **Monitoring:** Prometheus metrics, health check endpoints

**Pros:**
- Most comprehensive RPC method coverage of any Solana MCP server
- High performance Rust implementation with connection pooling and caching
- Multi-network support -- query mainnet, devnet, Eclipse, Sonic, etc. simultaneously
- Full WebSocket subscription support for real-time data
- Production-ready: monitoring, autoscaling, rate limiting, error recovery
- One-liner install script for Claude Desktop

**Cons:**
- Requires Rust toolchain for building from source
- More complex than TypeScript alternatives
- Read-only RPC methods -- no transaction signing or agent actions
- Heavier resource footprint than lightweight alternatives
- Fewer community users than SendAI or GOAT approaches

**Best for:**
- Teams that need comprehensive, real-time Solana data access
- Infrastructure engineers running MCP as a service
- Multi-network analytics and research
- Projects requiring WebSocket-based real-time monitoring via AI

**Code Example -- One-liner installation:**

```bash
# Install and auto-configure for Claude Desktop
curl -fsSL https://raw.githubusercontent.com/opensvm/solana-mcp-server/main/scripts/install.sh | bash
```

**Code Example -- Web service mode:**

```bash
# Run as HTTP API
solana-mcp-server web --port 8080

# Endpoints:
# POST /api/mcp  -- MCP JSON-RPC API
# GET  /health   -- Health check
# GET  /metrics  -- Prometheus metrics
```

**Code Example -- Claude Desktop config:**

```json
{
  "mcpServers": {
    "solana": {
      "command": "/path/to/solana-mcp-server",
      "env": {
        "SOLANA_RPC_URL": "https://api.mainnet-beta.solana.com"
      }
    }
  }
}
```

**Available RPC Method Categories:**

| Category     | Methods                                                                              |
| ------------ | ------------------------------------------------------------------------------------ |
| Accounts     | getAccountInfo, getMultipleAccounts, getProgramAccounts, getBalance, getLargestAccounts |
| Blocks       | getBlock, getBlockHeight, getBlockTime, getBlocks, getBlocksWithLimit               |
| Transactions | getTransaction, getSignaturesForAddress, getSignatureStatuses, simulateTransaction   |
| Tokens       | getTokenAccountBalance, getTokenAccountsByOwner, getTokenLargestAccounts, getTokenSupply |
| System       | getSlot, getEpochInfo, getInflationRate, getHealth, getVersion, getClusterNodes      |
| Validators   | getVoteAccounts, getLeaderSchedule, getStakeMinimumDelegation                       |
| WebSocket    | accountSubscribe, slotSubscribe, logsSubscribe, signatureSubscribe                   |

---

### Option D: Chainstack RPC Nodes MCP

**What:** Chainstack's MCP server suite provides AI models with direct access to both Solana and EVM blockchain networks, plus a documentation server. It is part of the `chainstacklabs/rpc-nodes-mcp` repository and connects to Chainstack's managed RPC infrastructure.

**Architecture:**
- **Three-server suite:** Solana MCP server, EVM MCP server, Developer Portal MCP server
- **Transport:** Streamable HTTP (latest MCP standard) for the docs server; stdio for RPC servers
- **Solana tools:** Balance queries, account info, token operations, transaction lookups, slot/epoch data
- **EVM tools:** All EVM-compatible chain operations (Ethereum, Polygon, Arbitrum, Base, etc.)
- **Docs server:** Full Chainstack documentation accessible at `https://docs.chainstack.com/mcp`

**Pros:**
- Multi-chain coverage: Solana + all EVM chains from a single MCP config
- Backed by Chainstack's enterprise-grade RPC infrastructure
- Documentation MCP server for protocol-specific guidance
- Pre-built integration buttons for Cursor and VS Code on docs pages
- Streamable HTTP transport (newer than SSE) for the docs server

**Cons:**
- Requires Chainstack account and RPC endpoints (has free tier)
- Less Solana-specific depth than OpenSVM or SendAI options
- Tied to Chainstack infrastructure -- no self-hosted RPC option
- Fewer Solana-specific tools compared to dedicated Solana MCP servers

**Best for:**
- Teams building across both Solana and EVM chains
- Developers who already use Chainstack for RPC
- Projects that want documentation + RPC access in one setup
- Cross-chain comparison and analytics workflows

**Code Example -- Claude Code setup (docs server):**

```bash
claude mcp add --transport http Chainstack-Developer-Portal https://docs.chainstack.com/mcp
```

**Code Example -- Solana RPC MCP config:**

```json
{
  "mcpServers": {
    "chainstack-solana": {
      "command": "npx",
      "args": ["-y", "@chainstacklabs/rpc-nodes-mcp"],
      "env": {
        "SOLANA_RPC_URL": "https://your-chainstack-solana-endpoint.com"
      }
    }
  }
}
```

---

### Option E: Build Your Own (QuickNode Guide Pattern)

**What:** Build a custom Solana MCP server from scratch using the MCP TypeScript SDK and Solana Kit (`@solana/kit`). The QuickNode guide provides a comprehensive tutorial for this approach. This gives you full control over which tools to expose, how to handle errors, and what prompts to include.

**Architecture:**
- **Core deps:** `@modelcontextprotocol/sdk`, `@solana/kit`, `zod`, TypeScript
- **Transport:** Stdio (default for Claude Desktop/Cursor) or HTTP
- **Tools:** Define exactly what you need -- balance checks, token accounts, transactions, custom queries
- **Prompts:** Add custom prompts that guide the AI's usage patterns
- **Resources:** Expose static data (network info, program addresses) as MCP resources

**Pros:**
- Full control over tool definitions, error handling, and response formatting
- No unnecessary dependencies -- only include what you need
- Can integrate custom business logic, proprietary APIs, or internal services
- Best learning experience for understanding MCP internals
- Can use any RPC provider (QuickNode, Helius, Alchemy, etc.)

**Cons:**
- More development effort than using pre-built servers
- Must maintain and update as Solana evolves
- No pre-built multi-network or WebSocket support
- Must implement your own error handling, rate limiting, and caching
- Requires deep understanding of both MCP and Solana RPC

**Best for:**
- Teams with specific, unique requirements not covered by existing servers
- Companies that want to integrate proprietary data alongside Solana data
- Developers who want deep understanding of the MCP-Solana integration
- Projects that need to combine multiple data sources in one MCP server

**Code Example -- Full custom MCP server (TypeScript):**

```typescript
// src/index.ts -- Custom Solana MCP Server
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  createSolanaRpc,
  address,
  assertIsAddress,
  assertIsSignature,
} from "@solana/kit";

// Configuration from environment (set via claude_desktop_config.json)
const CONFIG = {
  rpcEndpoint:
    process.env.SOLANA_RPC_ENDPOINT ||
    "https://api.mainnet-beta.solana.com",
};

const solanaRpc = createSolanaRpc(CONFIG.rpcEndpoint);

// Initialize MCP server
const server = new McpServer({
  name: "SolanaMCP",
  version: "1.0.0",
});

// Tool: Get SOL balance
server.tool(
  "getBalance",
  {
    walletAddress: z
      .string()
      .describe("Solana wallet address to check the balance for"),
  },
  async (args: { walletAddress: string }) => {
    try {
      assertIsAddress(args.walletAddress);
      const accountAddress = address(args.walletAddress);
      const { value: lamports } = await solanaRpc
        .getBalance(accountAddress)
        .send();
      const solBalance = Number(lamports) / 1_000_000_000;
      return {
        content: [
          {
            type: "text" as const,
            text: `Balance for ${args.walletAddress}: ${solBalance} SOL (${lamports} lamports)`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error fetching balance: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool: Get account info
server.tool(
  "getAccountInfo",
  {
    accountAddress: z
      .string()
      .describe("Solana account address to look up"),
  },
  async (args: { accountAddress: string }) => {
    try {
      assertIsAddress(args.accountAddress);
      const pubkey = address(args.accountAddress);
      const { value: accountInfo } = await solanaRpc
        .getAccountInfo(pubkey, { encoding: "jsonParsed" })
        .send();

      if (!accountInfo) {
        return {
          content: [
            { type: "text" as const, text: "Account not found." },
          ],
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                lamports: Number(accountInfo.lamports),
                owner: accountInfo.owner,
                executable: accountInfo.executable,
                rentEpoch: Number(accountInfo.rentEpoch),
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool: Get transaction details
server.tool(
  "getTransaction",
  {
    signature: z
      .string()
      .describe("Transaction signature to look up"),
  },
  async (args: { signature: string }) => {
    try {
      assertIsSignature(args.signature);
      const tx = await solanaRpc
        .getTransaction(args.signature, {
          maxSupportedTransactionVersion: 0,
        })
        .send();

      if (!tx) {
        return {
          content: [
            { type: "text" as const, text: "Transaction not found." },
          ],
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                slot: tx.slot,
                blockTime: tx.blockTime,
                fee: tx.meta?.fee,
                status: tx.meta?.err ? "Failed" : "Success",
                logMessages: tx.meta?.logMessages?.slice(0, 10),
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool: Get token accounts for a wallet
server.tool(
  "getTokenAccounts",
  {
    walletAddress: z
      .string()
      .describe("Solana wallet address to check token accounts for"),
  },
  async ({ walletAddress }) => {
    try {
      assertIsAddress(walletAddress);
      const owner = address(walletAddress);
      const tokenProgram = address(
        "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
      );
      const { value: tokenAccounts } = await solanaRpc
        .getTokenAccountsByOwner(
          owner,
          { programId: tokenProgram },
          { encoding: "jsonParsed" }
        )
        .send();

      const accounts = tokenAccounts.map((ta: any) => ({
        mint: ta.account.data.parsed.info.mint,
        amount: ta.account.data.parsed.info.tokenAmount.uiAmountString,
        decimals: ta.account.data.parsed.info.tokenAmount.decimals,
      }));

      return {
        content: [
          {
            type: "text" as const,
            text:
              accounts.length > 0
                ? JSON.stringify(accounts, null, 2)
                : "No token accounts found.",
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Start the server
async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Solana MCP server running on stdio");
}

runServer().catch(console.error);
```

**Claude Desktop configuration for custom server:**

```json
{
  "mcpServers": {
    "solana": {
      "command": "node",
      "args": ["/absolute/path/to/build/index.js"],
      "env": {
        "SOLANA_RPC_ENDPOINT": "https://your-rpc-endpoint.com"
      }
    }
  }
}
```

**Project setup commands:**

```bash
mkdir solana-mcp && cd solana-mcp
npm init -y
npm install @modelcontextprotocol/sdk @solana/kit zod
npm install -D typescript @types/node
npx tsc --init

# Build and test
npm run build
npx @modelcontextprotocol/inspector node build/index.js
```

---

### Option F: SendAI Solana Agent Kit MCP

**What:** A full-featured MCP server powered by the Solana Agent Kit (sendaifun/solana-mcp), exposing 60+ blockchain actions as MCP tools. Unlike read-only servers, this enables transaction execution: token swaps, NFT minting, DeFi interactions, wallet management, and more.

**Architecture:**
- **Core:** Built on Solana Agent Kit with full transaction signing capabilities
- **Tools:** 60+ actions including swaps (Jupiter), lending (marginfi), NFT operations (Metaplex), staking, bridging
- **Auth:** Requires wallet private key and RPC URL in environment
- **Transport:** Stdio for Claude Desktop, npm-installable globally

**Pros:**
- Read AND write -- can execute transactions, not just query data
- 60+ pre-built tools covering all major Solana DeFi protocols
- Quick install via npm (`npx solana-mcp`)
- Interactive installation script for Claude Desktop setup
- Backed by SendAI ecosystem with active maintenance (148+ GitHub stars)

**Cons:**
- Requires wallet private key -- significant security consideration
- Heavier dependency footprint (all protocol integrations)
- Agent actions are irreversible -- no undo on chain
- Requires careful permission scoping for production use
- OpenAI API key optional but needed for some features

**Best for:**
- Building autonomous agents that need to transact on Solana
- AI-assisted portfolio management and DeFi operations
- Teams that want Claude to execute on-chain operations via natural language
- Prototyping agentic workflows with real Solana interactions

**Code Example -- Quick install:**

```bash
# Install globally
npm install -g solana-mcp

# Or use interactive installer
curl -fsSL https://raw.githubusercontent.com/sendaifun/solana-mcp/main/scripts/install.sh \
  -o solana-mcp-install.sh
chmod +x solana-mcp-install.sh && ./solana-mcp-install.sh --backup
```

**Claude Desktop config:**

```json
{
  "mcpServers": {
    "solana-mcp": {
      "command": "npx",
      "args": ["solana-mcp"],
      "env": {
        "RPC_URL": "https://your-rpc-endpoint.com",
        "SOLANA_PRIVATE_KEY": "your_private_key_here",
        "OPENAI_API_KEY": "your_openai_api_key"
      }
    }
  }
}
```

---

### Option G: GOAT SDK MCP Server

**What:** The GOAT (Great Onchain Agent Toolkit) SDK provides an MCP server adapter that exposes 200+ on-chain actions across 30+ blockchains. For Solana specifically, it integrates with Jupiter, Orca, Raydium, Meteora, Magic Eden, Lulo, and many more protocols via a plugin architecture.

**Architecture:**
- **Core:** Universal agentic finance toolkit with plugin system
- **MCP adapter:** `@goat-sdk/adapter-mcp` wraps any GOAT plugin set as MCP tools
- **Wallet providers:** `@goat-sdk/wallet-solana` for Solana keypair wallets
- **Plugins:** Protocol-specific packages (Jupiter, Orca, SPL tokens, SNS, Magic Eden, etc.)
- **Multi-chain:** Same toolkit works for EVM chains via `@goat-sdk/wallet-viem`

**Pros:**
- Largest plugin ecosystem -- 200+ tools across DeFi, NFTs, payments, predictions
- Universal architecture -- same pattern for Solana, EVM, Cosmos, and more
- Multiple framework adapters: MCP, Vercel AI, LangChain, LlamaIndex, Eliza, ElevenLabs
- Actively maintained by Crossmint with strong community (946+ GitHub stars)
- Lightweight core -- install only the plugins you need

**Cons:**
- Not Solana-specific -- broader scope means less Solana depth in some areas
- More complex setup -- requires choosing and configuring individual plugins
- Wallet private key required for transacting
- Plugin version management across many packages
- Less Solana community-specific documentation

**Best for:**
- Multi-chain agent development (Solana + EVM)
- Teams using multiple DeFi protocols that need consistent tooling
- Projects that want MCP + other framework support simultaneously
- Developers who value the plugin architecture pattern

**Code Example -- Solana MCP server with Jupiter plugin:**

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getOnChainTools } from "@goat-sdk/adapter-mcp";
import { solana } from "@goat-sdk/wallet-solana";
import { jupiter } from "@goat-sdk/plugin-jupiter";
import { splToken } from "@goat-sdk/plugin-spl-token";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

const keypair = Keypair.fromSecretKey(
  bs58.decode(process.env.WALLET_PRIVATE_KEY!)
);

const server = new McpServer({
  name: "goat-solana-mcp",
  version: "1.0.0",
});

const tools = await getOnChainTools({
  wallet: solana({
    keypair,
    connection: process.env.RPC_PROVIDER_URL!,
  }),
  plugins: [jupiter(), splToken()],
});

// Register GOAT tools with MCP server
// (adapter handles tool definition and invocation)
```

**Claude Desktop config for GOAT MCP:**

```json
{
  "mcpServers": {
    "goat-solana": {
      "command": "node",
      "args": ["/path/to/goat-mcp/build/index.js"],
      "env": {
        "WALLET_PRIVATE_KEY": "your_base58_private_key",
        "RPC_PROVIDER_URL": "https://your-rpc-endpoint.com"
      }
    }
  }
}
```

---

### Option H: Helius MCP Server

**What:** Helius provides a remote MCP server (`https://docs.helius.dev/mcp`) that gives AI tools direct access to Helius API documentation, DAS API specs, and Solana development guidance. Optimized for AI-native code generation with Helius-specific APIs.

**Pros:**
- Deep Helius API knowledge (DAS, webhooks, enhanced transactions, priority fees)
- Remote hosted -- no local setup beyond config
- Works with Cursor, Windsurf, Claude Desktop, VS Code
- AI generates code with correct Helius imports and patterns

**Cons:**
- Documentation-focused, not direct RPC execution
- Helius-specific -- not general Solana coverage
- Requires Helius account for actual API usage

**Best for:**
- Teams using Helius APIs (DAS, webhooks, enhanced RPCs)
- Developers who want AI-generated code with Helius best practices

**Code Example -- Cursor setup:**

```json
{
  "mcpServers": {
    "helius": {
      "url": "https://docs.helius.dev/mcp"
    }
  }
}
```

## Key Trade-offs

| Factor               | Official MCP (mcp.solana.com) | Dev MCP (demo)   | OpenSVM (Rust)      | Chainstack        | Custom (QuickNode) | SendAI Agent Kit  | GOAT SDK          |
| -------------------- | ----------------------------- | ----------------- | ------------------- | ----------------- | ------------------ | ----------------- | ----------------- |
| **Setup effort**     | Minimal (1 command)           | Low (clone+run)   | Low (one-liner)     | Low               | High (build all)   | Low (npm)         | Medium            |
| **RPC methods**      | 0 (knowledge only)            | 3 basic           | 73+                 | ~15               | You decide         | 60+ actions       | 200+ via plugins  |
| **Can transact?**    | No                            | No                | No                  | No                | If you build it    | Yes               | Yes               |
| **Multi-chain?**     | No                            | No                | Yes (SVM networks)  | Yes (Solana+EVM)  | No                 | No                | Yes (30+ chains)  |
| **Language**         | N/A (hosted)                  | TypeScript        | Rust                | TypeScript        | TypeScript         | TypeScript        | TypeScript        |
| **Production-ready** | Yes                           | No (demo)         | Yes                 | Yes               | Depends on you     | Yes               | Yes               |
| **Security risk**    | None (read only)              | None (read only)  | None (read only)    | None (read only)  | Depends on tools   | High (has keys)   | High (has keys)   |
| **Real-time data**   | No                            | No                | Yes (WebSocket)     | Yes               | If you build it    | Yes               | Yes               |
| **GitHub stars**     | 69                            | 42                | 56                  | 15                | N/A                | 148               | 946               |

## Recommendation

**For most Solana developers, use a two-server stack:**

1. **Solana Foundation Official MCP (`mcp.solana.com`)** for documentation, Anchor guidance, and development questions. This is the single best source for "how do I build X?" questions.

2. **One RPC/action server** based on your needs:
   - **Read-only blockchain queries:** Use **OpenSVM** for the most comprehensive RPC coverage (73+ methods with WebSocket support), or build your own with the **QuickNode pattern** if you need custom logic.
   - **Agent actions (transacting):** Use **SendAI Solana Agent Kit MCP** for Solana-only agents, or **GOAT SDK MCP** for multi-chain agents.
   - **Multi-chain development:** Use **Chainstack** for Solana + EVM coverage in one setup.

**Security guidance for transaction-capable servers:** Never put mainnet private keys with real funds in MCP config files during development. Start on devnet, use dedicated agent wallets with limited funds, and implement spending limits. The MCP config file is stored in plaintext on disk.

**Practical starting setup for a Solana developer:**

```json
{
  "mcpServers": {
    "solana-docs": {
      "command": "npx",
      "args": ["mcp-remote", "https://mcp.solana.com/mcp"]
    },
    "solana-rpc": {
      "command": "node",
      "args": ["/path/to/your/solana-mcp/build/index.js"],
      "env": {
        "SOLANA_RPC_ENDPOINT": "https://your-rpc-endpoint.com"
      }
    }
  }
}
```

This gives you AI that can answer Solana development questions with authoritative documentation AND query the actual blockchain for real-time data.

## MCP for Agent Tooling

Beyond developer productivity, MCP is becoming the standard for giving autonomous AI agents structured on-chain access. Several patterns are emerging:

### Pattern 1: Agent with Read-Only Context

The agent uses MCP tools to query balances, transactions, and account data before making decisions, but executes transactions through a separate, controlled pathway with human approval.

```
User -> AI Agent -> MCP Server (read) -> Solana RPC
                 -> Separate TX pipeline (write) -> Human approval -> Solana
```

### Pattern 2: Fully Autonomous Agent

The agent has both read and write access via MCP tools (like SendAI or GOAT), enabling end-to-end autonomous operation. Requires careful guardrails: spending limits, allowed-program lists, and monitoring.

```
User -> AI Agent -> MCP Server (read+write) -> Solana RPC
                                             -> Signs & sends transactions
```

### Pattern 3: AEA Network (On-Chain Registry)

OpenSVM's AEA Network (Autonomous Economic Agent Network) provides an on-chain registry for MCP servers and AI agents on Solana. Agents can discover other agents and MCP services through the registry, enabling agent-to-agent coordination with economic incentives.

### Pattern 4: Multi-MCP Composition

An agent connects to multiple MCP servers simultaneously -- one for Solana data, one for documentation, one for price feeds, one for social signals -- composing a rich context layer for decision-making.

## Sources

1. **Solana Developer MCP (Official)** -- https://mcp.solana.com/
2. **Solana Foundation solana-dev-mcp** -- https://github.com/solana-foundation/solana-dev-mcp
3. **Solana Foundation solana-mcp-official** -- https://github.com/solana-foundation/solana-mcp-official
4. **OpenSVM Solana MCP Server** -- https://github.com/opensvm/solana-mcp-server
5. **OpenSVM Solana MCP Documentation** -- https://opensvm.github.io/solana-mcp-server/
6. **Chainstack RPC Nodes MCP** -- https://github.com/chainstacklabs/rpc-nodes-mcp
7. **Chainstack Solana MCP Docs** -- https://docs.chainstack.com/docs/solana-mcp-server
8. **Chainstack MCP Blog Post** -- https://chainstack.com/mcp-for-web3-builders-solana-evm-and-documentation-server-by-chainstack/
9. **QuickNode: Build a Solana MCP Server** -- https://www.quicknode.com/guides/ai/solana-mcp-server
10. **QuickNode Solana MCP Sample App** -- https://www.quicknode.com/sample-app-library/solana-mcp
11. **SendAI Solana MCP Server** -- https://github.com/sendaifun/solana-mcp
12. **SendAI Solana Agent Kit** -- https://github.com/sendaifun/solana-agent-kit
13. **SendAI Awesome Solana MCP Servers** -- https://github.com/sendaifun/awesome-solana-mcp-servers
14. **GOAT SDK** -- https://github.com/goat-sdk/goat
15. **Helius MCP Documentation** -- https://www.helius.dev/docs/helius-mcp
16. **OpenSVM AEA Network (Agent Registry)** -- https://github.com/openSVM/aeamcp
17. **AEA Network Whitepaper** -- https://aeamcp.com/whitepapers/aeamcp-comprehensive-whitepaper.pdf
18. **Alchemy: Build Solana AI Agents (2026)** -- https://www.alchemy.com/blog/how-to-build-solana-ai-agents-in-2026
19. **BlockEden: Rise of MCP in Blockchain** -- https://blockeden.xyz/blog/2026/01/24/mcp-protocol-explosion-anthropic-web3-ai-blockchain-demcp-dark/
20. **Solana.com: Intro to AI Tools** -- https://solana.com/developers/guides/getstarted/intro-to-ai
21. **Crossmint: Solana AI Agent App** -- https://blog.crossmint.com/solana-ai-agent-app/
22. **MCP Specification (Anthropic)** -- https://modelcontextprotocol.io/
23. **A2P Protocol MCP Service** -- https://lobehub.com/mcp/kabrony-a2p_solana
24. **Trive Digital: MCP Bridging AI and Blockchain** -- https://medium.com/trive-digital/model-context-protocol-mcp-bridging-ai-and-blockchain-for-smarter-crypto-projects-1a6a4654a95b
25. **Dysnix: MCP Integration Guide** -- https://dysnix.com/blog/model-context-protocol
26. **deBridge MCP Server Launch** -- https://incrypted.com/en/ai-agents-can-execute-cross-chain-transfers-thanks-debridge-solution/
27. **Windsurf MCP Tutorial** -- https://windsurf.com/university/tutorials/configuring-first-mcp-server
28. **Towards AGI: Solana Agent MCP Guide** -- https://medium.com/towards-agi/how-to-use-solana-agent-mcp-server-a-comprehensive-guide-83fd3263571c

## Gaps & Caveats

- **Security is immature.** MCP itself lacks built-in authentication, authorization, or encryption. Private keys stored in `claude_desktop_config.json` are in plaintext. The MCP specification notes this is an active area of development -- expect significant security improvements in 2026.
- **No standardized permission model.** When an MCP server can execute transactions, there is no protocol-level way to restrict which operations the AI can perform. Permission scoping must be implemented at the application layer.
- **Rate limiting varies.** Public Solana RPC endpoints have aggressive rate limits. MCP servers that make many calls per query (e.g., fetching all token accounts, then looking up each mint) can hit limits quickly. Always use a dedicated RPC provider endpoint.
- **Token resolution is non-trivial.** MCP servers return raw mint addresses. Resolving human-readable token names, prices, and metadata requires additional integrations (Jupiter price API, Metaplex metadata, token registries).
- **WebSocket support is limited.** While OpenSVM supports WebSocket subscriptions, most MCP servers are request-response only. Real-time streaming data through MCP is still an edge case.
- **MCP transport is evolving.** The protocol has moved from SSE to Streamable HTTP as the recommended transport for remote servers. Some documentation and older implementations still reference SSE.
- **Agent hallucination risk.** Even with MCP providing real data, the AI can still misinterpret results or hallucinate analysis. Always verify critical on-chain data independently before acting on agent recommendations.
- **Multi-network complexity.** Connecting to devnet, testnet, and mainnet simultaneously through MCP requires careful configuration to prevent accidentally querying or transacting on the wrong network.
- **Ecosystem fragmentation.** With dozens of Solana MCP servers (see sendaifun/awesome-solana-mcp-servers), choosing the right one requires careful evaluation. Consolidation is expected as the ecosystem matures.
- **GOAT and SendAI overlap.** Both provide transaction-capable MCP servers for Solana. GOAT is broader (multi-chain, 200+ tools) while SendAI is deeper (Solana-specific, 60+ actions). The choice depends on whether you need multi-chain or Solana depth.

