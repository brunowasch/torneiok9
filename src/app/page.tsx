import Link from 'next/link';
import { Shield, ClipboardList } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-tactical-black text-gray-200 p-4">
      <div className="max-w-md w-full p-8 bg-tactical-gray rounded-xl shadow-2xl border border-gray-800 text-center relative overflow-hidden">
        {/* Decorative Top Border */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-police-gold to-transparent"></div>
        
        <div className="mb-6">
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter" style={{ textShadow: '0 0 10px rgba(0,0,0,0.8)' }}>
                5º Torneio
            </h1>
            <h2 className="text-2xl font-bold text-police-gold uppercase tracking-widest mt-1">
                Internacional K9
            </h2>
            <p className="text-xs text-gray-400 mt-2 uppercase tracking-[0.2em]">Cães de Polícia de Sapiranga</p>
        </div>
        
        <div className="space-y-4">
          <Link 
            href="/admin"
            className="block w-full py-4 px-6 bg-black/40 border border-gray-700 rounded-lg hover:border-police-gold hover:shadow-[0_0_15px_rgba(212,175,55,0.3)] transition-all group relative overflow-hidden"
          >
            <div className="absolute left-0 top-0 w-1 h-full bg-gray-700 group-hover:bg-police-gold transition-colors"></div>
            <div className="flex items-center gap-4">
                <Shield className="w-8 h-8 text-police-gold group-hover:text-white transition-colors" />
                <div className="text-left">
                    <div className="font-bold text-police-gold group-hover:text-white uppercase tracking-wider text-lg">Painel Admin</div>
                    <div className="text-xs text-gray-500 group-hover:text-gray-400">Gerenciamento Tático</div>
                </div>
            </div>
          </Link>

          <Link 
            href="/judge"
            className="block w-full py-4 px-6 bg-black/40 border border-gray-700 rounded-lg hover:border-police-gold hover:shadow-[0_0_15px_rgba(212,175,55,0.3)] transition-all group relative overflow-hidden"
          >
             <div className="absolute left-0 top-0 w-1 h-full bg-gray-700 group-hover:bg-police-gold transition-colors"></div>
             <div className="flex items-center gap-4">
                <ClipboardList className="w-8 h-8 text-police-gold group-hover:text-white transition-colors" />
                <div className="text-left">
                    <div className="font-bold text-police-gold group-hover:text-white uppercase tracking-wider text-lg">Área do Juiz</div>
                    <div className="text-xs text-gray-500 group-hover:text-gray-400">Avaliação de Campo</div>
                </div>
            </div>
          </Link>
        </div>

        <div className="mt-8 pt-4 border-t border-gray-800 text-center">
            <p className="text-[10px] text-gray-600 uppercase">
                Sistema Operacional Tático v1.0
            </p>
        </div>
      </div>
    </div>
  );
}
