'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import { SUPPORTED_LANGUAGES, LanguageCode } from '@/i18n/config';
import '@/i18n/config';

export default function LanguageSwitcher({ direction = 'down' }: { direction?: 'up' | 'down' }) {
    const { i18n } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const currentLang = SUPPORTED_LANGUAGES.find(l => l.code === i18n.language)
        || SUPPORTED_LANGUAGES[0];

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    const handleSelect = (code: LanguageCode) => {
        i18n.changeLanguage(code);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/80 hover:bg-black/90 backdrop-blur-xl border border-white/10 hover:border-[#FB923C]/50 transition-all active:scale-95 group shadow-xl cursor-pointer"
            >
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-black uppercase tracking-tight text-white/90 group-hover:text-white transition-colors">
                            {(currentLang.code.split('-')[1] || 'BR').toUpperCase()}
                        </span>
                        <div className="w-px h-3 bg-white/10"></div>
                        <span className="text-[11px] font-bold uppercase tracking-tight text-gray-500 group-hover:text-gray-400 transition-colors">
                            {currentLang.code.split('-')[0].toUpperCase()}
                        </span>
                    </div>
                </div>
                <ChevronDown className={`w-3 h-3 text-gray-500 transition-all group-hover:text-gray-300 ${isOpen ? 'rotate-180 text-[#FB923C]' : ''}`} />
            </button>

            {/* Dropdown: Estilo Dark Glass para combinar com o Header */}
            {isOpen && (
                <div className={`absolute right-0 ${direction === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'} bg-[#0a0c10]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-[0_10px_50px_rgba(0,0,0,0.5)] z-[100] overflow-hidden min-w-[200px] animate-in fade-in ${direction === 'up' ? 'slide-in-from-bottom-1' : 'slide-in-from-top-1'} duration-200`}>
                    <div className="p-1 space-y-0.5">
                        {SUPPORTED_LANGUAGES.map(lang => (
                            <button
                                key={lang.code}
                                onClick={() => handleSelect(lang.code)}
                                className={`w-full text-left px-3 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-tight transition-all flex items-center justify-between group cursor-pointer
                                    ${i18n.language === lang.code
                                        ? 'bg-[#FB923C]/20 text-[#FB923C] border border-[#FB923C]/30'
                                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1.5">
                                        <span className={`text-base transition-all ${i18n.language === lang.code ? 'grayscale-0' : 'grayscale'}`}>
                                            {lang.flag}
                                        </span>
                                    </div>
                                    <span className="font-black">{lang.label}</span>
                                </div>
                                {i18n.language === lang.code && (
                                    <div className="w-1.5 h-1.5 bg-[#FB923C] rounded-full shadow-[0_0_8px_rgba(251,146,60,0.6)]"></div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
