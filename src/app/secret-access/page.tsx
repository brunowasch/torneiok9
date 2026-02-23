'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginAdmin, resetPassword } from '@/services/userService';
import { Lock, Fingerprint, Info, ArrowLeft } from 'lucide-react';

export default function SecretLoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [isResetMode, setIsResetMode] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const user = await loginAdmin(email, password);
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

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) {
            setError('Informe seu email de identificação.');
            return;
        }

        setError('');
        setMessage('');
        setLoading(true);

        try {
            await resetPassword(email);
            setMessage('Email de recuperação enviado com sucesso. Verifique sua caixa de entrada.');
            setIsResetMode(false);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-k9-white flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white border-2 border-gray-200 p-8 rounded-xl shadow-2xl relative overflow-hidden">
                {/* Decorative */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-linear-to-bl from-k9-orange/10 to-transparent pointer-events-none"></div>

                <div className="text-center mb-8 relative">
                    <div className="w-32 h-32 mx-auto mb-4 relative flex items-center justify-center bg-black rounded-full p-4 shadow-lg border-2 border-k9-orange">
                        <img
                            src="/logo.png"
                            alt="Logo Torneio K9"
                            className="object-contain w-full h-full"
                        />
                    </div>
                    <h1 className="text-2xl font-black text-k9-black uppercase tracking-tighter">
                        {isResetMode ? 'Recuperar Acesso' : 'Acesso Restrito'}
                    </h1>
                    <p className="text-gray-600 font-mono text-xs uppercase tracking-widest mt-1 font-bold">Comando Central K9</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-100 border-2 border-red-300 text-red-700 text-xs font-bold rounded-lg flex items-center gap-2">
                        <Info className="w-4 h-4" />
                        {error}
                    </div>
                )}

                {message && (
                    <div className="mb-6 p-4 bg-green-100 border-2 border-green-300 text-green-700 text-xs font-bold rounded-lg flex items-center gap-2">
                        <Info className="w-4 h-4" />
                        {message}
                    </div>
                )}

                <form onSubmit={isResetMode ? handleResetPassword : handleLogin} className="space-y-4">
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

                    {!isResetMode && (
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-[10px] font-black text-k9-black uppercase tracking-widest block">Chave de Segurança</label>
                                <button
                                    type="button"
                                    onClick={() => { setIsResetMode(true); setError(''); setMessage(''); }}
                                    className="text-[10px] font-black text-k9-orange uppercase hover:underline cursor-pointer"
                                >
                                    Esqueceu a chave?
                                </button>
                            </div>
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
                    )}

                    <div className="flex flex-col gap-3 mt-6">
                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full px-6 py-3 text-sm font-black uppercase tracking-wider rounded-lg border-2 transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${loading ? 'opacity-60 cursor-wait bg-orange-400 border-orange-400 text-white' : 'bg-orange-400 text-white border-orange-400 hover:scale-[1.02]'}`}
                        >
                            {loading ? (isResetMode ? 'Enviando...' : 'Autenticando...') : (isResetMode ? 'ENVIAR EMAIL DE RECUPERAÇÃO' : 'ACESSAR')}
                        </button>

                        {isResetMode && (
                            <button
                                type="button"
                                onClick={() => { setIsResetMode(false); setError(''); setMessage(''); }}
                                className="w-full px-6 py-2 text-xs font-black text-gray-400 uppercase tracking-wider hover:text-k9-black transition-colors flex items-center justify-center gap-2"
                            >
                                <ArrowLeft className="w-3 h-3" /> Voltar para o login
                            </button>
                        )}
                    </div>
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
