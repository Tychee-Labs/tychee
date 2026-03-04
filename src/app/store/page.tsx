"use client";

import { useState } from "react";
import { MapPin, Search, Star, Heart } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface Product {
    id: string;
    name: string;
    merchant: string;
    price: number;
    originalPrice?: number;
    category: string;
    rating: number;
    distance: string;
    image?: string;
}

export default function StorePage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");

    const categories = ["All", "Dining", "Shopping", "Travel", "Entertainment", "Wellness"];

    const products: Product[] = [
        {
            id: "1",
            name: "Butter Chicken Combo",
            merchant: "Punjab Grill",
            price: 599,
            originalPrice: 799,
            category: "dining",
            rating: 4.5,
            distance: "1.2 km",
        },
        {
            id: "2",
            name: "Spa Package - 90min",
            merchant: "Kaya Wellness",
            price: 2499,
            originalPrice: 3999,
            category: "wellness",
            rating: 4.8,
            distance: "3.5 km",
        },
        {
            id: "3",
            name: "Movie Tickets (2)",
            merchant: "PVR Cinemas",
            price: 600,
            category: "entertainment",
            rating: 4.2,
            distance: "2.1 km",
        },
        {
            id: "4",
            name: "Designer Sunglasses",
            merchant: "Lenskart",
            price: 1899,
            originalPrice: 2999,
            category: "shopping",
            rating: 4.6,
            distance: "0.8 km",
        },
        {
            id: "5",
            name: "Weekend Getaway - Lonavala",
            merchant: "MakeMyTrip",
            price: 4999,
            originalPrice: 7499,
            category: "travel",
            rating: 4.7,
            distance: "5.0 km",
        },
    ];

    const filteredProducts = products.filter((product) => {
        const matchesSearch = searchQuery === "" ||
            product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            product.merchant.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-4xl font-bold gradient-text">Store</h1>
                <p className="text-muted-foreground mt-2">
                    Discover local merchants, products, and exclusive deals near you
                </p>
            </div>

            {/* Search Bar (Nielsen: User Control) */}
            <div className="glass-card">
                <div className="flex items-center gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search for products, merchants, deals..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-muted border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                        />
                    </div>
                    <button className="px-6 py-3 bg-gradient-to-r from-primary to-accent rounded-lg text-white font-medium hover:shadow-glow transition-all flex items-center gap-2">
                        <MapPin className="w-5 h-5" />
                        Near Me
                    </button>
                </div>
            </div>

            {/* Category Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {categories.map((cat) => (
                    <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat.toLowerCase())}
                        className={`px-6 py-2 rounded-full font-medium whitespace-nowrap transition-all ${selectedCategory === cat.toLowerCase()
                            ? 'bg-gradient-to-r from-primary to-accent text-white'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Products Grid (Merchant discovery cards) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.length > 0 ? filteredProducts.map((product) => {
                    const discount = product.originalPrice
                        ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
                        : 0;

                    return (
                        <div key={product.id} className="merchant-card group cursor-pointer">
                            {/* Product Image Placeholder */}
                            <div className="aspect-video bg-gradient-to-br from-primary/20 to-accent/20 relative">
                                <div className="absolute inset-0 flex items-center justify-center text-6xl opacity-20">
                                    {product.name[0]}
                                </div>

                                {/* Discount Badge */}
                                {discount > 0 && (
                                    <div className="absolute top-3 left-3 px-3 py-1 bg-accent rounded-full text-white text-sm font-bold">
                                        {discount}% OFF
                                    </div>
                                )}

                                {/* Wishlist Button */}
                                <button className="absolute top-3 right-3 w-9 h-9 rounded-full glass backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Heart className="w-5 h-5 text-white" />
                                </button>
                            </div>

                            {/* Product Info */}
                            <div className="p-4">
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                        <h3 className="font-bold text-lg mb-1 line-clamp-1">{product.name}</h3>
                                        <p className="text-sm text-muted-foreground">{product.merchant}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 mb-3 text-sm">
                                    <div className="flex items-center gap-1 text-yellow-400">
                                        <Star className="w-4 h-4 fill-current" />
                                        <span className="font-semibold">{product.rating}</span>
                                    </div>
                                    <div className="text-muted-foreground flex items-center gap-1">
                                        <MapPin className="w-4 h-4" />
                                        {product.distance}
                                    </div>
                                </div>

                                <div className="flex items-end justify-between">
                                    <div>
                                        <div className="text-2xl font-bold">{formatCurrency(product.price)}</div>
                                        {product.originalPrice && (
                                            <div className="text-sm text-muted-foreground line-through">
                                                {formatCurrency(product.originalPrice)}
                                            </div>
                                        )}
                                    </div>
                                    <button className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors">
                                        Buy Now
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                }) : (
                    <div className="col-span-full text-center py-16">
                        <Search className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <h3 className="text-xl font-bold mb-2">No products found</h3>
                        <p className="text-muted-foreground">Try adjusting your search or category filters</p>
                    </div>
                )}
            </div>

            {/* Load More */}
            <div className="text-center">
                <button className="px-8 py-3 glass rounded-full font-medium hover:bg-white/10 transition-all">
                    Load More Deals
                </button>
            </div>
        </div>
    );
}
