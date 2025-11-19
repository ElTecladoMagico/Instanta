"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Copy, Check, ExternalLink } from "lucide-react";
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
                    <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse"></div>
                ))}
            </div>
        );
    }

    if (buttons.length === 0) {
        return (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200 border-dashed">
                <p className="text-gray-500">You haven't created any buttons yet.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {buttons.map((button) => (
                <div key={button._id} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h3 className="font-semibold text-gray-900">{button.title}</h3>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                            <span className="font-medium text-gray-700">
                                {button.amount} {button.currency}
                            </span>
                            <span>•</span>
                            <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
                                {button.toAddress.slice(0, 6)}...{button.toAddress.slice(-4)}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                            onClick={() => copyCode(button._id)}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg text-sm font-medium transition-colors border border-gray-200"
                        >
                            {copiedId === button._id ? (
                                <>
                                    <Check className="w-4 h-4 text-green-600" />
                                    Copied
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

