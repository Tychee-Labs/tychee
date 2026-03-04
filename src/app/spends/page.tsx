"use client";

import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Calendar, Filter, Download, AlertCircle, RefreshCw } from "lucide-react";
import { formatCurrency, formatDate, getRelativeTime } from "@/lib/utils";
import { useWallet } from "@/context/WalletContext";

interface Transaction {
    id: string;
    merchant: string;
    category: string;
    amount: number;
    date: string;
    status: string;
    cardLast4?: string;
}

interface CategorySpend {
    category: string;
    amount: number;
    count: number;
}

export default function SpendsPage() {
    const { publicKey, isConnected } = useWallet();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [categoryFilter, setCategoryFilter] = useState<string>("all");
    const [isLoading, setIsLoading] = useState(false);

    // Load transactions from localStorage
    useEffect(() => {
        if (publicKey) {
            const savedTransactions = localStorage.getItem(`tychee_transactions_${publicKey}`);
            if (savedTransactions) {
                setTransactions(JSON.parse(savedTransactions));
            } else {
                // Initialize with demo transactions for new users
                const demoTransactions: Transaction[] = [
                    { id: "1", merchant: "Starbucks", category: "dining", amount: 450, date: new Date().toISOString(), status: "completed", cardLast4: "4242" },
                    { id: "2", merchant: "Uber", category: "travel", amount: 280, date: new Date(Date.now() - 86400000).toISOString(), status: "completed", cardLast4: "4242" },
                    { id: "3", merchant: "Amazon", category: "shopping", amount: 1250, date: new Date(Date.now() - 172800000).toISOString(), status: "completed", cardLast4: "4242" },
                    { id: "4", merchant: "Swiggy", category: "dining", amount: 680, date: new Date(Date.now() - 259200000).toISOString(), status: "completed", cardLast4: "4242" },
                    { id: "5", merchant: "Netflix", category: "entertainment", amount: 649, date: new Date(Date.now() - 345600000).toISOString(), status: "completed", cardLast4: "4242" },
                ];
                setTransactions(demoTransactions);
                localStorage.setItem(`tychee_transactions_${publicKey}`, JSON.stringify(demoTransactions));
            }
        }
    }, [publicKey]);

    // Calculate stats
    const filteredTransactions = categoryFilter === "all"
        ? transactions
        : transactions.filter(tx => tx.category === categoryFilter);

    const totalSpent = filteredTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    const avgTransaction = filteredTransactions.length > 0 ? totalSpent / filteredTransactions.length : 0;

    // Calculate category breakdown
    const categoryBreakdown: CategorySpend[] = transactions.reduce((acc, tx) => {
        const existing = acc.find(c => c.category === tx.category);
        if (existing) {
            existing.amount += tx.amount;
            existing.count += 1;
        } else {
            acc.push({ category: tx.category, amount: tx.amount, count: 1 });
        }
        return acc;
    }, [] as CategorySpend[]);

    const sortedCategories = categoryBreakdown.sort((a, b) => b.amount - a.amount);
    const topCategory = sortedCategories[0]?.category || "None";
    const totalForPercentage = categoryBreakdown.reduce((sum, c) => sum + c.amount, 0);

    const handleExport = () => {
        if (transactions.length === 0) return;

        const csv = [
            ["Date", "Merchant", "Category", "Amount", "Status"].join(","),
            ...transactions.map(tx => [
                new Date(tx.date).toLocaleDateString(),
                tx.merchant,
                tx.category,
                tx.amount,
                tx.status
            ].join(","))
        ].join("\n");

        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `tychee-transactions-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleRefresh = async () => {
        if (!publicKey) return;
        setIsLoading(true);
        await new Promise(resolve => setTimeout(resolve, 500));
        const savedTransactions = localStorage.getItem(`tychee_transactions_${publicKey}`);
        if (savedTransactions) {
            setTransactions(JSON.parse(savedTransactions));
        }
        setIsLoading(false);
    };

    const categories = ["all", ...Array.from(new Set(transactions.map(tx => tx.category)))];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-bold gradient-text">Spends Hub</h1>
                    <p className="text-muted-foreground mt-2">
                        Track your spending patterns and get insights
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleRefresh}
                        disabled={isLoading}
                        className="px-4 py-3 glass rounded-full font-medium hover:bg-white/10 transition-all flex items-center gap-2"
                    >
                        <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={handleExport}
                        disabled={transactions.length === 0}
                        className="px-6 py-3 glass rounded-full font-medium hover:bg-white/10 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        <Download className="w-5 h-5" />
                        Export
                    </button>
                </div>
            </div>

            {/* Wallet Warning */}
            {!isConnected && (
                <div className="glass-card border-yellow-500/30 bg-yellow-500/10">
                    <div className="flex items-start gap-4">
                        <AlertCircle className="w-6 h-6 text-yellow-500 flex-shrink-0" />
                        <div>
                            <h3 className="font-semibold text-yellow-400">Connect Wallet</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Connect your Stellar wallet to view your spending data.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="premium-card">
                    <div className="text-sm text-muted-foreground mb-2">Total Spent (This Month)</div>
                    <div className="text-3xl font-bold text-gradient-primary">{formatCurrency(totalSpent)}</div>
                    <div className="mt-2 text-sm text-green-400 flex items-center gap-1">
                        <TrendingDown className="w-4 h-4" />
                        Track your expenses
                    </div>
                </div>

                <div className="premium-card">
                    <div className="text-sm text-muted-foreground mb-2">Transactions</div>
                    <div className="text-3xl font-bold">{filteredTransactions.length}</div>
                    <div className="mt-2 text-sm text-muted-foreground">
                        Avg: {formatCurrency(avgTransaction)}
                    </div>
                </div>

                <div className="premium-card">
                    <div className="text-sm text-muted-foreground mb-2">Top Category</div>
                    <div className="text-3xl font-bold text-gradient-gold capitalize">{topCategory}</div>
                    <div className="mt-2 text-sm text-muted-foreground">
                        {sortedCategories[0] && totalForPercentage > 0
                            ? `${Math.round((sortedCategories[0].amount / totalForPercentage) * 100)}% of total spend`
                            : "No data yet"
                        }
                    </div>
                </div>
            </div>

            {/* Category Breakdown */}
            <div className="glass-card">
                <h3 className="text-xl font-bold mb-6">Spending by Category</h3>
                {sortedCategories.length > 0 ? (
                    <div className="space-y-4">
                        {sortedCategories.map((category) => {
                            const percentage = totalForPercentage > 0
                                ? Math.round((category.amount / totalForPercentage) * 100)
                                : 0;
                            return (
                                <div key={category.category}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="capitalize font-medium">{category.category}</span>
                                        <span className="text-sm text-muted-foreground">
                                            {formatCurrency(category.amount)} ({percentage}%) · {category.count} tx
                                        </span>
                                    </div>
                                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-muted-foreground text-center py-8">No spending data yet</p>
                )}
            </div>

            {/* Transaction List */}
            <div className="glass-card">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold">Recent Transactions</h3>
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="px-4 py-2 bg-muted border border-border rounded-lg text-sm font-medium"
                    >
                        {categories.map(cat => (
                            <option key={cat} value={cat} className="capitalize">
                                {cat === "all" ? "All Categories" : cat}
                            </option>
                        ))}
                    </select>
                </div>

                {filteredTransactions.length > 0 ? (
                    <div className="space-y-3">
                        {filteredTransactions.map((tx) => (
                            <div key={tx.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold">
                                        {tx.merchant[0]}
                                    </div>
                                    <div>
                                        <div className="font-semibold">{tx.merchant}</div>
                                        <div className="text-sm text-muted-foreground capitalize">
                                            {tx.category} {tx.cardLast4 && `• ••${tx.cardLast4}`}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold">{formatCurrency(tx.amount)}</div>
                                    <div className="text-sm text-muted-foreground">{getRelativeTime(tx.date)}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-muted-foreground text-center py-8">No transactions found</p>
                )}
            </div>
        </div>
    );
}
