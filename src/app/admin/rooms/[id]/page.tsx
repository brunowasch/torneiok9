'use client';

import { useState, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Room, Competitor, TestTemplate, ScoreGroup, PenaltyOption, ScoreOption, AppUser, Modality, INITIAL_MODALITIES, Evaluation, ModalityConfig, EditScoreRequest, PenaltyTemplate } from '@/types/schema';
import { getRoomById, getCompetitorsByRoom, getTestTemplates, addCompetitor, updateCompetitor, deleteCompetitor, createTestTemplate, updateTestTemplate, deleteTestTemplate, getJudgesList, addJudgeToRoom, removeJudgeFromRoom, updateJudgeTestAssignments, updateJudgeModalityAssignments, getModalities, setJudgeReserve, setJudgeReserveModalities, setJudgeCompetitorReserves, activateReserve, deactivateReserve, updateRoom, subscribeToRoom, subscribeToCompetitorsByRoom, subscribeToTestsByRoom, numberCompetitorsByModality, clearCompetitorNumbersByModality, numberAllCompetitorsByRoom, clearAllCompetitorNumbersByRoom, toggleModalityFreeze, toggleAllFreeze, createPenaltyTemplate, getPenaltyTemplates, deletePenaltyTemplate, subscribeToPenaltyTemplates, applyAdminPenalty, removeAdminPenalty } from '@/services/adminService';
import { getEvaluationsByRoom, setDidNotParticipate, deleteEvaluation, getEditScoreRequestsByRoom, respondToEditScoreRequest, getEvaluationHistory, subscribeToEvaluationsByRoom, subscribeToEditScoreRequestsByRoom } from '@/services/evaluationService';
import { createJudgeByAdmin, updateUser } from '@/services/userService';
import Modal from '@/components/Modal';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useTranslation } from 'react-i18next';
import RoomCountdown from '@/components/RoomCountdown';
import MaskedDateInput from '@/components/MaskedDateInput';
import DateToast from '@/components/DateToast';
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
    Send,
    Calendar,
    Save,
    GripVertical,
    Search,
    History,
    RotateCcw
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
        router.push('/');
    };
    const [activeTab, setActiveTab] = useState<'competitors' | 'tests' | 'judges' | 'rankings' | 'penalties'>('tests');
    const [compToMarkNC, setCompToMarkNC] = useState<{ test: TestTemplate, comp: Competitor } | null>(null);
    const [evalToDelete, setEvalToDelete] = useState<{ id: string, name: string, testTitle: string, isNC: boolean, photoUrl?: string, deleteAll?: boolean, evalIds?: string[], judgeName?: string } | null>(null);
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
    const [templateDescription, setTemplateDescription] = useState('');
    const [selectedModality, setSelectedModality] = useState<Modality | ''>('');
    const [genMsg, setGenMsg] = useState('');
    const [editingTestId, setEditingTestId] = useState<string | null>(null);
    const [templateDrugPointsAmount, setTemplateDrugPointsAmount] = useState<number>(0);

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

    // Date editing
    const [editingDates, setEditingDates] = useState(false);
    const [dateForm, setDateForm] = useState({ startDate: '', startTime: '00:00', endDate: '', endTime: '23:59' });
    const [savingDates, setSavingDates] = useState(false);
    const [dateErrors, setDateErrors] = useState<Record<string, string>>({});

    // Deletion Modal State
    const [itemToDelete, setItemToDelete] = useState<{ id: string, name: string, type: 'competitor' | 'test' | 'judge' } | null>(null);

    // Edit Score Requests
    const [editRequests, setEditRequests] = useState<EditScoreRequest[]>([]);
    const [viewingHistoryFor, setViewingHistoryFor] = useState<{ comp: Competitor, test: TestTemplate, evals: (Evaluation & { archivedAt?: number })[] } | null>(null);
    // Modal de configuração de reserva por competidor
    const [competitorReserveConfig, setCompetitorReserveConfig] = useState<Competitor | null>(null);
    const [testModalityFilter, setTestModalityFilter] = useState<string>('');
    const [rankingsModalityFilter, setRankingsModalityFilter] = useState<string>('');
    const [competitorsModalityFilter, setCompetitorsModalityFilter] = useState<string>('');

    const [competitorsSortOrder, setCompetitorsSortOrder] = useState<'asc' | 'desc'>('asc');
    const [judgesSortOrder, setJudgesSortOrder] = useState<'asc' | 'desc'>('asc');
    const [rankingsSortOrder, setRankingsSortOrder] = useState<'asc' | 'desc'>('asc');

    const [competitorsSearch, setCompetitorsSearch] = useState('');
    const [judgesSearch, setJudgesSearch] = useState('');
    const [rankingsSearch, setRankingsSearch] = useState('');
    const [rankingsSortBy, setRankingsSortBy] = useState<'score' | 'alphabetical' | 'number'>('score');
    const [processingAction, setProcessingAction] = useState<string | null>(null);
    const [penaltyTemplates, setPenaltyTemplates] = useState<PenaltyTemplate[]>([]);
    const [showAddPenaltyTemplate, setShowAddPenaltyTemplate] = useState(false);
    const [penaltyForm, setPenaltyForm] = useState({ label: '', value: '', modality: '', description: '' });
    const [compForPenalty, setCompForPenalty] = useState<Competitor | null>(null);
    const [manualPenaltyForm, setManualPenaltyForm] = useState({ label: '', value: '', description: '', templateId: '' });

    const loadRoomData = useCallback(async () => {
        try {
            const r = await getRoomById(roomId);
            setRoom(r);

            const [c, t, j, e, er, pt] = await Promise.all([
                getCompetitorsByRoom(roomId),
                getTestTemplates(roomId),
                getJudgesList(),
                getEvaluationsByRoom(roomId),
                getEditScoreRequestsByRoom(roomId),
                getPenaltyTemplates(roomId)
            ]);
            setCompetitors(c);
            setTests(t);
            setAllJudges(j);
            setEvaluations(e);
            setEditRequests(er);
            setPenaltyTemplates(pt);
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
        if (roomId) localStorage.setItem('lastVisitedRoomId', roomId);
    }, [roomId]);

    useEffect(() => {
        if (!roomId) return;

        let unsubRoom: (() => void) | undefined;
        let unsubCompetitors: (() => void) | undefined;
        let unsubTests: (() => void) | undefined;
        let unsubEvaluations: (() => void) | undefined;
        let unsubRequests: (() => void) | undefined;
        let unsubPenalties: (() => void) | undefined;

        const setupListeners = async () => {
            try {
                unsubRoom = subscribeToRoom(roomId, setRoom);
                unsubCompetitors = subscribeToCompetitorsByRoom(roomId, setCompetitors);
                unsubTests = subscribeToTestsByRoom(roomId, setTests);
                unsubEvaluations = subscribeToEvaluationsByRoom(roomId, setEvaluations);
                unsubRequests = subscribeToEditScoreRequestsByRoom(roomId, setEditRequests);
                unsubPenalties = subscribeToPenaltyTemplates(roomId, setPenaltyTemplates);

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
            if (unsubRequests) unsubRequests();
            if (unsubPenalties) unsubPenalties();
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
                const modalityComps = competitors.filter(c => c.modality === compForm.modality);
                const nextNumber = modalityComps.length > 0
                    ? Math.max(...modalityComps.map(c => c.competitorNumber || 0)) + 1
                    : 1;

                await addCompetitor({
                    roomId,
                    handlerName: compForm.handlerName,
                    dogName: compForm.dogName,
                    dogBreed: compForm.dogBreed,
                    modality: compForm.modality as Modality,
                    competitorNumber: nextNumber,
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

    const addScoreItem = (label: string, points: number, description?: string) => {
        setScoreItems([...scoreItems, { id: `item-${Date.now()}`, label, maxPoints: points, description: description || '' }]);
    };
    const removeScoreItem = (index: number) => {
        setScoreItems(scoreItems.filter((_, i) => i !== index));
    };

    const editTest = (test: TestTemplate) => {
        setTemplateTitle(test.title);
        setTemplateDescription(test.description || '');
        setSelectedModality(test.modality || '');

        const allItems = test.groups.flatMap(g => g.items);
        setTemplateDrugPointsAmount(test.drugPointsAmount || 0);

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
                    description: templateDescription || "Sem descrição",
                    modality: selectedModality,
                    maxScore: totalScore,
                    groups,
                    penalties: penaltyItems,
                    testNumber,
                    drugPointsAmount: templateDrugPointsAmount
                });
            } else {
                const testNumber = tests.filter(t => t.modality === selectedModality).length + 1;
                await createTestTemplate({
                    title: templateTitle || "Nova Prova",
                    description: templateDescription || "Sem descrição",
                    modality: selectedModality,
                    maxScore: totalScore,
                    groups,
                    penalties: penaltyItems,
                    roomId,
                    testNumber,
                    drugPointsAmount: templateDrugPointsAmount
                });
            }

            // Reset
            setScoreItems([]);
            setPenaltyItems([]);
            setTemplateTitle('');
            setTemplateDescription('');
            setSelectedModality('');
            setEditingTestId(null);
            setTemplateDrugPointsAmount(0);
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

    const validateDates = (startDate: string, endDate: string, min: string, max: string): Record<string, string> => {
        const errors: Record<string, string> = {};
        const fmt = (iso: string) => { const [y, m, d] = splitDate(iso); return `${d}/${m}/${y}`; };
        const splitDate = (iso: string) => iso.split('-');
        if (startDate && startDate < min) errors.start = `Data de início inválida! O mínimo permitido é ${fmt(min)}.`;
        else if (startDate && startDate > max) errors.start = `Data de início inválida! O máximo permitido é ${fmt(max)}.`;
        if (endDate && endDate < min) errors.end = `Data de fim inválida! O mínimo permitido é ${fmt(min)}.`;
        else if (endDate && endDate > max) errors.end = `Data de fim inválida! O máximo permitido é ${fmt(max)}.`;
        else if (startDate && endDate && endDate < startDate) errors.end = `Data de fim não pode ser anterior à data de início!`;
        return errors;
    };

    const handleSaveDates = async () => {
        const errors = validateDates(dateForm.startDate, dateForm.endDate, minStartDate, maxEndDate);
        if (Object.keys(errors).length > 0) { setDateErrors(errors); return; }
        setSavingDates(true);
        try {
            await updateRoom(roomId, {
                startDate: dateForm.startDate || undefined,
                startTime: dateForm.startDate && dateForm.startTime ? dateForm.startTime : undefined,
                endDate: dateForm.endDate || undefined,
                endTime: dateForm.endDate ? (dateForm.endTime || '23:59') : undefined,
            });
            setDateErrors({});
            setEditingDates(false);
        } catch (err) {
            console.error(err);
            alert('Erro ao salvar as datas da sala.');
        } finally {
            setSavingDates(false);
        }
    };

    const handleUpdateDrugPoints = async (competitorId: string, testId: string, value: number) => {
        try {
            const comp = competitors.find(c => c.id === competitorId);
            if (!comp) return;
            const currentPoints = comp.drugPointsFound || {};
            await updateCompetitor(competitorId, {
                drugPointsFound: {
                    ...currentPoints,
                    [testId]: value
                }
            });
        } catch (err) {
            console.error("Error updating drug points", err);
            alert("Erro ao atualizar pontos de drogas");
        }
    };

    const handleAutoNumberModality = async (modality: string) => {
        if (!confirm(`Deseja numerar todos os competidores da modalidade "${modality}" aleatoriamente (sorteio)?`)) return;
        setProcessingAction(`numbering-${modality}`);
        try {
            await numberCompetitorsByModality(roomId, modality);
        } catch (err) {
            console.error(err);
            alert("Erro ao numerar competidores");
        } finally {
            setProcessingAction(null);
        }
    };

    const handleClearModalityNumbers = async (modality: string) => {
        if (!confirm(`Deseja remover a numeração de todos os competidores da modalidade "${modality}"?`)) return;
        setProcessingAction(`clearing-${modality}`);
        try {
            await clearCompetitorNumbersByModality(roomId, modality);
        } catch (err) {
            console.error(err);
            alert("Erro ao remover numeração");
        } finally {
            setProcessingAction(null);
        }
    };

    const handleNumberAll = async () => {
        if (!confirm('Deseja realizar o SORTEIO (numeração aleatória) de TODOS os competidores de TODAS as modalidades?')) return;
        setProcessingAction('numbering-all');
        try {
            await numberAllCompetitorsByRoom(roomId);
            alert('Todos os competidores foram numerados com sucesso!');
        } catch (err) {
            console.error(err);
            alert('Erro ao numerar todos os competidores.');
        } finally {
            setProcessingAction(null);
        }
    };

    const handleClearAllNumbers = async () => {
        if (!confirm('Deseja remover a numeração de TODOS os competidores de TODAS as modalidades?')) return;
        setProcessingAction('clearing-all');
        try {
            await clearAllCompetitorNumbersByRoom(roomId);
            alert('Todas as numerações foram removidas com sucesso!');
        } catch (err) {
            console.error(err);
            alert('Erro ao remover todas as numerações.');
        } finally {
            setProcessingAction(null);
        }
    };

    const handleToggleModalityFreeze = async (modality: string, currentStatus: boolean) => {
        setProcessingAction(`freezing-${modality}`);
        try {
            await toggleModalityFreeze(roomId, modality, !currentStatus);
        } catch (err) {
            console.error(err);
            alert("Erro ao alterar status de visualização");
        } finally {
            setProcessingAction(null);
        }
    };

    const handleToggleAllFreeze = async () => {
        const current = room?.allFrozen || false;
        setProcessingAction('freezing-all');
        try {
            await toggleAllFreeze(roomId, !current);
        } catch (err) {
            console.error(err);
            alert("Erro ao alterar status global de visualização");
        } finally {
            setProcessingAction(null);
        }
    };

    const handleAddPenaltyTemplate = async () => {
        if (!penaltyForm.label || !penaltyForm.value || !penaltyForm.modality) {
            alert('Preencha todos os campos.');
            return;
        }
        try {
            await createPenaltyTemplate({
                roomId,
                label: penaltyForm.label,
                value: -Math.abs(parseFloat(penaltyForm.value)),
                modality: penaltyForm.modality,
                description: penaltyForm.description || undefined
            });
            setShowAddPenaltyTemplate(false);
            setPenaltyForm({ label: '', value: '', modality: '', description: '' });
        } catch (err) {
            console.error(err);
            alert('Erro ao criar penalidade.');
        }
    };

    const handleDeletePenaltyTemplate = async (id: string) => {
        if (!confirm('Deseja excluir esta penalidade padrão?')) return;
        try {
            await deletePenaltyTemplate(id);
        } catch (err) {
            console.error(err);
            alert('Erro ao excluir penalidade.');
        }
    };

    const handleApplyAdminPenalty = async () => {
        if (!compForPenalty || (!manualPenaltyForm.label && !manualPenaltyForm.templateId) || !manualPenaltyForm.value) {
            alert('Preencha os dados da penalidade.');
            return;
        }
        try {
            const label = manualPenaltyForm.templateId
                ? penaltyTemplates.find(p => p.id === manualPenaltyForm.templateId)?.label || manualPenaltyForm.label
                : manualPenaltyForm.label;

            await applyAdminPenalty(compForPenalty.id, {
                penaltyId: manualPenaltyForm.templateId || 'manual',
                label,
                value: -Math.abs(parseFloat(manualPenaltyForm.value)),
                description: manualPenaltyForm.description
            });
            setCompForPenalty(null);
            setManualPenaltyForm({ label: '', value: '', description: '', templateId: '' });
        } catch (err) {
            console.error(err);
            alert('Erro ao aplicar penalidade.');
        }
    };

    const handleRemoveAdminPenalty = async (competitorId: string, createdAt: number) => {
        if (!confirm('Deseja remover esta penalidade?')) return;
        try {
            await removeAdminPenalty(competitorId, createdAt);
        } catch (err) {
            console.error(err);
            alert('Erro ao remover penalidade.');
        }
    };

    if (loading) return <div className="min-h-screen bg-k9-white flex items-center justify-center text-k9-orange font-mono">{t('admin.loading')}</div>;
    if (!room) return <div className="p-8 text-k9-black">{t('admin.roomNotFound')}</div>;

    const currentYear = new Date().getFullYear();
    const minStartDate = `${currentYear}-01-01`;
    const maxEndDate = `${currentYear + 1}-12-31`;

    return (
        <>
            <div className="min-h-screen bg-k9-white text-k9-black">
                {/* Header */}
                <div className="bg-black border-b-4 border-k9-orange text-white shadow-md relative">
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-k9-orange/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                    </div>
                    <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8 relative z-10">
                        <Link href="/admin" className="inline-flex items-center gap-2 px-3 py-1.5 text-[10px] md:text-xs font-bold uppercase tracking-wider rounded-md bg-gray-900 text-gray-400 border border-gray-700 hover:bg-gray-800 hover:text-white transition-colors cursor-pointer mb-6 group relative z-50 w-max pointer-events-auto">
                            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" /> {t('admin.back')}
                        </Link>
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                            <div className="flex-1 min-w-0 flex flex-col gap-5">
                                {/* Logo and Name row */}
                                <div className="flex items-center gap-4 md:gap-5">
                                    <div className="w-14 h-14 md:w-16 md:h-16 relative flex items-center justify-center shrink-0 p-2 bg-white/5 rounded-2xl border border-white/10 shadow-lg">
                                        <img src="/logo.png" alt="Logo" className="object-contain w-full h-full drop-shadow-md" />
                                    </div>
                                    <div className="min-w-0 flex flex-col justify-center">
                                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white uppercase tracking-tighter leading-none truncate mb-2.5">
                                            {room.name}
                                        </h1>
                                        <div className="flex flex-wrap items-center gap-2 md:gap-3">
                                            <span className="text-[10px] md:text-xs font-mono text-blue-400 bg-blue-900/20 px-2 py-1 md:px-3 md:py-1 rounded-md border border-blue-900/50">ID: {room.id}</span>
                                            <span className={`text-[10px] md:text-xs font-bold uppercase flex items-center gap-2 px-2 py-1 md:px-3 md:py-1 rounded-full border ${room.active ? 'bg-green-900/20 text-green-400 border-green-900/30' : 'bg-red-900/20 text-red-400 border-red-900/30'}`}>
                                                <div className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${room.active ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                                                {room.active ? t('admin.active') : t('admin.finished')}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Dates and Countdown row */}
                                <div className="flex flex-col gap-3">
                                    {room.startDate && (
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-k9-orange shrink-0" />
                                            <span className="text-k9-orange text-sm md:text-base font-black tracking-wide">
                                                {new Date(room.startDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                {room.endDate && room.endDate !== room.startDate && (
                                                    <> - {new Date(room.endDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</>
                                                )}
                                            </span>
                                        </div>
                                    )}
                                    <div className="mt-1">
                                        <RoomCountdown room={room} variant="dark" />
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 relative z-10 self-end md:self-start mt-2 md:mt-0">
                                <button
                                    onClick={handleLogout}
                                    className="text-white hover:text-red-400 text-[10px] md:text-xs font-bold uppercase flex items-center gap-2 transition-colors border border-gray-700 bg-gray-900 px-4 py-2.5 md:px-5 md:py-3 rounded-xl hover:border-red-500/50 hover:bg-red-900/10 shadow-lg"
                                >
                                    <LogOut className="w-4 h-4" /> {t('admin.logout')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Actions */}
                <div className="max-w-6xl mx-auto px-3 py-6 sm:p-6 md:p-8 bg-gray-50 rounded-xl mt-4 md:mt-8 mb-12 md:mb-16">

                    {/* === MOVED: SEÇÃO DE SOLICITAÇÕES DE EDIÇÃO DE NOTA (Sempre visível se houver pendentes) === */}
                    {editRequests.filter(r => r.status === 'pending').length > 0 && (
                        <div className="mb-6 md:mb-8 bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-4 md:p-6 shadow-md border-l-8 border-l-amber-400">
                            <div className="flex items-center gap-3 mb-4 md:mb-6">
                                <div className="w-8 h-8 md:w-10 md:h-10 bg-amber-400 rounded-xl flex items-center justify-center shadow-sm animate-pulse">
                                    <Send className="w-4 h-4 md:w-5 md:h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-base md:text-lg font-black text-k9-black uppercase tracking-tighter">{t('admin.editRequests.title')}</h3>
                                    <p className="text-[9px] md:text-[10px] font-bold text-amber-600 uppercase">{editRequests.filter(r => r.status === 'pending').length} {t('admin.editRequests.pending')}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {editRequests.filter(r => r.status === 'pending').map(req => {
                                    const comp = competitors.find(c => c.id === req.competitorId);
                                    const test = tests.find(t => t.id === req.testId);
                                    const eval_ = evaluations.find(e => e.id === req.evaluationId);

                                    return (
                                        <div key={req.id} className="bg-white rounded-xl border border-amber-100 p-4 shadow-sm hover:shadow-md transition-all">
                                            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
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
                                                        <div className="flex flex-wrap items-center gap-2 mt-1">
                                                            <span className="text-[9px] font-black text-amber-600 uppercase bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                                                                <Clock className="w-3 h-3" /> {req.judgeName}
                                                            </span>
                                                            {eval_ && (
                                                                <span className="text-[9px] font-black text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                                                                    {eval_.finalScore.toFixed(1)} pts
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="mt-2 text-[11px] text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-100">
                                                            <span className="text-[9px] font-black text-gray-400 uppercase block mb-0.5">{t('admin.editRequests.reason')}:</span>
                                                            {req.reason}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex sm:flex-col gap-2 shrink-0 w-full sm:w-auto">
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
                                                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 text-[9px] font-black uppercase rounded-lg bg-green-500 text-white border border-green-600 hover:bg-green-600 transition-all cursor-pointer shadow-sm"
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
                                                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 text-[9px] font-black uppercase rounded-lg bg-white text-red-600 border border-red-200 hover:bg-red-50 transition-all cursor-pointer shadow-sm"
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
                    <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-none -mx-2 px-2">
                        <button
                            onClick={() => setActiveTab('tests')}
                            className={`px-3 py-2 text-[10px] md:text-xs font-black uppercase tracking-wider rounded-md flex items-center gap-2 transition-all border-2 cursor-pointer whitespace-nowrap min-w-max ${activeTab === 'tests' ? 'bg-orange-400 text-white border-orange-400 shadow-md scale-105' : 'bg-orange-50 text-orange-400 border-orange-100 hover:bg-orange-100 hover:text-orange-500'}`}
                        >
                            <FileText className="w-3.5 h-3.5 md:w-4 md:h-4" /> {t('admin.tabs.tests')} ({tests.length})
                        </button>

                        <button
                            onClick={() => setActiveTab('competitors')}
                            className={`px-3 py-2 text-[10px] md:text-xs font-black uppercase tracking-wider rounded-md flex items-center gap-2 transition-all border-2 cursor-pointer whitespace-nowrap min-w-max ${activeTab === 'competitors' ? 'bg-orange-400 text-white border-orange-400 shadow-md scale-105' : 'bg-orange-50 text-orange-400 border-orange-100 hover:bg-orange-100 hover:text-orange-500'}`}
                        >
                            <Users className="w-3.5 h-3.5 md:w-4 md:h-4" /> {t('admin.tabs.competitors')} ({competitors.length})
                        </button>

                        <button
                            onClick={() => setActiveTab('judges')}
                            className={`px-3 py-2 text-[10px] md:text-xs font-black uppercase tracking-wider rounded-md flex items-center gap-2 transition-all border-2 cursor-pointer whitespace-nowrap min-w-max ${activeTab === 'judges' ? 'bg-orange-400 text-white border-orange-400 shadow-md scale-105' : 'bg-orange-50 text-orange-400 border-orange-100 hover:bg-orange-100 hover:text-orange-500'}`}
                        >
                            <ShieldCheck className="w-3.5 h-3.5 md:w-4 md:h-4" /> {t('admin.tabs.judges')} ({room?.judges?.length || 0})
                        </button>

                        <button
                            onClick={() => setActiveTab('penalties')}
                            className={`px-3 py-2 text-[10px] md:text-xs font-black uppercase tracking-wider rounded-md flex items-center gap-2 transition-all border-2 cursor-pointer whitespace-nowrap min-w-max ${activeTab === 'penalties' ? 'bg-orange-400 text-white border-orange-400 shadow-md scale-105' : 'bg-orange-50 text-orange-400 border-orange-100 hover:bg-orange-100 hover:text-orange-500'}`}
                        >
                            <AlertCircle className="w-3.5 h-3.5 md:w-4 md:h-4" /> Penalidades
                        </button>

                        <button
                            onClick={() => setActiveTab('rankings')}
                            className={`px-3 py-2 text-[10px] md:text-xs font-black uppercase tracking-wider rounded-md flex items-center gap-2 transition-all border-2 cursor-pointer relative whitespace-nowrap min-w-max ${activeTab === 'rankings' ? 'bg-orange-400 text-white border-orange-400 shadow-md scale-105' : 'bg-orange-50 text-orange-400 border-orange-100 hover:bg-orange-100 hover:text-orange-500'}`}
                        >
                            <Trophy className="w-3.5 h-3.5 md:w-4 md:h-4" /> {t('admin.tabs.results')}
                            {editRequests.filter(r => r.status === 'pending').length > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 md:w-5 md:h-5 bg-red-500 text-white text-[8px] md:text-[9px] font-black rounded-full flex items-center justify-center animate-pulse shadow-lg">
                                    {editRequests.filter(r => r.status === 'pending').length}
                                </span>
                            )}
                        </button>
                    </div>

                    {activeTab === 'competitors' && (
                        <div>
                            {/* Filtro por modalidade */}
                            {(() => {
                                const competitorModalities = [...new Set(competitors.map(c => c.modality).filter(Boolean))] as string[];
                                return competitorModalities.length > 1 && (
                                    <div className="flex flex-wrap gap-2 mb-6">
                                        <button
                                            onClick={() => setCompetitorsModalityFilter('')}
                                            className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wide rounded-lg border-2 transition-all cursor-pointer ${competitorsModalityFilter === ''
                                                ? 'bg-orange-400 text-white border-orange-400'
                                                : 'bg-white text-gray-500 border-gray-200 hover:border-orange-300 hover:text-orange-600'
                                                }`}
                                        >
                                            Todas
                                        </button>
                                        {competitorModalities.sort().map(mod => {
                                            const count = competitors.filter(c => c.modality === mod).length;
                                            return (
                                                <button
                                                    key={mod}
                                                    onClick={() => setCompetitorsModalityFilter(mod)}
                                                    className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wide rounded-lg border-2 transition-all cursor-pointer ${competitorsModalityFilter === mod
                                                        ? 'bg-orange-400 text-white border-orange-400'
                                                        : 'bg-white text-gray-500 border-gray-200 hover:border-orange-300 hover:text-orange-600'
                                                        }`}
                                                >
                                                    {mod} <span className="opacity-60">({count})</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                );
                            })()}

                            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mb-6">
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                                    <div className="relative flex-1 sm:min-w-[250px]">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Pesquisar..."
                                            value={competitorsSearch}
                                            onChange={e => setCompetitorsSearch(e.target.value)}
                                            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400"
                                        />
                                    </div>
                                    <button
                                        onClick={() => setCompetitorsSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                                        className="px-4 py-2 text-sm font-black uppercase tracking-wider rounded-lg border-2 transition-all duration-200 shadow-sm flex items-center justify-center gap-2 bg-white text-gray-600 border-gray-200 hover:bg-gray-50 active:scale-95 shrink-0"
                                        title="Alternar ordem de classificação"
                                    >
                                        {competitorsSortOrder === 'asc' ? 'A-Z ↓' : 'Z-A ↑'}
                                    </button>
                                </div>
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

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {competitors
                                    .filter(c => !competitorsModalityFilter || c.modality === competitorsModalityFilter)
                                    .filter(c => c.handlerName.toLowerCase().includes(competitorsSearch.toLowerCase()) || c.dogName.toLowerCase().includes(competitorsSearch.toLowerCase()))
                                    .sort((a, b) => {
                                        if (a.modality !== b.modality) {
                                            return (a.modality || '').localeCompare(b.modality || '');
                                        }
                                        const result = a.handlerName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').localeCompare(b.handlerName.normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
                                        return competitorsSortOrder === 'asc' ? result : -result;
                                    })
                                    .map(comp => {
                                        const testCount = tests.filter(t => t.modality === comp.modality).length;

                                        return (
                                            <div key={comp.id} className="bg-white border border-gray-100 p-4 sm:p-5 sm:pl-8 rounded-2xl hover:shadow-md transform md:hover:-translate-y-1 transition-all flex items-start justify-between gap-6 group min-h-[130px]">
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
                                {competitors.filter(c => !competitorsModalityFilter || c.modality === competitorsModalityFilter).filter(c => c.handlerName.toLowerCase().includes(competitorsSearch.toLowerCase()) || c.dogName.toLowerCase().includes(competitorsSearch.toLowerCase())).length === 0 && <div className="text-gray-500 col-span-full text-center py-8">{t('admin.competitors.noCompetitors')}</div>}
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
                    {activeTab === 'tests' && (() => {
                        // Group and sort tests by modality
                        const testsByModality: Record<string, TestTemplate[]> = {};
                        const sortedModalities: string[] = [];
                        [...tests].sort((a, b) => {
                            if (a.modality !== b.modality) return (a.modality || '').localeCompare(b.modality || '');
                            return (a.testNumber || 0) - (b.testNumber || 0);
                        }).forEach(t => {
                            const mod = t.modality || 'SEM_MODALIDADE';
                            if (!testsByModality[mod]) { testsByModality[mod] = []; sortedModalities.push(mod); }
                            testsByModality[mod].push(t);
                        });

                        const handleDragEnd = async (result: DropResult) => {
                            const { source, destination, draggableId } = result;
                            if (!destination) return;
                            const mod = source.droppableId;
                            if (mod !== destination.droppableId) return; // cross-modality not allowed
                            if (source.index === destination.index) return;

                            const modTests = [...(testsByModality[mod] || [])];
                            const [moved] = modTests.splice(source.index, 1);
                            modTests.splice(destination.index, 0, moved);

                            // Optimistically update local state
                            const updatedTests = tests.map(t => {
                                const newIdx = modTests.findIndex(mt => mt.id === t.id);
                                if (newIdx !== -1) return { ...t, testNumber: newIdx + 1 };
                                return t;
                            });
                            setTests(updatedTests);

                            // Persist to Firestore
                            try {
                                await Promise.all(modTests.map((t, idx) =>
                                    updateTestTemplate(t.id, { testNumber: idx + 1 })
                                ));
                            } catch (err) {
                                console.error('Error saving order', err);
                                loadRoomData(); // revert on error
                            }
                        };

                        return (
                            <div>
                                <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mb-6">
                                    <div className="flex items-center gap-2 text-xs text-gray-400 font-bold uppercase bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                                        <GripVertical className="w-4 h-4 text-blue-400" />
                                        Arraste as provas para reordenar
                                    </div>
                                    <button
                                        onClick={() => {
                                            setEditingTestId(null);
                                            setScoreItems([]);
                                            setTemplateTitle('');
                                            setSelectedModality('');
                                            setShowAddTest(true);
                                        }}
                                        className="flex-1 sm:flex-none justify-center px-4 py-3 sm:py-2 text-[10px] sm:text-sm font-black uppercase tracking-wider rounded-lg border-2 transition-all duration-200 shadow-sm flex items-center gap-2 bg-purple-50 text-purple-700 border-purple-100 hover:bg-purple-100 cursor-pointer"
                                    >
                                        <Wand2 className="w-4 h-4 text-purple-700" /> {t('admin.tests.create')}
                                    </button>
                                </div>

                                {/* Filtro por modalidade */}
                                {sortedModalities.length > 1 && (
                                    <div className="flex flex-wrap gap-2 mb-6">
                                        <button
                                            onClick={() => setTestModalityFilter('')}
                                            className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wide rounded-lg border-2 transition-all cursor-pointer ${testModalityFilter === ''
                                                ? 'bg-orange-400 text-white border-orange-400'
                                                : 'bg-white text-gray-500 border-gray-200 hover:border-orange-300 hover:text-orange-600'
                                                }`}
                                        >
                                            Todas
                                        </button>
                                        {sortedModalities.map(mod => (
                                            <button
                                                key={mod}
                                                onClick={() => setTestModalityFilter(mod)}
                                                className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wide rounded-lg border-2 transition-all cursor-pointer ${testModalityFilter === mod
                                                    ? 'bg-orange-400 text-white border-orange-400'
                                                    : 'bg-white text-gray-500 border-gray-200 hover:border-orange-300 hover:text-orange-600'
                                                    }`}
                                            >
                                                {mod} <span className="opacity-60">({testsByModality[mod].length})</span>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <DragDropContext onDragEnd={handleDragEnd}>
                                    <div className="space-y-8">
                                        {sortedModalities.filter(mod => !testModalityFilter || mod === testModalityFilter).map(mod => (
                                            <div key={mod}>
                                                <div className="flex items-center gap-2 mb-3">
                                                    <div className="w-1 h-5 bg-orange-400 rounded-full" />
                                                    <span className="text-xs font-black uppercase tracking-widest text-gray-500">{mod}</span>
                                                    <span className="text-[10px] text-gray-400 font-bold">— {testsByModality[mod].length} prova(s)</span>
                                                    <div className="flex-1 h-px bg-gray-100" />
                                                </div>
                                                <Droppable droppableId={mod}>
                                                    {(provided, snapshot) => (
                                                        <div
                                                            ref={provided.innerRef}
                                                            {...provided.droppableProps}
                                                            className={`space-y-3 min-h-12 rounded-xl transition-colors ${snapshot.isDraggingOver ? 'bg-orange-50/50 ring-2 ring-orange-200' : ''}`}
                                                        >
                                                            {testsByModality[mod].map((test, index) => (
                                                                <Draggable key={test.id} draggableId={test.id} index={index}>
                                                                    {(provided, snapshot) => (
                                                                        <div
                                                                            ref={provided.innerRef}
                                                                            {...provided.draggableProps}
                                                                            className={`bg-white border rounded-2xl p-4 md:p-5 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 group
                                                                            ${snapshot.isDragging
                                                                                    ? 'border-orange-400 shadow-xl ring-2 ring-orange-300 rotate-1 scale-[1.02]'
                                                                                    : 'border-gray-100 hover:shadow-md'
                                                                                }`}
                                                                        >
                                                                            <div className="flex items-start sm:items-center gap-3 md:gap-4 w-full sm:w-auto">
                                                                                {/* Drag handle */}
                                                                                <div
                                                                                    {...provided.dragHandleProps}
                                                                                    className="text-gray-300 hover:text-orange-400 cursor-grab active:cursor-grabbing transition-colors shrink-0 mt-1 sm:mt-0"
                                                                                    title="Arraste para reordenar"
                                                                                >
                                                                                    <GripVertical className="w-5 h-5" />
                                                                                </div>
                                                                                <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-900 text-white rounded-lg flex items-center justify-center font-black text-sm shrink-0 border border-gray-800 shadow-sm">
                                                                                    {test.testNumber ? test.testNumber.toString().padStart(2, '0') : '--'}
                                                                                </div>
                                                                                <div className="flex-1 min-w-0">
                                                                                    <h3 className="font-black text-k9-black uppercase text-sm md:text-base leading-tight truncate">{test.title}</h3>
                                                                                    {test.description && (
                                                                                        <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5 line-clamp-1">{test.description}</p>
                                                                                    )}
                                                                                    <div className="text-[10px] text-gray-400 mt-2 flex flex-wrap gap-x-3 gap-y-1 font-bold items-center">
                                                                                        <div className="flex items-center gap-1.5">
                                                                                            <span className="text-gray-400 uppercase">{t('admin.tests.maxScore')}: {test.maxScore} {t('admin.tests.pts')}</span>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-3 sm:pt-0 border-t border-gray-50 sm:border-0">
                                                                                <div className="flex items-center gap-2">
                                                                                    <button
                                                                                        onClick={() => editTest(test)}
                                                                                        className="w-9 h-9 flex items-center justify-center bg-gray-50 rounded-lg text-gray-400 hover:bg-orange-50 hover:text-orange-500 transition-colors cursor-pointer border border-gray-100"
                                                                                        title="Editar Prova"
                                                                                    >
                                                                                        <Pencil className="w-4 h-4" />
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() => handleDeleteTest(test.id, test.title)}
                                                                                        className="w-9 h-9 flex items-center justify-center bg-gray-50 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors cursor-pointer border border-gray-100"
                                                                                        title="Excluir Prova"
                                                                                    >
                                                                                        <Trash2 className="w-4 h-4" />
                                                                                    </button>
                                                                                </div>
                                                                                <div className="px-3 py-1.5 bg-orange-50 text-orange-600 text-[10px] font-black uppercase rounded border border-orange-100 tracking-wider">
                                                                                    {t('admin.tests.active')}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </Draggable>
                                                            ))}
                                                            {provided.placeholder}
                                                        </div>
                                                    )}
                                                </Droppable>
                                            </div>
                                        ))}
                                        {tests.length === 0 && <div className="text-gray-500 text-center py-8">{t('admin.tests.noTests')}</div>}
                                    </div>
                                </DragDropContext>

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
                                                className="w-full bg-gray-50 border border-gray-300 text-k9-black p-3 rounded focus:outline-none focus:border-k9-orange focus:ring-1 focus:ring-k9-orange mt-1 font-semibold uppercase"
                                                placeholder={t('admin.tests.titlePlaceholder')}
                                            />
                                        </div>

                                        <div className="mb-6">
                                            <label className="text-xs font-bold text-gray-500 uppercase">{t('admin.tests.description')}</label>
                                            <textarea
                                                value={templateDescription}
                                                onChange={e => setTemplateDescription(e.target.value)}
                                                className="w-full bg-gray-50 border border-gray-300 text-k9-black p-3 rounded focus:outline-none focus:border-k9-orange focus:ring-1 focus:ring-k9-orange mt-1 text-sm h-24 resize-none"
                                                placeholder={t('admin.tests.descriptionPlaceholder')}
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

                                        {selectedModality?.toLowerCase().includes('faro') && (
                                            <div className="mb-6 bg-orange-50 p-4 rounded-xl border border-orange-200">
                                                <label className="text-xs font-black text-orange-700 uppercase flex items-center gap-2 mb-2">
                                                    <Search className="w-4 h-4" /> {t('admin.tests.drugPointsAmount')}
                                                </label>
                                                <input
                                                    type="number"
                                                    value={templateDrugPointsAmount}
                                                    onChange={e => setTemplateDrugPointsAmount(parseInt(e.target.value) || 0)}
                                                    className="w-full bg-white border border-orange-300 text-k9-black p-3 rounded focus:outline-none focus:border-k9-orange focus:ring-1 focus:ring-k9-orange font-bold"
                                                    placeholder="Ex: 5"
                                                />
                                                <p className="text-[10px] text-orange-600 font-bold uppercase mt-2">
                                                    Nota Final = Média dos Juízes + (Pontos Achados x 50)
                                                </p>
                                            </div>
                                        )}

                                        {/* Evaluation Items */}
                                        <div className="mb-6 p-4 bg-gray-50 rounded border border-gray-200">
                                            <div className="flex justify-between mb-2">
                                                <h3 className="text-sm font-bold text-k9-black uppercase">{t('admin.tests.criteria')}</h3>
                                                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded text-police-gold`}>{totalScore} pts</span>
                                            </div>
                                            <div className="space-y-2 mb-3">
                                                {scoreItems.map((item, i) => (
                                                    <div key={i} className="text-xs bg-tactical-gray p-2 rounded">
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-gray-300 font-semibold">{item.label}</span>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-police-gold font-mono">{item.maxPoints} pts</span>
                                                                <button onClick={() => removeScoreItem(i)} className="text-red-500 cursor-pointer"><X className="w-4 h-4" /></button>
                                                            </div>
                                                        </div>
                                                        {item.description && (
                                                            <p className="text-gray-400 text-[10px] mt-1 leading-relaxed">{item.description}</p>
                                                        )}
                                                    </div>
                                                ))}
                                                {scoreItems.length === 0 && <div className="text-xs text-gray-400 font-mono text-center">{t('admin.tests.noCriteria')}</div>}
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <div className="flex gap-2">
                                                    <input id="score-lbl" placeholder={t('admin.tests.criteriaPlaceholder')} className="flex-1 bg-gray-50 border border-gray-300 text-k9-black text-xs p-2 rounded" />
                                                    <input id="score-pts" placeholder={t('admin.tests.ptsPh')} type="number" step="0.5" defaultValue={10} className="w-16 bg-gray-50 border border-gray-300 text-k9-black text-xs p-2 rounded" />
                                                </div>
                                                <textarea
                                                    id="score-desc"
                                                    placeholder="Descrição do critério (opcional)"
                                                    className="w-full bg-gray-50 border border-gray-300 text-k9-black text-xs p-2 rounded resize-none h-16 focus:outline-none focus:border-k9-orange focus:ring-1 focus:ring-k9-orange"
                                                />
                                                <button
                                                    onClick={() => {
                                                        const lblEl = document.getElementById('score-lbl') as HTMLInputElement;
                                                        const ptsEl = document.getElementById('score-pts') as HTMLInputElement;
                                                        const descEl = document.getElementById('score-desc') as HTMLTextAreaElement;
                                                        const l = lblEl.value;
                                                        const p = parseFloat(ptsEl.value) || 10;
                                                        const d = descEl.value;
                                                        if (l) {
                                                            addScoreItem(l, p, d);
                                                            lblEl.value = '';
                                                            descEl.value = '';
                                                            lblEl.focus();
                                                        }
                                                    }}
                                                    className="self-end bg-gray-100 text-k9-black px-4 py-2 rounded text-xs uppercase font-bold cursor-pointer hover:bg-gray-200 transition-colors"
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
                        );
                    })()}

                    {activeTab === 'judges' && (
                        <div>
                            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mb-6">
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                                    <div className="relative flex-1 sm:min-w-[250px]">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Pesquisar..."
                                            value={judgesSearch}
                                            onChange={e => setJudgesSearch(e.target.value)}
                                            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400"
                                        />
                                    </div>
                                    <button
                                        onClick={() => setJudgesSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                                        className="px-4 py-2 text-sm font-black uppercase tracking-wider rounded-lg border-2 transition-all duration-200 shadow-sm flex items-center justify-center gap-2 bg-white text-gray-600 border-gray-200 hover:bg-gray-50 active:scale-95 shrink-0"
                                        title="Alternar ordem de classificação"
                                    >
                                        {judgesSortOrder === 'asc' ? 'A-Z ↓' : 'Z-A ↑'}
                                    </button>
                                </div>
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
                                {allJudges.filter(j => room?.judges?.includes(j.uid) ?? false)
                                    .filter(j => j.name.toLowerCase().includes(judgesSearch.toLowerCase()) || j.email.toLowerCase().includes(judgesSearch.toLowerCase()))
                                    .sort((a, b) => judgesSortOrder === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name))
                                    .map(j => {
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

                                                {/* Competidores específicos desta reserva */}
                                                {(() => {
                                                    const linkedComps = competitors.filter(c =>
                                                        (room?.judgeCompetitorReserves?.[c.id] || []).includes(j.uid)
                                                    );
                                                    if (linkedComps.length === 0) return null;
                                                    return (
                                                        <div className="mt-3 pt-3 border-t border-yellow-200">
                                                            <div className="text-[8px] text-purple-600 font-black uppercase tracking-widest mb-1.5">
                                                                Reserva específico de:
                                                            </div>
                                                            <div className="flex flex-wrap gap-1">
                                                                {linkedComps.map(c => (
                                                                    <span key={c.id} className="text-[9px] font-black uppercase px-2 py-0.5 bg-purple-100 text-purple-700 border border-purple-200 rounded-full">
                                                                        {c.handlerName}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
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
                                                {allJudges.filter(j => !(room?.judges?.includes(j.uid)))
                                                    .filter(j => j.name.toLowerCase().includes(judgesSearch.toLowerCase()) || j.email.toLowerCase().includes(judgesSearch.toLowerCase()))
                                                    .sort((a, b) => judgesSortOrder === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name))
                                                    .map(j => (
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

                    {activeTab === 'penalties' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h2 className="text-xl font-black text-k9-black uppercase tracking-tight">Gestão de Penalidades Padrão</h2>
                                    <p className="text-xs text-gray-400 font-bold uppercase mt-1">Crie modelos de penalidade para aplicar nos competidores na aba Resultados</p>
                                </div>
                                <button
                                    onClick={() => setShowAddPenaltyTemplate(true)}
                                    className="px-4 py-2 bg-black text-white rounded-xl text-[10px] font-black uppercase hover:bg-gray-900 transition-all flex items-center gap-2 shadow-lg cursor-pointer"
                                >
                                    <Plus className="w-4 h-4" /> Nova Penalidade Padrão
                                </button>
                            </div>

                            {modalities.length === 0 && (
                                <div className="text-center py-12 text-gray-400 text-xs font-bold uppercase italic">
                                    Nenhuma modalidade cadastrada. Crie modalidades nas configurações primeiro.
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {modalities.map(mod => {
                                    const modPenalties = penaltyTemplates.filter(p => p.modality === mod);
                                    return (
                                        <div key={mod} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                                            <div className="bg-gray-900 p-4 border-b-2 border-orange-500 flex items-center justify-between">
                                                <h3 className="text-sm font-black text-white uppercase tracking-tight flex items-center gap-2">
                                                    <ShieldCheck className="w-4 h-4 text-orange-400" /> {mod}
                                                </h3>
                                                <span className="text-[10px] font-bold text-orange-300 bg-orange-500/20 px-2 py-0.5 rounded-full border border-orange-500/30">
                                                    {modPenalties.length} modelo{modPenalties.length !== 1 ? 's' : ''}
                                                </span>
                                            </div>
                                            <div className="p-4 flex-1 space-y-3">
                                                {modPenalties.map(p => (
                                                    <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 group hover:border-red-100 hover:bg-red-50/30 transition-all">
                                                        <div className="flex-1 min-w-0 pr-2">
                                                            <div className="text-xs font-black text-k9-black uppercase">{p.label}</div>
                                                            <div className="text-[10px] font-bold text-red-500 font-mono mt-0.5">{p.value} pts</div>
                                                            {p.description && (
                                                                <div className="text-[9px] text-gray-400 italic mt-1 leading-snug">{p.description}</div>
                                                            )}
                                                        </div>
                                                        <button
                                                            onClick={() => handleDeletePenaltyTemplate(p.id)}
                                                            className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-100 rounded transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                                                            title="Excluir modelo"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                                {modPenalties.length === 0 && (
                                                    <div className="py-8 text-center text-gray-300 text-[10px] font-bold uppercase italic">
                                                        Nenhum modelo configurado
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-3 border-t border-gray-100">
                                                <button
                                                    onClick={() => { setPenaltyForm({ label: '', value: '', modality: mod, description: '' }); setShowAddPenaltyTemplate(true); }}
                                                    className="w-full py-2 text-[10px] font-black uppercase text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg border-2 border-dashed border-gray-200 hover:border-orange-300 transition-all cursor-pointer flex items-center justify-center gap-2"
                                                >
                                                    <Plus className="w-3.5 h-3.5" /> Adicionar modelo
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <Modal
                                isOpen={showAddPenaltyTemplate}
                                onClose={() => { setShowAddPenaltyTemplate(false); setPenaltyForm({ label: '', value: '', modality: '', description: '' }); }}
                                title="Nova Penalidade Padrão"
                            >
                                <div className="space-y-4 p-2">
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Título da Penalidade</label>
                                        <input
                                            value={penaltyForm.label}
                                            onChange={e => setPenaltyForm({ ...penaltyForm, label: e.target.value })}
                                            placeholder="Ex: Conduta Antidesportiva"
                                            className="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg focus:outline-none focus:border-orange-400 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Valor (pontos a subtrair)</label>
                                        <input
                                            type="number"
                                            value={penaltyForm.value}
                                            onChange={e => setPenaltyForm({ ...penaltyForm, value: e.target.value })}
                                            placeholder="Ex: 10"
                                            className="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg focus:outline-none focus:border-orange-400 text-red-600 font-bold text-sm"
                                        />
                                        <p className="text-[9px] text-gray-400 mt-1">O valor será automaticamente convertido em negativo.</p>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Modalidade Aplicável</label>
                                        <select
                                            value={penaltyForm.modality}
                                            onChange={e => setPenaltyForm({ ...penaltyForm, modality: e.target.value })}
                                            className="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg focus:outline-none focus:border-orange-400 text-sm"
                                        >
                                            <option value="">Selecione uma modalidade</option>
                                            {modalities.map(m => (
                                                <option key={m} value={m}>{m}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Descrição <span className="text-gray-300 normal-case">(opcional)</span></label>
                                        <textarea
                                            value={penaltyForm.description}
                                            onChange={e => setPenaltyForm({ ...penaltyForm, description: e.target.value })}
                                            placeholder="Ex: Aplicada quando o competidor agride verbalmente um juiz"
                                            rows={3}
                                            className="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg focus:outline-none focus:border-orange-400 text-sm resize-none"
                                        />
                                    </div>
                                    <div className="flex gap-4 pt-4">
                                        <button onClick={() => { setShowAddPenaltyTemplate(false); setPenaltyForm({ label: '', value: '', modality: '', description: '' }); }} className="flex-1 py-3 bg-gray-100 text-gray-600 font-black uppercase text-[10px] rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-200 transition-all">Cancelar</button>
                                        <button onClick={handleAddPenaltyTemplate} className="flex-1 py-3 bg-black text-white font-black uppercase text-[10px] rounded-lg shadow-lg hover:bg-gray-900 transition-all cursor-pointer">Criar Modelo</button>
                                    </div>
                                </div>
                            </Modal>
                        </div>
                    )}

                    {activeTab === 'rankings' && (
                        <div className="space-y-12">

                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                                {/* Filtro por modalidade */}
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => setRankingsModalityFilter('')}
                                        className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wide rounded-lg border-2 transition-all cursor-pointer ${rankingsModalityFilter === ''
                                            ? 'bg-orange-400 text-white border-orange-400'
                                            : 'bg-white text-gray-500 border-gray-200 hover:border-orange-300 hover:text-orange-600'
                                            }`}
                                    >
                                        Todas
                                    </button>
                                    {([...new Set(tests.map(t => t.modality).filter(Boolean))] as string[]).map(mod => (
                                        <button
                                            key={mod}
                                            onClick={() => setRankingsModalityFilter(mod)}
                                            className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wide rounded-lg border-2 transition-all cursor-pointer ${rankingsModalityFilter === mod
                                                ? 'bg-orange-400 text-white border-orange-400'
                                                : 'bg-white text-gray-500 border-gray-200 hover:border-orange-300 hover:text-orange-600'
                                                }`}
                                        >
                                            {mod} <span className="opacity-60">({tests.filter(t => t.modality === mod).length})</span>
                                        </button>
                                    ))}
                                </div>

                                {/* Global Freeze Toggle */}
                                <button
                                    onClick={handleToggleAllFreeze}
                                    disabled={processingAction === 'freezing-all'}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 font-black uppercase text-[10px] tracking-widest transition-all shadow-sm ${room?.allFrozen
                                        ? 'bg-red-500 text-white border-red-600 hover:bg-red-600'
                                        : 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100'
                                        }`}
                                >
                                    {room?.allFrozen ? (
                                        <><EyeOff className="w-4 h-4" /> Visualização Global Paralisada</>
                                    ) : (
                                        <><Eye className="w-4 h-4" /> Visualização Global Ativa</>
                                    )}
                                </button>
                            </div>

                            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mb-6 -mt-2">
                                <div className="relative flex-1 sm:max-w-[250px]">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Pesquisar..."
                                        value={rankingsSearch}
                                        onChange={e => setRankingsSearch(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400"
                                    />
                                </div>
                                <div className="flex items-center gap-3">
                                    <select
                                        value={rankingsSortBy}
                                        onChange={(e) => setRankingsSortBy(e.target.value as any)}
                                        className="bg-white border-2 border-gray-200 text-xs font-black uppercase tracking-wider rounded-lg px-4 py-2 focus:outline-none focus:border-orange-400 transition-all shadow-sm"
                                    >
                                        <option value="score">Ordenar por Nota</option>
                                        <option value="alphabetical">Ordem Alfabética</option>
                                        <option value="number">Ordem de Sorteio (Nº)</option>
                                    </select>
                                    <button
                                        onClick={() => setRankingsSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                                        className="bg-white border-2 border-gray-200 text-gray-600 px-4 py-2 rounded-xl font-black text-sm uppercase tracking-wider hover:bg-gray-50 flex items-center justify-center gap-2 transition-colors shrink-0 shadow-sm"
                                        title="Alternar ordem"
                                    >
                                        {rankingsSortOrder === 'asc' ? '↑' : '↓'}
                                    </button>
                                </div>
                            </div>

                            {/* Master Controls Section */}
                            <div className="bg-gray-900 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 border border-gray-800 shadow-xl mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-lg">
                                        <ShieldCheck className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-white uppercase tracking-tight">Controles Master</h3>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase">Ações em massa para todos os competidores</p>
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                    <button
                                        onClick={handleNumberAll}
                                        disabled={processingAction === 'numbering-all'}
                                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-blue-700 transition-all shadow-md active:scale-95 disabled:opacity-50"
                                    >
                                        <Zap className="w-4 h-4" /> Numerar Todos (Geral)
                                    </button>
                                    <button
                                        onClick={handleClearAllNumbers}
                                        disabled={processingAction === 'clearing-all'}
                                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-red-700 transition-all shadow-md active:scale-95 disabled:opacity-50"
                                    >
                                        <RotateCcw className="w-4 h-4" /> Remover Todas as Numerações
                                    </button>
                                </div>
                            </div>

                            {tests
                                .filter(test => !rankingsModalityFilter || test.modality === rankingsModalityFilter)
                                .sort((a, b) => (a.testNumber || 0) - (b.testNumber || 0)).map(test => {
                                    const testCompetitors = competitors.filter(c => c.modality === test.modality);
                                    const judgeReserves = room?.judgeReserves || [];
                                    const reserveActivations = room?.reserveActivations || [];

                                    return (
                                        <div key={test.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                                            <div className="bg-gray-900 p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-orange-400 flex items-center justify-center text-white font-black text-xs">
                                                        {test.testNumber?.toString().padStart(2, '0')}
                                                    </div>
                                                    <div>
                                                        <h3 className="text-sm font-black text-white uppercase tracking-tight">{test.title}</h3>
                                                        <div className="text-[10px] text-orange-400 font-bold uppercase">{test.modality}</div>
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-3">
                                                    {/* Auto Numbering Button */}
                                                    <button
                                                        onClick={() => test.modality && handleAutoNumberModality(test.modality)}
                                                        disabled={processingAction === `numbering-${test.modality}`}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg text-[9px] font-black uppercase hover:bg-blue-600/30 transition-all shadow-sm"
                                                    >
                                                        <Zap className="w-3 h-3" /> Numerar 1, 2, 3...
                                                    </button>

                                                    <button
                                                        onClick={() => test.modality && handleClearModalityNumbers(test.modality)}
                                                        disabled={processingAction === `clearing-${test.modality}`}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 text-red-400 border border-red-500/30 rounded-lg text-[9px] font-black uppercase hover:bg-red-600/30 transition-all shadow-sm"
                                                    >
                                                        <RotateCcw className="w-3 h-3" /> Remover Números
                                                    </button>

                                                    {/* Modality Freeze Toggle */}
                                                    <button
                                                        onClick={() => test.modality && handleToggleModalityFreeze(test.modality, room?.frozenModalities?.includes(test.modality) || false)}
                                                        disabled={processingAction === `freezing-${test.modality}`}
                                                        className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-[9px] font-black uppercase transition-all shadow-sm ${room?.frozenModalities?.includes(test.modality || '')
                                                            ? 'bg-red-600/20 text-red-400 border-red-500/30 hover:bg-red-600/30'
                                                            : 'bg-green-600/20 text-green-400 border-green-500/30 hover:bg-green-600/30'
                                                            }`}
                                                    >
                                                        {room?.frozenModalities?.includes(test.modality || '') ? (
                                                            <><EyeOff className="w-3 h-3" /> Paralisado</>
                                                        ) : (
                                                            <><Eye className="w-3 h-3" /> Ativo</>
                                                        )}
                                                    </button>

                                                    <div className="text-[10px] text-gray-400 font-bold uppercase ml-2">
                                                        {t('admin.rankings.total')}: {testCompetitors.length}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="divide-y divide-gray-50">
                                                {testCompetitors
                                                    .filter(c => c.handlerName.toLowerCase().includes(rankingsSearch.toLowerCase()) || c.dogName.toLowerCase().includes(rankingsSearch.toLowerCase()))
                                                    .map(c => {
                                                        const isRes = (judgeId: string) => {
                                                            const compReserves = room?.judgeCompetitorReserves?.[c.id] || [];
                                                            if (compReserves.includes(judgeId)) return true;
                                                            const mods = room?.judgeReserveModalities?.[judgeId] || [];
                                                            if (mods.length > 0) return mods.includes(test.modality || '');
                                                            return (room?.judgeReserves || []).includes(judgeId);
                                                        };
                                                        const allCompEvals = evaluations.filter(e => e.testId === test.id && e.competitorId === c.id);
                                                        const validEvals = allCompEvals.filter(e => e.status !== 'did_not_participate');
                                                        const titularsForAvg = validEvals.filter(e => !isRes(e.judgeId)).slice(0, 3);
                                                        const reservesForAvg = validEvals.filter(e => isRes(e.judgeId)).slice(0, Math.max(0, 3 - titularsForAvg.length));
                                                        const evalsToAvg = titularsForAvg.length > 0 ? [...titularsForAvg, ...reservesForAvg] : reservesForAvg.slice(0, 3);
                                                        const calculatedAvg = evalsToAvg.length > 0
                                                            ? evalsToAvg.reduce((s, e) => s + e.finalScore, 0) / evalsToAvg.length
                                                            : 0;
                                                        const totalPoints = test.drugPointsAmount || 0;
                                                        const foundPoints = c.drugPointsFound?.[test.id] || 0;
                                                        const missedPoints = Math.max(0, totalPoints - foundPoints);
                                                        const drugBonus = (test.modality?.toLowerCase().includes('faro'))
                                                            ? (foundPoints * 50) - (missedPoints * 50)
                                                            : 0;
                                                        const adminPenaltyTotal = (c.adminPenalties || []).reduce((sum, p) => sum + p.value, 0);
                                                        return { ...c, totalScore: calculatedAvg + drugBonus + adminPenaltyTotal };
                                                    })
                                                    .sort((a, b) => {
                                                        let comparison = 0;
                                                        if (rankingsSortBy === 'score') {
                                                            comparison = b.totalScore - a.totalScore;
                                                            if (comparison === 0) comparison = a.handlerName.localeCompare(b.handlerName);
                                                        } else if (rankingsSortBy === 'number') {
                                                            comparison = (a.competitorNumber || 0) - (b.competitorNumber || 0);
                                                        } else {
                                                            comparison = a.handlerName.localeCompare(b.handlerName);
                                                        }
                                                        return rankingsSortOrder === 'asc' ? comparison : -comparison;
                                                    })
                                                    .map(comp => {
                                                        const titularEvals = evaluations.filter(e => {
                                                            if (e.testId !== test.id || e.competitorId !== comp.id) return false;
                                                            // Reserva específica para este competidor
                                                            const compReserves = room?.judgeCompetitorReserves?.[comp.id] || [];
                                                            if (compReserves.includes(e.judgeId)) return false;
                                                            // Reserva por modalidade
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

                                                        const allCompEvals = evaluations.filter(e => e.testId === test.id && e.competitorId === comp.id);
                                                        const evaluation = allCompEvals[0];
                                                        const isDNS = allCompEvals.some(e => e.status === 'did_not_participate');

                                                        const isRes = (judgeId: string) => {
                                                            const compReserves = room?.judgeCompetitorReserves?.[comp.id] || [];
                                                            if (compReserves.includes(judgeId)) return true;
                                                            const mods = room?.judgeReserveModalities?.[judgeId] || [];
                                                            if (mods.length > 0) return mods.includes(test.modality || '');
                                                            return (room?.judgeReserves || []).includes(judgeId);
                                                        };
                                                        const validEvals = allCompEvals.filter(e => e.status !== 'did_not_participate');
                                                        const titularsForAvg = validEvals.filter(e => !isRes(e.judgeId)).slice(0, 3);
                                                        const reservesForAvg = validEvals.filter(e => isRes(e.judgeId)).slice(0, Math.max(0, 3 - titularsForAvg.length));
                                                        const evalsToAvg = titularsForAvg.length > 0 ? [...titularsForAvg, ...reservesForAvg] : reservesForAvg.slice(0, 3);
                                                        const calculatedAvg = evalsToAvg.length > 0
                                                            ? evalsToAvg.reduce((s, e) => s + e.finalScore, 0) / evalsToAvg.length
                                                            : null;
                                                        const totalPoints = test.drugPointsAmount || 0;
                                                        const foundPoints = comp.drugPointsFound?.[test.id] || 0;
                                                        const missedPoints = Math.max(0, totalPoints - foundPoints);
                                                        const drugBonus = (test.modality?.toLowerCase().includes('faro'))
                                                            ? (foundPoints * 50) - (missedPoints * 50)
                                                            : 0;
                                                        const adminPenaltyTotal = (comp.adminPenalties || []).reduce((sum, p) => sum + p.value, 0);
                                                        const finalWithPenalties = (calculatedAvg !== null) ? (calculatedAvg + drugBonus + adminPenaltyTotal) : null;

                                                        return (
                                                            <div key={comp.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors">
                                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-black text-gray-400 text-xs overflow-hidden border border-gray-100 shadow-inner shrink-0">
                                                                        {comp.photoUrl ? <img src={comp.photoUrl} className="w-full h-full object-cover" /> : comp.handlerName.substring(0, 2).toUpperCase()}
                                                                    </div>
                                                                    <div className="min-w-0 flex-1">
                                                                        <div className="text-sm font-black text-k9-black uppercase truncate flex items-center gap-2">
                                                                            {comp.competitorNumber && <span className="bg-gray-900 text-white text-[10px] px-1.5 py-0.5 rounded shadow-sm">#{comp.competitorNumber}</span>}
                                                                            {comp.handlerName}
                                                                        </div>
                                                                        <div className="text-[10px] text-gray-400 font-bold uppercase">{t('admin.rankings.dog')}: {comp.dogName}</div>

                                                                        {/* Indicador de juízes titulares */}
                                                                        <div className="flex items-center gap-2 mt-1.5 overflow-x-auto no-scrollbar">
                                                                            <div className="flex gap-1 shrink-0">
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
                                                                            <span className={`text-[9px] font-black uppercase whitespace-nowrap ${titularCount >= 3 ? 'text-green-600' : 'text-gray-400'
                                                                                }`}>
                                                                                {titularCount}/3 {t('admin.rankings.titulars')}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="flex items-center justify-between sm:justify-end gap-3 pt-3 sm:pt-0 border-t border-gray-50 sm:border-0 w-full sm:w-auto shrink-0">
                                                                    {/* Botão Penalizar Admin */}
                                                                    <button
                                                                        onClick={() => setCompForPenalty(comp)}
                                                                        className="flex items-center gap-1.5 px-3 py-2 sm:py-1.5 text-[9px] font-black uppercase rounded-lg border transition-all bg-red-50 text-red-700 border-red-200 hover:bg-red-100 cursor-pointer"
                                                                        title="Aplicar penalidade administrativa"
                                                                    >
                                                                        <AlertCircle className="w-3 h-3" />
                                                                        Penalizar
                                                                    </button>

                                                                    {/* Botão Configurar Reserva por Competidor */}
                                                                    {(room?.judges && room.judges.length > 0) && (
                                                                        <button
                                                                            onClick={() => setCompetitorReserveConfig(comp)}
                                                                            className="flex items-center gap-1.5 px-3 py-2 sm:py-1.5 text-[9px] font-black uppercase rounded-lg border transition-all bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 cursor-pointer"
                                                                            title="Configurar Juiz Reserva para este competidor"
                                                                        >
                                                                            <Gavel className="w-3 h-3" />
                                                                            Reserva
                                                                        </button>
                                                                    )}

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
                                                                            className={`flex items-center gap-1.5 px-3 py-2 sm:py-1.5 text-[9px] font-black uppercase rounded-lg border transition-all ${isActivated
                                                                                ? 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200 shadow-sm'
                                                                                : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200'
                                                                                }`}
                                                                            title={isActivated ? 'Clique para desacionar o reserva' : 'Acionar Juiz Reserva'}
                                                                        >
                                                                            {isActivated ? (
                                                                                <>
                                                                                    <BellOff className="w-3 h-3" />
                                                                                    {t('admin.rankings.activated') || 'Acionado'}
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    <Bell className="w-3 h-3" />
                                                                                    {t('admin.rankings.activateReserve') || 'Acionar Reserva'}
                                                                                </>
                                                                            )}
                                                                        </button>
                                                                    )}

                                                                    {test.modality?.toLowerCase().includes('faro') && (
                                                                        <div className="flex flex-col items-center gap-1 bg-orange-50 p-2 rounded-lg border border-orange-200">
                                                                            <label className="text-[8px] font-black uppercase text-orange-600">{t('admin.rankings.drugPointsFound')}</label>
                                                                            <div className="flex items-center gap-2">
                                                                                <input
                                                                                    type="number"
                                                                                    min="0"
                                                                                    max={test.drugPointsAmount || 10}
                                                                                    defaultValue={comp.drugPointsFound?.[test.id] || 0}
                                                                                    onBlur={(e) => handleUpdateDrugPoints(comp.id, test.id, parseInt(e.target.value) || 0)}
                                                                                    className="w-12 text-center bg-white border border-orange-300 rounded text-xs font-bold focus:outline-none focus:ring-1 focus:ring-orange-500"
                                                                                />
                                                                                <span className="text-[10px] font-bold text-gray-400">/ {test.drugPointsAmount || 0}</span>
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {(allCompEvals.length > 0) ? (
                                                                        <div className="flex items-center gap-2">
                                                                            <div className={`text-right mr-2 ${isDNS ? 'text-red-500' : 'text-green-600'}`}>
                                                                                <div className="text-sm font-black text-k9-black uppercase truncate flex items-center gap-2">
                                                                                    {comp.competitorNumber && <span className="bg-gray-900 text-white text-[9px] px-1.5 py-0.5 rounded shadow-sm shrink-0">#{comp.competitorNumber}</span>}
                                                                                    <span className="truncate">{comp.handlerName}</span>
                                                                                </div>
                                                                                <div className="text-xs font-black uppercase leading-none">
                                                                                    {isDNS ? 'NC' : (() => {
                                                                                        if (finalWithPenalties === null) return '--';
                                                                                        return finalWithPenalties.toFixed(1);
                                                                                    })()}
                                                                                </div>
                                                                                <div className="text-[8px] font-bold uppercase opacity-60">{t('admin.rankings.status')}</div>
                                                                            </div>

                                                                            <button
                                                                                onClick={async () => {
                                                                                    try {
                                                                                        const history = await getEvaluationHistory(roomId, comp.id, test.id);
                                                                                        const allNotes = [...allCompEvals, ...history].sort((a, b) => (b.archivedAt || b.createdAt) - (a.archivedAt || a.createdAt));
                                                                                        setViewingHistoryFor({ comp, test, evals: allNotes });
                                                                                    } catch (err) {
                                                                                        console.error('Error fetching history:', err);
                                                                                        setViewingHistoryFor({ comp, test, evals: allCompEvals });
                                                                                    }
                                                                                }}
                                                                                className="p-1.5 sm:p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-colors border border-blue-100"
                                                                                title="Ver Histórico de Notas"
                                                                            >
                                                                                <History className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                                            </button>

                                                                            <button
                                                                                onClick={() => setEvalToDelete({
                                                                                    id: allCompEvals[0]?.id || '', // Se for para remover 1; mas se for resetar todas, usaremos o modal "Tem certeza que deseja apagar TODAS as notas?"
                                                                                    name: comp.handlerName,
                                                                                    testTitle: test.title,
                                                                                    isNC: isDNS,
                                                                                    photoUrl: comp.photoUrl,
                                                                                    deleteAll: true,
                                                                                    evalIds: allCompEvals.map(e => e.id)
                                                                                })}
                                                                                className="p-1.5 sm:p-2 bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 rounded-lg transition-colors border border-red-100"
                                                                                title="Resetar Todas as Notas"
                                                                            >
                                                                                <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                                            </button>

                                                                            <button
                                                                                onClick={() => setCompForPenalty(comp)}
                                                                                className="p-1.5 sm:p-2 bg-amber-50 text-amber-600 hover:bg-amber-100 hover:text-amber-700 rounded-lg transition-colors border border-amber-100"
                                                                                title="Aplicar Penalidade Admin"
                                                                            >
                                                                                <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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



                    {/* MODAL: Configurar reserva específica por competidor */}
                    {competitorReserveConfig && (() => {
                        const comp = competitorReserveConfig;
                        // Todos os juízes da sala (qualquer um pode ser reserva de um competidor específico)
                        const judgesAvailable = allJudges.filter(j => room?.judges?.includes(j.uid) ?? false);
                        const currentReserves = room?.judgeCompetitorReserves?.[comp.id] || [];

                        return (
                            <div
                                className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[100] backdrop-blur-md"
                                onClick={(e) => { if (e.target === e.currentTarget) setCompetitorReserveConfig(null); }}
                            >
                                <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border-b-4 border-orange-500 transform transition-all">
                                    {/* Header */}
                                    <div className="bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 p-6 flex items-center justify-between border-b border-white/10 shadow-lg">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center font-black text-white text-base border border-white/30 overflow-hidden shadow-inner backdrop-blur-sm">
                                                {comp.photoUrl ? <img src={comp.photoUrl} className="w-full h-full object-cover" /> : comp.handlerName.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="text-[10px] text-orange-100 font-black uppercase tracking-[0.2em] mb-0.5">Juiz Reserva Específico</div>
                                                <div className="text-white font-black text-lg uppercase tracking-tight leading-tight drop-shadow-sm">{comp.handlerName}</div>
                                                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-black/10 text-orange-50 text-[9px] font-black uppercase rounded-lg border border-white/10 mt-1">
                                                    <div className="w-1.5 h-1.5 bg-orange-300 rounded-full animate-pulse" /> {comp.modality}
                                                </div>
                                            </div>
                                        </div>
                                        <button onClick={() => setCompetitorReserveConfig(null)} className="text-white/70 hover:text-white p-2 rounded-xl bg-white/10 hover:bg-white/20 cursor-pointer transition-all">
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>

                                    {/* Body */}
                                    <div className="p-6">
                                        <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-100 mb-6">
                                            <p className="text-[11px] text-orange-700 font-bold uppercase tracking-wide leading-relaxed">
                                                Selecione os juízes que <span className="text-orange-900 underline underline-offset-2 decoration-orange-300">não poderão avaliar</span> este competidor. O sistema irá ignorar as notas desses juízes para este condutor.
                                            </p>
                                        </div>

                                        <div className="max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar space-y-2 mb-6">
                                            {judgesAvailable.map(judge => {
                                                const isSelected = currentReserves.includes(judge.uid);
                                                return (
                                                    <label key={judge.uid} className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all border-2 ${isSelected ? 'bg-orange-50 border-orange-500 shadow-md transform translate-x-1' : 'bg-gray-50 border-transparent hover:border-orange-200'}`}>
                                                        <div className="relative">
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={async (e) => {
                                                                    const newReserves = e.target.checked
                                                                        ? [...currentReserves, judge.uid]
                                                                        : currentReserves.filter(id => id !== judge.uid);
                                                                    try {
                                                                        await setJudgeCompetitorReserves(roomId, comp.id, newReserves);
                                                                        loadRoomData();
                                                                    } catch (err) {
                                                                        console.error(err);
                                                                        alert('Erro ao salvar configuração de reserva.');
                                                                    }
                                                                }}
                                                                className="w-5 h-5 text-orange-500 border-gray-300 rounded-lg focus:ring-orange-500 focus:ring-offset-0 cursor-pointer accent-orange-500"
                                                            />
                                                        </div>
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black border-2 shrink-0 transition-all ${isSelected ? 'bg-orange-500 text-white border-orange-400 shadow-lg' : 'bg-white text-gray-400 border-gray-100'}`}>
                                                            {judge.name.substring(0, 2).toUpperCase()}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className={`text-xs font-black uppercase truncate transition-colors ${isSelected ? 'text-orange-900' : 'text-gray-700'}`}>{judge.name}</div>
                                                            <div className="text-[10px] text-gray-400 font-mono truncate">{judge.email}</div>
                                                        </div>
                                                        {isSelected && (
                                                            <div className="px-3 py-1 bg-orange-500 text-white text-[9px] font-black uppercase rounded-lg shadow-sm border border-orange-400 shrink-0">
                                                                Reserva
                                                            </div>
                                                        )}
                                                    </label>
                                                );
                                            })}
                                            {judgesAvailable.length === 0 && (
                                                <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
                                                    <p className="text-gray-400 text-[11px] font-black uppercase italic tracking-widest">Nenhum juiz disponível</p>
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            onClick={() => setCompetitorReserveConfig(null)}
                                            className="w-full py-4 bg-gray-900 hover:bg-black text-white font-black uppercase text-[11px] rounded-2xl tracking-[0.2em] cursor-pointer shadow-xl transition-all active:scale-95"
                                        >
                                            Confirmar e Fechar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* MODAL: Histórico de Notas */}
                    {viewingHistoryFor && (
                        <div
                            className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[100] backdrop-blur-md"
                            onClick={(e) => { if (e.target === e.currentTarget) setViewingHistoryFor(null); }}
                        >
                            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden border-2 border-blue-200">
                                <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-5 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white border border-white/20">
                                            <History className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="text-[10px] text-blue-200 font-black uppercase tracking-widest">{t('admin.rankings.history', 'Histórico de Notas')}</div>
                                            <div className="text-white font-black text-base uppercase tracking-tight leading-tight">{viewingHistoryFor.comp.handlerName}</div>
                                            <div className="text-blue-200 text-[10px] font-bold uppercase">{viewingHistoryFor.test.title}</div>
                                        </div>
                                    </div>
                                    <button onClick={() => setViewingHistoryFor(null)} className="text-white/60 hover:text-white p-1 rounded cursor-pointer">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="p-6 max-h-[60vh] overflow-y-auto">
                                    {viewingHistoryFor.evals.length === 0 ? (
                                        <div className="text-center py-8 text-gray-400 font-bold uppercase italic text-sm">
                                            Nenhuma avaliação encontrada.
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {viewingHistoryFor.evals.map((ev, index) => {
                                                const judge = allJudges.find(j => j.uid === ev.judgeId);
                                                const judgeName = judge ? judge.name : 'Desconhecido';

                                                const isReserve = (() => {
                                                    const currentReserves = room?.judgeCompetitorReserves?.[viewingHistoryFor.comp.id] || [];
                                                    if (currentReserves.includes(ev.judgeId)) return true;
                                                    const mods = room?.judgeReserveModalities?.[ev.judgeId] || [];
                                                    if (mods.length > 0) return mods.includes(viewingHistoryFor.test.modality || '');
                                                    return (room?.judgeReserves || []).includes(ev.judgeId);
                                                })();

                                                return (
                                                    <div key={ev.id} className={`border rounded-xl p-4 flex flex-col sm:flex-row shadow-sm justify-between gap-4 ${ev.archivedAt ? 'bg-orange-50/50 border-orange-200 opacity-80' : 'bg-gray-50/50 border-gray-200'}`}>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                                <h4 className="font-black text-sm uppercase text-k9-black truncate">{judgeName}</h4>
                                                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${isReserve ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                                                                    {isReserve ? 'Reserva' : 'Titular'}
                                                                </span>
                                                                {ev.status === 'did_not_participate' && (
                                                                    <span className="text-[9px] font-bold px-2 py-0.5 rounded uppercase bg-red-100 text-red-700 ml-auto sm:ml-0">
                                                                        Ausente (NC)
                                                                    </span>
                                                                )}
                                                                {ev.archivedAt && (
                                                                    <span className="text-[9px] font-bold px-2 py-0.5 rounded uppercase bg-gray-200 text-gray-600 sm:ml-auto shrink-0" title={`Substituída/Apagada em: ${new Date(ev.archivedAt).toLocaleString('pt-BR')}`}>
                                                                        (Deletada/Editada)
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {!ev.status || ev.status !== 'did_not_participate' ? (
                                                                <>
                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 mt-2 bg-white p-3 rounded-lg border border-gray-100">
                                                                        {(() => {
                                                                            const validItems = viewingHistoryFor.test.groups.flatMap(g => g.items).filter(item => ev.scores?.[item.id] !== undefined);
                                                                            const mid = Math.ceil(validItems.length / 2);
                                                                            const leftItems = validItems.slice(0, mid);
                                                                            const rightItems = validItems.slice(mid);

                                                                            const renderItem = (item: any) => (
                                                                                <div key={item.id} className="text-xs flex justify-between">
                                                                                    <span className="text-gray-500 truncate mr-2" title={item.label}>{item.label}:</span>
                                                                                    <span className="font-bold text-gray-800">{ev.scores?.[item.id]}</span>
                                                                                </div>
                                                                            );

                                                                            return (
                                                                                <>
                                                                                    <div className="space-y-2">
                                                                                        {leftItems.map(renderItem)}
                                                                                    </div>
                                                                                    {rightItems.length > 0 && (
                                                                                        <div className="space-y-2">
                                                                                            {rightItems.map(renderItem)}
                                                                                        </div>
                                                                                    )}
                                                                                </>
                                                                            );
                                                                        })()}
                                                                    </div>
                                                                    {(ev.penaltiesApplied && ev.penaltiesApplied.length > 0) && (
                                                                        <div className="mt-2 text-[10px] text-red-600 bg-red-50 p-2 rounded-lg border border-red-100 overflow-x-auto">
                                                                            <strong className="uppercase block mb-1">Penalidades:</strong>
                                                                            {ev.penaltiesApplied.map((p, i) => (
                                                                                <div key={i}>- {p.description || p.penaltyId} ({p.value})</div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </>
                                                            ) : (
                                                                <p className="text-xs text-gray-400 italic mt-2">Competidor não se apresentou.</p>
                                                            )}
                                                            <div className="text-[10px] text-gray-400 mt-3 font-mono">
                                                                Enviado em: {new Date(ev.createdAt).toLocaleString('pt-BR')}
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-row sm:flex-col justify-end items-end gap-3 sm:border-l sm:border-gray-200 sm:pl-4">
                                                            <div className="text-right">
                                                                <div className="text-xs font-bold uppercase text-gray-400 mb-1">Nota Final</div>
                                                                <div className={`text-xl sm:text-2xl font-black leading-none ${ev.status === 'did_not_participate' ? 'text-red-500' : 'text-blue-600'}`}>
                                                                    {ev.status === 'did_not_participate' ? '0.0' : ev.finalScore.toFixed(1)}
                                                                </div>
                                                            </div>
                                                            {!ev.archivedAt && (
                                                                <button
                                                                    onClick={() => {
                                                                        setViewingHistoryFor(null);
                                                                        setEvalToDelete({
                                                                            id: ev.id,
                                                                            name: viewingHistoryFor.comp.handlerName,
                                                                            testTitle: viewingHistoryFor.test.title,
                                                                            isNC: ev.status === 'did_not_participate',
                                                                            photoUrl: viewingHistoryFor.comp.photoUrl,
                                                                            judgeName: judgeName
                                                                        });
                                                                    }}
                                                                    className="px-3 py-1.5 flex items-center justify-center gap-1.5 text-[10px] font-black uppercase text-red-500 bg-red-50 hover:bg-red-100 hover:text-red-600 rounded-lg transition-colors border border-red-100 shrink-0"
                                                                    title="Apagar esta avaliação"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" /> Excluir
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                                    <button
                                        onClick={() => setViewingHistoryFor(null)}
                                        className="px-5 py-2.5 bg-white border-2 border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-800 rounded-xl font-black uppercase text-xs tracking-wider transition-colors shadow-sm"
                                    >
                                        {t('admin.rankings.close', 'Fechar')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* MODAL: Aplicar Penalidade Admin */}
                    {compForPenalty && (
                        <Modal
                            isOpen={!!compForPenalty}
                            onClose={() => { setCompForPenalty(null); setManualPenaltyForm({ label: '', value: '', description: '', templateId: '' }); }}
                            title={`Penalizar Competidor: ${compForPenalty.handlerName}`}
                            maxWidth="max-w-lg"
                        >
                            <div className="space-y-6 p-2">
                                <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white rounded-lg border border-orange-200 flex items-center justify-center font-black text-orange-600 overflow-hidden shrink-0 shadow-sm">
                                        {compForPenalty.photoUrl ? <img src={compForPenalty.photoUrl} className="w-full h-full object-cover" /> : compForPenalty.handlerName.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="text-sm font-black text-k9-black uppercase leading-tight">{compForPenalty.handlerName}</div>
                                        <div className="text-[10px] text-orange-600 font-bold uppercase">{compForPenalty.modality}</div>
                                    </div>
                                </div>

                                {/* List existing penalties */}
                                {compForPenalty.adminPenalties && compForPenalty.adminPenalties.length > 0 && (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Penalidades Aplicadas</label>
                                        <div className="space-y-2">
                                            {compForPenalty.adminPenalties.map((p, i) => (
                                                <div key={i} className="flex items-center justify-between p-3 bg-red-50 border border-red-100 rounded-xl">
                                                    <div>
                                                        <div className="text-xs font-black text-red-900 uppercase">{p.label}</div>
                                                        <div className="text-[10px] font-bold text-red-600 font-mono">{p.value} pts</div>
                                                        {p.description && <div className="text-[9px] text-red-400 mt-1 italic">{p.description}</div>}
                                                    </div>
                                                    <button
                                                        onClick={() => handleRemoveAdminPenalty(compForPenalty.id, p.createdAt)}
                                                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-100 rounded transition-all"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="border-t border-gray-100 pt-6 space-y-4">
                                    <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Nova Penalidade</label>

                                    {/* Selection Template */}
                                    <div>
                                        <label className="text-[9px] font-black text-gray-500 uppercase block mb-1">Usar Modelo Padrão</label>
                                        <select
                                            value={manualPenaltyForm.templateId}
                                            onChange={(e) => {
                                                const selected = penaltyTemplates.find(p => p.id === e.target.value);
                                                if (selected) {
                                                    setManualPenaltyForm({
                                                        ...manualPenaltyForm,
                                                        templateId: selected.id,
                                                        label: selected.label,
                                                        value: Math.abs(selected.value).toString()
                                                    });
                                                } else {
                                                    setManualPenaltyForm({ ...manualPenaltyForm, templateId: '', label: '', value: '' });
                                                }
                                            }}
                                            className="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg focus:outline-none focus:border-red-400 text-sm font-bold uppercase"
                                        >
                                            <option value="">-- Personalizada --</option>
                                            {penaltyTemplates.filter(p => p.modality === compForPenalty.modality).map(p => (
                                                <option key={p.id} value={p.id}>{p.label} ({-Math.abs(p.value)} pts)</option>
                                            ))}
                                        </select>
                                    </div>

                                    {!manualPenaltyForm.templateId && (
                                        <div>
                                            <label className="text-[9px] font-black text-gray-500 uppercase block mb-1">Título Manual</label>
                                            <input
                                                value={manualPenaltyForm.label}
                                                onChange={e => setManualPenaltyForm({ ...manualPenaltyForm, label: e.target.value })}
                                                placeholder="Ex: Conduta inadequada"
                                                className="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg focus:outline-none focus:border-red-400 text-sm"
                                            />
                                        </div>
                                    )}

                                    <div>
                                        <label className="text-[9px] font-black text-gray-500 uppercase block mb-1">Pontos (a subtrair)</label>
                                        <input
                                            type="number"
                                            value={manualPenaltyForm.value}
                                            onChange={e => setManualPenaltyForm({ ...manualPenaltyForm, value: e.target.value })}
                                            placeholder="Ex: 5.5"
                                            className="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg focus:outline-none focus:border-red-400 text-red-600 font-bold"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[9px] font-black text-gray-500 uppercase block mb-1">Observação / Justificativa (Opcional)</label>
                                        <textarea
                                            value={manualPenaltyForm.description}
                                            onChange={e => setManualPenaltyForm({ ...manualPenaltyForm, description: e.target.value })}
                                            placeholder="Descreve o motivo da penalidade..."
                                            className="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg focus:outline-none focus:border-red-400 text-sm min-h-[80px]"
                                        />
                                    </div>

                                    <div className="flex gap-4 pt-4">
                                        <button onClick={() => setCompForPenalty(null)} className="flex-1 py-3 bg-gray-100 text-gray-600 font-black uppercase text-[10px] rounded-lg border border-gray-200">Cancelar</button>
                                        <button onClick={handleApplyAdminPenalty} className="flex-1 py-3 bg-red-600 text-white font-black uppercase text-[10px] rounded-lg shadow-lg hover:bg-red-700 transition-all">Confirmar Penalidade</button>
                                    </div>
                                </div>
                            </div>
                        </Modal>
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

                    {/* MODAL DE REMOÇÃO DE AVALIAÇÃO/NC/RESET */}
                    <Modal
                        isOpen={!!evalToDelete}
                        onClose={() => setEvalToDelete(null)}
                        title={<div className="flex items-center gap-2 text-red-600 uppercase font-black"><Trash2 className="w-5 h-5" /> {evalToDelete?.deleteAll ? t('admin.rankings.resetEvaluations', 'Resetar Notas') : t('admin.deletion.title')}</div>}
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
                                {evalToDelete?.deleteAll ? 'Removendo TODAS as notas de' : (t('admin.evalDeletion.removing') + ' ' + (evalToDelete?.isNC ? t('admin.evalDeletion.removingAbsence') : t('admin.evalDeletion.removingScore')) + ' ' + t('admin.evalDeletion.of'))}
                            </p>
                            <h3 className="text-2xl font-black text-k9-black uppercase mb-1 tracking-tighter">{evalToDelete?.name}</h3>
                            <p className={`text-k9-orange text-xs font-bold uppercase ${evalToDelete?.judgeName && !evalToDelete.deleteAll ? 'mb-2' : 'mb-6'} bg-orange-50 px-3 py-1 rounded-full border border-orange-100`}>
                                {t('admin.evalDeletion.test')}: {evalToDelete?.testTitle}
                            </p>
                            {evalToDelete?.judgeName && !evalToDelete.deleteAll && (
                                <p className="text-blue-600 text-[10px] font-black uppercase mb-6 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                                    Juiz: {evalToDelete.judgeName}
                                </p>
                            )}
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-8 w-full">
                                <p className="text-[11px] text-gray-500 font-bold uppercase leading-relaxed text-center">
                                    {evalToDelete?.deleteAll ? `Esta ação apagará todas as ${evalToDelete.evalIds?.length} avaliações registradas. ` : ''}
                                    {t('admin.evalDeletion.warning')} {evalToDelete?.deleteAll ? 'estas avaliações' : (evalToDelete?.isNC ? t('admin.evalDeletion.absenceRecord') : t('admin.evalDeletion.evaluation'))} {t('admin.evalDeletion.warningEnd')}
                                </p>
                            </div>
                            <div className="flex gap-4 w-full">
                                <button onClick={() => setEvalToDelete(null)} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-k9-black font-bold uppercase text-xs rounded-xl tracking-wider cursor-pointer border-2 border-gray-200 transition-all">
                                    {t('admin.evalDeletion.cancel')}
                                </button>
                                <button
                                    onClick={async () => {
                                        if (evalToDelete) {
                                            if (evalToDelete.deleteAll && evalToDelete.evalIds) {
                                                // Exclui múltiplas avaliações em paralelo
                                                await Promise.all(evalToDelete.evalIds.map(id => deleteEvaluation(id)));
                                            } else {
                                                await deleteEvaluation(evalToDelete.id);
                                            }
                                            setEvalToDelete(null);
                                        }
                                    }}
                                    className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold uppercase text-xs rounded-xl tracking-wider cursor-pointer border-2 border-red-700 transition-all shadow-lg hover:shadow-red-500/20"
                                >
                                    {evalToDelete?.deleteAll ? 'Resetar Notas' : t('admin.evalDeletion.confirm')}
                                </button>
                            </div>
                        </div>
                    </Modal>
                </div>
            </div >
            <DateToast errors={dateErrors} onClose={(key) => setDateErrors(prev => ({ ...prev, [key]: '' }))} />
        </>
    );
}
