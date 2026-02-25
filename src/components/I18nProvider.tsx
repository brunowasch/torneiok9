'use client';

import { ReactNode, useEffect, useState } from 'react';
import '@/i18n/config';
import LanguageSwitcher from './LanguageSwitcher';

export default function I18nProvider({ children }: { children: ReactNode }) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);
    if (!mounted) return null;
    return (
        <>
            {children}
            {/* Global Floating Language Switcher */}
            <div className="fixed bottom-6 right-6 z-[9999] opacity-90 hover:opacity-100 transition-opacity">
                <LanguageSwitcher direction="up" />
            </div>
        </>
    );
}
