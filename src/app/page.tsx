import Link from "next/link";
import { CreditCard, TrendingUp, Gift, Store, Ticket, Users } from "lucide-react";

export default function HomePage() {
    return (
        <div className="space-y-12">
            {/* Hero Section */}
            <section className="text-center space-y-6 py-12">
                <h1 className="text-6xl font-bold">
                    <span className="gradient-text">Tychee</span>
                </h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                    Your Web3 Rewards Platform. Tokenize cards securely on Stellar,
                    earn points, discover local deals, and unlock exclusive vouchers.
                </p>
                <div className="flex gap-4 justify-center mt-8">
                    <Link
                        href="/cards"
                        className="px-8 py-4 bg-gradient-to-r from-primary to-accent rounded-full text-white font-semibold hover:shadow-glow transition-all hover:scale-105"
                    >
                        Get Started
                    </Link>
                    <Link
                        href="/rewards"
                        className="px-8 py-4 glass rounded-full font-semibold hover:bg-white/10 transition-all"
                    >
                        View Rewards
                    </Link>
                </div>
            </section>

            {/* 6 Core Primitives Grid */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Cards Hub */}
                <Link href="/cards">
                    <div className="premium-card group">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent/50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <CreditCard className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="text-2xl font-bold mb-2">Cards Hub</h3>
                        <p className="text-muted-foreground">
                            Securely tokenize your debit/credit cards on-chain with regulatory compliance
                        </p>
                        <div className="mt-4 text-sm text-accent">
                            Manage Cards →
                        </div>
                    </div>
                </Link>

                {/* Spends Hub */}
                <Link href="/spends">
                    <div className="premium-card group">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <TrendingUp className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="text-2xl font-bold mb-2">Spends Hub</h3>
                        <p className="text-muted-foreground">
                            Track spending patterns, view analytics, and get AI-powered insights
                        </p>
                        <div className="mt-4 text-sm text-cyan-400">
                            View Analytics →
                        </div>
                    </div>
                </Link>

                {/* Rewards */}
                <Link href="/rewards">
                    <div className="premium-card group">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Gift className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="text-2xl font-bold mb-2">Rewards</h3>
                        <p className="text-muted-foreground">
                            Earn points on every transaction, climb tiers, unlock bonuses
                        </p>
                        <div className="mt-4 text-sm text-yellow-400">
                            Earn Points →
                        </div>
                    </div>
                </Link>

                {/* Store */}
                <Link href="/store">
                    <div className="premium-card group">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Store className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="text-2xl font-bold mb-2">Store</h3>
                        <p className="text-muted-foreground">
                            Discover local merchants, products, and exclusive deals near you
                        </p>
                        <div className="mt-4 text-sm text-pink-400">
                            Explore Deals →
                        </div>
                    </div>
                </Link>

                {/* Vouchers */}
                <Link href="/vouchers">
                    <div className="premium-card group">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Ticket className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="text-2xl font-bold mb-2">Vouchers</h3>
                        <p className="text-muted-foreground">
                            Blockchain-verified vouchers you can claim, trade, and redeem
                        </p>
                        <div className="mt-4 text-sm text-green-400">
                            Browse Vouchers →
                        </div>
                    </div>
                </Link>

                {/* Partners */}
                <Link href="/partners">
                    <div className="premium-card group">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Users className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="text-2xl font-bold mb-2">Partners</h3>
                        <p className="text-muted-foreground">
                            For merchants: integrate Tychee and reach engaged customers
                        </p>
                        <div className="mt-4 text-sm text-primary">
                            Partner Dashboard →
                        </div>
                    </div>
                </Link>
            </section>

            {/* Stats Section */}
            <section className="glass-card text-center">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div>
                        <div className="text-4xl font-bold text-gradient-primary">₹12.5M</div>
                        <div className="text-muted-foreground mt-2">Total Rewards Distributed</div>
                    </div>
                    <div>
                        <div className="text-4xl font-bold text-gradient-gold">2,847</div>
                        <div className="text-muted-foreground mt-2">Active Merchants</div>
                    </div>
                    <div>
                        <div className="text-4xl font-bold text-gradient-primary">50K+</div>
                        <div className="text-muted-foreground mt-2">Happy Users</div>
                    </div>
                </div>
            </section>
        </div>
    );
}
