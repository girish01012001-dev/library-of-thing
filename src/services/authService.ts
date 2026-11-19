import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import type { CustomerProfile } from '../types';
import { getFirebaseServices } from './firebaseApp';

const PROFILES_STORAGE_KEY = 'lot_profiles_v1';
const USERS_COLLECTION = 'users';

export interface AuthErrorInfo {
  code: string;
  message: string;
  hostname?: string;
  isDomainError?: boolean;
  isPopupError?: boolean;
}

function readLocalProfiles(): Record<string, CustomerProfile> {
  try {
    const raw = localStorage.getItem(PROFILES_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, CustomerProfile>) : {};
  } catch {
    return {};
  }
}

function writeLocalProfile(profile: CustomerProfile) {
  try {
    const existing = readLocalProfiles();
    existing[profile.uid] = profile;
    localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(existing));
  } catch {
    // Ignore storage quota errors
  }
}

export function mapAuthError(err: unknown): AuthErrorInfo {
  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code?: unknown }).code || 'auth/unknown')
      : 'auth/unknown';
  const hostname =
    typeof window !== 'undefined' ? window.location.hostname : '';

  if (code === 'auth/unauthorized-domain') {
    return {
      code,
      hostname,
      isDomainError: true,
      message: `This preview domain (${hostname}) is not yet authorized for Google Sign-In.`,
    };
  }

  if (
    code === 'auth/popup-blocked' ||
    code === 'auth/cancelled-popup-request' ||
    code === 'auth/popup-closed-by-user'
  ) {
    return {
      code,
      isPopupError: true,
      message:
        code === 'auth/popup-blocked'
          ? 'Popups were blocked by your browser or preview frame. Please allow popups or sign in using Email & Password below.'
          : 'Google sign-in popup was closed before completing. Try again or use Email & Password.',
    };
  }

  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return {
      code,
      message: 'Invalid email or password. Please check your credentials and try again.',
    };
  }

  if (code === 'auth/email-already-in-use') {
    return {
      code,
      message: 'An account with this email already exists. Switch to Sign In instead.',
    };
  }

  if (code === 'auth/weak-password') {
    return {
      code,
      message: 'Password must be at least 6 characters long.',
    };
  }

  if (code === 'auth/operation-not-allowed') {
    return {
      code,
      message:
        'This sign-in method is not enabled in Firebase Authentication yet. Enable it in Firebase Console -> Authentication -> Sign-in method.',
    };
  }

  const rawMessage =
    err instanceof Error ? err.message : 'Unable to complete sign-in right now.';
  return { code, message: rawMessage };
}

class AuthService {
  getCurrentUser(): User | null {
    const services = getFirebaseServices();
    return services ? services.auth.currentUser : null;
  }

  subscribeAuthState(callback: (user: User | null) => void): () => void {
    const services = getFirebaseServices();
    if (!services) {
      callback(null);
      return () => {};
    }
    return onAuthStateChanged(services.auth, callback);
  }

  async ensureProfileForUser(
    user: User,
    preferredName?: string,
  ): Promise<CustomerProfile> {
    const resolvedName =
      preferredName?.trim() ||
      user.displayName ||
      user.email?.split('@')[0] ||
      'Customer';
    const fallbackProfile: CustomerProfile = {
      uid: user.uid,
      name: resolvedName,
      email: user.email || '',
      photoURL: user.photoURL || '',
      phone: '',
      locality: 'Rajpur Road',
      addressNote: '',
      updatedAt: Date.now(),
    };

    const localProfiles = readLocalProfiles();
    const localExisting = localProfiles[user.uid];

    const services = getFirebaseServices();
    if (!services) {
      const merged = localExisting || fallbackProfile;
      writeLocalProfile(merged);
      return merged;
    }

    try {
      const userRef = doc(services.db, USERS_COLLECTION, user.uid);
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        const data = snap.data() as Partial<CustomerProfile>;
        const cleanPreferred = preferredName?.trim();
        const profile: CustomerProfile = {
          uid: user.uid,
          name: cleanPreferred || data.name || fallbackProfile.name,
          email: data.email || fallbackProfile.email,
          photoURL: user.photoURL || data.photoURL || '',
          phone: data.phone || '',
          locality: data.locality || 'Rajpur Road',
          addressNote: data.addressNote || '',
          updatedAt: Date.now(),
        };
        if (cleanPreferred && cleanPreferred !== data.name) {
          await setDoc(userRef, { name: cleanPreferred, updatedAt: profile.updatedAt }, { merge: true });
        }
        writeLocalProfile(profile);
        return profile;
      }

      const initialProfile = localExisting
        ? { ...fallbackProfile, ...localExisting, uid: user.uid }
        : fallbackProfile;
      await setDoc(userRef, initialProfile, { merge: true });
      writeLocalProfile(initialProfile);
      return initialProfile;
    } catch {
      const merged = localExisting || fallbackProfile;
      writeLocalProfile(merged);
      return merged;
    }
  }

  subscribeProfile(
    uid: string,
    listener: (profile: CustomerProfile | null) => void,
  ): () => void {
    const localProfiles = readLocalProfiles();
    if (localProfiles[uid]) {
      listener(localProfiles[uid]);
    }

    const services = getFirebaseServices();
    if (!services) return () => {};

    const userRef = doc(services.db, USERS_COLLECTION, uid);
    return onSnapshot(
      userRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as CustomerProfile;
          writeLocalProfile(data);
          listener(data);
        }
      },
      () => {
        // Keep local cache quietly if Firestore users read is restricted
      },
    );
  }

  async saveCustomerProfile(
    profile: Omit<CustomerProfile, 'updatedAt'>,
  ): Promise<CustomerProfile> {
    const updated: CustomerProfile = {
      ...profile,
      updatedAt: Date.now(),
    };
    writeLocalProfile(updated);

    const services = getFirebaseServices();
    if (services) {
      try {
        await setDoc(doc(services.db, USERS_COLLECTION, profile.uid), updated, {
          merge: true,
        });
      } catch {
        // Ignore if Firestore write is temporarily offline/restricted; local copy persisted
      }
    }

    return updated;
  }

  async signInWithGoogle(): Promise<User> {
    const services = getFirebaseServices();
    if (!services) {
      throw new Error('Firebase Authentication is unavailable.');
    }
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const credential = await signInWithPopup(services.auth, provider);
    await this.ensureProfileForUser(credential.user);
    return credential.user;
  }

  async signInWithEmail(email: string, password: string): Promise<User> {
    const services = getFirebaseServices();
    if (!services) {
      throw new Error('Firebase Authentication is unavailable.');
    }
    const credential = await signInWithEmailAndPassword(
      services.auth,
      email.trim(),
      password,
    );
    await this.ensureProfileForUser(credential.user);
    return credential.user;
  }

  async signUpWithEmail(
    name: string,
    email: string,
    password: string,
  ): Promise<User> {
    const services = getFirebaseServices();
    if (!services) {
      throw new Error('Firebase Authentication is unavailable.');
    }
    const credential = await createUserWithEmailAndPassword(
      services.auth,
      email.trim(),
      password,
    );
    const cleanName = name.trim();
    if (cleanName) {
      await updateProfile(credential.user, { displayName: cleanName });
    }
    await this.ensureProfileForUser(credential.user, cleanName);
    return credential.user;
  }

  async signOutCustomer(): Promise<void> {
    const services = getFirebaseServices();
    if (!services) return;
    await signOut(services.auth);
  }
}

export const authService = new AuthService();
