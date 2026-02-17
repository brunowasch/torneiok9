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

export default function ModalitiesPage() {
    const router = useRouter();
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
            alert("Erro ao adicionar modalidade");
        }
    };

    const handleUpdate = async (id: string) => {
        if (!editName.trim()) return;
        try {
            await updateModality(id, editName.trim());
            setEditingId(null);
            fetchModalities();
        } catch (e) {
            alert("Erro ao editar modalidade");
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (confirm(`Tem certeza que deseja excluir a modalidade "${name}"? Tests e competidores que já usam esta modalidade manterão o nome antigo, mas novas seleções não a terão.`)) {
            try {
                await deleteModality(id);
                fetchModalities();
            } catch (e) {
                alert("Erro ao excluir modalidade");
            }
        }
    };

    if (loading) return <div className="min-h-screen bg-k9-white flex items-center justify-center text-k9-orange font-mono">[CARREGANDO CONFIGURAÇÕES...]</div>;

    return (
        <div className="min-h-screen bg-k9-white p-4 md:p-8 text-k9-black font-sans">
            <div className="max-w-4xl mx-auto">
                <header className="mb-8 bg-black border-b-4 border-k9-orange p-6 rounded-xl shadow-lg flex items-center justify-between text-white -mt-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-k9-orange/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                    <div className="relative z-10 flex items-center gap-4">
                        <button 
                            onClick={() => router.push('/admin')}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-black uppercase tracking-tighter leading-none">
                                Gerenciar Modalidades
                            </h1>
                            <p className="text-gray-400 text-[10px] uppercase tracking-widest font-bold mt-1">Configurações de Competição</p>
                        </div>
                    </div>
                    <Shield className="w-8 h-8 text-k9-orange opacity-50 hidden md:block" />
                </header>

                <div className="bg-white border-2 border-gray-200 rounded-2xl shadow-sm overflow-hidden mb-8">
                    <div className="p-6 border-b-2 border-gray-100 flex items-center justify-between bg-gray-50/50">
                        <h2 className="font-black uppercase text-sm tracking-widest flex items-center gap-2">
                            <Shield className="w-4 h-4 text-k9-orange" /> Lista de Modalidades
                        </h2>
                        {!isAdding && (
                            <button
                                onClick={() => setIsAdding(true)}
                                className="bg-orange-400 hover:bg-orange-500 text-white px-4 py-2 rounded-lg transition-all shadow-md flex items-center gap-2 text-xs font-bold uppercase"
                            >
                                <Plus className="w-4 h-4" /> Nova Modalidade
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
                                        placeholder="Nome da Modalidade (ex: Faro de Narcóticos)"
                                        className="flex-1 bg-white border-2 border-gray-300 p-3 rounded-xl focus:border-k9-orange focus:outline-none font-bold uppercase text-sm"
                                        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                                    />
                                    <button
                                        onClick={handleAdd}
                                        className="bg-orange-400 hover:bg-orange-500 text-white px-6 py-3 rounded-xl font-bold uppercase text-xs shadow-lg transition-all"
                                    >
                                        Salvar
                                    </button>
                                    <button
                                        onClick={() => { setIsAdding(false); setNewName(''); }}
                                        className="bg-gray-200 hover:bg-gray-300 text-gray-600 px-6 py-3 rounded-xl font-bold uppercase text-xs transition-all"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        )}

                        {modalities.length === 0 && !isAdding ? (
                            <div className="p-12 text-center text-gray-400">
                                <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                <p className="font-bold uppercase text-xs tracking-widest">Nenhuma modalidade personalizada cadastrada.</p>
                                <p className="text-[10px] mt-2">O sistema usará as modalidades padrão enquanto esta lista estiver vazia.</p>
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
                                                className="text-green-600 hover:bg-green-50 p-2 rounded-lg transition-colors"
                                            >
                                                <Save className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => setEditingId(null)}
                                                className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
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
                                                    className="p-2 text-gray-400 hover:text-k9-orange hover:bg-orange-50 rounded-lg transition-all"
                                                    title="Editar"
                                                >
                                                    <Pencil className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(mod.id, mod.name)}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                    title="Excluir"
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
                            <h3 className="font-black uppercase text-sm mb-2 tracking-tight">Nota sobre Modalidades</h3>
                            <p className="text-xs leading-relaxed font-semibold">
                                As modalidades criadas aqui aparecerão como opções ao cadastrar novos competidores ou criar provas. 
                                Se você excluir uma modalidade que já possui competidores, eles não serão afetados, mas você não poderá 
                                selecionar essa modalidade para novos registros.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
