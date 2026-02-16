import { db } from '../lib/firebase';
import { collection, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { Competitor, Evaluation } from '../types/schema';

// Update type to include detailed evaluation data
export interface LeaderboardEntry extends Competitor {
    totalScore: number;
    evaluationsCount: number;
    evaluations: Evaluation[]; // Included to allow client-side filtering by Test/Modality
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
            const totalScore = compEvals.reduce((sum, e) => sum + e.finalScore, 0);

            const scoresByTest: Record<string, number> = {};
            compEvals.forEach(e => {
                scoresByTest[e.testId] = e.finalScore;
            });

            return {
                ...comp,
                totalScore,
                evaluationsCount: compEvals.length,
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
