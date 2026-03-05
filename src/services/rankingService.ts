import { db } from '../lib/firebase';
import { collection, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { Competitor, Evaluation } from '../types/schema';

export interface LeaderboardEntry extends Competitor {
    totalScore: number;
    evaluationsCount: number;
    evaluations: Evaluation[];
    scoresByTest: Record<string, number>;
}

export const subscribeToLeaderboard = (roomId: string, callback: (data: LeaderboardEntry[]) => void) => {
    const qCompetitors = query(collection(db, 'competitors'), where('roomId', '==', roomId));

    const unsubscribeCompetitors = onSnapshot(qCompetitors, async (compSnapshot) => {
        const competitors = compSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Competitor));

        const { doc: docFn, getDoc } = await import('firebase/firestore');
        let judgeReserves: string[] = [];
        let judgeReserveModalities: Record<string, string[]> = {};
        let judgeCompetitorReserves: Record<string, string[]> = {};
        try {
            const roomSnap = await getDoc(docFn(db, 'rooms', roomId));
            if (roomSnap.exists()) {
                const data = roomSnap.data();
                judgeReserves = data.judgeReserves || [];
                judgeReserveModalities = data.judgeReserveModalities || {};
                judgeCompetitorReserves = data.judgeCompetitorReserves || {};
            }
        } catch { }

        const qEvaluations = query(collection(db, 'evaluations'), where('roomId', '==', roomId));
        const evalSnapshot = await getDocs(qEvaluations);
        const evaluations = evalSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Evaluation));

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
                    } else {
                        scoresByTest[testId] = 0; // Menos de 3 avaliações: não contabiliza ainda
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
    });

    return unsubscribeCompetitors;
};

export const getAllCompetitors = async () => {
    const q = query(collection(db, 'competitors'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Competitor));
};
