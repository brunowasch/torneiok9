import { db } from '../lib/firebase';
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  query,
  where,
  onSnapshot
} from 'firebase/firestore';
import { Evaluation, TestTemplate, EditScoreRequest } from '../types/schema';

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
    const { deleteDoc, doc, getDoc, addDoc, collection } = await import('firebase/firestore');
    const evalRef = doc(db, 'evaluations', evaluationId);
    const evalSnap = await getDoc(evalRef);

    if (evalSnap.exists()) {
      // Salvar no histórico antes de deletar
      await addDoc(collection(db, 'evaluationsHistory'), {
        ...evalSnap.data(),
        originalEvaluationId: evaluationId,
        archivedAt: Date.now()
      });
    }

    await deleteDoc(evalRef);
  } catch (error) {
    console.error("Error deleting/archiving evaluation: ", error);
    throw error;
  }
};

export const getEvaluationHistory = async (roomId: string, competitorId: string, testId: string) => {
  const q = query(
    collection(db, 'evaluationsHistory'),
    where('roomId', '==', roomId),
    where('competitorId', '==', competitorId),
    where('testId', '==', testId)
  );
  const snapshot = await getDocs(q);
  // Retorna ordenado pelo timestamp de deleção decrescente, mais novos primeiro
  return snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() } as any))
    .sort((a, b) => (b.archivedAt || 0) - (a.archivedAt || 0));
};

export const getEvaluationHistoryByTest = async (roomId: string, testId: string) => {
  const q = query(
    collection(db, 'evaluationsHistory'),
    where('roomId', '==', roomId),
    where('testId', '==', testId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
};

export const purgeArchivedEvaluations = async (historyIds: string[]) => {
  try {
    const { deleteDoc, doc } = await import('firebase/firestore');
    await Promise.all(
      historyIds.map(id => deleteDoc(doc(db, 'evaluationsHistory', id)))
    );
  } catch (error) {
    console.error('Error purging archived evaluations:', error);
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


export const createEditScoreRequest = async (
  data: Omit<EditScoreRequest, 'id' | 'createdAt' | 'status'>
): Promise<string> => {
  try {
    // Check if there's already a pending request for this evaluation
    const existing = query(
      collection(db, 'editScoreRequests'),
      where('evaluationId', '==', data.evaluationId),
      where('judgeId', '==', data.judgeId),
      where('status', '==', 'pending')
    );
    const existingDocs = await getDocs(existing);
    if (!existingDocs.empty) {
      throw new Error('Já existe uma solicitação pendente para esta avaliação.');
    }

    const docRef = await addDoc(collection(db, 'editScoreRequests'), {
      ...data,
      status: 'pending',
      createdAt: Date.now()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating edit score request:', error);
    throw error;
  }
};

export const getEditScoreRequestsByRoom = async (roomId: string): Promise<EditScoreRequest[]> => {
  const q = query(collection(db, 'editScoreRequests'), where('roomId', '==', roomId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as EditScoreRequest));
};

export const respondToEditScoreRequest = async (
  requestId: string,
  status: 'approved' | 'rejected' | 'consumed',
  adminUid: string
): Promise<void> => {
  try {
    const ref = doc(db, 'editScoreRequests', requestId);
    await updateDoc(ref, {
      status,
      respondedBy: adminUid,
      respondedAt: Date.now()
    });
  } catch (error) {
    console.error('Error responding to edit score request:', error);
    throw error;
  }
};

export const getApprovedEditRequest = async (
  evaluationId: string,
  judgeId: string
): Promise<EditScoreRequest | null> => {
  const q = query(
    collection(db, 'editScoreRequests'),
    where('evaluationId', '==', evaluationId),
    where('judgeId', '==', judgeId),
    where('status', '==', 'approved')
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as EditScoreRequest;
};
export const getAllPendingEditRequests = async (): Promise<EditScoreRequest[]> => {
  const q = query(collection(db, 'editScoreRequests'), where('status', '==', 'pending'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as EditScoreRequest));
};
export const subscribeToEvaluationsByRoom = (roomId: string, callback: (evaluations: Evaluation[]) => void) => {
  const q = query(collection(db, 'evaluations'), where('roomId', '==', roomId));
  return onSnapshot(q, (snapshot) => {
    const evals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Evaluation));
    callback(evals);
  });
};

export const subscribeToEditScoreRequestsByRoom = (roomId: string, callback: (requests: EditScoreRequest[]) => void) => {
  const q = query(collection(db, 'editScoreRequests'), where('roomId', '==', roomId));
  return onSnapshot(q, (snapshot) => {
    const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EditScoreRequest));
    callback(requests);
  });
};

export const subscribeToAllPendingEditRequests = (callback: (requests: EditScoreRequest[]) => void) => {
  const q = query(collection(db, 'editScoreRequests'), where('status', '==', 'pending'));
  return onSnapshot(q, (snapshot) => {
    const requests = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as EditScoreRequest));
    callback(requests);
  });
};
