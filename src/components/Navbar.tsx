import Link from 'next/link';
import { Trophy, Users, FileText, Shield } from 'lucide-react';
import Image from 'next/image';

export default function Navbar() {
    return (
        <nav className="bg-black border-b border-gray-800 sticky top-0 z-50 shadow-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center gap-8">
                        <Link href="/" className="flex items-center gap-2 group">
                            <div className="relative w-10 h-10 flex items-center justify-center">
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
                                <span className="text-white font-black uppercase tracking-tighter text-lg leading-none group-hover:text-k9-orange transition-colors">Torneio K9</span>
                                <span className="text-[0.6rem] text-gray-400 uppercase tracking-widest leading-none font-bold">Sistema Tático</span>
                            </div>
                        </Link>

                        <div className="hidden md:block">
                            <div className="flex items-baseline space-x-4">
                                <Link
                                    href="/"
                                    className="text-gray-300 hover:text-white hover:bg-white/10 px-3 py-2 rounded-md text-sm font-bold uppercase tracking-wider flex items-center gap-2 transition-all"
                                >
                                    <Trophy className="w-4 h-4 text-k9-orange" />
                                    Ranking
                                </Link>

                                <Link
                                    href="/competitors"
                                    className="text-gray-300 hover:text-white hover:bg-white/10 px-3 py-2 rounded-md text-sm font-bold uppercase tracking-wider flex items-center gap-2 transition-all"
                                >
                                    <Users className="w-4 h-4 text-k9-orange" />
                                    Competidores
                                </Link>

                                <Link
                                    href="/tests"
                                    className="text-gray-300 hover:text-white hover:bg-white/10 px-3 py-2 rounded-md text-sm font-bold uppercase tracking-wider flex items-center gap-2 transition-all"
                                >
                                    <FileText className="w-4 h-4 text-k9-orange" />
                                    Provas
                                </Link>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center">
                            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse mr-2 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                            <span className="text-xs font-mono text-gray-400 uppercase font-bold">System Online</span>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
}
