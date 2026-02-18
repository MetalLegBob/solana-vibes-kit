# OC-256: No Loss Limit / Circuit Breaker

**Category:** Automation & Bots
**Severity:** HIGH
**Auditors:** BOT-02
**CWE:** CWE-754 — Improper Check for Unusual or Exceptional Conditions
**OWASP:** N/A — Domain-specific

## Description

A circuit breaker in trading and keeper bots is a mechanism that halts operations when cumulative losses exceed a predefined threshold within a given time window. Without circuit breakers, a bot experiencing adverse market conditions, a strategy failure, or a bug-induced loss spiral will continue executing and compounding losses until its wallet is empty.

Circuit breakers differ from kill switches (OC-248) in that they are automated loss-triggered mechanisms rather than manual or error-triggered shutdowns. A properly designed circuit breaker tracks realized PnL, unrealized positions, and fee expenditure, and activates when the combined loss crosses a threshold.

In traditional finance, circuit breakers are required by regulation (NYSE Rule 80B). In crypto, they are a best practice that is frequently overlooked. Data from 2025 shows that over 65% of automated trading volume in crypto lacks proper circuit breaker mechanisms. During flash crash events such as the March 2023 Silicon Valley Bank panic, bots without circuit breakers amplified their own losses by continuing to trade during extreme volatility. Many small accounts are blown up due to missing stop-loss mechanisms combined with leverage.

## Detection

```
# Look for loss tracking and threshold checks
grep -rn "circuit[Bb]reaker\|circuitBreaker\|CIRCUIT_BREAKER" --include="*.ts" --include="*.js"
grep -rn "maxLoss\|MAX_LOSS\|lossLimit\|LOSS_LIMIT\|maxDrawdown\|MAX_DRAWDOWN" --include="*.ts" --include="*.js"

# Check for PnL tracking
grep -rn "pnl\|PnL\|profit.*loss\|realizedPnl\|unrealizedPnl\|dailyPnl" --include="*.ts" --include="*.js"

# Look for trading loops without loss checks
grep -rn "while.*true" --include="*.ts" | grep -v "maxLoss\|circuit\|drawdown"

# Check for trailing stop or drawdown calculation
grep -rn "peakBalance\|highWaterMark\|drawdown" --include="*.ts" --include="*.js"
```

## Vulnerable Code

```typescript
class TradingBot {
  async run() {
    // VULNERABLE: Trades forever with no loss limit
    while (true) {
      const signal = await this.strategy.getSignal();
      if (signal) {
        await this.executeSwap(signal);
      }
      await sleep(1000);
    }
  }

  async executeSwap(signal: TradeSignal) {
    // Executes regardless of cumulative losses
    const routes = await jupiter.computeRoutes({
      inputMint: signal.inputMint,
      outputMint: signal.outputMint,
      amount: signal.amount,
      slippageBps: 200,
    });
    const { execute } = await jupiter.exchange({ routeInfo: routes.routesInfos[0] });
    return await execute();
  }
}
```

## Secure Code

```typescript
interface CircuitBreakerConfig {
  maxDailyLossLamports: number;
  maxDrawdownPercent: number;
  maxConsecutiveLosses: number;
  cooldownMinutes: number;
}

class TradingBot {
  private dailyPnlLamports = 0;
  private consecutiveLosses = 0;
  private peakBalanceLamports = 0;
  private circuitBreakerTripped = false;
  private cooldownUntil: Date | null = null;

  private readonly config: CircuitBreakerConfig = {
    maxDailyLossLamports: 1_000_000_000,  // 1 SOL daily loss limit
    maxDrawdownPercent: 0.15,              // 15% from peak
    maxConsecutiveLosses: 5,
    cooldownMinutes: 60,
  };

  async run() {
    while (this.isRunning) {
      if (this.circuitBreakerTripped) {
        if (this.cooldownUntil && new Date() < this.cooldownUntil) {
          logger.info('Circuit breaker active, waiting for cooldown');
          await sleep(60_000);
          continue;
        }
        this.resetCircuitBreaker();
      }

      const signal = await this.strategy.getSignal();
      if (signal) {
        const preBalance = await this.getBalance();
        await this.executeSwap(signal);
        const postBalance = await this.getBalance();

        const tradePnl = postBalance - preBalance;
        this.updatePnlTracking(tradePnl, postBalance);
      }
      await sleep(1000);
    }
  }

  private updatePnlTracking(tradePnl: number, currentBalance: number) {
    this.dailyPnlLamports += tradePnl;
    this.peakBalanceLamports = Math.max(this.peakBalanceLamports, currentBalance);

    if (tradePnl < 0) {
      this.consecutiveLosses++;
    } else {
      this.consecutiveLosses = 0;
    }

    const drawdownPercent = (this.peakBalanceLamports - currentBalance) / this.peakBalanceLamports;

    // Check all circuit breaker conditions
    if (this.dailyPnlLamports <= -this.config.maxDailyLossLamports) {
      this.tripCircuitBreaker('Daily loss limit exceeded');
    } else if (drawdownPercent >= this.config.maxDrawdownPercent) {
      this.tripCircuitBreaker(`Drawdown ${(drawdownPercent * 100).toFixed(1)}% exceeds max`);
    } else if (this.consecutiveLosses >= this.config.maxConsecutiveLosses) {
      this.tripCircuitBreaker(`${this.consecutiveLosses} consecutive losses`);
    }
  }

  private tripCircuitBreaker(reason: string) {
    this.circuitBreakerTripped = true;
    this.cooldownUntil = new Date(Date.now() + this.config.cooldownMinutes * 60_000);
    logger.error({ reason, dailyPnl: this.dailyPnlLamports }, 'CIRCUIT BREAKER TRIPPED');
    alertOperator(`Circuit breaker: ${reason}`);
  }
}
```

## Impact

- Total wallet drainage during sustained adverse market conditions
- Loss spiral from strategy failure compounds without intervention
- Leveraged positions can result in liquidation without loss limits
- Emotional re-entry after manual restart (no enforced cooldown)

## References

- CoinBureau: "65%+ of crypto volume is automated; missing kill switches are top culprit for blowups" (2025)
- Pickmytrade.io: Bot Kill Switch -- max drawdown limits and auto-pause implementation (2026)
- Hummingbot: built-in kill switch with daily loss limit feature
- Alpaca trading bot Constitution: mandatory stop losses and daily profit goal management
