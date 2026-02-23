import { db, auth, firebaseConfig } from '../lib/firebase';
import { collection, query, where, getDocs, setDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    getAuth,
    sendPasswordResetEmail
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

export const getUserByEmail = async (email: string): Promise<AppUser | null> => {
    try {
        const q = query(collection(db, 'users'), where('email', '==', email));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            return querySnapshot.docs[0].data() as AppUser;
        }
        return null;
    } catch (error) {
        console.error("Error getting user by email", error);
        return null;
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

// Password reset
export const resetPassword = async (email: string) => {
    try {
        await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
            throw new Error("Email não encontrado no sistema.");
        }
        throw new Error("Erro ao enviar email de recuperação.");
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
                throw new Error("Este e-mail já existe e a senha informada está incorreta para vinculação.");
            }
        } else {
            console.error("Firebase Auth Error:", error);
            throw new Error(error.message || "Erro desconhecido ao criar autenticação.");
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
    const normalizedEmail = email.trim().toLowerCase();

    // 1. Verificamos se já existe no Firestore
    const existingUser = await getUserByEmail(normalizedEmail);
    if (existingUser) {
        throw new Error(`O e-mail "${normalizedEmail}" já está sendo utilizado pelo usuário "${existingUser.name}" (${existingUser.role === 'admin' ? 'Administrador' : 'Juiz'}).`);
    }

    let secondaryApp;
    try {
        secondaryApp = getApp('Secondary');
    } catch (e) {
        secondaryApp = initializeApp(firebaseConfig, 'Secondary');
    }

    const secondaryAuth = getAuth(secondaryApp);

    try {
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, normalizedEmail, password);
        const uid = userCredential.user.uid;

        const userData: AppUser = {
            uid,
            email: normalizedEmail,
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

        if (error.code === 'auth/email-already-in-use') {
            throw new Error(`O e-mail "${normalizedEmail}" já existe no sistema de autenticação Firebase. Tente usar outro.`);
        }

        throw error;
    }
};

export const createNewAdminByAdmin = async (email: string, password: string, name: string) => {
    const normalizedEmail = email.trim().toLowerCase();

    // 1. Verificamos se já existe no Firestore
    const existingUser = await getUserByEmail(normalizedEmail);
    if (existingUser) {
        throw new Error(`O e-mail "${normalizedEmail}" já está sendo utilizado pelo administrador "${existingUser.name}".`);
    }

    let secondaryApp;
    try {
        secondaryApp = getApp('Secondary');
    } catch (e) {
        secondaryApp = initializeApp(firebaseConfig, 'Secondary');
    }

    const secondaryAuth = getAuth(secondaryApp);

    try {
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, normalizedEmail, password);
        const uid = userCredential.user.uid;

        const userData: AppUser = {
            uid,
            email: normalizedEmail,
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

        if (error.code === 'auth/email-already-in-use') {
            throw new Error(`O e-mail "${normalizedEmail}" já existe no sistema de autenticação Firebase. Tente usar outro.`);
        }

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
