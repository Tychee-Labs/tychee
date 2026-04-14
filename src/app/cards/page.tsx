"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, CreditCard as CreditCardIcon, Shield, Trash2, Loader2, AlertCircle, KeyRound, Lock, ExternalLink } from "lucide-react";
import { useWallet } from "@/context/WalletContext";

// Import browser-compatible SDK wrapper (mirrors @tychee/sdk API)
import { CardTokenizer, ClientCrypto, type CardData } from "@/lib/tychee-client";
// Import Soroban client for on-chain storage
import { storeCardOnChain, revokeCardOnChain, isOnChainConfigured, type StoreTokenParams } from "@/lib/soroban-client";

interface StoredCard {
    id: string;
    last4: string;
    network: string;
    status: string;
    expiresAt: string;
    tokenHash?: string;
    signedAt?: string;
    encryptedSize?: number;
    txHash?: string;
}

interface CardFormData {
    cardNumber: string;
    expiry: string;
    cvv: string;
    cardholderName: string;
}

export default function CardsPage() {
    const { publicKey, isConnected, deriveEncryptionKey, kit, isSimulationMode } = useWallet();
    const [cards, setCards] = useState<StoredCard[]>([]);
    const [showAddCard, setShowAddCard] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingCards, setIsLoadingCards] = useState(false);
    const [loadingStep, setLoadingStep] = useState<string>("");
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState<CardFormData>({
        cardNumber: "",
        expiry: "",
        cvv: "",
        cardholderName: "",
    });

    // Load saved cards from localStorage on mount (cache / fallback when on-chain is not configured)
    useEffect(() => {
        const key = isSimulationMode ? "sim_user" : publicKey;
        if (key) {
            const savedCards = localStorage.getItem(`tychee_cards_${key}`);
            if (savedCards) {
                setCards(JSON.parse(savedCards));
            } else {
                setCards([]);
            }
        } else {
            setCards([]);
        }
    }, [publicKey, isSimulationMode]);

    // Close modal on Escape key
    const handleEscKey = useCallback((e: KeyboardEvent) => {
        if (e.key === "Escape" && showAddCard) {
            setShowAddCard(false);
            setError(null);
            setFormData({ cardNumber: "", expiry: "", cvv: "", cardholderName: "" });
        }
    }, [showAddCard]);

    useEffect(() => {
        document.addEventListener("keydown", handleEscKey);
        return () => document.removeEventListener("keydown", handleEscKey);
    }, [handleEscKey]);

    // Format card number with spaces (SDK-style)
    const formatCardNumber = (value: string) => {
        const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
        const matches = v.match(/\d{4,16}/g);
        const match = (matches && matches[0]) || "";
        const parts = [];
        for (let i = 0, len = match.length; i < len; i += 4) {
            parts.push(match.substring(i, i + 4));
        }
        return parts.length ? parts.join(" ") : value;
    };

    // Format expiry date
    const formatExpiry = (value: string) => {
        const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
        if (v.length >= 2) {
            return v.substring(0, 2) + "/" + v.substring(2, 4);
        }
        return v;
    };

    const handleInputChange = (field: keyof CardFormData, value: string) => {
        let formattedValue = value;
        if (field === "cardNumber") {
            formattedValue = formatCardNumber(value);
        } else if (field === "expiry") {
            formattedValue = formatExpiry(value);
        } else if (field === "cvv") {
            formattedValue = value.replace(/[^0-9]/g, "").substring(0, 4);
        }
        setFormData(prev => ({ ...prev, [field]: formattedValue }));
    };

    const handleTokenizeCard = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!isConnected && !publicKey && !isSimulationMode) {
            setError("Please connect your wallet first");
            return;
        }

        const cleanedCardNumber = formData.cardNumber.replace(/\s/g, "");

        // Step 1: Validate card using SDK's CardTokenizer
        setLoadingStep("Validating card...");
        if (!CardTokenizer.validateCardNumber(cleanedCardNumber)) {
            setError("Invalid card number (failed Luhn check)");
            return;
        }

        // Validate expiry
        const [month, year] = formData.expiry.split("/");
        if (!month || !year || parseInt(month) < 1 || parseInt(month) > 12) {
            setError("Invalid expiry date");
            return;
        }

        // Validate CVV
        if (formData.cvv.length < 3) {
            setError("Invalid CVV");
            return;
        }

        setIsLoading(true);

        try {
            // Step 2: Detect card network using SDK
            setLoadingStep("Detecting card network...");
            const network = CardTokenizer.detectCardNetwork(cleanedCardNumber) as CardData["network"];

            // Step 3: Create CardData object (SDK type)
            const cardData: CardData = {
                pan: cleanedCardNumber,
                cvv: formData.cvv,
                expiryMonth: month,
                expiryYear: year,
                cardholderName: formData.cardholderName,
                network: network,
            };

            // Step 4: Derive user-owned encryption key
            let encryptionKey: Uint8Array;
            if (isSimulationMode) {
                setLoadingStep("Simulation: Generating demo encryption key...");
                const seed = new TextEncoder().encode("tychee:demo:v1:no-wallet-required");
                const buf = await crypto.subtle.digest("SHA-256", seed);
                encryptionKey = new Uint8Array(buf);
            } else {
                setLoadingStep("Deriving encryption key from wallet...");
                encryptionKey = await deriveEncryptionKey();
            }

            // Step 5: Encrypt card using browser-compatible CardTokenizer
            setLoadingStep("Encrypting card data (AES-256-GCM)...");
            const { encryptedPayload, tokenHash, last4Digits } = await CardTokenizer.encryptCard(
                cardData,
                encryptionKey
            );

            // Calculate expiration timestamp
            const expiryDate = new Date(
                parseInt("20" + year),
                parseInt(month) - 1,
                1
            );
            expiryDate.setMonth(expiryDate.getMonth() + 1);
            const expiresAt = Math.floor(expiryDate.getTime() / 1000);

            // Step 6: Store on-chain with wallet signature
            let txHash: string | undefined;

            if (isSimulationMode) {
                setLoadingStep("Simulation: Saving token hash...");
                await new Promise((r) => setTimeout(r, 1400));
                const raw = await crypto.subtle.digest(
                    "SHA-256",
                    new TextEncoder().encode(`demo:${tokenHash}:${Date.now()}`)
                );
                const hex = Array.from(new Uint8Array(raw))
                    .map((b) => b.toString(16).padStart(2, "0"))
                    .join("");
                txHash = `0x${hex}`;
            } else if (kit && isOnChainConfigured() && publicKey) {
                setLoadingStep("Requesting wallet signature for on-chain storage...");

                const storeParams: StoreTokenParams = {
                    publicKey,
                    encryptedPayload,
                    tokenHash,
                    last4Digits,
                    network,
                    expiresAt,
                };

                const result = await storeCardOnChain(kit, storeParams);

                if (!result.success) {
                    if (result.error?.includes("cancelled") || result.error?.includes("rejected")) {
                        setError("Transaction cancelled. Wallet signature required to store card on-chain.");
                        return;
                    }
                    // On-chain is configured but failed — show error, do NOT silently fall back
                    setError(`On-chain storage failed: ${result.error}. Please try again.`);
                    return;
                }

                txHash = result.txHash;
                console.log("Card stored on-chain! TX:", txHash);
            } else if (!isOnChainConfigured()) {
                // On-chain not configured — store locally with a warning in the console
                console.warn(
                    "On-chain storage not configured (NEXT_PUBLIC_SOROBAN_CONTRACT_ADDRESS / NEXT_PUBLIC_SOROBAN_RPC_URL not set). " +
                    "Card metadata will be stored in localStorage only."
                );
            }

            // Step 7: Create token metadata
            setLoadingStep("Saving card metadata...");
            const newCard: StoredCard = {
                id: tokenHash.substring(0, 16),
                last4: last4Digits,
                network: network,
                status: "active",
                expiresAt: formData.expiry,
                tokenHash: tokenHash,
                signedAt: new Date().toISOString(),
                encryptedSize: encryptedPayload.length,
                txHash: txHash,
            };

            // Save to state and localStorage (serves as local cache for on-chain data)
            const storageKey = isSimulationMode ? "sim_user" : publicKey;
            const updatedCards = [...cards, newCard];
            setCards(updatedCards);
            localStorage.setItem(`tychee_cards_${storageKey}`, JSON.stringify(updatedCards));

            // Log success
            console.log("Card tokenized:", {
                tokenId: newCard.id,
                maskedPan: CardTokenizer.maskCardNumber(cleanedCardNumber),
                network: network,
                encryptedSize: encryptedPayload.length,
                onChain: !!txHash,
                txHash: txHash,
            });

            // Reset form and close modal
            setFormData({ cardNumber: "", expiry: "", cvv: "", cardholderName: "" });
            setShowAddCard(false);
            setLoadingStep("");

        } catch (err: any) {
            console.error("Tokenization error:", err);
            setError(err.message || "Failed to tokenize card");
        } finally {
            setIsLoading(false);
            setLoadingStep("");
        }
    };

    const handleRevokeCard = async (cardId: string) => {
        if (!publicKey && !isSimulationMode) return;
        if (!confirm("Are you sure you want to revoke this card? This action cannot be undone.")) return;

        const card = cards.find(c => c.id === cardId);

        // If the card was stored on-chain, revoke it on-chain first
        if (isSimulationMode) {
            setIsLoading(true);
            setLoadingStep("Simulation: Revoking card...");
            await new Promise((r) => setTimeout(r, 1000));
        } else if (card?.txHash && card?.tokenHash && kit && isOnChainConfigured() && publicKey) {
            setIsLoading(true);
            setLoadingStep("Revoking card on-chain...");

            try {
                const result = await revokeCardOnChain(kit, publicKey, card.tokenHash);
                if (!result.success) {
                    if (result.error?.includes("cancelled") || result.error?.includes("rejected")) {
                        setError("Revocation cancelled. Wallet signature required.");
                        setIsLoading(false);
                        setLoadingStep("");
                        return;
                    }
                    setError(`On-chain revocation failed: ${result.error}`);
                    setIsLoading(false);
                    setLoadingStep("");
                    return;
                }
                console.log("Card revoked on-chain! TX:", result.txHash);
            } catch (err: any) {
                console.error("On-chain revocation error:", err);
                setError(`Revocation error: ${err.message}`);
                setIsLoading(false);
                setLoadingStep("");
                return;
            }
        }

        // Remove from local state and cache
        const storageKey = isSimulationMode ? "sim_user" : publicKey;
        const updatedCards = cards.filter(c => c.id !== cardId);
        setCards(updatedCards);
        localStorage.setItem(`tychee_cards_${storageKey}`, JSON.stringify(updatedCards));

        setIsLoading(false);
        setLoadingStep("");
    };

    const getNetworkColor = (network: string) => {
        switch (network) {
            case "visa": return "from-blue-600 to-blue-800";
            case "mastercard": return "from-orange-500 to-red-600";
            case "rupay": return "from-green-500 to-teal-600";
            case "amex": return "from-gray-600 to-gray-800";
            default: return "from-orange-600 to-orange-800";
        }
    };

    // Get current card network for display while typing
    const currentNetwork = formData.cardNumber.length > 0
        ? CardTokenizer.detectCardNetwork(formData.cardNumber.replace(/\s/g, ""))
        : null;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-bold gradient-text">Cards Hub</h1>
                    <p className="text-muted-foreground mt-2">
                        Securely tokenize your cards on Stellar blockchain with CoFT compliance
                    </p>
                    {cards.length > 0 && (
                        <div className="mt-2 inline-flex items-center gap-1 px-3 py-1 bg-primary/20 rounded-full text-xs font-medium text-primary">
                            <CreditCardIcon className="w-3 h-3" />
                            {cards.length} card{cards.length !== 1 ? "s" : ""} tokenized
                        </div>
                    )}
                </div>
                <button
                    onClick={() => setShowAddCard(true)}
                    disabled={!isConnected && !isSimulationMode}
                    className="px-6 py-3 bg-gradient-to-r from-primary to-accent rounded-full text-white font-medium hover:shadow-glow transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Plus className="w-5 h-5" />
                    Add Card
                </button>
            </div>

            {/* Wallet Connection Warning */}
            {!isConnected && !isSimulationMode && (
                <div className="glass-card border-yellow-500/30 bg-yellow-500/10">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                            <AlertCircle className="w-6 h-6 text-yellow-500" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg text-yellow-400">Wallet Not Connected</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Please connect your Stellar wallet to tokenize and manage your cards.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* On-chain config warning */}
            {isConnected && !isOnChainConfigured() && !isSimulationMode && (
                <div className="glass-card border-yellow-500/30 bg-yellow-500/10">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                            <AlertCircle className="w-6 h-6 text-yellow-500" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg text-yellow-400">On-Chain Storage Not Configured</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Set <code className="bg-muted px-1 rounded">NEXT_PUBLIC_SOROBAN_CONTRACT_ADDRESS</code> and <code className="bg-muted px-1 rounded">NEXT_PUBLIC_SOROBAN_RPC_URL</code> in your environment to enable on-chain card storage. Cards will be stored in browser storage only.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Security Banner - SDK Info */}
            <div className="glass-card border-accent/30">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                        <Shield className="w-6 h-6 text-accent" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg">CoFT Compliant • @tychee/sdk Powered</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            Card tokenization uses the Tychee SDK with AES-256-GCM encryption, Luhn validation, and wallet-derived keys. Only you can decrypt your card data.
                        </p>
                    </div>
                </div>
            </div>

            {/* Error banner */}
            {error && (
                <div className="glass-card border-red-500/30 bg-red-500/10">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                            <AlertCircle className="w-6 h-6 text-red-500" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-lg text-red-400">Error</h3>
                            <p className="text-sm text-red-300 mt-1">{error}</p>
                        </div>
                        <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 text-lg font-bold">✕</button>
                    </div>
                </div>
            )}

            {/* Cards List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cards.map((card) => (
                    <div
                        key={card.id}
                        className={`relative group rounded-2xl p-6 bg-gradient-to-br ${getNetworkColor(card.network)} shadow-xl min-h-[200px] flex flex-col justify-between`}
                    >
                        {/* Card Network Logo */}
                        <div className="absolute top-6 right-6">
                            <div className="text-white/80 text-sm font-semibold uppercase">
                                {card.network}
                            </div>
                        </div>

                        {/* Encrypted indicator */}
                        <div className="absolute top-6 left-6">
                            <div className="flex items-center gap-1 text-white/60 text-xs">
                                <Lock className="w-3 h-3" />
                                {card.encryptedSize ? `${card.encryptedSize}B` : "Encrypted"}
                            </div>
                            {card.txHash && (
                                <div className="flex items-center gap-1 text-green-300/80 text-xs mt-1" title={`TX: ${card.txHash}`}>
                                    <ExternalLink className="w-3 h-3" />
                                    On-chain
                                </div>
                            )}
                            {!card.txHash && (
                                <div className="flex items-center gap-1 text-yellow-300/80 text-xs mt-1">
                                    Local only
                                </div>
                            )}
                        </div>

                        {/* Card Number */}
                        <div className="mt-10">
                            <div className="text-white/60 text-xs mb-2">TOKENIZED CARD</div>
                            <div className="text-white text-xl font-mono tracking-wider">
                                •••• •••• •••• {card.last4}
                            </div>
                        </div>

                        {/* Card Details */}
                        <div className="mt-6 flex items-center justify-between">
                            <div>
                                <div className="text-white/60 text-xs mb-1">EXPIRES</div>
                                <div className="text-white font-mono">{card.expiresAt}</div>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-xs font-medium ${card.status === 'active' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                                }`}>
                                {card.status}
                            </div>
                        </div>

                        {/* Revoke Button */}
                        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => handleRevokeCard(card.id)}
                                className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-red-500/40 transition-colors"
                                title="Revoke Card"
                                disabled={isLoading}
                            >
                                <Trash2 className="w-4 h-4 text-white" />
                            </button>
                        </div>
                    </div>
                ))}

                {/* Add New Card Placeholder */}
                <button
                    onClick={() => setShowAddCard(true)}
                    disabled={!isConnected && !isSimulationMode}
                    className="premium-card min-h-[200px] flex flex-col items-center justify-center text-muted-foreground hover:text-foreground border-dashed disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Plus className="w-12 h-12 mb-4" />
                    <div className="font-semibold">Add New Card</div>
                    {!isConnected && !isSimulationMode && <div className="text-xs mt-2">Connect wallet first</div>}
                </button>
            </div>

            {/* Add Card Modal */}
            {showAddCard && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass-card max-w-md w-full">
                        <h2 className="text-2xl font-bold mb-6">Tokenize New Card</h2>

                        {error && (
                            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleTokenizeCard} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Card Number</label>
                                <input
                                    type="text"
                                    value={formData.cardNumber}
                                    onChange={(e) => handleInputChange("cardNumber", e.target.value)}
                                    placeholder="1234 5678 9012 3456"
                                    className="w-full px-4 py-3 bg-muted border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                                    maxLength={19}
                                    required
                                />
                                {currentNetwork && (
                                    <div className="mt-1 text-xs text-muted-foreground flex items-center gap-2">
                                        <span>Network: <strong className="text-foreground uppercase">{currentNetwork}</strong></span>
                                        {formData.cardNumber.replace(/\s/g, "").length >= 13 && (
                                            CardTokenizer.validateCardNumber(formData.cardNumber.replace(/\s/g, ""))
                                                ? <span className="text-green-400">✓ Valid</span>
                                                : <span className="text-red-400">✗ Invalid</span>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Expiry</label>
                                    <input
                                        type="text"
                                        value={formData.expiry}
                                        onChange={(e) => handleInputChange("expiry", e.target.value)}
                                        placeholder="MM/YY"
                                        className="w-full px-4 py-3 bg-muted border border-border rounded-lg focus:ring-2 focus:ring-primary"
                                        maxLength={5}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">CVV</label>
                                    <input
                                        type="password"
                                        value={formData.cvv}
                                        onChange={(e) => handleInputChange("cvv", e.target.value)}
                                        placeholder="•••"
                                        className="w-full px-4 py-3 bg-muted border border-border rounded-lg focus:ring-2 focus:ring-primary"
                                        maxLength={4}
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Cardholder Name</label>
                                <input
                                    type="text"
                                    value={formData.cardholderName}
                                    onChange={(e) => handleInputChange("cardholderName", e.target.value.toUpperCase())}
                                    placeholder="JOHN DOE"
                                    className="w-full px-4 py-3 bg-muted border border-border rounded-lg focus:ring-2 focus:ring-primary"
                                    required
                                />
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAddCard(false);
                                        setError(null);
                                        setFormData({ cardNumber: "", expiry: "", cvv: "", cardholderName: "" });
                                    }}
                                    className="flex-1 px-4 py-3 bg-muted rounded-lg font-medium hover:bg-muted/80 transition-colors"
                                    disabled={isLoading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="flex-1 px-4 py-3 bg-gradient-to-r from-primary to-accent rounded-lg text-white font-medium hover:shadow-glow transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            {loadingStep || "Tokenizing..."}
                                        </>
                                    ) : (
                                        <>
                                            <KeyRound className="w-4 h-4" />
                                            Tokenize Card
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>

                        <div className="mt-4 p-3 bg-muted/50 rounded-lg border border-border">
                            <p className="text-xs text-muted-foreground text-center">
                                <strong className="text-foreground">@tychee/sdk Tokenization:</strong> Your card is validated (Luhn),
                                encrypted (AES-256-GCM) with your wallet-derived key, and stored on Stellar blockchain.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
