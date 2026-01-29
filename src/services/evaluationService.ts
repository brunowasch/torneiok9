import { db } from '../lib/firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where 
} from 'firebase/firestore';
import { Evaluation, TestTemplate } from '../types/schema';

// Helper to calculate score safely
export const calculateFinalScore = (
  template: TestTemplate,
  scores: Record<string, number>,
  penaltiesApplied: { penaltyId: string }[]
): number => {
  let total = 0;

  // Sum scores (ensuring we don't exceed maxPoints per item)
  template.groups.forEach(group => {
    group.items.forEach(item => {
      const score = scores[item.id] || 0;
      // Clamp score to maxPoints if needed, but assuming UI sends valid data
      total += Math.min(score, item.maxPoints);
    });
  });

  // Apply penalties
  penaltiesApplied.forEach(p => {
    const penaltyDef = template.penalties.find(pd => pd.id === p.penaltyId);
    if (penaltyDef) {
      total += penaltyDef.value; // Value is negative
    }
  });

  return Math.max(0, total); 
};

export const saveEvaluation = async (
  evaluationData: Omit<Evaluation, 'id' | 'createdAt' | 'finalScore'>,
  template: TestTemplate
) => {
  try {
    // Calculate final score server-side/service-side for integrity
    const finalScore = calculateFinalScore(
        template, 
        evaluationData.scores, 
        evaluationData.penaltiesApplied || []
    );

    const docRef = await addDoc(collection(db, 'evaluations'), {
      ...evaluationData,
      finalScore,
      createdAt: Date.now()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error saving evaluation: ", error);
    throw error;
  }
};

export const getEvaluationsByRoom = async (roomId: string) => {
  const q = query(collection(db, 'evaluations'), where('roomId', '==', roomId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Evaluation));
};

export const getEvaluationsByCompetitor = async (competitorId: string) => {
    const q = query(collection(db, 'evaluations'), where('competitorId', '==', competitorId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Evaluation));
  };
