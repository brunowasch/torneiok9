'use client';

import { useState, useEffect } from 'react';
import { Competitor, Evaluation, TestTemplate, AppUser } from '@/types/schema';
import { X, Trophy, AlertCircle, ChevronDown, Flame } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useTranslation } from 'react-i18next';
import '@/i18n/config';
import { formatScore } from '@/utils/score';

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
    judgeScores: Record<string, JudgeScore[]>;
    tests: TestTemplate[];
}

interface JudgeScoresModalProps {
    competitor: Competitor;
    onClose: () => void;
}

export default function JudgeScoresModal({ competitor, onClose }: JudgeScoresModalProps) {
    const { t } = useTranslation();
    const [detail, setDetail] = useState<CompetitorDetail | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const evalsQ = query(collection(db, 'evaluations'), where('competitorId', '==', competitor.id));
                const evalsSnap = await getDocs(evalsQ);
                const evals = evalsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Evaluation));

                if (evals.length === 0) {
                    setDetail({ ...competitor, judgeScores: {}, tests: [] });
                    setLoading(false);
                    return;
                }

                const testIds = [...new Set(evals.map(e => e.testId))];
                const testsQ = query(collection(db, 'tests'), where('roomId', '==', competitor.roomId));
                const testsSnap = await getDocs(testsQ);
                const allTests = testsSnap.docs.map(d => ({ id: d.id, ...d.data() } as TestTemplate));
                const relevantTests = allTests.filter(t => testIds.includes(t.id));

                const judgeIds = [...new Set(evals.map(e => e.judgeId))];
                const judgesQ = query(collection(db, 'users'), where('role', '==', 'judge'));
                const judgesSnap = await getDocs(judgesQ);
                const judgesMap: Record<string, string> = {};
                judgesSnap.docs.forEach(d => {
                    const data = d.data() as AppUser;
                    judgesMap[d.id] = data.name || data.email;
                });

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

                setDetail({ ...competitor, judgeScores, tests: relevantTests });
            } catch (err) {
                console.error('Error loading competitor detail', err);
                setDetail({ ...competitor, judgeScores: {}, tests: [] });
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [competitor]);

    return (
        <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="bg-white w-full md:max-w-2xl rounded-t-3xl md:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden border-2 border-gray-100">

                {/* Modal Header */}
                <div className="bg-black p-6 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-orange-900/20 border-2 border-orange-500/30 shrink-0 flex items-center justify-center text-white font-black text-lg">
                            {competitor.photoUrl ? (
                                <img src={competitor.photoUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                                competitor.handlerName.substring(0, 2).toUpperCase()
                            )}
                        </div>
                        <div>
                            <div className="text-[10px] text-k9-orange font-black uppercase tracking-widest">
                                {competitor.modality}
                            </div>
                            <h2 className="text-white font-black text-xl uppercase tracking-tight leading-tight">
                                {competitor.handlerName}
                            </h2>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <Flame className="w-3 h-3 text-k9-orange" />
                                <span className="text-gray-400 text-xs font-bold uppercase">{competitor.dogName}</span>
                                <span className="text-gray-600">•</span>
                                <span className="text-gray-500 text-xs font-bold uppercase">{competitor.dogBreed}</span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="overflow-y-auto flex-1 p-6 space-y-6">
                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-k9-orange" /> {t('competitorsPage.judgeScores')}
                    </h3>

                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2].map(i => (
                                <div key={i} className="bg-gray-50 rounded-2xl p-6 animate-pulse h-28"></div>
                            ))}
                        </div>
                    ) : !detail || Object.keys(detail.judgeScores).length === 0 ? (
                        <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-100 rounded-2xl">
                            <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <p className="font-bold uppercase text-sm tracking-wide">{t('competitorsPage.noEvals')}</p>
                            <p className="text-xs mt-1 text-gray-300">{t('competitorsPage.notEvaluatedYet')}</p>
                        </div>
                    ) : (
                        detail.tests
                            .sort((a, b) => (a.testNumber || 0) - (b.testNumber || 0))
                            .map(test => {
                                const judgeEntries = detail.judgeScores[test.id] || [];
                                if (judgeEntries.length === 0) return null;

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
                                        t={t}
                                    />
                                );
                            })
                    )}
                </div>
            </div>
        </div>
    );
}

/* ─── Sub-componente: Seção de uma Prova ─── */
function TestScoreSection({
    test,
    judgeEntries,
    avg,
    isNC,
    t
}: {
    test: TestTemplate;
    judgeEntries: JudgeScore[];
    avg: number;
    isNC: boolean;
    t: any;
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
                        <div className="text-[10px] text-gray-400 font-bold uppercase">{judgeEntries.length} {t('competitorsPage.judge')}{judgeEntries.length !== 1 ? 's' : ''} · {t('competitorsPage.max')} {test.maxScore} {t('competitorsPage.pts')}</div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-right">
                        <div className={`text-2xl font-black leading-none ${isNC ? 'text-red-500' : 'text-k9-orange'}`}>
                            {isNC ? 'NC' : formatScore(avg)}
                        </div>
                        <div className="text-[9px] text-gray-400 font-black uppercase">{isNC ? t('competitorsPage.absence') : t('competitorsPage.average')}</div>
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
                                            <div className="text-[9px] text-gray-400 uppercase font-bold">{t('competitorsPage.judge')}</div>
                                        </div>
                                    </div>
                                    <div className={`text-xl font-black ${isJudgeNC ? 'text-red-500' : 'text-k9-black'}`}>
                                        {isJudgeNC ? 'NC' : formatScore(judge.finalScore)}
                                        {!isJudgeNC && <span className="text-xs text-gray-300 font-bold ml-1">{t('competitorsPage.pts')}</span>}
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
                                                <span className="font-black text-red-600 shrink-0 ml-2">{pen.value} {t('competitorsPage.pts')}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Observações */}
                                {judge.notes && (
                                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
                                        <div className="font-black uppercase text-[9px] text-blue-400 mb-1">{t('competitorsPage.observations')}</div>
                                        <p className="font-medium leading-relaxed">{judge.notes}</p>
                                    </div>
                                )}

                                {isJudgeNC && (
                                    <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-500 font-bold flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                        {t('competitorsPage.absentNote')}
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
