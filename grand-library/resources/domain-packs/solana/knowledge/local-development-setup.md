---
pack: solana
topic: "Local Development Setup"
decision: "What's the best local dev environment for Solana?"
confidence: 9/10
sources_checked: 32
last_updated: "2026-02-16"
---

# Local Development Setup for Solana

## Decision Summary

**The modern Solana development stack (2025+):**

1. **Core toolchain:** Rust + Solana CLI + Anchor CLI (one-line install available)
2. **Local validator:** Surfpool (replaces solana-test-validator as default)
3. **IDE:** VS Code with rust-analyzer + Solana extensions
4. **Testing:** Layered approach (Mollusk/LiteSVM/Trident, not solana-test-validator for unit tests)
5. **Development cluster:** Localnet (Surfpool) for fast iteration, Devnet for integration testing

**Key insight:** The 2025 Solana developer experience is dramatically better than 2021-2022. Tooling has matured from "fighting the infrastructure" to "actually fun to build on."

## Installation Options

### Quick Installation (Recommended)

**One command installs everything:**

```bash
curl --proto '=https' --tlsv1.2 -sSfL https://solana-install.solana.workers.dev | bash
```

**What this installs:**
- Rust (latest stable via rustup)
- Solana CLI (latest stable)
- Anchor CLI (0.32.1+)
- Surfpool CLI (local validator tool)
- Node.js + Yarn (for frontend tooling)

**Expected output:**
```
Installed Versions:
Rust: rustc 1.91.1 (ed61e7d7e 2025-11-07)
Solana CLI: solana-cli 3.0.10 (src:96c3a851; feat:3604001754, client:Agave)
Anchor CLI: anchor-cli 0.32.1
Surfpool CLI: surfpool 0.12.0
Node.js: v24.10.0
Yarn: 1.22.1
```

**Platform requirements:**
- **macOS/Linux:** Works directly in terminal
- **Windows:** Must use WSL2 (Windows Subsystem for Linux)

**Verification:**
```bash
rustc --version && solana --version && anchor --version && surfpool --version
```

### Manual Installation (If Quick Install Fails)

**Step 1: Install Rust**
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
. "$HOME/.cargo/env"
```

**Step 2: Install Solana CLI**
```bash
sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
```

**Step 3: Install Anchor CLI**
```bash
# Install Anchor Version Manager (AVM)
cargo install --git https://github.com/coral-xyz/anchor avm --force

# Use AVM to install latest Anchor
avm install latest
avm use latest
```

**Step 4: Install Node.js + Yarn**
```bash
# macOS (via Homebrew)
brew install node
brew install yarn

# Linux (via package manager)
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
npm install -g yarn
```

## Windows Setup (WSL2)

**Critical:** Solana development on Windows requires WSL2. Native Windows is not supported.

### Install WSL2

**Open Windows PowerShell as Administrator:**
```powershell
wsl --install
```

**This installs Ubuntu by default.** After installation:
1. Create a user account when prompted
2. Search "Ubuntu" in Windows Search bar to open Linux terminal
3. If `ctrl+v` paste doesn't work, open "Windows Terminal" instead

**Verify WSL is working:**
```bash
# Inside Ubuntu terminal
uname -a
# Should show: Linux ... x86_64 GNU/Linux
```

### VS Code + WSL Integration

**Install the WSL extension in VS Code:**
1. Open VS Code
2. Install "WSL" extension (ms-vscode-remote.remote-wsl)
3. Click the green button in bottom-left corner
4. Select "Connect to WSL"

**You'll see `WSL: Ubuntu` in the VS Code status bar.**

All Solana commands now run inside the Linux environment. Your project files live in `/home/youruser/`, not the Windows filesystem.

## IDE Configuration

### VS Code Extensions (Essential)

**Rust development:**
- **rust-analyzer** (rust-lang.rust-analyzer) - Language server for Rust
  - Provides IntelliSense, code completion, inline type hints
  - Auto-formatting with rustfmt
  - Linting with clippy integration
- **CodeLLDB** (vadimcn.vscode-lldb) - Debugger for Rust (macOS/Linux)
- **C/C++ Extension** (ms-vscode.cpptools) - Debugger for Rust on Windows/WSL

**Solana-specific:**
- **Solana by Ackee Blockchain** (ackee.solana) - New in 2025
  - Real-time security analysis (9 detectors for common vulnerabilities)
  - Fuzz coverage visualization (shows which lines Trident tests cover)
  - Catches missing signer checks, unsafe math, incorrect account validation
  - Commands: `solana: Scan Workspace for Security Issues` (Ctrl+Alt+S)

**Nice-to-have:**
- **Better TOML** (bungcip.better-toml) - Syntax highlighting for Cargo.toml, Anchor.toml
- **Prettier** (esbenp.prettier-vscode) - Code formatting for TS/JS
- **Remote - WSL** (ms-vscode-remote.remote-wsl) - Required for WSL2 users

### Workspace Configuration for Anchor Projects

**Problem:** rust-analyzer only supports one Cargo workspace by default. Anchor projects have multiple workspaces (programs/*/Cargo.toml).

**Solution:** Add `.vscode/settings.json` to your project:

```json
{
  "rust-analyzer.linkedProjects": [
    "./programs/my-program/Cargo.toml",
    "./programs/another-program/Cargo.toml"
  ],
  "rust-analyzer.cargo.features": ["anchor"],
  "rust-analyzer.checkOnSave.command": "clippy",
  "[rust]": {
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "rust-lang.rust-analyzer"
  }
}
```

**This fixes the common error:**
```
[ERROR rust_analyzer] failed to find any projects in [AbsPathBuf("...")]
```

### Alternative IDEs

**JetBrains IDEs (IntelliJ IDEA, CLion):**
- Install official "Rust" plugin (intellij-rust)
- Better refactoring tools than VS Code
- Native debugging support (requires CLion or paid version for debugging)
- Heavier resource usage
- Not recommended for beginners (VS Code is more common in Solana community)

**Neovim/Vim:**
- Use rust.vim, coc-rust-analyzer, or native LSP
- Lightweight, but requires significant configuration
- For experienced terminal-based developers only

## Solana CLI Configuration

### Network Selection

**Available clusters:**
- `localhost` (Surfpool or solana-test-validator)
- `devnet` (public testnet, Solana Foundation operated)
- `testnet` (less stable, used for validator testing)
- `mainnet-beta` (production network)

**Set active cluster:**
```bash
# Set to localnet (default for development)
solana config set --url localhost

# Set to devnet (for integration testing)
solana config set --url devnet

# Set to mainnet (production)
solana config set --url mainnet-beta
```

**View current configuration:**
```bash
solana config get
```

**Output:**
```
Config File: /Users/test/.config/solana/cli/config.yml
RPC URL: http://localhost:8899
WebSocket URL: ws://localhost:8900
Keypair Path: /Users/test/.config/solana/id.json
Commitment: confirmed
```

### Wallet Creation

**Generate a new keypair:**
```bash
solana-keygen new
```

**This creates:**
- `~/.config/solana/id.json` (your default keypair)
- Seed phrase (WRITE THIS DOWN - cannot be recovered)
- Public key (your wallet address)

**View your public key:**
```bash
solana address
```

**Check balance:**
```bash
solana balance
```

### Airdrop SOL (Devnet/Testnet Only)

```bash
# Switch to devnet
solana config set --url devnet

# Airdrop 2 SOL to your wallet
solana airdrop 2

# Check balance
solana balance
```

**Rate limits:**
- Devnet: 2 SOL per airdrop, ~5 airdrops per hour per IP
- Localnet (Surfpool): Unlimited airdrops

**If airdrop fails:** Use a devnet faucet UI:
- https://faucet.solana.com/
- https://solfaucet.com/

## Local Validator Options

### Surfpool (Modern Default, 2025+)

**What is Surfpool?**
- Drop-in replacement for solana-test-validator
- Automatically loads programs/accounts from mainnet/devnet **just-in-time**
- No manual account cloning needed
- Infrastructure as Code (IaC) support
- Web UI for transaction inspection (Surfpool Studio)

**Start Surfpool:**
```bash
surfpool start
```

**By default:**
- Loads programs/accounts from mainnet automatically
- Runs on http://127.0.0.1:8899
- Surfpool Studio UI available at http://127.0.0.1:18488

**Surfpool Studio features:**
- View transaction details (logs, compute units, accounts)
- Inspect account data (decoded JSON)
- Airdrop SOL and SPL tokens via UI faucet
- No need to check Solana Explorer for local transactions

**Use case:** Fast iteration when you need mainnet state (e.g., testing CPI to Jupiter, testing with real USDC mint).

### solana-test-validator (Legacy, Still Useful)

**When to use:**
- Need specific custom configurations (compute unit limits, account rent, etc.)
- Want full control over what's loaded
- Testing validator-specific behavior (gossip, vote accounts)

**Basic usage:**
```bash
solana-test-validator
```

**With custom programs/accounts:**
```bash
solana-test-validator \
  --bpf-program MyProgram111111111111111111111111111111 \
    target/deploy/my_program.so \
  --account EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v \
    usdc_mint.json \
  --reset
```

**Common flags:**
- `--reset` - Clear ledger and start fresh
- `--bpf-program <PROGRAM_ID> <PATH>` - Load a program
- `--account <PUBKEY> <JSON_FILE>` - Load an account from JSON
- `--clone <ADDRESS>` - Clone account from devnet/mainnet
- `--ledger <PATH>` - Custom ledger directory (default: `test-ledger/`)

**Download mainnet accounts for testing:**
```bash
# Clone USDC mint from mainnet
solana-test-validator \
  --clone EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v

# Clone multiple accounts
solana-test-validator \
  --clone EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v \
  --clone Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB \
  --reset
```

**Download accounts to JSON files:**
```bash
# For accounts
solana account -u m EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v \
  --output json --output-file usdc_mint.json

# For programs
solana program dump -u m metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s \
  mpl-token-metadata.so
```

**Performance note:** solana-test-validator has ~30-60 second startup time. Use LiteSVM or Mollusk for unit/integration tests instead.

## Anchor Workspace Configuration

### Anchor.toml Structure

**Location:** Project root (`my-anchor-project/Anchor.toml`)

**Default configuration:**
```toml
[toolchain]

[features]
resolution = true
skip-lint = false

[programs.localnet]
my_program = "3ynNB373Q3VAzKp7m4x238po36hjAGFXFJB4ybN2iTyg"

[registry]
url = "https://api.apr.dev"

[provider]
cluster = "Localnet"
wallet = "~/.config/solana/id.json"

[scripts]
test = "yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts"
```

### Cluster Configuration

**For localnet development:**
```toml
[provider]
cluster = "Localnet"  # Points to http://127.0.0.1:8899
wallet = "~/.config/solana/id.json"
```

**For devnet deployment:**
```toml
[provider]
cluster = "Devnet"
wallet = "~/.config/solana/id.json"

[programs.devnet]
my_program = "YourProgramID111111111111111111111111111"
```

**For mainnet deployment:**
```toml
[provider]
cluster = "Mainnet"
wallet = "~/.config/solana/mainnet-keypair.json"  # Use separate keypair!

[programs.mainnet]
my_program = "YourProgramID111111111111111111111111111"
```

### Multiple Program Configuration

```toml
[programs.localnet]
lending_protocol = "Lend1ng111111111111111111111111111111111111"
liquidation_engine = "Liquid8n111111111111111111111111111111111111"
oracle_aggregator = "0rac1e1111111111111111111111111111111111111"

[programs.devnet]
lending_protocol = "DevnetLend111111111111111111111111111111111"
liquidation_engine = "DevnetLiquid8n11111111111111111111111111111"
oracle_aggregator = "Devnet0rac1e1111111111111111111111111111111"
```

**Use in code:**
```rust
// Program will use the correct address based on [provider] cluster
declare_id!("Lend1ng111111111111111111111111111111111111");
```

### Test Configuration

```toml
[scripts]
test = "yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts"

[test]
startup_wait = 5000  # Wait 5 seconds for validator startup
```

**Custom test script:**
```toml
[scripts]
test = "anchor test --skip-local-validator"  # Use external validator
test:unit = "cargo test"
test:integration = "yarn run ts-mocha tests/integration/**/*.ts"
```

## Devnet vs Localnet Trade-offs

### When to Use Localnet (Surfpool or solana-test-validator)

**Advantages:**
- No rate limits
- Unlimited SOL airdrops
- Full control over time (can warp to future slots)
- Can load any mainnet account state
- Fast iteration (no network latency)
- No cost for failed transactions

**Disadvantages:**
- Single-node, no real consensus
- Doesn't test network congestion behavior
- Doesn't test priority fee mechanics
- No real slippage on DEX operations
- Missing some validator-specific edge cases

**Best for:**
- Initial development and iteration
- Unit and integration testing
- Testing with mainnet account clones
- CPI testing with real programs (Jupiter, Orca, etc.)
- Debugging (full transaction logs available)

### When to Use Devnet

**Advantages:**
- Multi-node network (real consensus)
- Tests realistic network conditions
- Same transaction confirmation behavior as mainnet
- Free SOL via faucet
- Public explorers work (Solscan, Solana Explorer)
- Can share deployed programs with team/users

**Disadvantages:**
- Rate-limited airdrops (2 SOL per request)
- Occasional network instability
- Can't control time or state
- Must deploy programs (can't just load .so files)
- Network latency affects test speed

**Best for:**
- Integration testing before mainnet
- Testing wallet integration (Phantom, Solflare)
- Sharing demo apps with users
- Testing RPC method reliability
- Final QA before mainnet deployment

### Testing Workflow Recommendation

```
Development Flow:
1. Write code
2. Test with Mollusk (unit tests, <5 seconds)
3. Test with LiteSVM (integration tests, <15 seconds)
4. Test with Surfpool (E2E tests, manual verification, ~60 seconds)
5. Deploy to devnet (weekly or before major features)
6. Test on devnet (wallet integration, RPC methods)
7. Deploy to mainnet (after devnet passes)
```

**Don't use devnet for:**
- Unit tests (too slow)
- Every PR in CI/CD (rate limits will block you)
- Rapid iteration (deploy cycle too long)

## Common Setup Issues

### Issue 1: "command not found" After Installation

**Problem:**
```bash
solana --version
# bash: solana: command not found
```

**Solution:** Add Solana to PATH

```bash
# For bash
echo 'export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# For zsh
echo 'export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### Issue 2: rust-analyzer Not Finding Anchor Programs

**Problem:**
```
[ERROR rust_analyzer] failed to find any projects
```

**Solution:** Configure `.vscode/settings.json`:

```json
{
  "rust-analyzer.linkedProjects": [
    "./programs/my-program/Cargo.toml"
  ]
}
```

### Issue 3: Anchor Test Hangs on Validator Startup

**Problem:**
```bash
anchor test
# Hangs for 60+ seconds or times out
```

**Solutions:**

**Option A: Use external validator**
```bash
# Terminal 1: Start validator
surfpool start

# Terminal 2: Run tests (skip validator startup)
anchor test --skip-local-validator
```

**Option B: Increase timeout in Anchor.toml**
```toml
[test]
startup_wait = 10000  # 10 seconds (default is 5)
```

**Option C: Use LiteSVM instead of test-validator**
```typescript
// tests/my-test.ts
import { LiteSVM } from "@litesvm/sdk";

describe("My Tests", () => {
  let svm: LiteSVM;

  before(async () => {
    svm = await LiteSVM.new();
    // Much faster than anchor test with test-validator
  });
});
```

### Issue 4: WSL2 "ctrl+v" Paste Doesn't Work

**Problem:** Can't paste into Ubuntu terminal on Windows

**Solution:** Use Windows Terminal instead of direct Ubuntu app

1. Search "Terminal" in Windows
2. Open Windows Terminal
3. Click dropdown → Select Ubuntu
4. `ctrl+v` should now work

### Issue 5: Linker Errors on Windows

**Problem:**
```
error: linker `link.exe` not found
```

**Solution:** Install C/C++ build tools

**For WSL2:**
```bash
sudo apt update
sudo apt install build-essential pkg-config libssl-dev
```

**For native Windows (if you ignored WSL2 advice):**
- Install Visual Studio Build Tools
- Select "Desktop development with C++" workload

### Issue 6: Airdrop Fails on Devnet

**Problem:**
```bash
solana airdrop 2
# Error: Request rate limit exceeded
```

**Solutions:**

**Option A: Use web faucet**
- Visit https://faucet.solana.com/
- Enter your wallet address
- Complete CAPTCHA

**Option B: Use localnet instead**
```bash
# Terminal 1
surfpool start

# Terminal 2
solana config set --url localhost
solana airdrop 100  # No limits!
```

**Option C: Use a different network endpoint**
```bash
solana config set --url https://api.devnet.solana.com
solana airdrop 2
```

### Issue 7: Programs Won't Deploy Due to Insufficient Balance

**Problem:**
```bash
anchor deploy
# Error: Insufficient funds for program deployment
```

**Solution:** Check program buffer cost

```bash
# Check current balance
solana balance

# Estimate deployment cost
ls -lh target/deploy/*.so
# ~100 KB program ≈ 0.7 SOL
# ~500 KB program ≈ 3.5 SOL
```

**Formula:** Deployment cost ≈ (program size in bytes × 0.000006781 SOL) + ~0.1 SOL buffer

**On devnet:** If program is large (>200 KB), you may need multiple airdrops:
```bash
solana airdrop 2
sleep 60  # Wait for rate limit
solana airdrop 2
sleep 60
solana airdrop 2
```

**On localnet:** No cost limits:
```bash
surfpool start
solana config set --url localhost
solana airdrop 100
anchor deploy
```

## Advanced Configuration

### Custom RPC Endpoints

**Why use custom RPC?**
- Faster than public endpoints
- No rate limits
- Better for production apps

**Popular RPC providers:**
- Helius (https://helius.dev)
- QuickNode (https://quicknode.com)
- Triton (https://triton.one)

**Configure custom RPC:**
```bash
# Set in CLI
solana config set --url https://rpc.helius.xyz/?api-key=YOUR_KEY

# Or set in Anchor.toml
[provider]
cluster = "https://rpc.helius.xyz/?api-key=YOUR_KEY"
```

### Commitment Levels

**Commitment determines how "finalized" a transaction is:**

```bash
# Options: processed, confirmed, finalized
solana config set --commitment confirmed
```

**Trade-offs:**
- `processed` - Fastest (1-2 seconds), least reliable
- `confirmed` - Balanced (5-10 seconds), default for most apps
- `finalized` - Slowest (30+ seconds), most reliable

**For testing:** Use `confirmed` (default)
**For production:** Use `confirmed` for UX, verify with `finalized` for high-value operations

### Environment-Specific Keypairs

**Problem:** Don't want to use same keypair for localnet/devnet/mainnet

**Solution:** Multiple keypair files

```bash
# Create separate keypairs
solana-keygen new --outfile ~/.config/solana/devnet.json
solana-keygen new --outfile ~/.config/solana/mainnet.json

# Switch between them
solana config set --keypair ~/.config/solana/devnet.json
solana config set --keypair ~/.config/solana/mainnet.json
```

**In Anchor.toml:**
```toml
[provider]
cluster = "Devnet"
wallet = "~/.config/solana/devnet.json"
```

### Monitoring Local Validator Logs

**View validator logs:**
```bash
solana logs
```

**View specific program logs:**
```bash
solana logs | grep "Program YourProgramID"
```

**Save logs to file:**
```bash
solana logs > validator.log
```

**Use Solana Explorer for localnet:**
1. Start validator: `surfpool start`
2. Open Solana Explorer: https://explorer.solana.com/?cluster=custom&customUrl=http://localhost:8899
3. Paste transaction signature to view details

## Development Workflow Summary

### Minimal Setup (30 seconds)

```bash
# Install everything
curl --proto '=https' --tlsv1.2 -sSfL https://solana-install.solana.workers.dev | bash

# Restart terminal, then:
anchor init my-project
cd my-project
anchor build
anchor test
```

### Full Production Setup (10 minutes)

```bash
# 1. Install toolchain
curl --proto '=https' --tlsv1.2 -sSfL https://solana-install.solana.workers.dev | bash

# 2. Configure VS Code
code --install-extension rust-lang.rust-analyzer
code --install-extension vadimcn.vscode-lldb
code --install-extension ackee.solana

# 3. Create separate keypairs
solana-keygen new --outfile ~/.config/solana/devnet.json
solana-keygen new --outfile ~/.config/solana/mainnet.json

# 4. Set up localnet
surfpool start  # In separate terminal

# 5. Create project
anchor init my-project
cd my-project

# 6. Configure workspace
echo '{
  "rust-analyzer.linkedProjects": [
    "./programs/my-project/Cargo.toml"
  ]
}' > .vscode/settings.json

# 7. Build and test
anchor build
anchor test --skip-local-validator  # Uses running Surfpool
```

### Daily Development Loop

```bash
# Start day
surfpool start  # Terminal 1

# Develop
cd my-project
anchor build
anchor test --skip-local-validator

# Before committing
cargo clippy  # Lint check
cargo test    # Unit tests (Mollusk)
anchor test --skip-local-validator  # Integration tests

# Deploy to devnet (weekly)
solana config set --url devnet
solana config set --keypair ~/.config/solana/devnet.json
anchor build
anchor deploy

# Deploy to mainnet (when ready)
solana config set --url mainnet
solana config set --keypair ~/.config/solana/mainnet.json
anchor build
anchor deploy
```

## External Resources

### Official Documentation
- [Solana Installation Guide](https://solana.com/developers/guides/getstarted/setup-local-development)
- [Anchor Installation Guide](https://www.anchor-lang.com/docs/installation)
- [Surfpool Documentation](https://docs.txtx.io/surfpool)
- [solana-test-validator Guide](https://solana.com/developers/guides/getstarted/solana-test-validator)

### IDE Setup Guides
- [Solana in VS Code](https://code.visualstudio.com/docs/languages/rust) (official VS Code Rust guide)
- [Ackee Solana Extension](https://github.com/Ackee-Blockchain/solana-vscode) (security analysis extension)
- [Solana Developer Extension Pack](https://github.com/solana-developers/vs-code-extension-pack) (bundle of useful extensions)

### Tutorials
- [QuickNode: Start a Local Validator](https://www.quicknode.com/guides/solana-development/getting-started/start-a-solana-local-validator)
- [Metaplex: Setup Local Validator](https://developers.metaplex.com/guides/setup-a-local-validator) (includes loading Metaplex programs)
- [Solana Cookbook: Local Development](https://solanacookbook.com/references/local-development.html)

### Troubleshooting
- [Anchor Discord](https://discord.gg/anchor) - #questions channel
- [Solana Stack Exchange](https://solana.stackexchange.com/)
- [Solana Developers Telegram](https://t.me/solanadevs)

## Confidence Reasoning

**Why 9/10:**
- ✅ Research covered all major installation methods (quick install, manual, WSL2)
- ✅ Included modern tooling (Surfpool, Ackee extension) launched in 2025
- ✅ Documented all common setup issues with solutions
- ✅ Covered both legacy (solana-test-validator) and modern (Surfpool) approaches
- ✅ Provided real-world workflow patterns from production teams
- ✅ Included IDE configuration for all major editors (VS Code, JetBrains, Neovim)
- ✅ Covered Windows/WSL2 setup extensively (common pain point)
- ✅ Documented environment-specific configurations (localnet/devnet/mainnet)
- ⚠️ -1 point: Surfpool is relatively new (mid-2025), best practices still evolving

**Last updated:** 2026-02-16
**Sources:** 32 (official docs, GitHub repos, community tutorials, developer blog posts)
