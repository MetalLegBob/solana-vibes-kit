# OC-198: Mobile Local Storage Without Keychain

**Category:** Frontend & Client
**Severity:** HIGH
**Auditors:** FE-03
**CWE:** CWE-311
**OWASP:** A02:2021 - Cryptographic Failures

## Description

Mobile applications have access to platform-provided secure storage mechanisms: iOS Keychain and Android Keystore. These provide hardware-backed encryption, access control (biometric, passcode), and protection against extraction even on rooted/jailbroken devices. Despite this, many mobile apps -- especially those built with cross-platform frameworks like React Native and Flutter -- store sensitive data in plaintext using AsyncStorage, SharedPreferences, or NSUserDefaults.

React Native's `AsyncStorage` stores data in unencrypted SQLite on Android and plaintext plist files on iOS. On a rooted Android device or jailbroken iPhone, this data is trivially accessible via the file system. Even without root access, Android backup mechanisms and iOS file-sharing can expose AsyncStorage contents.

For crypto wallet apps, this pattern is catastrophic. Storing private keys, seed phrases, session tokens, or PIN hashes in AsyncStorage instead of platform-secure storage means a device compromise or backup extraction gives the attacker full access to the wallet.

## Detection

```
# React Native AsyncStorage usage with sensitive data
grep -rn "AsyncStorage\.setItem\|AsyncStorage\.getItem" --include="*.ts" --include="*.tsx"
grep -rn "AsyncStorage.*key\|AsyncStorage.*token\|AsyncStorage.*secret\|AsyncStorage.*seed\|AsyncStorage.*mnemonic\|AsyncStorage.*password\|AsyncStorage.*pin" -i --include="*.ts" --include="*.tsx"

# SharedPreferences on Android
grep -rn "getSharedPreferences\|SharedPreferences\|putString.*key\|putString.*token" --include="*.java" --include="*.kt"

# NSUserDefaults on iOS
grep -rn "NSUserDefaults\|UserDefaults.*set\|UserDefaults.*token\|UserDefaults.*key" --include="*.swift" --include="*.m"

# Check for secure storage library usage (positive signal)
grep -rn "react-native-keychain\|expo-secure-store\|SecureStore\|Keychain" --include="*.ts" --include="*.tsx"
```

## Vulnerable Code

```typescript
// React Native wallet app storing sensitive data in AsyncStorage
import AsyncStorage from '@react-native-async-storage/async-storage';

async function saveWalletCredentials(credentials: WalletCredentials) {
  // VULNERABLE: Plaintext storage on filesystem
  await AsyncStorage.setItem('wallet_seed', credentials.seedPhrase);
  await AsyncStorage.setItem('wallet_privkey', credentials.privateKey);
  await AsyncStorage.setItem('auth_token', credentials.sessionToken);
  await AsyncStorage.setItem('pin_hash', credentials.pinHash);
}

async function loadWalletCredentials(): Promise<WalletCredentials> {
  return {
    seedPhrase: await AsyncStorage.getItem('wallet_seed') ?? '',
    privateKey: await AsyncStorage.getItem('wallet_privkey') ?? '',
    sessionToken: await AsyncStorage.getItem('auth_token') ?? '',
    pinHash: await AsyncStorage.getItem('pin_hash') ?? '',
  };
}
```

## Secure Code

```typescript
// Use platform secure storage for sensitive data
import * as SecureStore from 'expo-secure-store';
// Or: import * as Keychain from 'react-native-keychain';

async function saveWalletCredentials(credentials: WalletCredentials) {
  // SECURE: Uses iOS Keychain / Android Keystore
  await SecureStore.setItemAsync('wallet_seed', credentials.seedPhrase, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    requireAuthentication: true, // Require biometric/PIN to access
  });

  // Session token can use slightly less restrictive access
  await SecureStore.setItemAsync('auth_token', credentials.sessionToken, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  });
}

async function loadSeedPhrase(): Promise<string | null> {
  // SECURE: Biometric/PIN prompt required before access
  return SecureStore.getItemAsync('wallet_seed', {
    requireAuthentication: true,
    authenticationPrompt: 'Authenticate to access your wallet',
  });
}
```

## Impact

Sensitive data stored in AsyncStorage, SharedPreferences, or NSUserDefaults can be extracted from device backups, accessed on rooted/jailbroken devices, or exposed through other apps exploiting local file access vulnerabilities. For wallet apps, this means complete theft of private keys and seed phrases, enabling full fund drainage. Even session tokens stored insecurely allow account takeover.

## References

- CWE-311: Missing Encryption of Sensitive Data
- OWASP MASVS-STORAGE: Data Storage requirements
- OWASP Mobile Top 10 2024: M9 - Insecure Data Storage
- React Native Security: AsyncStorage vs Keychain/Keystore
- Propel: "Mobile App Code Review: React Native and Flutter Security Checklist"
