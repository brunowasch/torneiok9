'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginAdmin, resetPassword } from '@/services/userService';
import { Lock, Fingerprint, Info, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function SecretLoginPage() {
    const router = useRouter();
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [isResetMode, setIsResetMode] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const user = await loginAdmin(email, password);
            const { getUserRole } = await import('@/services/userService');
            const role = await getUserRole(user.uid);

            localStorage.setItem('hasLoggedInBefore', 'true');

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
            setError(t('login.errorIdentification'));
            return;
        }

        setError('');
        setMessage('');
        setLoading(true);

        try {
            await resetPassword(email);
            setMessage(t('login.recoverSuccess'));
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
                <div className="text-center mb-8 relative">
                    <div className="w-32 h-32 mx-auto mb-4 relative flex items-center justify-center bg-black rounded-full p-4">
                        <img
                            src="/transparent-logo.png"
                            alt="Logo Torneio K9"
                            className="object-contain w-full h-full"
                        />
                    </div>
                    <h1 className="text-2xl font-black text-k9-black uppercase tracking-tighter">
                        {isResetMode ? t('login.resetTitle') : t('login.title')}
                    </h1>
                    <p className="text-gray-600 font-mono text-xs uppercase tracking-widest mt-1 font-bold">{t('login.subtitle')}</p>
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
                        <label className="text-[10px] font-black text-k9-black uppercase tracking-widest mb-2 block">{t('login.identification')}</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Fingerprint className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-gray-50 border-2 border-gray-300 text-k9-black pl-10 p-3 rounded-lg focus:outline-none focus:border-k9-orange focus:ring-1 focus:ring-k9-orange transition-all text-sm placeholder-gray-400 font-semibold"
                                placeholder={t('login.placeholderIdentification')}
                            />
                        </div>
                    </div>

                    {!isResetMode && (
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-[10px] font-black text-k9-black uppercase tracking-widest block">{t('login.securityKey')}</label>
                                <button
                                    type="button"
                                    onClick={() => { setIsResetMode(true); setError(''); setMessage(''); }}
                                    className="text-[10px] font-black text-k9-orange uppercase hover:underline cursor-pointer"
                                >
                                    {t('login.forgotKey')}
                                </button>
                            </div>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-gray-50 border-2 border-gray-300 text-k9-black pl-10 pr-10 p-3 rounded-lg focus:outline-none focus:border-k9-orange focus:ring-1 focus:ring-k9-orange transition-all text-sm placeholder-gray-400 font-semibold"
                                    placeholder="••••••••"
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
                    )}

                    <div className="flex flex-col gap-3 mt-6">
                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full px-6 py-3 text-sm font-black uppercase tracking-wider rounded-lg border-2 transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${loading ? 'opacity-60 cursor-wait bg-orange-400 border-orange-400 text-white' : 'bg-orange-400 text-white border-orange-400 hover:scale-[1.02]'}`}
                        >
                            {loading ? (isResetMode ? t('login.loadingSending') : t('login.loadingAuthenticating')) : (isResetMode ? t('login.buttonSendRecovery') : t('login.buttonAccess'))}
                        </button>

                        {isResetMode && (
                            <button
                                type="button"
                                onClick={() => { setIsResetMode(false); setError(''); setMessage(''); }}
                                className="w-full px-6 py-2 text-xs font-black text-gray-400 uppercase tracking-wider hover:text-k9-black transition-colors flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <ArrowLeft className="w-3 h-3" /> {t('login.backToLogin')}
                            </button>
                        )}
                    </div>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-[10px] text-gray-600 font-mono font-semibold">
                        {t('login.warning')}
                    </p>
                </div>
            </div>
        </div>
    );
}
