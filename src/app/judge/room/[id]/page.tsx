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
    Evaluation,
    ScoreOption,
    PenaltyOption
} from '@/types/schema';
import {
    ArrowLeft,
    User,
    ClipboardCheck,
    AlertTriangle,
    CheckCircle2,
    Timer,
    Gavel
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
    const [penalties, setPenalties] = useState<string[]>([]); // Store IDs of applied penalties
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
        setPenalties([]);
        setNotes('');

        setActiveTest(test);
        setSelectedCompetitor(competitor);
    };

    const handleScoreChange = (itemId: string, value: number, max: number) => {
        // Clamp value between 0 and max
        const clamped = Math.max(0, Math.min(value, max));
        setScores(prev => ({ ...prev, [itemId]: clamped }));
    };

    const togglePenalty = (penaltyId: string) => {
        setPenalties(prev =>
            prev.includes(penaltyId)
                ? prev.filter(id => id !== penaltyId)
                : [...prev, penaltyId]
        );
    };

    const submitEvaluation = async () => {
        if (!selectedCompetitor || !activeTest || !user) return;
        setSubmitting(true);

        try {
            // Penalties are now handled by Admin
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

        // Add scores
        activeTest.groups.forEach(g => {
            g.items.forEach(item => {
                total += scores[item.id] || 0;
            });
        });



        return Math.max(0, total);
    };

    if (loading) return <div className="min-h-screen bg-tactical-black flex items-center justify-center text-police-gold font-mono">[CARREGANDO DADOS DA OPERAÇÃO...]</div>;
    if (!room) return <div className="p-8 text-white">Sala não encontrada.</div>;

    // Evaluation Form View
    if (selectedCompetitor && activeTest) {
        return (
            <div className="min-h-screen bg-tactical-black text-gray-200 p-4 pb-20">
                <div className="max-w-2xl mx-auto">
                    {/* Form Header */}
                    <div className="sticky top-0 z-10 bg-tactical-black/95 backdrop-blur border-b border-gray-800 pb-4 pt-2 mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <button onClick={() => setSelectedCompetitor(null)} className="text-gray-500 hover:text-white flex items-center gap-2 text-xs font-bold uppercase transition-colors">
                                <ArrowLeft className="w-4 h-4" /> Cancelar
                            </button>
                            <div className="text-right">
                                <div className="text-[10px] text-gray-500 font-mono uppercase">Pontuação Atual</div>
                                <div className="text-2xl font-black text-police-gold">{calculateCurrentTotal().toFixed(1)} <span className="text-sm text-gray-600">/ {activeTest.maxScore}</span></div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 bg-tactical-gray p-4 rounded-lg border border-gray-700">
                            <div className="w-12 h-12 bg-black rounded flex items-center justify-center font-black text-xl text-gray-500">
                                {selectedCompetitor.competitorNumber}
                            </div>
                            <div>
                                <h1 className="font-bold text-white text-lg uppercase leading-none">{selectedCompetitor.handlerName}</h1>
                                <p className="text-police-gold text-xs uppercase font-mono mt-1">Cão: {selectedCompetitor.dogName} • {activeTest.title}</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-8">
                        {/* Scoring Groups */}
                        {activeTest.groups.map((group, gIdx) => (
                            <div key={gIdx} className="bg-white/5 border border-gray-800 rounded-xl overflow-hidden">
                                <div className="bg-gray-800/50 px-4 py-3 border-b border-gray-700">
                                    <h3 className="font-bold text-white text-sm uppercase">{group.name}</h3>
                                </div>
                                <div className="p-4 space-y-6">
                                    {group.items.map(item => (
                                        <div key={item.id}>
                                            <div className="flex justify-between items-center mb-2">
                                                <label className="text-sm text-gray-300 font-medium">{item.label}</label>
                                                <span className="text-xs font-mono text-police-gold bg-police-gold/10 px-2 py-1 rounded">Max: {item.maxPoints}</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max={item.maxPoints}
                                                    step="0.5"
                                                    value={scores[item.id] || 0}
                                                    onChange={(e) => handleScoreChange(item.id, parseFloat(e.target.value), item.maxPoints)}
                                                    className="flex-1 accent-police-gold h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                                />
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={item.maxPoints}
                                                    step="0.1"
                                                    value={scores[item.id] || 0}
                                                    onChange={(e) => handleScoreChange(item.id, parseFloat(e.target.value), item.maxPoints)}
                                                    className="w-16 bg-black border border-gray-600 rounded p-2 text-center text-white font-mono focus:border-police-gold focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}



                        {/* Notes */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Observações do Juiz</label>
                            <textarea
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                className="w-full bg-black/50 border border-gray-700 text-white p-4 rounded-xl focus:outline-none focus:border-police-gold h-32"
                                placeholder="Detalhes adicionais sobre a avaliação..."
                            ></textarea>
                        </div>

                        <button
                            onClick={submitEvaluation}
                            disabled={submitting}
                            className="w-full bg-white hover:bg-white text-black font-black uppercase py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                            {submitting ? 'Enviando...' : 'Finalizar Avaliação'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Default List View
    return (
        <div className="min-h-screen bg-tactical-black text-gray-200">
            {/* Header */}
            <div className="bg-tactical-gray border-b border-gray-800 p-6 sticky top-0 z-10 backdrop-blur-md bg-opacity-90">
                <div className="max-w-4xl mx-auto">
                    <button onClick={() => router.push('/judge')} className="flex items-center gap-2 text-gray-500 hover:text-white mb-4 text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer">
                        <ArrowLeft className="w-4 h-4" /> Voltar
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-white uppercase tracking-tighter">{room.name}</h1>
                        <p className="text-police-gold text-xs uppercase tracking-widest mt-1">Lista de Competidores</p>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto p-6 md:p-8">
                {competitors.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 border border-dashed border-gray-800 rounded-xl bg-white/5">
                        <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="uppercase font-bold text-sm">Nenhum competidor registrado</p>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {competitors.map(comp => {
                            const isDone = isCompetitorEvaluated(comp.id);
                            return (
                                <div key={comp.id} className={`bg-tactical-gray border ${isDone ? 'border-green-900/50 bg-green-900/5' : 'border-gray-800'} p-4 rounded-xl relative overflow-hidden group`}>
                                    {isDone && (
                                        <div className="absolute top-2 right-2 text-green-500">
                                            <CheckCircle2 className="w-5 h-5" />
                                        </div>
                                    )}
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-black text-xl shadow-inner ${isDone ? 'bg-green-900/20 text-green-500' : 'bg-black text-gray-600'}`}>
                                            {comp.competitorNumber}
                                        </div>
                                        <div>
                                            <div className="font-bold text-white uppercase text-sm leading-tight">{comp.handlerName}</div>
                                            <div className="text-xs text-police-gold font-mono uppercase mt-0.5">{comp.dogName}</div>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center pt-4 border-t border-gray-800/50">
                                        <div className="text-[10px] uppercase font-bold text-gray-500">
                                            {comp.dogBreed}
                                        </div>
                                        <button
                                            onClick={() => !isDone && startEvaluation(comp)}
                                            disabled={isDone}
                                            className={`px-4 py-2 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${isDone
                                                ? 'text-gray-500 cursor-not-allowed'
                                                : 'bg-white text-black hover:bg-white cursor-pointer'
                                                }`}
                                        >
                                            {isDone ? 'Avaliado' : 'Avaliar'}
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

function Users(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    )
}
