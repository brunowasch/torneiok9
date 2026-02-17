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

export const deleteEvaluation = async (evaluationId: string) => {
    try {
        const { deleteDoc, doc } = await import('firebase/firestore');
        await deleteDoc(doc(db, 'evaluations', evaluationId));
    } catch (error) {
        console.error("Error deleting evaluation: ", error);
        throw error;
    }
};

export const setDidNotParticipate = async (roomId: string, testId: string, competitorId: string, adminId: string) => {
    try {
        await addDoc(collection(db, 'evaluations'), {
            roomId,
            testId,
            competitorId,
            judgeId: adminId,
            scores: {},
            penaltiesApplied: [],
            finalScore: 0,
            status: 'did_not_participate',
            notes: 'Não participou (DNS)',
            createdAt: Date.now()
        });
    } catch (error) {
        console.error("Error setting DNS: ", error);
        throw error;
    }
};
