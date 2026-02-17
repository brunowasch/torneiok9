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
    AlertCircle
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
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (!currentUser) {
                router.push('/secret-access');
                return;
            }
            setUser(currentUser);
            loadData();
        });
        return () => unsubscribe();
    }, [roomId]);

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

    const startEvaluation = (competitor: Competitor) => {
        if (!competitor.testId) {
            alert('Este competidor não possui uma prova atribuída.');
            return;
        }
        const test = tests.find(t => t.id === competitor.testId);
        if (!test) {
            alert('Prova não encontrada (ID inválido ou removida).');
            return;
        }

        // Reset form
        setScores({});
        setNotes('');

        setActiveTest(test);
        setSelectedCompetitor(competitor);
    };

    const handleScoreChange = (itemId: string, value: number, max: number) => {
        // Clamp value between 0 and max
        const clamped = Math.max(0, Math.min(value, max));
        setScores(prev => ({ ...prev, [itemId]: clamped }));
    };

    const submitEvaluation = async () => {
        if (!selectedCompetitor || !activeTest || !user) return;
        setSubmitting(true);

        try {
            const penaltiesApplied: any[] = [];

            await saveEvaluation({
                roomId,
                testId: activeTest.id,
                competitorId: selectedCompetitor.id,
                judgeId: user.uid,
                scores,
                penaltiesApplied,
                notes
            }, activeTest);

            alert('Avaliação enviada com sucesso!');
            setSelectedCompetitor(null);
            setActiveTest(null);
            loadData(); // Refresh to show "Evaluated" status
        } catch (error) {
            console.error(error);
            alert('Erro ao enviar avaliação.');
        } finally {
            setSubmitting(false);
        }
    };

    const isCompetitorEvaluated = (competitorId: string) => {
        if (!user) return false;
        return evaluations.some(e => e.competitorId === competitorId && e.judgeId === user.uid);
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

    if (loading) return <div className="min-h-screen bg-k9-white flex items-center justify-center text-k9-orange font-mono">[CARREGANDO DADOS DA OPERAÇÃO...]</div>;
    if (!room) return <div className="p-8 text-black">Sala não encontrada.</div>;

    // ------------------------------------------------------------------
    // EVALUATION FORM VIEW
    // ------------------------------------------------------------------
    if (selectedCompetitor && activeTest) {
        return (
            <div className="min-h-screen bg-gray-50 text-k9-black pb-20">
                {/* Sticky Header */}
                <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm px-4 py-3">
                    <div className="max-w-2xl mx-auto flex items-center justify-between">
                        <button 
                            onClick={() => setSelectedCompetitor(null)} 
                            className="text-gray-500 hover:text-black flex items-center gap-2 text-xs font-bold uppercase transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" /> Cancelar
                        </button>
                        <div className="text-right">
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

    // ------------------------------------------------------------------
    // LIST VIEW
    // ------------------------------------------------------------------
    return (
        <div className="min-h-screen bg-k9-white text-k9-black font-sans">
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
                            const isDone = isCompetitorEvaluated(comp.id);
                            const canEvaluate = !isDone;

                            return (
                                <div 
                                    key={comp.id} 
                                    className={`
                                        relative overflow-hidden rounded-xl border-2 transition-all group
                                        ${isDone 
                                            ? 'bg-green-50/50 border-green-100 opacity-80' 
                                            : 'bg-white border-gray-200 hover:border-k9-orange hover:shadow-md'
                                        }
                                    `}
                                >
                                    {isDone && (
                                        <div className="absolute top-0 right-0 p-2 bg-green-100 rounded-bl-xl border-l border-b border-green-200">
                                            <div className="flex items-center gap-1 text-[10px] font-black uppercase text-green-700">
                                                <Check className="w-3 h-3" /> Avaliado
                                            </div>
                                        </div>
                                    )}

                                    <div className="p-5 flex items-start gap-4">
                                        <div className={`
                                            w-14 h-14 rounded-lg flex items-center justify-center font-black text-xl shadow-sm border-2
                                            ${isDone 
                                                ? 'bg-white border-green-100 text-green-600' 
                                                : 'bg-gray-50 border-gray-100 text-gray-500 group-hover:text-k9-orange group-hover:bg-orange-50 group-hover:border-orange-100'
                                            }
                                        `}>
                                            {comp.competitorNumber}
                                        </div>
                                        
                                        <div className="flex-1">
                                            <h3 className={`font-black uppercase text-sm leading-tight ${isDone ? 'text-green-900' : 'text-k9-black'}`}>
                                                {comp.handlerName}
                                            </h3>
                                            <p className="text-xs font-bold text-gray-400 uppercase mt-1">
                                                Cão: {comp.dogName}
                                            </p>
                                            <p className="text-[10px] font-bold text-gray-300 uppercase mt-2 bg-gray-50 inline-block px-2 py-1 rounded">
                                                {comp.dogBreed}
                                            </p>
                                        </div>
                                    </div>

                                    <div className={`p-3 border-t-2 flex justify-end ${isDone ? 'border-green-100 bg-green-50/30' : 'border-gray-50 bg-gray-50'}`}>
                                        <button
                                            onClick={() => canEvaluate && startEvaluation(comp)}
                                            disabled={isDone}
                                            className={`
                                                px-5 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all
                                                ${isDone
                                                    ? 'text-green-300 cursor-not-allowed'
                                                    : 'bg-black text-white hover:bg-orange-500 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer'
                                                }
                                            `}
                                        >
                                            {isDone ? 'Concluído' : 'Iniciar Avaliação'}
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
