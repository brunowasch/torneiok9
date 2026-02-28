'use client';

import { AlertCircle, X } from 'lucide-react';

interface Props {
    errors: Record<string, string>;
    onClose: (key: string) => void;
}

export default function DateToast({ errors, onClose }: Props) {
    const entries = Object.entries(errors).filter(([, msg]) => !!msg);
    if (entries.length === 0) return null;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[99999] flex gap-3 flex-wrap justify-center max-w-[95vw]">
            {entries.map(([key, msg]) => (
                <div
                    key={key}
                    role="alert"
                    className="
                        flex items-start gap-3
                        bg-red-50 border border-red-300 text-red-700
                        rounded-xl px-5 py-3 shadow-xl
                        max-w-xs w-[90vw] sm:w-auto
                        animate-[slideUp_0.2s_ease-out]
                    "
                >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                    <span className="text-sm font-semibold leading-snug flex-1">{msg}</span>
                    <button
                        onClick={() => onClose(key)}
                        className="shrink-0 text-red-400 hover:text-red-600 transition-colors ml-1 mt-0.5"
                        aria-label="Fechar"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ))}
        </div>
    );
}
