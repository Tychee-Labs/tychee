"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, TrendingUp, Gift, Store, Ticket, Users, Wallet, LogOut, Menu, X, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWallet } from "@/context/WalletContext";

const navigation = [
    { name: "Cards", href: "/cards", icon: CreditCard },
    { name: "Spends", href: "/spends", icon: TrendingUp },
    { name: "Rewards", href: "/rewards", icon: Gift },
    { name: "Store", href: "/store", icon: Store },
    { name: "Vouchers", href: "/vouchers", icon: Ticket },
    { name: "Partners", href: "/partners", icon: Users },
];

export function Navigation() {
    const pathname = usePathname();
    const { publicKey, isConnected, isConnecting, connect, disconnect, isSimulationMode, toggleSimulationMode } = useWallet();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const truncateAddress = (address: string) => {
        return `${address.slice(0, 4)}...${address.slice(-4)}`;
    };

    return (<>
        <nav className="sticky top-0 z-40 w-full border-b border-border/40 glass backdrop-blur-lg">
            <div className="container mx-auto px-4">
                <div className="flex h-16 items-center justify-between">
                    <Link href="/" className="flex items-center gap-3 group">
                        <div className="relative">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src="/tychee_logo_without_text.png"
                                alt="Tychee"
                                className="h-8 w-auto relative z-10"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = "none";
                                }}
                            />
                        </div>
                        <span className="text-lg font-semibold text-foreground tracking-tight">
                            Tychee
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center space-x-1">
                        {navigation.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={cn(
                                        "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                                        isActive
                                            ? "bg-primary text-primary-foreground"
                                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                    )}
                                >
                                    <Icon className="w-4 h-4" />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </div>

                    {/* Right side: Simulation Mode + wallet + mobile menu button */}
                    <div className="flex items-center gap-2">
                        {/* Simulation Mode button */}
                        <button
                            onClick={toggleSimulationMode}
                            className={cn(
                                "px-4 py-2 rounded-full text-sm font-semibold border transition-all flex items-center gap-1.5",
                                isSimulationMode 
                                    ? "bg-green-500/10 border-green-500/50 text-green-400 hover:bg-green-500/20" 
                                    : "border-primary/60 text-primary hover:bg-primary/10 hover:border-primary"
                            )}
                        >
                            <Zap className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">
                                {isSimulationMode ? "Exit Simulation" : "Simulation Mode"}
                            </span>
                        </button>

                        {isSimulationMode ? (
                            <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-green-500/10 rounded-full border border-green-500/20">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                                <span className="text-sm font-medium text-green-400">Simulation Active</span>
                            </div>
                        ) : isConnected ? (
                            <div className="flex items-center gap-2">
                                <span className="hidden sm:inline px-3 py-1.5 bg-muted rounded-full text-sm font-mono">
                                    {truncateAddress(publicKey!)}
                                </span>
                                <button
                                    onClick={disconnect}
                                    className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                                    title="Disconnect Wallet"
                                >
                                    <LogOut className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={connect}
                                disabled={isConnecting}
                                className="px-4 py-2 bg-gradient-to-r from-primary to-accent rounded-full text-white font-medium hover:shadow-glow transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                <Wallet className="w-4 h-4" />
                                <span className="hidden sm:inline">{isConnecting ? "Connecting..." : "Connect Wallet"}</span>
                                <span className="sm:hidden">{isConnecting ? "..." : "Connect"}</span>
                            </button>
                        )}

                        {/* Mobile hamburger */}
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="md:hidden p-2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu Slide-in */}
                {mobileMenuOpen && (
                    <div className="md:hidden border-t border-border/40 py-3 space-y-1 animate-fade-up">
                        {navigation.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all",
                                        isActive
                                            ? "bg-primary text-primary-foreground"
                                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                    )}
                                >
                                    <Icon className="w-4 h-4" />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </nav>
    </>);
}
