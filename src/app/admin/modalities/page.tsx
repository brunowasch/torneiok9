'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    getModalities,
    addModality,
    updateModality,
    deleteModality
} from '@/services/adminService';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
    Plus,
    Pencil,
    Trash2,
    ArrowLeft,
    Shield,
    Save,
    X,
    AlertCircle
} from 'lucide-react';
import { ModalityConfig } from '@/types/schema';
import { useTranslation } from 'react-i18next';

export default function ModalitiesPage() {
    const router = useRouter();
    const { t } = useTranslation();
    const [modalities, setModalities] = useState<ModalityConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [newName, setNewName] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (!user) {
                router.push('/secret-access');
            } else {
                fetchModalities();
            }
        });
        return () => unsubscribe();
    }, [router]);

    const fetchModalities = async () => {
        try {
            const data = await getModalities();
            setModalities(data.sort((a, b) => a.name.localeCompare(b.name)));
        } catch (e) {
            console.error("Error fetching modalities", e);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!newName.trim()) return;
        try {
            await addModality(newName.trim());
            setNewName('');
            setIsAdding(false);
            fetchModalities();
        } catch (e) {
            alert(t('modalities.errorAdd'));
        }
    };

    const handleUpdate = async (id: string) => {
        if (!editName.trim()) return;
        try {
            await updateModality(id, editName.trim());
            setEditingId(null);
            fetchModalities();
        } catch (e) {
            alert(t('modalities.errorEdit'));
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (confirm(`${t('modalities.deleteConfirm')} "${name}"?`)) {
            try {
                await deleteModality(id);
                fetchModalities();
            } catch (e) {
                alert(t('modalities.errorDelete'));
            }
        }
    };

    if (loading) return <div className="min-h-screen bg-k9-white flex items-center justify-center text-k9-orange font-mono">{t('modalities.loading')}</div>;

    return (
        <div className="min-h-screen bg-k9-white p-4 md:p-8 text-k9-black font-sans">
            <div className="max-w-4xl mx-auto">
                <header className="mb-6 bg-black border-b-4 border-k9-orange p-5 md:p-6 py-6 md:py-8 rounded-2xl shadow-md flex items-center justify-between text-white relative overflow-hidden">
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-k9-orange/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                    </div>
                    <div className="relative z-10 flex items-center gap-4">
                        <button
                            onClick={() => router.push('/admin')}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors cursor-pointer shrink-0"
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                        <div className="min-w-0">
                            <h1 className="text-xl md:text-2xl font-black uppercase tracking-tighter leading-tight truncate">
                                {t('modalities.title')}
                            </h1>
                            <p className="text-k9-orange text-[9px] md:text-[10px] uppercase tracking-[0.2em] font-black opacity-80 mt-1">{t('modalities.subtitle')}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        <Shield className="w-8 h-8 text-k9-orange opacity-40 hidden md:block" />
                    </div>
                </header>

                <div className="bg-white border-2 border-gray-200 rounded-2xl shadow-sm overflow-hidden mb-8">
                    <div className="p-6 border-b-2 border-gray-100 flex items-center justify-between bg-gray-50/50">
                        <h2 className="font-black uppercase text-sm tracking-widest flex items-center gap-2">
                            <Shield className="w-4 h-4 text-k9-orange" /> {t('modalities.listTitle')}
                        </h2>
                        {!isAdding && (
                            <button
                                onClick={() => setIsAdding(true)}
                                className="bg-orange-400 hover:bg-orange-500 text-white px-4 py-2 rounded-lg transition-all shadow-md flex items-center gap-2 text-xs font-bold uppercase cursor-pointer"
                            >
                                <Plus className="w-4 h-4" /> {t('modalities.addNew')}
                            </button>
                        )}
                    </div>

                    <div className="divide-y-2 divide-gray-100">
                        {isAdding && (
                            <div className="p-6 bg-orange-50/30 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="flex gap-4">
                                    <input
                                        autoFocus
                                        type="text"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        placeholder={t('modalities.namePlaceholder')}
                                        className="flex-1 bg-white border-2 border-gray-300 p-3 rounded-xl focus:border-k9-orange focus:outline-none font-bold uppercase text-sm"
                                        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                                    />
                                    <button
                                        onClick={handleAdd}
                                        className="bg-orange-400 hover:bg-orange-500 text-white px-6 py-3 rounded-xl font-bold uppercase text-xs shadow-lg transition-all cursor-pointer"
                                    >
                                        {t('modalities.save')}
                                    </button>
                                    <button
                                        onClick={() => { setIsAdding(false); setNewName(''); }}
                                        className="bg-gray-200 hover:bg-gray-300 text-gray-600 px-6 py-3 rounded-xl font-bold uppercase text-xs transition-all cursor-pointer"
                                    >
                                        {t('modalities.cancel')}
                                    </button>
                                </div>
                            </div>
                        )}

                        {modalities.length === 0 && !isAdding ? (
                            <div className="p-12 text-center text-gray-400">
                                <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                <p className="font-bold uppercase text-xs tracking-widest">{t('modalities.noModalities')}</p>
                                <p className="text-[10px] mt-2">{t('modalities.noModalitiesHint')}</p>
                            </div>
                        ) : (
                            modalities.map((mod) => (
                                <div key={mod.id} className="p-6 hover:bg-gray-50 transition-colors flex items-center justify-between group">
                                    {editingId === mod.id ? (
                                        <div className="flex-1 flex gap-4">
                                            <input
                                                autoFocus
                                                type="text"
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                className="flex-1 bg-white border-2 border-k9-orange p-2 rounded-lg focus:outline-none font-bold uppercase text-sm"
                                                onKeyDown={(e) => e.key === 'Enter' && handleUpdate(mod.id)}
                                            />
                                            <button
                                                onClick={() => handleUpdate(mod.id)}
                                                className="text-green-600 hover:bg-green-50 p-2 rounded-lg transition-colors cursor-pointer"
                                            >
                                                <Save className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => setEditingId(null)}
                                                className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors cursor-pointer"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <div>
                                                <span className="font-black uppercase text-base text-gray-800 tracking-tight">{mod.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => { setEditingId(mod.id); setEditName(mod.name); }}
                                                    className="p-2 text-gray-400 hover:text-k9-orange hover:bg-orange-50 rounded-lg transition-all cursor-pointer"
                                                    title={t('modalities.save')}
                                                >
                                                    <Pencil className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(mod.id, mod.name)}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                                                    title={t('modalities.errorDelete')}
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="bg-blue-50 border-2 border-blue-100 rounded-xl p-6 text-blue-700">
                    <div className="flex items-start gap-4">
                        <AlertCircle className="w-6 h-6 shrink-0 mt-0.5" />
                        <div>
                            <h3 className="font-black uppercase text-sm mb-2 tracking-tight">{t('modalities.noteTitle')}</h3>
                            <p className="text-xs leading-relaxed font-semibold">
                                {t('modalities.noteText')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
