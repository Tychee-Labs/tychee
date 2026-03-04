import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { Toaster, ToastProvider } from "@/components/ui/toaster";
import { WalletProvider } from "@/context/WalletContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    metadataBase: new URL("https://tychee.app"),
    title: "Tychee - Web3 Rewards & Card Tokenization",
    description: "Tokenize your cards, earn rewards, discover local deals - powered by Stellar blockchain",
    keywords: ["card tokenization", "web3 rewards", "stellar", "defi", "payments"],
    icons: {
        icon: "/favicon.ico",
    },
    openGraph: {
        title: "Tychee - Web3 Rewards & Card Tokenization",
        description: "Tokenize your cards, earn rewards, discover local deals - powered by Stellar blockchain",
        images: ["/tychee_logo_with_text.png"],
        type: "website",
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className="dark">
            <body className={inter.className}>
                <WalletProvider>
                    <ToastProvider>
                        <div className="min-h-screen bg-background flex flex-col">
                            <Navigation />
                            <main className="container mx-auto px-4 py-8 flex-1">
                                {children}
                            </main>
                            <Footer />
                            <Toaster />
                        </div>
                    </ToastProvider>
                </WalletProvider>
            </body>
        </html>
    );
}
