"use client";

import { useState } from "react";
import Link from "next/link";
import { Ticket, Copy, Check, AlertCircle } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Voucher {
    id: string;
    code: string;
    title: string;
    description: string;
    discount: number;
    discountType: "percent" | "fixed";
    minPurchase: number;
    validUntil: string;
    merchant: string;
    used: boolean;
}

export default function VouchersPage() {
    const [copiedCode, setCopiedCode] = useState<string | null>(null);

    const vouchers: Voucher[] = [
        {
            id: "1",
            code: "TYCHEE50",
            title: "₹50 Off on First Order",
            description: "Special discount for new users",
            discount: 50,
            discountType: "fixed",
            minPurchase: 200,
            validUntil: "2026-09-30",
            merchant: "Zomato",
            used: false,
        },
        {
            id: "2",
            code: "WEEKEND20",
            title: "20% Off Weekend Special",
            description: "Valid on Saturdays and Sundays",
            discount: 20,
            discountType: "percent",
            minPurchase: 500,
            validUntil: "2026-06-30",
            merchant: "Swiggy",
            used: false,
        },
        {
            id: "3",
            code: "MOVIE100",
            title: "₹100 Off Movie Tickets",
            description: "Book 2 or more tickets",
            discount: 100,
            discountType: "fixed",
            minPurchase: 400,
            validUntil: "2026-12-31",
            merchant: "BookMyShow",
            used: true,
        },
    ];

    const handleCopy = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-4xl font-bold gradient-text">Vouchers</h1>
                <p className="text-muted-foreground mt-2">
                    Blockchain-verified vouchers you can claim, trade, and redeem
                </p>
            </div>

            {/* Info Banner */}
            <div className="glass-card border-accent/30">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                        <AlertCircle className="w-6 h-6 text-accent" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg">On-Chain Vouchers</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            All vouchers are tokenized on Stellar blockchain. They're transferable, verifiable, and cannot be duplicated.
                        </p>
                    </div>
                </div>
            </div>

            {/* Vouchers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {vouchers.map((voucher) => {
                    const isExpiringSoon = new Date(voucher.validUntil) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

                    return (
                        <div key={voucher.id} className={`voucher-ticket ${voucher.used ? 'opacity-60' : ''}`}>
                            {/* Header */}
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                    <h3 className="font-bold text-xl mb-1">{voucher.title}</h3>
                                    <p className="text-sm text-muted-foreground">{voucher.description}</p>
                                </div>
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
                                    <Ticket className="w-6 h-6 text-white" />
                                </div>
                            </div>

                            {/* Merchant */}
                            <div className="text-sm text-muted-foreground mb-4">
                                By {voucher.merchant}
                            </div>

                            {/* Discount Value */}
                            <div className="mb-6">
                                <div className="text-4xl font-bold text-gradient-primary">
                                    {voucher.discountType === "percent"
                                        ? `${voucher.discount}% OFF`
                                        : formatCurrency(voucher.discount)
                                    }
                                </div>
                                <div className="text-sm text-muted-foreground mt-1">
                                    Min. purchase: {formatCurrency(voucher.minPurchase)}
                                </div>
                            </div>

                            {/* Code */}
                            <div className="mb-4">
                                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg border-2 border-dashed border-border">
                                    <code className="flex-1 font-mono font-bold text-lg">{voucher.code}</code>
                                    <button
                                        onClick={() => handleCopy(voucher.code)}
                                        disabled={voucher.used}
                                        className="p-2 hover:bg-background rounded transition-colors"
                                    >
                                        {copiedCode === voucher.code ? (
                                            <Check className="w-5 h-5 text-green-400" />
                                        ) : (
                                            <Copy className="w-5 h-5" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Status & Expiry */}
                            <div className="flex items-center justify-between text-sm">
                                <div className={`px-3 py-1 rounded-full font-medium ${voucher.used
                                    ? 'bg-muted text-muted-foreground'
                                    : isExpiringSoon
                                        ? 'bg-destructive/20 text-destructive'
                                        : 'bg-green-500/20 text-green-400'
                                    }`}>
                                    {voucher.used ? 'Used' : isExpiringSoon ? 'Expiring Soon' : 'Active'}
                                </div>
                                <div className="text-muted-foreground">
                                    Valid until {formatDate(voucher.validUntil)}
                                </div>
                            </div>

                            {!voucher.used && (
                                <button className="w-full mt-4 px-4 py-3 bg-gradient-to-r from-primary to-accent rounded-lg text-white font-medium hover:shadow-glow transition-all">
                                    Redeem Now
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Claim More Section */}
            <div className="text-center glass-card">
                <Ticket className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-bold mb-2">Want More Vouchers?</h3>
                <p className="text-muted-foreground mb-6">
                    Earn points through transactions and redeem them for exclusive vouchers
                </p>
                <Link href="/rewards" className="inline-block px-8 py-3 bg-gradient-to-r from-primary to-accent rounded-full text-white font-medium hover:shadow-glow transition-all">
                    Browse Rewards
                </Link>
            </div>
        </div>
    );
}
