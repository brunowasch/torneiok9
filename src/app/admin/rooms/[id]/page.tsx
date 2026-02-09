'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getRoomById, getCompetitorsByRoom, getTestTemplates, addCompetitor, createTestTemplate, updateTestTemplate, getJudgesList, addJudgeToRoom, removeJudgeFromRoom } from '@/services/adminService';
import { createJudgeByAdmin } from '@/services/userService';
import { Room, Competitor, TestTemplate, ScoreGroup, PenaltyOption, ScoreOption, AppUser } from '@/types/schema'; // Import ScoreOption
import {
    ArrowLeft,
    Users,
    FileText,
    ShieldCheck,
    Plus,
    Trash2,
    UserPlus,
    Wand2,
    ShieldAlert,
    Pencil,
    X,
    Gavel
} from 'lucide-react';
import { auth } from '@/lib/firebase';

export default function RoomDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const roomId = params.id as string;

    const [room, setRoom] = useState<Room | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'competitors' | 'tests' | 'judges'>('competitors');
    const [allJudges, setAllJudges] = useState<AppUser[]>([]);

    // Data Lists
    const [competitors, setCompetitors] = useState<Competitor[]>([]);
    const [tests, setTests] = useState<TestTemplate[]>([]);

    // Forms State
    const [showAddCompetitor, setShowAddCompetitor] = useState(false);
    const [compForm, setCompForm] = useState({ handlerName: '', dogName: '', dogBreed: '', testId: '' });

    const [showAddTest, setShowAddTest] = useState(false);
    const [testForm, setTestForm] = useState({ title: '', handlerItems: [] as any[], dogItems: [] as any[] });
    // Detailed test form states
    const [handlerItems, setHandlerItems] = useState<ScoreOption[]>([]);
    const [dogItems, setDogItems] = useState<ScoreOption[]>([]);
    const [templateTitle, setTemplateTitle] = useState('');
    const [genMsg, setGenMsg] = useState('');
    const [editingTestId, setEditingTestId] = useState<string | null>(null);

    // Judge Form State
    const [showAddJudge, setShowAddJudge] = useState(false);
    const [judgeMode, setJudgeMode] = useState<'existing' | 'new'>('existing');
    const [selectedJudgeId, setSelectedJudgeId] = useState('');
    const [newJudgeForm, setNewJudgeForm] = useState({ name: '', email: '', password: '' });

    useEffect(() => {
        if (roomId) {
            loadRoomData();
        }
    }, [roomId]);

    const loadRoomData = async () => {
        try {
            const r = await getRoomById(roomId);
            setRoom(r);

            // Parallel fetch
            const [c, t, j] = await Promise.all([
                getCompetitorsByRoom(roomId),
                getTestTemplates(roomId),
                getJudgesList()
            ]);
            setCompetitors(c);
            setTests(t);
            setAllJudges(j);
        } catch (e) {
            console.error("Failed to load room", e);
            // router.push('/admin'); // Redirect if fail?
        } finally {
            setLoading(false);
        }
    };

    // Actions
    const saveCompetitor = async () => {
        if (!compForm.handlerName || !compForm.dogName) return;
        try {
            await addCompetitor({
                roomId,
                handlerName: compForm.handlerName,
                dogName: compForm.dogName,
                dogBreed: compForm.dogBreed,
                competitorNumber: Math.floor(Math.random() * 900) + 100, // Auto-assign a random 3-digit number for now
                testId: compForm.testId || undefined
            });
            setCompForm({ handlerName: '', dogName: '', dogBreed: '', testId: '' });
            setShowAddCompetitor(false);
            loadRoomData(); // Refresh
        } catch (e) {
            alert('Erro ao salvar competidor');
        }
    };

    // Test Creation Logic (Reused from previous step)
    const handlerScoreSum = handlerItems.reduce((acc, item) => acc + item.maxPoints, 0);
    const dogScoreSum = dogItems.reduce((acc, item) => acc + item.maxPoints, 0);

    const addHandlerItem = (label: string, points: number) => {
        setHandlerItems([...handlerItems, { id: `h-${Date.now()}`, label, maxPoints: points }]);
    };
    const removeHandlerItem = (index: number) => {
        setHandlerItems(handlerItems.filter((_, i) => i !== index));
    };
    const addDogItem = (label: string, points: number) => {
        setDogItems([...dogItems, { id: `d-${Date.now()}`, label, maxPoints: points }]);
    };
    const removeDogItem = (index: number) => {
        setDogItems(dogItems.filter((_, i) => i !== index));
    };

    const editTest = (test: TestTemplate) => {
        setTemplateTitle(test.title);
        // Start by checking specific names, but fallback to index if needed or adjust logic
        const handlerGroup = test.groups.find(g => g.name.includes('Condutor')) || test.groups[0];
        const dogGroup = test.groups.find(g => g.name.includes('Cão')) || test.groups[1];

        setHandlerItems(handlerGroup ? handlerGroup.items : []);
        setDogItems(dogGroup ? dogGroup.items : []);
        setEditingTestId(test.id);
        setShowAddTest(true);
    };

    const saveTest = async () => {
        if (handlerScoreSum > 5) {
            setGenMsg('ERRO: Total do Condutor excede 5 pontos.');
            return;
        }
        if (dogScoreSum > 5) {
            setGenMsg('ERRO: Total do Cão excede 5 pontos.');
            return;
        }

        try {
            const groups: ScoreGroup[] = [
                { name: "Parte A: Avaliação do Condutor", items: handlerItems },
                { name: "Parte B: Avaliação do Cão", items: dogItems }
            ];
            const penalties: PenaltyOption[] = []; // Penalties should be managed by admin, not hardcoded presets

            if (editingTestId) {
                await updateTestTemplate(editingTestId, {
                    title: templateTitle || "Nova Prova",
                    maxScore: handlerScoreSum + dogScoreSum,
                    groups,
                    penalties
                });
            } else {
                await createTestTemplate({
                    title: templateTitle || "Nova Prova",
                    description: "Provas de Campo",
                    maxScore: handlerScoreSum + dogScoreSum,
                    groups,
                    penalties,
                    roomId
                });
            }

            // Reset
            setHandlerItems([]);
            setDogItems([]);
            setTemplateTitle('');
            setEditingTestId(null);
            setShowAddTest(false);
            loadRoomData();
        } catch (e) {
            console.error(e);
            setGenMsg('Erro ao salvar prova.');
        }
    };

    // Judge Actions
    const handleAddJudge = async () => {
        try {
            if (judgeMode === 'existing') {
                if (!selectedJudgeId) return alert('Selecione um juiz');
                await addJudgeToRoom(roomId, selectedJudgeId);
            } else {
                if (!newJudgeForm.name || !newJudgeForm.email || !newJudgeForm.password) return alert('Preencha todos os campos');
                const newUid = await createJudgeByAdmin(newJudgeForm.email, newJudgeForm.password, newJudgeForm.name);
                await addJudgeToRoom(roomId, newUid);
            }
            setShowAddJudge(false);
            setNewJudgeForm({ name: '', email: '', password: '' });
            setSelectedJudgeId('');
            loadRoomData();
        } catch (e: any) {
            alert(e.message || "Erro ao adicionar juiz");
        }
    };

    const handleRemoveJudge = async (uid: string) => {
        if (!confirm('Remover este juiz da sala?')) return;
        try {
            await removeJudgeFromRoom(roomId, uid);
            loadRoomData();
        } catch (e) {
            alert('Erro ao remover juiz');
        }
    }

    if (loading) return <div className="min-h-screen bg-tactical-black flex items-center justify-center text-police-gold font-mono">[CARREGANDO DADOS TÁTICOS...]</div>;
    if (!room) return <div className="p-8 text-white">Sala não encontrada.</div>;

    return (
        <div className="min-h-screen bg-tactical-black text-gray-200">
            {/* Header */}
            <div className="bg-tactical-gray border-b border-gray-800 p-6">
                <div className="max-w-6xl mx-auto">
                    <button onClick={() => router.push('/admin')} className="flex items-center gap-2 text-gray-500 hover:text-white mb-4 text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer">
                        <ArrowLeft className="w-4 h-4" /> Voltar ao Painel
                    </button>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">{room.name}</h1>
                            <div className="flex items-center gap-4 mt-2">
                                <span className="text-xs font-mono text-police-gold bg-police-gold/10 px-2 py-1 rounded border border-police-gold/20">ID: {room.id}</span>
                                <span className={`text-xs font-bold uppercase ${room.active ? 'text-green-500' : 'text-red-500'}`}>{room.active ? '• Ativa' : '• Finalizada'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Actions */}
            <div className="max-w-6xl mx-auto p-6 md:p-8">

                {/* Tabs */}
                <div className="flex gap-2 mb-8 border-b border-gray-800 pb-1">
                    <button
                        onClick={() => setActiveTab('tests')}
                        className={`px-6 py-3 text-sm font-bold uppercase tracking-wider transition-all rounded-t-lg flex items-center gap-2 cursor-pointer ${activeTab === 'tests' ? 'bg-white text-black' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                    >
                        <FileText className="w-4 h-4" /> Provas ({tests.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('competitors')}
                        className={`px-6 py-3 text-sm font-bold uppercase tracking-wider transition-all rounded-t-lg flex items-center gap-2 cursor-pointer ${activeTab === 'competitors' ? 'bg-white text-black' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                    >
                        <Users className="w-4 h-4" /> Competidores ({competitors.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('judges')}
                        className={`px-6 py-3 text-sm font-bold uppercase tracking-wider transition-all rounded-t-lg flex items-center gap-2 cursor-pointer ${activeTab === 'judges' ? 'bg-white text-black' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                    >
                        <ShieldCheck className="w-4 h-4" /> Juízes ({room.judges?.length || 0})
                    </button>
                </div>

                {/* COMPETITORS VIEW */}
                {activeTab === 'competitors' && (
                    <div>
                        {!showAddCompetitor ? (
                            <>
                                <div className="flex justify-end mb-6">
                                    <button
                                        onClick={() => setShowAddCompetitor(true)}
                                        className="bg-green-800 hover:bg-green-700 text-white font-bold uppercase px-4 py-3 rounded text-sm tracking-wider flex items-center gap-2 cursor-pointer"
                                    >
                                        <Plus className="w-4 h-4" /> Registar Novo Competidor
                                    </button>
                                </div>

                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {competitors.map(comp => (
                                        <div key={comp.id} className="bg-tactical-gray border border-gray-800 p-4 rounded hover:border-gray-600 transition-all flex items-center justify-between group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-black rounded flex items-center justify-center font-black text-gray-500">
                                                    {comp.competitorNumber}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-white uppercase text-sm">{comp.handlerName}</div>
                                                    <div className="text-xs text-police-gold font-mono uppercase">Cão: {comp.dogName}</div>
                                                </div>
                                            </div>
                                            <button className="text-gray-600 hover:text-red-500 transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                    {competitors.length === 0 && <div className="text-gray-500 col-span-full text-center py-8">Nenhum competidor registrado.</div>}
                                </div>
                            </>
                        ) : (
                            <div className="max-w-xl mx-auto bg-tactical-gray border border-gray-800 p-6 rounded-xl">
                                <h2 className="text-xl font-bold text-white uppercase mb-6 flex items-center gap-2">
                                    <UserPlus className="text-police-gold w-5 h-5" /> Novo Registro
                                </h2>
                                <div className="space-y-4">
                                    <input
                                        placeholder="Nome do Condutor"
                                        value={compForm.handlerName}
                                        onChange={e => setCompForm({ ...compForm, handlerName: e.target.value })}
                                        className="w-full bg-black/50 border border-gray-700 text-white p-3 rounded focus:outline-none focus:border-police-gold"
                                    />
                                    <div className="grid grid-cols-2 gap-4">
                                        <input
                                            placeholder="Nome do Cão"
                                            value={compForm.dogName}
                                            onChange={e => setCompForm({ ...compForm, dogName: e.target.value })}
                                            className="w-full bg-black/50 border border-gray-700 text-white p-3 rounded focus:outline-none focus:border-police-gold"
                                        />
                                        <input
                                            placeholder="Raça"
                                            value={compForm.dogBreed}
                                            onChange={e => setCompForm({ ...compForm, dogBreed: e.target.value })}
                                            className="w-full bg-black/50 border border-gray-700 text-white p-3 rounded focus:outline-none focus:border-police-gold"
                                        />
                                    </div>

                                    {/* Test Selection */}
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Prova / Categoria <span className="text-red-500">*</span></label>

                                        {tests.length === 0 ? (
                                            <div className="p-3 border border-red-900/50 bg-red-900/10 rounded text-red-400 text-xs text-center">
                                                <p className="font-bold mb-2">⚠ NENHUMA PROVA DISPONÍVEL</p>
                                                <p>Crie uma prova na aba 'Provas' antes de registrar competidores.</p>
                                            </div>
                                        ) : (
                                            <select
                                                value={compForm.testId}
                                                onChange={e => setCompForm({ ...compForm, testId: e.target.value })}
                                                className="w-full bg-black/50 border border-gray-700 text-white p-3 rounded focus:outline-none focus:border-police-gold"
                                            >
                                                <option value="">-- Selecione a Prova --</option>
                                                {tests.map(t => (
                                                    <option key={t.id} value={t.id}>{t.title}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                    <div className="flex gap-4 pt-4">
                                        <button onClick={() => setShowAddCompetitor(false)} className="flex-1 py-3 bg-gray-800 text-gray-300 font-bold uppercase rounded text-sm cursor-pointer">Cancelar</button>
                                        <button onClick={saveCompetitor} className="flex-1 py-3 bg-white hover:bg-gray-200 text-black font-bold uppercase rounded text-sm cursor-pointer">Salvar</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* TESTS VIEW */}
                {activeTab === 'tests' && (
                    <div>
                        {!showAddTest ? (
                            <>
                                <div className="flex justify-end mb-6">
                                    <button
                                        onClick={() => {
                                            setEditingTestId(null);
                                            setHandlerItems([]);
                                            setDogItems([]);
                                            setTemplateTitle('');
                                            setShowAddTest(true);
                                        }}
                                        className="bg-purple-900/50 hover:bg-purple-800 border border-purple-800 text-purple-100 font-bold uppercase px-4 py-3 rounded text-sm tracking-wider flex items-center gap-2 cursor-pointer"
                                    >
                                        <Wand2 className="w-4 h-4" /> Criar Prova
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {tests.map(test => (
                                        <div key={test.id} className="bg-tactical-gray border border-gray-800 rounded p-6 flex justify-between items-center group">
                                            <div>
                                                <h3 className="font-bold text-white uppercase">{test.title}</h3>
                                                <div className="text-xs text-gray-500 mt-1 flex gap-4">
                                                    <span>Grupos: {test.groups.length}</span>
                                                    <span>Max Score: {test.maxScore}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => editTest(test)}
                                                    className="p-2 text-gray-500 hover:text-white transition-colors cursor-pointer"
                                                    title="Editar Prova"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <div className="px-3 py-1 bg-police-gold/10 text-police-gold text-xs font-bold rounded uppercase">
                                                    Ativo
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {tests.length === 0 && <div className="text-gray-500 text-center py-8">Nenhuma prova cadastrada.</div>}
                                </div>
                            </>
                        ) : (
                            <div className="max-w-2xl mx-auto bg-tactical-gray border border-gray-800 p-6 rounded-xl">
                                <h2 className="text-xl font-bold text-white uppercase mb-6 flex items-center gap-2">
                                    <Wand2 className="text-police-gold w-5 h-5" /> {editingTestId ? 'Editar Prova' : 'Criar Prova'}
                                </h2>

                                <div className="mb-6">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Título</label>
                                    <input
                                        value={templateTitle}
                                        onChange={e => setTemplateTitle(e.target.value)}
                                        className="w-full bg-black/50 border border-gray-700 text-white p-3 rounded focus:outline-none focus:border-police-gold mt-1"
                                        placeholder="Ex: Busca e Captura"
                                    />
                                </div>

                                {/* Handler Items */}
                                <div className="mb-6 p-4 bg-black/20 rounded border border-gray-800">
                                    <div className="flex justify-between mb-2">
                                        <h3 className="text-sm font-bold text-white uppercase">Avaliação do Condutor</h3>
                                        <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${handlerScoreSum > 5 ? 'bg-red-900 text-white' : 'text-gray-500'}`}>{handlerScoreSum}/5.0</span>
                                    </div>
                                    <div className="space-y-2 mb-3">
                                        {handlerItems.map((item, i) => (
                                            <div key={i} className="flex justify-between items-center text-xs bg-tactical-gray p-2 rounded">
                                                <span className="text-gray-300">{item.label}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-police-gold font-mono">{item.maxPoints} pts</span>
                                                    <button onClick={() => removeHandlerItem(i)} className="text-red-500 cursor-pointer"><X className="w-4 h-4" /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <input id="h-lbl" placeholder="Critério" className="flex-1 bg-black/50 border border-gray-700 text-white text-xs p-2 rounded" />
                                        <input id="h-pts" placeholder="Pts" type="number" step="0.5" className="w-16 bg-black/50 border border-gray-700 text-white text-xs p-2 rounded" />
                                        <button
                                            onClick={() => {
                                                const l = (document.getElementById('h-lbl') as HTMLInputElement).value;
                                                const p = parseFloat((document.getElementById('h-pts') as HTMLInputElement).value);
                                                if (l && p) { addHandlerItem(l, p); (document.getElementById('h-lbl') as HTMLInputElement).value = ''; (document.getElementById('h-pts') as HTMLInputElement).value = ''; }
                                            }}
                                            className="bg-gray-700 text-white px-3 rounded text-xs uppercase font-bold cursor-pointer"
                                        >Add</button>
                                    </div>
                                </div>

                                {/* Dog Items */}
                                <div className="mb-6 p-4 bg-black/20 rounded border border-gray-800">
                                    <div className="flex justify-between mb-2">
                                        <h3 className="text-sm font-bold text-white uppercase">Avaliação do Cão</h3>
                                        <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${dogScoreSum > 5 ? 'bg-red-900 text-white' : 'text-gray-500'}`}>{dogScoreSum}/5.0</span>
                                    </div>
                                    <div className="space-y-2 mb-3">
                                        {dogItems.map((item, i) => (
                                            <div key={i} className="flex justify-between items-center text-xs bg-tactical-gray p-2 rounded">
                                                <span className="text-gray-300">{item.label}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-police-gold font-mono">{item.maxPoints} pts</span>
                                                    <button onClick={() => removeDogItem(i)} className="text-red-500 cursor-pointer">×</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <input id="d-lbl" placeholder="Critério" className="flex-1 bg-black/50 border border-gray-700 text-white text-xs p-2 rounded" />
                                        <input id="d-pts" placeholder="Pts" type="number" step="0.5" className="w-16 bg-black/50 border border-gray-700 text-white text-xs p-2 rounded" />
                                        <button
                                            onClick={() => {
                                                const l = (document.getElementById('d-lbl') as HTMLInputElement).value;
                                                const p = parseFloat((document.getElementById('d-pts') as HTMLInputElement).value);
                                                if (l && p) { addDogItem(l, p); (document.getElementById('d-lbl') as HTMLInputElement).value = ''; (document.getElementById('d-pts') as HTMLInputElement).value = ''; }
                                            }}
                                            className="bg-gray-700 text-white px-3 rounded text-xs uppercase font-bold"
                                        >Add</button>
                                    </div>
                                </div>

                                {genMsg && <div className="text-red-400 text-xs font-mono mb-4">{genMsg}</div>}

                                <div className="flex gap-4">
                                    <button onClick={() => { setShowAddTest(false); setEditingTestId(null); }} className="flex-1 py-3 bg-gray-800 text-gray-300 font-bold uppercase rounded text-sm cursor-pointer">Cancelar</button>
                                    <button
                                        onClick={saveTest}
                                        disabled={(handlerScoreSum + dogScoreSum) > 10}
                                        className="flex-1 py-3 bg-white hover:bg-gray-200 text-black font-bold uppercase rounded text-sm disabled:opacity-50 cursor-pointer"
                                    >
                                        {editingTestId ? 'Atualizar Prova' : 'Salvar Prova'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'judges' && (
                    <div>
                        {!showAddJudge ? (
                            <>
                                <div className="flex justify-end mb-6">
                                    <button
                                        onClick={() => setShowAddJudge(true)}
                                        className="bg-yellow-300 text-gray-800 hover:bg-yellow-400 font-bold uppercase px-4 py-3 rounded text-sm tracking-wider flex items-center gap-2 cursor-pointer"
                                    >
                                        <Gavel className="w-4 h-4" /> Criar Juiz
                                    </button>
                                </div>

                                <div className="grid md:grid-cols-2 gap-4">
                                    {allJudges.filter(j => room.judges?.includes(j.uid)).map(j => (
                                        <div key={j.uid} className="bg-tactical-gray border border-gray-800 p-4 rounded flex justify-between items-center">
                                            <div>
                                                <div className="font-bold text-white uppercase">{j.name}</div>
                                                <div className="text-xs text-gray-500 font-mono">{j.email}</div>
                                            </div>
                                            <button onClick={() => handleRemoveJudge(j.uid)} className="text-red-500 hover:text-red-400 p-2 cursor-pointer">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                    {(!room.judges || room.judges.length === 0) && (
                                        <div className="col-span-full text-center py-8 text-gray-500">Nenhum juiz atribuído a esta sala.</div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="max-w-xl mx-auto bg-tactical-gray border border-gray-800 p-6 rounded-xl">
                                <h2 className="text-xl font-bold text-white uppercase mb-6 flex items-center gap-2">
                                    <Gavel className="text-police-gold w-5 h-5" /> Gerenciar Juízes
                                </h2>

                                <div className="flex bg-black/40 p-1 rounded mb-6">
                                    <button
                                        onClick={() => setJudgeMode('existing')}
                                        className={`flex-1 py-2 text-xs font-bold uppercase rounded ${judgeMode === 'existing' ? 'bg-gray-700 text-white' : 'text-gray-500'}`}
                                    >
                                        Selecionar Existente
                                    </button>
                                    <button
                                        onClick={() => setJudgeMode('new')}
                                        className={`flex-1 py-2 text-xs font-bold uppercase rounded ${judgeMode === 'new' ? 'bg-gray-700 text-white' : 'text-gray-500'}`}
                                    >
                                        Criar Novo
                                    </button>
                                </div>

                                {judgeMode === 'existing' ? (
                                    <div className="mb-6">
                                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Juiz</label>
                                        <select
                                            value={selectedJudgeId}
                                            onChange={e => setSelectedJudgeId(e.target.value)}
                                            className="w-full bg-black/50 border border-gray-700 text-white p-3 rounded focus:outline-none focus:border-police-gold"
                                        >
                                            <option value="">-- Selecione --</option>
                                            {allJudges.filter(j => !room.judges?.includes(j.uid)).map(j => (
                                                <option key={j.uid} value={j.uid}>{j.name} ({j.email})</option>
                                            ))}
                                        </select>
                                    </div>
                                ) : (
                                    <div className="space-y-4 mb-6">
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Nome</label>
                                            <input
                                                value={newJudgeForm.name}
                                                onChange={e => setNewJudgeForm({ ...newJudgeForm, name: e.target.value })}
                                                className="w-full bg-black/50 border border-gray-700 text-white p-3 rounded focus:outline-none focus:border-police-gold"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Email</label>
                                            <input
                                                value={newJudgeForm.email}
                                                onChange={e => setNewJudgeForm({ ...newJudgeForm, email: e.target.value })}
                                                className="w-full bg-black/50 border border-gray-700 text-white p-3 rounded focus:outline-none focus:border-police-gold"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Senha Provisória</label>
                                            <input
                                                value={newJudgeForm.password}
                                                onChange={e => setNewJudgeForm({ ...newJudgeForm, password: e.target.value })}
                                                type="text"
                                                className="w-full bg-black/50 border border-gray-700 text-white p-3 rounded focus:outline-none focus:border-police-gold"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-4">
                                    <button onClick={() => setShowAddJudge(false)} className="flex-1 py-3 bg-gray-800 text-gray-300 font-bold uppercase rounded text-sm cursor-pointer">Cancelar</button>
                                    <button onClick={handleAddJudge} className="flex-1 py-3 bg-white hover:bg-gray-200 text-black font-bold uppercase rounded text-sm cursor-pointer">Salvar</button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

            </div>
        </div>
    );
}
