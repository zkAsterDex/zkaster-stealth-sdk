import { generateStealthKeys, generateStealthAddress, scanStealthAddresses, deriveStealthSpendingKey, createStealthMetadata } from "../src";

async function runDemo() {
    console.log("=== Stealth SDK Demo ===\n");

    // 1. Alice generates keys
    console.log("1. Alice generates stealth keys...");
    const aliceKeys = generateStealthKeys();
    console.log("Alice's Viewing Public Key:", aliceKeys.viewingPublicKey);
    console.log("Alice's Spending Public Key:", aliceKeys.spendingPublicKey);
    console.log("");

    // 2. Bob sends to Alice
    console.log("2. Bob generates stealth address for Alice...");
    const stealthInfo = generateStealthAddress(aliceKeys.viewingPublicKey, aliceKeys.spendingPublicKey);
    console.log("Stealth Address:", stealthInfo.address);
    console.log("Ephemeral Public Key:", stealthInfo.ephemeralPublicKey);
    console.log("View Tag:", stealthInfo.viewTag);
    console.log("");

    // 3. Bob creates metadata (simulating DB storage)
    const metadata = createStealthMetadata(stealthInfo, "eth");
    const allMetadata = [metadata]; // In reality, this would be many items

    // 4. Alice scans for addresses
    console.log("3. Alice scans for her addresses...");
    const discovered = scanStealthAddresses(
        aliceKeys.viewingPrivateKey,
        aliceKeys.viewingPublicKey,
        allMetadata
    );

    console.log(`Found ${discovered.length} address(es)!`);
    if (discovered.length > 0) {
        console.log("Discovered Address:", discovered[0].address);

        // 5. Alice derives spending key
        console.log("4. Alice derives spending key...");
        const spendingKey = deriveStealthSpendingKey(
            aliceKeys.spendingPrivateKey,
            aliceKeys.viewingPrivateKey,
            discovered[0].address as `0x${string}`,
            discovered[0].ephemeralPublicKey as `0x${string}`,
            aliceKeys.viewingPublicKey
        );
        console.log("Derived Spending Key:", spendingKey);
        console.log("Success! Alice can now spend funds from this address.");
    } else {
        console.error("Failed to discover address!");
    }
}

runDemo().catch(console.error);
