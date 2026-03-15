import { db } from '../lib/firebase';
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  writeBatch,
  onSnapshot
} from 'firebase/firestore';
import { Room, Competitor, TestTemplate, AppUser, ModalityConfig, ReserveActivation } from '../types/schema';

export const createRoom = async (roomData: Omit<Room, 'id' | 'createdAt'>) => {
  try {
    const docRef = await addDoc(collection(db, 'rooms'), {
      ...roomData,
      createdAt: Date.now()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error creating room: ", error);
    throw error;
  }
};

export const getRoomById = async (roomId: string) => {
  const docRef = doc(db, 'rooms', roomId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Room;
  } else {
    throw new Error("Sala não encontrada");
  }
}

export const getRooms = async (adminId?: string) => {
  let q;
  if (adminId) {
    q = query(collection(db, 'rooms'), where('createdBy', '==', adminId));
  } else {
    q = query(collection(db, 'rooms'));
  }
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Room));
};

export const updateRoom = async (roomId: string, data: Partial<Room>) => {
  try {
    const roomRef = doc(db, 'rooms', roomId);
    await updateDoc(roomRef, data);
  } catch (error) {
    console.error('Error updating room: ', error);
    throw error;
  }
};


export const addCompetitor = async (competitorData: Omit<Competitor, 'id' | 'createdAt'>) => {
  try {
    const docRef = await addDoc(collection(db, 'competitors'), {
      ...competitorData,
      createdAt: Date.now()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding competitor: ", error);
    throw error;
  }
};

export const getCompetitorsByRoom = async (roomId: string) => {
  const q = query(collection(db, 'competitors'), where('roomId', '==', roomId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Competitor));
};

export const updateCompetitor = async (competitorId: string, data: Partial<Competitor>) => {
  try {
    const docRef = doc(db, 'competitors', competitorId);
    await updateDoc(docRef, data);
  } catch (error) {
    console.error("Error updating competitor: ", error);
    throw error;
  }
};

export const createTestTemplate = async (templateData: Omit<TestTemplate, 'id'>) => {
  try {
    const docRef = await addDoc(collection(db, 'tests'), templateData);
    return docRef.id;
  } catch (error) {
    console.error("Error creating test template: ", error);
    throw error;
  }
};

export const getTestTemplates = async (roomId?: string) => {
  let q;
  if (roomId) {
    q = query(collection(db, 'tests'), where('roomId', '==', roomId));
  } else {
    q = query(collection(db, 'tests'));
  }

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TestTemplate));
};

export const updateTestTemplate = async (testId: string, templateData: Partial<TestTemplate>) => {
  try {
    const docRef = doc(db, 'tests', testId);
    await updateDoc(docRef, templateData);
  } catch (error) {
    console.error("Error updating test template: ", error);
    throw error;
  }
};

export const addJudgeToRoom = async (roomId: string, judgeUid: string) => {
  try {
    const roomRef = doc(db, 'rooms', roomId);
    await updateDoc(roomRef, {
      judges: arrayUnion(judgeUid)
    });
  } catch (error) {
    console.error("Error adding judge to room: ", error);
    throw error;
  }
};

export const removeJudgeFromRoom = async (roomId: string, judgeUid: string) => {
  try {
    const roomRef = doc(db, 'rooms', roomId);
    await updateDoc(roomRef, {
      judges: arrayRemove(judgeUid),
      judgeReserves: arrayRemove(judgeUid)
    });
  } catch (error) {
    console.error("Error removing judge from room: ", error);
    throw error;
  }
};

/**
 * Define as modalidades em que um juiz é RESERVA (por modalidade específica).
 * Uma lista vazia significa que ele é titular em todas as modalidades.
 * `modalities` = array de nomes de modalidades onde ele é reserva.
 */
export const setJudgeReserveModalities = async (
  roomId: string,
  judgeUid: string,
  modalities: string[]
): Promise<void> => {
  try {
    const roomRef = doc(db, 'rooms', roomId);
    const roomSnap = await getDoc(roomRef);
    if (!roomSnap.exists()) return;
    const current: Record<string, string[]> = roomSnap.data().judgeReserveModalities || {};
    await updateDoc(roomRef, {
      judgeReserveModalities: {
        ...current,
        [judgeUid]: modalities
      }
    });
  } catch (error) {
    console.error('Error setting judge reserve modalities: ', error);
    throw error;
  }
};

export const setJudgeCompetitorReserves = async (
  roomId: string,
  competitorId: string,
  judgeIds: string[]
): Promise<void> => {
  try {
    const roomRef = doc(db, 'rooms', roomId);
    const roomSnap = await getDoc(roomRef);
    if (!roomSnap.exists()) return;
    const current: Record<string, string[]> = roomSnap.data().judgeCompetitorReserves || {};
    await updateDoc(roomRef, {
      judgeCompetitorReserves: {
        ...current,
        [competitorId]: judgeIds
      }
    });
  } catch (error) {
    console.error('Error setting judge competitor reserves: ', error);
    throw error;
  }
};

/**
 * @deprecated Usar setJudgeReserveModalities para controle por modalidade.
 * Mantido para compatibilidade com dados legados.
 */
export const setJudgeReserve = async (roomId: string, judgeUid: string, isReserve: boolean) => {
  try {
    const roomRef = doc(db, 'rooms', roomId);
    await updateDoc(roomRef, {
      judgeReserves: isReserve ? arrayUnion(judgeUid) : arrayRemove(judgeUid)
    });
  } catch (error) {
    console.error('Error setting judge reserve: ', error);
    throw error;
  }
};

/**
 * Aciona o juiz reserva para um competidor/prova específico.
 * Adiciona uma entrada em reserveActivations na sala.
 */
export const activateReserve = async (
  roomId: string,
  competitorId: string,
  testId: string,
  adminUid: string
): Promise<void> => {
  try {
    const roomRef = doc(db, 'rooms', roomId);
    const activation: ReserveActivation = {
      competitorId,
      testId,
      activatedAt: Date.now(),
      activatedBy: adminUid
    };
    await updateDoc(roomRef, {
      reserveActivations: arrayUnion(activation)
    });
  } catch (error) {
    console.error('Error activating reserve judge: ', error);
    throw error;
  }
};

/**
 * Remove o acionamento do reserva para um competidor/prova.
 */
export const deactivateReserve = async (
  roomId: string,
  competitorId: string,
  testId: string
): Promise<void> => {
  try {
    const roomRef = doc(db, 'rooms', roomId);
    // Lê as ativações atuais e filtra a que bate
    const roomSnap = await getDoc(roomRef);
    if (!roomSnap.exists()) return;
    const activations: ReserveActivation[] = roomSnap.data().reserveActivations || [];
    const updated = activations.filter(
      a => !(a.competitorId === competitorId && a.testId === testId)
    );
    await updateDoc(roomRef, { reserveActivations: updated });
  } catch (error) {
    console.error('Error deactivating reserve judge: ', error);
    throw error;
  }
};

export const getJudgesList = async () => {
  const q = query(collection(db, 'users'), where('role', '==', 'judge'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as AppUser));
};

export const getRoomsWhereJudge = async (judgeUid: string) => {
  const q = query(collection(db, 'rooms'), where('judges', 'array-contains', judgeUid));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Room));
};

export const updateJudgeTestAssignments = async (roomId: string, judgeUid: string, testIds: string[]) => {
  try {
    const roomRef = doc(db, 'rooms', roomId);
    const roomSnap = await getDoc(roomRef);

    if (!roomSnap.exists()) {
      throw new Error('Sala não encontrada');
    }

    const currentAssignments = roomSnap.data().judgeAssignments || {};

    await updateDoc(roomRef, {
      judgeAssignments: {
        ...currentAssignments,
        [judgeUid]: testIds
      }
    });
  } catch (error) {
    console.error("Error updating judge test assignments: ", error);
    throw error;
  }
};

export const updateJudgeModalityAssignments = async (roomId: string, judgeUid: string, modalities: string[]) => {
  try {
    const roomRef = doc(db, 'rooms', roomId);
    const roomSnap = await getDoc(roomRef);

    if (!roomSnap.exists()) {
      throw new Error('Sala não encontrada');
    }

    const currentModalities = roomSnap.data().judgeModalities || {};

    await updateDoc(roomRef, {
      judgeModalities: {
        ...currentModalities,
        [judgeUid]: modalities
      }
    });
  } catch (error) {
    console.error("Error updating judge modality assignments: ", error);
    throw error;
  }
};


export const deleteRoom = async (roomId: string) => {
  try {
    const batch = writeBatch(db);

    const qComp = query(collection(db, 'competitors'), where('roomId', '==', roomId));
    const compSnap = await getDocs(qComp);
    compSnap.forEach(d => batch.delete(d.ref));

    const qTests = query(collection(db, 'tests'), where('roomId', '==', roomId));
    const testsSnap = await getDocs(qTests);
    testsSnap.forEach(d => batch.delete(d.ref));

    const qEval = query(collection(db, 'evaluations'), where('roomId', '==', roomId));
    const evalSnap = await getDocs(qEval);
    evalSnap.forEach(d => batch.delete(d.ref));

    const docRef = doc(db, 'rooms', roomId);
    batch.delete(docRef);

    await batch.commit();
  } catch (error) {
    console.error("Error deleting room and its contents: ", error);
    throw error;
  }
};

export const deleteCompetitor = async (competitorId: string) => {
  try {
    const docRef = doc(db, 'competitors', competitorId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting competitor: ", error);
    throw error;
  }
};

export const deleteTestTemplate = async (testId: string) => {
  try {
    const docRef = doc(db, 'tests', testId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting test: ", error);
    throw error;
  }
};

export const getModalities = async () => {
  const q = query(collection(db, 'modalities'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ModalityConfig));
};

export const addModality = async (name: string) => {
  try {
    const docRef = await addDoc(collection(db, 'modalities'), {
      name,
      createdAt: Date.now()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding modality: ", error);
    throw error;
  }
};

export const updateModality = async (id: string, name: string) => {
  try {
    const docRef = doc(db, 'modalities', id);
    await updateDoc(docRef, { name });
  } catch (error) {
    console.error("Error updating modality: ", error);
    throw error;
  }
};

export const deleteModality = async (id: string) => {
  try {
    const docRef = doc(db, 'modalities', id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting modality: ", error);
    throw error;
  }
};
export const subscribeToRoom = (roomId: string, callback: (room: Room) => void) => {
  const docRef = doc(db, 'rooms', roomId);
  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      callback({ id: snapshot.id, ...snapshot.data() } as Room);
    }
  });
};

export const subscribeToCompetitorsByRoom = (roomId: string, callback: (competitors: Competitor[]) => void) => {
  const q = query(collection(db, 'competitors'), where('roomId', '==', roomId));
  return onSnapshot(q, (snapshot) => {
    const competitors = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Competitor));
    callback(competitors);
  });
};

export const subscribeToTestsByRoom = (roomId: string, callback: (tests: TestTemplate[]) => void) => {
  const q = query(collection(db, 'tests'), where('roomId', '==', roomId));
  return onSnapshot(q, (snapshot) => {
    const tests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TestTemplate));
    callback(tests);
  });
};

export const subscribeToRooms = (callback: (rooms: Room[]) => void, adminId?: string) => {
  let q;
  if (adminId) {
    q = query(collection(db, 'rooms'), where('createdBy', '==', adminId));
  } else {
    q = query(collection(db, 'rooms'));
  }
  return onSnapshot(q, (snapshot) => {
    const rooms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Room));
    callback(rooms);
  });
};
