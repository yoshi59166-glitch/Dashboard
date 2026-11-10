import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { auth } from '../firebase/config';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isDemoUser: boolean;
  signInWithGoogle: () => Promise<void>;
  signInAsDemoTeacher: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isDemoUser: false,
  signInWithGoogle: async () => {},
  signInAsDemoTeacher: () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isDemoUser, setIsDemoUser] = useState<boolean>(false);

  useEffect(() => {
    // Check if user previously logged in as demo
    const savedDemo = localStorage.getItem('checkpoint_demo_teacher');
    if (savedDemo === 'true') {
      setIsDemoUser(true);
      setUser({
        uid: 'demo-teacher-001',
        email: 'teacher.demo@university.ac.th',
        displayName: 'ดร. นภัสร์ สุวรรณกิจ (Demo)',
        photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        emailVerified: true,
      } as unknown as User);
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setIsDemoUser(false);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      localStorage.removeItem('checkpoint_demo_teacher');
      setIsDemoUser(false);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error('Sign in error:', error);
      // If popup blocked or iframe restrictions, provide helpful alert
      if (error?.code === 'auth/popup-blocked') {
        alert('เบราว์เซอร์บล็อกหน้าต่างป๊อปอัป กรุณาอนุญาตป๊อปอัปเพื่อล็อกอินด้วย Google');
      } else if (error?.code === 'auth/unauthorized-domain') {
        alert('โดเมนนี้ยังไม่ได้รับอนุญาตใน Firebase Auth กรุณาใช้โหมด Demo ชั่วคราว หรือเพิ่มโดเมนใน Firebase Console');
      } else {
        alert('ไม่สามารถเข้าสู่ระบบด้วย Google ได้: ' + (error?.message || 'โปรดลองอีกครั้ง'));
      }
    } finally {
      setLoading(false);
    }
  };

  const signInAsDemoTeacher = () => {
    setLoading(true);
    localStorage.setItem('checkpoint_demo_teacher', 'true');
    setIsDemoUser(true);
    setUser({
      uid: 'demo-teacher-001',
      email: 'teacher.demo@university.ac.th',
      displayName: 'ดร. นภัสร์ สุวรรณกิจ',
      photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      emailVerified: true,
    } as unknown as User);
    setLoading(false);
  };

  const logout = async () => {
    try {
      localStorage.removeItem('checkpoint_demo_teacher');
      setIsDemoUser(false);
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isDemoUser,
        signInWithGoogle,
        signInAsDemoTeacher,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
