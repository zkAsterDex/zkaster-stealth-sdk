import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { keccak256, toHex, hexToBytes } from "viem";
import { secp256k1 } from "@noble/curves/secp256k1.js";
import { StealthKeys, StealthAddress, StealthMetadata } from "./types";
import { hexToUint8Array, uint8ArrayToHex, derivePublicKey } from "./utils";

/**
 * Compute ECDH shared secret
 * shared_secret = H(private_key * public_key)
 */
function computeECDH(
    privateKey: `0x${string}`,
    publicKey: `0x${string}`
): `0x${string}` {
    try {
        if (!privateKey || !publicKey) {
            throw new Error("Missing private or public key");
        }

        const privKey = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
        const pubKey = publicKey.startsWith("0x") ? publicKey : `0x${publicKey}`;

        if (privKey.length !== 66) {
            throw new Error(`Invalid private key length: ${privKey.length}, expected 66`);
        }

        const pubKeyHexLength = pubKey.length - 2;
        if (pubKeyHexLength !== 66 && pubKeyHexLength !== 130) {
            throw new Error(`Invalid public key length: ${pubKey.length}, expected 68 or 132`);
        }

        const privBytes = hexToUint8Array(privKey);
        const pubBytes = hexToUint8Array(pubKey);

        const sharedPoint = secp256k1.getSharedSecret(privBytes, pubBytes, true);
        const sharedSecret = keccak256(uint8ArrayToHex(sharedPoint));

        return sharedSecret as `0x${string}`;
    } catch (error: any) {
        throw new Error(`ECDH computation failed: ${error?.message || String(error)}`);
    }
}

/**
 * Generate stealth keys (spending + viewing keys)
 */
export function generateStealthKeys(): StealthKeys {
    const spendingPrivateKey = generatePrivateKey();
    const viewingPrivateKey = generatePrivateKey();

    const spendingPublicKey = derivePublicKey(spendingPrivateKey);
    const viewingPublicKey = derivePublicKey(viewingPrivateKey);

    return {
        spendingPrivateKey,
        viewingPrivateKey,
        spendingPublicKey,
        viewingPublicKey,
    };
}

/**
 * Generate a stealth address
 */
export function generateStealthAddress(
    viewingPublicKey: `0x${string}`,
    spendingPublicKey?: `0x${string}`,
    ephemeralPrivateKey?: `0x${string}`
): StealthAddress {
    const normalizedViewingPub = viewingPublicKey.startsWith("0x")
        ? viewingPublicKey
        : `0x${viewingPublicKey}`;

    const viewingPubHexLength = normalizedViewingPub.length - 2;
    if (viewingPubHexLength !== 66 && viewingPubHexLength !== 130) {
        throw new Error(`Invalid viewingPublicKey format`);
    }

    const ephemeralKey = ephemeralPrivateKey || generatePrivateKey();
    const ephemeralPublicKey = derivePublicKey(ephemeralKey);

    const sharedSecret = computeECDH(ephemeralKey, normalizedViewingPub as `0x${string}`);

    const sharedSecretBytes = hexToBytes(sharedSecret as `0x${string}`);
    const viewingPubBytes = hexToBytes(normalizedViewingPub as `0x${string}`);

    const combined = new Uint8Array(sharedSecretBytes.length + viewingPubBytes.length);
    combined.set(sharedSecretBytes);
    combined.set(viewingPubBytes, sharedSecretBytes.length);

    const stealthPrivateKey = keccak256(toHex(combined)) as `0x${string}`;
    const stealthAccount = privateKeyToAccount(stealthPrivateKey);

    const viewTag = sharedSecret.slice(2, 4).toLowerCase();

    return {
        address: stealthAccount.address,
        ephemeralPublicKey,
        viewTag,
    };
}

/**
 * Scan for stealth addresses using viewing key
 */
export function scanStealthAddresses(
    viewingPrivateKey: `0x${string}`,
    viewingPublicKey: `0x${string}`,
    stealthMetadata: StealthMetadata[]
): StealthAddress[] {
    const discovered: StealthAddress[] = [];

    if (!viewingPrivateKey || !viewingPublicKey) {
        throw new Error("Missing viewing keys");
    }

    const viewingPriv = viewingPrivateKey.startsWith("0x") ? viewingPrivateKey : `0x${viewingPrivateKey}`;
    const viewingPub = viewingPublicKey.startsWith("0x") ? viewingPublicKey : `0x${viewingPublicKey}`;

    for (const meta of stealthMetadata) {
        try {
            if (!meta.stealthAddress || !meta.ephemeralPublicKey || !meta.viewTag) {
                continue;
            }

            const ephemeralPub = meta.ephemeralPublicKey.startsWith("0x")
                ? meta.ephemeralPublicKey
                : `0x${meta.ephemeralPublicKey}`;

            const sharedSecret = computeECDH(viewingPriv as `0x${string}`, ephemeralPub as `0x${string}`);

            const computedViewTag = sharedSecret.slice(2, 4).toLowerCase();
            const storedViewTag = (meta.viewTag || "").toLowerCase().replace(/^0x/, "");

            if (computedViewTag !== storedViewTag) {
                continue;
            }

            const sharedSecretBytes = hexToBytes(sharedSecret as `0x${string}`);
            const viewingPubBytes = hexToBytes(viewingPub as `0x${string}`);

            const combined = new Uint8Array(sharedSecretBytes.length + viewingPubBytes.length);
            combined.set(sharedSecretBytes);
            combined.set(viewingPubBytes, sharedSecretBytes.length);

            const stealthPrivateKey = keccak256(toHex(combined)) as `0x${string}`;
            const stealthAccount = privateKeyToAccount(stealthPrivateKey);

            if (stealthAccount.address.toLowerCase() === meta.stealthAddress.toLowerCase()) {
                discovered.push({
                    address: meta.stealthAddress as `0x${string}`,
                    ephemeralPublicKey: ephemeralPub as `0x${string}`,
                    viewTag: meta.viewTag,
                });
            }
        } catch (e) {
            continue;
        }
    }

    return discovered;
}

/**
 * Derive spending private key for a stealth address
 */
export function deriveStealthSpendingKey(
    spendingPrivateKey: `0x${string}`,
    viewingPrivateKey: `0x${string}`,
    stealthAddress: `0x${string}`,
    ephemeralPublicKey: `0x${string}`,
    viewingPublicKey?: `0x${string}`
): `0x${string}` {
    const sharedSecret = computeECDH(viewingPrivateKey, ephemeralPublicKey);

    if (!viewingPublicKey) {
        const viewingPub = derivePublicKey(viewingPrivateKey);
        viewingPublicKey = viewingPub;
    }

    const sharedSecretBytes = hexToBytes(sharedSecret as `0x${string}`);
    const viewingPubBytes = hexToBytes(viewingPublicKey as `0x${string}`);

    const combined = new Uint8Array(sharedSecretBytes.length + viewingPubBytes.length);
    combined.set(sharedSecretBytes);
    combined.set(viewingPubBytes, sharedSecretBytes.length);

    const stealthPrivateKey = keccak256(toHex(combined)) as `0x${string}`;

    const derivedAccount = privateKeyToAccount(stealthPrivateKey);
    if (derivedAccount.address.toLowerCase() !== stealthAddress.toLowerCase()) {
        throw new Error(`Derived address mismatch!`);
    }

    return stealthPrivateKey;
}

/**
 * Generate stealth address metadata
 */
export function createStealthMetadata(
    stealthAddress: StealthAddress,
    network: string
): StealthMetadata {
    return {
        stealthAddress: stealthAddress.address,
        ephemeralPublicKey: stealthAddress.ephemeralPublicKey,
        viewTag: stealthAddress.viewTag,
        network,
        createdAt: Date.now(),
    };
}
