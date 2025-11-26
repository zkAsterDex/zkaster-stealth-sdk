export type StealthKeys = {
    spendingPrivateKey: `0x${string}`;
    viewingPrivateKey: `0x${string}`;
    spendingPublicKey: `0x${string}`;
    viewingPublicKey: `0x${string}`;
};

export type StealthAddress = {
    address: `0x${string}`;
    ephemeralPublicKey: `0x${string}`;
    viewTag: string;
};

export type StealthMetadata = {
    stealthAddress: string;
    ephemeralPublicKey: string;
    viewTag: string;
    network: string;
    createdAt: number;
};
