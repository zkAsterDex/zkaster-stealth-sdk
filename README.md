# Stealth SDK

A lightweight, type-safe TypeScript SDK for implementing **Stealth Addresses** (based on EIP-5564) on Ethereum and EVM-compatible chains.

Enable privacy-preserving transactions where the receiver's identity remains hidden on-chain, while maintaining the ability to prove ownership and spend funds.

## 🚀 Features

- **🔐 Secure Key Generation**: Uses standard ECDSA for spending and viewing keys.
- **🕵️‍♂️ Stealth Address Derivation**: Implements ECDH for secure shared secret computation.
- **⚡ Efficient Scanning**: Uses **View Tags** (1 byte) to filter irrelevant transactions instantly, reducing scanning time by ~256x.
- **🛡️ Privacy-Preserving**: Unlinkable addresses for every transaction.
- **📦 Lightweight**: Built on top of `viem` and `@noble/curves` with minimal overhead.

## 📦 Installation

```bash
npm install zkaster-stealth-sdk
# or
yarn add zkaster-stealth-sdk
```

## 📖 Usage

### 1. Generate Keys (Receiver)

The receiver needs two key pairs:
- **Spending Key**: Used to sign transactions and spend funds. **Keep private!**
- **Viewing Key**: Used to scan the blockchain for incoming payments. **Keep private!**

The **Viewing Public Key** and **Spending Public Key** are shared with senders (e.g., via a registry or QR code).

```typescript
import { generateStealthKeys } from "zkaster-stealth-sdk";

// Generate new random keys
const keys = generateStealthKeys();

console.log("My Viewing Public Key:", keys.viewingPublicKey);
console.log("My Spending Public Key:", keys.spendingPublicKey);
```

### 2. Generate Stealth Address (Sender)

To send funds privately, the sender generates a unique **Stealth Address** using the receiver's public keys.

```typescript
import { generateStealthAddress } from "zkaster-stealth-sdk";

const recipientViewingKey = "0x..."; // From recipient
const recipientSpendingKey = "0x..."; // From recipient

// Generate a unique stealth address
const stealth = generateStealthAddress(recipientViewingKey, recipientSpendingKey);

console.log("Send funds to:", stealth.address);
console.log("Ephemeral Public Key:", stealth.ephemeralPublicKey); // Publish this!
console.log("View Tag:", stealth.viewTag); // Publish this!
```

> **Important**: The sender **MUST** publish the `ephemeralPublicKey` and `viewTag` (e.g., in transaction data or a separate event log) so the receiver can find the payment.

### 3. Scan for Payments (Receiver)

The receiver scans a list of potential metadata (from chain events or a database) to find payments belonging to them.

```typescript
import { scanStealthAddresses } from "zkaster-stealth-sdk";

// Metadata fetched from blockchain events or indexer
const metadataList = [
  {
    stealthAddress: "0x...",
    ephemeralPublicKey: "0x...",
    viewTag: "0x...",
    network: "eth",
    createdAt: 1234567890
  },
  // ...
];

// Scan using your private viewing key
const myPayments = scanStealthAddresses(
  myKeys.viewingPrivateKey,
  myKeys.viewingPublicKey,
  metadataList
);

console.log(`Found ${myPayments.length} payments!`);
```

### 4. Spend Funds (Receiver)

Once a stealth address is discovered, the receiver can derive the **Spending Private Key** for that specific address.

```typescript
import { deriveStealthSpendingKey } from "zkaster-stealth-sdk";

const payment = myPayments[0];

const stealthPrivateKey = deriveStealthSpendingKey(
  myKeys.spendingPrivateKey,
  myKeys.viewingPrivateKey,
  payment.address,
  payment.ephemeralPublicKey,
  myKeys.viewingPublicKey
);

console.log("Private Key for this address:", stealthPrivateKey);
// Now use this key with ethers.js / viem to send a transaction!
```

## 📚 API Reference

### `generateStealthKeys()`
Generates a new set of spending and viewing keys.

### `generateStealthAddress(viewingPublicKey, spendingPublicKey)`
Generates a stealth address and the necessary metadata (ephemeral key, view tag).

### `scanStealthAddresses(viewingPrivateKey, viewingPublicKey, metadata[])`
Filters a list of metadata to find addresses that belong to the user.

### `deriveStealthSpendingKey(...)`
Computes the private key for a specific stealth address using the user's master private keys.

## 🔒 Security

- **Cryptography**: Uses `secp256k1` via `@noble/curves` and `viem` for standard Ethereum cryptography.
- **Randomness**: Uses cryptographically secure random number generation for keys.
- **Private Keys**: Never share your `spendingPrivateKey` or `viewingPrivateKey`. Only share the public keys.

## 📄 License

MIT
