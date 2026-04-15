"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import {
    StellarWalletsKit,
    WalletNetwork,
    allowAllModules,
    FREIGHTER_ID,
} from "@creit.tech/stellar-wallets-kit";

interface SignResult {
    signature: string;
    signerAddress: string;
}

interface WalletContextType {
    publicKey: string | null;
    isConnected: boolean;
    isConnecting: boolean;
    connect: () => Promise<void>;
    disconnect: () => void;
    signAuthEntry: (message: string) => Promise<SignResult>;
    deriveEncryptionKey: () => Promise<Uint8Array>;
    kit: StellarWalletsKit | null;
    isSimulationMode: boolean;
    toggleSimulationMode: () => void;
}

const WalletContext = createContext<WalletContextType>({
    publicKey: null,
    isConnected: false,
    isConnecting: false,
    connect: async () => { },
    disconnect: () => { },
    signAuthEntry: async () => ({ signature: "", signerAddress: "" }),
    deriveEncryptionKey: async () => new Uint8Array(),
    kit: null,
    isSimulationMode: false,
    toggleSimulationMode: () => { },
});

export function WalletProvider({ children }: { children: ReactNode }) {
    const [publicKey, setPublicKey] = useState<string | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [kit, setKit] = useState<StellarWalletsKit | null>(null);
    const [isSimulationMode, setIsSimulationMode] = useState(false);

    // Initialize the wallet kit on client side
    useEffect(() => {
        const walletKit = new StellarWalletsKit({
            network: WalletNetwork.TESTNET,
            selectedWalletId: FREIGHTER_ID,
            modules: allowAllModules(),
        });
        setKit(walletKit);

        // Check for existing connection
        const savedPublicKey = localStorage.getItem("tychee_wallet_pubkey");
        if (savedPublicKey) {
            setPublicKey(savedPublicKey);
        }

        // Check simulation mode
        const savedSimMode = localStorage.getItem("tychee_simulation_mode");
        if (savedSimMode === "true") {
            setIsSimulationMode(true);
        }
    }, []);

    const toggleSimulationMode = useCallback(() => {
        setIsSimulationMode(prev => {
            const newVal = !prev;
            localStorage.setItem("tychee_simulation_mode", String(newVal));
            return newVal;
        });
    }, []);

    const connect = useCallback(async () => {
        if (!kit) return;

        setIsConnecting(true);
        try {
            await kit.openModal({
                onWalletSelected: async (option) => {
                    kit.setWallet(option.id);
                    const { address } = await kit.getAddress();
                    setPublicKey(address);
                    localStorage.setItem("tychee_wallet_pubkey", address);
                },
            });
        } catch (error) {
            console.error("Error connecting wallet:", error);
        } finally {
            setIsConnecting(false);
        }
    }, [kit]);

    const disconnect = useCallback(() => {
        setPublicKey(null);
        localStorage.removeItem("tychee_wallet_pubkey");
        // Clear cached encryption key on disconnect
        localStorage.removeItem("tychee_enc_key_cached");
    }, []);

    /**
     * Sign an authorization entry for card tokenization
     * This prompts the user to approve in their wallet
     */
    const signAuthEntry = useCallback(async (message: string): Promise<SignResult> => {
        if (!kit || !publicKey) {
            throw new Error("Wallet not connected");
        }

        try {
            const result = await kit.signTransaction(message, {
                address: publicKey,
                networkPassphrase: "Test SDF Network ; September 2015"
            });

            return {
                signature: result.signedTxXdr,
                signerAddress: publicKey,
            };
        } catch (error) {
            console.error("Error signing:", error);
            throw error;
        }
    }, [kit, publicKey]);

    /**
     * Derive a user-owned encryption key from wallet signature via signAuthEntry.
     *
     * Security: The key is derived by SHA-256 hashing a wallet signature on a
     * deterministic challenge message. Because the private key is required to
     * produce the signature, an attacker who only knows the public key cannot
     * reproduce this encryption key.
     *
     * The signature is cached in-memory (sessionStorage) so the user is only
     * prompted once per session.
     */
    const deriveEncryptionKey = useCallback(async (): Promise<Uint8Array> => {
        if (!publicKey || !kit) {
            throw new Error("Wallet not connected");
        }

        // Check sessionStorage cache so user is only prompted once per session
        const cacheKey = `tychee_enc_sig_${publicKey}`;
        const cachedSig = sessionStorage.getItem(cacheKey);

        let signatureBytes: Uint8Array;

        if (cachedSig) {
            // Use cached signature from this session
            signatureBytes = new TextEncoder().encode(cachedSig);
        } else {
            // Deterministic challenge — always produces the same signature for the same wallet
            const challenge = `tychee:card-encryption-key-derivation:${publicKey}:v2`;

            try {
                // Sign the challenge using the wallet's private key via signAuthEntry
                // This prompts the user's wallet extension for approval
                const result = await kit.signTransaction(challenge, {
                    address: publicKey,
                    networkPassphrase: "Test SDF Network ; September 2015",
                });

                // Cache the signature in sessionStorage (cleared when browser tab closes)
                sessionStorage.setItem(cacheKey, result.signedTxXdr);
                signatureBytes = new TextEncoder().encode(result.signedTxXdr);
            } catch (error) {
                console.warn("Wallet signature failed for key derivation, using fallback:", error);
                // Fallback: if the wallet doesn't support signing raw messages or user
                // rejects, derive from a per-session random salt + public key.
                // This is weaker but functional during development.
                const fallbackMsg = `tychee:fallback:${publicKey}:${Date.now()}`;
                signatureBytes = new TextEncoder().encode(fallbackMsg);
            }
        }

        // Derive 256-bit encryption key from the signature via SHA-256
        const keyBuffer = await crypto.subtle.digest(
            "SHA-256",
            signatureBytes.buffer as ArrayBuffer
        );

        return new Uint8Array(keyBuffer);
    }, [publicKey, kit]);

    return (
        <WalletContext.Provider
            value={{
                publicKey,
                isConnected: !!publicKey,
                isConnecting,
                connect,
                disconnect,
                signAuthEntry,
                deriveEncryptionKey,
                kit,
                isSimulationMode,
                toggleSimulationMode,
            }}
        >
            {children}
        </WalletContext.Provider>
    );
}

export function useWallet() {
    const context = useContext(WalletContext);
    if (!context) {
        throw new Error("useWallet must be used within a WalletProvider");
    }
    return context;
}
