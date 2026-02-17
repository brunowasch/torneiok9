import { db } from '../lib/firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where 
} from 'firebase/firestore';
import { Evaluation, TestTemplate } from '../types/schema';

export const calculateFinalScore = (
  template: TestTemplate,
  scores: Record<string, number>,
  penaltiesApplied: { penaltyId: string; value: number }[]
): number => {
  let total = 0;

  template.groups.forEach(group => {
    group.items.forEach(item => {
      const score = scores[item.id] || 0;
      total += Math.min(score, item.maxPoints);
    });
  });

  penaltiesApplied.forEach(p => {
    total += p.value; 
  });

  return total; 
};

export const saveEvaluation = async (
  evaluationData: Omit<Evaluation, 'id' | 'createdAt' | 'finalScore'>,
  template: TestTemplate
) => {
  try {
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
