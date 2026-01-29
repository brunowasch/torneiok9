import { db } from '../lib/firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDocs, 
  query, 
  where,
  deleteDoc
} from 'firebase/firestore';
import { Room, Competitor, TestTemplate } from '../types/schema';

// ROOMS
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

export const getRooms = async (adminId: string) => {
    // In a real app we might filter by createdBy, 
    // but for now let's just fetch all or filter if needed
    const q = query(collection(db, 'rooms'), where('createdBy', '==', adminId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Room));
};

// COMPETITORS
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

// TESTS / TEMPLATES
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
