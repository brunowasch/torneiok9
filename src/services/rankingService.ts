import { db } from '../lib/firebase';
import { collection, onSnapshot, query, where, doc, getDocs } from 'firebase/firestore';
import { Competitor, Evaluation } from '../types/schema';

export interface LeaderboardEntry extends Competitor {
    totalScore: number;
    evaluationsCount: number;
    evaluations: Evaluation[];
    scoresByTest: Record<string, number>;
}

export const subscribeToLeaderboard = (roomId: string, callback: (data: LeaderboardEntry[]) => void) => {
    let competitors: Competitor[] = [];
    let evaluations: Evaluation[] = [];
    let roomInfo: any = null;

    const updateLeaderboard = () => {
        if (!competitors.length) {
            callback([]);
            return;
        }

        const judgeReserves = roomInfo?.judgeReserves || [];
        const judgeReserveModalities = roomInfo?.judgeReserveModalities || {};
        const judgeCompetitorReserves = roomInfo?.judgeCompetitorReserves || {};

        const leaderboard: LeaderboardEntry[] = competitors.map(comp => {
            const compEvals = evaluations.filter(e => e.competitorId === comp.id);

            const evalsByTest: Record<string, Evaluation[]> = {};
            compEvals.forEach(e => {
                if (!evalsByTest[e.testId]) evalsByTest[e.testId] = [];
                evalsByTest[e.testId].push(e);
            });

            const scoresByTest: Record<string, number> = {};
            let totalScore = 0;

            Object.entries(evalsByTest).forEach(([testId, testEvals]) => {
                const ncEval = testEvals.find(e => e.status === 'did_not_participate');
                if (ncEval) {
                    scoresByTest[testId] = 0;
                } else {
                    const isRes = (judgeId: string, competitorId: string) => {
                        const compReserves = judgeCompetitorReserves[competitorId] || [];
                        if (compReserves.includes(judgeId)) return true;
                        const mods = judgeReserveModalities[judgeId] || [];
                        if (mods.length > 0) return mods.includes(comp.modality);
                        return judgeReserves.includes(judgeId);
                    };

                    const titularEvals = testEvals
                        .filter(e => !isRes(e.judgeId, comp.id))
                        .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

                    const reserveEvals = testEvals
                        .filter(e => isRes(e.judgeId, comp.id))
                        .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

                    let evalsToAverage: Evaluation[];

                    if (titularEvals.length >= 3) {
                        evalsToAverage = titularEvals.slice(0, 3);
                    } else if (titularEvals.length > 0) {
                        const needed = 3 - titularEvals.length;
                        const supplementary = reserveEvals.slice(0, needed);
                        evalsToAverage = [...titularEvals, ...supplementary];
                    } else {
                        evalsToAverage = reserveEvals.slice(0, 3);
                    }

                    if (evalsToAverage.length >= 3) {
                        const avg = evalsToAverage.slice(0, 3).reduce((sum, e) => sum + e.finalScore, 0) / 3;
                        scoresByTest[testId] = avg;

                        // Add bonus for "Faro" modalities (e.g., "Faro de Narcóticos"): (drug points found * 50)
                        if (comp.modality?.toLowerCase().includes('faro')) {
                            const found = comp.drugPointsFound?.[testId] || 0;
                            scoresByTest[testId] += (found * 50);
                        }
                    } else {
                        scoresByTest[testId] = 0;
                    }
                }
                totalScore += scoresByTest[testId];
            });

            return {
                ...comp,
                totalScore,
                evaluationsCount: Object.keys(evalsByTest).length,
                evaluations: compEvals,
                scoresByTest
            };
        });

        leaderboard.sort((a, b) => b.totalScore - a.totalScore);
        callback(leaderboard);
    };

    const qCompetitors = query(collection(db, 'competitors'), where('roomId', '==', roomId));
    const unsubscribeCompetitors = onSnapshot(qCompetitors, (snapshot) => {
        competitors = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Competitor));
        updateLeaderboard();
    });

    const qEvaluations = query(collection(db, 'evaluations'), where('roomId', '==', roomId));
    const unsubscribeEvaluations = onSnapshot(qEvaluations, (snapshot) => {
        evaluations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Evaluation));
        updateLeaderboard();
    });

    const unsubscribeRoom = onSnapshot(doc(db, 'rooms', roomId), (snapshot) => {
        if (snapshot.exists()) {
            roomInfo = snapshot.data();
            updateLeaderboard();
        }
    });

    return () => {
        unsubscribeCompetitors();
        unsubscribeEvaluations();
        unsubscribeRoom();
    };
};

export const getAllCompetitors = async () => {
    const q = query(collection(db, 'competitors'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Competitor));
};
