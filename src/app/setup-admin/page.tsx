'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createAdminUser, checkAdminExists } from '@/services/userService';
import { ShieldCheck, Lock, Mail, User, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function SetupAdminPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [adminExists, setAdminExists] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: ''
    });
    const [status, setStatus] = useState<{ type: 'error' | 'success' | 'idle'; message: string }>({ type: 'idle', message: '' });

    useEffect(() => {
        checkSystemStatus();
    }, []);

    const checkSystemStatus = async () => {
        try {
            const exists = await checkAdminExists();
            setAdminExists(exists);
        } catch (error) {
            console.error("Failed to check system status", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus({ type: 'idle', message: '' });

        if (!formData.name || !formData.email || !formData.password) {
            setStatus({ type: 'error', message: 'TRAVADO: Todos os campos são obrigatórios para a credencial.' });
            return;
        }

        setLoading(true);
        try {
            await createAdminUser(formData.email, formData.password, formData.name);
            setStatus({ type: 'success', message: 'PROTOCOLO DE ADMIN: USUÁRIO MESTRE CRIADO COM SUCESSO.' });
            setTimeout(() => {
                router.push('/admin');
            }, 2000);
        } catch (error: any) {
            setStatus({ type: 'error', message: `FALHA NA OPERAÇÃO: ${error.message}` });
            setLoading(false);
        }
    };

    if (loading && !status.message) {
        return (
            <div className="min-h-screen bg-k9-white flex items-center justify-center text-k9-orange font-mono animate-pulse">
                [INICIANDO PROTOCOLO DE SEGURANÇA...]
            </div>
        );
    }

    if (adminExists) {
        return (
            <div className="min-h-screen bg-k9-white flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white border-2 border-red-300 p-8 rounded-lg shadow-2xl relative overflow-hidden">
                    <div className="flex flex-col items-center text-center space-y-4">
                        <div className="p-4 bg-red-100 rounded-full border-2 border-red-300">
                            <AlertTriangle className="w-12 h-12 text-red-600" />
                        </div>
                        <h1 className="text-2xl font-black text-k9-black uppercase tracking-widest">Acesso Negado</h1>
                        <p className="text-gray-600 font-semibold text-sm">
                            O Administrador do Sistema já foi configurado. Esta rota agora é classificada como restrita.
                        </p>
                        <div className="w-full h-px bg-gray-300 my-4"></div>
                        <button
                            onClick={() => router.push('/')}
                            className="text-k9-orange hover:text-k9-black uppercase text-xs font-black tracking-widest transition-colors border-2 border-k9-orange rounded-lg px-4 py-2 hover:bg-k9-orange/10"
                        >
                            Retornar à Base
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-k9-white flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                {/* Header */}
                <div className="text-center mb-8">
                    <ShieldCheck className="w-16 h-16 text-k9-orange mx-auto mb-4" />
                    <h1 className="text-3xl font-black text-k9-black uppercase tracking-tighter">
                        Setup Inicial
                    </h1>
                    <p className="text-k9-orange text-sm uppercase tracking-widest mt-2 font-bold">
                        Credencial de Comando Único
                    </p>
                </div>

                {/* Form Card */}
                <div className="bg-white border-2 border-gray-200 p-8 rounded-xl shadow-2xl relative">
                    <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-k9-orange to-amber-500"></div>

                    {status.message && (
                        <div className={`mb-6 p-4 border-2 rounded-lg flex items-start gap-3 text-sm font-semibold ${status.type === 'error'
                            ? 'bg-red-100 border-red-300 text-red-700'
                            : 'bg-green-100 border-green-300 text-green-700'
                            }`}>
                            {status.type === 'error' ? <AlertTriangle className="w-5 h-5 shrink-0" /> : <CheckCircle2 className="w-5 h-5 shrink-0" />}
                            <span>{status.message}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-k9-black uppercase tracking-wider flex items-center gap-2">
                                <User className="w-3 h-3" /> Identificação (Nome)
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full bg-gray-50 border-2 border-gray-300 text-k9-black p-3 rounded-lg focus:border-k9-orange focus:ring-1 focus:ring-k9-orange focus:outline-none transition-all placeholder-gray-400 font-semibold"
                                placeholder="Nome do Admin"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black text-k9-black uppercase tracking-wider flex items-center gap-2">
                                <Mail className="w-3 h-3" /> Canal Seguro (Email)
                            </label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full bg-gray-50 border-2 border-gray-300 text-k9-black p-3 rounded-lg focus:border-k9-orange focus:ring-1 focus:ring-k9-orange focus:outline-none transition-all placeholder-gray-400 font-semibold"
                                placeholder="admin@k9.com"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black text-k9-black uppercase tracking-wider flex items-center gap-2">
                                <Lock className="w-3 h-3" /> Chave de Acesso (Senha)
                            </label>
                            <input
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="w-full bg-gray-50 border-2 border-gray-300 text-k9-black p-3 rounded-lg focus:border-k9-orange focus:ring-1 focus:ring-k9-orange focus:outline-none transition-all placeholder-gray-400 font-semibold"
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-k9-orange hover:bg-amber-600 text-white font-black uppercase py-4 rounded-lg tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-8"
                        >
                            {loading ? 'GERANDO ACESSO...' : 'CRIAR CREDENCIAL ADMIN'}
                        </button>
                    </form>
                </div>

                <div className="text-center mt-6">
                    <p className="text-xs text-gray-600 font-mono font-semibold">
                        SISTEMA TORNEIO K9 v1.0 <br /> ACESSO RESTRITO A PESSOAL AUTORIZADO
                    </p>
                </div>
            </div>
        </div>
    );
}
