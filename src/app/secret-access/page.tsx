'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginAdmin } from '@/services/userService';
import { Shield, Lock, Fingerprint, Info } from 'lucide-react';

export default function SecretLoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const user = await loginAdmin(email, password);
            // Check role redirection
            const { getUserRole } = await import('@/services/userService');
            const role = await getUserRole(user.uid);

            if (role === 'judge') {
                router.push('/judge');
            } else {
                router.push('/admin');
            }
        } catch (e: any) {
            setError(e.message);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-tactical-black flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-tactical-gray border border-gray-800 p-8 rounded-xl shadow-2xl relative overflow-hidden">
                {/* Decorative */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-police-gold/10 to-transparent pointer-events-none"></div>

                <div className="text-center mb-8">
                    <Shield className="w-12 h-12 text-police-gold mx-auto mb-4" />
                    <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Acesso Restrito</h1>
                    <p className="text-gray-500 font-mono text-xs uppercase tracking-widest mt-1">Comando Central K9</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-900/10 border border-red-900/30 text-red-400 text-xs font-bold rounded flex items-center gap-2">
                        <Info className="w-4 h-4" />
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Identificação</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Fingerprint className="h-4 w-4 text-gray-600" />
                            </div>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-black/50 border border-gray-700 text-white pl-10 p-3 rounded focus:outline-none focus:border-police-gold transition-colors text-sm"
                                placeholder="usuario@comando.k9"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Chave de Segurança</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-4 w-4 text-gray-600" />
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-black/50 border border-gray-700 text-white pl-10 p-3 rounded focus:outline-none focus:border-police-gold transition-colors text-sm"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-white hover:bg-gray-200 text-black uppercase py-4 rounded tracking-widest transition-all mt-6 cursor-pointer"
                    >
                        {loading ? 'Autenticando...' : 'Acessar'}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-[10px] text-gray-700 font-mono">
                        ESTE SISTEMA É MONITORADO. <br /> QUALQUER TENTATIVA DE ACESSO NÃO AUTORIZADO SERÁ REGISTRADA.
                    </p>
                </div>
            </div>
        </div>
    );
}
