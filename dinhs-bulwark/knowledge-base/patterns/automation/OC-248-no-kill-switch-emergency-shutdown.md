# OC-248: No Kill Switch / Emergency Shutdown

**Category:** Automation & Bots
**Severity:** HIGH
**Auditors:** BOT-01
**CWE:** CWE-693 — Protection Mechanism Failure
**OWASP:** N/A — Domain-specific

## Description

A kill switch is a mechanism that immediately halts all automated operations when a critical threshold is breached or an operator triggers an emergency shutdown. Trading bots, keeper systems, and crank turners that lack a kill switch can continue executing harmful operations during market crashes, oracle failures, exploit events, or software bugs.

In the crypto automation space, a bot without a kill switch is considered irresponsible by industry practitioners. The 2023 Flashbots relay exploit that drained $25M from MEV bots happened in part because the bots had no circuit breaker to stop operations when anomalous transaction patterns were detected. Similarly, during the FTX collapse in November 2022, bots without kill switches continued executing strategies against illiquid markets, amplifying losses.

A proper kill switch operates at multiple levels: a global process-level halt, per-strategy pause capability, an external trigger (webhook or signal), and automatic activation based on loss thresholds, error rates, or heartbeat failures.

## Detection

```
# Look for absence of shutdown/kill/halt mechanisms
grep -rn "killSwitch\|kill_switch\|emergencyStop\|emergency_shutdown\|circuitBreaker" --include="*.ts" --include="*.js"
grep -rn "SIGTERM\|SIGINT\|gracefulShutdown\|process\.on.*signal" --include="*.ts" --include="*.js"

# Check for infinite loops without exit conditions
grep -rn "while.*true\|setInterval\|for.*;;)" --include="*.ts" --include="*.js"

# Look for missing drawdown/loss checks
grep -rn "maxDrawdown\|MAX_LOSS\|lossLimit\|stopLoss" --include="*.ts" --include="*.js"
```

## Vulnerable Code

```typescript
import { Connection } from '@solana/web3.js';

async function runKeeper(connection: Connection) {
  // VULNERABLE: Infinite loop with no kill switch, no exit condition
  while (true) {
    try {
      const opportunities = await scanForLiquidations(connection);
      for (const opp of opportunities) {
        await executeLiquidation(connection, opp);
      }
    } catch (err) {
      console.error('Error:', err);
      // Swallows error, continues forever
    }
    await sleep(1000);
  }
}

runKeeper(connection); // No way to stop this externally
```

## Secure Code

```typescript
import { Connection } from '@solana/web3.js';

class KeeperBot {
  private isRunning = true;
  private consecutiveErrors = 0;
  private totalLossLamports = 0;

  private readonly MAX_CONSECUTIVE_ERRORS = 10;
  private readonly MAX_LOSS_LAMPORTS = 2_000_000_000; // 2 SOL
  private readonly HEARTBEAT_INTERVAL_MS = 30_000;

  async start(connection: Connection) {
    // Register signal handlers for external kill
    process.on('SIGTERM', () => this.shutdown('SIGTERM received'));
    process.on('SIGINT', () => this.shutdown('SIGINT received'));

    // Start heartbeat monitor
    this.startHeartbeatMonitor();

    while (this.isRunning) {
      try {
        const opportunities = await scanForLiquidations(connection);
        for (const opp of opportunities) {
          if (!this.isRunning) break;
          await this.executeLiquidation(connection, opp);
        }
        this.consecutiveErrors = 0; // Reset on success
      } catch (err) {
        this.consecutiveErrors++;
        logger.error({ err, consecutiveErrors: this.consecutiveErrors }, 'Keeper error');

        if (this.consecutiveErrors >= this.MAX_CONSECUTIVE_ERRORS) {
          this.shutdown(`${this.MAX_CONSECUTIVE_ERRORS} consecutive errors`);
        }
      }
      await sleep(1000);
    }

    logger.info('Keeper loop exited cleanly');
  }

  shutdown(reason: string) {
    logger.warn({ reason }, 'KILL SWITCH ACTIVATED');
    this.isRunning = false;
    // Cancel pending transactions, close connections
    alertOperator(`Kill switch activated: ${reason}`);
  }

  private checkLossLimit(lossLamports: number) {
    this.totalLossLamports += lossLamports;
    if (this.totalLossLamports >= this.MAX_LOSS_LAMPORTS) {
      this.shutdown(`Loss limit exceeded: ${this.totalLossLamports} lamports`);
    }
  }
}
```

## Impact

- Uncontrolled losses during market crashes or exploit events
- Bot continues draining wallet after software bug triggers bad trades
- Operator cannot intervene remotely during an incident
- Cascading failures as the bot's erratic behavior affects other systems or markets

## References

- Flashbots relay exploit: $25M drained from MEV bots with no circuit breakers (April 2023)
- Pickmytrade.io: "Bot Kill Switch: Safety Net to Prevent Margin Blow" (2026 best practices)
- CoinBureau: "65%+ of volume is automated; missing kill switches are top culprit for blowups"
- Hummingbot documentation: built-in kill switch feature with configurable loss thresholds
