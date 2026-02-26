'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Trophy, Users, FileText, Menu, X } from 'lucide-react';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';

export default function Navbar() {
    const { t } = useTranslation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <nav className="bg-black border-b border-gray-800 sticky top-0 z-50 shadow-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center gap-8">
                        <Link href="/" className="flex items-center gap-2 group">
                            <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
                                <Image
                                    src="/logo.png"
                                    alt="Logo Torneio K9"
                                    width={40}
                                    height={40}
                                    className="object-contain"
                                    priority
                                />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-white font-black uppercase tracking-tighter text-base sm:text-lg leading-none group-hover:text-k9-orange transition-colors truncate max-w-[120px] sm:max-w-none">Torneio K9</span>
                                <span className="text-[0.6rem] text-gray-400 uppercase tracking-widest leading-none font-bold truncate max-w-[120px] sm:max-w-none">{t('nav.tacticalSystem')}</span>
                            </div>
                        </Link>

                        <div className="hidden md:block">
                            <div className="flex items-baseline space-x-4">
                                <Link
                                    href="/"
                                    className="text-gray-300 hover:text-white hover:bg-white/10 px-3 py-2 rounded-md text-sm font-bold uppercase tracking-wider flex items-center gap-2 transition-all"
                                >
                                    <Trophy className="w-4 h-4 text-k9-orange" />
                                    {t('nav.ranking')}
                                </Link>

                                <Link
                                    href="/competitors"
                                    className="text-gray-300 hover:text-white hover:bg-white/10 px-3 py-2 rounded-md text-sm font-bold uppercase tracking-wider flex items-center gap-2 transition-all"
                                >
                                    <Users className="w-4 h-4 text-k9-orange" />
                                    {t('nav.competitors')}
                                </Link>

                                <Link
                                    href="/tests"
                                    className="text-gray-300 hover:text-white hover:bg-white/10 px-3 py-2 rounded-md text-sm font-bold uppercase tracking-wider flex items-center gap-2 transition-all"
                                >
                                    <FileText className="w-4 h-4 text-k9-orange" />
                                    {t('nav.tests')}
                                </Link>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center">
                            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse mr-2 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                            <span className="text-xs font-mono text-gray-400 uppercase font-bold hidden sm:block">{t('nav.systemOnline')}</span>
                        </div>
                        
                        {/* Mobile Menu Button */}
                        <button 
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="md:hidden text-gray-400 hover:text-white p-2 transition-colors"
                        >
                            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu Content */}
            {isMenuOpen && (
                <div className="md:hidden bg-gray-950 border-t border-gray-800 animate-in slide-in-from-top-2 duration-200">
                    <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                        <Link
                            href="/"
                            onClick={() => setIsMenuOpen(false)}
                            className="text-gray-300 hover:text-white hover:bg-white/10 block px-3 py-4 rounded-md text-base font-black uppercase tracking-wider flex items-center gap-3 border-b border-white/5"
                        >
                            <Trophy className="w-5 h-5 text-k9-orange" />
                            {t('nav.ranking')}
                        </Link>

                        <Link
                            href="/competitors"
                            onClick={() => setIsMenuOpen(false)}
                            className="text-gray-300 hover:text-white hover:bg-white/10 block px-3 py-4 rounded-md text-base font-black uppercase tracking-wider flex items-center gap-3 border-b border-white/5"
                        >
                            <Users className="w-5 h-5 text-k9-orange" />
                            {t('nav.competitors')}
                        </Link>

                        <Link
                            href="/tests"
                            onClick={() => setIsMenuOpen(false)}
                            className="text-gray-300 hover:text-white hover:bg-white/10 block px-3 py-4 rounded-md text-base font-black uppercase tracking-wider flex items-center gap-3"
                        >
                            <FileText className="w-5 h-5 text-k9-orange" />
                            {t('nav.tests')}
                        </Link>
                    </div>
                </div>
            )}
        </nav>
    );
}

