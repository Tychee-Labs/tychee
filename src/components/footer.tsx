"use client";

import Link from "next/link";
import { CreditCard, TrendingUp, Gift, Store, Ticket, Users } from "lucide-react";

const footerNavigation = [
    { name: "Cards", href: "/cards", icon: CreditCard },
    { name: "Spends", href: "/spends", icon: TrendingUp },
    { name: "Rewards", href: "/rewards", icon: Gift },
    { name: "Store", href: "/store", icon: Store },
    { name: "Vouchers", href: "/vouchers", icon: Ticket },
    { name: "Partners", href: "/partners", icon: Users },
];

export function Footer() {
    return (
        <footer className="border-t border-border/40 mt-16">
            <div className="container mx-auto px-4 py-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Brand */}
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src="/tychee_logo_without_text.png"
                                alt="Tychee"
                                className="h-8 w-auto"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = "none";
                                }}
                            />
                            <span className="text-lg font-semibold">Tychee</span>
                        </div>
                        <p className="text-sm text-muted-foreground max-w-xs">
                            Your Web3 Rewards Platform. Tokenize cards securely on Stellar, earn points, and unlock exclusive vouchers.
                        </p>
                    </div>

                    {/* Navigation */}
                    <div>
                        <h4 className="font-semibold mb-4">Platform</h4>
                        <ul className="space-y-2">
                            {footerNavigation.map((item) => (
                                <li key={item.name}>
                                    <Link
                                        href={item.href}
                                        className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
                                    >
                                        <item.icon className="w-3.5 h-3.5" />
                                        {item.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Built on Stellar */}
                    <div>
                        <h4 className="font-semibold mb-4">Technology</h4>
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted rounded-lg text-sm text-muted-foreground mb-4">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12.04 1.92L3.85 6.57c-.43.25-.7.7-.7 1.2v9.35c0 .5.27.96.7 1.2l8.19 4.65a1.38 1.38 0 001.38 0l8.19-4.65c.43-.24.7-.7.7-1.2V7.77c0-.5-.27-.96-.7-1.2l-8.19-4.65a1.38 1.38 0 00-1.38 0z" />
                            </svg>
                            Built on Stellar
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Powered by Soroban smart contracts on the Stellar testnet for secure, transparent card tokenization.
                        </p>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="mt-8 pt-6 border-t border-border/40 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-muted-foreground">
                        © {new Date().getFullYear()} Tychee Labs. All rights reserved.
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>v0.1.2</span>
                        <span>•</span>
                        <span>Testnet</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
