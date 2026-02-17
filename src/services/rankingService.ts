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
                    const sorted = [...testEvals].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
                    const top3 = sorted.slice(0, 3);
                    const avg = top3.reduce((sum, e) => sum + e.finalScore, 0) / top3.length;
                    scoresByTest[testId] = avg;
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
