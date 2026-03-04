"use client";

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";

interface Toast {
    id: string;
    message: string;
    type: "success" | "error" | "info";
}

interface ToastContextType {
    addToast: (message: string, type?: Toast["type"]) => void;
}

const ToastContext = createContext<ToastContextType>({
    addToast: () => { },
});

export function useToast() {
    return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((message: string, type: Toast["type"] = "success") => {
        const id = Date.now().toString();
        setToasts((prev) => [...prev, { id, message, type }]);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    // Auto-dismiss after 3 seconds
    useEffect(() => {
        if (toasts.length === 0) return;
        const timer = setTimeout(() => {
            setToasts((prev) => prev.slice(1));
        }, 3000);
        return () => clearTimeout(timer);
    }, [toasts]);

    const icons = {
        success: <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />,
        error: <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />,
        info: <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />,
    };

    const borders = {
        success: "border-green-500/30 bg-green-500/10",
        error: "border-red-500/30 bg-red-500/10",
        info: "border-blue-500/30 bg-blue-500/10",
    };

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            {/* Toast Container */}
            <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 max-w-sm">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg border backdrop-blur-lg shadow-xl animate-slide-up ${borders[toast.type]}`}
                    >
                        {icons[toast.type]}
                        <span className="text-sm font-medium flex-1">{toast.message}</span>
                        <button
                            onClick={() => removeToast(toast.id)}
                            className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

// Keep the bare Toaster for backward compatibility with layout.tsx import
export function Toaster() {
    return null;
}
