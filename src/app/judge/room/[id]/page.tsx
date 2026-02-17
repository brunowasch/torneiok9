'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
    getRoomById,
    getCompetitorsByRoom,
    getTestTemplates
} from '@/services/adminService';
import {
    saveEvaluation,
    getEvaluationsByRoom
} from '@/services/evaluationService';
import {
    Room,
    Competitor,
    TestTemplate,
    Evaluation
} from '@/types/schema';
import {
    ArrowLeft,
    Users,
    CheckCircle2,
    Check,
    AlertCircle,
    X,
    List,
    Trophy
} from 'lucide-react';

export default function JudgeRoomPage() {
    const params = useParams();
    const router = useRouter();
    const roomId = params.id as string;
    const [user, setUser] = useState<any>(null);

    // Data
    const [room, setRoom] = useState<Room | null>(null);
    const [competitors, setCompetitors] = useState<Competitor[]>([]);
    const [tests, setTests] = useState<TestTemplate[]>([]);
    const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
    const [loading, setLoading] = useState(true);

    // Evaluation State
    const [selectedCompetitor, setSelectedCompetitor] = useState<Competitor | null>(null);
    const [activeTest, setActiveTest] = useState<TestTemplate | null>(null);
    const [scores, setScores] = useState<Record<string, number>>({});
    const [notes, setNotes] = useState('');
    const [penalties, setPenalties] = useState<{ penaltyId: string; value: number; description: string }[]>([]);
    const [submitting, setSubmitting] = useState(false);
    
    // Add Penalty State
    const [showPenaltyAdd, setShowPenaltyAdd] = useState(false);
    const [tempPenalty, setTempPenalty] = useState<{ id: string; label: string; value: number } | null>(null);
    const [tempPenaltyDescription, setTempPenaltyDescription] = useState('');
    const [isCustomPenalty, setIsCustomPenalty] = useState(false);
    const [customValue, setCustomValue] = useState('-1.0');

    // Test Selection Modal State
    const [showTestModal, setShowTestModal] = useState(false);
    const [modalCompetitor, setModalCompetitor] = useState<Competitor | null>(null);

    const [authDetermined, setAuthDetermined] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (!currentUser) {
                if (authDetermined || !auth.currentUser) {
                    router.push('/secret-access');
                }
                setAuthDetermined(true);
                return;
            }
            
            setAuthDetermined(true);
            setUser(currentUser);
            loadData();
        });
        return () => unsubscribe();
    }, [roomId, authDetermined, router]);

    const loadData = async () => {
        try {
            const [r, c, t, e] = await Promise.all([
                getRoomById(roomId),
                getCompetitorsByRoom(roomId),
                getTestTemplates(roomId),
                getEvaluationsByRoom(roomId)
            ]);
            setRoom(r);
            setCompetitors(c);
            setTests(t);
            setEvaluations(e);
        } catch (error) {
            console.error(error);
            alert('Erro ao carregar dados da sala.');
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

    const getAssignedTests = () => {
        if (!user || !room) return tests;
        const assignedTestIds = room.judgeAssignments?.[user.uid] || [];
        
        if (assignedTestIds.length === 0 && !room.judgeAssignments) {
            return tests;
        }
        
        return tests.filter(t => assignedTestIds.includes(t.id));
    };

    const getCompetitorProgress = (competitorId: string) => {
        const assignedTests = getAssignedTests();
        if (!assignedTests.length) return { current: 0, total: 0 };
        const evaluatedCount = assignedTests.filter(t => isTestEvaluated(competitorId, t.id)).length;
        return { current: evaluatedCount, total: assignedTests.length };
    };

    const handleOpenTestSelection = (competitor: Competitor) => {
        setModalCompetitor(competitor);
        setShowTestModal(true);
    };

    const startEvaluation = (competitor: Competitor, test: TestTemplate) => {
        // Reset form
        setScores({});
        setNotes('');
        setPenalties([]);
        setShowPenaltyAdd(false);
        setTempPenalty(null);
        setTempPenaltyDescription('');

        setActiveTest(test);
        setSelectedCompetitor(competitor);
        setShowTestModal(false); // Close modal if open
        setModalCompetitor(null);
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
                penaltiesApplied: penalties,
                notes
            }, activeTest);

            alert('Avaliação enviada com sucesso!');
            setSelectedCompetitor(null);
            setActiveTest(null);
            setShowPenaltyAdd(false);
            setTempPenalty(null);
            setTempPenaltyDescription('');
            loadData(); // Refresh data
        } catch (error) {
            console.error(error);
            alert('Erro ao enviar avaliação.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddPenalty = () => {
        if (isCustomPenalty) {
            const val = parseFloat(customValue);
            if (isNaN(val) || val >= 0) {
                alert('O valor da penalidade deve ser um número negativo (ex: -1.0)');
                return;
            }
            if (!tempPenaltyDescription.trim()) {
                alert('A descrição da penalidade é obrigatória!');
                return;
            }

            setPenalties([...penalties, {
                penaltyId: 'custom',
                value: val,
                description: tempPenaltyDescription.trim()
            }]);
        } else {
            if (!tempPenalty || !tempPenaltyDescription.trim()) {
                alert('A descrição da penalidade é obrigatória!');
                return;
            }

            setPenalties([...penalties, {
                penaltyId: tempPenalty.id,
                value: tempPenalty.value,
                description: tempPenaltyDescription.trim()
            }]);
        }

        // Reset temp state
        setTempPenalty(null);
        setTempPenaltyDescription('');
        setShowPenaltyAdd(false);
        setIsCustomPenalty(false);
        setCustomValue('-1.0');
    };

    const calculateCurrentTotal = () => {
        if (!activeTest) return 0;
        let total = 0;
        activeTest.groups.forEach(g => {
            g.items.forEach(item => {
                total += scores[item.id] || 0;
            });
        });
        
        penalties.forEach(p => {
            total += p.value;
        });
        
        return total;
    };

    if (loading) return <div className="min-h-screen bg-k9-white flex items-center justify-center text-k9-orange font-mono">[CARREGANDO DADOS DA OPERAÇÃO...]</div>;
    if (!room) return <div className="p-8 text-black">Sala não encontrada.</div>;

    if (selectedCompetitor && activeTest) {
        return (
            <div className="min-h-screen bg-gray-50 text-k9-black pb-20">
                <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm px-4 py-3">
                    <div className="max-w-2xl mx-auto flex items-center justify-between">
                        <button 
                            onClick={() => setSelectedCompetitor(null)} 
                            className="text-gray-500 hover:text-black flex items-center gap-2 text-xs font-bold uppercase transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" /> Cancelar
                        </button>
                        <div className="text-right">
                            {penalties.length > 0 && (
                                <div className="text-[10px] text-red-500 font-mono uppercase font-bold mb-1">
                                    {penalties.length} {penalties.length === 1 ? 'Penalidade' : 'Penalidades'} ({penalties.reduce((sum, p) => sum + p.value, 0).toFixed(1)} pts)
                                </div>
                            )}
                            <div className="text-[10px] text-gray-400 font-mono uppercase font-bold">Total Parcial</div>
                            <div className="text-2xl font-black text-k9-orange leading-none">{calculateCurrentTotal().toFixed(1)} <span className="text-sm text-gray-300">/ {activeTest.maxScore}</span></div>
                        </div>
                    </div>
                </div>

                <div className="max-w-2xl mx-auto p-4 space-y-6">
                    {/* Competitor Card */}
                    <div className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
                        <div className="w-14 h-14 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center font-black text-xl border-2 border-orange-100">
                            {selectedCompetitor.competitorNumber}
                        </div>
                        <div>
                            <h1 className="font-black text-xl uppercase text-k9-black leading-tight">{selectedCompetitor.handlerName}</h1>
                            <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase mt-1">
                                <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600">Cão: {selectedCompetitor.dogName}</span>
                                <span className="text-orange-400">•</span>
                                <span>{activeTest.title}</span>
                            </div>
                        </div>
                    </div>

                    {/* Groups & Criteria */}
                    {activeTest.groups.map((group, gIdx) => (
                        <div key={gIdx} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                            <div className="bg-gray-50 px-5 py-3 border-b border-gray-200 flex justify-between items-center">
                                <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide">{group.name}</h3>
                                <div className="text-xs font-mono font-bold text-gray-400 bg-white px-2 py-1 rounded border border-gray-200">Ref: {group.items.reduce((a, b) => a + b.maxPoints, 0)} pts</div>
                            </div>
                            <div className="p-5 space-y-8">
                                {group.items.map(item => (
                                    <div key={item.id}>
                                        <div className="flex justify-between items-end mb-3">
                                            <label className="text-sm font-bold text-k9-black w-3/4">{item.label}</label>
                                            <span className="text-xs font-mono font-bold text-k9-orange bg-orange-50 px-2 py-1 rounded border border-orange-100">Max: {item.maxPoints}</span>
                                        </div>
                                        
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

                    {/* Penalties Section */}
                    {(activeTest.penalties && activeTest.penalties.length > 0 || true) && (
                        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-5 shadow-sm">
                            <label className="block text-xs font-bold text-red-600 uppercase mb-3 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" /> Penalidades
                            </label>
                            
                            {/* Applied Penalties List */}
                            {penalties.length > 0 && (
                                <div className="space-y-3 mb-4">
                                    {penalties.map((penalty, index) => {
                                        const penaltyOption = activeTest.penalties?.find(p => p.id === penalty.penaltyId);
                                        const label = penaltyOption?.label || (penalty.penaltyId === 'custom' ? 'Penalidade Manual' : 'Penalidade');
                                        return (
                                            <div key={index} className="bg-white border-2 border-red-300 rounded-lg p-3">
                                                <div className="flex items-start justify-between gap-3 mb-2">
                                                    <div className="flex-1">
                                                        <div className="font-bold text-sm text-red-700">{label}</div>
                                                        <div className="text-xs text-red-500 font-mono">{penalty.value} pontos</div>
                                                    </div>
                                                    <button
                                                        onClick={() => setPenalties(penalties.filter((_, i) => i !== index))}
                                                        className="text-red-500 hover:text-red-700 hover:bg-red-100 p-1 rounded transition-colors"
                                                        title="Remover penalidade"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <div className="text-xs text-gray-700 bg-gray-50 p-2 rounded border border-gray-200">
                                                    <span className="font-bold text-gray-500">Justificativa:</span> {penalty.description}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Add Penalty UI */}
                            {!showPenaltyAdd ? (
                                <button
                                    onClick={() => setShowPenaltyAdd(true)}
                                    className="w-full bg-white border-2 border-red-300 text-red-600 p-3 rounded-lg hover:bg-red-50 transition-colors font-bold uppercase text-xs flex items-center justify-center gap-2"
                                >
                                    + Adicionar Penalidade
                                </button>
                            ) : (
                                <div className="bg-white border-2 border-red-400 rounded-lg p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Tipo de Penalidade</label>
                                            <select
                                                value={isCustomPenalty ? 'custom' : (tempPenalty?.id || '')}
                                                onChange={(e) => {
                                                    if (e.target.value === 'custom') {
                                                        setIsCustomPenalty(true);
                                                        setTempPenalty(null);
                                                    } else {
                                                        setIsCustomPenalty(false);
                                                        const p = activeTest.penalties?.find(opt => opt.id === e.target.value);
                                                        if (p) setTempPenalty(p);
                                                    }
                                                }}
                                                className="w-full bg-gray-50 border border-gray-200 text-k9-black p-2 rounded-md focus:outline-none focus:border-red-400 font-semibold"
                                            >
                                                <option value="" disabled>Selecione...</option>
                                                {activeTest.penalties?.map(p => (
                                                    <option key={p.id} value={p.id}>
                                                        {p.label} ({p.value} pts)
                                                    </option>
                                                ))}
                                                <option value="custom">+ Penalidade Manual</option>
                                            </select>
                                        </div>
                                        {isCustomPenalty && (
                                            <div className="w-24">
                                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Valor</label>
                                                <input
                                                    type="number"
                                                    step="0.5"
                                                    max="-0.1"
                                                    value={customValue}
                                                    onChange={(e) => setCustomValue(e.target.value)}
                                                    className="w-full bg-gray-50 border border-gray-200 text-red-600 p-2 rounded-md focus:outline-none focus:border-red-400 font-bold"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {(tempPenalty || isCustomPenalty) && (
                                        <div className="animate-in fade-in duration-300">
                                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Motivo / Justificativa (Obrigatório)</label>
                                            <textarea
                                                value={tempPenaltyDescription}
                                                onChange={(e) => setTempPenaltyDescription(e.target.value)}
                                                className="w-full bg-gray-50 border border-gray-200 text-k9-black p-2 rounded-md focus:outline-none focus:border-red-400 min-h-[80px] text-sm"
                                                placeholder="Descreva detalhadamente o motivo desta penalidade..."
                                            />
                                        </div>
                                    )}

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                setShowPenaltyAdd(false);
                                                setTempPenalty(null);
                                                setTempPenaltyDescription('');
                                                setIsCustomPenalty(false);
                                            }}
                                            className="flex-1 px-4 py-2 text-xs font-bold uppercase text-gray-500 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={handleAddPenalty}
                                            disabled={(!tempPenalty && !isCustomPenalty) || !tempPenaltyDescription.trim()}
                                            className="flex-1 px-4 py-2 text-xs font-bold uppercase bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                                        >
                                            Confirmar
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Notes & Actions */}
                    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" /> Observações Técnicas
                        </label>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            className="w-full bg-gray-50 border-2 border-gray-200 text-k9-black p-4 rounded-xl focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 min-h-[120px] font-sans text-sm"
                            placeholder="Insira detalhes adicionais, justificativas ou comentários sobre a performance..."
                        ></textarea>
                    </div>

                    <div className="pt-4 pb-8">
                        <button
                            onClick={submitEvaluation}
                            disabled={submitting}
                            className="w-full bg-black hover:bg-gray-900 text-white font-black uppercase py-5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl hover:shadow-2xl hover:-translate-y-1 flex items-center justify-center gap-3 text-lg border-2 border-transparent"
                        >
                            {submitting ? 'Processando envio...' : (
                                <>
                                    <CheckCircle2 className="w-6 h-6 text-green-400" /> Confirmar Avaliação
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-k9-white text-k9-black font-sans relative">
            
            {showTestModal && modalCompetitor && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                         <div className="bg-black text-white p-6 flex justify-between items-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-k9-orange/20 rounded-full blur-2xl -mr-10 -mt-10"></div>
                            <div>
                                <h3 className="text-xs font-bold text-k9-orange uppercase tracking-widest mb-1">Selecionar Prova</h3>
                                <h2 className="text-2xl font-black uppercase tracking-tight">{modalCompetitor.handlerName}</h2>
                            </div>
                            <button 
                                onClick={() => setShowTestModal(false)}
                                className="text-gray-400 hover:text-white transition-colors bg-white/10 p-2 rounded-lg hover:bg-white/20 z-10"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <div className="p-6 max-h-[60vh] overflow-y-auto">
                            <div className="space-y-3">
                                {getAssignedTests().length === 0 ? (
                                    <div className="text-center py-8 text-gray-400">
                                        <p className="font-bold mb-2">Nenhuma prova atribuída</p>
                                        <p className="text-xs">Entre em contato com o administrador para atribuir provas.</p>
                                    </div>
                                ) : (
                                    getAssignedTests().map((test) => {
                                        const isDone = isTestEvaluated(modalCompetitor.id, test.id);
                                        const isAssigned = modalCompetitor.testId === test.id;
                                        
                                        return (
                                            <button
                                                key={test.id}
                                                disabled={isDone}
                                                onClick={() => !isDone && startEvaluation(modalCompetitor, test)}
                                                className={`
                                                    w-full text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between group relative overflow-hidden
                                                    ${isDone 
                                                        ? 'bg-green-50 border-green-100 opacity-60 cursor-not-allowed' 
                                                        : 'bg-white border-gray-200 hover:border-k9-orange hover:shadow-lg'
                                                    }
                                                `}
                                            >
                                                <div className="relative z-10">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h4 className={`font-black uppercase text-sm ${isDone ? 'text-green-800' : 'text-k9-black'}`}>
                                                            {test.title}
                                                        </h4>
                                                        {isAssigned && (
                                                            <span className="text-[10px] bg-gray-900 text-white px-2 py-0.5 rounded font-bold uppercase tracking-wide">
                                                                Principal
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-gray-500 font-semibold uppercase">{test.modality}</p>
                                                </div>

                                                <div className="relative z-10">
                                                    {isDone ? (
                                                         <div className="flex items-center gap-1 text-xs font-black uppercase text-green-600 bg-white px-3 py-1.5 rounded-lg shadow-sm border border-green-200">
                                                            <Check className="w-3 h-3" /> Feito
                                                        </div>
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-k9-orange group-hover:text-white transition-colors">
                                                            <ArrowLeft className="w-4 h-4 rotate-180" />
                                                        </div>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="bg-black border-b-4 border-k9-orange text-white shadow-lg sticky top-0 z-30">
                <div className="max-w-4xl mx-auto px-6 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                             <button onClick={() => router.push('/judge')} className="flex items-center gap-2 text-gray-500 hover:text-white mb-2 text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer">
                                <ArrowLeft className="w-3 h-3" /> Voltar
                            </button>
                            <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tighter leading-none flex items-center gap-4">
                                <div className="w-10 h-10 relative flex items-center justify-center shrink-0">
                                    <img src="/logo.png" alt="Logo" className="object-contain w-full h-full" />
                                </div>
                                {room.name}
                            </h1>
                            <p className="text-k9-orange text-[10px] md:text-xs uppercase tracking-[0.2em] mt-1 font-bold">Seleção de Operador</p>
                        </div>
                        <div className="hidden md:block">
                            <div className="bg-gray-900 border border-gray-800 px-4 py-2 rounded-lg text-center">
                                <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Status</div>
                                <div className="text-green-500 font-black uppercase text-xs flex items-center gap-1"><div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div> Online</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto p-6 md:p-8">
                {competitors.length === 0 ? (
                    <div className="text-center py-16 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                        <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
                        <p className="uppercase font-bold text-sm tracking-wide">Nenhum competidor na lista</p>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                        {competitors.map(comp => {
                            const { current, total } = getCompetitorProgress(comp.id);
                            const isFullyComplete = total > 0 && current === total;
                            const progressPercent = total > 0 ? (current / total) * 100 : 0;

                            return (
                                <div 
                                    key={comp.id} 
                                    className={`
                                        relative overflow-hidden rounded-xl border-2 transition-all group
                                        ${isFullyComplete 
                                            ? 'bg-green-50/50 border-green-100 opacity-80' 
                                            : 'bg-white border-gray-200 hover:border-k9-orange hover:shadow-md'
                                        }
                                    `}
                                >
                                    {isFullyComplete && (
                                        <div className="absolute top-0 right-0 p-2 bg-green-100 rounded-bl-xl border-l border-b border-green-200 z-10">
                                            <div className="flex items-center gap-1 text-[10px] font-black uppercase text-green-700">
                                                <Check className="w-3 h-3" /> Completo
                                            </div>
                                        </div>
                                    )}

                                    <div className="p-5 flex items-start gap-4">
                                        <div className={`
                                            w-14 h-14 rounded-lg flex items-center justify-center font-black text-xl shadow-sm border-2 relative z-10
                                            ${isFullyComplete 
                                                ? 'bg-white border-green-100 text-green-600' 
                                                : 'bg-gray-50 border-gray-100 text-gray-500 group-hover:text-k9-orange group-hover:bg-orange-50 group-hover:border-orange-100'
                                            }
                                        `}>
                                            {comp.competitorNumber}
                                        </div>
                                        
                                        <div className="flex-1 relative z-10">
                                            <h3 className={`font-black uppercase text-sm leading-tight ${isFullyComplete ? 'text-green-900' : 'text-k9-black'}`}>
                                                {comp.handlerName}
                                            </h3>
                                            <p className="text-xs font-bold text-gray-400 uppercase mt-1">
                                                Cão: {comp.dogName}
                                            </p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <p className="text-[10px] font-bold text-gray-300 uppercase bg-gray-50 inline-block px-2 py-1 rounded">
                                                    {comp.dogBreed}
                                                </p>
                                                 {total > 0 && (
                                                    <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded">
                                                        <Trophy className="w-3 h-3" />
                                                        {current}/{total}
                                                    </div>
                                                 )}
                                            </div>
                                        </div>
                                    </div>

                                    {!isFullyComplete && current > 0 && (
                                        <div className="absolute bottom-0 left-0 h-1 bg-green-500/20" style={{ width: `${progressPercent}%` }}></div>
                                    )}

                                    <div className={`p-3 border-t-2 flex justify-end ${isFullyComplete ? 'border-green-100 bg-green-50/30' : 'border-gray-50 bg-gray-50'}`}>
                                        <button
                                            onClick={() => handleOpenTestSelection(comp)}
                                            className={`
                                                px-5 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2
                                                ${isFullyComplete
                                                    ? 'text-green-400 cursor-pointer hover:text-green-600'
                                                    : 'bg-black text-white hover:bg-orange-500 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer'
                                                }
                                            `}
                                        >
                                            {isFullyComplete ? (
                                                <>Ver Avaliações <List className="w-3 h-3" /></>
                                            ) : (
                                                <>Avaliar Provas <List className="w-3 h-3" /></>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
