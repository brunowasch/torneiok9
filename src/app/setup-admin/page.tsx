'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createAdminUser, checkAdminExists } from '@/services/userService';
import { ShieldCheck, Lock, Mail, User, AlertTriangle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function SetupAdminPage() {
    const router = useRouter();
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [adminExists, setAdminExists] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: ''
    });
    const [showPassword, setShowPassword] = useState(false);
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
            setStatus({ type: 'error', message: t('setupAdmin.errorFields') });
            return;
        }

        setLoading(true);
        try {
            await createAdminUser(formData.email, formData.password, formData.name);
            setStatus({ type: 'success', message: t('setupAdmin.successMessage') });
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
                {t('setupAdmin.systemStatus')}
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
                        <h1 className="text-2xl font-black text-k9-black uppercase tracking-widest">{t('setupAdmin.accessDenied')}</h1>
                        <p className="text-gray-600 font-semibold text-sm">
                            {t('setupAdmin.alreadyConfigured')}
                        </p>
                        <div className="w-full h-px bg-gray-300 my-4"></div>
                        <button
                            onClick={() => router.push('/')}
                            className="text-k9-orange hover:text-k9-black uppercase text-xs font-black tracking-widest transition-colors border-2 border-k9-orange rounded-lg px-4 py-2 hover:bg-k9-orange/10 cursor-pointer"
                        >
                            {t('setupAdmin.returnBase')}
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
                <div className="text-center mb-8 relative">
                    <div className="absolute top-0 right-0 z-10">
                        <LanguageSwitcher />
                    </div>
                    <ShieldCheck className="w-16 h-16 text-k9-orange mx-auto mb-4" />
                    <h1 className="text-3xl font-black text-k9-black uppercase tracking-tighter">
                        {t('setupAdmin.title')}
                    </h1>
                    <p className="text-k9-orange text-sm uppercase tracking-widest mt-2 font-bold">
                        {t('setupAdmin.subtitle')}
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
                                <User className="w-3 h-3" /> {t('setupAdmin.identification')}
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full bg-gray-50 border-2 border-gray-300 text-k9-black p-3 rounded-lg focus:border-k9-orange focus:ring-1 focus:ring-k9-orange focus:outline-none transition-all placeholder-gray-400 font-semibold"
                                placeholder={t('setupAdmin.placeholderName')}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black text-k9-black uppercase tracking-wider flex items-center gap-2">
                                <Mail className="w-3 h-3" /> {t('setupAdmin.email')}
                            </label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full bg-gray-50 border-2 border-gray-300 text-k9-black p-3 rounded-lg focus:border-k9-orange focus:ring-1 focus:ring-k9-orange focus:outline-none transition-all placeholder-gray-400 font-semibold"
                                placeholder={t('setupAdmin.placeholderEmail')}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black text-k9-black uppercase tracking-wider flex items-center gap-2">
                                <Lock className="w-3 h-3" /> {t('setupAdmin.securityKey')}
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full bg-gray-50 border-2 border-gray-300 text-k9-black p-3 pr-10 rounded-lg focus:border-k9-orange focus:ring-1 focus:ring-k9-orange focus:outline-none transition-all placeholder-gray-400 font-semibold"
                                    placeholder={t('setupAdmin.placeholderPassword')}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-k9-orange cursor-pointer"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-k9-orange hover:bg-amber-600 text-white font-black uppercase py-4 rounded-lg tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-8 cursor-pointer"
                        >
                            {loading ? t('setupAdmin.loadingGenerating') : t('setupAdmin.buttonCreate')}
                        </button>
                    </form>
                </div>

                <div className="text-center mt-6">
                    <p className="text-xs text-gray-600 font-mono font-semibold">
                        {t('setupAdmin.footer')}
                    </p>
                </div>
            </div>
        </div>
    );
}
