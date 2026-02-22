'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, ChevronDown } from 'lucide-react';
import { SUPPORTED_LANGUAGES, LanguageCode } from '@/i18n/config';
import '@/i18n/config';

export default function LanguageSwitcher() {
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
                className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors px-2 py-1.5 rounded-md hover:bg-white/10 border border-transparent hover:border-gray-700"
                aria-label="Selecionar idioma"
            >
                <Globe className="w-4 h-4 text-k9-orange" />
                <span className="text-xs font-bold uppercase tracking-wide hidden sm:block">
                    {currentLang.flag} {currentLang.code}
                </span>
                <span className="text-xs font-bold uppercase tracking-wide sm:hidden">
                    {currentLang.flag}
                </span>
                <ChevronDown
                    className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl z-50 overflow-hidden min-w-[160px]">
                    {SUPPORTED_LANGUAGES.map(lang => (
                        <button
                            key={lang.code}
                            onClick={() => handleSelect(lang.code)}
                            className={`w-full text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wide transition-all flex items-center gap-2
                ${i18n.language === lang.code
                                    ? 'bg-k9-orange text-white'
                                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                                }`}
                        >
                            <span className="text-base">{lang.flag}</span>
                            <span>{lang.label.replace(/^\S+\s/, '')}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
