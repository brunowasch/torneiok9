import Link from 'next/link';
import { Trophy, Users, FileText, Shield } from 'lucide-react';

export default function Navbar() {
    return (
        <nav className="bg-tactical-gray border-b border-gray-800 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center gap-8">
                        <Link href="/" className="flex items-center gap-2 group">
                            <Shield className="h-8 w-8 text-police-gold group-hover:text-white transition-colors" />
                            <div className="flex flex-col">
                                <span className="text-white font-black uppercase tracking-tighter text-lg leading-none">Torneio K9</span>
                                <span className="text-[0.6rem] text-police-gold uppercase tracking-widest leading-none">Public Access</span>
                            </div>
                        </Link>

                        <div className="hidden md:block">
                            <div className="flex items-baseline space-x-4">
                                <Link
                                    href="/"
                                    className="text-gray-300 hover:text-white hover:bg-white/5 px-3 py-2 rounded-md text-sm font-bold uppercase tracking-wider flex items-center gap-2 transition-all"
                                >
                                    <Trophy className="w-4 h-4" />
                                    Ranking
                                </Link>

                                <Link
                                    href="/competitors"
                                    className="text-gray-300 hover:text-white hover:bg-white/5 px-3 py-2 rounded-md text-sm font-bold uppercase tracking-wider flex items-center gap-2 transition-all"
                                >
                                    <Users className="w-4 h-4" />
                                    Competidores
                                </Link>

                                <Link
                                    href="/tests"
                                    className="text-gray-300 hover:text-white hover:bg-white/5 px-3 py-2 rounded-md text-sm font-bold uppercase tracking-wider flex items-center gap-2 transition-all"
                                >
                                    <FileText className="w-4 h-4" />
                                    Provas
                                </Link>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center">
                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse mr-2"></div>
                        <span className="text-xs font-mono text-green-500 uppercase">System Online</span>
                    </div>
                </div>
            </div>
        </nav>
    );
}
