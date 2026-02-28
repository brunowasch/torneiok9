'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { getAllCompetitors } from '@/services/rankingService';
import { getModalities } from '@/services/adminService';
import { Competitor, Evaluation, TestTemplate, AppUser } from '@/types/schema';
import { Users, Search, Flame, X, Trophy, ChevronDown, ChevronRight, Shield, AlertCircle } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface JudgeScore {
    judgeName: string;
    judgeId: string;
    finalScore: number;
    notes?: string;
    status?: string;
    penaltiesApplied: { penaltyId: string; value: number; description: string }[];
    scores: Record<string, number>;
    testTemplate?: TestTemplate;
}

interface CompetitorDetail extends Competitor {
    judgeScores: Record<string, JudgeScore[]>; // testId -> judge scores
    tests: TestTemplate[];
}

export default function CompetitorsPage() {
    const [competitors, setCompetitors] = useState<Competitor[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [modalities, setModalities] = useState<string[]>([]);
    const [selectedModality, setSelectedModality] = useState<string | null>(null); // null = Todos
    const [selectedCompetitor, setSelectedCompetitor] = useState<CompetitorDetail | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [comps, mods] = await Promise.all([
                    getAllCompetitors(),
                    getModalities()
                ]);
                const validModalityNames = mods.map(m => m.name);
                const validComps = comps.filter(c => validModalityNames.includes(c.modality));
                setCompetitors(validComps);
                setModalities(validModalityNames);
                // null = Todos (primeiro item)
                setSelectedModality(null);
            } catch (e) {
                console.error("Error fetching competitors", e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const openCompetitorDetail = async (comp: Competitor) => {
        setLoadingDetail(true);
        setSelectedCompetitor({ ...comp, judgeScores: {}, tests: [] });

        try {
            // Buscar avaliações do competidor
            const evalsQ = query(collection(db, 'evaluations'), where('competitorId', '==', comp.id));
            const evalsSnap = await getDocs(evalsQ);
            const evals = evalsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Evaluation));

            if (evals.length === 0) {
                setSelectedCompetitor({ ...comp, judgeScores: {}, tests: [] });
                setLoadingDetail(false);
                return;
            }

            // Buscar provas
            const testIds = [...new Set(evals.map(e => e.testId))];
            const testsQ = query(collection(db, 'tests'), where('roomId', '==', comp.roomId));
            const testsSnap = await getDocs(testsQ);
            const allTests = testsSnap.docs.map(d => ({ id: d.id, ...d.data() } as TestTemplate));
            const relevantTests = allTests.filter(t => testIds.includes(t.id));

            // Buscar juízes (nomes)
            const judgeIds = [...new Set(evals.map(e => e.judgeId))];
            const judgesQ = query(collection(db, 'users'), where('role', '==', 'judge'));
            const judgesSnap = await getDocs(judgesQ);
            const judgesMap: Record<string, string> = {};
            judgesSnap.docs.forEach(d => {
                const data = d.data() as AppUser;
                judgesMap[d.id] = data.name || data.email;
            });

            // Montar mapa testId -> [scores por juiz]
            const judgeScores: Record<string, JudgeScore[]> = {};
            evals.forEach(ev => {
                if (!judgeScores[ev.testId]) judgeScores[ev.testId] = [];
                judgeScores[ev.testId].push({
                    judgeName: judgesMap[ev.judgeId] || ev.judgeId,
                    judgeId: ev.judgeId,
                    finalScore: ev.finalScore,
                    notes: ev.notes,
                    status: ev.status,
                    penaltiesApplied: ev.penaltiesApplied || [],
                    scores: ev.scores || {},
                    testTemplate: relevantTests.find(t => t.id === ev.testId)
                });
            });

            setSelectedCompetitor({ ...comp, judgeScores, tests: relevantTests });
        } catch (err) {
            console.error('Error loading competitor detail', err);
        } finally {
            setLoadingDetail(false);
        }
    };

    // Competidores filtrados pela busca + modalidade
    const filteredCompetitors = competitors.filter(c => {
        const matchesMod = !selectedModality || c.modality === selectedModality;
        const matchesSearch = !search ||
            c.handlerName.toLowerCase().includes(search.toLowerCase()) ||
            c.dogName.toLowerCase().includes(search.toLowerCase()) ||
            c.dogBreed?.toLowerCase().includes(search.toLowerCase());
        return matchesMod && matchesSearch;
    });

    // Quando "Todos": agrupar por modalidade
    const groupedByModality: Record<string, Competitor[]> = {};
    if (!selectedModality) {
        modalities.forEach(mod => {
            const group = filteredCompetitors.filter(c => c.modality === mod);
            if (group.length > 0) groupedByModality[mod] = group;
        });
    }

    // Contar por modalidade para os badges
    const countByModality = (mod: string) =>
        competitors.filter(c => c.modality === mod).length;

    return (
        <div className="min-h-screen bg-k9-white text-k9-black font-sans">
            <Navbar />

            <main className="max-w-7xl mx-auto p-4 md:p-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-k9-black uppercase tracking-tighter flex items-center gap-3">
                            <Users className="w-8 h-8 text-k9-orange" />
                            Lista de Competidores
                        </h1>
                        <p className="text-gray-500 text-sm uppercase tracking-widest pl-11 mt-1">Registro Oficial de Binômios</p>
                    </div>

                    <div className="relative w-full md:w-72">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            className="block w-full pl-10 pr-3 py-3 border-2 border-gray-200 rounded-xl bg-white text-k9-black placeholder-gray-400 focus:outline-none focus:border-k9-orange focus:ring-2 focus:ring-orange-100 text-sm uppercase tracking-wider transition-all shadow-sm"
                            placeholder="BUSCAR..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>  

                {/* Tabs: Todos + Modalidades */}
                {!loading && modalities.length > 0 && (
                    <div className="mb-8 overflow-x-auto pb-4">
                        <div className="flex gap-6 min-w-max px-3">
                            <button
                                onClick={() => setSelectedModality(null)}
                                className={`px-6 py-3 text-sm font-black uppercase tracking-wider rounded-lg border-2 origin-left transition-all duration-200 whitespace-nowrap shadow-sm cursor-pointer
                                    ${selectedModality === null
                                        ? 'bg-orange-400 text-white border-orange-400 shadow-md scale-105'
                                        : 'bg-white text-black border-gray-300 hover:bg-orange-400 hover:text-white hover:border-orange-400'
                                    }`}
                            >
                                Todos
                            </button>

                            {modalities.map(mod => (
                                <button
                                    key={mod}
                                    onClick={() => setSelectedModality(mod)}
                                    className={`px-6 py-3 text-sm font-black uppercase tracking-wider rounded-lg border-2 origin-left transition-all duration-200 whitespace-nowrap shadow-sm cursor-pointer
                                        ${selectedModality === mod
                                            ? 'bg-orange-400 text-white border-orange-400 shadow-md scale-105'
                                            : 'bg-white text-black border-gray-300 hover:bg-orange-400 hover:text-white hover:border-orange-400'
                                        }`}
                                >
                                    {mod}
                                </button>
                            ))}
                        </div>
                    </div>
                )}


                {/* Grid / Grouped List */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="bg-white border border-gray-100 p-6 rounded-2xl animate-pulse h-32"></div>
                        ))}
                    </div>
                ) : selectedModality === null ? (
                    <div className="space-y-10">
                        {Object.keys(groupedByModality).length === 0 ? (
                            <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                                <Users className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                                <div className="text-gray-400 font-black uppercase tracking-widest">NENHUM COMPETIDOR ENCONTRADO</div>
                            </div>
                        ) : (
                            Object.entries(groupedByModality).map(([mod, comps]) => (
                                <div key={mod}>
                                    {/* Cabeçalho da modalidade */}
                                    <div className="flex items-center gap-3 mb-5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1 h-6 bg-k9-orange rounded-full"></div>
                                            <Shield className="w-4 h-4 text-k9-orange" />
                                            <h2 className="text-sm font-black uppercase tracking-widest text-k9-black">{mod}</h2>
                                        </div>
                                        <span className="text-xs text-gray-400 font-bold">— {comps.length} competidor{comps.length !== 1 ? 'es' : ''}</span>
                                        <div className="flex-1 h-px bg-gray-100"></div>
                                    </div>
                                    <CompetitorGrid comps={comps} onSelect={openCompetitorDetail} />
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    <div>
                        <div className="flex items-center gap-2 mb-5">
                            <div className="w-1 h-5 bg-k9-orange rounded-full"></div>
                            <h2 className="text-sm font-black uppercase tracking-widest text-k9-black">{selectedModality}</h2>
                            <span className="text-xs text-gray-400 font-bold">— {filteredCompetitors.length} competidores</span>
                        </div>
                        {filteredCompetitors.length === 0 ? (
                            <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                                <Users className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                                <div className="text-gray-400 font-black uppercase tracking-widest">NENHUM COMPETIDOR ENCONTRADO</div>
                            </div>
                        ) : (
                            <CompetitorGrid comps={filteredCompetitors} onSelect={openCompetitorDetail} />
                        )}
                    </div>
                )}
            </main>

            {/* ── Modal de Detalhes do Competidor ── */}
            {selectedCompetitor && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4"
                    onClick={(e) => { if (e.target === e.currentTarget) setSelectedCompetitor(null); }}
                >
                    <div className="bg-white w-full md:max-w-2xl rounded-t-3xl md:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden border-2 border-gray-100">

                        {/* Modal Header */}
                        <div className="bg-black p-6 flex items-center justify-between flex-shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-xl overflow-hidden bg-orange-900/20 border-2 border-orange-500/30 shrink-0 flex items-center justify-center text-white font-black text-lg">
                                    {selectedCompetitor.photoUrl ? (
                                        <img src={selectedCompetitor.photoUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        selectedCompetitor.handlerName.substring(0, 2).toUpperCase()
                                    )}
                                </div>
                                <div>
                                    <div className="text-[10px] text-k9-orange font-black text-gray-400 text-xs font-bold uppercase uppercase tracking-widest">
                                        {selectedCompetitor.modality}
                                    </div>
                                    <h2 className="text-white font-black text-xl uppercase tracking-tight leading-tight">
                                        {selectedCompetitor.handlerName}
                                    </h2>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className="text-gray-400 text-xs font-bold uppercase">{selectedCompetitor.dogName}</span>
                                        <span className="text-gray-600">•</span>
                                        <span className="text-gray-500 text-xs font-bold uppercase">{selectedCompetitor.dogBreed}</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedCompetitor(null)}
                                className="text-gray-500 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="overflow-y-auto flex-1 p-6 space-y-6">
                            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                <Trophy className="w-4 h-4 text-k9-orange" /> Notas dos Juízes por Prova
                            </h3>

                            {loadingDetail ? (
                                <div className="space-y-4">
                                    {[1, 2].map(i => (
                                        <div key={i} className="bg-gray-50 rounded-2xl p-6 animate-pulse h-28"></div>
                                    ))}
                                </div>
                            ) : Object.keys(selectedCompetitor.judgeScores).length === 0 ? (
                                <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-100 rounded-2xl">
                                    <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                    <p className="font-bold uppercase text-sm tracking-wide">Nenhuma avaliação registrada</p>
                                    <p className="text-xs mt-1 text-gray-300">Este competidor ainda não foi avaliado</p>
                                </div>
                            ) : (
                                selectedCompetitor.tests
                                    .sort((a, b) => (a.testNumber || 0) - (b.testNumber || 0))
                                    .map(test => {
                                        const judgeEntries = selectedCompetitor.judgeScores[test.id] || [];
                                        if (judgeEntries.length === 0) return null;

                                        // Calcular média
                                        const validScores = judgeEntries.filter(j => j.status !== 'did_not_participate');
                                        const avg = validScores.length > 0
                                            ? validScores.reduce((s, j) => s + j.finalScore, 0) / validScores.length
                                            : 0;
                                        const isNC = judgeEntries.some(j => j.status === 'did_not_participate');

                                        return (
                                            <TestScoreSection
                                                key={test.id}
                                                test={test}
                                                judgeEntries={judgeEntries}
                                                avg={avg}
                                                isNC={isNC}
                                            />
                                        );
                                    })
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ─── Sub-componente: Grid de Cards de Competidores ─── */
function CompetitorGrid({
    comps,
    onSelect
}: {
    comps: Competitor[];
    onSelect: (comp: Competitor) => void;
}) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {comps.map(comp => (
                <button
                    key={comp.id}
                    onClick={() => onSelect(comp)}
                    className="bg-white border-2 border-gray-100 p-5 rounded-2xl shadow-sm hover:shadow-xl hover:border-k9-orange transform hover:-translate-y-1 transition-all group relative overflow-hidden flex items-center gap-4 text-left cursor-pointer"
                >
                    {/* Avatar */}
                    <div className="w-16 h-16 rounded-xl flex items-center justify-center text-xl font-black shrink-0 shadow-sm overflow-hidden bg-orange-50 text-orange-600 border-2 border-orange-100 group-hover:border-k9-orange transition-colors">
                        {comp.photoUrl ? (
                            <img src={comp.photoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <span>{comp.handlerName.substring(0, 2).toUpperCase()}</span>
                        )}
                    </div>

                    {/* Details */}
                    <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-black text-k9-black uppercase leading-tight tracking-tight truncate group-hover:text-k9-orange transition-colors">
                            {comp.handlerName}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-1">
                            <Flame className="w-3 h-3 text-k9-orange shrink-0" />
                            <span className="text-[10px] font-black text-gray-400 uppercase">Cão:</span>
                            <span className="text-xs font-bold text-gray-700 truncate uppercase">{comp.dogName}</span>
                        </div>
                        <div className="mt-2">
                            <span className="text-[9px] text-gray-400 uppercase font-black px-2 py-0.5 bg-gray-50 rounded-full border border-gray-100 tracking-widest">
                                {comp.dogBreed || 'RAÇA NÃO DEFINIDA'}
                            </span>
                        </div>
                    </div>

                    {/* Arrow */}
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-k9-orange shrink-0 transition-colors" />

                    {/* Decorative */}
                    <div className="absolute -bottom-2 -right-2 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Flame className="w-20 h-20 text-k9-orange rotate-12" />
                    </div>
                </button>
            ))}
        </div>
    );
}

/* ─── Sub-componente: Seção de uma Prova ─── */
function TestScoreSection({
    test,
    judgeEntries,
    avg,
    isNC
}: {
    test: TestTemplate;
    judgeEntries: JudgeScore[];
    avg: number;
    isNC: boolean;
}) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="border-2 border-gray-100 rounded-2xl overflow-hidden">
            {/* Test Header */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors cursor-pointer"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-900 rounded-xl flex flex-col items-center justify-center text-white font-black shadow-sm">
                        <span className="text-[8px] opacity-50 leading-none">Nº</span>
                        <span className="text-sm leading-none">{test.testNumber ? String(test.testNumber).padStart(2, '0') : '--'}</span>
                    </div>
                    <div>
                        <div className="font-black text-base text-k9-black uppercase tracking-tight">{test.title}</div>
                        <div className="text-[10px] text-gray-400 font-bold uppercase">{judgeEntries.length} juiz{judgeEntries.length !== 1 ? 'es' : ''} · Máx: {test.maxScore} pts</div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-right">
                        <div className={`text-2xl font-black leading-none ${isNC ? 'text-red-500' : 'text-k9-orange'}`}>
                            {isNC ? 'NC' : avg.toFixed(1)}
                        </div>
                        <div className="text-[9px] text-gray-400 font-black uppercase">{isNC ? 'Ausência' : 'Média'}</div>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                </div>
            </button>

            {/* Expanded: per-judge scores */}
            {expanded && (
                <div className="border-t-2 border-gray-100 bg-gray-50/50 divide-y divide-gray-100">
                    {judgeEntries.map((judge, idx) => {
                        const isJudgeNC = judge.status === 'did_not_participate';
                        return (
                            <div key={idx} className="p-5">
                                {/* Judge Header */}
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 bg-gray-800 rounded-lg flex items-center justify-center text-[10px] text-white font-black">
                                            {judge.judgeName.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="text-xs font-black text-gray-700 uppercase">{judge.judgeName}</div>
                                            <div className="text-[9px] text-gray-400 uppercase font-bold">Juiz</div>
                                        </div>
                                    </div>
                                    <div className={`text-xl font-black ${isJudgeNC ? 'text-red-500' : 'text-k9-black'}`}>
                                        {isJudgeNC ? 'NC' : judge.finalScore.toFixed(1)}
                                        {!isJudgeNC && <span className="text-xs text-gray-300 font-bold ml-1">pts</span>}
                                    </div>
                                </div>

                                {/* Critérios */}
                                {!isJudgeNC && judge.testTemplate && Object.keys(judge.scores).length > 0 && (
                                    <div className="space-y-1.5 mb-3">
                                        {judge.testTemplate.groups.map((group, gIdx) => (
                                            <div key={gIdx}>
                                                <div className="text-[9px] font-black text-gray-400 uppercase mb-1">{group.name}</div>
                                                {group.items.map(item => (
                                                    <div key={item.id} className="flex items-center justify-between text-xs py-1 px-3 bg-white rounded-lg border border-gray-100">
                                                        <span className="text-gray-600 font-semibold truncate pr-2">{item.label}</span>
                                                        <span className="font-black text-gray-800 shrink-0">
                                                            {judge.scores[item.id] ?? 0}
                                                            <span className="text-gray-300 font-normal">/{item.maxPoints}</span>
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Penalidades */}
                                {!isJudgeNC && judge.penaltiesApplied.length > 0 && (
                                    <div className="mb-3 space-y-1">
                                        {judge.penaltiesApplied.map((pen, pIdx) => (
                                            <div key={pIdx} className="flex items-start justify-between text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                                                <span className="text-red-600 font-semibold">{pen.description}</span>
                                                <span className="font-black text-red-600 shrink-0 ml-2">{pen.value} pts</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Observações */}
                                {judge.notes && (
                                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
                                        <div className="font-black uppercase text-[9px] text-blue-400 mb-1">Observações</div>
                                        <p className="font-medium leading-relaxed">{judge.notes}</p>
                                    </div>
                                )}

                                {isJudgeNC && (
                                    <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-500 font-bold flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                        Competidor marcado como ausente nesta prova
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
