import { db, auth, firebaseConfig } from '../lib/firebase'; 
import { collection, query, where, getDocs, setDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    getAuth
} from 'firebase/auth';
import { initializeApp, getApp, getApps, deleteApp } from 'firebase/app';
import { AppUser } from '../types/schema';

export const checkAdminExists = async () => {
    try {
        const q = query(collection(db, 'users'), where('role', '==', 'admin'));
        const querySnapshot = await getDocs(q);
        return !querySnapshot.empty;
    } catch (error) {
        console.warn("Could not check if admin exists.", error);
        return false;
    }
};

export const getUserRole = async (uid: string): Promise<string | null> => {
    try {
        const docRef = doc(db, 'users', uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return (docSnap.data() as AppUser).role;
        }
        return null;
    } catch (error) {
        console.error("Error getting user role", error);
        return null;
    }
};

// Login function
export const loginAdmin = async (email: string, password: string) => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    } catch (error: any) {
        throw new Error("Credenciais inválidas ou acesso negado.");
    }
};

// Logout
export const logoutAdmin = async () => {
    await signOut(auth);
};

export const createAdminUser = async (email: string, password: string, name: string) => {
    let uid = '';
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        uid = userCredential.user.uid;
    } catch (error: any) {
        if (error.code === 'auth/email-already-in-use') {
            try {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                uid = userCredential.user.uid;
            } catch (loginError) {
                throw new Error("Este email já existe e a senha informada está incorreta.");
            }
        } else {
            throw error;
        }
    }

    try {
        const userData: AppUser = {
            uid,
            email,
            name,
            role: 'admin',
            createdAt: Date.now(),
        };
        await setDoc(doc(db, 'users', uid), userData);
        return uid;
    } catch (error: any) {
        console.error("Error writing to Firestore: ", error);
        if (error.code === 'permission-denied') {
            throw new Error("PERMISSÃO NEGADA.");
        }
        throw error;
    }
};

export const createJudgeByAdmin = async (email: string, password: string, name: string) => {
    let secondaryApp;
    try {
        secondaryApp = getApp('Secondary');
    } catch (e) {
        secondaryApp = initializeApp(firebaseConfig, 'Secondary');
    }

    const secondaryAuth = getAuth(secondaryApp);

    try {
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
        const uid = userCredential.user.uid;

        const userData: AppUser = {
            uid,
            email,
            name,
            role: 'judge',
            createdAt: Date.now(),
        };

        await setDoc(doc(db, 'users', uid), userData);

        await deleteApp(secondaryApp);
        return uid;
    } catch (error: any) {
        try { await deleteApp(secondaryApp); } catch (e) { }
        console.error("Error creating judge", error);
        throw error;
    }
};

export const createNewAdminByAdmin = async (email: string, password: string, name: string) => {
    let secondaryApp;
    try {
        secondaryApp = getApp('Secondary');
    } catch (e) {
        secondaryApp = initializeApp(firebaseConfig, 'Secondary');
    }

    const secondaryAuth = getAuth(secondaryApp);

    try {
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
        const uid = userCredential.user.uid;

        const userData: AppUser = {
            uid,
            email,
            name,
            role: 'admin',
            createdAt: Date.now(),
        };

        await setDoc(doc(db, 'users', uid), userData);

        await deleteApp(secondaryApp);
        return uid;
    } catch (error: any) {
        try { await deleteApp(secondaryApp); } catch (e) { }
        console.error("Error creating sub-admin", error);
        throw error;
    }
};

export const updateUser = async (uid: string, data: Partial<AppUser>) => {
    try {
        const docRef = doc(db, 'users', uid);
        await updateDoc(docRef, data);
    } catch (error) {
        console.error("Error updating user", error);
        throw error;
    }
};
