---
pack: solana
topic: "Transaction UX"
decision: "How do I build good transaction UX for Solana dApps?"
confidence: 8/10
sources_checked: 28
last_updated: "2026-02-16"
---

# Transaction UX for Solana dApps

Building excellent transaction UX on Solana requires handling the full lifecycle: signing → sending → confirming → finalized. Users expect near-instant feedback on a high-speed chain, but network congestion, dropped transactions, and cryptic errors can destroy trust if not handled properly.

## Transaction Lifecycle States

**Core states your UI must handle:**

```typescript
type TransactionStatus =
  | 'idle'           // No transaction initiated
  | 'signing'        // Waiting for wallet signature
  | 'sending'        // Sending to RPC
  | 'processing'     // Transaction sent, not confirmed
  | 'confirmed'      // Confirmed commitment level
  | 'finalized'      // Finalized (never reverted)
  | 'error'          // Transaction failed
  | 'expired';       // Blockhash expired, transaction dropped
```

**React hook pattern with proper lifecycle:**

```typescript
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Transaction } from '@solana/web3.js';
import { useState } from 'react';

function useTransaction() {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const [status, setStatus] = useState<TransactionStatus>('idle');
  const [signature, setSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const executeTransaction = async (transaction: Transaction) => {
    if (!publicKey || !signTransaction) {
      setError('Wallet not connected');
      return;
    }

    try {
      // 1. Signing phase
      setStatus('signing');
      const signed = await signTransaction(transaction);

      // 2. Sending phase
      setStatus('sending');
      const signature = await connection.sendRawTransaction(
        signed.serialize(),
        {
          skipPreflight: false,
          maxRetries: 3,
        }
      );
      setSignature(signature);

      // 3. Processing/confirmation phase
      setStatus('processing');
      const latestBlockhash = await connection.getLatestBlockhash();

      await connection.confirmTransaction(
        {
          signature,
          blockhash: latestBlockhash.blockhash,
          lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        },
        'confirmed'
      );

      setStatus('confirmed');

      // Optionally wait for finalization
      await connection.confirmTransaction(
        {
          signature,
          blockhash: latestBlockhash.blockhash,
          lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        },
        'finalized'
      );

      setStatus('finalized');
    } catch (err) {
      setStatus('error');
      setError(parseTransactionError(err));
    }
  };

  return { executeTransaction, status, signature, error };
}
```

## Loading States & Visual Feedback

**Don't just show spinners. Show what's happening:**

```typescript
function TransactionButton({ onClick }) {
  const { executeTransaction, status, signature } = useTransaction();

  const getButtonText = () => {
    switch (status) {
      case 'idle': return 'Send Transaction';
      case 'signing': return 'Approve in Wallet...';
      case 'sending': return 'Sending...';
      case 'processing': return 'Confirming...';
      case 'confirmed': return 'Confirmed ✓';
      case 'finalized': return 'Finalized ✓';
      case 'error': return 'Try Again';
      case 'expired': return 'Retry';
    }
  };

  return (
    <div>
      <button
        onClick={onClick}
        disabled={['signing', 'sending', 'processing'].includes(status)}
      >
        {getButtonText()}
      </button>

      {status === 'processing' && (
        <div className="progress-indicator">
          <Spinner />
          <span>Transaction sent. Waiting for confirmation...</span>
          {signature && (
            <a
              href={`https://explorer.solana.com/tx/${signature}`}
              target="_blank"
            >
              View on Explorer ↗
            </a>
          )}
        </div>
      )}
    </div>
  );
}
```

**Progress indicator with commitment levels:**

```typescript
function TransactionProgress({ signature }: { signature: string }) {
  const [commitment, setCommitment] = useState<'processing' | 'confirmed' | 'finalized'>('processing');

  useEffect(() => {
    const checkStatus = async () => {
      const status = await connection.getSignatureStatus(signature, {
        searchTransactionHistory: true,
      });

      if (status.value?.confirmationStatus === 'confirmed') {
        setCommitment('confirmed');
      } else if (status.value?.confirmationStatus === 'finalized') {
        setCommitment('finalized');
      }
    };

    const interval = setInterval(checkStatus, 1000);
    return () => clearInterval(interval);
  }, [signature]);

  return (
    <div className="commitment-progress">
      <Step completed={true}>Sent</Step>
      <Step completed={commitment !== 'processing'}>Confirmed</Step>
      <Step completed={commitment === 'finalized'}>Finalized</Step>
    </div>
  );
}
```

## Optimistic Updates

**Show the expected outcome immediately, roll back on failure:**

```typescript
function TokenBalance() {
  const [balance, setBalance] = useState(1000);
  const [optimisticBalance, setOptimisticBalance] = useState<number | null>(null);

  const transfer = async (amount: number) => {
    // Optimistic update
    setOptimisticBalance(balance - amount);

    try {
      await executeTransfer(amount);
      // On success, commit the optimistic state
      setBalance(balance - amount);
      setOptimisticBalance(null);
    } catch (err) {
      // On failure, revert optimistic state
      setOptimisticBalance(null);
      toast.error('Transfer failed. Balance unchanged.');
    }
  };

  return (
    <div>
      <div className={optimisticBalance !== null ? 'pending' : ''}>
        Balance: {optimisticBalance ?? balance} USDC
      </div>
      {optimisticBalance !== null && (
        <span className="pending-indicator">Pending...</span>
      )}
    </div>
  );
}
```

**Optimistic UI with rollback queue:**

```typescript
type OptimisticUpdate = {
  id: string;
  apply: () => void;
  revert: () => void;
  signature?: string;
};

function useOptimisticUpdates() {
  const [pending, setPending] = useState<OptimisticUpdate[]>([]);

  const addUpdate = (update: OptimisticUpdate) => {
    update.apply();
    setPending([...pending, update]);
  };

  const commitUpdate = (id: string) => {
    setPending(pending.filter(u => u.id !== id));
  };

  const revertUpdate = (id: string) => {
    const update = pending.find(u => u.id === id);
    if (update) {
      update.revert();
      setPending(pending.filter(u => u.id !== id));
    }
  };

  return { addUpdate, commitUpdate, revertUpdate, pending };
}
```

## Error Handling: User-Friendly Messages

**Translate program errors into human language:**

```typescript
function parseTransactionError(error: any): string {
  // Signature verification failed
  if (error.message?.includes('Signature verification failed')) {
    return 'Transaction was rejected. Please try again.';
  }

  // Insufficient funds
  if (error.message?.includes('insufficient funds') ||
      error.message?.includes('0x1')) {
    return 'Insufficient balance to complete this transaction.';
  }

  // Blockhash expired
  if (error.message?.includes('blockhash') ||
      error.message?.includes('BlockhashNotFound')) {
    return 'Transaction expired. The network was too busy. Please retry.';
  }

  // Slippage exceeded (common in DEX swaps)
  if (error.message?.includes('slippage')) {
    return 'Price moved too much. Try increasing slippage tolerance.';
  }

  // Custom program error codes
  if (error.logs) {
    return parseCustomProgramError(error.logs);
  }

  // Network/RPC errors
  if (error.message?.includes('429') || error.message?.includes('rate limit')) {
    return 'Network busy. Retrying...';
  }

  // Default fallback
  return 'Transaction failed. Please try again.';
}

function parseCustomProgramError(logs: string[]): string {
  // Extract program error codes from logs
  const errorLog = logs.find(log => log.includes('Program log: Error:'));

  if (errorLog?.includes('0x1')) {
    return 'Insufficient funds for transaction.';
  }
  if (errorLog?.includes('0x0')) {
    return 'Invalid instruction. Please contact support.';
  }

  return 'Transaction failed. Check Explorer for details.';
}
```

**Error recovery patterns:**

```typescript
function TransactionWithRetry() {
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  const executeWithRetry = async () => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        setRetryCount(i);
        await executeTransaction();
        return; // Success
      } catch (err) {
        if (i === maxRetries - 1) {
          // Final failure
          toast.error(parseTransactionError(err));
        } else if (isRetryableError(err)) {
          // Wait before retry with exponential backoff
          await sleep(Math.pow(2, i) * 1000);
        } else {
          // Non-retryable error
          toast.error(parseTransactionError(err));
          return;
        }
      }
    }
  };

  return (
    <button onClick={executeWithRetry}>
      Send {retryCount > 0 && `(Retry ${retryCount}/${maxRetries})`}
    </button>
  );
}

function isRetryableError(error: any): boolean {
  const retryable = [
    'blockhash',
    'rate limit',
    'network',
    'timeout',
    'Node is behind',
  ];
  return retryable.some(msg => error.message?.toLowerCase().includes(msg));
}
```

## Toast Notifications

**Progressive feedback pattern:**

```typescript
import { toast } from 'react-toastify';

async function transferWithToasts(amount: number) {
  const toastId = toast.loading('Preparing transaction...');

  try {
    // Update: signing
    toast.update(toastId, {
      render: 'Approve in your wallet...',
      isLoading: true
    });

    const signed = await signTransaction(transaction);

    // Update: sending
    toast.update(toastId, {
      render: 'Sending transaction...',
      isLoading: true
    });

    const signature = await connection.sendRawTransaction(signed.serialize());

    // Update: confirming
    toast.update(toastId, {
      render: (
        <div>
          Confirming transaction...
          <a href={`https://explorer.solana.com/tx/${signature}`}>
            View on Explorer
          </a>
        </div>
      ),
      isLoading: true,
    });

    await confirmTransaction(signature);

    // Success
    toast.update(toastId, {
      render: `Successfully transferred ${amount} SOL`,
      type: 'success',
      isLoading: false,
      autoClose: 5000,
    });

  } catch (err) {
    toast.update(toastId, {
      render: parseTransactionError(err),
      type: 'error',
      isLoading: false,
      autoClose: 8000,
    });
  }
}
```

**Toast with action buttons:**

```typescript
function showTransactionToast(signature: string) {
  toast.success(
    <div>
      <p>Transaction confirmed!</p>
      <button onClick={() => window.open(`https://explorer.solana.com/tx/${signature}`)}>
        View Details
      </button>
      <button onClick={() => navigator.clipboard.writeText(signature)}>
        Copy Signature
      </button>
    </div>,
    {
      autoClose: 10000,
      closeButton: true,
    }
  );
}
```

## Proper Transaction Confirmation

**The right way to confirm (not the deprecated way):**

```typescript
async function confirmTransactionProperly(signature: string) {
  const latestBlockhash = await connection.getLatestBlockhash('confirmed');

  // Race between confirmation and expiration
  const result = await Promise.race([
    // Confirmation promise
    connection.confirmTransaction({
      signature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    }, 'confirmed'),

    // Expiration check
    checkBlockHeightExpiration(latestBlockhash.lastValidBlockHeight),
  ]);

  if (result === 'expired') {
    throw new Error('Transaction expired before confirmation');
  }

  return result;
}

async function checkBlockHeightExpiration(lastValidBlockHeight: number) {
  while (true) {
    const currentHeight = await connection.getBlockHeight();
    if (currentHeight > lastValidBlockHeight) {
      return 'expired';
    }
    await sleep(1000);
  }
}
```

**Subscription-based confirmation (real-time updates):**

```typescript
function useTransactionConfirmation(signature: string | null) {
  const [status, setStatus] = useState<'pending' | 'confirmed' | 'finalized'>('pending');

  useEffect(() => {
    if (!signature) return;

    let subscriptionId: number;

    (async () => {
      subscriptionId = connection.onSignature(
        signature,
        (result) => {
          if (result.err) {
            setStatus('error');
          } else {
            setStatus('confirmed');
          }
        },
        'confirmed'
      );

      // Also subscribe for finalized
      connection.onSignature(
        signature,
        () => setStatus('finalized'),
        'finalized'
      );
    })();

    return () => {
      if (subscriptionId) {
        connection.removeSignatureListener(subscriptionId);
      }
    };
  }, [signature]);

  return status;
}
```

## Explorer Links & Debugging

**Always provide explorer links:**

```typescript
function ExplorerLink({ signature, type = 'tx' }: {
  signature: string;
  type?: 'tx' | 'address' | 'block';
}) {
  const cluster = process.env.NEXT_PUBLIC_CLUSTER || 'mainnet-beta';
  const baseUrl = `https://explorer.solana.com/${type}/${signature}`;
  const url = cluster !== 'mainnet-beta' ? `${baseUrl}?cluster=${cluster}` : baseUrl;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="explorer-link"
    >
      View on Explorer ↗
    </a>
  );
}
```

**Debug panel for development:**

```typescript
function TransactionDebugPanel({ signature }: { signature: string }) {
  const [logs, setLogs] = useState<string[]>([]);
  const [txDetails, setTxDetails] = useState<any>(null);

  useEffect(() => {
    const fetchDetails = async () => {
      const tx = await connection.getTransaction(signature, {
        maxSupportedTransactionVersion: 0,
      });
      setTxDetails(tx);
      setLogs(tx?.meta?.logMessages || []);
    };
    fetchDetails();
  }, [signature]);

  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <details className="debug-panel">
      <summary>Debug Info</summary>
      <div>
        <h4>Signature</h4>
        <code>{signature}</code>

        <h4>Status</h4>
        <pre>{JSON.stringify(txDetails?.meta, null, 2)}</pre>

        <h4>Logs</h4>
        <ul>
          {logs.map((log, i) => (
            <li key={i} className={log.includes('Error') ? 'error' : ''}>
              {log}
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
```

## Mobile Considerations

**Mobile Wallet Adapter patterns:**

```typescript
import {
  transact,
  Web3MobileWallet
} from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';

async function mobileTransaction() {
  try {
    const signature = await transact(async (wallet: Web3MobileWallet) => {
      // Authorization happens here (only once)
      const authResult = await wallet.authorize({
        cluster: 'mainnet-beta',
        identity: { name: 'My dApp' },
      });

      // Sign and send in one call
      const signedTransactions = await wallet.signAndSendTransactions({
        transactions: [transaction],
      });

      return signedTransactions[0];
    });

    return signature;
  } catch (err) {
    if (err.code === 'ERROR_AUTHORIZATION_FAILED') {
      toast.error('Please approve the connection in your wallet');
    }
    throw err;
  }
}
```

**Responsive transaction UI:**

```typescript
function ResponsiveTransactionButton() {
  const isMobile = useMediaQuery('(max-width: 768px)');

  return (
    <button className={isMobile ? 'mobile-tx-button' : 'desktop-tx-button'}>
      {isMobile ? 'Send' : 'Send Transaction'}
    </button>
  );
}

// Mobile-first: larger tap targets, bottom sheets
function MobileTransactionSheet({ isOpen, onClose }: SheetProps) {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="mobile-tx-content">
        <h3>Confirm Transaction</h3>
        <div className="tx-details">
          {/* Large, readable details */}
        </div>
        <button className="full-width-button" style={{ minHeight: '48px' }}>
          Confirm
        </button>
      </div>
    </BottomSheet>
  );
}
```

## Batch Transactions UX

**Show progress for multiple transactions:**

```typescript
function BatchTransactionProgress({
  transactions
}: {
  transactions: Transaction[]
}) {
  const [completed, setCompleted] = useState(0);
  const [failed, setFailed] = useState<number[]>([]);

  const executeBatch = async () => {
    for (let i = 0; i < transactions.length; i++) {
      try {
        await executeTransaction(transactions[i]);
        setCompleted(i + 1);
      } catch (err) {
        setFailed([...failed, i]);
        // Continue with next transaction
      }
    }
  };

  return (
    <div>
      <div className="batch-progress">
        <span>{completed} / {transactions.length} completed</span>
        <progress value={completed} max={transactions.length} />
      </div>

      {failed.length > 0 && (
        <div className="batch-failures">
          {failed.length} transaction(s) failed
          <button onClick={() => retryFailed(failed)}>
            Retry Failed
          </button>
        </div>
      )}
    </div>
  );
}
```

## Priority Fees UX

**Let users choose transaction speed:**

```typescript
function TransactionSpeedSelector() {
  const [priorityFee, setPriorityFee] = useState<'normal' | 'fast' | 'turbo'>('normal');

  const feeSettings = {
    normal: { microLamports: 5000, label: 'Normal (~1-3s)' },
    fast: { microLamports: 50000, label: 'Fast (~500ms)' },
    turbo: { microLamports: 100000, label: 'Turbo (~200ms)' },
  };

  return (
    <div className="speed-selector">
      <label>Transaction Speed</label>
      <div className="speed-options">
        {Object.entries(feeSettings).map(([key, { label }]) => (
          <button
            key={key}
            className={priorityFee === key ? 'selected' : ''}
            onClick={() => setPriorityFee(key as any)}
          >
            {label}
          </button>
        ))}
      </div>
      <small>
        Fee: +{(feeSettings[priorityFee].microLamports / 1_000_000).toFixed(6)} SOL
      </small>
    </div>
  );
}
```

## Complete Example: Production-Ready Hook

```typescript
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Transaction, TransactionSignature } from '@solana/web3.js';
import { useState, useCallback } from 'react';
import { toast } from 'react-toastify';

export function useTransactionWithUX() {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();

  const [status, setStatus] = useState<TransactionStatus>('idle');
  const [signature, setSignature] = useState<TransactionSignature | null>(null);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (
    transaction: Transaction,
    options?: {
      skipPreflight?: boolean;
      onSigning?: () => void;
      onSent?: (sig: string) => void;
    }
  ) => {
    if (!publicKey || !signTransaction) {
      throw new Error('Wallet not connected');
    }

    const toastId = toast.loading('Preparing transaction...');

    try {
      // Get fresh blockhash
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash('confirmed');

      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      // Signing
      setStatus('signing');
      toast.update(toastId, { render: 'Approve in your wallet...' });
      options?.onSigning?.();

      const signed = await signTransaction(transaction);

      // Sending
      setStatus('sending');
      toast.update(toastId, { render: 'Sending transaction...' });

      const signature = await connection.sendRawTransaction(
        signed.serialize(),
        {
          skipPreflight: options?.skipPreflight ?? false,
          maxRetries: 3,
        }
      );

      setSignature(signature);
      options?.onSent?.(signature);

      // Confirming
      setStatus('processing');
      toast.update(toastId, {
        render: (
          <div>
            Transaction sent
            <a href={`https://explorer.solana.com/tx/${signature}`}>
              View ↗
            </a>
          </div>
        ),
      });

      await connection.confirmTransaction(
        { signature, blockhash, lastValidBlockHeight },
        'confirmed'
      );

      setStatus('confirmed');
      toast.update(toastId, {
        render: 'Transaction confirmed!',
        type: 'success',
        isLoading: false,
        autoClose: 5000,
      });

      return signature;

    } catch (err: any) {
      setStatus('error');
      const errorMsg = parseTransactionError(err);
      setError(errorMsg);

      toast.update(toastId, {
        render: errorMsg,
        type: 'error',
        isLoading: false,
        autoClose: 8000,
      });

      throw err;
    }
  }, [publicKey, signTransaction, connection]);

  const reset = useCallback(() => {
    setStatus('idle');
    setSignature(null);
    setError(null);
  }, []);

  return {
    execute,
    reset,
    status,
    signature,
    error,
    isLoading: ['signing', 'sending', 'processing'].includes(status),
  };
}
```

## Key Takeaways

1. **Show the journey**: Users should see signing → sending → confirming → finalized, not just a spinner
2. **Optimistic updates**: Show expected state immediately, revert on failure
3. **Human errors**: Translate cryptic blockchain errors into actionable messages
4. **Explorer links**: Always provide a way to debug on Solana Explorer
5. **Mobile-first**: Larger tap targets, bottom sheets, Mobile Wallet Adapter support
6. **Confirmation strategy**: Use blockhash + lastValidBlockHeight, not deprecated confirmTransaction
7. **Progressive toasts**: Update a single toast through the lifecycle, don't spam
8. **Retry logic**: Implement exponential backoff for retryable errors
9. **Real-time feedback**: Use subscriptions for live confirmation updates
10. **Debug tools**: Build debug panels for development to inspect logs and metadata

Great transaction UX on Solana means users never wonder "did it work?" — they know exactly what's happening at every step.
