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
        } catch (e: unknown) {
            const error = e as { message: string };
            setError(error.message);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-k9-white flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white border-2 border-gray-200 p-8 rounded-xl shadow-2xl relative overflow-hidden">
                {/* Decorative */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-linear-to-bl from-k9-orange/10 to-transparent pointer-events-none"></div>

                <div className="text-center mb-8">
                    <Shield className="w-12 h-12 text-k9-orange mx-auto mb-4" />
                    <h1 className="text-2xl font-black text-k9-black uppercase tracking-tighter">Acesso Restrito</h1>
                    <p className="text-gray-600 font-mono text-xs uppercase tracking-widest mt-1 font-bold">Comando Central K9</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-100 border-2 border-red-300 text-red-700 text-xs font-bold rounded-lg flex items-center gap-2">
                        <Info className="w-4 h-4" />
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="text-[10px] font-black text-k9-black uppercase tracking-widest mb-2 block">Identificação</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Fingerprint className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-gray-50 border-2 border-gray-300 text-k9-black pl-10 p-3 rounded-lg focus:outline-none focus:border-k9-orange focus:ring-1 focus:ring-k9-orange transition-all text-sm placeholder-gray-400 font-semibold"
                                placeholder="usuario@comando.k9"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-k9-black uppercase tracking-widest mb-2 block">Chave de Segurança</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-gray-50 border-2 border-gray-300 text-k9-black pl-10 p-3 rounded-lg focus:outline-none focus:border-k9-orange focus:ring-1 focus:ring-k9-orange transition-all text-sm placeholder-gray-400 font-semibold"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full px-6 py-3 text-sm font-black uppercase tracking-wider rounded-lg border-2 transition-all duration-200 shadow-sm mt-6 disabled:opacity-50 disabled:cursor-not-allowed ${loading ? 'opacity-60 cursor-wait bg-orange-500 border-orange-500 text-white' : 'bg-orange-500 text-white border-orange-500 hover:scale-105'}`}
                    >
                        {loading ? 'Autenticando...' : 'ACESSAR'}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-[10px] text-gray-600 font-mono font-semibold">
                        ESTE SISTEMA É MONITORADO. <br /> QUALQUER TENTATIVA DE ACESSO NÃO AUTORIZADO SERÁ REGISTRADA.
                    </p>
                </div>
            </div>
        </div>
    );
}
