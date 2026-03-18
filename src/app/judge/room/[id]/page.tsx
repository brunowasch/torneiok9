'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
    getRoomById,
    getCompetitorsByRoom,
    getTestTemplates,
    getModalities,
    subscribeToRoom,
    subscribeToCompetitorsByRoom,
    subscribeToTestsByRoom,
} from '@/services/adminService';
import {
    saveEvaluation,
    getEvaluationsByRoom,
    createEditScoreRequest,
    getEditScoreRequestsByRoom,
    deleteEvaluation,
    respondToEditScoreRequest,
    subscribeToEvaluationsByRoom,
    subscribeToEditScoreRequestsByRoom
} from '@/services/evaluationService';
import {
    Room,
    Competitor,
    TestTemplate,
    Evaluation,
    Modality,
    EditScoreRequest
} from '@/types/schema';
import {
    ArrowLeft,
    Users,
    CheckCircle2,
    Check,
    AlertCircle,
    X,
    List,
    Trophy,
    Search,
    Shield,
    Bell,
    Plus,
    Zap,
    Lock as LockIcon,
    Pencil,
    Clock,
    Send
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Modal from '@/components/Modal';

export default function JudgeRoomPage() {
    const params = useParams();
    const router = useRouter();
    const { t } = useTranslation();
    const roomId = params.id as string;
    const [user, setUser] = useState<any>(null);

    // Data
    const [room, setRoom] = useState<Room | null>(null);
    const [competitors, setCompetitors] = useState<Competitor[]>([]);
    const [tests, setTests] = useState<TestTemplate[]>([]);
    const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
    const [modalities, setModalities] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    // Evaluation State
    const [selectedCompetitor, setSelectedCompetitor] = useState<Competitor | null>(null);
    const [activeTest, setActiveTest] = useState<TestTemplate | null>(null);
    const [scores, setScores] = useState<Record<string, number>>({});
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // View Selection State
    const [selectedTestView, setSelectedTestView] = useState<TestTemplate | null>(null);
    const [testSearch, setTestSearch] = useState('');
    const [competitorSearch, setCompetitorSearch] = useState('');
    const [competitorSortOrder, setCompetitorSortOrder] = useState<'asc' | 'desc'>('asc');
    const [competitorSortBy, setCompetitorSortBy] = useState<'number' | 'alphabetical'>('number');

    // Edit Score Request State
    const [editRequests, setEditRequests] = useState<EditScoreRequest[]>([]);
    const [showEditRequestModal, setShowEditRequestModal] = useState(false);
    const [editRequestTarget, setEditRequestTarget] = useState<{ competitor: Competitor; test: TestTemplate; evaluation: Evaluation } | null>(null);
    const [editRequestReason, setEditRequestReason] = useState('');
    const [sendingEditRequest, setSendingEditRequest] = useState(false);

    const [authDetermined, setAuthDetermined] = useState(false);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            if (!currentUser) {
                if (authDetermined || !auth.currentUser) {
                    router.push('/');
                }
                setAuthDetermined(true);
                return;
            }

            setAuthDetermined(true);
            setUser(currentUser);
        });

        if (user) {
            const unsubRoom = subscribeToRoom(roomId, setRoom);
            const unsubComp = subscribeToCompetitorsByRoom(roomId, setCompetitors);
            const unsubTests = subscribeToTestsByRoom(roomId, setTests);
            const unsubEvals = subscribeToEvaluationsByRoom(roomId, setEvaluations);
            const unsubRequests = subscribeToEditScoreRequestsByRoom(roomId, setEditRequests);

            // Fetch non-real-time data (modalities)
            getModalities().then(m => setModalities(m.map(mod => mod.name)));
            setLoading(false);

            return () => {
                unsubscribeAuth();
                unsubRoom();
                unsubComp();
                unsubTests();
                unsubEvals();
                unsubRequests();
            };
        }

        return () => unsubscribeAuth();
    }, [roomId, authDetermined, router, user]);

    const loadData = async () => {
        try {
            const [r, c, t2, e, m, er] = await Promise.all([
                getRoomById(roomId),
                getCompetitorsByRoom(roomId),
                getTestTemplates(roomId),
                getEvaluationsByRoom(roomId),
                getModalities(),
                getEditScoreRequestsByRoom(roomId)
            ]);
            setRoom(r);
            setCompetitors(c);
            setTests(t2);
            setEvaluations(e);
            setModalities(m.map(mod => mod.name));
            setEditRequests(er);
        } catch (error) {
            console.error(error);
            alert(t('judge.room.errorLoad'));
        } finally {
            setLoading(false);
        }
    };

    const isTestEvaluated = (competitorId: string, testId: string) => {
        if (!user) return false;
        return evaluations.some(e =>
            e.competitorId === competitorId &&
            e.testId === testId &&
            e.judgeId === user.uid
        );
    };

    /**
     * Verifica se o usuário logado é juiz reserva nesta sala.
     * Aceita uma modalidade e competitorId opcionais para checar vínculos
     * específicos por competidor.
     */
    const isReserveJudge = (modality?: string, competitorId?: string): boolean => {
        if (!user || !room) return false;
        // Verifica vínculo especifico por competidor
        if (competitorId) {
            const compReserves = room.judgeCompetitorReserves?.[competitorId] || [];
            if (compReserves.includes(user.uid)) return true;
        }
        const reserveModalities: string[] = room.judgeReserveModalities?.[user.uid] || [];
        if (modality) {
            // Verifica reserva nessa modalidade específica
            if (reserveModalities.length > 0) return reserveModalities.includes(modality);
            return (room.judgeReserves || []).includes(user.uid);
        }
        // Sem modalidade: é reserva se tiver qualquer modalidade configurada ou estiver no legado
        return reserveModalities.length > 0 || (room.judgeReserves || []).includes(user.uid);
    };

    /**
     * Retorna quantos juízes TITULARES (não-reserva) já avaliaram o competidor naquela prova.
     * Titular = não é reserva naquela modalidade específica, nem reserva especifico desse competidor.
     */
    const getTitularEvalCount = (competitorId: string, testId: string, modality?: string): number => {
        const reserves = room?.judgeReserves || [];
        const reserveModalitiesMap = room?.judgeReserveModalities || {};
        const judgeCompetitorReserves = room?.judgeCompetitorReserves || {};
        return evaluations.filter(e => {
            if (e.competitorId !== competitorId || e.testId !== testId) return false;
            // Reserva específica para este competidor
            const compReserves = judgeCompetitorReserves[competitorId] || [];
            if (compReserves.includes(e.judgeId)) return false;
            // Verifica se o juiz dessa avaliação é reserva na modalidade
            const judgeReserveMods = reserveModalitiesMap[e.judgeId] || [];
            if (modality && judgeReserveMods.length > 0) {
                // Novo sistema: é titular se NÃO for reserva nessa modalidade
                return !judgeReserveMods.includes(modality);
            }
            // Fallback legado
            return !reserves.includes(e.judgeId);
        }).length;
    };

    const getTotalEvalCount = (competitorId: string, testId: string): number => {
        return evaluations.filter(e =>
            e.competitorId === competitorId &&
            e.testId === testId
        ).length;
    };

    /**
     * Verifica se o admin acionou o reserva para um competidor/prova específico.
     */
    const isAdminActivated = (competitorId: string, testId: string, modality?: string): boolean => {
        if (!isReserveJudge(modality, competitorId)) return false;
        return (room?.reserveActivations || []).some(
            a => a.competitorId === competitorId && a.testId === testId
        );
    };

    const isBlockedAsReserve = (competitorId: string, testId: string, modality?: string): boolean => {
        if (!isReserveJudge(modality, competitorId)) return false;
        if (!isAdminActivated(competitorId, testId, modality)) return true;
        return getTitularEvalCount(competitorId, testId, modality) >= 3;
    };

    const getBlockReason = (competitorId: string, testId: string, modality?: string): 'not_activated' | 'full' | null => {
        if (!isReserveJudge(modality, competitorId)) return null;
        if (!isAdminActivated(competitorId, testId, modality)) return 'not_activated';
        if (getTitularEvalCount(competitorId, testId, modality) >= 3) return 'full';
        return null;
    };

    const getAssignedTests = (competitor?: Competitor | null) => {
        if (!user || !room) return [];

        let filteredTests = tests;

        if (room.judgeModalities && room.judgeModalities[user.uid] && room.judgeModalities[user.uid].length > 0) {
            const judgeModalities = room.judgeModalities[user.uid].filter(m => modalities.includes(m));
            filteredTests = filteredTests.filter(t => judgeModalities.includes(t.modality as Modality));
        } else if (room.judgeAssignments && room.judgeAssignments[user.uid] && room.judgeAssignments[user.uid].length > 0) {
            const judgeTestIds = room.judgeAssignments[user.uid];
            filteredTests = filteredTests.filter(t => judgeTestIds.includes(t.id));
        }

        if (competitor) {
            filteredTests = filteredTests.filter(t => t.modality === competitor.modality);
        }

        return filteredTests;
    };

    const getCompetitorProgress = (competitor: Competitor) => {
        const assignedTests = getAssignedTests(competitor);
        if (!assignedTests.length) return { current: 0, total: 0 };
        const evaluatedCount = assignedTests.filter(t => isTestEvaluated(competitor.id, t.id)).length;
        return { current: evaluatedCount, total: assignedTests.length };
    };

    const handleSelectTest = (test: TestTemplate) => {
        setSelectedTestView(test);
    };

    const handleBackToTests = () => {
        setSelectedTestView(null);
    };

    const startEvaluation = (competitor: Competitor, test: TestTemplate) => {
        setActiveTest(test);
        setSelectedCompetitor(competitor);
    };

    const getEditRequestStatus = (evaluationId: string): EditScoreRequest | undefined => {
        if (!user) return undefined;
        return editRequests.find(r =>
            r.evaluationId === evaluationId &&
            r.judgeId === user.uid &&
            (r.status === 'pending' || r.status === 'approved')
        );
    };

    const handleRequestEdit = (competitor: Competitor, test: TestTemplate) => {
        if (!user) return;
        const evaluation = evaluations.find(e =>
            e.competitorId === competitor.id &&
            e.testId === test.id &&
            e.judgeId === user.uid
        );
        if (!evaluation) return;

        // Check if there is already an approved request
        const existingRequest = getEditRequestStatus(evaluation.id);
        if (existingRequest?.status === 'approved') {
            // Already approved, proceed to re-evaluate
            handleEditWithApproval(competitor, test, evaluation, existingRequest);
            return;
        }
        if (existingRequest?.status === 'pending') {
            alert(t('judge.room.editRequest.pendingAlert'));
            return;
        }

        setEditRequestTarget({ competitor, test, evaluation });
        setEditRequestReason('');
        setShowEditRequestModal(true);
    };

    const submitEditRequest = async () => {
        if (!editRequestTarget || !user || !editRequestReason.trim()) return;
        setSendingEditRequest(true);
        try {
            await createEditScoreRequest({
                roomId,
                competitorId: editRequestTarget.competitor.id,
                competitorName: editRequestTarget.competitor.handlerName,
                testId: editRequestTarget.test.id,
                testTitle: editRequestTarget.test.title,
                evaluationId: editRequestTarget.evaluation.id,
                judgeId: user.uid,
                judgeName: user.displayName || user.email || 'Juiz',
                reason: editRequestReason.trim()
            });
            alert(t('judge.room.editRequest.successAlert'));
            setShowEditRequestModal(false);
            setEditRequestTarget(null);
            setEditRequestReason('');
            loadData();
        } catch (error: any) {
            alert(error.message || t('judge.room.editRequest.errorAlert'));
        } finally {
            setSendingEditRequest(false);
        }
    };

    const handleEditWithApproval = async (
        competitor: Competitor,
        test: TestTemplate,
        evaluation: Evaluation,
        request: EditScoreRequest
    ) => {
        try {
            await deleteEvaluation(evaluation.id);
            await respondToEditScoreRequest(request.id, 'consumed', user!.uid);
            await loadData();
            startEvaluation(competitor, test);
        } catch (err) {
            console.error(err);
            alert('Erro ao iniciar re-avaliação.');
        }
    };

    const handleScoreChange = (itemId: string, value: number, max: number) => {
        const clamped = Math.max(0, Math.min(value, max));
        setScores(prev => ({ ...prev, [itemId]: clamped }));
    };

    const submitEvaluation = async () => {
        if (!selectedCompetitor || !activeTest || !user) return;
        setSubmitting(true);

        try {
            await saveEvaluation({
                roomId,
                testId: activeTest.id,
                competitorId: selectedCompetitor.id,
                judgeId: user.uid,
                scores,
                penaltiesApplied: [],
                notes
            }, activeTest);

            alert(t('judge.room.successSubmit'));
            setSelectedCompetitor(null);
            setActiveTest(null);
            loadData(); // Refresh data
        } catch (error) {
            console.error(error);
            alert(t('judge.room.errorSubmit'));
        } finally {
            setSubmitting(false);
        }
    };

    const calculateCurrentTotal = () => {
        if (!activeTest) return 0;
        let total = 0;
        activeTest.groups.forEach(g => {
            g.items.forEach(item => {
                total += scores[item.id] || 0;
            });
        });

        return Math.max(0, total);
    };

    if (loading) return <div className="min-h-screen bg-k9-white flex items-center justify-center text-k9-orange font-mono">{t('judge.room.loading')}</div>;
    if (!room) return <div className="p-8 text-black">{t('judge.room.notFound')}</div>;

    if (selectedCompetitor && activeTest) {
        return (
            <div className="min-h-screen bg-gray-50 text-k9-black pb-20 overflow-x-hidden">
                <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm px-4 py-3 md:py-4 overflow-hidden">
                    <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
                        <button
                            onClick={() => setSelectedCompetitor(null)}
                            className="text-gray-500 hover:text-black flex items-center gap-2 text-[10px] md:text-xs font-bold uppercase transition-colors shrink-0"
                        >
                            <ArrowLeft className="w-3.5 h-3.5 md:w-4 md:h-4" /> {t('judge.room.cancel')}
                        </button>
                        <div className="text-right min-w-0">
                            <div className="text-[9px] md:text-[10px] text-gray-400 font-mono uppercase font-bold">{t('judge.room.partialTotal')}</div>
                            <div className="text-xl md:text-2xl font-black text-k9-orange leading-none">{calculateCurrentTotal().toFixed(1)} <span className="text-xs md:text-sm text-gray-300">/ {activeTest.maxScore}</span></div>
                        </div>
                    </div>
                </div>

                <div className="max-w-2xl mx-auto p-4 space-y-6">
                    {/* Competitor Card */}
                    <div className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
                        <div className="w-16 h-16 rounded-xl flex items-center justify-center text-xl font-black shrink-0 shadow-sm overflow-hidden bg-orange-50 text-orange-600 border-2 border-orange-100 group-hover:border-k9-orange transition-colors">
                            {selectedCompetitor.photoUrl ? (
                                <img src={selectedCompetitor.photoUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <span>{selectedCompetitor.handlerName.substring(0, 2).toUpperCase()}</span>
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <h1 className="font-black text-lg md:text-xl uppercase text-k9-black leading-tight truncate">{selectedCompetitor.handlerName}</h1>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] md:text-xs font-bold text-gray-400 uppercase mt-1">
                                <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600 truncate max-w-[120px] md:max-w-none">{t('judge.room.dog')}: {selectedCompetitor.dogName}</span>
                                <span className="text-orange-400 hidden sm:inline">•</span>
                                <span className="truncate">{activeTest.title}</span>
                            </div>
                        </div>
                    </div>

                    {/* Groups & Criteria */}
                    {activeTest.groups.map((group, gIdx) => (
                        <div key={gIdx} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                            <div className="bg-gray-50 px-5 py-3 border-b border-gray-200 flex justify-between items-center">
                                <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide">{group.name}</h3>
                                <div className="text-xs font-mono font-bold text-gray-400 bg-white px-2 py-1 rounded border border-gray-200">{t('judge.room.criteriaRef')}: {group.items.reduce((a, b) => a + b.maxPoints, 0)} pts</div>
                            </div>
                            <div className="p-5 space-y-8">
                                {group.items.map(item => (
                                    <div key={item.id} className="min-w-0">
                                        <div className="flex justify-between items-start gap-3 mb-1">
                                            <label className="text-sm font-bold text-k9-black break-words flex-1">{item.label}</label>
                                            <span className="text-[10px] font-mono font-bold text-k9-orange bg-orange-50 px-2 py-1 rounded border border-orange-100 whitespace-nowrap shrink-0">Max: {item.maxPoints}</span>
                                        </div>
                                        {item.description && (
                                            <p className="text-gray-400 text-[11px] mb-3 leading-relaxed">{item.description}</p>
                                        )}

                                        <div className="flex items-center gap-4">
                                            <input
                                                type="range"
                                                min="0"
                                                max={item.maxPoints}
                                                step="0.5"
                                                value={scores[item.id] || 0}
                                                onChange={(e) => handleScoreChange(item.id, parseFloat(e.target.value), item.maxPoints)}
                                                className="flex-1 h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500 hover:bg-gray-300 transition-colors"
                                            />
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={item.maxPoints}
                                                    step="0.1"
                                                    value={scores[item.id] || 0}
                                                    onChange={(e) => handleScoreChange(item.id, parseFloat(e.target.value), item.maxPoints)}
                                                    className="w-20 bg-white border-2 border-gray-200 rounded-lg p-2 text-center text-lg font-bold text-k9-black focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100 transition-all font-mono"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    {/* Notes & Actions */}
                    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" /> {t('judge.room.technicalNotes')}
                        </label>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            className="w-full bg-gray-50 border-2 border-gray-200 text-k9-black p-4 rounded-xl focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 min-h-[120px] font-sans text-sm"
                            placeholder={t('judge.room.notesPlaceholder')}
                        ></textarea>
                    </div>

                    <div className="pt-4 pb-8">
                        <button
                            onClick={submitEvaluation}
                            disabled={submitting}
                            className="w-full bg-black hover:bg-gray-900 text-white font-black uppercase py-5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl hover:shadow-2xl hover:-translate-y-1 flex items-center justify-center gap-3 text-lg border-2 border-transparent"
                        >
                            {submitting ? t('judge.room.submitting') : (
                                <>
                                    <CheckCircle2 className="w-6 h-6 text-green-400" /> {t('judge.room.confirmEvaluation')}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="min-h-screen bg-k9-white text-k9-black font-sans relative">

                {/* Header */}
                <div className="bg-black border-b-4 border-k9-orange text-white shadow-2xl sticky top-0 z-30 relative">
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-k9-orange/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
                    </div>
                    <div className="max-w-4xl mx-auto px-4 md:px-6 py-5 md:py-6 relative z-10">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-5 md:gap-6">
                            <div className="flex items-center gap-4 md:gap-5 w-full md:w-auto">
                                <div className="flex flex-col flex-1 min-w-0">
                                    <button
                                        onClick={() => selectedTestView ? handleBackToTests() : router.push('/judge')}
                                        className="flex items-center gap-2 text-gray-500 hover:text-white mb-2 text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer group w-fit"
                                    >
                                        <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" /> {selectedTestView ? t('judge.room.backToTests') : t('judge.room.back')}
                                    </button>
                                    <div className="flex items-center gap-3 md:gap-4">
                                        <div className="w-10 h-10 md:w-12 md:h-12 relative flex items-center justify-center shrink-0 p-1 bg-white/5 rounded-xl border border-white/10">
                                            <img src="/logo.png" alt="Logo" className="object-contain w-full h-full" />
                                        </div>
                                        <div className="min-w-0">
                                            <h1 className="text-lg md:text-2xl font-black text-white uppercase tracking-tighter leading-none truncate">
                                                {selectedTestView ? selectedTestView.title : room.name}
                                            </h1>
                                            {!selectedTestView && room.startDate && (
                                                <div className="flex items-center gap-1 mt-0.5">
                                                    <span className="text-gray-400 text-[8px] md:text-[10px] font-black tracking-widest">
                                                        {new Date(room.startDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                        {room.endDate && room.endDate !== room.startDate && (
                                                            <> - {new Date(room.endDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</>
                                                        )}
                                                    </span>
                                                </div>
                                            )}
                                            <p className="text-k9-orange text-[8px] md:text-[10px] uppercase tracking-[0.2em] mt-1 font-black opacity-80 truncate">
                                                {selectedTestView ? `${t('judge.room.evaluating')}: ${selectedTestView.modality}` : t('judge.room.evaluationPanel')}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 w-full md:w-auto justify-end border-t border-white/5 md:border-0 pt-4 md:pt-0">
                                <div className="flex items-center gap-3">
                                    <div className="bg-gray-900/50 border border-white/5 px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-center shadow-inner">
                                        <div className="text-[8px] md:text-[9px] text-gray-500 uppercase font-black tracking-widest">{t('judge.room.statusLabel')}</div>
                                        <div className="text-green-500 font-black uppercase text-[9px] md:text-[10px] flex items-center gap-1.5 mt-0.5">
                                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                                            {t('judge.room.online')}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Banner de Juiz Reserva - apenas para reservas globais/por modalidade */}
                {isReserveJudge(selectedTestView?.modality) && (
                    <div className="bg-yellow-400 text-yellow-900 px-6 py-3 sticky top-0 z-20">
                        <div className="max-w-4xl mx-auto flex items-center gap-3">
                            <Zap className="w-5 h-5 shrink-0" />
                            <div>
                                <div className="font-black uppercase text-sm tracking-wider">Você é Juiz Reserva</div>
                                <div className="text-xs font-semibold opacity-80">
                                    Você pode avaliar quando menos de 3 juízes titulares já avaliaram o competidor. Com 3 avaliações, a média é calculada automaticamente.
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="max-w-4xl mx-auto p-6 md:p-8">
                    {/* 1. SELEÇÃO DE PROVA */}
                    {!selectedTestView ? (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-orange-100 rounded-lg">
                                    <List className="w-5 h-5 text-orange-600" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black uppercase text-k9-black leading-tight">{t('judge.room.selectTest')}</h2>
                                    <p className="text-xs text-gray-400 font-bold uppercase">{t('judge.room.selectTestHint')}</p>
                                </div>
                            </div>

                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder={t('judge.room.searchTest')}
                                    value={testSearch}
                                    onChange={e => setTestSearch(e.target.value)}
                                    className="w-full bg-white border-2 border-gray-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-k9-black focus:outline-none focus:border-k9-orange focus:ring-4 focus:ring-orange-50 transition-all shadow-sm placeholder:text-gray-300"
                                />
                            </div>


                            {(() => {
                                const normalize = (text: string) =>
                                    text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");

                                const assignedTests = getAssignedTests()
                                    .filter(t => {
                                        if (!testSearch) return true;
                                        const s = normalize(testSearch);
                                        const titleMatch = normalize(t.title).includes(s);
                                        const modalityMatch = t.modality ? normalize(t.modality).includes(s) : false;
                                        const numberMatch = t.testNumber ? t.testNumber.toString().includes(s) : false;

                                        return titleMatch || modalityMatch || numberMatch;
                                    })
                                    .sort((a, b) => {
                                        if (a.modality !== b.modality) return (a.modality || '').localeCompare(b.modality || '');
                                        return (a.testNumber || 0) - (b.testNumber || 0);
                                    });

                                if (assignedTests.length === 0) {
                                    return (
                                        <div className="text-center py-16 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                                            <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-30" />
                                            <p className="uppercase font-bold text-sm tracking-wide">{t('judge.room.noTestsFound')}</p>
                                        </div>
                                    );
                                }

                                const groupedByModality = assignedTests.reduce((acc, test) => {
                                    const modality = test.modality || 'OUTRAS';
                                    if (!acc[modality]) acc[modality] = [];
                                    acc[modality].push(test);
                                    return acc;
                                }, {} as Record<string, TestTemplate[]>);

                                return (
                                    <div className="space-y-8">
                                        <div className="mt-4">
                                            <select
                                                value=""
                                                onChange={(e) => {
                                                    const selected = assignedTests.find(t => t.id === e.target.value);
                                                    if (selected) handleSelectTest(selected);
                                                }}
                                                className="w-full bg-white border border-gray-200 text-[10px] font-black uppercase tracking-wider rounded-xl px-3 py-3 focus:outline-none focus:border-k9-orange transition-all shadow-sm"
                                            >
                                                <option value="" disabled>{t('judge.room.jumpToTest', 'Vá direto para...')}</option>
                                                {assignedTests.map(test => (
                                                    <option key={test.id} value={test.id}>
                                                        {test.testNumber ? `${test.testNumber}. ` : ''}{test.title}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {Object.entries(groupedByModality).map(([modality, modalityTests]) => (
                                            <div key={modality} className="bg-gray-50/50 border border-gray-100 rounded-3xl p-6 shadow-sm">
                                                <h3 className="text-sm font-black uppercase text-k9-orange mb-6 flex items-center gap-2 tracking-widest">
                                                    <Shield className="w-4 h-4" /> {modality}
                                                </h3>
                                                <div className="grid gap-3">
                                                    {modalityTests
                                                        .sort((a, b) => (a.testNumber || 0) - (b.testNumber || 0))
                                                        .map(test => {
                                                            const testCompetitors = competitors.filter(c => c.modality === test.modality);
                                                            const doneCount = testCompetitors.filter(c => isTestEvaluated(c.id, test.id)).length;
                                                            const isAllDone = testCompetitors.length > 0 && doneCount === testCompetitors.length;

                                                            return (
                                                                <button
                                                                    key={test.id}
                                                                    onClick={() => handleSelectTest(test)}
                                                                    className={`
                                                                    group relative w-full text-left p-5 rounded-2xl border transition-all flex items-center justify-between shadow-sm
                                                                    ${isAllDone
                                                                            ? 'bg-green-50/50 border-green-200'
                                                                            : 'bg-white border-gray-100 hover:border-k9-orange hover:shadow-lg'
                                                                        }
                                                                `}
                                                                >
                                                                    <div className="flex items-center gap-4">
                                                                        <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center font-black transition-all shadow-sm border ${isAllDone ? 'bg-green-100 border-green-200 text-green-600' : 'bg-gray-900 border-gray-800 text-white group-hover:bg-k9-orange group-hover:border-k9-orange'}`}>
                                                                            <span className="text-[8px] opacity-60 leading-none mb-0.5">Nº</span>
                                                                            <span className="text-lg leading-none">{test.testNumber ? test.testNumber.toString().padStart(2, '0') : '--'}</span>
                                                                        </div>
                                                                        <div>
                                                                            <h4 className={`font-black uppercase text-base ${isAllDone ? 'text-green-900' : 'text-k9-black'}`}>{test.title}</h4>
                                                                            <div className="flex items-center gap-2 mt-0.5 font-bold uppercase text-[9px]">
                                                                                <span className={isAllDone ? 'text-green-600' : 'text-gray-400'}>{doneCount}/{testCompetitors.length} {t('judge.room.evaluated')}</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    {isAllDone ? (
                                                                        <div className="bg-green-100 text-green-600 p-2 rounded-full">
                                                                            <Check className="w-5 h-5" />
                                                                        </div>
                                                                    ) : (
                                                                        <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 group-hover:bg-orange-50 group-hover:text-k9-orange transition-all">
                                                                            <ArrowLeft className="w-5 h-5 rotate-180" />
                                                                        </div>
                                                                    )}
                                                                </button>
                                                            );
                                                        })
                                                    }
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()}
                        </div>
                    ) : (
                        /* 2. LISTA DE COMPETIDORES PARA A PROVA SELECIONADA */
                        <div className="space-y-6">
                            {/* Test Info Header */}
                            <div className="bg-black text-white p-6 rounded-2xl shadow-lg border-b-4 border-k9-orange relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-k9-orange/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                                <div className="relative z-10">
                                    <span className="text-[10px] font-black uppercase text-k9-orange bg-orange-900/20 px-2 py-0.5 rounded border border-orange-900/30 mb-2 inline-block">
                                        {selectedTestView.modality}
                                    </span>
                                    <h2 className="text-2xl font-black uppercase tracking-tighter leading-tight drop-shadow-md">
                                        {selectedTestView.title}
                                    </h2>
                                    {selectedTestView.description && (
                                        <p className="text-gray-400 text-xs mt-2 font-medium leading-relaxed max-w-2xl border-l-2 border-k9-orange/50 pl-3">
                                            {selectedTestView.description}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-100 rounded-lg">
                                        <Users className="w-5 h-5 text-purple-600" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-black uppercase text-k9-black leading-tight">{t('judge.room.competitorQueue')}</h2>
                                        <p className="text-xs text-gray-400 font-bold uppercase">{t('judge.room.competitorQueueHint')}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                    <div className="relative w-full sm:w-auto flex-1 min-w-[200px]">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder={t('judge.room.searchCompetitor', 'Buscar competidor...')}
                                            value={competitorSearch}
                                            onChange={e => setCompetitorSearch(e.target.value)}
                                            className="w-full bg-white border border-gray-200 rounded-xl py-2 pl-9 pr-3 text-sm font-bold text-k9-black focus:outline-none focus:border-k9-orange focus:ring-2 focus:ring-orange-50 transition-all shadow-sm placeholder:text-gray-300"
                                        />
                                    </div>
                                    <select
                                        value={competitorSortBy}
                                        onChange={(e) => setCompetitorSortBy(e.target.value as any)}
                                        className="bg-white border border-gray-200 text-[10px] font-black uppercase tracking-wider rounded-xl px-3 py-2 focus:outline-none focus:border-k9-orange transition-all shadow-sm"
                                    >
                                        <option value="number">Nº Sorteio</option>
                                        <option value="alphabetical">Alfabético</option>
                                    </select>
                                    <button
                                        onClick={() => setCompetitorSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                                        className="bg-white border border-gray-200 text-gray-600 px-3 py-2 rounded-xl font-black text-sm uppercase tracking-wider hover:bg-gray-50 flex items-center justify-center gap-2 transition-colors shrink-0 shadow-sm"
                                        title="Alternar ordem"
                                    >
                                        {competitorSortOrder === 'asc' ? '↑' : '↓'}
                                    </button>
                                </div>
                            </div>

                            {/* Competidores */}
                            <div className="grid md:grid-cols-2 gap-4">
                                {competitors
                                    .filter(c => c.modality === selectedTestView.modality)
                                    .filter(c => !competitorSearch || c.handlerName.toLowerCase().includes(competitorSearch.toLowerCase()) || c.dogName.toLowerCase().includes(competitorSearch.toLowerCase()))
                                    .sort((a, b) => {
                                        let comparison = 0;
                                        if (competitorSortBy === 'number') {
                                            comparison = (a.competitorNumber || 0) - (b.competitorNumber || 0);
                                        } else {
                                            comparison = a.handlerName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').localeCompare(b.handlerName.normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
                                        }
                                        return competitorSortOrder === 'asc' ? comparison : -comparison;
                                    })
                                    .map(comp => {
                                        const isDone = isTestEvaluated(comp.id, selectedTestView.id);
                                        const titularCount = getTitularEvalCount(comp.id, selectedTestView.id, selectedTestView.modality);
                                        const totalCount = getTotalEvalCount(comp.id, selectedTestView.id);
                                        const blocked = isBlockedAsReserve(comp.id, selectedTestView.id, selectedTestView.modality);
                                        const avgCalculated = titularCount >= 3;
                                        const blockReason = getBlockReason(comp.id, selectedTestView.id, selectedTestView.modality);
                                        const isActivatedForMe = isAdminActivated(comp.id, selectedTestView.id, selectedTestView.modality) && !blocked;

                                        const myEvaluation = isDone ? evaluations.find(e =>
                                            e.competitorId === comp.id && e.testId === selectedTestView.id && e.judgeId === user?.uid
                                        ) : undefined;
                                        const editRequest = myEvaluation ? getEditRequestStatus(myEvaluation.id) : undefined;
                                        const hasPendingRequest = editRequest?.status === 'pending';
                                        const hasApprovedRequest = editRequest?.status === 'approved';

                                        return (
                                            <div
                                                key={comp.id}
                                                className={`
                                                relative overflow-hidden rounded-2xl border transition-all group
                                                ${isDone
                                                        ? 'bg-green-50/30 border-green-100 opacity-90'
                                                        : isActivatedForMe
                                                            ? 'bg-amber-50 border-amber-300 shadow-md shadow-amber-100'
                                                            : blockReason === 'not_activated'
                                                                ? 'bg-gray-50 border-gray-200 opacity-70'
                                                                : blockReason === 'full'
                                                                    ? 'bg-yellow-50/50 border-yellow-200 opacity-80'
                                                                    : 'bg-white border-gray-100 hover:border-k9-orange hover:shadow-lg transform hover:-translate-y-1'
                                                    }
                                            `}
                                            >
                                                {isActivatedForMe && !isDone && (
                                                    <div className="absolute top-0 left-0 right-0 bg-amber-400 text-amber-900 text-[9px] font-black uppercase tracking-wider px-3 py-1 flex items-center gap-1.5 z-20">
                                                        <Bell className="w-3 h-3 animate-bounce" />
                                                        Você foi acionado! Avalie este competidor
                                                    </div>
                                                )}
                                                {blockReason === 'not_activated' && !isDone && !((room?.judgeCompetitorReserves?.[comp.id] || []).includes(user?.uid || '')) && (
                                                    <div className="absolute top-0 left-0 right-0 bg-gray-200 text-gray-500 text-[9px] font-black uppercase tracking-wider px-3 py-1 flex items-center gap-1.5 z-20">
                                                        <LockIcon className="w-3 h-3" />
                                                        Aguardando acionamento do admin
                                                    </div>
                                                )}
                                                {/* Aviso minimalista: juiz é reserva específico deste competidor */}
                                                {!isDone && (room?.judgeCompetitorReserves?.[comp.id] || []).includes(user?.uid || '') && !isActivatedForMe && (
                                                    <div className="absolute top-0 left-0 right-0 bg-purple-100 text-purple-700 text-[9px] font-black uppercase tracking-wider px-3 py-1 flex items-center gap-1.5 z-20">
                                                        <LockIcon className="w-3 h-3" />
                                                        Você é reserva desta pessoa
                                                    </div>
                                                )}
                                                <div className={`p-5 flex items-start justify-between gap-6 h-full min-h-[140px] ${((isActivatedForMe || blockReason === 'not_activated' || (room?.judgeCompetitorReserves?.[comp.id] || []).includes(user?.uid || '')) && !isDone) ? 'pt-8 pl-5' : 'pl-8'}`}>
                                                    <div className="flex items-start gap-4 flex-1 min-w-0">
                                                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center font-extrabold shadow-sm overflow-hidden border shrink-0 relative z-10 ${isDone
                                                            ? 'bg-green-100 border-green-200 text-green-600'
                                                            : isActivatedForMe
                                                                ? 'bg-amber-100 border-amber-200 text-amber-700'
                                                                : blockReason === 'not_activated'
                                                                    ? 'bg-gray-100 border-gray-200 text-gray-400'
                                                                    : blockReason === 'full'
                                                                        ? 'bg-yellow-100 border-yellow-200 text-yellow-700'
                                                                        : 'bg-orange-50 border-orange-100 text-orange-600'
                                                            }`}>
                                                            <div className="w-16 h-16 rounded-xl flex items-center justify-center text-xl font-black shrink-0 shadow-sm overflow-hidden bg-orange-50 text-orange-600 border-2 border-orange-100 group-hover:border-k9-orange transition-colors">
                                                                {comp.photoUrl ? (
                                                                    <img src={comp.photoUrl} alt="" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <span>{comp.handlerName.substring(0, 2).toUpperCase()}</span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="flex-1 relative z-10 pt-0.5 min-w-0">
                                                            <h3 className={`font-black uppercase text-sm leading-tight truncate flex items-center gap-2 ${isDone
                                                                ? 'text-green-900'
                                                                : blockReason === 'not_activated'
                                                                    ? 'text-gray-500'
                                                                    : blocked
                                                                        ? 'text-yellow-900'
                                                                        : 'text-k9-black'
                                                                }`}>
                                                                {comp.competitorNumber && <span className="bg-gray-900 text-white text-[9px] px-1.5 py-0.5 rounded shadow-sm shrink-0">#{comp.competitorNumber}</span>}
                                                                <span className="truncate">{comp.handlerName}</span>
                                                            </h3>
                                                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">{t('judge.room.conductor')}</div>

                                                            <p className="text-xs font-bold text-k9-orange uppercase mt-1 font-mono truncate">
                                                                {t('judge.room.dog')}: {comp.dogName}
                                                            </p>

                                                            {/* Placar de juízes */}
                                                            <div className="mt-2 flex items-center gap-2">
                                                                <div className="flex gap-1">
                                                                    {[1, 2, 3].map(i => (
                                                                        <div key={i} className={`w-4 h-4 rounded-full border-2 ${i <= titularCount
                                                                            ? 'bg-orange-400 border-orange-500'
                                                                            : 'bg-gray-100 border-gray-300'
                                                                            }`} title={`Juiz ${i}`} />
                                                                    ))}
                                                                </div>
                                                                <span className="text-[9px] font-black uppercase text-gray-400">
                                                                    {titularCount}/3 juízes
                                                                    {avgCalculated && <span className="text-orange-500 ml-1">· Média calculada</span>}
                                                                </span>
                                                            </div>

                                                            {/* Indicador de acionamento urgente */}
                                                            {isActivatedForMe && !isDone && (
                                                                <div className="mt-2 flex items-center gap-1.5 text-[10px] font-black text-amber-700 uppercase bg-amber-100 px-2 py-1 rounded-lg border border-amber-200">
                                                                    <Bell className="w-3 h-3" /> Acionado pelo admin · avalie agora
                                                                </div>
                                                            )}

                                                            {isDone && (
                                                                <div className="mt-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase">
                                                                    {hasApprovedRequest ? (
                                                                        <span className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">
                                                                            <Pencil className="w-3 h-3" /> {t('judge.room.editRequest.approvedStatus')}
                                                                        </span>
                                                                    ) : hasPendingRequest ? (
                                                                        <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                                                                            <Clock className="w-3 h-3" /> {t('judge.room.editRequest.pendingStatus')}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="flex items-center gap-1 text-green-600">
                                                                            <CheckCircle2 className="w-3.5 h-3.5" /> {t('judge.room.evaluated2')}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                            {blockReason === 'not_activated' && !isDone && (
                                                                <div className="mt-1.5 flex items-center gap-1 text-[10px] font-black text-gray-400 uppercase">
                                                                    <LockIcon className="w-3 h-3" /> Aguardando acionamento
                                                                </div>
                                                            )}
                                                            {blockReason === 'full' && !isDone && (
                                                                <div className="mt-1.5 flex items-center gap-1 text-[10px] font-black text-yellow-700 uppercase">
                                                                    <Zap className="w-3 h-3" /> Reserva · 3 juízes já avaliaram
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col pb-1 shrink-0 self-end gap-1">
                                                        <button
                                                            onClick={() => {
                                                                if (isDone) {
                                                                    handleRequestEdit(comp, selectedTestView);
                                                                } else if (!blocked) {
                                                                    startEvaluation(comp, selectedTestView);
                                                                }
                                                            }}
                                                            disabled={blocked && !isDone}
                                                            className={`
                                                            w-12 h-12 flex flex-col items-center justify-center rounded-xl transition-all shadow-sm border group/btn
                                                            ${isDone
                                                                    ? hasApprovedRequest
                                                                        ? 'bg-blue-50 border-blue-300 text-blue-600 hover:bg-blue-100 active:scale-95 cursor-pointer animate-pulse'
                                                                        : hasPendingRequest
                                                                            ? 'bg-amber-50 border-amber-200 text-amber-500 cursor-pointer'
                                                                            : 'bg-green-50 border-green-100 text-green-500 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-500 cursor-pointer'
                                                                    : isActivatedForMe
                                                                        ? 'bg-amber-400 border-amber-500 text-amber-900 hover:bg-amber-500 active:scale-95 animate-pulse'
                                                                        : blocked
                                                                            ? 'bg-gray-100 border-gray-200 text-gray-300 cursor-not-allowed'
                                                                            : 'bg-orange-50 border-orange-100 text-orange-600 hover:bg-orange-100 hover:border-orange-200 active:scale-95'
                                                                }
                                                        `}
                                                            title={
                                                                isDone
                                                                    ? hasApprovedRequest ? 'Edição aprovada! Clique para re-avaliar'
                                                                        : hasPendingRequest ? 'Aguardando aprovação do admin'
                                                                            : 'Solicitar edição de nota'
                                                                    : blockReason === 'not_activated' ? 'Aguardando acionamento do admin'
                                                                        : blockReason === 'full' ? 'Já há 3 juízes titulares'
                                                                            : isActivatedForMe ? 'Você foi acionado! Avalie agora'
                                                                                : t('judge.room.evaluate')
                                                            }
                                                        >
                                                            {isDone
                                                                ? hasApprovedRequest
                                                                    ? <Pencil className="w-5 h-5" />
                                                                    : hasPendingRequest
                                                                        ? <Clock className="w-5 h-5" />
                                                                        : <Pencil className="w-5 h-5" />
                                                                : isActivatedForMe
                                                                    ? <Bell className="w-6 h-6" />
                                                                    : blockReason === 'not_activated'
                                                                        ? <LockIcon className="w-5 h-5" />
                                                                        : blockReason === 'full'
                                                                            ? <Zap className="w-5 h-5" />
                                                                            : <Trophy className="w-6 h-6" />
                                                            }
                                                            <span className="text-[7px] font-black uppercase text-center leading-none mt-1">
                                                                {isDone
                                                                    ? hasApprovedRequest
                                                                        ? t('judge.room.edit')
                                                                        : hasPendingRequest
                                                                            ? 'Aguard.'
                                                                            : t('judge.room.edit')
                                                                    : isActivatedForMe
                                                                        ? 'Avaliar!'
                                                                        : blockReason === 'not_activated'
                                                                            ? 'Bloqueado'
                                                                            : blockReason === 'full'
                                                                                ? 'Completo'
                                                                                : t('judge.room.evaluate')
                                                                }
                                                            </span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de Solicitação de Edição de Nota */}
            <Modal
                isOpen={showEditRequestModal}
                onClose={() => { setShowEditRequestModal(false); setEditRequestTarget(null); setEditRequestReason(''); }}
                title={<div className="flex items-center gap-2 text-orange-600 uppercase font-black"><Pencil className="w-5 h-5" /> {t('judge.room.editRequest.title')}</div>}
                maxWidth="max-w-md"
            >
                <div className="flex flex-col items-center text-center p-2">
                    <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mb-4 border-2 border-orange-100 shadow-inner">
                        <Pencil className="w-8 h-8 text-orange-400" />
                    </div>

                    <h3 className="text-lg font-black text-k9-black uppercase mb-1 tracking-tighter">
                        {t('judge.room.editRequest.question')}
                    </h3>
                    <p className="text-xs text-gray-500 font-semibold mb-4 uppercase tracking-tight">
                        {t('judge.room.editRequest.adminApproval')}
                    </p>

                    {editRequestTarget && (
                        <div className="w-full bg-gray-50 rounded-xl border border-gray-100 p-4 mb-4">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center font-black text-orange-600 text-sm border border-orange-200 overflow-hidden shrink-0">
                                    {editRequestTarget.competitor.photoUrl ? (
                                        <img src={editRequestTarget.competitor.photoUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        editRequestTarget.competitor.handlerName.substring(0, 2).toUpperCase()
                                    )}
                                </div>
                                <div className="text-left">
                                    <div className="font-black text-k9-black uppercase text-sm">{editRequestTarget.competitor.handlerName}</div>
                                    <div className="text-[10px] text-gray-400 font-bold uppercase">{editRequestTarget.test.title}</div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-200">
                                <span className="text-[10px] font-black text-gray-400 uppercase">{t('judge.room.editRequest.currentScore')}</span>
                                <span className="text-lg font-black text-k9-orange">{editRequestTarget.evaluation.finalScore.toFixed(1)} <span className="text-xs text-gray-300">pts</span></span>
                            </div>
                        </div>
                    )}

                    <div className="w-full mb-6">
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 text-left">
                            {t('judge.room.editRequest.reasonLabel')}
                        </label>
                        <textarea
                            value={editRequestReason}
                            onChange={(e) => setEditRequestReason(e.target.value)}
                            className="w-full bg-white border-2 border-gray-200 text-k9-black p-3 rounded-xl focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 min-h-[80px] text-sm font-semibold"
                            placeholder={t('judge.room.editRequest.reasonPlaceholder')}
                        />
                    </div>

                    <div className="flex gap-4 w-full">
                        <button
                            onClick={() => { setShowEditRequestModal(false); setEditRequestTarget(null); setEditRequestReason(''); }}
                            className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-k9-black font-bold uppercase text-xs rounded-xl tracking-wider cursor-pointer border-2 border-gray-200 transition-all"
                        >
                            {t('judge.room.editRequest.cancel')}
                        </button>
                        <button
                            onClick={submitEditRequest}
                            disabled={!editRequestReason.trim() || sendingEditRequest}
                            className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold uppercase text-xs rounded-xl tracking-wider cursor-pointer border-2 border-orange-600 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <Send className="w-4 h-4" />
                            {sendingEditRequest ? t('judge.room.editRequest.sending') : t('judge.room.editRequest.send')}
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
}
