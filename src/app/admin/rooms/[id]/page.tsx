'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Room, Competitor, TestTemplate, ScoreGroup, PenaltyOption, ScoreOption, AppUser, Modality, INITIAL_MODALITIES, Evaluation, ModalityConfig, EditScoreRequest } from '@/types/schema';
import { getRoomById, getCompetitorsByRoom, getTestTemplates, addCompetitor, updateCompetitor, deleteCompetitor, createTestTemplate, updateTestTemplate, deleteTestTemplate, getJudgesList, addJudgeToRoom, removeJudgeFromRoom, updateJudgeTestAssignments, updateJudgeModalityAssignments, getModalities, setJudgeReserve, setJudgeReserveModalities, activateReserve, deactivateReserve } from '@/services/adminService';
import { getEvaluationsByRoom, setDidNotParticipate, deleteEvaluation, getEditScoreRequestsByRoom, respondToEditScoreRequest } from '@/services/evaluationService';
import { createJudgeByAdmin, updateUser } from '@/services/userService';
import Modal from '@/components/Modal';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '@/components/LanguageSwitcher';
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
    Gavel,
    Camera,
    LogOut,
    Trophy,
    CheckCircle2,
    AlertCircle,
    Bell,
    BellOff,
    Zap,
    Check,
    ArrowRight,
    Eye,
    EyeOff,
    Clock,
    CheckCircle,
    XCircle,
    Send
} from 'lucide-react';
import { CldUploadWidget } from 'next-cloudinary';

export default function RoomDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const { t } = useTranslation();
    const roomId = params.id as string;

    const [room, setRoom] = useState<Room | null>(null);
    const [loading, setLoading] = useState(true);

    const handleLogout = async () => {
        const { signOut } = await import('firebase/auth');
        await signOut(auth);
        router.push('/secret-access');
    };
    const [activeTab, setActiveTab] = useState<'competitors' | 'tests' | 'judges' | 'rankings'>('competitors');
    const [compToMarkNC, setCompToMarkNC] = useState<{ test: TestTemplate, comp: Competitor } | null>(null);
    const [evalToDelete, setEvalToDelete] = useState<{ id: string, name: string, testTitle: string, isNC: boolean, photoUrl?: string } | null>(null);
    const [allJudges, setAllJudges] = useState<AppUser[]>([]);

    // Data Lists
    const [competitors, setCompetitors] = useState<Competitor[]>([]);
    const [tests, setTests] = useState<TestTemplate[]>([]);
    const [evaluations, setEvaluations] = useState<Evaluation[]>([]);

    // Forms State
    const [showAddCompetitor, setShowAddCompetitor] = useState(false);
    const [editingCompetitorId, setEditingCompetitorId] = useState<string | null>(null);
    const [compForm, setCompForm] = useState({ handlerName: '', dogName: '', dogBreed: '', photoUrl: '', modality: '' as Modality | '' });
    const [selectedCompetitorTestIds, setSelectedCompetitorTestIds] = useState<string[]>([]);

    // Test Form State
    const [showAddTest, setShowAddTest] = useState(false);
    const [scoreItems, setScoreItems] = useState<ScoreOption[]>([]);
    const [penaltyItems, setPenaltyItems] = useState<PenaltyOption[]>([]);
    const [templateTitle, setTemplateTitle] = useState('');
    const [selectedModality, setSelectedModality] = useState<Modality | ''>('');
    const [genMsg, setGenMsg] = useState('');
    const [editingTestId, setEditingTestId] = useState<string | null>(null);

    // Judge Form State
    const [showAddJudge, setShowAddJudge] = useState(false);
    const [judgeMode, setJudgeMode] = useState<'existing' | 'new'>('existing');
    const [selectedJudgeId, setSelectedJudgeId] = useState('');
    const [newJudgeForm, setNewJudgeForm] = useState({ name: '', email: '', password: '' });
    const [showJudgePassword, setShowJudgePassword] = useState(false);
    const [editingJudge, setEditingJudge] = useState<AppUser | null>(null);
    const [modalities, setModalities] = useState<Modality[]>([]);
    const [selectedModalities, setSelectedModalities] = useState<Modality[]>([]);
    const [user, setUser] = useState<any>(null);

    // Deletion Modal State
    const [itemToDelete, setItemToDelete] = useState<{ id: string, name: string, type: 'competitor' | 'test' | 'judge' } | null>(null);

    // Edit Score Requests
    const [editRequests, setEditRequests] = useState<EditScoreRequest[]>([]);

    const loadRoomData = useCallback(async () => {
        try {
            const r = await getRoomById(roomId);
            setRoom(r);

            const [c, t, j, e, er] = await Promise.all([
                getCompetitorsByRoom(roomId),
                getTestTemplates(roomId),
                getJudgesList(),
                getEvaluationsByRoom(roomId),
                getEditScoreRequestsByRoom(roomId)
            ]);
            setCompetitors(c);
            setTests(t);
            setAllJudges(j);
            setEvaluations(e);
            setEditRequests(er);
        } catch (err) {
            console.error("Failed to load room", err);
        } finally {
            setLoading(false);
        }
    }, [roomId]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (!currentUser) {
                router.push('/secret-access');
            } else {
                setUser(currentUser);
            }
        });
        return () => unsubscribe();
    }, [router]);

    useEffect(() => {
        if (!roomId) return;

        let unsubRoom: (() => void) | undefined;
        let unsubCompetitors: (() => void) | undefined;
        let unsubTests: (() => void) | undefined;
        let unsubEvaluations: (() => void) | undefined;

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

                const qEval = query(collection(db, 'evaluations'), where('roomId', '==', roomId));
                unsubEvaluations = onSnapshot(qEval, (snap) => {
                    setEvaluations(snap.docs.map(d => ({ id: d.id, ...d.data() } as Evaluation)));
                }, (err) => console.error('evaluations snapshot error', err));

                const fetchedModalities = await getModalities();
                setModalities(fetchedModalities.length > 0 ? fetchedModalities.map(m => m.name) : INITIAL_MODALITIES);

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
            if (unsubEvaluations) unsubEvaluations();
        };
    }, [roomId, loadRoomData]);

    // Competitor Actions
    const handleEditCompetitor = (comp: Competitor) => {
        setCompForm({
            handlerName: comp.handlerName,
            dogName: comp.dogName,
            dogBreed: comp.dogBreed,
            photoUrl: comp.photoUrl || '',
            modality: comp.modality || ''
        });
        const testIds = comp.testIds || (comp.testId ? [comp.testId] : []);
        setSelectedCompetitorTestIds(testIds);
        setEditingCompetitorId(comp.id);
        setShowAddCompetitor(true);
    };

    const saveCompetitor = async () => {
        if (!compForm.handlerName || !compForm.dogName || !compForm.modality) {
            alert(t('admin.competitors.requiredFields'));
            return;
        }
        console.log('Saving competitor with form data:', compForm);
        try {
            if (editingCompetitorId) {
                await updateCompetitor(editingCompetitorId, {
                    handlerName: compForm.handlerName,
                    dogName: compForm.dogName,
                    dogBreed: compForm.dogBreed,
                    modality: compForm.modality as Modality,
                    photoUrl: compForm.photoUrl
                });
            } else {
                await addCompetitor({
                    roomId,
                    handlerName: compForm.handlerName,
                    dogName: compForm.dogName,
                    dogBreed: compForm.dogBreed,
                    modality: compForm.modality as Modality,
                    competitorNumber: Math.floor(Math.random() * 900) + 100,
                    photoUrl: compForm.photoUrl
                });
            }
            // Reset
            setCompForm({ handlerName: '', dogName: '', dogBreed: '', photoUrl: '', modality: '' });
            setSelectedCompetitorTestIds([]);
            setEditingCompetitorId(null);
            setShowAddCompetitor(false);
            loadRoomData();
        } catch (err) {
            console.error(err);
            alert(t('admin.competitors.saveError'));
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

        const allItems = test.groups.flatMap(g => g.items);

        setScoreItems(allItems);
        setPenaltyItems(test.penalties || []);
        setEditingTestId(test.id);
        setShowAddTest(true);
    };

    const saveTest = async () => {
        if (!selectedModality) {
            setGenMsg(t('admin.tests.savePenaltyError'));
            return;
        }

        try {
            const groups: ScoreGroup[] = [
                { name: "Critérios de Avaliação", items: scoreItems }
            ];

            if (editingTestId) {
                const currentTest = tests.find(t => t.id === editingTestId);
                let testNumber = currentTest?.testNumber;

                if (currentTest?.modality !== selectedModality) {
                    testNumber = tests.filter(t => t.modality === selectedModality).length + 1;
                }

                await updateTestTemplate(editingTestId as string, {
                    title: templateTitle || "Nova Prova",
                    modality: selectedModality,
                    maxScore: totalScore,
                    groups,
                    penalties: penaltyItems,
                    testNumber
                });
            } else {
                const testNumber = tests.filter(t => t.modality === selectedModality).length + 1;
                await createTestTemplate({
                    title: templateTitle || "Nova Prova",
                    modality: selectedModality,
                    description: "Prova Unificada",
                    maxScore: totalScore,
                    groups,
                    penalties: penaltyItems,
                    roomId,
                    testNumber
                });
            }

            // Reset
            setScoreItems([]);
            setPenaltyItems([]);
            setTemplateTitle('');
            setSelectedModality('');
            setEditingTestId(null);
            setShowAddTest(false);
            loadRoomData();
        } catch (e) {
            console.error(e);
            setGenMsg(t('admin.tests.saveError'));
        }
    };

    // Judge Actions
    const handleEditJudge = (judge: AppUser) => {
        setEditingJudge(judge);
        setNewJudgeForm({
            name: judge.name,
            email: judge.email,
            password: ''
        });
        const currentModalities = room?.judgeModalities?.[judge.uid] || [];
        setSelectedModalities(currentModalities as Modality[]);
        setJudgeMode('new');
        setShowAddJudge(true);
    };

    const handleAddJudge = async () => {
        try {
            if (editingJudge) {
                if (!newJudgeForm.name) return alert(t('admin.judges.nameRequired'));
                await updateUser(editingJudge.uid, { name: newJudgeForm.name });
                await updateJudgeModalityAssignments(roomId, editingJudge.uid, selectedModalities);
            } else {
                if (judgeMode === 'existing') {
                    if (!selectedJudgeId) return alert(t('admin.judges.selectJudgeRequired'));
                    await addJudgeToRoom(roomId, selectedJudgeId);
                    await updateJudgeModalityAssignments(roomId, selectedJudgeId, []);
                } else {
                    if (!newJudgeForm.name || !newJudgeForm.email || !newJudgeForm.password) return alert(t('admin.judges.allFieldsRequired'));
                    const newUid = await createJudgeByAdmin(newJudgeForm.email, newJudgeForm.password, newJudgeForm.name);
                    await addJudgeToRoom(roomId, newUid);
                    await updateJudgeModalityAssignments(roomId, newUid, []);
                }
            }

            // Reset
            setShowAddJudge(false);
            setNewJudgeForm({ name: '', email: '', password: '' });
            setSelectedJudgeId('');
            setEditingJudge(null);
            setSelectedModalities([]);
            loadRoomData();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            alert(msg || t('admin.judges.saveError'));
        }
    };

    const handleDeleteCompetitor = (id: string, name: string) => {
        setItemToDelete({ id, name, type: 'competitor' });
    };

    const handleDeleteTest = (id: string, name: string) => {
        setItemToDelete({ id, name, type: 'test' });
    };

    const handleRemoveJudgeRequest = (uid: string, name: string) => {
        setItemToDelete({ id: uid, name, type: 'judge' });
    };

    const confirmDeletion = async () => {
        if (!itemToDelete) return;
        try {
            if (itemToDelete.type === 'competitor') {
                await deleteCompetitor(itemToDelete.id);
            } else if (itemToDelete.type === 'test') {
                await deleteTestTemplate(itemToDelete.id);
            } else if (itemToDelete.type === 'judge') {
                await removeJudgeFromRoom(roomId, itemToDelete.id);
            }
            setItemToDelete(null);
            loadRoomData();
        } catch (err) {
            console.error(err);
            alert(`Erro ao remover ${itemToDelete.type}`);
        }
    };

    if (loading) return <div className="min-h-screen bg-k9-white flex items-center justify-center text-k9-orange font-mono">{t('admin.loading')}</div>;
    if (!room) return <div className="p-8 text-k9-black">{t('admin.roomNotFound')}</div>;

    return (
        <div className="min-h-screen bg-k9-white text-k9-black">
            {/* Header */}
            <div className="bg-black border-b-4 border-k9-orange text-white shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-k9-orange/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
                <div className="max-w-6xl mx-auto px-6 py-8 relative z-10">
                    <button onClick={() => router.push('/admin')} className="inline-flex items-center gap-2 px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-md bg-gray-900 text-gray-400 border border-gray-700 hover:bg-gray-800 hover:text-white transition-colors cursor-pointer mb-6">
                        <ArrowLeft className="w-4 h-4" /> {t('admin.back')}
                    </button>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-4xl font-black text-white uppercase tracking-tighter flex items-center gap-4">
                                <div className="w-12 h-12 relative flex items-center justify-center">
                                    <img src="/logo.png" alt="Logo" className="object-contain w-full h-full" />
                                </div>
                                {room.name}
                            </h1>
                            <div className="flex items-center gap-4 mt-3">
                                <span className="text-xs font-mono text-k9-orange bg-orange-900/20 px-3 py-1 rounded border border-orange-900/50">ID: {room.id}</span>
                                <span className={`text-xs font-bold uppercase flex items-center gap-2 px-3 py-1 rounded-full border ${room.active ? 'bg-green-900/20 text-green-400 border-green-900/30' : 'bg-red-900/20 text-red-400 border-red-900/30'}`}>
                                    <div className={`w-2 h-2 rounded-full ${room.active ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                                    {room.active ? t('admin.active') : t('admin.finished')}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 relative z-10">
                            <LanguageSwitcher />
                            <button
                                onClick={handleLogout}
                                className="text-white hover:text-red-400 text-xs font-bold uppercase flex items-center gap-2 transition-colors border border-gray-700 bg-gray-900 px-4 py-3 rounded-lg hover:border-red-500/50 hover:bg-red-900/10 shadow-sm"
                            >
                                <LogOut className="w-4 h-4" /> {t('admin.logout')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Actions */}
            <div className="max-w-6xl mx-auto p-6 md:p-8 bg-gray-50 rounded-xl mt-6 mb-12 md:mt-8 md:mb-16">

                {/* === MOVED: SEÇÃO DE SOLICITAÇÕES DE EDIÇÃO DE NOTA (Sempre visível se houver pendentes) === */}
                {editRequests.filter(r => r.status === 'pending').length > 0 && (
                    <div className="mb-8 bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-6 shadow-md border-l-8 border-l-amber-400">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center shadow-sm animate-pulse">
                                <Send className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-k9-black uppercase tracking-tighter">{t('admin.editRequests.title')}</h3>
                                <p className="text-[10px] font-bold text-amber-600 uppercase">{editRequests.filter(r => r.status === 'pending').length} {t('admin.editRequests.pending')}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {editRequests.filter(r => r.status === 'pending').map(req => {
                                const comp = competitors.find(c => c.id === req.competitorId);
                                const test = tests.find(t => t.id === req.testId);
                                const eval_ = evaluations.find(e => e.id === req.evaluationId);

                                return (
                                    <div key={req.id} className="bg-white rounded-xl border border-amber-100 p-4 shadow-sm hover:shadow-md transition-all">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-start gap-3 flex-1 min-w-0">
                                                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center font-black text-orange-600 text-sm border border-orange-200 overflow-hidden shrink-0">
                                                    {comp?.photoUrl ? (
                                                        <img src={comp.photoUrl} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        (comp?.handlerName || '??').substring(0, 2).toUpperCase()
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-black text-k9-black uppercase text-sm truncate">{comp?.handlerName || 'Competidor'}</div>
                                                    <div className="text-[10px] text-gray-400 font-bold uppercase">{t('admin.editRequests.test')}: {test?.title || 'Prova'}</div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[10px] font-black text-amber-600 uppercase bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                                                            <Clock className="w-3 h-3" /> {t('admin.editRequests.judge')}: {req.judgeName}
                                                        </span>
                                                        {eval_ && (
                                                            <span className="text-[10px] font-black text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                                                                {t('admin.editRequests.score')}: {eval_.finalScore.toFixed(1)} pts
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-100">
                                                        <span className="text-[9px] font-black text-gray-400 uppercase block mb-0.5">{t('admin.editRequests.reason')}:</span>
                                                        {req.reason}
                                                    </div>
                                                    <div className="text-[9px] text-gray-300 font-mono mt-1">
                                                        {new Date(req.createdAt).toLocaleString('pt-BR')}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-2 shrink-0">
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            await respondToEditScoreRequest(req.id, 'approved', user?.uid || 'admin');
                                                            loadRoomData();
                                                        } catch (err) {
                                                            console.error(err);
                                                            alert(t('admin.editRequests.errorApprove'));
                                                        }
                                                    }}
                                                    className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-black uppercase rounded-lg bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-all cursor-pointer shadow-sm"
                                                    title={t('admin.editRequests.approve')}
                                                >
                                                    <CheckCircle className="w-4 h-4" /> {t('admin.editRequests.approve')}
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            await respondToEditScoreRequest(req.id, 'rejected', user?.uid || 'admin');
                                                            loadRoomData();
                                                        } catch (err) {
                                                            console.error(err);
                                                            alert(t('admin.editRequests.errorReject'));
                                                        }
                                                    }}
                                                    className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-black uppercase rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-all cursor-pointer shadow-sm"
                                                    title={t('admin.editRequests.reject')}
                                                >
                                                    <XCircle className="w-4 h-4" /> {t('admin.editRequests.reject')}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex gap-2 mb-8">
                    <button
                        onClick={() => setActiveTab('tests')}
                        className={`px-3 py-2 text-xs font-black uppercase tracking-wider rounded-md flex items-center gap-2 transition-all border-2 cursor-pointer ${activeTab === 'tests' ? 'bg-orange-400 text-white border-orange-400 shadow-md scale-105' : 'bg-orange-50 text-orange-400 border-orange-100 hover:bg-orange-100 hover:text-orange-500'}`}
                    >
                        <FileText className="w-4 h-4" /> {t('admin.tabs.tests')} ({tests.length})
                    </button>

                    <button
                        onClick={() => setActiveTab('competitors')}
                        className={`px-3 py-2 text-xs font-black uppercase tracking-wider rounded-md flex items-center gap-2 transition-all border-2 cursor-pointer ${activeTab === 'competitors' ? 'bg-orange-400 text-white border-orange-400 shadow-md scale-105' : 'bg-orange-50 text-orange-400 border-orange-100 hover:bg-orange-100 hover:text-orange-500'}`}
                    >
                        <Users className="w-4 h-4" /> {t('admin.tabs.competitors')} ({competitors.length})
                    </button>

                    <button
                        onClick={() => setActiveTab('judges')}
                        className={`px-3 py-2 text-xs font-black uppercase tracking-wider rounded-md flex items-center gap-2 transition-all border-2 cursor-pointer ${activeTab === 'judges' ? 'bg-orange-400 text-white border-orange-400 shadow-md scale-105' : 'bg-orange-50 text-orange-400 border-orange-100 hover:bg-orange-100 hover:text-orange-500'}`}
                    >
                        <ShieldCheck className="w-4 h-4" /> {t('admin.tabs.judges')} ({room?.judges?.length || 0})
                    </button>

                    <button
                        onClick={() => setActiveTab('rankings')}
                        className={`px-3 py-2 text-xs font-black uppercase tracking-wider rounded-md flex items-center gap-2 transition-all border-2 cursor-pointer relative ${activeTab === 'rankings' ? 'bg-orange-400 text-white border-orange-400 shadow-md scale-105' : 'bg-orange-50 text-orange-400 border-orange-100 hover:bg-orange-100 hover:text-orange-500'}`}
                    >
                        <Trophy className="w-4 h-4" /> {t('admin.tabs.results')}
                        {editRequests.filter(r => r.status === 'pending').length > 0 && (
                            <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center animate-pulse shadow-lg">
                                {editRequests.filter(r => r.status === 'pending').length}
                            </span>
                        )}
                    </button>
                </div>

                {activeTab === 'competitors' && (
                    <div>
                        <div className="flex justify-end mb-6">
                            <button
                                onClick={() => {
                                    setEditingCompetitorId(null);
                                    setCompForm({ handlerName: '', dogName: '', dogBreed: '', photoUrl: '', modality: '' });
                                    setSelectedCompetitorTestIds([]);
                                    setShowAddCompetitor(true);
                                }}
                                className={`px-4 py-2 text-sm font-black uppercase tracking-wider rounded-lg border-2 transition-all duration-200 shadow-sm flex items-center gap-2 bg-green-50 text-green-700 border-green-100 hover:bg-green-100`}
                            >
                                <Plus className="w-4 h-4 text-green-700" /> {t('admin.competitors.addNew')}
                            </button>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {competitors.map(comp => {
                                const testCount = tests.filter(t => t.modality === comp.modality).length;

                                return (
                                    <div key={comp.id} className="bg-white border border-gray-100 p-5 pl-8 rounded-2xl hover:shadow-lg transform hover:-translate-y-1 transition-all flex items-start justify-between gap-6 group min-h-[130px]">
                                        <div className="flex items-start gap-4 flex-1 min-w-0">
                                            <div className="w-14 h-14 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center font-extrabold shadow-sm overflow-hidden border border-orange-100 shrink-0">
                                                {comp.photoUrl ? (
                                                    <img src={comp.photoUrl} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-sm">{comp.handlerName.substring(0, 2).toUpperCase()}</span>
                                                )}
                                            </div>
                                            <div className="flex-1 pt-0.5 min-w-0">
                                                <div className="font-black text-k9-black uppercase text-sm leading-tight truncate">{comp.handlerName}</div>
                                                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">{t('admin.competitors.handler')}</div>
                                                <div className="text-xs text-k9-orange font-mono uppercase mt-1 font-bold truncate">{t('admin.competitors.dog')}: {comp.dogName}</div>
                                                <div className="flex flex-col gap-1.5 mt-3">
                                                    {modalities.includes(comp.modality) && (
                                                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-green-50 text-green-700 border border-green-100 inline-block">
                                                            {comp.modality}
                                                        </span>
                                                    )}
                                                    <div className="flex items-center">
                                                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded inline-block ${testCount > 0 ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-gray-50 text-gray-400 border border-gray-200'}`}>
                                                            {testCount > 0 ? `${testCount} ${testCount === 1 ? t('admin.competitors.withTest') : t('admin.competitors.withTests')}` : t('admin.competitors.noTests')}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2 pt-0.5 shrink-0">
                                            <button
                                                onClick={() => handleEditCompetitor(comp)}
                                                className="inline-flex items-center justify-center w-8 h-8 bg-gray-50 border border-gray-100 rounded-lg text-gray-400 hover:text-orange-500 hover:bg-orange-50 transition-colors shadow-sm"
                                                title="Editar"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteCompetitor(comp.id, comp.handlerName)}
                                                className="inline-flex items-center justify-center w-8 h-8 bg-gray-50 border border-gray-100 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer shadow-sm"
                                                title="Remover Competidor"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                            {competitors.length === 0 && <div className="text-gray-500 col-span-full text-center py-8">{t('admin.competitors.noCompetitors')}</div>}
                        </div>

                        <Modal
                            isOpen={showAddCompetitor}
                            onClose={() => { setShowAddCompetitor(false); setEditingCompetitorId(null); }}
                            title={<div className="flex items-center gap-2 text-green-700"><UserPlus className="w-5 h-5" /> {editingCompetitorId ? t('admin.competitors.edit') : t('admin.competitors.newRegistration')}</div>}
                            maxWidth="max-w-xl"
                        >
                            <div className="space-y-4">
                                <div className="flex flex-col items-center mb-6">
                                    <div className="w-24 h-24 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden relative group shadow-inner">
                                        {compForm.photoUrl ? (
                                            <img key={compForm.photoUrl} src={compForm.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <Camera className="w-8 h-8 text-gray-300" />
                                        )}
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 z-10">
                                            <CldUploadWidget
                                                uploadPreset="torneiok9"
                                                onSuccess={(result, { widget }) => {
                                                    if (result?.info && typeof result.info !== 'string') {
                                                        const url = result.info.secure_url;
                                                        setCompForm(prev => ({ ...prev, photoUrl: url }));
                                                    }
                                                }}
                                            >
                                                {({ open }) => (
                                                    <button
                                                        type="button"
                                                        onClick={() => open()}
                                                        className="text-[9px] font-black uppercase text-white hover:text-k9-orange transition-colors cursor-pointer"
                                                    >
                                                        {compForm.photoUrl ? t('admin.competitors.changePhoto') : t('admin.competitors.uploadPhoto')}
                                                    </button>
                                                )}
                                            </CldUploadWidget>
                                            {compForm.photoUrl && (
                                                <button
                                                    type="button"
                                                    onClick={() => setCompForm(prev => ({ ...prev, photoUrl: '' }))}
                                                    className="text-[9px] font-black uppercase text-red-400 hover:text-red-500 transition-colors cursor-pointer border-t border-white/20 pt-1 w-full"
                                                >
                                                    {t('admin.competitors.removePhoto')}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-2 uppercase font-bold tracking-tighter">{t('admin.competitors.photoLabel')}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">{t('admin.competitors.handlerName')}</label>
                                        <input
                                            placeholder={t('admin.competitors.handlerName')}
                                            value={compForm.handlerName}
                                            onChange={e => setCompForm({ ...compForm, handlerName: e.target.value })}
                                            className="w-full bg-gray-50 border border-gray-300 text-k9-black p-3 rounded focus:outline-none focus:border-k9-orange focus:ring-1 focus:ring-k9-orange font-semibold"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">{t('admin.competitors.dogName')}</label>
                                        <input
                                            placeholder={t('admin.competitors.dogName')}
                                            value={compForm.dogName}
                                            onChange={e => setCompForm({ ...compForm, dogName: e.target.value })}
                                            className="w-full bg-gray-50 border border-gray-300 text-k9-black p-3 rounded focus:outline-none focus:border-k9-orange focus:ring-1 focus:ring-k9-orange font-semibold"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">{t('admin.competitors.breed')}</label>
                                        <input
                                            placeholder={t('admin.competitors.breed')}
                                            value={compForm.dogBreed}
                                            onChange={e => setCompForm({ ...compForm, dogBreed: e.target.value })}
                                            className="w-full bg-gray-50 border border-gray-300 text-k9-black p-3 rounded focus:outline-none focus:border-k9-orange focus:ring-1 focus:ring-k9-orange font-semibold"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">{t('admin.competitors.modalityLabel')}</label>
                                        <select
                                            value={compForm.modality}
                                            onChange={e => setCompForm({ ...compForm, modality: e.target.value as Modality })}
                                            className="w-full bg-gray-50 border border-gray-300 text-k9-black p-3 rounded focus:outline-none focus:border-k9-orange focus:ring-1 focus:ring-k9-orange font-semibold"
                                        >
                                            <option value="">{t('admin.competitors.selectModality')}</option>
                                            {modalities.map(m => (
                                                <option key={m} value={m}>{m}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Test Selection (Optional/Override) */}
                                <div className="hidden">
                                    <label className="text-xs font-bold text-gray-500 uppercase block mb-3">Provas Atribuídas (Manual)</label>
                                    {/* Mantido invisível por agora conforme nova regra de modalidade */}
                                </div>
                                <div className="flex gap-4 pt-6 mt-4 border-t border-gray-100">
                                    <button onClick={() => { setShowAddCompetitor(false); setEditingCompetitorId(null); }} className="flex-1 px-6 py-3 text-sm font-bold uppercase tracking-wider rounded-lg border-2 bg-gray-50 text-gray-400 border-gray-100 transition-all hover:bg-gray-100">{t('admin.competitors.cancel')}</button>
                                    <button onClick={saveCompetitor} className="flex-1 px-6 py-3 text-sm font-black uppercase tracking-wider rounded-lg border-2 bg-green-600 text-white border-green-600 hover:bg-green-700 transition-all shadow-md active:scale-95">
                                        {editingCompetitorId ? t('admin.competitors.update') : t('admin.competitors.save')}
                                    </button>
                                </div>
                            </div>
                        </Modal>
                    </div>
                )}

                {/* TESTS VIEW */}
                {activeTab === 'tests' && (
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <button
                                onClick={async () => {
                                    if (!confirm(t('admin.tests.autoNumberConfirm'))) return;
                                    try {
                                        const grouped: Record<string, TestTemplate[]> = {};
                                        tests.forEach(t => {
                                            const mod = t.modality || 'SEM_MODALIDADE';
                                            if (!grouped[mod]) grouped[mod] = [];
                                            grouped[mod].push(t);
                                        });

                                        for (const mod in grouped) {
                                            const modTests = grouped[mod];
                                            for (let i = 0; i < modTests.length; i++) {
                                                await updateTestTemplate(modTests[i].id, {
                                                    ...modTests[i],
                                                    testNumber: i + 1
                                                });
                                            }
                                        }
                                        alert(t('admin.tests.autoNumberSuccess'));
                                        loadRoomData();
                                    } catch (err) {
                                        console.error(err);
                                        alert(t('admin.tests.autoNumberError'));
                                    }
                                }}
                                className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg border-2 border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition-all flex items-center gap-2"
                            >
                                <ShieldCheck className="w-4 h-4" /> {t('admin.tests.autoNumber')}
                            </button>

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
                                <Wand2 className="w-4 h-4 text-purple-700" /> {t('admin.tests.create')}
                            </button>
                        </div>

                        <div className="space-y-4">
                            {[...tests].sort((a, b) => {
                                if (a.modality !== b.modality) return (a.modality || '').localeCompare(b.modality || '');
                                return (a.testNumber || 0) - (b.testNumber || 0);
                            }).map(test => (
                                <div key={test.id} className="bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-md transition-all flex justify-between items-center group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-gray-900 text-white rounded-lg flex items-center justify-center font-black text-sm shrink-0 border border-gray-800 shadow-sm">
                                            {test.testNumber ? test.testNumber.toString().padStart(2, '0') : '--'}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-k9-black uppercase">{test.title}</h3>
                                            <div className="text-[10px] text-gray-400 mt-1 flex gap-2 font-bold items-center">
                                                <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-600 uppercase tracking-tighter">{test.modality}</span>
                                                <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                                <span className="text-gray-400">{t('admin.tests.maxScore')}: {test.maxScore} {t('admin.tests.pts')}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => editTest(test)}
                                            className="p-2 bg-gray-50 rounded-md text-gray-400 hover:bg-orange-50 hover:text-orange-500 transition-colors cursor-pointer"
                                            title="Editar Prova"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteTest(test.id, test.title)}
                                            className="p-2 bg-gray-50 rounded-md text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors cursor-pointer"
                                            title="Excluir Prova"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                        <div className="px-3 py-1 bg-orange-50 text-orange-600 text-xs font-bold rounded uppercase border border-orange-100">
                                            {t('admin.tests.active')}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {tests.length === 0 && <div className="text-gray-500 text-center py-8">{t('admin.tests.noTests')}</div>}
                        </div>

                        <Modal
                            isOpen={showAddTest}
                            onClose={() => { setShowAddTest(false); setEditingTestId(null); }}
                            title={<div className="flex items-center gap-2"><Wand2 className="text-police-gold w-5 h-5" /> {editingTestId ? t('admin.tests.editTitle') : t('admin.tests.createTitle')}</div>}
                            maxWidth="max-w-2xl"
                        >
                            <div className="">
                                <div className="mb-6">
                                    <label className="text-xs font-bold text-gray-500 uppercase">{t('admin.tests.title')}</label>
                                    <input
                                        value={templateTitle}
                                        onChange={e => setTemplateTitle(e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-300 text-k9-black p-3 rounded focus:outline-none focus:border-k9-orange focus:ring-1 focus:ring-k9-orange mt-1"
                                        placeholder={t('admin.tests.titlePlaceholder')}
                                    />
                                </div>

                                <div className="mb-6">
                                    <label className="text-xs font-bold text-gray-500 uppercase">{t('admin.tests.modality')}</label>
                                    <select
                                        value={selectedModality}
                                        onChange={e => setSelectedModality(e.target.value as Modality)}
                                        className="w-full bg-gray-50 border border-gray-300 text-k9-black p-3 rounded focus:outline-none focus:border-k9-orange focus:ring-1 focus:ring-k9-orange mt-1"
                                    >
                                        <option value="">{t('admin.tests.selectModality')}</option>
                                        {modalities.map(m => (
                                            <option key={m} value={m}>{m}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Evaluation Items */}
                                <div className="mb-6 p-4 bg-gray-50 rounded border border-gray-200">
                                    <div className="flex justify-between mb-2">
                                        <h3 className="text-sm font-bold text-k9-black uppercase">{t('admin.tests.criteria')}</h3>
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
                                        {scoreItems.length === 0 && <div className="text-xs text-gray-400 font-mono text-center">{t('admin.tests.noCriteria')}</div>}
                                    </div>
                                    <div className="flex gap-2">
                                        <input id="score-lbl" placeholder={t('admin.tests.criteriaPlaceholder')} className="flex-1 bg-gray-50 border border-gray-300 text-k9-black text-xs p-2 rounded" />
                                        <input id="score-pts" placeholder={t('admin.tests.ptsPh')} type="number" step="0.5" defaultValue={10} className="w-16 bg-gray-50 border border-gray-300 text-k9-black text-xs p-2 rounded" />
                                        <button
                                            onClick={() => {
                                                const lblEl = document.getElementById('score-lbl') as HTMLInputElement;
                                                const ptsEl = document.getElementById('score-pts') as HTMLInputElement;
                                                const l = lblEl.value;
                                                const p = parseFloat(ptsEl.value) || 10;
                                                if (l) {
                                                    addScoreItem(l, p);
                                                    lblEl.value = '';
                                                    lblEl.focus();
                                                }
                                            }}
                                            className="bg-gray-100 text-k9-black px-3 rounded text-xs uppercase font-bold cursor-pointer"
                                        >{t('admin.tests.add')}</button>
                                    </div>
                                </div>

                                {/* Penalty Items */}
                                <div className="mb-6 p-4 bg-red-50 rounded border border-red-100">
                                    <div className="flex justify-between mb-2">
                                        <h3 className="text-sm font-bold text-red-900 uppercase">{t('admin.tests.penalties')}</h3>
                                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded text-red-600 bg-white border border-red-100">{penaltyItems.length} {t('admin.tests.items')}</span>
                                    </div>
                                    <div className="space-y-2 mb-3">
                                        {penaltyItems.map((item, i) => (
                                            <div key={i} className="flex justify-between items-center text-xs bg-white p-2 rounded border border-red-100">
                                                <span className="text-red-900 font-bold">{item.label}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-red-600 font-mono font-bold">{item.value} pts</span>
                                                    <button
                                                        onClick={() => setPenaltyItems(penaltyItems.filter((_, idx) => idx !== i))}
                                                        className="text-red-400 hover:text-red-600 cursor-pointer"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        {penaltyItems.length === 0 && <div className="text-xs text-red-400 font-mono text-center py-2">{t('admin.tests.noPenalties')}</div>}
                                    </div>
                                    <div className="flex gap-2">
                                        <input id="penalty-lbl" placeholder={t('admin.tests.penaltyPlaceholder')} className="flex-1 bg-white border border-red-200 text-k9-black text-xs p-2 rounded" />
                                        <input id="penalty-pts" placeholder="Pts" type="number" step="0.5" defaultValue={-2.0} className="w-16 bg-white border border-red-200 text-red-600 text-xs p-2 rounded font-bold" />
                                        <button
                                            onClick={() => {
                                                const l = (document.getElementById('penalty-lbl') as HTMLInputElement).value;
                                                const v = parseFloat((document.getElementById('penalty-pts') as HTMLInputElement).value);
                                                if (l && !isNaN(v)) {
                                                    setPenaltyItems([...penaltyItems, { id: `penalty-${Date.now()}`, label: l, value: v }]);
                                                    (document.getElementById('penalty-lbl') as HTMLInputElement).value = '';
                                                    (document.getElementById('penalty-pts') as HTMLInputElement).value = '-2.0';
                                                }
                                            }}
                                            className="bg-red-100 text-red-700 px-3 rounded text-xs uppercase font-black cursor-pointer hover:bg-red-200 transition-colors"
                                        >Add</button>
                                    </div>
                                </div>

                                {genMsg && <div className="text-red-400 text-xs font-mono mb-4">{genMsg}</div>}

                                <div className="flex gap-4">
                                    <button onClick={() => { setShowAddTest(false); setEditingTestId(null); }} className="flex-1 px-6 py-3 text-sm font-bold uppercase tracking-wider rounded-lg border-2 bg-gray-800 text-gray-300 border-gray-700 transition-all">{t('admin.tests.cancel')}</button>
                                    <button
                                        onClick={saveTest}
                                        disabled={!templateTitle || !selectedModality || scoreItems.length === 0}
                                        className="flex-1 px-6 py-3 text-sm font-black uppercase tracking-wider rounded-lg border-2 bg-white text-black border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        {editingTestId ? t('admin.tests.update') : t('admin.tests.save')}
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
                                <Gavel className="w-4 h-4 text-yellow-700" /> {t('admin.judges.create')}
                            </button>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            {allJudges.filter(j => room?.judges?.includes(j.uid) ?? false).map(j => {
                                const assignedMods = (room?.judgeModalities?.[j.uid] || []).filter(m => modalities.includes(m));
                                const reserveMods: string[] = (room?.judgeReserveModalities?.[j.uid] || []);
                                const isGlobalReserve = !room?.judgeReserveModalities?.[j.uid] && (room?.judgeReserves?.includes(j.uid) ?? false);

                                return (
                                    <div key={j.uid} className={`bg-white border-2 p-4 rounded-2xl hover:shadow-md transition-all ${reserveMods.length > 0 || isGlobalReserve ? 'border-yellow-200 bg-yellow-50/30' : 'border-gray-100'
                                        }`}>
                                        {/* Cabeçalho: nome + email */}
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-k9-black uppercase text-sm">{j.name}</div>
                                                <div className="text-xs text-gray-400 font-mono mt-0.5">{j.email}</div>
                                            </div>
                                            {/* Botões de ação */}
                                            <div className="flex gap-2 shrink-0">
                                                <button
                                                    onClick={() => handleEditJudge(j)}
                                                    className="inline-flex items-center justify-center w-8 h-8 bg-white border border-gray-100 rounded-md text-gray-400 hover:text-orange-500 hover:bg-orange-50 transition-colors cursor-pointer"
                                                    title="Editar"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleRemoveJudgeRequest(j.uid, j.name)}
                                                    className="inline-flex items-center justify-center w-8 h-8 bg-white border border-gray-100 rounded-md text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
                                                    title="Remover Juiz desta Sala"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Modalidades atribuídas */}
                                        <div className="flex flex-wrap gap-1.5 mt-3">
                                            {assignedMods.length > 0 ? assignedMods.map(m => {
                                                const isReserveInThisMod = reserveMods.includes(m) || isGlobalReserve;
                                                return (
                                                    <button
                                                        key={m}
                                                        onClick={async () => {
                                                            const newReserveMods = isReserveInThisMod
                                                                ? reserveMods.filter(r => r !== m)
                                                                : [...reserveMods, m];
                                                            await setJudgeReserveModalities(room!.id, j.uid, newReserveMods);
                                                            loadRoomData();
                                                        }}
                                                        title={isReserveInThisMod ? `Promover a Titular em ${m}` : `Marcar como Reserva em ${m}`}
                                                        className={`inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-1 rounded-full border transition-all cursor-pointer ${isReserveInThisMod
                                                            ? 'bg-yellow-100 text-yellow-700 border-yellow-300 hover:bg-yellow-200'
                                                            : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                                                            }`}
                                                    >
                                                        {isReserveInThisMod
                                                            ? <><Zap className="w-2.5 h-2.5" /> Res: {m}</>
                                                            : <><Check className="w-2.5 h-2.5" /> Tit: {m}</>
                                                        }
                                                    </button>
                                                );
                                            }) : (
                                                <span className="text-[10px] font-bold uppercase px-2 py-1 rounded bg-gray-50 text-gray-400 border border-gray-200">
                                                    {t('admin.judges.noModalities')}
                                                </span>
                                            )}
                                        </div>

                                        {/* Legenda */}
                                        {assignedMods.length > 0 && (
                                            <div className="mt-2 text-[8px] text-gray-400 font-bold uppercase">
                                                Clique na modalidade para alternar Titular ↔ Reserva
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            {(!room?.judges || room?.judges.length === 0) && (
                                <div className="col-span-full text-center py-8 text-gray-500">{t('admin.judges.noJudges')}</div>
                            )}
                        </div>

                        <Modal
                            isOpen={showAddJudge}
                            onClose={() => { setShowAddJudge(false); setEditingJudge(null); }}
                            title={<div className="flex items-center gap-2"><Gavel className="text-police-gold w-5 h-5" /> {editingJudge ? t('admin.judges.editTitle') : t('admin.judges.manageTitle')}</div>}
                            maxWidth="max-w-xl"
                        >
                            <div className="">
                                {!editingJudge && (
                                    <div className="flex bg-gray-100 p-1 rounded mb-6">
                                        <button
                                            onClick={() => setJudgeMode('existing')}
                                            className={`flex-1 py-2 text-xs font-bold uppercase rounded ${judgeMode === 'existing' ? 'bg-gray-700 text-white' : 'text-gray-500'}`}
                                        >
                                            {t('admin.judges.selectExisting')}
                                        </button>
                                        <button
                                            onClick={() => setJudgeMode('new')}
                                            className={`flex-1 py-2 text-xs font-bold uppercase rounded ${judgeMode === 'new' ? 'bg-gray-700 text-white' : 'text-gray-500'}`}
                                        >
                                            {t('admin.judges.createNew')}
                                        </button>
                                    </div>
                                )}

                                {judgeMode === 'existing' && !editingJudge ? (
                                    <div className="mb-6">
                                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1">{t('admin.judges.judgeLabel')}</label>
                                        <select
                                            value={selectedJudgeId}
                                            onChange={e => setSelectedJudgeId(e.target.value)}
                                            className="w-full bg-gray-50 border border-gray-300 text-k9-black p-3 rounded focus:outline-none focus:border-k9-orange focus:ring-1 focus:ring-k9-orange"
                                        >
                                            <option value="">{t('admin.judges.selectJudge')}</option>
                                            {allJudges.filter(j => !(room?.judges?.includes(j.uid))).map(j => (
                                                <option key={j.uid} value={j.uid}>{j.name} ({j.email})</option>
                                            ))}
                                        </select>
                                    </div>
                                ) : (
                                    <div className="space-y-4 mb-6">
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">{t('admin.judges.name')}</label>
                                            <input
                                                value={newJudgeForm.name}
                                                onChange={e => setNewJudgeForm({ ...newJudgeForm, name: e.target.value })}
                                                className="w-full bg-gray-50 border border-gray-300 text-k9-black p-3 rounded focus:outline-none focus:border-k9-orange focus:ring-1 focus:ring-k9-orange"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">{t('admin.judges.email')}</label>
                                            <input
                                                value={newJudgeForm.email}
                                                disabled={!!editingJudge}
                                                onChange={e => setNewJudgeForm({ ...newJudgeForm, email: e.target.value })}
                                                className={`w-full bg-gray-50 border border-gray-300 text-k9-black p-3 rounded focus:outline-none focus:border-k9-orange focus:ring-1 focus:ring-k9-orange ${editingJudge ? 'opacity-60 cursor-not-allowed' : ''}`}
                                            />
                                        </div>
                                        {!editingJudge && (
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">{t('admin.judges.provisionalPassword')}</label>
                                                <div className="relative">
                                                    <input
                                                        value={newJudgeForm.password}
                                                        onChange={e => setNewJudgeForm({ ...newJudgeForm, password: e.target.value })}
                                                        type={showJudgePassword ? "text" : "password"}
                                                        className="w-full bg-gray-50 border border-gray-300 text-k9-black p-3 pr-10 rounded focus:outline-none focus:border-k9-orange focus:ring-1 focus:ring-k9-orange"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowJudgePassword(!showJudgePassword)}
                                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-k9-orange cursor-pointer"
                                                    >
                                                        {showJudgePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        <div className="border-t border-gray-200 pt-4">
                                            <label className="text-xs font-bold text-gray-500 uppercase block mb-3">{t('admin.judges.assignedModalities')}</label>
                                            <div className="space-y-2 max-h-48 overflow-y-auto bg-gray-50 p-3 rounded border border-gray-200">
                                                {modalities.map(modality => (
                                                    <label
                                                        key={modality}
                                                        className="flex items-center gap-3 p-2 hover:bg-white rounded cursor-pointer transition-colors group"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedModalities.includes(modality)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setSelectedModalities([...selectedModalities, modality]);
                                                                } else {
                                                                    setSelectedModalities(selectedModalities.filter(m => m !== modality));
                                                                }
                                                            }}
                                                            className="w-4 h-4 text-k9-orange border-gray-300 rounded focus:ring-k9-orange focus:ring-2"
                                                        />
                                                        <div className="flex-1">
                                                            <div className="text-sm font-bold text-k9-black group-hover:text-k9-orange transition-colors">
                                                                {modality}
                                                            </div>
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                            <p className="text-xs text-gray-400 mt-2 italic">
                                                {t('admin.judges.modalitiesHint')}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-4">
                                    <button onClick={() => { setShowAddJudge(false); setEditingJudge(null); }} className="flex-1 px-6 py-3 text-sm font-bold uppercase tracking-wider rounded-lg border-2 bg-gray-100 text-k9-black border-gray-200 transition-all">{t('admin.judges.cancel')}</button>
                                    <button onClick={handleAddJudge} className="flex-1 px-6 py-3 text-sm font-black uppercase tracking-wider rounded-lg border-2 bg-white text-k9-black border-gray-200 hover:bg-gray-100 transition-all">
                                        {editingJudge ? t('admin.judges.update') : t('admin.judges.save')}
                                    </button>
                                </div>
                            </div>
                        </Modal>
                    </div>
                )}

                {activeTab === 'rankings' && (
                    <div className="space-y-12">
                        {tests.sort((a, b) => (a.testNumber || 0) - (b.testNumber || 0)).map(test => {
                            const testCompetitors = competitors.filter(c => c.modality === test.modality);
                            const judgeReserves = room?.judgeReserves || [];
                            const reserveActivations = room?.reserveActivations || [];

                            return (
                                <div key={test.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                                    <div className="bg-gray-900 p-4 flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-orange-400 flex items-center justify-center text-white font-black text-xs">
                                                {test.testNumber?.toString().padStart(2, '0')}
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-black text-white uppercase tracking-tight">{test.title}</h3>
                                                <div className="text-[10px] text-orange-400 font-bold uppercase">{test.modality}</div>
                                            </div>
                                        </div>
                                        <div className="text-[10px] text-gray-400 font-bold uppercase">
                                            {t('admin.rankings.total')}: {testCompetitors.length}
                                        </div>
                                    </div>

                                    <div className="divide-y divide-gray-50">
                                        {testCompetitors.map(comp => {
                                            const titularEvals = evaluations.filter(e => {
                                                if (e.testId !== test.id || e.competitorId !== comp.id) return false;
                                                const judgeReserveMods = room?.judgeReserveModalities?.[e.judgeId] || [];
                                                if (test.modality && judgeReserveMods.length > 0) {
                                                    return !judgeReserveMods.includes(test.modality);
                                                }
                                                return !(room?.judgeReserves || []).includes(e.judgeId);
                                            });
                                            const titularCount = titularEvals.length;
                                            const needsReserve = titularCount < 3;

                                            const isActivated = (room?.reserveActivations || []).some(
                                                a => a.competitorId === comp.id && a.testId === test.id
                                            );

                                            const evaluation = evaluations.find(e => e.testId === test.id && e.competitorId === comp.id);
                                            const isDNS = evaluation?.status === 'did_not_participate';

                                            return (
                                                <div key={comp.id} className="p-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-black text-gray-400 text-xs overflow-hidden border border-gray-100 shadow-inner shrink-0">
                                                            {comp.photoUrl ? <img src={comp.photoUrl} className="w-full h-full object-cover" /> : comp.handlerName.substring(0, 2).toUpperCase()}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="text-sm font-black text-k9-black uppercase truncate">{comp.handlerName}</div>
                                                            <div className="text-[10px] text-gray-400 font-bold uppercase">{t('admin.rankings.dog')}: {comp.dogName}</div>

                                                            {/* Indicador de juízes titulares */}
                                                            <div className="flex items-center gap-2 mt-1.5">
                                                                <div className="flex gap-1">
                                                                    {[1, 2, 3].map(i => (
                                                                        <div
                                                                            key={i}
                                                                            className={`w-3.5 h-3.5 rounded-full border-2 transition-colors ${i <= titularCount
                                                                                ? 'bg-orange-400 border-orange-500'
                                                                                : 'bg-gray-100 border-gray-300'
                                                                                }`}
                                                                            title={`Juiz titular ${i}`}
                                                                        />
                                                                    ))}
                                                                </div>
                                                                <span className={`text-[9px] font-black uppercase ${titularCount >= 3 ? 'text-green-600' : 'text-gray-400'
                                                                    }`}>
                                                                    {titularCount}/3 titulares
                                                                    {titularCount >= 3 && <span className="ml-1">· Completo</span>}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-3 shrink-0">
                                                        {/* Botão Acionar / Desacionar Reserva */}
                                                        {needsReserve && !isDNS && (
                                                            <button
                                                                onClick={async () => {
                                                                    try {
                                                                        if (isActivated) {
                                                                            await deactivateReserve(roomId, comp.id, test.id);
                                                                        } else {
                                                                            await activateReserve(roomId, comp.id, test.id, user?.uid || 'admin');
                                                                        }
                                                                    } catch (err) {
                                                                        console.error(err);
                                                                        alert('Erro ao acionar/desacionar o reserva.');
                                                                    }
                                                                }}
                                                                className={`flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-black uppercase rounded-lg border transition-all ${isActivated
                                                                    ? 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200 shadow-sm'
                                                                    : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200'
                                                                    }`}
                                                                title={isActivated ? 'Clique para desacionar o reserva' : 'Acionar Juiz Reserva'}
                                                            >
                                                                {isActivated ? (
                                                                    <>
                                                                        <BellOff className="w-3 h-3" />
                                                                        Acionado
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Bell className="w-3 h-3" />
                                                                        Acionar Reserva
                                                                    </>
                                                                )}
                                                            </button>
                                                        )}

                                                        {evaluation ? (
                                                            <div className="flex items-center gap-3">
                                                                <div className={`text-right ${isDNS ? 'text-red-500' : 'text-green-600'}`}>
                                                                    <div className="text-xs font-black uppercase leading-none">{isDNS ? 'NC' : evaluation.finalScore.toFixed(1)}</div>
                                                                    <div className="text-[8px] font-bold uppercase opacity-60">{t('admin.rankings.status')}</div>
                                                                </div>
                                                                <button
                                                                    onClick={() => setEvalToDelete({
                                                                        id: evaluation.id,
                                                                        name: comp.handlerName,
                                                                        testTitle: test.title,
                                                                        isNC: isDNS,
                                                                        photoUrl: comp.photoUrl
                                                                    })}
                                                                    className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                                                                    title="Remover"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => setCompToMarkNC({ test, comp })}
                                                                className="px-3 py-1.5 bg-gray-100 hover:bg-red-50 text-gray-400 hover:text-red-600 text-[10px] font-black uppercase rounded-lg border border-gray-200 hover:border-red-100 transition-all flex items-center gap-2"
                                                            >
                                                                <AlertCircle className="w-3.5 h-3.5" /> {t('admin.rankings.markAbsence')}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {testCompetitors.length === 0 && (
                                            <div className="p-8 text-center text-gray-300 text-[10px] font-bold uppercase italic">
                                                {t('admin.rankings.noCompetitors')}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Confirm Deletion Modal */}
                {itemToDelete && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[100] backdrop-blur-md">
                        <div className="bg-white border-2 border-red-200 p-8 rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden text-black">
                            <div className="absolute top-0 left-0 w-full h-2 bg-red-500"></div>
                            <div className="flex flex-col items-center text-center">
                                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4 border-2 border-red-100">
                                    <Trash2 className="w-8 h-8 text-red-500" />
                                </div>
                                <h2 className="text-2xl font-black text-k9-black uppercase mb-2 tracking-tighter leading-tight">
                                    {t('admin.deletion.title')}
                                </h2>
                                <p className="text-gray-500 text-sm font-semibold mb-6 uppercase tracking-tight">
                                    {t('admin.deletion.question')} {itemToDelete?.type === 'competitor' ? t('admin.deletion.competitor') : itemToDelete?.type === 'test' ? t('admin.deletion.test') : t('admin.deletion.judge')}<br />
                                    <span className="text-red-600 font-bold">"{itemToDelete?.name.toUpperCase()}"</span>{t('admin.deletion.questionSuffix')}<br />
                                    {itemToDelete?.type === 'judge' ? t('admin.deletion.judgeWarning') : t('admin.deletion.irreversible')}
                                </p>
                                <div className="flex gap-4 w-full">
                                    <button onClick={() => setItemToDelete(null)} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-k9-black font-bold uppercase text-xs rounded-xl tracking-wider cursor-pointer border-2 border-gray-200 transition-all">
                                        {t('admin.deletion.cancel')}
                                    </button>
                                    <button onClick={confirmDeletion} className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold uppercase text-xs rounded-xl tracking-wider cursor-pointer border-2 border-red-700 transition-all shadow-lg hover:shadow-red-500/20">
                                        {t('admin.deletion.confirm')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL DE CONFIRMAÇÃO DE FALTA (NC) */}
                <Modal
                    isOpen={!!compToMarkNC}
                    onClose={() => setCompToMarkNC(null)}
                    title={<div className="flex items-center gap-2 text-red-600 uppercase font-black"><AlertCircle className="w-5 h-5" /> {t('admin.nc.title')}</div>}
                    maxWidth="max-w-md"
                >
                    <div className="flex flex-col items-center text-center p-2">
                        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6 border-2 border-red-100 shadow-sm overflow-hidden">
                            {compToMarkNC?.comp.photoUrl ? (
                                <img src={compToMarkNC.comp.photoUrl} className="w-full h-full rounded-full object-cover" />
                            ) : (
                                <Users className="w-10 h-10 text-red-400" />
                            )}
                        </div>
                        <p className="text-gray-600 text-sm font-semibold mb-2 uppercase tracking-tight">Você está marcando falta para:</p>
                        <h3 className="text-2xl font-black text-k9-black uppercase mb-1 tracking-tighter">{compToMarkNC?.comp.handlerName}</h3>
                        <p className="text-k9-orange text-xs font-bold uppercase mb-6 bg-orange-50 px-3 py-1 rounded-full border border-orange-100">
                            {t('admin.nc.test')}: {compToMarkNC?.test.title}
                        </p>
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-8 w-full">
                            <p className="text-[11px] text-gray-500 font-bold uppercase leading-relaxed text-center">
                                {t('admin.nc.warning')} <span className="text-red-600">{t('admin.nc.warningZero')}</span> {t('admin.nc.warningEnd')}
                            </p>
                        </div>
                        <div className="flex gap-4 w-full">
                            <button onClick={() => setCompToMarkNC(null)} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-k9-black font-bold uppercase text-xs rounded-xl tracking-wider cursor-pointer border-2 border-gray-200 transition-all">
                                {t('admin.nc.cancel')}
                            </button>
                            <button
                                onClick={async () => {
                                    if (compToMarkNC) {
                                        await setDidNotParticipate(roomId, compToMarkNC.test.id, compToMarkNC.comp.id, user?.uid || 'admin');
                                        setCompToMarkNC(null);
                                    }
                                }}
                                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold uppercase text-xs rounded-xl tracking-wider cursor-pointer border-2 border-red-700 transition-all shadow-lg hover:shadow-red-500/20"
                            >
                                {t('admin.nc.confirm')}
                            </button>
                        </div>
                    </div>
                </Modal>

                {/* MODAL DE REMOÇÃO DE AVALIAÇÃO/NC */}
                <Modal
                    isOpen={!!evalToDelete}
                    onClose={() => setEvalToDelete(null)}
                    title={<div className="flex items-center gap-2 text-red-600 uppercase font-black"><Trash2 className="w-5 h-5" /> {t('admin.deletion.title')}</div>}
                    maxWidth="max-w-md"
                >
                    <div className="flex flex-col items-center text-center p-2">
                        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6 border-2 border-red-100 shadow-sm overflow-hidden">
                            {evalToDelete?.photoUrl ? (
                                <img src={evalToDelete.photoUrl} className="w-full h-full object-cover" />
                            ) : (
                                <Users className="w-10 h-10 text-red-400" />
                            )}
                        </div>
                        <p className="text-gray-600 text-sm font-semibold mb-2 uppercase tracking-tight">
                            {t('admin.evalDeletion.removing')} {evalToDelete?.isNC ? t('admin.evalDeletion.removingAbsence') : t('admin.evalDeletion.removingScore')} {t('admin.evalDeletion.of')}
                        </p>
                        <h3 className="text-2xl font-black text-k9-black uppercase mb-1 tracking-tighter">{evalToDelete?.name}</h3>
                        <p className="text-k9-orange text-xs font-bold uppercase mb-6 bg-orange-50 px-3 py-1 rounded-full border border-orange-100">
                            {t('admin.evalDeletion.test')}: {evalToDelete?.testTitle}
                        </p>
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-8 w-full">
                            <p className="text-[11px] text-gray-500 font-bold uppercase leading-relaxed text-center">
                                {t('admin.evalDeletion.warning')} {evalToDelete?.isNC ? t('admin.evalDeletion.absenceRecord') : t('admin.evalDeletion.evaluation')} {t('admin.evalDeletion.warningEnd')}
                            </p>
                        </div>
                        <div className="flex gap-4 w-full">
                            <button onClick={() => setEvalToDelete(null)} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-k9-black font-bold uppercase text-xs rounded-xl tracking-wider cursor-pointer border-2 border-gray-200 transition-all">
                                {t('admin.evalDeletion.cancel')}
                            </button>
                            <button
                                onClick={async () => {
                                    if (evalToDelete) {
                                        await deleteEvaluation(evalToDelete.id);
                                        setEvalToDelete(null);
                                    }
                                }}
                                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold uppercase text-xs rounded-xl tracking-wider cursor-pointer border-2 border-red-700 transition-all shadow-lg hover:shadow-red-500/20"
                            >
                                {t('admin.evalDeletion.confirm')}
                            </button>
                        </div>
                    </div>
                </Modal>
            </div>
        </div>
    );
}
