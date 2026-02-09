import { db } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy, where, getDocs } from 'firebase/firestore';
import { Competitor, Evaluation } from '../types/schema';

export interface LeaderboardEntry extends Competitor {
    totalScore: number;
    evaluationsCount: number;
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

            return {
                ...comp,
                totalScore,
                evaluationsCount: compEvals.length
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
