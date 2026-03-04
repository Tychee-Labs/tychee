"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Users, TrendingUp, DollarSign, BarChart3, Key, Webhook, Check, Copy } from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/utils";

export default function PartnersPage() {
    const [apiKey] = useState("tych_live_a3f8d9c2e1b4a6f7");
    const [copied, setCopied] = useState(false);
    const [webhookUrl, setWebhookUrl] = useState("");
    const [webhookSaved, setWebhookSaved] = useState(false);

    const handleCopyApiKey = () => {
        navigator.clipboard.writeText(apiKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Load saved webhook URL on mount
    useEffect(() => {
        const saved = localStorage.getItem("tychee_webhook_url");
        if (saved) setWebhookUrl(saved);
    }, []);

    const handleSaveWebhook = () => {
        if (!webhookUrl.trim()) return;
        localStorage.setItem("tychee_webhook_url", webhookUrl);
        setWebhookSaved(true);
        setTimeout(() => setWebhookSaved(false), 2000);
    };

    const stats = [
        { label: "Total Revenue", value: formatCurrency(245000), change: "+12%", icon: DollarSign },
        { label: "Transactions", value: "1,234", change: "+8%", icon: TrendingUp },
        { label: "Unique Customers", value: "892", change: "+15%", icon: Users },
        { label: "Avg. Order Value", value: formatCurrency(1980), change: "+5%", icon: BarChart3 },
    ];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-4xl font-bold gradient-text">Partners Dashboard</h1>
                <p className="text-muted-foreground mt-2">
                    Integrate Tychee and reach engaged customers
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <div key={stat.label} className="premium-card">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                                    <Icon className="w-5 h-5 text-primary" />
                                </div>
                                <div className="text-sm text-green-400 font-medium">{stat.change}</div>
                            </div>
                            <div className="text-2xl font-bold mb-1">{stat.value}</div>
                            <div className="text-sm text-muted-foreground">{stat.label}</div>
                        </div>
                    );
                })}
            </div>

            {/* Revenue Chart Placeholder */}
            <div className="glass-card">
                <h3 className="text-xl font-bold mb-6">Revenue Overview</h3>
                <div className="h-64 flex items-center justify-center bg-muted/50 rounded-lg">
                    <div className="text-center text-muted-foreground">
                        <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p>Chart visualization coming soon</p>
                    </div>
                </div>
            </div>

            {/* Integration Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* API Key */}
                <div className="glass-card">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
                            <Key className="w-6 h-6 text-accent" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">API Key</h3>
                            <p className="text-sm text-muted-foreground">For SDK integration</p>
                        </div>
                    </div>

                    <div className="p-3 bg-muted rounded-lg border-2 border-dashed border-border">
                        <code className="text-sm font-mono break-all">{apiKey}</code>
                    </div>

                    <button
                        onClick={handleCopyApiKey}
                        className="mt-4 w-full px-4 py-2 bg-primary rounded-lg text-white font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                    >
                        {copied ? (
                            <><Check className="w-4 h-4" /> Copied!</>
                        ) : (
                            <><Copy className="w-4 h-4" /> Copy API Key</>
                        )}
                    </button>
                </div>

                {/* Webhook */}
                <div className="glass-card">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                            <Webhook className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">Webhook URL</h3>
                            <p className="text-sm text-muted-foreground">Receive transaction updates</p>
                        </div>
                    </div>

                    <input
                        type="text"
                        placeholder="https://your-domain.com/webhook"
                        value={webhookUrl}
                        onChange={(e) => setWebhookUrl(e.target.value)}
                        className="w-full px-4 py-3 bg-muted border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    />

                    <button
                        onClick={handleSaveWebhook}
                        disabled={!webhookUrl.trim()}
                        className="mt-4 w-full px-4 py-2 bg-gradient-to-r from-primary to-accent rounded-lg text-white font-medium hover:shadow-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {webhookSaved ? (
                            <><Check className="w-4 h-4" /> Saved!</>
                        ) : (
                            "Save Webhook"
                        )}
                    </button>
                </div>
            </div>

            {/* Integration Guide */}
            <div className="glass-card">
                <h3 className="text-xl font-bold mb-6">Quick Start Guide</h3>

                <div className="space-y-6">
                    <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-accent text-white flex items-center justify-center font-bold flex-shrink-0">
                            1
                        </div>
                        <div>
                            <h4 className="font-semibold mb-2">Install SDK</h4>
                            <div className="p-3 bg-muted rounded-lg">
                                <code className="text-sm">npm install @tychee/sdk</code>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-accent text-white flex items-center justify-center font-bold flex-shrink-0">
                            2
                        </div>
                        <div>
                            <h4 className="font-semibold mb-2">Initialize</h4>
                            <div className="p-3 bg-muted rounded-lg">
                                <code className="text-sm">
                                    {`const tychee = new TycheeSDK({
  apiKey: '${apiKey}',
  network: 'testnet'
})`}
                                </code>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-accent text-white flex items-center justify-center font-bold flex-shrink-0">
                            3
                        </div>
                        <div>
                            <h4 className="font-semibold mb-2">Start Accepting Payments</h4>
                            <p className="text-sm text-muted-foreground">
                                You're all set! Check the full documentation for advanced features.
                            </p>
                        </div>
                    </div>
                </div>

                <Link
                    href="https://github.com/Tychee-Labs/tychee-core/tree/main/sdk"
                    target="_blank"
                    className="inline-block mt-6 px-6 py-3 bg-gradient-to-r from-primary to-accent rounded-full text-white font-medium hover:shadow-glow transition-all"
                >
                    View Full Documentation
                </Link>
            </div>
        </div>
    );
}
