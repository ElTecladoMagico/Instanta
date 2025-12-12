"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Copy, Check, CreditCard } from "lucide-react";
import { useState } from "react";

interface ButtonListProps {
    userId: Id<"users">;
}

export function ButtonList({ userId }: ButtonListProps) {
    const buttons = useQuery(api.payments.getUserButtons, { userId });
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const copyCode = (buttonId: string) => {
        const code = `<script src="http://localhost:3000/button.js"></script>\n<button data-instanta-button-id="${buttonId}">\n  Pay Now\n</button>`;
        navigator.clipboard.writeText(code);
        setCopiedId(buttonId);
        setTimeout(() => setCopiedId(null), 2000);
    };

    if (buttons === undefined) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-24 md-skeleton rounded-2xl"></div>
                ))}
            </div>
        );
    }

    if (buttons.length === 0) {
        return (
            <div
                className="text-center py-16 bg-[var(--md-surface)] rounded-2xl border-2 border-dashed border-[var(--md-outline-variant)]"
            >
                <div className="w-16 h-16 bg-[var(--md-surface-container-high)] rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <CreditCard className="w-8 h-8 text-[var(--md-outline)]" />
                </div>
                <p className="text-[var(--md-on-surface-variant)] font-medium">No payment buttons yet</p>
                <p className="text-sm text-[var(--md-outline)] mt-1">Create your first button to get started</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {buttons.map((button) => (
                <div
                    key={button._id}
                    className="bg-[var(--md-surface)] p-5 rounded-2xl border border-[var(--md-outline-variant)] hover:border-[var(--md-primary)] transition-all duration-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 group"
                    style={{ boxShadow: 'var(--md-elevation-1)' }}
                >
                    <div>
                        <h3 className="font-semibold text-[var(--md-on-surface)] text-lg">{button.title}</h3>
                        <div className="flex items-center gap-3 mt-2 text-sm text-[var(--md-on-surface-variant)]">
                            <span className="font-semibold text-[var(--md-primary)] bg-[var(--md-primary-container)] px-3 py-1 rounded-full text-xs">
                                {button.amount} {button.currency}
                            </span>
                            <span className="text-[var(--md-outline)]">•</span>
                            <span className="font-mono text-xs bg-[var(--md-surface-container-high)] px-2.5 py-1 rounded-lg">
                                {button.toAddress.slice(0, 6)}...{button.toAddress.slice(-4)}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                            onClick={() => copyCode(button._id)}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-[var(--md-surface-container)] hover:bg-[var(--md-surface-container-high)] text-[var(--md-on-surface)] rounded-full text-sm font-medium transition-all duration-200 border border-[var(--md-outline-variant)]"
                        >
                            {copiedId === button._id ? (
                                <>
                                    <Check className="w-4 h-4 text-[var(--md-success)]" />
                                    Copied!
                                </>
                            ) : (
                                <>
                                    <Copy className="w-4 h-4" />
                                    Copy Code
                                </>
                            )}
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
