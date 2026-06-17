"use client";

import { useState, useEffect, useCallback } from "react";
import {
    X,
    CreditCard,
    KeyRound,
    Loader2,
    AlertCircle,
    CheckCircle2,
    Lock,
    Zap,
    Copy,
    Check,
} from "lucide-react";
import { CardTokenizer, type CardData } from "@/lib/tychee-client";

/* ─────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────── */

interface CardFormData {
    cardNumber: string;
    expiry: string;
    cvv: string;
    cardholderName: string;
}

interface TokenResult {
    tokenId: string;
    maskedPan: string;
    network: string;
    last4: string;
    expiry: string;
    demoTxHash: string;
    encryptedSize: number;
}

interface TryNowModalProps {
    onClose: () => void;
}

/* ─────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────── */

/** Generate a pseudo-random 32-byte demo encryption key (no wallet needed) */
async function getDemoKey(): Promise<Uint8Array> {
    const seed = new TextEncoder().encode("tychee:demo:v1:no-wallet-required");
    const buf = await crypto.subtle.digest("SHA-256", seed);
    return new Uint8Array(buf);
}

/** Simulate a short on-chain write with a fake tx hash */
async function simulateOnChainStore(tokenHash: string): Promise<string> {
    // Artificial latency to mimic a real blockchain round-trip
    await new Promise((r) => setTimeout(r, 1_400));
    // Deterministic but visually plausible dummy hash
    const raw = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(`demo:${tokenHash}:${Date.now()}`)
    );
    const hex = Array.from(new Uint8Array(raw))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    return `0x${hex}`;
}

function formatCardNumber(value: string): string {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const parts: string[] = [];
    for (let i = 0; i < v.length; i += 4) parts.push(v.substring(i, i + 4));
    return parts.length ? parts.join(" ") : value;
}

function formatExpiry(value: string): string {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    return v.length >= 2 ? v.substring(0, 2) + "/" + v.substring(2, 4) : v;
}

const NETWORK_GRADIENT: Record<string, string> = {
    visa: "from-blue-600 to-blue-800",
    mastercard: "from-orange-500 to-red-600",
    rupay: "from-green-500 to-teal-600",
    amex: "from-gray-600 to-gray-800",
    unknown: "from-primary to-accent",
};

const STEPS = [
    "Validating card details…",
    "Detecting card network…",
    "Encrypting with AES-256-GCM…",
    "Submitting token on-chain…",
    "Token confirmed ✓",
];

/* ─────────────────────────────────────────────────────────
   Component
───────────────────────────────────────────────────────── */

export function TryNowModal({ onClose }: TryNowModalProps) {
    const [form, setForm] = useState<CardFormData>({
        cardNumber: "",
        expiry: "",
        cvv: "",
        cardholderName: "",
    });
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [result, setResult] = useState<TokenResult | null>(null);
    const [copied, setCopied] = useState(false);

    /* Close on Escape */
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === "Escape" && !isLoading) onClose();
        },
        [isLoading, onClose]
    );
    useEffect(() => {
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [handleKeyDown]);

    /* Field helpers */
    const handleChange = (field: keyof CardFormData, raw: string) => {
        let v = raw;
        if (field === "cardNumber") v = formatCardNumber(raw);
        else if (field === "expiry") v = formatExpiry(raw);
        else if (field === "cvv") v = raw.replace(/[^0-9]/g, "").substring(0, 4);
        else if (field === "cardholderName") v = raw.toUpperCase();
        setForm((p) => ({ ...p, [field]: v }));
    };

    /* Live network detection */
    const cleaned = form.cardNumber.replace(/\s/g, "");
    const liveNetwork = cleaned.length > 0 ? CardTokenizer.detectCardNetwork(cleaned) : null;
    const isLuhnValid = cleaned.length >= 13 ? CardTokenizer.validateCardNumber(cleaned) : null;

    /* ── Main tokenization handler ── */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const pan = form.cardNumber.replace(/\s/g, "");

        // ── Web2 validation (real logic, unchanged) ──
        if (!CardTokenizer.validateCardNumber(pan)) {
            setError("Invalid card number — failed Luhn check.");
            return;
        }
        const [month, year] = form.expiry.split("/");
        if (!month || !year || +month < 1 || +month > 12) {
            setError("Invalid expiry date.");
            return;
        }
        // Check card is not expired
        const expYear = 2000 + parseInt(year, 10);
        const expMonth = parseInt(month, 10);
        const now = new Date();
        if (expYear < now.getFullYear() || (expYear === now.getFullYear() && expMonth < now.getMonth() + 1)) {
            setError("This card has expired.");
            return;
        }
        if (form.cvv.length < 3) {
            setError("CVV must be at least 3 digits.");
            return;
        }
        if (form.cardholderName.trim().length < 2) {
            setError("Please enter the cardholder name.");
            return;
        }

        setIsLoading(true);

        try {
            // Step 1
            setCurrentStep(0);
            await new Promise((r) => setTimeout(r, 600));

            // Step 2 — Detect network
            setCurrentStep(1);
            const network = CardTokenizer.detectCardNetwork(pan) as CardData["network"];
            await new Promise((r) => setTimeout(r, 400));

            // Step 3 — AES-256-GCM encryption (real, just no wallet key)
            setCurrentStep(2);
            const demoKey = await getDemoKey();
            const cardData: CardData = {
                pan,
                cvv: form.cvv,
                expiryMonth: month,
                expiryYear: year,
                cardholderName: form.cardholderName,
                network,
            };
            const { encryptedPayload, tokenHash, last4Digits } =
                await CardTokenizer.encryptCard(cardData, demoKey);
            await new Promise((r) => setTimeout(r, 200));

            // Step 4 — Simulated on-chain write (dummy tx hash, no wallet)
            setCurrentStep(3);
            const demoTxHash = await simulateOnChainStore(tokenHash);

            // Step 5 — Done
            setCurrentStep(4);
            await new Promise((r) => setTimeout(r, 400));

            setResult({
                tokenId: tokenHash.substring(0, 16),
                maskedPan: CardTokenizer.maskCardNumber(pan),
                network,
                last4: last4Digits,
                expiry: form.expiry,
                demoTxHash,
                encryptedSize: encryptedPayload.length,
            });
        } catch (err: any) {
            setError(err.message || "Tokenization failed.");
        } finally {
            setIsLoading(false);
        }
    };

    const copyToken = async () => {
        if (!result) return;
        await navigator.clipboard.writeText(result.tokenId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const reset = () => {
        setResult(null);
        setForm({ cardNumber: "", expiry: "", cvv: "", cardholderName: "" });
        setError(null);
        setCurrentStep(0);
    };

    /* ── Render ── */
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => {
                if (e.target === e.currentTarget && !isLoading) onClose();
            }}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 backdrop-blur-sm animate-fade-in" style={{ background: "rgba(10, 6, 4, 0.45)" }} />

            {/* Panel */}
            <div className="relative w-full max-w-md animate-scale-in">
                {/* Glow ring */}
                <div
                    className="absolute -inset-px rounded-3xl pointer-events-none"
                    style={{
                        background:
                            "linear-gradient(135deg, hsl(14 89% 56% / 0.5), transparent 60%)",
                    }}
                />

                <div className="relative glass rounded-3xl overflow-hidden shadow-2xl">
                    {/* ── Header ── */}
                    <div className="relative px-6 pt-6 pb-4 border-b border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0 shadow-glow">
                                <Zap className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-foreground">
                                    Live Card Demo
                                </h2>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Try real tokenization — no wallet required
                                </p>
                            </div>
                        </div>

                        {!isLoading && (
                            <button
                                onClick={onClose}
                                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground"
                                aria-label="Close"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* ── Body ── */}
                    <div className="px-6 py-5">
                        {/* Success state */}
                        {result ? (
                            <SuccessView
                                result={result}
                                copied={copied}
                                onCopy={copyToken}
                                onReset={reset}
                                onClose={onClose}
                            />
                        ) : (
                            <>
                                {/* Error */}
                                {error && (
                                    <div className="mb-4 flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-sm text-red-400">
                                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                        <span>{error}</span>
                                    </div>
                                )}

                                {/* Loading steps */}
                                {isLoading && (
                                    <StepsProgress steps={STEPS} current={currentStep} />
                                )}

                                {/* Form */}
                                {!isLoading && (
                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        {/* Card number */}
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5 text-foreground/80">
                                                Card Number
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={form.cardNumber}
                                                    onChange={(e) =>
                                                        handleChange("cardNumber", e.target.value)
                                                    }
                                                    placeholder="1234 5678 9012 3456"
                                                    className="w-full px-4 py-3 pr-28 bg-white/5 border border-white/10 rounded-xl text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                                                    maxLength={19}
                                                    required
                                                    autoComplete="cc-number"
                                                />
                                                {liveNetwork && (
                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                                                        <span className="text-xs font-semibold uppercase text-muted-foreground">
                                                            {liveNetwork}
                                                        </span>
                                                        {isLuhnValid === true && (
                                                            <span className="text-xs text-green-400 font-semibold">✓</span>
                                                        )}
                                                        {isLuhnValid === false && (
                                                            <span className="text-xs text-red-400 font-semibold">✗</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Expiry + CVV */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-sm font-medium mb-1.5 text-foreground/80">
                                                    Expiry
                                                </label>
                                                <input
                                                    type="text"
                                                    value={form.expiry}
                                                    onChange={(e) =>
                                                        handleChange("expiry", e.target.value)
                                                    }
                                                    placeholder="MM/YY"
                                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                                                    maxLength={5}
                                                    required
                                                    autoComplete="cc-exp"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-1.5 text-foreground/80">
                                                    CVV
                                                </label>
                                                <input
                                                    type="password"
                                                    value={form.cvv}
                                                    onChange={(e) =>
                                                        handleChange("cvv", e.target.value)
                                                    }
                                                    placeholder="•••"
                                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                                                    maxLength={4}
                                                    required
                                                    autoComplete="cc-csc"
                                                />
                                            </div>
                                        </div>

                                        {/* Cardholder name */}
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5 text-foreground/80">
                                                Cardholder Name
                                            </label>
                                            <input
                                                type="text"
                                                value={form.cardholderName}
                                                onChange={(e) =>
                                                    handleChange("cardholderName", e.target.value)
                                                }
                                                placeholder="JOHN DOE"
                                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                                                required
                                                autoComplete="cc-name"
                                            />
                                        </div>

                                        {/* Submit */}
                                        <button
                                            type="submit"
                                            className="w-full mt-2 px-5 py-3.5 bg-gradient-to-r from-primary to-accent rounded-xl text-white font-semibold flex items-center justify-center gap-2 hover:shadow-glow transition-all active:scale-[0.98]"
                                        >
                                            <KeyRound className="w-4 h-4" />
                                            Tokenize Card
                                        </button>

                                        {/* Footer note */}
                                        <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
                                            Card data is encrypted in-browser with AES-256-GCM and never sent
                                            to any server. Blockchain TX is simulated.
                                        </p>
                                    </form>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────────────────── */

function StepsProgress({ steps, current }: { steps: string[]; current: number }) {
    return (
        <div className="py-4 space-y-3">
            {steps.map((label, i) => {
                const done = i < current;
                const active = i === current;
                return (
                    <div key={label} className="flex items-center gap-3">
                        <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${done
                                    ? "bg-green-500/20 border border-green-500/40"
                                    : active
                                        ? "bg-primary/20 border border-primary/60"
                                        : "bg-white/5 border border-white/10"
                                }`}
                        >
                            {done ? (
                                <Check className="w-3 h-3 text-green-400" />
                            ) : active ? (
                                <Loader2 className="w-3 h-3 text-primary animate-spin" />
                            ) : (
                                <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
                            )}
                        </div>
                        <span
                            className={`text-sm transition-colors ${done
                                    ? "text-green-400/80"
                                    : active
                                        ? "text-foreground font-medium"
                                        : "text-muted-foreground/50"
                                }`}
                        >
                            {label}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

function SuccessView({
    result,
    copied,
    onCopy,
    onReset,
    onClose,
}: {
    result: TokenResult;
    copied: boolean;
    onCopy: () => void;
    onReset: () => void;
    onClose: () => void;
}) {
    const gradient =
        NETWORK_GRADIENT[result.network] ?? NETWORK_GRADIENT.unknown;

    return (
        <div className="space-y-5 animate-fade-up">
            {/* Success badge */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/30">
                <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                <span className="text-sm text-green-400 font-medium">
                    Card successfully tokenized!
                </span>
            </div>

            {/* Mini card visual */}
            <div
                className={`relative rounded-2xl p-5 bg-gradient-to-br ${gradient} shadow-xl overflow-hidden`}
            >
                {/* Subtle pattern */}
                <div
                    className="absolute inset-0 opacity-10"
                    style={{
                        backgroundImage:
                            "radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)",
                        backgroundSize: "30px 30px",
                    }}
                />
                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-1.5 text-white/60 text-xs">
                            <Lock className="w-3 h-3" />
                            <span>{result.encryptedSize}B encrypted</span>
                        </div>
                        <span className="text-white/80 text-xs font-bold uppercase">
                            {result.network}
                        </span>
                    </div>
                    <div className="text-white/50 text-[10px] mb-1">TOKENIZED CARD</div>
                    <div className="text-white font-mono text-lg tracking-widest">
                        •••• •••• •••• {result.last4}
                    </div>
                    <div className="mt-4 flex items-center justify-between text-white/60 text-xs">
                        <div>
                            <div className="text-[9px] uppercase tracking-wider mb-0.5">Expires</div>
                            <div className="font-mono">{result.expiry}</div>
                        </div>
                        <CreditCard className="w-5 h-5 opacity-60" />
                    </div>
                </div>
            </div>

            {/* Token ID row */}
            <div className="space-y-2">
                <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/5 border border-white/10">
                    <div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                            Token ID
                        </div>
                        <div className="text-xs font-mono text-foreground mt-0.5">
                            {result.tokenId}
                        </div>
                    </div>
                    <button
                        onClick={onCopy}
                        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
                        title="Copy token ID"
                    >
                        {copied ? (
                            <Check className="w-3.5 h-3.5 text-green-400" />
                        ) : (
                            <Copy className="w-3.5 h-3.5" />
                        )}
                    </button>
                </div>

                {/* Dummy TX hash */}
                <div className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        Simulated TX Hash
                    </div>
                    <div
                        className="text-[10px] font-mono text-muted-foreground mt-0.5 break-all"
                        title={result.demoTxHash}
                    >
                        {result.demoTxHash.substring(0, 42)}…
                    </div>
                </div>
            </div>

            {/* Disclaimer */}
            <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
                This is a <strong className="text-foreground">demo</strong>. The token is not
                stored anywhere. Connect your wallet to tokenize &amp; store cards on-chain.
            </p>

            {/* Actions */}
            <div className="flex gap-3">
                <button
                    onClick={onReset}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-medium hover:bg-white/10 transition-colors"
                >
                    Try another
                </button>
                <button
                    onClick={onClose}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-sm font-semibold hover:shadow-glow transition-all"
                >
                    Connect Wallet →
                </button>
            </div>
        </div>
    );
}
