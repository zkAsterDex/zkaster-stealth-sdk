import { secp256k1 } from "@noble/curves/secp256k1.js";

/**
 * Convert hex string to Uint8Array (removing 0x prefix)
 */
export function hexToUint8Array(hex: string): Uint8Array {
    const hexStr = hex.startsWith("0x") ? hex.slice(2) : hex;
    const bytes = new Uint8Array(hexStr.length / 2);
    for (let i = 0; i < hexStr.length; i += 2) {
        bytes[i / 2] = parseInt(hexStr.substr(i, 2), 16);
    }
    return bytes;
}

/**
 * Convert Uint8Array to hex string with 0x prefix
 */
export function uint8ArrayToHex(bytes: Uint8Array): `0x${string}` {
    return `0x${Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("")}` as `0x${string}`;
}

/**
 * Derive public key from private key using secp256k1
 */
export function derivePublicKey(privateKey: `0x${string}`): `0x${string}` {
    const privBytes = hexToUint8Array(privateKey);
    // secp256k1.getPublicKey returns compressed public key (33 bytes)
    const pubKey = secp256k1.getPublicKey(privBytes, true);
    return uint8ArrayToHex(pubKey);
}

/**
 * Validate stealth address format
 */
export function isValidStealthAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validate public key format (compressed secp256k1: 33 bytes = 66 hex chars)
 */
export function isValidPublicKey(publicKey: string): boolean {
    const hexStr = publicKey.startsWith("0x") ? publicKey.slice(2) : publicKey;
    return /^[a-fA-F0-9]{66}$/.test(hexStr);
}
