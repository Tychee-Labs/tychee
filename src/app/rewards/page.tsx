"use client";

import { useState, useEffect } from "react";
import { Gift, Star, Zap, Trophy, ArrowRight, AlertCircle, Loader2, CheckCircle } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { useWallet } from "@/context/WalletContext";

interface Reward {
    id: string;
    title: string;
    description: string;
    points: number;
    icon: typeof Gift;
    type: "voucher" | "boost" | "experience";
}

interface RedeemedReward {
    id: string;
    rewardId: string;
    title: string;
    redeemedAt: string;
    points: number;
}

export default function RewardsPage() {
    const { publicKey, isConnected } = useWallet();
    const [userPoints, setUserPoints] = useState(0);
    const [redeemedRewards, setRedeemedRewards] = useState<RedeemedReward[]>([]);
    const [isRedeeming, setIsRedeeming] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const tiers = [
        { name: "Bronze", min: 0, color: "from-orange-600 to-orange-400" },
        { name: "Silver", min: 5000, color: "from-gray-400 to-gray-200" },
        { name: "Gold", min: 10000, color: "from-yellow-500 to-yellow-300" },
        { name: "Platinum", min: 25000, color: "from-slate-600 to-slate-400" },
    ];

    const rewards: Reward[] = [
        { id: "1", title: "₹500 Off on Dining", description: "Valid at partner restaurants", points: 500, icon: Gift, type: "voucher" },
        { id: "2", title: "2x Points Weekend", description: "Earn double on all transactions", points: 200, icon: Zap, type: "boost" },
        { id: "3", title: "Free Movie Ticket", description: "Any cinema, any movie", points: 800, icon: Star, type: "voucher" },
        { id: "4", title: "Exclusive Lounge Access", description: "Airport lounge one-time pass", points: 1500, icon: Trophy, type: "experience" },
    ];

    // Load user data from localStorage
    useEffect(() => {
        if (publicKey) {
            const savedPoints = localStorage.getItem(`tychee_points_${publicKey}`);
            const savedRedeemed = localStorage.getItem(`tychee_redeemed_${publicKey}`);

            // Initialize with bonus points for new users
            if (!savedPoints) {
                const initialPoints = 1000; // Welcome bonus
                setUserPoints(initialPoints);
                localStorage.setItem(`tychee_points_${publicKey}`, String(initialPoints));
            } else {
                setUserPoints(parseInt(savedPoints));
            }

            if (savedRedeemed) {
                setRedeemedRewards(JSON.parse(savedRedeemed));
            }
        }
    }, [publicKey]);

    const getCurrentTier = () => {
        for (let i = tiers.length - 1; i >= 0; i--) {
            if (userPoints >= tiers[i].min) return tiers[i];
        }
        return tiers[0];
    };

    const getNextTier = () => {
        const current = getCurrentTier();
        const currentIndex = tiers.findIndex(t => t.name === current.name);
        return currentIndex < tiers.length - 1 ? tiers[currentIndex + 1] : null;
    };

    const handleRedeem = async (reward: Reward) => {
        if (!publicKey || userPoints < reward.points) return;

        setIsRedeeming(reward.id);

        // Simulate processing
        await new Promise(resolve => setTimeout(resolve, 1500));

        const newPoints = userPoints - reward.points;
        setUserPoints(newPoints);
        localStorage.setItem(`tychee_points_${publicKey}`, String(newPoints));

        const newRedeemed: RedeemedReward = {
            id: Date.now().toString(),
            rewardId: reward.id,
            title: reward.title,
            redeemedAt: new Date().toISOString(),
            points: reward.points,
        };

        const updatedRedeemed = [...redeemedRewards, newRedeemed];
        setRedeemedRewards(updatedRedeemed);
        localStorage.setItem(`tychee_redeemed_${publicKey}`, JSON.stringify(updatedRedeemed));

        setSuccessMessage(`Successfully redeemed "${reward.title}"!`);
        setTimeout(() => setSuccessMessage(null), 3000);
        setIsRedeeming(null);
    };

    const currentTier = getCurrentTier();
    const nextTier = getNextTier();
    const pointsToNextTier = nextTier ? nextTier.min - userPoints : 0;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-4xl font-bold gradient-text">Rewards</h1>
                <p className="text-muted-foreground mt-2">
                    Earn points, climb tiers, and unlock exclusive benefits
                </p>
            </div>

            {/* Wallet Warning */}
            {!isConnected && (
                <div className="glass-card border-yellow-500/30 bg-yellow-500/10">
                    <div className="flex items-start gap-4">
                        <AlertCircle className="w-6 h-6 text-yellow-500 flex-shrink-0" />
                        <div>
                            <h3 className="font-semibold text-yellow-400">Connect Wallet</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Connect your Stellar wallet to view and redeem rewards.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Message */}
            {successMessage && (
                <div className="glass-card border-green-500/30 bg-green-500/10">
                    <div className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        <span className="text-green-400 font-medium">{successMessage}</span>
                    </div>
                </div>
            )}

            {/* Points Balance Card */}
            <div className="relative overflow-hidden rounded-3xl p-8 bg-gradient-to-br from-orange-600 via-orange-500 to-amber-500">
                <div className="relative z-10">
                    <div className="text-white/80 text-sm font-medium mb-2">Your Balance</div>
                    <div className="text-white text-6xl font-bold mb-4">{formatNumber(userPoints)}</div>
                    <div className="flex items-center gap-2">
                        <div className={`px-4 py-2 rounded-full bg-gradient-to-r ${currentTier.color} text-white font-bold text-sm`}>
                            {currentTier.name.toUpperCase()} TIER
                        </div>
                        {nextTier && (
                            <div className="text-white/80 text-sm">
                                {formatNumber(pointsToNextTier)} points to {nextTier.name}
                            </div>
                        )}
                    </div>
                </div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl" />
            </div>

            {/* Tier Progress */}
            <div className="glass-card">
                <h3 className="text-xl font-bold mb-6">Tier Progress</h3>
                <div className="space-y-6">
                    {tiers.map((tier, idx) => {
                        const isUnlocked = userPoints >= tier.min;
                        const isCurrent = tier.name === currentTier.name;
                        return (
                            <div key={tier.name} className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${isUnlocked
                                    ? `bg-gradient-to-br ${tier.color} text-white`
                                    : 'bg-muted text-muted-foreground'
                                    }`}>
                                    {isUnlocked ? '✓' : idx + 1}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-semibold">{tier.name}</span>
                                        <span className="text-sm text-muted-foreground">{formatNumber(tier.min)} pts</span>
                                    </div>
                                    {isCurrent && (
                                        <div className="text-xs text-accent flex items-center gap-1">
                                            <Star className="w-3 h-3 fill-current" />
                                            Current Tier
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Rewards Catalog */}
            <div className="space-y-6">
                <h2 className="text-2xl font-bold">Redeem Rewards</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {rewards.map((reward) => {
                        const Icon = reward.icon;
                        const canRedeem = isConnected && userPoints >= reward.points;
                        const isLoading = isRedeeming === reward.id;

                        return (
                            <div key={reward.id} className="premium-card">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                                        <Icon className="w-7 h-7 text-white" />
                                    </div>
                                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${canRedeem ? 'bg-green-500/20 text-green-400' : 'bg-muted text-muted-foreground'
                                        }`}>
                                        {reward.points} pts
                                    </div>
                                </div>

                                <h3 className="text-lg font-bold mb-1">{reward.title}</h3>
                                <p className="text-sm text-muted-foreground mb-4">{reward.description}</p>

                                <button
                                    onClick={() => handleRedeem(reward)}
                                    disabled={!canRedeem || isLoading}
                                    className={`w-full px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${canRedeem && !isLoading
                                        ? 'bg-gradient-to-r from-primary to-accent text-white hover:shadow-glow'
                                        : 'bg-muted text-muted-foreground cursor-not-allowed'
                                        }`}
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Redeeming...
                                        </>
                                    ) : (
                                        <>
                                            Redeem
                                            <ArrowRight className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Recent Redemptions */}
            {redeemedRewards.length > 0 && (
                <div className="glass-card">
                    <h3 className="text-xl font-bold mb-4">Recent Redemptions</h3>
                    <div className="space-y-3">
                        {redeemedRewards.slice(-5).reverse().map((redeemed) => (
                            <div key={redeemed.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                <div>
                                    <div className="font-medium">{redeemed.title}</div>
                                    <div className="text-xs text-muted-foreground">
                                        {new Date(redeemed.redeemedAt).toLocaleDateString()}
                                    </div>
                                </div>
                                <div className="text-sm text-red-400">-{redeemed.points} pts</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Earn More Section */}
            <div className="glass-card border-accent/30">
                <div className="flex items-start gap-4">
                    <Zap className="w-12 h-12 text-accent flex-shrink-0" />
                    <div>
                        <h3 className="font-bold text-lg mb-2">Earn Points by Tokenizing Cards!</h3>
                        <p className="text-sm text-muted-foreground">
                            Add your cards to Tychee and earn 100 bonus points per card. Use them for transactions to earn even more!
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
