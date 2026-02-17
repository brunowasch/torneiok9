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
  arrayRemove
} from 'firebase/firestore';
import { Room, Competitor, TestTemplate, AppUser } from '../types/schema';

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
      judges: arrayRemove(judgeUid)
    });
  } catch (error) {
    console.error("Error removing judge from room: ", error);
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


export const deleteRoom = async (roomId: string) => {
  try {
    const docRef = doc(db, 'rooms', roomId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting room: ", error);
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
