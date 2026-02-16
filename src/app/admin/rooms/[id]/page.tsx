'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getRoomById, getCompetitorsByRoom, getTestTemplates, addCompetitor, updateCompetitor, createTestTemplate, updateTestTemplate, getJudgesList, addJudgeToRoom, removeJudgeFromRoom } from '@/services/adminService';
import { createJudgeByAdmin, updateUser } from '@/services/userService';
import { Room, Competitor, TestTemplate, ScoreGroup, PenaltyOption, ScoreOption, AppUser, Modality, MODALITIES } from '@/types/schema'; 
import Modal from '@/components/Modal';
import {
    ArrowLeft,
    Users,
    FileText,
    ShieldCheck,
    Plus,
    Trash2,
    UserPlus,
    Wand2,
    Pencil,
    X,
    Gavel
} from 'lucide-react';

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
    const [editingCompetitorId, setEditingCompetitorId] = useState<string | null>(null);
    const [compForm, setCompForm] = useState({ handlerName: '', dogName: '', dogBreed: '', testId: '' });

    // Test Form State
    const [showAddTest, setShowAddTest] = useState(false);
    const [scoreItems, setScoreItems] = useState<ScoreOption[]>([]);
    const [templateTitle, setTemplateTitle] = useState('');
    const [selectedModality, setSelectedModality] = useState<Modality | ''>('');
    const [genMsg, setGenMsg] = useState('');
    const [editingTestId, setEditingTestId] = useState<string | null>(null);

    // Judge Form State
    const [showAddJudge, setShowAddJudge] = useState(false);
    const [judgeMode, setJudgeMode] = useState<'existing' | 'new'>('existing');
    const [selectedJudgeId, setSelectedJudgeId] = useState('');
    const [newJudgeForm, setNewJudgeForm] = useState({ name: '', email: '', password: '' });
    const [editingJudge, setEditingJudge] = useState<AppUser | null>(null);

    const loadRoomData = useCallback(async () => {
        try {
            const r = await getRoomById(roomId);
            setRoom(r);

            const [c, t, j] = await Promise.all([
                getCompetitorsByRoom(roomId),
                getTestTemplates(roomId),
                getJudgesList()
            ]);
            setCompetitors(c);
            setTests(t);
            setAllJudges(j);
        } catch (err) {
            console.error("Failed to load room", err);
        } finally {
            setLoading(false);
        }
    }, [roomId]);

    useEffect(() => {
        if (!roomId) return;

        let unsubRoom: (() => void) | undefined;
        let unsubCompetitors: (() => void) | undefined;
        let unsubTests: (() => void) | undefined;

        const setupListeners = async () => {
            try {
                const { doc, collection, query, where, onSnapshot } = await import('firebase/firestore');
                const { db } = await import('@/lib/firebase');

                unsubRoom = onSnapshot(doc(db, 'rooms', roomId), (snap) => {
                    if (snap.exists()) setRoom({ id: snap.id, ...snap.data() } as Room);
                    else setRoom(null);
                }, (err) => console.error('room snapshot error', err));

                const qComp = query(collection(db, 'competitors'), where('roomId', '==', roomId));
                unsubCompetitors = onSnapshot(qComp, (snap) => {
                    setCompetitors(snap.docs.map(d => ({ id: d.id, ...d.data() } as Competitor)));
                }, (err) => console.error('competitors snapshot error', err));

                const qTests = query(collection(db, 'tests'), where('roomId', '==', roomId));
                unsubTests = onSnapshot(qTests, (snap) => {
                    setTests(snap.docs.map(d => ({ id: d.id, ...d.data() } as TestTemplate)));
                }, (err) => console.error('tests snapshot error', err));

                const j = await getJudgesList();
                setAllJudges(j);
            } catch (err) {
                console.error('Error setting up room listeners', err);
                loadRoomData();
            } finally {
                setLoading(false);
            }
        };

        setupListeners();

        return () => {
            if (unsubRoom) unsubRoom();
            if (unsubCompetitors) unsubCompetitors();
            if (unsubTests) unsubTests();
        };
    }, [roomId, loadRoomData]);

    // Competitor Actions
    const handleEditCompetitor = (comp: Competitor) => {
        setCompForm({
            handlerName: comp.handlerName,
            dogName: comp.dogName,
            dogBreed: comp.dogBreed,
            testId: comp.testId || ''
        });
        setEditingCompetitorId(comp.id);
        setShowAddCompetitor(true);
    };

    const saveCompetitor = async () => {
        if (!compForm.handlerName || !compForm.dogName) return;
        try {
            if (editingCompetitorId) {
                await updateCompetitor(editingCompetitorId, {
                    handlerName: compForm.handlerName,
                    dogName: compForm.dogName,
                    dogBreed: compForm.dogBreed,
                    testId: compForm.testId || undefined
                });
            } else {
                await addCompetitor({
                    roomId,
                    handlerName: compForm.handlerName,
                    dogName: compForm.dogName,
                    dogBreed: compForm.dogBreed,
                    competitorNumber: Math.floor(Math.random() * 900) + 100,
                    testId: compForm.testId || undefined
                });
            }
            // Reset
            setCompForm({ handlerName: '', dogName: '', dogBreed: '', testId: '' });
            setEditingCompetitorId(null);
            setShowAddCompetitor(false);
            loadRoomData(); 
        } catch (err) {
            console.error(err);
            alert('Erro ao salvar competidor');
        }
    };

    // Test Actions
    const totalScore = scoreItems.reduce((acc, item) => acc + item.maxPoints, 0);

    const addScoreItem = (label: string, points: number) => {
        setScoreItems([...scoreItems, { id: `item-${Date.now()}`, label, maxPoints: points }]);
    };
    const removeScoreItem = (index: number) => {
        setScoreItems(scoreItems.filter((_, i) => i !== index));
    };

    const editTest = (test: TestTemplate) => {
        setTemplateTitle(test.title);
        setSelectedModality(test.modality || '');
        
        // Flatten all items from all groups into a single list
        const allItems = test.groups.flatMap(g => g.items);
        
        setScoreItems(allItems);
        setEditingTestId(test.id);
        setShowAddTest(true);
    };

    const saveTest = async () => {
        if (!selectedModality) {
            setGenMsg('Selecione uma modalidade.');
            return;
        }

        try {
            // Save as a single group
            const groups: ScoreGroup[] = [
                { name: "Critérios de Avaliação", items: scoreItems }
            ];
            const penalties: PenaltyOption[] = []; 

            if (editingTestId) {
                await updateTestTemplate(editingTestId, {
                    title: templateTitle || "Nova Prova",
                    modality: selectedModality,
                    maxScore: totalScore,
                    groups,
                    penalties
                });
            } else {
                await createTestTemplate({
                    title: templateTitle || "Nova Prova",
                    modality: selectedModality,
                    description: "Prova Unificada",
                    maxScore: totalScore,
                    groups,
                    penalties,
                    roomId
                });
            }

            // Reset
            setScoreItems([]);
            setTemplateTitle('');
            setSelectedModality('');
            setEditingTestId(null);
            setShowAddTest(false);
            loadRoomData();
        } catch (e) {
            console.error(e);
            setGenMsg('Erro ao salvar prova.');
        }
    };

    // Judge Actions
    const handleEditJudge = (judge: AppUser) => {
        setEditingJudge(judge);
        setNewJudgeForm({
            name: judge.name,
            email: judge.email,
            password: '' // Password not editable directly here
        });
        setJudgeMode('new'); // Reuse the form layout
        setShowAddJudge(true);
    };

    const handleAddJudge = async () => {
        try {
            if (editingJudge) {
                // Update Existing Judge
                if (!newJudgeForm.name) return alert('Nome é obrigatório');
                await updateUser(editingJudge.uid, { name: newJudgeForm.name });
            } else {
                // Create / Add New
                if (judgeMode === 'existing') {
                    if (!selectedJudgeId) return alert('Selecione um juiz');
                    await addJudgeToRoom(roomId, selectedJudgeId);
                } else {
                    if (!newJudgeForm.name || !newJudgeForm.email || !newJudgeForm.password) return alert('Preencha todos os campos');
                    const newUid = await createJudgeByAdmin(newJudgeForm.email, newJudgeForm.password, newJudgeForm.name);
                    await addJudgeToRoom(roomId, newUid);
                }
            }
            
            // Reset
            setShowAddJudge(false);
            setNewJudgeForm({ name: '', email: '', password: '' });
            setSelectedJudgeId('');
            setEditingJudge(null);
            loadRoomData();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            alert(msg || "Erro ao salvar juiz");
        }
    };

    const handleRemoveJudge = async (uid: string) => {
        if (!confirm('Remover este juiz da sala?')) return;
        try {
            await removeJudgeFromRoom(roomId, uid);
            loadRoomData();
        } catch (err) {
            console.error(err);
            alert('Erro ao remover juiz');
        }
    }

    if (loading) return <div className="min-h-screen bg-k9-white flex items-center justify-center text-k9-orange font-mono">[CARREGANDO DADOS TÁTICOS...]</div>;
    if (!room) return <div className="p-8 text-k9-black">Sala não encontrada.</div>;

    return (
        <div className="min-h-screen bg-k9-white text-k9-black">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 p-6">
                <div className="max-w-6xl mx-auto">
                    <button onClick={() => router.push('/admin')} className="inline-flex items-center gap-2 px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-md bg-orange-50 text-orange-400 border border-orange-100 hover:bg-orange-100 transition-colors cursor-pointer mb-4">
                        <ArrowLeft className="w-4 h-4 text-orange-400" /> Voltar ao Painel
                    </button>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-black text-black uppercase tracking-tighter">{room.name}</h1>
                            <div className="flex items-center gap-4 mt-2">
                                <span className="text-xs font-mono text-police-gold bg-police-gold/10 px-2 py-1 rounded border border-police-gold/20">ID: {room.id}</span>
                                <span className={`text-xs font-bold uppercase ${room.active ? 'text-green-500' : 'text-red-500'}`}>{room.active ? '• Ativa' : '• Finalizada'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Actions */}
            <div className="max-w-6xl mx-auto p-6 md:p-8 bg-gray-50 rounded-xl mt-6 mb-12 md:mt-8 md:mb-16">
                {/* Tabs */}
                <div className="flex gap-2 mb-8">
                    <button
                        onClick={() => setActiveTab('tests')}
                        className={`px-3 py-2 text-xs font-black uppercase tracking-wider rounded-md flex items-center gap-2 transition-all border-2 cursor-pointer ${activeTab === 'tests' ? 'bg-orange-400 text-white border-orange-400 shadow-md scale-105' : 'bg-orange-50 text-orange-400 border-orange-100 hover:bg-orange-100 hover:text-orange-500'}`}
                    >
                        <FileText className="w-4 h-4" /> Provas ({tests.length})
                    </button>

                    <button
                        onClick={() => setActiveTab('competitors')}
                        className={`px-3 py-2 text-xs font-black uppercase tracking-wider rounded-md flex items-center gap-2 transition-all border-2 cursor-pointer ${activeTab === 'competitors' ? 'bg-orange-400 text-white border-orange-400 shadow-md scale-105' : 'bg-orange-50 text-orange-400 border-orange-100 hover:bg-orange-100 hover:text-orange-500'}`}
                    >
                        <Users className="w-4 h-4" /> Competidores ({competitors.length})
                    </button>

                    <button
                        onClick={() => setActiveTab('judges')}
                        className={`px-3 py-2 text-xs font-black uppercase tracking-wider rounded-md flex items-center gap-2 transition-all border-2 cursor-pointer ${activeTab === 'judges' ? 'bg-orange-400 text-white border-orange-400 shadow-md scale-105' : 'bg-orange-50 text-orange-400 border-orange-100 hover:bg-orange-100 hover:text-orange-500'}`}
                    >
                        <ShieldCheck className="w-4 h-4" /> Juízes ({room?.judges?.length || 0})
                    </button>
                </div>

                {activeTab === 'competitors' && (
                    <div>
                        <div className="flex justify-end mb-6">
                            <button
                                onClick={() => {
                                    setEditingCompetitorId(null);
                                    setCompForm({ handlerName: '', dogName: '', dogBreed: '', testId: '' });
                                    setShowAddCompetitor(true);
                                }}
                                className={`px-4 py-2 text-sm font-black uppercase tracking-wider rounded-lg border-2 transition-all duration-200 shadow-sm flex items-center gap-2 bg-green-50 text-green-700 border-green-100 hover:bg-green-100`}
                            >
                                <Plus className="w-4 h-4 text-green-700" /> Registar Novo Competidor
                            </button>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {competitors.map(comp => (
                                <div key={comp.id} className="bg-white border border-gray-100 p-4 rounded-2xl hover:shadow-lg transform hover:-translate-y-1 transition-all flex items-center justify-between group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center font-extrabold shadow-sm">
                                            {comp.competitorNumber}
                                        </div>
                                        <div>
                                            <div className="font-bold text-k9-black uppercase text-sm">{comp.handlerName}</div>
                                            <div className="text-xs text-gray-400 font-mono uppercase">Cão: {comp.dogName}</div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => handleEditCompetitor(comp)}
                                            className="inline-flex items-center justify-center w-8 h-8 bg-white border border-gray-100 rounded-md text-gray-400 hover:text-orange-500 hover:bg-orange-50 transition-colors"
                                            title="Editar"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button 
                                            className="inline-flex items-center justify-center w-8 h-8 bg-white border border-gray-100 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                            title="Remover (Não implementado)"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {competitors.length === 0 && <div className="text-gray-500 col-span-full text-center py-8">Nenhum competidor registrado.</div>}
                        </div>

                        <Modal
                            isOpen={showAddCompetitor}
                            onClose={() => { setShowAddCompetitor(false); setEditingCompetitorId(null); }}
                            title={<div className="flex items-center gap-2"><UserPlus className="text-police-gold w-5 h-5" /> {editingCompetitorId ? 'Editar Competidor' : 'Novo Registro'}</div>}
                            maxWidth="max-w-xl"
                        >
                            <div className="space-y-4">
                                <input
                                    placeholder="Nome do Condutor"
                                    value={compForm.handlerName}
                                    onChange={e => setCompForm({ ...compForm, handlerName: e.target.value })}
                                    className="w-full bg-gray-50 border border-gray-300 text-k9-black p-3 rounded focus:outline-none focus:border-k9-orange focus:ring-1 focus:ring-k9-orange"
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <input
                                        placeholder="Nome do Cão"
                                        value={compForm.dogName}
                                        onChange={e => setCompForm({ ...compForm, dogName: e.target.value })}
                                        className="w-full bg-gray-50 border border-gray-300 text-k9-black p-3 rounded focus:outline-none focus:border-k9-orange focus:ring-1 focus:ring-k9-orange"
                                    />
                                    <input
                                        placeholder="Raça"
                                        value={compForm.dogBreed}
                                        onChange={e => setCompForm({ ...compForm, dogBreed: e.target.value })}
                                        className="w-full bg-gray-50 border border-gray-300 text-k9-black p-3 rounded focus:outline-none focus:border-k9-orange focus:ring-1 focus:ring-k9-orange"
                                    />
                                </div>

                                {/* Test Selection */}
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Prova / Categoria <span className="text-red-500">*</span></label>

                                    {tests.length === 0 ? (
                                        <div className="p-3 border border-red-900/50 bg-red-900/10 rounded text-red-400 text-xs text-center">
                                            <p className="font-bold mb-2">⚠ NENHUMA PROVA DISPONÍVEL</p>
                                            <p>Crie uma prova na aba &apos;Provas&apos; antes de registrar competidores.</p>
                                        </div>
                                    ) : (
                                        <select
                                            value={compForm.testId}
                                            onChange={e => setCompForm({ ...compForm, testId: e.target.value })}
                                            className="w-full bg-gray-50 border border-gray-300 text-k9-black p-3 rounded focus:outline-none focus:border-k9-orange focus:ring-1 focus:ring-k9-orange"
                                        >
                                            <option value="">-- Selecione a Prova --</option>
                                            {tests.map(t => (
                                                <option key={t.id} value={t.id}>{t.title}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                                <div className="flex gap-4 pt-4">
                                    <button onClick={() => { setShowAddCompetitor(false); setEditingCompetitorId(null); }} className="flex-1 px-6 py-3 text-sm font-bold uppercase tracking-wider rounded-lg border-2 bg-gray-800 text-gray-300 border-gray-700 transition-all">Cancelar</button>
                                    <button onClick={saveCompetitor} className="flex-1 px-6 py-3 text-sm font-black uppercase tracking-wider rounded-lg border-2 bg-white text-black border-gray-200 hover:bg-gray-100 transition-all">
                                        {editingCompetitorId ? 'Atualizar' : 'Salvar'}
                                    </button>
                                </div>
                            </div>
                        </Modal>
                    </div>
                )}

                {/* TESTS VIEW */}
                {activeTab === 'tests' && (
                    <div>
                        <div className="flex justify-end mb-6">
                            <button
                                onClick={() => {
                                    setEditingTestId(null);
                                    setScoreItems([]);
                                    setTemplateTitle('');
                                    setSelectedModality('');
                                    setShowAddTest(true);
                                }}
                                className={`px-4 py-2 text-sm font-black uppercase tracking-wider rounded-lg border-2 transition-all duration-200 shadow-sm flex items-center gap-2 bg-purple-50 text-purple-700 border-purple-100 hover:bg-purple-100`}
                            >
                                <Wand2 className="w-4 h-4 text-purple-700" /> Criar Prova
                            </button>
                        </div>

                        <div className="space-y-4">
                            {tests.map(test => (
                                <div key={test.id} className="bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-md transition-all flex justify-between items-center group">
                                    <div>
                                        <h3 className="font-bold text-k9-black uppercase">{test.title}</h3>
                                        <div className="text-xs text-gray-400 mt-2 flex gap-3">
                                            <span className="px-2 py-1 bg-gray-50 rounded text-[11px]">Grupos: {test.groups.length}</span>
                                            <span className="px-2 py-1 bg-gray-50 rounded text-[11px]">Max: {test.maxScore}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => editTest(test)}
                                            className="p-2 bg-gray-50 rounded-md text-gray-400 hover:bg-orange-50 hover:text-orange-500 transition-colors"
                                            title="Editar Prova"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <div className="px-3 py-1 bg-orange-50 text-orange-600 text-xs font-bold rounded uppercase border border-orange-100">
                                            Ativo
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {tests.length === 0 && <div className="text-gray-500 text-center py-8">Nenhuma prova cadastrada.</div>}
                        </div>

                        <Modal
                            isOpen={showAddTest}
                            onClose={() => { setShowAddTest(false); setEditingTestId(null); }}
                            title={<div className="flex items-center gap-2"><Wand2 className="text-police-gold w-5 h-5" /> {editingTestId ? 'Editar Prova' : 'Criar Prova'}</div>}
                            maxWidth="max-w-2xl"
                        >
                            <div className="">
                                <div className="mb-6">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Título</label>
                                    <input
                                        value={templateTitle}
                                        onChange={e => setTemplateTitle(e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-300 text-k9-black p-3 rounded focus:outline-none focus:border-k9-orange focus:ring-1 focus:ring-k9-orange mt-1"
                                        placeholder="Ex: Busca e Captura"
                                    />
                                </div>

                                <div className="mb-6">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Modalidade</label>
                                    <select
                                        value={selectedModality}
                                        onChange={e => setSelectedModality(e.target.value as Modality)}
                                        className="w-full bg-gray-50 border border-gray-300 text-k9-black p-3 rounded focus:outline-none focus:border-k9-orange focus:ring-1 focus:ring-k9-orange mt-1"
                                    >
                                        <option value="">-- Selecione a Modalidade --</option>
                                        {MODALITIES.map(m => (
                                            <option key={m} value={m}>{m}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Evaluation Items */}
                                <div className="mb-6 p-4 bg-gray-50 rounded border border-gray-200">
                                    <div className="flex justify-between mb-2">
                                        <h3 className="text-sm font-bold text-k9-black uppercase">Critérios de Avaliação</h3>
                                        <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded text-police-gold`}>{totalScore} pts</span>
                                    </div>
                                    <div className="space-y-2 mb-3">
                                        {scoreItems.map((item, i) => (
                                            <div key={i} className="flex justify-between items-center text-xs bg-tactical-gray p-2 rounded">
                                                <span className="text-gray-300">{item.label}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-police-gold font-mono">{item.maxPoints} pts</span>
                                                    <button onClick={() => removeScoreItem(i)} className="text-red-500 cursor-pointer"><X className="w-4 h-4" /></button>
                                                </div>
                                            </div>
                                        ))}
                                        {scoreItems.length === 0 && <div className="text-xs text-gray-400 font-mono text-center">Nenhum critério adicionado. Utilize os campos abaixo.</div>}
                                    </div>
                                    <div className="flex gap-2">
                                        <input id="score-lbl" placeholder="Critério (ex: Obediência)" className="flex-1 bg-gray-50 border border-gray-300 text-k9-black text-xs p-2 rounded" />
                                        <input id="score-pts" placeholder="Pts" type="number" step="0.5" defaultValue={10} className="w-16 bg-gray-50 border border-gray-300 text-k9-black text-xs p-2 rounded" />
                                        <button
                                            onClick={() => {
                                                const l = (document.getElementById('score-lbl') as HTMLInputElement).value;
                                                const p = parseFloat((document.getElementById('score-pts') as HTMLInputElement).value);
                                                if (l && p) { addScoreItem(l, p); (document.getElementById('score-lbl') as HTMLInputElement).value = ''; (document.getElementById('score-pts') as HTMLInputElement).value = ''; }
                                            }}
                                            className="bg-gray-100 text-k9-black px-3 rounded text-xs uppercase font-bold cursor-pointer"
                                        >Add</button>
                                    </div>
                                </div>

                                {genMsg && <div className="text-red-400 text-xs font-mono mb-4">{genMsg}</div>}

                                <div className="flex gap-4">
                                    <button onClick={() => { setShowAddTest(false); setEditingTestId(null); }} className="flex-1 px-6 py-3 text-sm font-bold uppercase tracking-wider rounded-lg border-2 bg-gray-800 text-gray-300 border-gray-700 transition-all">Cancelar</button>
                                    <button
                                        onClick={saveTest}
                                        disabled={!templateTitle || !selectedModality || scoreItems.length === 0}
                                        className="flex-1 px-6 py-3 text-sm font-black uppercase tracking-wider rounded-lg border-2 bg-white text-black border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        {editingTestId ? 'Atualizar Prova' : 'Salvar Prova'}
                                    </button>
                                </div>
                            </div>
                        </Modal>
                    </div>
                )}

                {activeTab === 'judges' && (
                    <div>
                        <div className="flex justify-end mb-6">
                            <button
                                onClick={() => {
                                    setEditingJudge(null);
                                    setNewJudgeForm({ name: '', email: '', password: '' });
                                    setJudgeMode('existing');
                                    setShowAddJudge(true);
                                }}
                                className="px-4 py-2 text-sm font-bold uppercase tracking-wider rounded-md bg-yellow-50 text-yellow-700 border border-yellow-100 hover:bg-yellow-100 flex items-center gap-2 cursor-pointer shadow-sm"
                            >
                                <Gavel className="w-4 h-4 text-yellow-700" /> Criar Juiz
                            </button>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            {allJudges.filter(j => room?.judges?.includes(j.uid) ?? false).map(j => (
                                <div key={j.uid} className="bg-white border border-gray-100 p-4 rounded-2xl hover:shadow-md transition-all flex justify-between items-center">
                                    <div>
                                        <div className="font-bold text-k9-black uppercase">{j.name}</div>
                                        <div className="text-xs text-gray-400 font-mono">{j.email}</div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => handleEditJudge(j)}
                                            className="inline-flex items-center justify-center w-8 h-8 bg-white border border-gray-100 rounded-md text-gray-400 hover:text-orange-500 hover:bg-orange-50 transition-colors"
                                            title="Editar"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleRemoveJudge(j.uid)} className="inline-flex items-center justify-center w-8 h-8 bg-white border border-gray-100 rounded-md text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {(!room?.judges || room?.judges.length === 0) && (
                                <div className="col-span-full text-center py-8 text-gray-500">Nenhum juiz atribuído a esta sala.</div>
                            )}
                        </div>

                        <Modal
                            isOpen={showAddJudge}
                            onClose={() => { setShowAddJudge(false); setEditingJudge(null); }}
                            title={<div className="flex items-center gap-2"><Gavel className="text-police-gold w-5 h-5" /> {editingJudge ? 'Editar Juiz' : 'Gerenciar Juízes'}</div>}
                            maxWidth="max-w-xl"
                        >
                            <div className="">
                                {!editingJudge && (
                                    <div className="flex bg-gray-100 p-1 rounded mb-6">
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
                                )}

                                {judgeMode === 'existing' && !editingJudge ? (
                                    <div className="mb-6">
                                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Juiz</label>
                                        <select
                                            value={selectedJudgeId}
                                            onChange={e => setSelectedJudgeId(e.target.value)}
                                            className="w-full bg-gray-50 border border-gray-300 text-k9-black p-3 rounded focus:outline-none focus:border-k9-orange focus:ring-1 focus:ring-k9-orange"
                                        >
                                            <option value="">-- Selecione --</option>
                                            {allJudges.filter(j => !(room?.judges?.includes(j.uid))).map(j => (
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
                                                className="w-full bg-gray-50 border border-gray-300 text-k9-black p-3 rounded focus:outline-none focus:border-k9-orange focus:ring-1 focus:ring-k9-orange"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Email</label>
                                            <input
                                                value={newJudgeForm.email}
                                                disabled={!!editingJudge}
                                                onChange={e => setNewJudgeForm({ ...newJudgeForm, email: e.target.value })}
                                                className={`w-full bg-gray-50 border border-gray-300 text-k9-black p-3 rounded focus:outline-none focus:border-k9-orange focus:ring-1 focus:ring-k9-orange ${editingJudge ? 'opacity-60 cursor-not-allowed' : ''}`}
                                            />
                                        </div>
                                        {!editingJudge && (
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Senha Provisória</label>
                                                <input
                                                    value={newJudgeForm.password}
                                                    onChange={e => setNewJudgeForm({ ...newJudgeForm, password: e.target.value })}
                                                    type="text"
                                                    className="w-full bg-gray-50 border border-gray-300 text-k9-black p-3 rounded focus:outline-none focus:border-k9-orange focus:ring-1 focus:ring-k9-orange"
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="flex gap-4">
                                    <button onClick={() => { setShowAddJudge(false); setEditingJudge(null); }} className="flex-1 px-6 py-3 text-sm font-bold uppercase tracking-wider rounded-lg border-2 bg-gray-100 text-k9-black border-gray-200 transition-all">Cancelar</button>
                                    <button onClick={handleAddJudge} className="flex-1 px-6 py-3 text-sm font-black uppercase tracking-wider rounded-lg border-2 bg-white text-k9-black border-gray-200 hover:bg-gray-100 transition-all">
                                        {editingJudge ? 'Atualizar' : 'Salvar'}
                                    </button>
                                </div>
                            </div>
                        </Modal>
                    </div>
                )}

            </div>
        </div>
    );
}
